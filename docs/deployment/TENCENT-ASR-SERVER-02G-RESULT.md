# TENCENT-ASR-SERVER-02G

## outcome

`blocked-clean`

## evidence

- 唯一可证伪阻断：`recursive_dereference_expansion_incomplete`。`fs.cp` 使用 `recursive:true, dereference:true` 返回并生成了零 reparse point 的实体树，但实体树仍无法解析关键传递依赖，未达到本机加载门；因此没有进入归档上传或服务器门。
- `fs.cp` elapsed 约 `178 s`，实体树 `76,778` 个文件、`202,687,228` bytes（约 `0.189 GiB`）、Junction/symlink `0`；未触发 8 分钟、2 GiB 或持续增长停止阈值。
- 本机工具/版本：Node `v24.19.0`、pnpm `11.21.0`、`pnpm deploy --prod --legacy`、bsdtar `3.8.4`；锁文件相关包为 `@aws-sdk/client-s3` `3.1115.0`、`@aws-sdk/s3-request-presigner` `3.1115.0`、`tencentcloud-sdk-nodejs-asr` `4.1.298`。
- 本机实体树 import：ASR runtime `ok`；storage runtime `Error / MODULE_NOT_FOUND`；ASR+storage 同进程 `Error / MODULE_NOT_FOUND`。
- 本机实体树关键依赖 require/ESM resolve 失败：`@aws-sdk/util-format-url`、`@smithy/protocol-http`、`@smithy/smithy-client`、`@smithy/url-parser`、`@smithy/node-http-handler`、`@aws-sdk/middleware-sdk-s3`、`@aws-sdk/signature-v4-multi-region`。
- 本机实体树 Junction/symlink `0`，但依赖不完整；因此本轮没有生成 archive、没有 archive SHA、没有上传服务器，也没有执行远端 `/usr/local/bin/node` resolve/import 门。

## remaining_gap

物理化实体树尚未成为依赖完整且可加载的 production bundle；必须先由规划确定可验证的依赖展开/打包修正。本轮不换第二方案、不上传、不部署、不执行真实探针。

## next_owner

规划：针对 `fs.cp` 后仍缺失传递依赖的实体树做只读打包语义审计，再另行授权修正任务。

## files

- `docs/deployment/TENCENT-ASR-SERVER-02G-RESULT.md`

## residual

- 本机 source deploy、实体树、archive 均已使用 Junction-aware 边界清理并确认不存在；未跟随删除 store 或仓库目标。
- 本轮未创建服务器临时目录，未读取/传输 CSV，未下载 WAV，未访问 COS/ASR。
- 未修改代码、DB、route、budget、release、current、unit、service；未部署、未重启服务。
- 仓库其余脏工作树均为本轮前已有内容，未清理、未覆盖。

## requires_user

`true`：需要规划/用户决定后续依赖物理化修正和新的验证任务；本轮已 clean blocked。
