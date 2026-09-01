# TERM-CONTROL-FINAL-E2E-SERVER-29

- `artifact_written: yes`
- `blocked: yes`
- `outcome: blocked_before_business_harness`
- `requires_user: false`

## evidence

- 运行前只读身份为数值 `uid=999`、`gid=996`；current 为 `/opt/qimao-terms-cloud/releases/term-provider-json-20260830-r1`。
- 四个目标 unit 分别读取 `ActiveState`、`SubState`、`NRestarts`、`ExecMainStatus`，均为 `active/running/0/0`；backend health 为 HTTP `200`。
- 固定 runtime tree 已按 `root:996`、目录 `0750`、已知文件 `0640` 装配；当前 release、backend/object-storage 环境副本和合并后的临时 ASR overlay 均只存在于本轮隔离树。
- 权限门失败对象为 `/opt/qimao-terms-cloud/runtime-tests/term-control-e2e-17-r1/business.mjs`，stat=`uid:gid 0:996`、mode=`0640`、类型=`regular file`；媒体 `/opt/qimao-terms-cloud/runtime-tests/term-control-e2e-17-r1/episode-001.mp4` 同为 `0:996/0640/regular file`。
- 隔离数据库迁移及 canonical `development/terms` route 只读复制门通过；未写入生产数据库、`/etc`、unit 或 canonical route。
- 唯一 runner checkpoint 在业务进程启动前后均记录 `projectId=null`、`runId=null`、`termVersionId=null`、`batchId=null`、`taskId=null`；安全副本在清理前保存。
- 业务进程未启动：精确命令返回 `exit=1`，stderr 首条确定异常为 `sudo: unknown group 996`，随后为 `sudo: error initializing audit plugin sudoers_audit`。这是数值组调用门失败，不是业务或 Provider 错误；按停止规则未改权限、未重试。
- 因失败发生在 qimao 业务进程之前，DeepSeek extraction POST=`0`、Tencent CreateRecTask=`0`，没有 project、COS asset、term run/attempt、TermVersion、ASR batch、TaskId 或 HotwordList 业务写入。
- checkpoint/stdout/stderr 的安全副本已在清理前保存；未保存原始响应、Secret、Base64、请求载荷或对象键。
- 清理完成：固定 runtime tree absent、隔离数据库 absent；本轮临时 staging 亦已删除。生产 current、四 unit 与 health 保持上述健康状态。

## remaining_gap

未执行 DeepSeek extraction → candidate confirmation → confirmed TermVersion → Tencent HotwordList 闭环，因此没有可验收的 `termVersionId`、`hotwordDigest`、合规非空 HotwordList 或 Tencent TaskId completed 证据。

## next_owner

Runner/harness 编排维护方：在下一次独立授权窗口修正 `sudo` 的数值身份解析，使运行时实际使用已查询的 UID/GID（不改权限），然后重新申请一次全新执行。SERVER-29 本轮不重试、不追加 Provider 调用。

## residual

- 生产 current、`/etc/qimao-terms-cloud`、systemd unit、canonical SecretReference/engine/version/active terms route 未修改。
- synthetic project/COS/runtime tree/隔离数据库残留为 `0`；Provider 外部调用为 `0`。
- 本轮唯一仓库变更为本结果文件；业务源码、发布产物和部署配置未修改。
