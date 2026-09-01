# TENCENT-ASR-SERVER-02K

## outcome

`blocked-clean`

唯一失败门：`official_fixture_http_404`。双自检已通过，但固定提交的官方 `test.wav` 下载返回 HTTP 404；按任务卡立即停止，未进行 WAV 规格校验、COS 写入或 ASR 调用。

## evidence

- CURRENT：`v4-1234`；formal lease：`1`。
- 重建同一临时 entry，静态导入官方 ASR SDK、现有 `ProductionS3CompatibleUploadStorage`、`TencentOfficialAsrTransport` 与 `TencentAsrAdapter`；未修改业务源码、package.json 或 lockfile。
- esbuild `0.28.2`，参数为 `bundle=true`、`platform=node`、`format=cjs`、`target=node20`；plugin 仅对精确 `encoding|supports-color` 使用自有 namespace，onLoad 内容为 `module.exports={}`，未使用 `external=true`。
- metafile：第三方 external `0`；external 仅为 Node builtin（去重后 `34` 项）。
- 本机空 `node_modules` 自检：COS 600 秒签名通过；官方 SDK Client 构造通过；transport/adapter 构造通过；自检记录 `networkCalls=0`。
- 服务器使用同一 bundle 完成 0700 临时目录上传、0600 文件权限设置及 `/usr/local/bin/node` 自检；服务器自检同样通过 COS 600 秒签名、SDK Client、transport/adapter 构造，`networkCalls=0`。
- 双自检后原样传输 SecretKey.csv 并设置为 0600；未输出、未写入结果、未放入进程日志。CSV 仅在后续 probe 入口设计为内存解析，但因 WAV 下载门失败未启动 probe。
- 固定官方提交 WAV 的唯一下载请求返回 HTTP `404`；因此未通过/未执行 `129998 bytes`、RIFF/WAVE、16kHz、16bit、mono、4.06s 校验。
- COS `PutObject`：`0`；`HeadObject`：`0`；签名 GET/独立 GET：`0`；`CreateRecTask`：`0`；`DescribeTaskStatus`：`0`。无 provider error code、TaskId 或真实结果可报告。
- 本轮按失败门清理了服务器 bundle、CSV、WAV（若产生）、临时目录，以及本机 entry、bundle、metafile、临时目录；服务器目录复核为 absent，本机临时目录复核为 absent。

## remaining_gap

固定提交的官方 WAV 地址当前不可取得，未达到真实 ASR 探针所需的音频规格门；本轮也未形成独立 bundle SHA 记录/远端 SHA 比对证据，因为在固定 WAV 下载失败后立即停止并清理。

## next_owner

规划：确认该官方固定提交下可验证的 immutable WAV 来源或重新裁决允许的单次输入来源，并明确是否需要将 bundle SHA 比对作为前置门重新执行。

## files

- `docs/deployment/TENCENT-ASR-SERVER-02K-RESULT.md`

## residual

- 本轮本机/远端临时 entry、bundle、metafile、CSV、WAV、目录：均已清理并复核不存在。
- COS 对象：未创建，无需删除。
- release、service、route、Worker、DB、budget：未触碰。
- 仓库原有脏工作树：保留，未 reset、checkout、clean、stash、提交或推送。

## requires_user

`true`：需要规划确认固定 WAV 的可用来源及下一轮唯一允许的前置门；在此之前不应重试下载、传输凭据或调用 ASR。
