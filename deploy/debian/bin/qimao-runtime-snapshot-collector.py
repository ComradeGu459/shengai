#!/usr/bin/env python3
"""生成 system-control.runtime.snapshot-provider 可直接读取的运行快照。

输出严格采用 schemaVersion=1 的五字段顶层合同；每个资源只包含 provider
解析器要求的 identity/routingScope/telemetry。collector 不读取 Secret、日志正文、
连接串、对象键，也不发出 COS/数据库写请求。
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any


SCHEMA_VERSION = 1
VALID_FOR_SECONDS = 90
DEFAULT_OUTPUT = Path('/var/lib/qimao-terms-cloud/runtime/telemetry.json')
APP_DB_NAME = 'qimao_terms_cloud'
ENV_PATH = Path('/etc/qimao-terms-cloud/object-storage.env')

RESOURCE_DEFS = (
    ('runtime:backend-api', 'application', 'Qimao Backend API', 'service', 'qimao', 'qimao-backend.service'),
    ('runtime:upload-completion-worker', 'worker', 'Upload Completion Worker', 'service', 'qimao', 'qimao-upload-completion-worker.service'),
    ('runtime:postgresql:15-main', 'database', 'PostgreSQL 15-main', 'service', 'postgresql', 'postgresql@15-main.service'),
    ('runtime:tencent-cos:milaidi-upload-1310313248', 'storage', 'Tencent COS · milaidi-upload-1310313248', 'object_storage', 'tencent-cos', None),
)

ID_PATTERN = re.compile(r'^[a-z0-9][a-z0-9:_-]{0,119}$')
REASON_PATTERN = re.compile(r'^[A-Z0-9_.:-]{1,80}$')
KIND_VALUES = {'application', 'worker', 'database', 'storage'}
STATUS_VALUES = {'fresh', 'partial', 'unknown'}


class SnapshotError(Exception):
    """只向 stderr 返回稳定、非敏感的校验码。"""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0)


def iso(value: dt.datetime) -> str:
    return value.astimezone(dt.timezone.utc).isoformat().replace('+00:00', 'Z')


def run_readonly(argv: list[str], timeout: float = 8.0) -> subprocess.CompletedProcess[str]:
    """执行固定只读命令；不把 stderr 带入快照。"""
    try:
        return subprocess.run(argv, capture_output=True, text=True, timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired):
        return subprocess.CompletedProcess(argv, 124, '', '')


def as_int(value: Any) -> int | None:
    try:
        parsed = int(str(value).strip())
    except (TypeError, ValueError):
        return None
    return parsed if 0 <= parsed <= (2**53 - 1) else None


def is_date_string(value: Any) -> bool:
    if not isinstance(value, str) or len(value) > 64 or 'T' not in value:
        return False
    try:
        dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
        return True
    except ValueError:
        return False


def nullable_string(value: Any, max_length: int) -> bool:
    return value is None or (isinstance(value, str) and 1 <= len(value) <= max_length)


def nullable_number(value: Any, minimum: float, maximum: float) -> bool:
    return value is None or (isinstance(value, (int, float)) and not isinstance(value, bool)
                             and value == value and minimum <= value <= maximum)


def nullable_integer(value: Any) -> bool:
    return value is None or (isinstance(value, int) and not isinstance(value, bool) and 0 <= value <= (2**53 - 1))


def resource_identity(execution_kind: str, provider: str, adapter_key: str) -> dict[str, str | None]:
    return {
        'capability': None,
        'executionKind': execution_kind,
        'provider': provider,
        'adapterKey': adapter_key,
        'model': None,
    }


def telemetry(status: str, observed_at: str | None, reason_code: str | None,
              *, cpu: float | None = None, gpu: float | None = None,
              memory: int | None = None, storage: int | None = None,
              database_connections: int | None = None,
              process_count: int | None = None) -> dict[str, Any]:
    return {
        'status': status,
        'observedAt': observed_at,
        'reasonCode': reason_code,
        'cpuPercent': cpu,
        'gpuPercent': gpu,
        'memoryBytes': memory,
        'storageBytes': storage,
        'databaseConnections': database_connections,
        'processCount': process_count,
    }


def resource(resource_id: str, kind: str, display_name: str, execution_kind: str,
             provider: str, adapter_key: str, observed_at: str | None = None,
             observation: dict[str, Any] | None = None) -> dict[str, Any]:
    return {
        'runtimeResourceId': resource_id,
        'environment': 'development',
        'kind': kind,
        'displayName': display_name,
        'identity': resource_identity(execution_kind, provider, adapter_key),
        'routingScope': None,
        'telemetry': observation or telemetry('unknown', observed_at, 'NOT_OBSERVED'),
    }


def systemd_properties(unit: str) -> dict[str, str]:
    result = run_readonly([
        'systemctl', 'show', unit,
        '-p', 'ActiveState', '-p', 'SubState', '-p', 'NRestarts', '-p', 'MainPID',
        '-p', 'MemoryCurrent',
    ])
    if result.returncode != 0:
        return {}
    values: dict[str, str] = {}
    for line in result.stdout.splitlines():
        key, separator, value = line.partition('=')
        if separator and key in {'ActiveState', 'SubState', 'NRestarts', 'MainPID', 'MemoryCurrent'}:
            values[key] = value.strip()
    return values


def http_status(url: str) -> int | None:
    request = urllib.request.Request(url, headers={'Accept': 'application/json'}, method='GET')
    try:
        with urllib.request.urlopen(request, timeout=3) as response:
            return int(response.status)
    except urllib.error.HTTPError as error:
        return int(error.code)
    except (OSError, ValueError):
        return None


def service_snapshot(resource_id: str, kind: str, display_name: str, unit: str,
                     observed_at: str, health_urls: tuple[str, ...] = ()) -> dict[str, Any]:
    properties = systemd_properties(unit)
    active = properties.get('ActiveState') == 'active' and properties.get('SubState') == 'running'
    memory = as_int(properties.get('MemoryCurrent'))
    restarts = as_int(properties.get('NRestarts'))
    checks = tuple(http_status(url) for url in health_urls)
    checks_ok = all(value is not None for value in checks) and all(value in {200, 401, 403} for value in checks)
    fresh = bool(properties) and active and (restarts == 0) and (checks_ok if health_urls else True)
    reason = None if fresh else ('SERVICE_UNAVAILABLE' if not properties else 'SERVICE_DEGRADED')
    observation = telemetry('fresh' if fresh else ('partial' if properties else 'unknown'), observed_at, reason,
                            memory=memory)
    return resource(resource_id, kind, display_name, 'service', 'qimao', unit, observed_at, observation)


def psql(query: str) -> str | None:
    result = run_readonly([
        'runuser', '-u', 'postgres', '--', 'psql', '--no-psqlrc', '-d', APP_DB_NAME, '-Atqc', query,
    ], timeout=10)
    return result.stdout.strip() if result.returncode == 0 else None


def pg_is_ready() -> bool:
    return run_readonly(['pg_isready', '-q', '-d', APP_DB_NAME], timeout=5).returncode == 0


def postgresql_snapshot(observed_at: str) -> dict[str, Any]:
    unit = 'postgresql@15-main.service'
    properties = systemd_properties(unit)
    active = properties.get('ActiveState') == 'active' and properties.get('SubState') == 'running'
    stats = psql("SELECT COALESCE(numbackends,0) FROM pg_stat_database WHERE datname=current_database();")
    connections = as_int(stats) if stats else None
    restarts = as_int(properties.get('NRestarts'))
    ready = pg_is_ready()
    fresh = bool(properties) and active and restarts == 0 and ready and connections is not None
    memory = as_int(properties.get('MemoryCurrent'))
    observation = telemetry('fresh' if fresh else ('partial' if properties else 'unknown'), observed_at,
                            None if fresh else ('POSTGRESQL_AGGREGATE_UNAVAILABLE' if properties else 'SERVICE_UNAVAILABLE'),
                            memory=memory, database_connections=connections)
    return resource(RESOURCE_DEFS[2][0], RESOURCE_DEFS[2][1], RESOURCE_DEFS[2][2], 'service', 'postgresql', unit, observed_at, observation)


SAFE_ENV_KEYS = {
    'QIMAO_UPLOAD_STORAGE_KIND', 'QIMAO_S3_PROVIDER', 'QIMAO_S3_REGION', 'QIMAO_S3_BUCKET',
    'QIMAO_S3_ENDPOINT', 'QIMAO_S3_UPLOAD_MODE', 'QIMAO_S3_PRESIGN_TTL_SECONDS', 'QIMAO_DIRECT_UPLOAD_ORIGIN',
}


def read_storage_env() -> dict[str, str]:
    values: dict[str, str] = {}
    try:
        with ENV_PATH.open(encoding='utf-8', errors='strict') as stream:
            for raw in stream:
                line = raw.strip()
                if not line or line.startswith('#') or '=' not in line:
                    continue
                key, value = line.split('=', 1)
                key = key.strip()
                if key in SAFE_ENV_KEYS:
                    values[key] = value.strip()
    except (OSError, UnicodeError):
        return {}
    return values


def cos_snapshot(observed_at: str) -> dict[str, Any]:
    values = read_storage_env()
    expected = {
        'QIMAO_UPLOAD_STORAGE_KIND': 's3',
        'QIMAO_S3_PROVIDER': 'tencent-cos',
        'QIMAO_S3_REGION': 'ap-nanjing',
        'QIMAO_S3_BUCKET': 'milaidi-upload-1310313248',
        'QIMAO_S3_ENDPOINT': 'https://cos.ap-nanjing.myqcloud.com',
        'QIMAO_S3_UPLOAD_MODE': 'browser_direct',
        'QIMAO_S3_PRESIGN_TTL_SECONDS': '600',
    }
    config_ok = bool(values) and all(values.get(key) == value for key, value in expected.items())
    observation = telemetry('partial' if config_ok else 'unknown', observed_at,
                            'PROVIDER_NOT_QUERIED' if config_ok else 'STORAGE_CONFIG_UNAVAILABLE')
    return resource(RESOURCE_DEFS[3][0], RESOURCE_DEFS[3][1], RESOURCE_DEFS[3][2],
                    RESOURCE_DEFS[3][3], RESOURCE_DEFS[3][4], 'browser_direct', observed_at, observation)


def build_snapshot(now: dt.datetime | None = None) -> dict[str, Any]:
    observed = now or utc_now()
    observed_at = iso(observed)
    resources = [
        service_snapshot(RESOURCE_DEFS[0][0], RESOURCE_DEFS[0][1], RESOURCE_DEFS[0][2], RESOURCE_DEFS[0][5], observed_at,
                         ('http://127.0.0.1:3001/health', 'http://127.0.0.1:3001/api/projects')),
        service_snapshot(RESOURCE_DEFS[1][0], RESOURCE_DEFS[1][1], RESOURCE_DEFS[1][2], RESOURCE_DEFS[1][5], observed_at),
        postgresql_snapshot(observed_at),
        cos_snapshot(observed_at),
    ]
    return {
        'schemaVersion': SCHEMA_VERSION,
        'environment': 'development',
        'observedAt': observed_at,
        'expiresAt': iso(observed + dt.timedelta(seconds=VALID_FOR_SECONDS)),
        'resources': resources,
    }


def fixture_snapshot() -> dict[str, Any]:
    now = utc_now()
    observed_at = iso(now)
    resources = [
        resource(resource_id, kind, display_name, execution_kind, provider, adapter_key or 'unknown', observed_at,
                 telemetry('unknown', observed_at, 'FIXTURE_UNKNOWN'))
        for resource_id, kind, display_name, execution_kind, provider, adapter_key in RESOURCE_DEFS
    ]
    return {
        'schemaVersion': SCHEMA_VERSION,
        'environment': 'development',
        'observedAt': observed_at,
        'expiresAt': iso(now + dt.timedelta(seconds=VALID_FOR_SECONDS)),
        'resources': resources,
    }


def validate_snapshot(snapshot: Any) -> None:
    if not isinstance(snapshot, dict) or set(snapshot) != {'schemaVersion', 'environment', 'observedAt', 'expiresAt', 'resources'}:
        raise SnapshotError('SCHEMA_TOP_LEVEL')
    if snapshot['schemaVersion'] != SCHEMA_VERSION or snapshot['environment'] != 'development':
        raise SnapshotError('SCHEMA_VERSION')
    if not all(is_date_string(snapshot[key]) for key in ('observedAt', 'expiresAt')):
        raise SnapshotError('SCHEMA_TIMESTAMP')
    if dt.datetime.fromisoformat(snapshot['expiresAt'].replace('Z', '+00:00')) <= dt.datetime.fromisoformat(snapshot['observedAt'].replace('Z', '+00:00')):
        raise SnapshotError('SCHEMA_EXPIRY')
    if not isinstance(snapshot['resources'], list) or len(snapshot['resources']) != len(RESOURCE_DEFS):
        raise SnapshotError('SCHEMA_RESOURCE_COUNT')
    expected_ids = {entry[0] for entry in RESOURCE_DEFS}
    actual_ids: set[str] = set()
    for item in snapshot['resources']:
        if not isinstance(item, dict) or set(item) != {'runtimeResourceId', 'environment', 'kind', 'displayName', 'identity', 'routingScope', 'telemetry'}:
            raise SnapshotError('SCHEMA_RESOURCE_FIELDS')
        if not isinstance(item['runtimeResourceId'], str) or not ID_PATTERN.fullmatch(item['runtimeResourceId']):
            raise SnapshotError('SCHEMA_RESOURCE_ID')
        actual_ids.add(item['runtimeResourceId'])
        if item['environment'] != 'development' or item['kind'] not in KIND_VALUES or not isinstance(item['displayName'], str) or not 1 <= len(item['displayName']) <= 120:
            raise SnapshotError('SCHEMA_RESOURCE_IDENTITY')
        identity = item['identity']
        if not isinstance(identity, dict) or set(identity) != {'capability', 'executionKind', 'provider', 'adapterKey', 'model'}:
            raise SnapshotError('SCHEMA_IDENTITY')
        if identity['capability'] not in {None, 'asr', 'screen_text', 'delivery'}:
            raise SnapshotError('SCHEMA_CAPABILITY')
        if not nullable_string(identity['executionKind'], 40) or not nullable_string(identity['provider'], 80) or not nullable_string(identity['adapterKey'], 120) or not nullable_string(identity['model'], 120):
            raise SnapshotError('SCHEMA_IDENTITY_VALUE')
        routing_scope = item['routingScope']
        if routing_scope is not None:
            if not isinstance(routing_scope, dict) or set(routing_scope) != {'workflowStage', 'poolId'} or routing_scope['workflowStage'] not in {'asr', 'screen_text'} or not isinstance(routing_scope['poolId'], str) or not 1 <= len(routing_scope['poolId']) <= 80:
                raise SnapshotError('SCHEMA_ROUTING_SCOPE')
        observation = item['telemetry']
        if not isinstance(observation, dict) or set(observation) != {
            'status', 'observedAt', 'reasonCode', 'cpuPercent', 'gpuPercent', 'memoryBytes', 'storageBytes',
            'databaseConnections', 'processCount',
        }:
            raise SnapshotError('SCHEMA_TELEMETRY')
        if observation['status'] not in STATUS_VALUES:
            raise SnapshotError('SCHEMA_STATUS')
        if observation['observedAt'] is not None and not is_date_string(observation['observedAt']):
            raise SnapshotError('SCHEMA_TELEMETRY_TIMESTAMP')
        if not nullable_string(observation['reasonCode'], 80) or (isinstance(observation['reasonCode'], str) and not REASON_PATTERN.fullmatch(observation['reasonCode'])):
            raise SnapshotError('SCHEMA_REASON')
        for key in ('memoryBytes', 'storageBytes', 'databaseConnections', 'processCount'):
            value = observation[key]
            if not nullable_integer(value):
                raise SnapshotError('SCHEMA_INTEGER')
        for key in ('cpuPercent', 'gpuPercent'):
            value = observation[key]
            if not nullable_number(value, 0, 100):
                raise SnapshotError('SCHEMA_PERCENT')
    if actual_ids != expected_ids:
        raise SnapshotError('SCHEMA_RESOURCE_IDS')


def write_atomic(snapshot: dict[str, Any], output: Path, enforce_runtime_permissions: bool) -> None:
    validate_snapshot(snapshot)
    parent = output.parent
    parent.mkdir(parents=True, exist_ok=True, mode=0o750)
    if enforce_runtime_permissions:
        try:
            import grp
            group_id = grp.getgrnam('qimao').gr_gid
            os.chmod(parent, 0o750)
            os.chown(parent, 0, group_id)
        except (KeyError, OSError, ImportError):
            raise SnapshotError('RUNTIME_GROUP_UNAVAILABLE')
    fd, temporary = tempfile.mkstemp(prefix='.telemetry.', dir=parent)
    temporary_path = Path(temporary)
    try:
        payload = json.dumps(snapshot, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n'
        with os.fdopen(fd, 'w', encoding='utf-8', newline='\n') as stream:
            stream.write(payload)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary_path, 0o640)
        if enforce_runtime_permissions:
            import grp
            os.chown(temporary_path, 0, grp.getgrnam('qimao').gr_gid)
        os.replace(temporary_path, output)
        if os.name == 'posix':
            directory_fd = os.open(parent, os.O_RDONLY | getattr(os, 'O_DIRECTORY', 0))
            try:
                os.fsync(directory_fd)
            finally:
                os.close(directory_fd)
    except OSError:
        try:
            temporary_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise SnapshotError('ATOMIC_WRITE_FAILED')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--fixture-out', type=Path)
    parser.add_argument('--validate', type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        if args.validate:
            with args.validate.open(encoding='utf-8') as stream:
                validate_snapshot(json.load(stream))
            print('validation=passed')
            return 0
        if args.fixture_out:
            write_atomic(fixture_snapshot(), args.fixture_out, False)
            print('fixture=written')
            return 0
        write_atomic(build_snapshot(), args.output, True)
        return 0
    except (OSError, ImportError, json.JSONDecodeError, SnapshotError):
        print('runtime_snapshot=blocked', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
