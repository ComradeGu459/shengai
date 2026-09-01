# TENCENT-ASR-SERVER-02I

## outcome

`blocked-clean`

唯一可证伪原因：`pnpm_deploy_bundle_missing_required_runtime_transitive_dependencies`。官方 pnpm `11.22.0` 入口、production deploy 和 `fs.cp({ recursive: true, dereference: true })` 均完成，但物理化实体树仍缺少运行时必须的 AWS/Smithy/Tencent 传递依赖；因此本机加载门失败，按任务卡停止，未进入归档、上传或服务器门。

## evidence

- CURRENT：`v4-1232`；formal lease：`1`。
- npm 官方 manifest 的版本为 `11.22.0`；dist tarball 的 SHA-512 SRI 校验通过；仅用解包后的绝对 `node .../package/bin/pnpm.cjs` 入口执行，版本精确为 `11.22.0`。未使用 npx 或 Volta fallback。
- 对当前锁文件执行 production deploy 一次，进程成功退出；锁文件 supply-chain policy 检查包含 371 项，新增 169 个包。未修改 package.json、packageManager 或 lockfile。
- 使用 Node `v24.19.0` 执行官方 `fs.cp` 物理化：`recursive=true`、`dereference=true`、耗时 `195428 ms`；实体树 `73076` 个文件、`187691754` bytes（约 `0.175 GiB`）、重解析点 `0`。
- source deploy 清理前为 `12117` 个文件、`44020338` bytes（约 `0.041 GiB`）、`487` 个 Junction；未解析 Junction 目标，也未让递归删除跟随到 pnpm store 或仓库。
- 本机依赖/加载门（安全结果）：
  - ASR runtime import：`pass`。
  - S3 storage import：`fail / MODULE_NOT_FOUND`。
  - Tencent COS storage import：`fail / ERR_MODULE_NOT_FOUND`。
  - 直接解析通过：`@aws-sdk/client-s3@3.1115.0`、`@aws-sdk/s3-request-presigner@3.1115.0`、`@qimao-terms-cloud/contracts@0.0.0`、`tencentcloud-sdk-nodejs-asr@4.1.298`、`tencentcloud-sdk-nodejs-ocr@4.1.302`、`tslib@1.14.1`。
  - 无法解析的关键包：`@aws-sdk/checksums`、`@aws-sdk/core`、`@aws-sdk/credential-provider-node`、`@aws-sdk/middleware-sdk-s3`、`@aws-sdk/signature-v4-multi-region`、`@aws-sdk/types`、`@aws-sdk/util-format-url`、`@smithy/core`、`@smithy/fetch-http-handler`、`@smithy/node-http-handler`、`@smithy/protocol-http`、`@smithy/smithy-client`、`@smithy/types`、`@smithy/url-parser`、`cos-nodejs-sdk-v5`、`tencentcloud-sdk-nodejs-common`；统一安全错误为 `MODULE_NOT_FOUND`/`ERR_MODULE_NOT_FOUND`。
- 因本机门失败：未创建 archive、未连接测试服务器、未上传临时 bundle、未执行远端 `/usr/local/bin/node` resolve/import 门，故不存在 archive SHA 或远端门结果。
- 全程未读取 CSV，未下载 WAV，未访问 COS/ASR，未改 DB、route、budget、release、unit、service 或业务代码。

## remaining_gap

需要规划决定一条经验证的跨平台依赖实体化路径，使 production deploy 的物理树同时包含上述运行时传递依赖；本轮禁止切换第二方案，因此未继续修复或重试。

## next_owner

规划：基于本结果裁决下一轮唯一允许的 bundle/依赖交付方案；服务器侧尚无动作可交接。

## files

- `docs/deployment/TENCENT-ASR-SERVER-02I-RESULT.md`

## residual

- 本轮专用 pnpm tool、deploy tree、entity tree、预期 archive：均已删除并复核不存在。
- 远端临时目录：未创建。
- 仓库既有脏工作树：保留，未 reset、checkout、clean、stash、提交或推送。

## requires_user

`true`：需要规划确认下一轮唯一打包/依赖方案；在此之前不应进行服务器上传或真实 ASR 探针。
