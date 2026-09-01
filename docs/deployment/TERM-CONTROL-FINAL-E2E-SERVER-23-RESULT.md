# TERM-CONTROL-FINAL-E2E-SERVER-23

- `artifact_written: yes`
- `blocked: yes`
- `outcome: blocked_after_deepseek_provider_protocol_failure`
- `requires_user: false`

## 结论

本轮按 SERVER-23 只执行了一次真实术语链路。前门和装配门通过；DeepSeek 入口请求被接受，但同一 run 的 Worker 失败，未进入候选确认、TermVersion 或 Tencent ASR 阶段。因此本轮未达到完整闭环，未重发 DeepSeek，也未调用 Tencent CreateRecTask。

## 证据

- 运行前数值身份：UID `999`、GID `996`。runtime tree 为 `root:996`、目录 `0750`、已知文件 `0640`。
- 零网络前门通过：effective env 顺序为 `backend>object-storage>runtime-asr-overlay`；`NODE_ENV=production`；Tencent registry 默认 provider 为 `tencent_cloud`，adapter 为 `tencent_cloud_recorded_v1`。
- `createApp` 构造后断言 `NODE_ENV` 已恢复为 `production`；没有把全局 harness 设为 `test`。
- synthetic project `ee4bae95-febb-4d6a-9a7e-67274df06357` 创建返回 HTTP `201`；manifest `44f481b4-98d2-46df-8c2b-5a57019b0e13` 确认；两个 COS 资产上传均返回 HTTP `200`。
- DeepSeek extraction 入口 POST 返回 HTTP `202`，request key 为 `term-control-final-e2e-23-extraction-v1`，没有重发。
- 数据库持久记录：run `818d6036-9617-4453-91a5-63d42dfcfa8c` 于 `2026-08-30 03:50:54.374 +08` 创建，status=`failed`、candidate_count=`0`、error_code=`TERM_PROVIDER_PROTOCOL_INVALID`；attempt `bd7f7ae7-64f0-4878-933b-e8a8390fcdc3` 于 `03:50:54.518 +08` 开始 provider 阶段，并于 `03:51:10.939 +08` 失败。该错误码是本轮第一条确定的业务失败证据。
- checkpoint stdout 在清理前已复制为安全证据；只保留阶段、稳定 ID、HTTP 状态、错误码和退出码，未写入 Secret、Base64、载荷、对象键或原始文本。
- Tencent CreateRecTask 次数为 `0`；没有 ASR batch、TaskId、HotwordList、termVersionId 或 hotwordDigest 可验收。
- 清理-only 动作完成：project lifecycle=`purged`、assets=`0`、active uploads=`0`、cleanup status=`completed`；purge tombstone 为 `asset_count=2`、`object_deleted_count=2`、`object_missing_count=0`、`terminated_upload_count=0`。
- 最终四个 unit 均为 `active/running`，`NRestarts=0`，`ExecMainStatus=0`：backend、term-extraction Worker、secret-validation Worker、connection-test Worker。
- 远端 SERVER-23 临时 runtime tree、checkpoint、视频和临时脚本均已按精确路径删除，最终核验 `residual=none`。

## 剩余缺口

未形成 confirmed TermVersion，也未形成合规非空 HotwordList；Tencent 真实 ASR 闭环未执行。DeepSeek provider 的 HTTP 响应正文未保留，确定可归因证据为数据库中的 `TERM_PROVIDER_PROTOCOL_INVALID`。

## 下一责任方

下一次执行前由 harness 维护方修正两点：按当前 extraction 响应结构持久化返回的 run ID，而不是读取不存在的顶层 ID；清理 helper 按 lifecycle 接口的 `{ project: ... }` 响应投影读取版本。修正后再由 SERVER 角色按同一预算和 checkpoint 门执行一次，不在本轮现场重试。

## 残留与变更边界

canonical route、engine/version、SecretReference、生产 `/etc`、systemd unit 和生产源码均未修改。唯一保留的是既有 canonical 配置；本轮 synthetic project/COS/runtime 资源已清理。

