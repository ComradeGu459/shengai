# TENCENT-ASR-SERVER-05Y-DB-AUDIT

```yaml
artifact_written: true
outcome: passed_with_gap
direct_cause: owner_role_absent
minimal_fix: confirm/provision canonical PostgreSQL owner role qimao through the SERVER-controlled path
remote_sessions: 1
remote_writes: 0
next_owner: PLANNING
requires_user: false
```

## evidence

仅使用项目 OpenSSH config/alias 建立一次只读远端会话；未创建或删除数据库，未修改用户、sudoers 或文件，未读取连接串、Secret、素材或普通环境值。

脱敏审计结果：

| check | result |
|---|---|
| SSH identity user | `qimao-deploy` |
| SSH identity primary group | `qimao-deploy` |
| SSH identity supplementary groups | `qimao-deploy users` |
| OS user/group probe for legacy `qima` | user/group present |
| `sudo -n -u postgres -- createdb --version` | executable/status `ok` |
| PostgreSQL role query status | `ok` |
| PostgreSQL rows for canonical/legacy owner names | empty；`qimao` 与 `qima` 均无角色行 |
| sanitized `sudo -n -l` summary | `not_observed` |

`createdb --version` 成功证明该精确 sudo/可执行门未被拒绝；只读角色查询成功且目标角色集合为空，故 database create 的直接原因是 owner role absent，而不是 createdb executable/path 或 sudo contract denied。

## direct_cause / minimal_fix

`direct_cause=owner_role_absent`。bootstrap 的 `createdb --owner=qimao` 合同要求 canonical PostgreSQL owner role 存在；本轮只读证据显示 `qimao` 和 legacy `qima` 均不存在。

唯一最小修复方向是由 SERVER/规划控制面按既定权限路径确认或提供 canonical PostgreSQL `qimao` owner role，并再单独验证 peer/current_user 合同；本轮没有执行该修复。

## remaining_gap

由于审计 stdin 脚本中的一个标签拼写错误，本轮实际检查了 legacy `qimaoo` 而不是 `qimao` 的 OS user/group 存在性；未对 OS `qimao` user/group 作出结论。该缺口不改变 PostgreSQL 角色查询对 database create 首因的直接证据，但后续若继续部署必须由 SERVER 轮次补做一次受控只读 OS 账户核对。

`remote_sessions=1`，`remote_writes=0`，`next_owner=PLANNING`，`requires_user=false`。
