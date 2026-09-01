import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import type {
  SystemControlCostConversionSnapshot,
  SystemControlCostConversionSnapshotList,
  SystemControlCostConversionSnapshotListQuery,
  SystemControlCreateCostConversionSnapshotBody,
} from '@qimao-terms-cloud/contracts';
import type { DatabasePool } from '../../database/pool.js';
import type { SystemControlPrincipal } from './system-control.auth.js';
import {
  conversionConflict, conversionInvalid, conversionNotFound,
  budgetCommandNotFound, budgetInvalid,
} from './system-control.budget.errors.js';

export type CostConversionRate = { rate: string };

/** 只允许启动时注入的零网络报价源；生产默认拒绝未知币种。 */
export interface CostConversionRateProvider {
  resolveRate(sourceCurrency: string): Promise<CostConversionRate | null> | CostConversionRate | null;
}

export class ZeroNetworkCostConversionProvider implements CostConversionRateProvider {
  constructor(private readonly rates: Readonly<Record<string, string>> = { CNY: '1' }) {}
  resolveRate(sourceCurrency: string) {
    const rate = this.rates[sourceCurrency];
    return rate ? { rate } : null;
  }
}

export class RejectUnknownCostConversionProvider implements CostConversionRateProvider {
  resolveRate(_sourceCurrency: string) { return null; }
}

type SnapshotRow = {
  id: string; source_currency: string; target_currency: 'CNY'; rate: string;
  rate_digest: string; effective_at: Date; expires_at: Date; status: 'available' | 'unknown'; created_at: Date;
};

const decimal = (value: unknown, field: string, maxFraction = 18) => {
  const text = String(value);
  const expression = new RegExp(`^(?:0|[1-9][0-9]*)(?:\\.[0-9]{1,${maxFraction}})?$`);
  if (!expression.test(text)) throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_UNKNOWN', `${field} 必须是非负十进制字符串。`);
  return text;
};

const normalizeCurrency = (value: string) => {
  const currency = value.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,12}$/.test(currency)) throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_UNSUPPORTED', '不支持的原币种。');
  return currency;
};

const stableDigest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const normalizeDecimalString = (value: string) => {
  const [whole = '0', fraction = ''] = value.split('.');
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || '0';
  const normalizedFraction = fraction.replace(/0+$/, '');
  return normalizedFraction ? `${normalizedWhole}.${normalizedFraction}` : normalizedWhole;
};

const statusFor = (row: SnapshotRow, now = new Date()): SystemControlCostConversionSnapshot['status'] => {
  if (row.status === 'unknown') return 'unknown';
  return row.expires_at.getTime() <= now.getTime() ? 'expired' : 'available';
};

const toSnapshot = (row: SnapshotRow): SystemControlCostConversionSnapshot => ({
  conversionSnapshotId: row.id,
  sourceCurrency: row.source_currency,
  targetCurrency: row.target_currency,
  rate: normalizeDecimalString(String(row.rate)),
  rateDigest: row.rate_digest,
  effectiveAt: row.effective_at.toISOString(),
  expiresAt: row.expires_at.toISOString(),
  status: statusFor(row),
  createdAt: row.created_at.toISOString(),
});

const page = (query: { limit?: string; offset?: string }) => ({
  limit: query.limit ? Number(query.limit) : 50,
  offset: query.offset ? Number(query.offset) : 0,
});

export type ResolvedCostConversion = {
  conversionSnapshotId: string | null;
  sourceCurrency: string;
  rateDigest: string | null;
  effectiveAt: Date | null;
  rate: string;
};

export class SystemControlCostConversionService {
  constructor(
    private readonly pool: DatabasePool,
    private readonly provider: CostConversionRateProvider = new RejectUnknownCostConversionProvider(),
  ) {}

