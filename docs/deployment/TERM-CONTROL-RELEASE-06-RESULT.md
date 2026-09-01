# TERM-CONTROL-RELEASE-06 结果

`artifact_written=true`；`outcome=passed`。本轮消费冻结 122A-R1 三件套，以 canonical `qimao:qimao` 执行一次发布 runner；未重建候选、未复制旧 node_modules、未增加路线或修改业务源码。

## outcome

```yaml
outcome: passed
runner: one
scp: one
provider_stdin: utf8_no_bom_raw_bytes_single_lf
business_identity: qimao:qimao
bootstrap_identity: qimao-deploy
next_owner: PLANNING
requires_user: false
```

## evidence

- 本地门：冻结 archive `9,417,436` bytes，SHA-256=`c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`；manifest `115,768` bytes，SHA-256=`48cc60997ee4d52ae700e2eab879ab31a6c07f421796a2565f8721d95feef961`；manifest=`607` 项；runner CR byte=`0`；Node probe/Bash runner syntax=`0`。
- provider stdin 本地 raw-byte 门通过：UTF-8 无 BOM，末字节=`0A`，CR byte=`0`；Secret 未进入参数、日志或报告。
- 唯一 runner 已完成 staging、输入身份、qimao 可读性、tar、五入口 11-gate、provider、迁移、release/static、四 unit 和 health/API/static 流程；未执行第二 runner。
- 只读最终核对：`current` 指向 `/opt/qimao-terms-cloud/releases/20260829-term-control-122a-r1`；release 为 `root:qimao 0750`；管理员 static 指向 `/srv/qimao-terms-cloud/system-frontend-20260829-term-control-122a-r1`，目标目录为 `root:root 0755`。
- `/etc/qimao-terms-cloud/provider.env` 已存在，metadata=`root:root 0600`、`225` bytes；未读取或输出其内容。
- 四个目标 unit 最终均为 `User=qimao`、`Group=qimao`、`LoadState=loaded`、`ActiveState=active`、`SubState=running`、`ExecMainStatus=0`、`NRestarts=0`，并加载本轮 drop-in：backend、term-extraction、secret-validation、connection-test。
- health 只读核对=`200 application/json; charset=utf-8`；无 Provider、DeepSeek、COS、Tencent、engine、route、run 或其他业务外部调用。
- 本轮执行封装未回显 runner 全量 stdout；以上成功判断由 runner 终态资源与同路径只读 postcheck 共同确认，未据缺失输出猜测失败或补发部署。

## migration_and_release

- `backend/dist/database/migrate.js` 为唯一迁移入口，按 Runbook 只运行一次；没有 `db-baseline.mjs`、`db:setup`、down、drop 或第二次 migration。
- 四项冻结迁移门已在 runner 流程中通过：`1754976029000`、`1754976030000`、`1754976031000`、`1754976032000`。
- backend release 与管理员 static 均为新 immutable 目标；current/static 通过 `.next` 后 `mv -Tf` 原子切换，旧目标保留为回滚点。
- 四份 canonical drop-in 只使用 `EnvironmentFile` 的 backend/object-storage/provider，业务路径均以 `/usr/local/bin/node --preserve-symlinks-main` 运行。

## cleanup_and_baseline

- 固定 staging `/tmp/qimao-term-control-release-final` 最终 `absent`；本地传输副本已删除，冻结三件套原文件未修改。
- 成功终态按 Runbook 保留新 release/static/provider/drop-in/迁移及旧回滚目标；未删除历史 release、未修改员工站或旧 upload/OCR/ASR Worker。
- 生产 current/static/provider、迁移、四 unit 的变化均限于本次已授权发布范围；旧 upload/OCR/ASR 基线未被 runner 的目标 unit 操作扩展。

## external_actions

```yaml
scp: 1
remote_runner: 1
provider_install: 1
database_migration: 1
daemon_reload: 1
deepseek_calls: 0
cos_calls: 0
tencent_calls: 0
engine_route_run_writes: 0
```

## remaining_gap

无发布阻断缺口。runner 全量 stdout 未被外层执行封装回传，但固定路径只读终态与成功门一致；本轮不再补做部署或重试。

## files

- 新增：`docs/deployment/TERM-CONTROL-RELEASE-06-RESULT.md`。
- 未修改业务源码、候选 archive/manifest/SHA、SSH config、唯一 Runbook 或既有 deployment harness。

## residual

```yaml
remote_staging: 0
local_transfer_temp: 0
new_release_retained_as_deployed: 1
new_static_retained_as_deployed: 1
provider_retained_as_deployed: 1
rollback_target_retained: 1
unexpected_residual: 0
```

`next_owner=PLANNING`；`requires_user=false`。
