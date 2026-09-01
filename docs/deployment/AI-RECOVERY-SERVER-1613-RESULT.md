# AI-RECOVERY-SERVER-1613

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: true
```

## outcome

1613 已只读复核主通道传入的冻结三件套与生产基线，但唯一 root 执行命令在本机 `CreateProcess` 前被安全审批层拒绝；SSH、远端 Bash 语法门和 root transient 均未启动，因此未发生 stage、同素材预检、current/env 切换、backend 重启、screen-text retries、Worker 启动或供应商调用。

唯一首因：`ROOT_EXECUTION_APPROVAL_REJECTED_BEFORE_PROCESS_START`。安全层认为该命令会以 root 修改生产 release/current 与 extractor 配置、重启 backend、调用 retry API 并启动 Worker，但当前执行通道没有获得其可接受的用户精确授权证明。不得改用间接命令、第二路线或绕过审批。

## evidence

- 远端固定 transfer 在执行前逐项复核通过：archive=`10,270,355` bytes、SHA-256=`b2f5bbc158eb0ce51e4238556043182d34b80fa7b15d023e91401e3547bf0c9b`；manifest=`2,130` bytes、SHA-256=`fde9291ef0de981c6e65e0ef0e020c572119ca6e04225950e6cce50488337e38`；audit=`1,164` bytes、SHA-256=`8517f6f442b29ab8ea994c807d0e1888e9f6f2216df75ee2a7d7a1f0f87e98fc`。
- 执行前 production current=`/opt/qimao-terms-cloud/releases/ai-hotfix-1552`；新 release、1613 stage、runtime 均不存在；backend、ASR、OpenVINO active，screen-text Worker inactive，health=`200`。
- root 命令拒绝发生在本机进程创建前；`qimao-ai-recovery-1613.service` 最终 `LoadState=not-found`，证明 transient 未创建。
- 停止清理后再次核对：current仍为1552；新 release/stage/runtime absent；backend/ASR/OpenVINO active；screen-text Worker inactive；health=`200`。

## action counts

```yaml
remote_transfer_verified: 1
scp_in_1613: 0
root_runner_process_started: 0
root_transient: 0
candidate_preflight_runs: 0
current_switches: 0
extractor_env_switches: 0
backend_restarts: 0
screen_text_retry_posts: 0
screen_text_retry_commands: 0
screen_worker_starts: 0
openvino_calls: 0
cos_gets: 0
tencent_calls: 0
manual_db_writes: 0
```

## remaining_gap

- 冻结候选未发布；同素材 stage extractor 门与 live markers 未执行。
- 原 OCR batch 仍保持 `39 failed + 12 queued`，没有投影为 `51 queued`，也没有新的 OpenVINO completed 进展。
- root 执行被拒后按停止合同清除了 transfer；下一次若继续，不能把本片写成已消费过 SCP/root/transient，必须重新建立经安全层接受的精确授权和唯一传输/执行切片。

## next_owner

`USER/PLANNER`：需要用户直接确认允许在 `103.36.63.67` 上执行以下精确可回滚生产动作，并使安全审批层接受该授权：以 root 解包冻结 `ai-recovery-1607-r1`、更新 production current 与 extractor env、重启 backend、通过既有 screen-text retries API 对原 batch 执行一次幂等恢复、启动 screen-text Worker；失败时恢复1552并停止Worker。授权不包含 static、route、migration、手改DB、ASR重试或腾讯调用。

## residual

- 已删除并复核不存在：`/var/tmp/qimao-ai-recovery-1612-transfer` 及其三件固定文件。
- 新 release、stage、runtime、transient residual=`0`。
- 生产 residual=`0`；current/env/DB/unit均未被1613修改。

