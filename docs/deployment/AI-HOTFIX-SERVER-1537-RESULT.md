# AI-HOTFIX-SERVER-1537

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## evidence

- 本地仅消费已核对的生产基线归档并生成唯一候选 `ai-hotfix-1537`：archive=`10266135` bytes，SHA-256=`57eaf77f96ac481ba3240d47f9500fe885ec560e2eb630d37b6b07d683ae7564`；manifest=`1511` bytes，SHA-256=`e2276db5e3b1882bd459d7009f077b68b1fb8a1647b87b69fc01e2145622335f`；audit=`88` bytes，SHA-256=`6b5de257a4b8879228e63024278130a67844cd19f504245264b424e702b9940a`。候选保留唯一本地目录 `C:\Users\ComradeGu\Documents\七猫兼职\ai-hotfix-1537`。
- 候选相对生产基线的 backend source 差量为 6 个已核实热修文件：ASR queue claim、画面字 queue claim、ASR scheduling limit，以及画面字 fake 门移除的 `errors/routes/service`；编译物随之替换。员工 `frontend/dist` 为 4 个文件，入口存在、assets=`3`、术语最终流程标记存在，`SCREEN_TEXT_FAKE_DISABLED` 在候选 backend/dist 中为 0 命中。
- 本机验证：backend build exit=`0`；frontend build exit=`0`；release runner 实际 Git Bash `bash -n` exit=`0`；runner CR byte=`0`。
- 发布前只读基线：current=`/opt/qimao-terms-cloud/releases/term-budget-capability-20260830-r1`；employee static=`/srv/qimao-terms-cloud/frontend-employee-upload-background-20260830-r1`；health=`200 application/json`；backend、ASR、screen-text 均 `active/running`、`NRestarts=0`、`ExecMainStatus=0`；现有 ASR route=`df527ca0-8fa9-4edd-abde-48cb355c6775`，target=`5ab81d77-1cb7-4b2a-92f8-83cdf8795899`，容量=`1/1/10`。
- 外部动作计数：transfer directory create=`1`；SCP=`1`（exit=`0`）；root release runner=`1`（exit=`0`）；route write=`0`；budget write=`0`；manual DB write=`0`；screen-text batch/API write=`0`；DeepSeek=`0`；COS 新调用=`0`；本片未调用受保护员工 API。
- runner 当时的成功输出为新 current=`/opt/qimao-terms-cloud/releases/ai-hotfix-1537`、新 employee static=`/srv/qimao-terms-cloud/frontend-ai-hotfix-1537`、health=`200`、assets=`3`，并观察到既有 batch `e6edf993-15ab-4302-a535-4ae382b7c9b3` 首个 attempt 已出现。
- 发布后只读复核发现确定门失败：backend PID=`686037`、screen-text PID=`686052` 正常；ASR PID=`686138` 虽为 `active/running`，但 `NRestarts=1`。同一 batch 随后为 `running`，attempts=`2`，其中 provider request id 存在数=`1`、completed=`1`、leased=`1`；逐 attempt 脱敏事实为 `attempt 1=completed/provider_request_id present`、`attempt 1=leased/provider_request_id absent`。未重发 Tencent/COS，也未创建第二业务请求。
- 既定回滚 exit=`0`：current/static 恢复发布前目标；新 release/static、stage、transfer 均 absent；backend、ASR、screen-text 均恢复 `active/running`、`NRestarts=0`、`ExecMainStatus=0`；health=`200 application/json`；ASR route 仍为原 target 与容量 `1/1/10`。最近 ASR journal 的安全错误过滤无可保留条目，未据此臆测更深层 crash 原因。

## external_counts

```yaml
deepseek: 0
tencent_create_by_control_plane: 0
tencent_request_id_observed_in_existing_batch: 1
cos_new_call: 0
business_api_writes: 0
system_control_writes: 0
manual_database_writes: 0
backend_restart: 2
asr_restart: 2
screen_text_restart: 2
rollback: 1
scp: 1
root_runner: 1
```

## rollback

已执行且完成本片唯一回滚。生产 current/static、route、budget、env、DB schema 与控制面未被本片修改；三个受影响 unit 已恢复健康。新 immutable release/static 和远端 transfer/stage 已清理。

## remaining_gap

热修未保留在生产 current。首个可证伪异常是发布后 ASR unit `NRestarts=1`，并且观察到第二个 leased attempt；由于任务禁止现场补丁、取消/重建 batch 或重复外部调用，本片停止。route `8/6/300` 仍需规划通过现有管理员页面完成，不能由本片绕过受保护 API 直接写入。

## next_owner

`PLANNER`：先基于已回滚基线审查 ASR unit 的一次重启与 batch 第二个 leased attempt，再单独签发后续动作；不得盲重发 Tencent/COS 或直接修改数据库。

## residual

- 生产 residual：既有 batch 保留 `1 completed attempt + 1 leased attempt`，provider request id 存在数=`1`；本片未清理或篡改该业务事实。
- 本地 residual：唯一候选目录 `C:\Users\ComradeGu\Documents\七猫兼职\ai-hotfix-1537` 保留供规划复核；本片创建的两个 `%TEMP%` 检查目录已精确删除；仓库无 runner/helper 写入。
- 服务器 residual：新 release/static、stage、transfer=`0`；生产旧 current/static、三 unit 和 route 保留。

