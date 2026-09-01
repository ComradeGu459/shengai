# TENCENT-ASR-SERVER-02E

## outcome

`blocked-clean`

## evidence

- 服务器先创建隔离 `mktemp -d` 目录并设为 `700`；原始 CSV 直接经 `scp -O` 上传，随后设为 `600`。未生成 ASR env 文件。
- 临时 bundle 从当前锁文件生成、上传并 root-only 解包；前置校验通过：服务器 `/usr/local/bin/node` 为 `v24.19.0`，SDK 为 `4.1.298`，compiled ASR runtime 可导入。
- 固定提交官方 `test.wav` 重新 GET 一次并校验通过：HTTP `200`、RIFF/WAVE、`16000 Hz`、`16 bit`、单声道、时长 `4.060000 s`、大小 `129998` bytes、SHA-256 长度 `64`。
- 主 runner 在同时加载 compiled ASR/storage runtime 阶段安全失败；未进入 CSV 内存解析、COS 或腾讯请求阶段。COS `Put/Head/签名 GET/独立 GET` 均未执行，`CreateRecTask=0`，`DescribeTaskStatus=0`，无 TaskId、对象或供应商终态。
- 失败后已删除服务器 CSV、WAV、bundle、runner 目录；只读确认临时目录不存在。本机临时 bundle 与压缩包也已清理并验证不存在。

## remaining_gap

远端 runner 的 compiled ASR/storage 同时加载失败，安全结果未保留原始异常，当前不足以判断具体远端模块加载根因；因此未完成 COS→腾讯 ASR 真实连接探针及对象 Head=404 验收。不能据本机模块存在性核对猜测或重放。

## next_owner

规划：先安排一次只读的远端 bundle 加载根因审计，再决定是否重新授权新的真实探针；本轮不重试。

## files

- [TENCENT-ASR-SERVER-02E-RESULT.md](C:/Users/ComradeGu/Documents/七猫兼职/qimao-terms-cloud/docs/deployment/TENCENT-ASR-SERVER-02E-RESULT.md)

## residual

- 本机和服务器临时 CSV/WAV/bundle/runner 均已清理；未保留 Secret、签名 URL、COS object key、TaskId 或供应商原始响应。
- 未修改业务代码、DB、route、budget、release、current、unit、service；未部署、未重启服务、未使用真实用户素材。
- 仓库其余脏工作树均为本轮前已有内容，未清理、未覆盖。

## requires_user

`true`：需要规划/用户决定是否授权后续只读加载审计及新的真实探针；本轮已 clean blocked。
