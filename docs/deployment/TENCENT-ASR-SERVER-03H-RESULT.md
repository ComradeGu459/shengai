# TENCENT-ASR-SERVER-03H 结果

## outcome

`blocked`

artifact status: `artifact_written`

阻断发生在 synthetic 生产链启动前：远端固定临时路径 `/tmp/qimao-asr-03h-input/test.wav` 不存在。此前本轮对同一官方 URL 的唯一 GET 已成功，但临时 WAV 在业务链启动时不可用；按任务边界不得换源或再次 GET。

## evidence

- 前置 manifest/lock 门通过：backend 直接依赖 `typebox=1.3.12`，lock importer 同为 `1.3.12`。
- 从当前树仅执行一次 production deploy；物理化实体树最终 `links=0`，本机 bare import `9/9`、compiled import `5/5` 全通过。
- 候选归档 SHA-256 为 `f65d6a0359a321737fb938ae5e2567b326084b098a4180eccbeeff4751d1efb8`；远端解包后文件数 `92750`、链接 `0`，远端同一 resolve/import 门全通过。
- 官方 WAV 本轮唯一 GET 的门通过：HTTP 成功、`129998` bytes、SHA-256 `07805781706572202743fa5466187edb6b5410e0678ec162b7ae05f4ae271826`、RIFF/WAVE；但进入 synthetic 时临时文件已不存在。
- 03H 候选曾完成受控切换：backend health `200`、ASR Worker active、`NRestarts=0`，screen-text/upload Worker 保持 active。
- 03H control-plane 零网络 connection-test 成功，`attemptCount=1`；本次未调用腾讯 provider。budget active 且无 hard block，ASR route active。
- 因 WAV 前置门失败，未创建 synthetic project，未执行生产 upload、COS Put/签名 GET、`CreateRecTask` 或 `DescribeTaskStatus`，没有 provider TaskId、cue/quality 或非零实际金额证据。
- 失败收尾已完成：current 恢复 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`，health `200`，backend `NRestarts=0`；03H ASR route pointer=`0`、budget pointer=`0`，deployment=`disabled`；screen-text/upload 仍 active。
- 03H ASR unit、backend drop-in、ASR env、远端候选 release 与远端临时目录均不存在；本机 03H deploy/flat/archive/input 临时件均不存在。03H 不可变控制面历史行仅保留为 retired/disabled，不存在 active 半配置。

## remaining_gap

未完成唯一 synthetic 生产闭环及其验收：COS 私有对象链、一次 `CreateRecTask`、同一任务的 `DescribeTaskStatus` 至 completed、cue/quality、结构化运行证据、预算预估与非零实扣均缺失。本轮没有稳定的 Tencent 外部任务身份需要对账。

## next_owner

`PLANNER → SERVER`：需要新任务卡/新 lease 后，沿已验证 03F/03H 流程重新取得同一固定官方 WAV，并重新执行一次候选与 synthetic 闭环；不得复用本轮已失效的写身份或盲重放业务命令。

## files

- `docs/deployment/TENCENT-ASR-SERVER-03H-RESULT.md`（本结果文件）
- 本轮未修改 BACK/FRONT/UI/TEST 业务代码、migration、route、budget 源码或 lock/package manifest。

## residual

- 测试服务器恢复 06K 运行身份；screen-text/upload 业务服务健康。
- 本轮 03H backend/ASR candidate 未保留；03H control-plane deployment/version、budget/routing 历史记录分别为 disabled/retired，active 指针为零。
- synthetic project、COS 对象、Tencent TaskId 均未产生；本地源 Secret CSV 未修改，未写入仓库或结果文件。

## requires_user

`yes`：请由规划重新签发唯一新 lease/task，明确允许从同一固定 URL 只 GET 一次并提供可持续到 synthetic 执行阶段的固定临时文件边界；当前任务不再重下、不再部署、不再调用 provider。
