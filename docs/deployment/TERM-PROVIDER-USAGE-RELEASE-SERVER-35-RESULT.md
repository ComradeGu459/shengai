# TERM-PROVIDER-USAGE-RELEASE-SERVER-35

## artifact_written

`blocked`

## outcome

本地归档与发布前门通过；唯一一次 SCP 在传输权限门失败，未执行远端 runner，未发布 current/static。

## evidence

- 本地三件套已由命令变量核对：
  - archive：`9,471,776` bytes，SHA-256=`020437197f6fef783fa04a1789ba727cf293a152d140b38630122a9677c3b925`。
  - manifest：`3,000,555` bytes，SHA-256=`61372755bb1ac1a6bbe22aaf57ea98bd0a5afba78f44c4ff3b508dc615ec6f07`。
  - audit：`1,190` bytes，SHA-256=`0f03a1de65ed6b93ae11a05c6abe95d60c8d2de4ea9e3830ef0c706663d5bcff`。
- 本地 reopen 硬门通过：`15,024` members；name/type/linkname 顺序不变；非目标 regular 内容全等；目标 SHA 差量恰为三项；`476` 条相对 symlink，绝对/越界/缺失均为 `0`；JS `node --check`、map JSON、四项 marker 均通过。
- 服务器发布前只读基线通过：`uid=999`、`gid=996`、Node `v24.19.0`；旧 current/static 分别为 `term-provider-json-20260830-r1`；四 unit 均为 `User=qimao`、`Group=qimao`、`ActiveState=active`、`SubState=running`、`NRestarts=0`、`ExecMainStatus=0`；health=`200`；active terms route 唯一且为既有 route。
- 唯一一次 SCP 失败首因：远端 staging 已规范为 `root:996 0750`，登录传输身份对目标文件无写权限，三个目标均返回 `Permission denied`；三件套未传输完成，远端 runner 次数为 `0`。
- Provider/COS/DeepSeek/Tencent/业务 API 写入=`0`；DB、迁移、provider.env、Secret、route、current/static、unit 均未修改。

## remaining_gap

归档已形成，但未进入服务器发布，因此没有新 current/static、四 unit 发布后健康或新 release 残留证据。按停止规则不重试 SCP、不现场改 runner 或 Rn。

## next_owner

`PLANNER`：如需继续，应另签唯一传输身份/目录权限修正的发布切片；本任务不重试、不改服务器权限。

## residual

- 本地三件套保留：`term-provider-usage-20260830-r1.{tar.gz,manifest.json,sha256.audit}`。
- 远端固定 staging 已精确删除并验证 `remote_staging_residual=0`。
- 本地 transfer view 与临时 runner 已精确删除；旧服务器 current/static 与四 unit 保持基线。

## requires_user

`false`
