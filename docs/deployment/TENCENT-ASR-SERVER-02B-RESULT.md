# TENCENT-ASR-SERVER-02B

## outcome

`blocked`

## evidence

- 依用户授权执行一次 `pnpm --filter @qimao-terms-cloud/backend deploy --prod --legacy`；当前锁文件生成隔离临时 bundle 成功。
- 本地 bundle 校验通过：官方 `tencentcloud-sdk-nodejs-asr` 为 `4.1.298`，compiled ASR runtime 可导入且四个关键导出存在。
- bundle 仅上传并解包到服务器 root-only 临时测试目录；未安装系统包、未创建 release、未切换 current、未修改 unit/service。
- Secret CSV 仅读校验为 1 行、列名严格、两值非空；未回显，未注入临时 env。
- 本机两种离线中文 TTS 均未形成可用 WAV：`System.Speech` 方式超时无产出；独立 SAPI 方式返回系统错误码 `0x8004503A`，局部文件已删除。
- 因 WAV 前置门失败，未执行 COS Put/Head/10 分钟 GET 签名、`CreateRecTask` 或 `DescribeTaskStatus`，未产生腾讯 TaskId，也未触碰 DB/route/budget。

## remaining_gap

当前 Windows 执行环境的两种离线中文 TTS 方式均不可用；需要一个可用的离线中文 TTS 生成方式，且生成结果必须通过 16kHz/16bit/mono WAV 校验后才能继续真实 ASR 探针。

## next_owner

规划：裁决可用的离线中文 TTS 生成输入/环境后，再交 SERVER 继续同一探针；不得重发任何腾讯 Create 请求。

## files

- `docs/deployment/TENCENT-ASR-SERVER-02B-RESULT.md`

## residual

- 本机临时 bundle、压缩包、WAV 和 Job 均已清理。
- 服务器 root-only 临时 bundle 测试目录及压缩包已删除并确认不存在。
- Secret 未进入服务器 env、仓库或日志；COS、DB、服务、route、budget、release/current 均未改变。

## requires_user

`true`：需要提供或授权一个可用的离线中文 TTS 生成方式/环境。