  private async transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query('BEGIN'); const value = await operation(client); await client.query('COMMIT'); return value; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }

  private lock(client: PoolClient, key: string) {
    return client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`cost-conversion:${key}`]);
  }

  async create(input: {
    body: SystemControlCreateCostConversionSnapshotBody;
    idempotencyKey: string;
    requestId: string;
    principal: SystemControlPrincipal;
  }): Promise<{ snapshot: SystemControlCostConversionSnapshot; replay: boolean }> {
    const key = input.idempotencyKey.trim();
    if (key.length < 8 || key.length > 200) throw budgetInvalid('SYSTEM_CONTROL_BUDGET_IDEMPOTENCY_KEY_REUSED', '必须提供稳定 Idempotency-Key。');
    const sourceCurrency = normalizeCurrency(input.body.sourceCurrency);
    const effectiveAt = new Date(input.body.effectiveAt);
    const expiresAt = new Date(input.body.expiresAt);
    if (!Number.isFinite(effectiveAt.getTime()) || !Number.isFinite(expiresAt.getTime()) || expiresAt <= effectiveAt) {
      throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_UNKNOWN', '换算快照有效期无效。');
    }
    const stableKey = input.body.conversionSnapshotId;
    const requestHash = stableDigest({ ...input.body, sourceCurrency, effectiveAt: effectiveAt.toISOString(), expiresAt: expiresAt.toISOString() });
    return this.transaction(async (client) => {
      await this.lock(client, stableKey); await this.lock(client, `key:${key}`);
      const byStable = await client.query<any>('SELECT command_kind,idempotency_key,request_hash,response_snapshot FROM system_control_commands WHERE stable_command_key=$1 FOR UPDATE', [stableKey]);
      if (byStable.rows[0]) {
        const row = byStable.rows[0];
        if (row.command_kind !== 'budget_conversion_snapshot_create' || row.idempotency_key !== key || row.request_hash !== requestHash) throw conversionConflict('SYSTEM_CONTROL_BUDGET_CONVERSION_SNAPSHOT_ID_REUSED', '换算快照身份已用于不同请求。');
        return { snapshot: row.response_snapshot.snapshot as SystemControlCostConversionSnapshot, replay: true };
      }
      const byKey = await client.query<any>('SELECT stable_command_key,request_hash,response_snapshot FROM system_control_commands WHERE command_kind=$1 AND idempotency_key=$2 FOR UPDATE', ['budget_conversion_snapshot_create', key]);
      if (byKey.rows[0]) {
        if (byKey.rows[0].stable_command_key !== stableKey || byKey.rows[0].request_hash !== requestHash) throw conversionConflict('SYSTEM_CONTROL_BUDGET_CONVERSION_IDEMPOTENCY_KEY_REUSED', '换算快照幂等键已用于不同请求。');
        return { snapshot: byKey.rows[0].response_snapshot.snapshot as SystemControlCostConversionSnapshot, replay: true };
      }
      if ((await client.query('SELECT 1 FROM cost_conversion_snapshots WHERE id=$1', [stableKey])).rowCount) throw conversionConflict('SYSTEM_CONTROL_BUDGET_CONVERSION_SNAPSHOT_ID_REUSED', '换算快照身份已存在。');
      const resolved = sourceCurrency === 'CNY' ? { rate: '1' } : await this.provider.resolveRate(sourceCurrency);
      if (!resolved) throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_UNKNOWN', '当前币种没有可用的服务端换算快照。');
      const rate = decimal(resolved.rate, 'rate');
      if (rate === '0') throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_UNSUPPORTED', '换算汇率必须大于零。');
      const rateDigest = stableDigest({ sourceCurrency, targetCurrency: 'CNY', rate, effectiveAt: effectiveAt.toISOString(), expiresAt: expiresAt.toISOString() });
      await client.query(`INSERT INTO cost_conversion_snapshots(id,source_currency,target_currency,rate,rate_digest,effective_at,expires_at,status) VALUES($1,$2,'CNY',$3::numeric,$4,$5,$6,'available')`, [stableKey, sourceCurrency, rate, rateDigest, effectiveAt, expiresAt]);
      const row = await client.query<SnapshotRow>('SELECT id,source_currency,target_currency,rate::text,rate_digest,effective_at,expires_at,status,created_at FROM cost_conversion_snapshots WHERE id=$1', [stableKey]);
      const snapshot = toSnapshot(row.rows[0]!);
      await client.query(`INSERT INTO system_control_commands(command_kind,idempotency_key,stable_command_key,request_hash,resource_id,response_snapshot) VALUES('budget_conversion_snapshot_create',$1,$2,$3,$5,$4)`, [key, stableKey, requestHash, JSON.stringify({ snapshot }), stableKey]);
      await client.query(`INSERT INTO system_control_audit_events(actor_subject,actor_audience,action,resource_type,resource_id,idempotency_key,request_id,result,after_snapshot) VALUES($1,'system-control','budget_conversion_snapshot_created','cost_conversion_snapshot',$2,$3,$4,'succeeded',$5)`, [input.principal.subject, stableKey, key, input.requestId, JSON.stringify({ conversionSnapshotId: stableKey, sourceCurrency, targetCurrency: 'CNY', rateDigest })]);
      return { snapshot, replay: false };
    });
  }

  async get(id: string): Promise<SystemControlCostConversionSnapshot> {
    const row = await this.pool.query<SnapshotRow>('SELECT id,source_currency,target_currency,rate::text,rate_digest,effective_at,expires_at,status,created_at FROM cost_conversion_snapshots WHERE id=$1', [id]);
    if (!row.rows[0]) throw conversionNotFound('换算快照不存在。');
    return toSnapshot(row.rows[0]);
  }

  async list(query: SystemControlCostConversionSnapshotListQuery): Promise<SystemControlCostConversionSnapshotList> {
    const { limit, offset } = page(query); const values: unknown[] = []; const where: string[] = [];
    if (query.sourceCurrency) { values.push(normalizeCurrency(query.sourceCurrency)); where.push(`source_currency=$${values.length}`); }
    if (query.status === 'unknown') where.push("status='unknown'");
    if (query.status === 'available') where.push("status='available' AND expires_at > CURRENT_TIMESTAMP");
    if (query.status === 'expired') where.push("status='available' AND expires_at <= CURRENT_TIMESTAMP");
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const total = await this.pool.query<{ count: string }>(`SELECT count(*)::text AS count FROM cost_conversion_snapshots ${clause}`, values);
    values.push(limit, offset);
    const rows = await this.pool.query<SnapshotRow>(`SELECT id,source_currency,target_currency,rate::text,rate_digest,effective_at,expires_at,status,created_at FROM cost_conversion_snapshots ${clause} ORDER BY effective_at DESC,id DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { items: rows.rows.map(toSnapshot), total: Number(total.rows[0]?.count ?? 0), limit, offset };
  }

  async resolveForAdmission(client: PoolClient, sourceCurrencyInput: string, requestedId?: string): Promise<ResolvedCostConversion> {
    const sourceCurrency = normalizeCurrency(sourceCurrencyInput);
    if (sourceCurrency === 'CNY') {
      if (requestedId) throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_UNSUPPORTED', '人民币原生报价不能绑定外币换算快照。');
      return { conversionSnapshotId: null, sourceCurrency, rateDigest: null, effectiveAt: null, rate: '1' };
    }
    const row = requestedId
      ? await client.query<any>('SELECT id,source_currency,target_currency,rate::text,rate_digest,effective_at,expires_at,status,created_at,CURRENT_TIMESTAMP AS database_now FROM cost_conversion_snapshots WHERE id=$1 FOR SHARE', [requestedId])
      : await client.query<any>(`SELECT id,source_currency,target_currency,rate::text,rate_digest,effective_at,expires_at,status,created_at,CURRENT_TIMESTAMP AS database_now FROM cost_conversion_snapshots WHERE source_currency=$1 AND status='available' AND effective_at <= CURRENT_TIMESTAMP AND expires_at > CURRENT_TIMESTAMP ORDER BY effective_at DESC,id DESC LIMIT 1 FOR SHARE`, [sourceCurrency]);
    const snapshot = row.rows[0];
    if (!snapshot) throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_MISSING', '缺少有效的服务端换算快照。');
    if (snapshot.source_currency !== sourceCurrency || snapshot.target_currency !== 'CNY') throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_UNSUPPORTED', '换算快照币种不匹配。');
    if (snapshot.status !== 'available') throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_UNKNOWN', '换算快照状态未知。');
    const databaseNow = snapshot.database_now as Date;
    if (snapshot.effective_at > databaseNow || snapshot.expires_at <= databaseNow) throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_EXPIRED', '换算快照已过期或尚未生效。');
    return { conversionSnapshotId: snapshot.id, sourceCurrency, rateDigest: snapshot.rate_digest, effectiveAt: snapshot.effective_at, rate: String(snapshot.rate) };
  }

  async convert(client: PoolClient, snapshot: ResolvedCostConversion, originalAmount: string): Promise<string> {
    const amount = decimal(originalAmount, 'amount', 12);
    if (snapshot.sourceCurrency === 'CNY' && snapshot.conversionSnapshotId === null && snapshot.rateDigest === null) {
      const native = await client.query<{ amount_cny: string }>('SELECT (CEIL($1::numeric * 1000000) / 1000000)::text AS amount_cny', [amount]);
      return normalizeDecimalString(native.rows[0]!.amount_cny);
    }
    if (!snapshot.conversionSnapshotId || !snapshot.rateDigest) throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_MISSING', '换算快照身份不完整。');
    const result = await client.query<{ amount_cny: string }>(`SELECT (CEIL(($1::numeric * (SELECT rate FROM cost_conversion_snapshots WHERE id=$2 AND rate_digest=$3)) * 1000000) / 1000000)::text AS amount_cny`, [amount, snapshot.conversionSnapshotId, snapshot.rateDigest]);
    if (!result.rows[0]?.amount_cny) throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_MISSING', '换算快照无法读取。');
    return normalizeDecimalString(result.rows[0].amount_cny);
  }

  async resolveForSettlement(client: PoolClient, sourceCurrencyInput: string, snapshotId: string | null, rateDigest: string | null): Promise<ResolvedCostConversion> {
    const sourceCurrency = normalizeCurrency(sourceCurrencyInput);
    if (sourceCurrency === 'CNY') {
      if (snapshotId || rateDigest) throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_UNSUPPORTED', '人民币原生报价不能绑定外币换算快照。');
      return { conversionSnapshotId: null, sourceCurrency, rateDigest: null, effectiveAt: null, rate: '1' };
    }
    if (!snapshotId || !rateDigest) throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_MISSING', '历史换算快照身份不完整。');
    const row = await client.query<SnapshotRow>('SELECT id,source_currency,target_currency,rate::text,rate_digest,effective_at,expires_at,status,created_at FROM cost_conversion_snapshots WHERE id=$1 AND rate_digest=$2 FOR SHARE', [snapshotId, rateDigest]);
    const snapshot = row.rows[0];
    if (!snapshot) throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_MISSING', '历史换算快照不存在或摘要不匹配。');
    if (snapshot.source_currency !== sourceCurrency || snapshot.target_currency !== 'CNY') throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_UNSUPPORTED', '历史换算快照币种不匹配。');
    if (snapshot.status !== 'available') throw conversionInvalid('SYSTEM_CONTROL_BUDGET_CONVERSION_UNKNOWN', '历史换算快照状态未知。');
    return { conversionSnapshotId: snapshot.id, sourceCurrency, rateDigest: snapshot.rate_digest, effectiveAt: snapshot.effective_at, rate: String(snapshot.rate) };
  }
}
