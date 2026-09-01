# TENCENT-ASR-SERVER-03K 结果

## outcome

`blocked`

artifact status: `artifact_written`

阻断发生在候选健康门：backend 已切换并保持 active/health 正常，但 ASR Worker 进入 `activating/auto-restart`，观测到 `NRestarts=6`，未达到 active 健康要求。按停止条件未下载 WAV、未激活 control plane、未创建 synthetic、未调用 COS 或 Tencent ASR。

## evidence

- 本机只消费指定 handoff archive；尺寸=`8,827,844` bytes，SHA-256=`7eac41e46d1b6a923d5d7bacc8c8d3198a61fe2e81e86e780dd3f6692b85ab56`，均通过。未重跑 pnpm、fs.cp 或实体化，未改业务代码。
- 远端 archive SHA 一致；tar 成员审计为 `476` 个 symlink、`905` 个 hardlink，所有链接目标均为归档内相对目标且无越界。
- 解包后用 `/usr/local/bin/node` 验证真实 S3、Tencent ASR runtime、ASR Worker、app、server 入口，结果 `5/5`。
- 唯一 candidate 曾安装并原子切换为 `20260828-tencent-asr-03k-r1`；backend 重启后 active、`NRestarts=0`，health 返回 `status=ok`、`database=connected`。
- root-only ASR env 仅由临时 CSV 严格一行解析生成；临时 CSV 随后删除，未输出或写入仓库。未记录任何 Secret 值。
- ASR Worker 启动失败于 systemd 健康门：状态为 `activating`、substate=`auto-restart`、`NRestarts=6`。未执行 WAV GET；COS Put/Head/signed GET/独立 GET=`0`；CreateRecTask/DescribeTaskStatus=`0`；业务 synthetic、Tencent TaskId、预算 reservation/实际扣费=`0`。
- 安装过程中一次 shell 变量展开错误曾将 archive 内容落入精确 `/backend` 路径；在任何 current 切换前完成全量成员、类型、链接目标与文件 SHA 比对（14,893/14,893，mismatch=`0`），随后按逐项清单清理并验证该路径不存在。未触碰既有 release。

## remaining_gap

03K candidate 的 ASR Worker 未能保持 active，具体启动错误未外传原始日志；当前没有可安全证明的下一层根因。需要在不扩大范围的情况下，由规划决定一次只读的 Worker 启动错误捕获条件，或提供已验证的启动装配修正后再重新签发任务。官方 WAV 生命周期与真实 ASR 业务闭环仍未验收。

## next_owner

`PLANNER → SERVER`：先审查 ASR Worker 启动失败层，确认修正后的 unit/runtime 装配；不得据本轮失败重发 WAV、COS、CreateRecTask 或业务写命令。

## files

- `docs/deployment/TENCENT-ASR-SERVER-03K-RESULT.md`
- 本轮未修改 BACK/FRONT/UI/TEST 业务代码、migration、route、budget 源码、package manifest 或 lock。

## residual

- 测试服务器已恢复 `/opt/qimao-terms-cloud/releases/20260828-local-ocr-06k-r1`；backend active、health/database 正常、`NRestarts=0`；screen-text/upload Worker 保持 active；ASR Worker disabled/inactive。
- 03K candidate release、ASR env、backend/worker drop-ins、remote archive、remote Secret 临时件、remote temp 目录均已删除并验证不存在。
- 03H deployment 仍 disabled，budget/route 仍 retired，ASR 活动指针为空；既有 screen_text 指针未改变。
- 本机 handoff archive `C:\Users\ComradeGu\Documents\七猫兼职\.asr03j\candidate.tar.gz` 已按任务卡删除；未访问真实用户素材。

## requires_user

`yes`：需要规划先处理 ASR Worker 启动失败层并签发新的唯一 lease；本轮不应重放任何 provider 或业务写命令。
