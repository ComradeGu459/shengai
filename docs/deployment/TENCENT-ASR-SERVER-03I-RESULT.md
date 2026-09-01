# TENCENT-ASR-SERVER-03I 结果

## outcome

`blocked`

artifact status: `artifact_written`

本轮在唯一候选的本机无 Junction 加载门阻断。按任务卡停止，未进入候选服务器切换、官方 WAV 下载、控制面激活、COS、生产 API、Tencent ASR 或付费写入。

## evidence

- 服务器只读 preflight 通过：current 为 `20260828-local-ocr-06k-r1`；backend、screen-text Worker、upload-completion Worker 均 active，均 `NRestarts=0`；backend health 返回 `status=ok`、`database=connected`。
- 03H 唯一控制面身份仍为历史配置：deployment=`disabled`，budget 最新状态=`retired`，ASR route 最新状态=`retired`；ASR budget/route 活动指针为空；既有 screen-text 指针未改变。
- 当前树 `pnpm --filter @qimao-terms-cloud/backend deploy --prod --legacy` 仅执行一次并成功完成；未修改 package.json、lock、业务源码或服务器。
- 唯一 `fs.cp({ recursive: true, dereference: true })` 物理化尝试耗时约 `195.8 s`，生成 `79,529` 个文件、`205,626,388` bytes，重解析点=`0`；未触发 8 分钟或 2 GiB 停止阈值。
- 本机加载门失败：02F 关键包 `require.resolve` 为 `4/19`；编译导入为 `3/5`。失败类别为 `MODULE_NOT_FOUND`，具体缺失的关键传递依赖包括 `@aws-sdk/checksums`、`@aws-sdk/core`、`@aws-sdk/credential-provider-node`、`@aws-sdk/middleware-sdk-s3`、`@aws-sdk/signature-v4-multi-region`、`@aws-sdk/types`、`@aws-sdk/util-format-url`、`@smithy/core`、`@smithy/fetch-http-handler`、`@smithy/node-http-handler`、`@smithy/protocol-http`、`@smithy/smithy-client`、`@smithy/types`、`@smithy/url-parser`、`tencentcloud-sdk-nodejs-common`；storage compiled import 与 server compiled import 也未通过。
- 因加载门失败，没有形成可上传/安装的 immutable candidate archive；没有安装 03I release、ASR unit、ASR env 或 backend drop-in。
- 本轮官方 raw WAV GET 次数=`0`；COS Put/Head/signed GET/独立 GET=`0`；CreateRecTask/DescribeTaskStatus=`0`；synthetic project/DB/COS/Tencent task=`0`；预算 reservation/实际扣费=`0`。

## remaining_gap

需要规划决定并提供已验证的依赖物理化路径，使 production deploy 的实体树同时可解析上述 AWS/Smithy/Tencent 运行时传递依赖；本轮不切换第二方案、不修改业务代码、不重试 provider。候选健康门尚未成立，因此 WAV 生命周期修复和 synthetic 闭环尚未开始。

## next_owner

`PLANNER → SERVER`：先解决候选 runtime 的实体依赖加载门，再签发新的单次执行卡；新一轮仍须在候选健康后才允许固定官方 WAV 的唯一 GET。

## files

- `docs/deployment/TENCENT-ASR-SERVER-03I-RESULT.md`
- 本轮未修改 BACK/FRONT/UI/TEST 业务代码、migration、route、budget 源码、package manifest 或 lock。

## residual

- 本机 03I deploy、flat entity tree、复制日志、gate 脚本均已精确清理；远端未创建 03I 临时目录、release、unit、env、drop-in 或 WAV。
- 测试服务器保持 06K 健康；03H 历史控制面保持 disabled/retired，ASR 活动指针为空；无 synthetic、COS 对象、Tencent 任务或付费残留。
- 用户原始 Secret CSV 未读取、未传输、未修改、未写入仓库或日志。

## requires_user

`yes`：需要规划先闭合候选实体依赖加载门并重新签发唯一 lease；本轮不应下载 WAV、重放控制面或重发任何 provider/业务写命令。
