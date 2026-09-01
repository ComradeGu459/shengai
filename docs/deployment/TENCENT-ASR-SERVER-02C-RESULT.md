# TENCENT-ASR-SERVER-02C

## outcome

`blocked-clean`

本轮在服务器临时执行脚本启动 Node 前停止，未进入 COS 或腾讯 ASR 调用阶段。阻断原因是脚本固定调用 `/usr/bin/node`，而测试服务器实际 Node 可执行文件为 `/usr/local/bin/node`。按任务卡“官方 raw WAV 只下载一次、不得盲重放”的边界，本轮不重建临时目录、不重新下载 WAV、不重放探针。

## evidence

- 使用当前 `pnpm-lock.yaml` 生成一次临时 production bundle；本地校验 SDK 版本为 `4.1.298`，compiled Tencent ASR runtime 可导入。
- 从固定官方 raw HTTPS 地址只下载一次；服务器校验结果：HTTP `200`、RIFF/WAVE、`16000 Hz`、`16 bit`、单声道、时长 `4.060000 s`、大小 `129998` bytes、SHA-256 长度 `64`。
- 用户 CSV 读取并校验为单行 `SecretId,SecretKey`；凭据仅注入服务器 root-only `600` 临时环境文件，未回显，随后随临时目录清理。
- 服务器第一执行命令在 `/usr/bin/node` 不存在处退出；因此 COS `Put/Head/签名 GET/独立 GET`、腾讯 `CreateRecTask`、`DescribeTaskStatus` 均为 `not_run`，没有 TaskId、对象或供应商终态。
- 只读核对确认服务器实际 Node 路径为 `/usr/local/bin/node`；远端临时目录和 bundle 压缩包均已不存在。

## remaining_gap

未完成私有 COS→腾讯 ASR 真实连接探针；缺少 COS 读写证据、官方参数请求证据、单次 CreateRecTask 受理结果、同一 TaskId 轮询终态及终态后对象删除/Head=404 证据。由于唯一官方 WAV 已按本轮要求清理，不能在本任务内再次下载或重放。

## next_owner

规划：在新的、明确允许重新准备官方 WAV 的任务中修正执行器路径为服务器实际 `/usr/local/bin/node`，然后重新安排一次完整探针；不得在本结果基础上自行重试。

## files

- [TENCENT-ASR-SERVER-02C-RESULT.md](C:/Users/ComradeGu/Documents/七猫兼职/qimao-terms-cloud/docs/deployment/TENCENT-ASR-SERVER-02C-RESULT.md)

## residual

- 本机临时 bundle 目录与压缩包：已清理。
- 服务器临时 bundle、官方 WAV、凭据环境文件及测试目录：已清理；目录与压缩包只读复核不存在。
- 未修改业务代码、DB、route、budget、release、current、unit、service；未部署、未重启服务、未使用真实用户素材。
- 未写入 Secret、签名 URL、COS object key、TaskId 或供应商原始响应。
- 仓库其余脏工作树均为本轮前已有内容，未清理、未覆盖。

## requires_user

`true`：需要规划/用户为后续新任务重新授权一次官方 WAV 准备与真实 ASR 探针；本轮不再执行任何外部动作。
