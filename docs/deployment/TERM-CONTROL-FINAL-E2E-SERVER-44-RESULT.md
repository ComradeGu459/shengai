# TERM-CONTROL-FINAL-E2E-SERVER-44

## 交付

'blocked'

## outcome

- transient unit 唯一启动 1 次；bootstrap 已完成 'prepared'，随后在十表 route-copy 阶段失败。
- 唯一确定失败码：'RUNNER_route_copy'，exit=1；status 已在 root-only checkpoint 中持久化，未读取 raw journal，未重放、未现场补丁。
- 未进入 business invocation，因此未执行 DeepSeek extraction、TermVersion、Tencent ASR 或 HotwordList；本片 DeepSeek POST=0、Tencent CreateRecTask=0、COS/API 写入=0。

## evidence

- 固定 usage archive：'9,471,776' bytes，SHA-256 '020437197f6fef783fa04a1789ba727cf293a152d140b38630122a9677c3b925'；未使用旧 d8e1 archive。
- 媒体只生成 1 次：'736,325' bytes，SHA-256 'bceac576c7502dd93badf8e5f00a4fc1979013773c28c0d283e44476694d542d'；ffprobe 通过，时长 '15.000000' 秒，单路 'h264/video' 与 'aac/audio'。
- 本地 bootstrap/business node-check=0；远端一次 SCP 后五个固定文件 owner/mode 均为 '1000:1000/0644'，archive/media bytes 与 SHA 核对一致。
- root-only status 顺序到达：'identity start → runtime start → env_readability passed → bootstrap prepare_start → prepared → route_copy start → terminal failed/RUNNER_route_copy'。
- route-copy 只向隔离数据库导入既定十表；production route 仅作只读源，未写 production DB、current、Secret、provider/config、unit 或业务代码。
- 失败清理后生产 health=200；四 unit 分别逐 property 为 ActiveState='active'、SubState='running'、NRestarts='0'、ExecMainStatus='0'：backend、term extraction、secret-validation、connection-test。

## cleanup / residual

- 已删除远端 transfer、root-only status、runtime、隔离数据库及 transient unit；unit LoadState=not-found。
- 已删除本地 business 副本、媒体目录、transfer view 与临时 runner；冻结 archive 未修改。
- residual=0

## remaining_gap / next_owner

- remaining_gap=route-copy 阶段外层 runner 失败，真实术语闭环未执行；内层首因未在安全保留证据中暴露，不能推断具体 SQL/route 子步骤。
- next_owner=TERM-CONTROL-FINAL-E2E 编排诊断。
- requires_user=false
