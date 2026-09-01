# TENCENT-ASR-SERVER-02D

## outcome

`blocked-clean`

02C 的执行器路径已按要求改为服务器实际 `/usr/local/bin/node`，但本轮在最终凭据传输纠偏阶段停止。规划要求的本机受控临时目录 `.NET WriteAllLines` 五行 env 校验失败，因此 `scp -O` 未执行；依照“该条仍失败即 clean blocked，不再试第三种传输”，未进入 COS 或腾讯 ASR。

## evidence

- 临时 bundle 从当前锁文件生成并装配；服务器前置门用 `/usr/local/bin/node` 干净通过：版本 `v24.19.0`、SDK `4.1.298`、compiled Tencent ASR runtime 导入成功。
- 前置门通过后，从固定官方提交重新下载一次 `test.wav` 并校验通过：HTTP `200`、RIFF/WAVE、`16000 Hz`、`16 bit`、单声道、时长 `4.060000 s`、大小 `129998` bytes、SHA-256 长度 `64`。
- 本机用指定 `.NET WriteAllLines` 生成五行 env 的本地行数校验失败；因此纠偏步骤的 `scp -O` 没有执行，也没有建立可采信的本轮凭据装配。
- 未执行私有 COS `Put/Head/签名 GET/独立 GET`，未执行腾讯 `CreateRecTask` 或 `DescribeTaskStatus`；没有 TaskId、COS 对象或供应商终态。
- 服务器临时目录、官方 WAV、bundle、env 及候选上传路径已清理并验证不存在；本机临时 env、bundle 目录与压缩包已清理并验证不存在。

## remaining_gap

未完成私有 COS→腾讯 ASR 真实连接探针，缺少 COS 内容校验、10 分钟签名 GET、单次 CreateRecTask、同一 TaskId 终态和终态后对象 Head=404 证据。

## next_owner

规划：为后续任务重新安排一次受控凭据文件传输与完整探针；本轮不得重试或变更传输方式。

## files

- [TENCENT-ASR-SERVER-02D-RESULT.md](C:/Users/ComradeGu/Documents/七猫兼职/qimao-terms-cloud/docs/deployment/TENCENT-ASR-SERVER-02D-RESULT.md)

## residual

- 未修改业务代码、DB、route、budget、release、current、unit、service；未部署、未重启服务、未使用真实用户素材。
- Secret 未回显、未写入仓库或结果文件；未输出签名 URL、COS object key、TaskId 或供应商原始响应。
- 仓库其余脏工作树均为本轮前已有内容，未清理、未覆盖。

## requires_user

`true`：需要规划/用户为后续新任务重新授权凭据传输和腾讯 ASR 真实探针；本轮已 clean blocked。
