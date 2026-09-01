# TERM-CONTROL-HOTWORD-E2E-SERVER-54

artifact_written

## outcome

`completed`。本片完成一次隔离的 DeepSeek extraction → confirmed TermVersion → Tencent ASR HotwordList completed 闭环；未发布、未修改生产 current/static、控制面、route、CAM、Secret 或源码。

冻结 runner 的最终 status 将本次业务标为 `unknown / ASR_TASK_ACCEPTED`，但这是其持久事实投影缺陷：runner 只看到 `providerRequestId` 就归类为 accepted，未优先判断已完成的 attempt。清理前以同一隔离 DB 的 canonical 记录复核，术语与 ASR 均已完成，因此按真实业务状态验收。

## evidence

- 输入目录：`C:\Users\ComradeGu\Documents\七猫兼职\term-control-e2e-budgetfix-final`；manifest SHA-256=`2bdb6d10e49745af2fa6e2df6fe91c280557759a2af9341f95a043b7eb3777e2`。
- 五个冻结输入逐项 bytes/SHA 全等：

  | path | bytes | SHA-256 |
  |---|---:|---|
  | `term-budget-capability-20260830-r1.tar.gz` | 9,471,790 | `169b62a48f14dec962fcc9041c518e5b2fb36b0aefef15cefb4ad141b025804e` |
  | `bootstrap.mjs` | 27,910 | `c75696ae484c23beb9fc955021e8de78126cd23fef6e3ca5da9ef90aedff51fb` |
  | `business.mjs` | 73,143 | `213a61f2493ff3a63026f73e7c5190e8a7960ad451fe8cba31567fac9845910e` |
  | `runner.sh` | 18,136 | `73eb72bebf11289d34be2dbfcf63a923a911879fa5a3e3681d7b30d6a2ffa25e` |
  | `media/episode-001.mp4` | 736,325 | `bceac576c7502dd93badf8e5f00a4fc1979013773c28c0d283e44476694d542d` |

- manifest bytes=`732`，SHA-256 与冻结值全等；bootstrap/business/runner/manifest 均 CR byte=`0`。
- 本地 Node=`v24.19.0`；bootstrap/business `node --check`、runner 实际 Git Bash `D:\Git\bin\bash.exe --noprofile --norc -n`、两个既有 `--self-test` 均 exit=`0`。
- 远端前门：`qimao` 数值 UID/GID=`999/996`，Node=`v24.19.0`；固定 transfer/runtime/status/transient 均 absent。
- 唯一文件化传输：SCP=`1`，五个文件远端 bytes/SHA 全等；未传 manifest。唯一 transient=`1`，`qimao-term-control-final-e2e-46.service` launch exit=`0`，最终 `LoadState=not-found`、`Result=success`、`ExecMainStatus=0`。
- runner checkpoint 已到 `bootstrap=prepared`、`migrate=migrated`、`route_copy=verified`；隔离 pointer=`1`、`terms_api target=1`，与生产 active route 身份匹配。
- 业务稳定身份：run=`term-control-final-e2e-46-r1`；project=`14bdf7c1-702c-4177-b72f-8bd994518617`；termRun=`03675941-4b2c-4201-884a-e811462af7c9`；termAttempt=`77058373-4308-4dc1-89f3-3c6b27c3093d`。
- 术语 canonical 状态：run=`completed`；attempt=`succeeded`；TermVersion=`6c6e3b68-9036-46f1-92c7-0202509a484f`、status=`confirmed`、item count=`2`。
- ASR canonical 状态：batch=`2f5f5ed6-8039-4b6a-a21f-4517871aa24d`、job/attempt/result=`completed`、quality=`pass`、cue count=`1`；`termVersionId` 与术语版本一致。
- HotwordList 使用事实：batch digest 与 attempt/result digest 均为 `68391bb95c8e6c0ebfa623aa982d4c33b8ee202c2c577c20523f984a22d85a92`；payload item count=`2`、character count=`5`，非空且受约束。TaskId 为同一官方正数身份，已脱敏保存；同一 TaskId terminal=`completed`，未创建第二任务。
- 外部调用：DeepSeek POST=`1`、HTTP=`200`；Tencent CreateRecTask=`1`；第二次 DeepSeek/Create=`0`。Tencent Describe 由同一次 ASR Worker 在同一 TaskId 上进行有界查询并到达 completed；本 frozen externalFacts 未单独导出 Describe 次数，本片未追加查询。
- 清理前已持久化上述脱敏事实；未保存 Secret、原始响应、载荷、COS 对象键或语音正文。
- 生产收尾只读：current=`/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1`；active route=`1|deepseek|deepseek-v4-flash|1|active`；四 unit 分别均为 `ActiveState=active`、`SubState=running`、`NRestarts=0`、`ExecMainStatus=0`；health HTTP=`200`。static 路径收尾检查为 absent，本片未对其执行写操作。

## cleanup

- `drop-db` exit=`0`；既有 bootstrap cleanup exit=`0`，包含 synthetic project/COS/runtime 清理。
- 固定 `/tmp/qimao-term-control-final-e2e-46-transfer`、`/tmp/qimao-asr-term-control-final-e2e-46-r1`、`/run/qimao-term-control-final-e2e-46.status.jsonl` 均已精确删除并复核 absent；transient 已 collect，`LoadState=not-found`；隔离 DB count=`0`。
- 本地临时 SCP 助手与脱敏证据暂存已删除；冻结五文件目录保留且未修改。

## remaining_gap

- 业务结果已满足验收，但冻结 runner 的 `classifyPersistedAsrFact` 将已完成 provider attempt 投影成 `accepted/unknown`，导致 runner 自身没有执行其最终 verify 分支；本片未现场修改或重放。下一次维护应修正该只读分类优先级，并重新做本地门审阅。
- 本片未在执行前单独持久化 static 路径的初始 lstat；收尾为 absent，且本片没有任何生产 static 写操作。

## next_owner

业务 harness / 规划 Owner：修正已完成 attempt 的结果投影门；SERVER 不在本片改源码、route、配置或发布。

## residual

远端本次 transfer/runtime/status/隔离 DB/COS 临时对象/transient/harness 均为 `0`；生产 current/route/四 unit/health 未变。唯一保留物为本地冻结输入目录及本结果文档。

## requires_user

false
