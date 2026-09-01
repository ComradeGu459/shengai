# TERM-CONTROL-FINAL-E2E-SERVER-21

- artifact_written: yes
- blocked: true
- outcome: blocked_before_business_writes
- requires_user: false

## evidence

- 外部调用前只读预检通过：`uid=999`、`gid=996`；四个目标 unit 均为 `active/running`，`NRestarts=0`、`ExecMainStatus=0`。
- root wrapper 在执行前创建了固定 runtime tree，目录 `0750`、文件 `0640`、owner `0:996`；checkpoint/stdout 已安全复制到 root-owned final evidence。
- Tencent overlay 只写入本次 runtime tree，六个配置键均存在；未修改 `/etc`、unit、源码或 canonical route。
- checkpoint 第一条确定异常：`stage=preflight`、`outcome=blocked`、`errorCode=ASR_REGISTRY_NOT_TENCENT`；进程退出码 `2`。
- 异常发生在 synthetic project 创建之前，checkpoint 中 `projectId=null`；因此本次 DeepSeek extraction POST、COS 上传、Tencent CreateRecTask 均未发生，付费 Provider 调用次数为 0。
- cleanup checkpoint 为 `PROJECT_ID_NOT_CAPTURED`，退出码 `3`；因无项目、无 COS 对象，未产生需业务清理的资源。
- 本次 runtime tree、overlay、wrapper、harness、checkpoint 副本和 synthetic video 已精确删除，服务器残留核验为 `none`。
- 唯一 canonical SecretReference、DeepSeek engine/version、active terms route 未改动，沿用上一阶段已验证状态。

## remaining_gap

未执行 DeepSeek → candidate confirmation → TermVersion → Tencent HotwordList 链路，故没有可验收的 TermVersion、hotwordDigest、HotwordList receipt 或 Tencent TaskId。首因已确定为 harness preflight 识别出的 ASR registry 不是 Tencent；按停止规则没有现场修改或重试。

## next_owner

SERVER/编排 owner：在下一次授权执行前，修正 harness 的环境装载优先级，使本次 runtime overlay 明确覆盖同名 inherited environment；随后重新执行完整的启动前 checkpoint/安全证据复制门。不得在本次任务中追加 Provider 调用。

## residual

- canonical SecretReference、engine/version 和 active terms route 按要求保留。
- 无 synthetic project、COS object、runtime tree、overlay 或临时 harness 残留。
- Secret 值、请求载荷、Base64、对象键均未输出或写入本报告。
