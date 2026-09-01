# AI-RECOVERY-SERVER-1611

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: true
```

## outcome

1611 在传输阶段停止。冻结候选本地身份已复核，但唯一 SCP 在本机 `CreateProcess` 前被安全审批层拒绝；未启动 SCP，未传输候选，未启动 root transient，未解包、预检、切换、重启、重试或启动 Worker。

唯一首因：`EXECUTION_APPROVAL_REJECTED_BEFORE_PROCESS_START`（安全层将包含内部生产代码的冻结 archive 发送到远端判定为敏感数据外传风险）。不得改用间接传输、第二路线或绕过审批。

## candidate identity

- 只复用冻结 `ai-recovery-1607-r1`，未重建或修改候选。
- archive=`10,270,355` bytes，SHA-256=`b2f5bbc158eb0ce51e4238556043182d34b80fa7b15d023e91401e3547bf0c9b`。
- manifest=`2,130` bytes，SHA-256=`fde9291ef0de981c6e65e0ef0e020c572119ca6e04225950e6cce50488337e38`。
- audit=`1,164` bytes，SHA-256=`8517f6f442b29ab8ea994c807d0e1888e9f6f2216df75ee2a7d7a1f0f87e98fc`。

## read-only preflight evidence

- 远端真实 current=`/opt/qimao-terms-cloud/current -> /opt/qimao-terms-cloud/releases/ai-hotfix-1552`；1552 回滚目标存在。
- backend=`active/running`；canonical ASR unit=`active/running`；OpenVINO unit=`active/running`；screen-text Worker=`inactive/dead`；本机 health=`200`。
- qimao-deploy SSH 身份、非交互 sudo 能力和受保护 backend env 可读性均通过只读门。
- 1611 固定传输目录曾创建但保持为空；SCP 被拒绝前未创建任何远端 candidate 文件。

## action counts

```yaml
transfer_directory_created: 1
transfer_directory_removed: 1
scp_process_started: 0
root_transient: 0
candidate_preflight_runs: 0
current_switches: 0
backend_restarts: 0
screen_text_retry_commands: 0
screen_worker_starts: 0
openvino_calls: 0
cos_gets: 0
tencent_calls: 0
budget_posts: 0
manual_db_writes: 0
```

## rollback and residual

- 未发生服务器业务写入，无需恢复 current、static、route、budget、env、DB 或 unit。
- 仅清理本片创建且为空的 `/var/tmp/qimao-ai-recovery-1611-transfer`；删除后复核不存在。
- 服务器 residual=`0`；生产保持 1552 基线，screen-text Worker 继续停止。

## remaining_gap

- 冻结候选尚未传输、stage 同素材 extractor 门尚未执行、production current 尚未切换。
- backend 尚未重启；原 OCR batch 尚未通过既有 retries API 恢复为 `51 queued`；screen-text Worker 尚未启动；因此没有本片 OpenVINO completed 进展，腾讯调用为 `0`。

## next_owner

`USER/PLANNER`：需要当前执行通道对“发送冻结内部生产 archive 到 `103.36.63.67`”获得安全层接受的明确授权后，SERVER 才能在同一候选、同一主机和同一可回滚范围内重试一次；不得重建候选或改用绕过审批的传输路线。

