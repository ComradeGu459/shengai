# TENCENT-ASR-SERVER-02F

## outcome

`artifact_written`

## evidence

- 唯一裁决：`cross_platform_junction_archive`。直接表现为归档解包后的 Linux bundle 缺少关键传递依赖；根因证据是 Windows Junction 形态经过本机归档工具进入服务器后未保留。
- 本机打包工具：`pnpm deploy --prod --legacy`；归档工具：`bsdtar 3.8.4`。
- 本机 bundle 有 `487` 个 Junction，`487` 个目标均为 Windows 路径，断链 `0`；服务器解包后符号链接 `0`、Windows 目标 `0`、相对目标 `0`、断链 `0`。
- 分层导入：ASR runtime 单独 `ok`；storage runtime 为安全错误 `Error / MODULE_NOT_FOUND`；二者同一进程导入为 `Error / MODULE_NOT_FOUND`。未取得可安全记录的相对模块名。
- 直接解析通过：`tencentcloud-sdk-nodejs-asr`、`@aws-sdk/client-s3`、`@aws-sdk/s3-request-presigner` 的 `require.resolve` 与正确 parent-context ESM resolve 均通过。
- 关键传递依赖两种解析均失败：`@aws-sdk/checksums`、`@aws-sdk/core`、`@aws-sdk/credential-provider-node`、`@aws-sdk/middleware-sdk-s3`、`@aws-sdk/signature-v4-multi-region`、`@aws-sdk/types`、`@aws-sdk/util-format-url`、`@smithy/core`、`@smithy/fetch-http-handler`、`@smithy/node-http-handler`、`@smithy/protocol-http`、`@smithy/smithy-client`、`@smithy/types`、`@smithy/url-parser`、`tslib`，以及腾讯 SDK 的 `tencentcloud-sdk-nodejs-common`。
- 未读取/传输 CSV，未下载 WAV，未访问 COS/ASR；未调用 SDK 网络接口。

## remaining_gap

审计目标已完成。后续若要运行 ASR，必须由规划安排 Linux 原生可解析的 bundle 打包/传输方案；本轮不安装依赖、不修复、不新建 release。

## next_owner

架构/发布规划：修正跨平台依赖归档语义后，再重新安排独立验证任务。

## files

- `docs/deployment/TENCENT-ASR-SERVER-02F-RESULT.md`

## residual

- 本机与服务器 bundle、archive、runner、临时目录均已删除并确认零残留。
- 未修改代码、DB、route、budget、release、current、unit、service；未部署、未重启服务。
- 未保留 Secret、CSV、WAV、签名 URL、COS object key、TaskId 或供应商响应。
- 仓库其余脏工作树均为本轮前已有内容，未清理、未覆盖。

## requires_user

`true`：后续修复涉及打包/发布边界，需规划/用户另行授权；本轮只读审计已结束。
