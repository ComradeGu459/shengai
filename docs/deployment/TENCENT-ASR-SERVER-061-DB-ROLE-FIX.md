# TENCENT-ASR-SERVER-061-DB-ROLE-FIX

```yaml
artifact_written: true
outcome: passed
attribute_tuple: qimao|t|f|f|f|f|f
password_null: true
peer: current_user=qimao
residual: role_present_authorized
next_owner: PLANNING
requires_user: false
```

## evidence

- 使用项目 OpenSSH config/alias，通过一次成功的远端会话完成本轮审计；SSH 退出码为 `0`。
- fresh 只读确认 `qimao` role 为 absent。
- 按授权执行一次持久 `CREATE ROLE qimao LOGIN PASSWORD NULL NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`。
- `pg_roles` 属性 tuple（字段顺序：`rolname|rolcanlogin|rolsuper|rolcreatedb|rolcreaterole|rolreplication|rolbypassrls`）：

  ```text
  qimao|t|f|f|f|f|f
  ```

  该 tuple 满足 `rolcanlogin=true`，以及 `rolsuper`、`rolcreatedb`、`rolcreaterole`、`rolreplication`、`rolbypassrls` 均为 `false`。
- 由 postgres 查询 `pg_authid.rolpassword IS NULL`，结果为 `true`；未读取或输出 password 值。
- 以 OS `qimao` 通过 Unix socket 查询，结果为 `current_user=qimao`。
- 本轮未启动 synthetic，未读取 Secret/媒体，未调用 COS/Tencent，未修改库表、`pg_hba`、sudoers 或 OS 用户。

## 结论

三门均通过，按用户授权保留本轮新建的 `qimao` LOGIN role。`password_null=true` 的权威来源是 `pg_authid`，不是 `pg_roles` 的密码投影。

本轮证据表明 05Z 的 password-null 失败属于 validator query-source defect：之前使用 `pg_roles` 密码列不能作为该门的权威判定；本轮使用 `pg_authid.rolpassword IS NULL` 后确认实际角色属性符合要求。

## rollback / residual

- 本轮通过全部门，未执行 DROP ROLE；`residual=role_present_authorized`。
- 持久化变更仅为用户明确授权的 `qimao` role 创建；没有其他外部或业务事实。

