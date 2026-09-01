# TENCENT-ASR-SERVER-060-DB-ROLE-ATTRS

```yaml
artifact_written: true
outcome: passed
tuple: qimao|t|f|f|f|f|f|f|t|-1
direct_cause: real_attribute_difference
transaction_rolled_back: true
remote_sessions: 1
remote_writes: 0
residual: 0
next_owner: PLANNING
requires_user: false
```

## 审计范围

本轮仅审计 PostgreSQL 角色属性，不启动 synthetic，不读取 Secret、媒体或环境值，不调用 COS/Tencent，不修改表、`pg_hba`、sudoers、OS 用户或连接配置。

## evidence

- SSH 使用项目 OpenSSH config/alias；仅建立 1 个远端会话，退出码为 `0`。
- 会话前只读确认：`qimao` role 为 `absent`。
- 在单个 `psql` 会话内执行 `BEGIN`、一次临时 `CREATE ROLE`、属性查询和 `ROLLBACK`；未执行 `COMMIT`，未执行持久 `CREATE/DROP`。
- 查询 tuple（字段顺序：`rolname|rolcanlogin|rolsuper|rolcreatedb|rolcreaterole|rolreplication|rolbypassrls|password_is_null|rolinherit|rolconnlimit`）：

  ```text
  qimao|t|f|f|f|f|f|f|t|-1
  ```

- 要求属性（前 8 个字段）与实际值对照：

  ```text
  required: qimao|t|f|f|f|f|f|t
  actual:   qimao|t|f|f|f|f|f|f
  ```

- 会话结束后只读确认：`qimao` role 再次为 `absent`。
- `rolinherit=t`、`rolconnlimit=-1` 为观察值，不属于本轮要求门。

## 结论

`direct_cause=real_attribute_difference`。`rolcanlogin=true`、`rolsuper=false`、`rolcreatedb=false`、`rolcreaterole=false`、`rolreplication=false`、`rolbypassrls=false` 均符合要求；实际 `password_is_null=false`，与要求的 `true` 不符。因此 05Z 的属性校验失败是真实属性差异，不是 validator defect。

## rollback / residual

- `transaction_rolled_back=true`：事务已回滚，会话后角色 absent。
- 未留下持久 role，`residual=0`。
- 本轮没有 peer、business、生产库、控制面或外部 ASR 验证；这些不在本审计范围内。

