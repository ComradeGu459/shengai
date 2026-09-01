# AI-RECOVERY-SERVER-1609

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## outcome

用户明确执行授权后，本片完成固定 transfer、唯一 SCP 与唯一 root transient。runner 在生产写入前的原 batch 基线门以 `BATCH_BASELINE_CHANGED` 停止并执行既定清理；候选未解包、未预检、未切换，backend/Worker/retry/Provider 均未触发。

唯一首因：`BATCH_BASELINE_ORDER_FALSE_NEGATIVE`。

## root cause

- 原 batch 的语义计数仍精确为 `39 failed + 12 queued`，没有业务状态变化。
- PostgreSQL 对 `screen_text_job_status` enum 的 `ORDER BY status` 实际投影为 `queued:12,failed:39`。
- runner 将同一事实硬比较为 `failed:39,queued:12`，只因字符串顺序不同触发 `BATCH_BASELINE_CHANGED`。
- 这是发布编排门假阴性，不是候选、retry 合同、Extractor、OpenVINO 或生产数据失败。

## candidate identity

- 只消费冻结 `ai-recovery-1607-r1`，未重建或修改候选。
- archive=`10,270,355` bytes，SHA-256=`b2f5bbc158eb0ce51e4238556043182d34b80fa7b15d023e91401e3547bf0c9b`。
- manifest=`2,130` bytes，SHA-256=`fde9291ef0de981c6e65e0ef0e020c572119ca6e04225950e6cce50488337e38`。
- audit=`1,164` bytes，SHA-256=`8517f6f442b29ab8ea994c807d0e1888e9f6f2216df75ee2a7d7a1f0f87e98fc`。
- 最终内容差量仍为 1607 已冻结的八项；本片未生成任何新 archive。

## execution evidence

- 固定 transfer=`/var/tmp/qimao-ai-recovery-1609-transfer` 创建成功。
- 一次 SCP 成功；传输内容为冻结三件套及已本地通过 Node/Bash/LF 门的物理 preflight、retry helper 与 runner。
- 唯一 root transient=`qimao-ai-recovery-1609.service` 启动一次，无重放。
- root-only checkpoint：
  - `runner_started`
  - `terminal failed / BATCH_BASELINE_CHANGED`
  - `rollback current=ai-hotfix-1552 / screenWorker=stopped / health=200`
- 同一 retry identity `ai-recovery-1607-screen-text-retry` 的 command count=`0`。
- 39 个历史 attempt 仍为 `SCREEN_TEXT_TENCENT_MEDIA_UNAVAILABLE | retryable=false | external_side_effect_possible=false | failed`；count=`39`。

## production terminal facts

- current=`/opt/qimao-terms-cloud/releases/ai-hotfix-1552`。
- backend=`active/running/NRestarts=0/ExecMainStatus=0`。
- screen-text Worker=`inactive/dead/NRestarts=0/ExecMainStatus=0`。
- OpenVINO=`active/running/NRestarts=0/ExecMainStatus=0`。
- loopback health=`200`。
- batch=`queued:12,failed:39`；retry command=`0`。
- 新 release、stage、runtime、transfer、status 均 absent；transient unit LoadState=`not-found`。

## action counts

```yaml
transfer_created: 1
scp: 1
root_transient_launch: 1
candidate_preflight_runs: 0
cos_gets: 0
current_switches: 0
backend_restarts: 0
screen_text_retries_post: 0
screen_text_retry_commands: 0
screen_worker_starts: 0
openvino_calls: 0
tencent_calls: 0
budget_post: 0
manual_db_writes: 0
```

## rollback

失败发生在解包和所有生产写入前。runner 保持 current 为 `ai-hotfix-1552`、保持 screen-text Worker 停止并删除 transfer；控制端取证后精确删除 status。无需恢复 static、route、DB、env 或 unit PID。

## remaining_gap

- 冻结候选尚未执行同素材 stage preflight，也未发布。
- 原 batch 尚未执行唯一 retries，仍为 `39 failed + 12 queued`；OpenVINO 尚无本片新调用。
- 下一次 runner 只能把基线门改为分别读取 failed/queued 数值或接受数据库 enum 的规范顺序；不得重建候选或改变业务路线。

## next_owner

`PLANNER/SERVER`：审核该单点编排假阴性后，复用同一冻结 1607 三件套和现有用户授权，生成一次只修批次计数比较的执行片；不得在本片重放。

## residual

- 服务器临时残留=`0`；生产状态与执行前一致。
- 本地仅保留冻结 1607 archive/manifest/audit 与本结果文档；1609 runner、preflight、retry helper 和对账 SQL 已删除。
