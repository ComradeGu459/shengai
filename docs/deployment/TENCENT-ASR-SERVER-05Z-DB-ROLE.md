# TENCENT-ASR-SERVER-05Z-DB-ROLE

```yaml
artifact_written: true
outcome: blocked
direct_code: ROLE_ATTRIBUTE_VERIFY_FAILED
remote_sessions: 1
external_writes: 2
create_role_count: 1
rollback: role_dropped
peer_verify: passed_before_rollback
synthetic_started: false
residual: 0
next_owner: PLANNING
requires_user: false
```

## evidence

仅使用项目 OpenSSH config/alias 建立一次 require_escalated 远端会话；未创建 synthetic DB，未修改生产表、pg_hba、sudoers、OS 用户或连接配置，未读取 Secret/素材/连接串。

执行结果：

```text
precheck_status=absent
create_status=created
verify_attributes=failed
peer_verify=passed
rollback=role_dropped
```

预检确认 canonical PostgreSQL role absent 后，仅执行一次 `CREATE ROLE qimao LOGIN`，属性验证未通过；随后确认本轮 role 新建且无依赖，按授权执行精确 `DROP ROLE qimao`，回滚成功。peer 验证在回滚前通过，证明当时 OS qimao 经 Unix socket 得到 `current_user=qimao`。

## external_writes / rollback

本轮数据库写动作共 2 次：一次新建 canonical role、一次失败验证后的精确回滚；没有创建 legacy qima。回滚结果为 `role_dropped`，`residual=0`。未启动 business 或任何 COS/Tencent synthetic，因此没有外部 ASR 任务事实。

## remaining_gap

唯一阻断是新建 role 的属性验证失败；由于本轮停止条件和单会话边界，不继续暴露或诊断未通过的属性差异，也不重试 CREATE。后续若继续，需先由 SERVER/规划路径进行一次受控只读属性核对，再决定是否重新授权；本轮不再执行任何远端动作。

`next_owner=PLANNING`，`requires_user=false`。
