# TENCENT-ASR-SERVER-02L

## outcome

`passed`

## evidence

- CURRENT：`v4-1235`；formal lease：`1`。
- 使用现有 esbuild `0.28.2` 重建临时 entry；静态导入官方 ASR SDK、现有 `ProductionS3CompatibleUploadStorage`、`TencentOfficialAsrTransport` 与 `TencentAsrAdapter`。plugin 仅对精确 `encoding|supports-color` 解析到自有 namespace，onLoad 内联 `module.exports={}`；未安装依赖、未修改源码或 lockfile。
- bundle 构建参数：`bundle=true`、`platform=node`、`format=cjs`、`target=node20`；metafile 第三方 external=`0`，仅 Node builtin external。bundle SHA-256：`8f27bad48b0228db38938af388343f451b5acda95256543cffe9cc164169de71`，大小 `3664821` bytes。
- 本机无 `node_modules` 自检通过：COS 600 秒签名、官方 SDK Client 构造、transport/adapter 构造均通过，`networkCalls=0`。
- 固定官方 Python SDK 提交 WAV 仅下载一次；本机校验 `129998` bytes、RIFF/WAVE、SHA-256=`07805781706572202743fa5466187edb6b5410e0678ec162b7ae05f4ae271826`。
- 服务器临时目录为 0700；服务器复核 bundle SHA 与 WAV SHA 一致，WAV 为 `16000 Hz`、`16 bit`、`mono`、`4.060000 s`；目录无 `node_modules`。服务器 `/usr/local/bin/node` 同 bundle 自检通过，COS 600 秒签名、SDK Client、transport/adapter 均通过，`networkCalls=0`。
- 双门后原样传输 `SecretKey.csv` 并设置为 0600；Node 仅在 probe 进程内存解析，未回显或写入日志/结果。
- COS synthetic 闭环：唯一对象 `PutObject`、`HeadObject`、600 秒私有签名 GET、独立 GET 均成功；独立 GET 大小 `129998` bytes，SHA 一致。
- ASR 使用 `ap-shanghai`、`16k_zh`、`SourceType=0`；`CreateRecTask` 仅执行一次，返回数字任务身份后只对同一任务执行 `DescribeTaskStatus` 至终态；结果类别 `completed`、`quality=pass`、`cueCount=1`、媒体时长 `4060 ms`。未发生 create unknown、权限拒绝、未开通或参数拒绝，无 provider error code 需要记录。
- finally 已删除唯一 COS 对象，随后 `HeadObject` 返回 HTTP `404`。未创建 release、service、route、Worker、DB 或 budget 变更。

## remaining_gap

无本轮剩余缺口。真实 ASR probe 已完成并通过；未保留 fixture 或真实用户素材。

## next_owner

规划：可将本次单次 synthetic 结果作为 ASR 真实连接证据，后续如需业务闭环另行发放明确 lease。

## files

- `docs/deployment/TENCENT-ASR-SERVER-02L-RESULT.md`

## residual

- 本机临时 entry、bundle、metafile、WAV、临时目录：均已删除并复核不存在。
- 服务器临时 bundle、WAV、CSV、临时目录：均已删除并复核不存在。
- COS 临时对象：已 Delete，Head=`404`。
- Secret 未写入仓库、结果或日志；仓库原有脏工作树保留，未 reset、checkout、clean、stash、提交或推送。

## requires_user

`false`
