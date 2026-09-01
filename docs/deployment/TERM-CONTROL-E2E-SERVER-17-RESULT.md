# TERM-CONTROL-E2E-SERVER-17

- artifact_written: `docs/deployment/TERM-CONTROL-E2E-SERVER-17-RESULT.md`
- outcome: `blocked`

## evidence

- 执行身份已查询并固定为数值 `UID=999`、`GID=996`。
- 固定 runtime tree `/opt/qimao-terms-cloud/runtime-tests/term-control-e2e-17-r1` 创建时元数据符合要求：目录 `uid=0,gid=996,mode=750`；已知文件 `uid=0,gid=996,mode=640`。数值身份可读文件且不可写，Node 语法检查通过。
- 唯一一次 E2E 在启动真实应用、创建 synthetic project、上传 COS 对象及任何业务 provider 写请求之前失败；首个且唯一错误为 `TENCENT_ASR_DISABLED_IN_PRODUCTION`（`DISABLED_IN_PRODUCTION`）。
- 本次 DeepSeek POST 数量为 `0`，Tencent Create 数量为 `0`，未知请求数量为 `0`。
- 未达到 DeepSeek run、候选确认、TermVersion、ASR 同 TaskId completed、`termVersionId`/`hotwordDigest`/合规 `HotwordList` 验收项，因此没有可锁定的业务结果标识。
- 失败后未发现 synthetic project 或 synthetic COS 对象；固定 runtime tree 已精确移除并确认不存在。
- 当前 release 未变更，四个目标 unit 均保持 `active/running`：`MainPID` 分别为 `553993`、`554005`、`554053`、`554065`；均为 `NRestarts=0`、`ExecMainStatus=0`。

## remaining_gap

真实一键 runner 以数值 `999:996` 启动时，没有获得当前生产 Tencent ASR 注册器要求的启用配置，无法进入术语提取与 ASR 热词链路。需要在新的执行切片中由 SERVER 提供与已批准生产运行环境一致的非泄漏配置注入方式；本次不重试。

## next_owner

`SERVER`：先补齐受控 runner 的生产配置注入与只读前置证据，再申请新的 E2E 执行切片。

## residual

- 远端固定 runtime tree：已清理。
- synthetic project、COS 对象、上传记录：本次未创建；无待清理残留。
- 本地合成媒体与临时 runner：已清理。
- 未修改业务代码、provider/current/static、迁移、unit 或生产数据。

## requires_user

`是`：后续真实 E2E 需要新的执行切片/授权；本次不自动重试。
