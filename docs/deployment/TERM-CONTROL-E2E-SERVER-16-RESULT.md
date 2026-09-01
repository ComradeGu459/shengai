# TERM-CONTROL-E2E-SERVER-16

## outcome

blocked

canonical runtime tree 的权限门未满足任务合同：本轮安装文件实际为 `root:qima`，要求为 `root:qimao`。因此唯一 runner 在启动前被安全策略阻止，未执行业务 E2E。

## evidence

- canonical 目标在操作前确认 absent，随后创建目录；目录曾为 `root:qimao 0750`。
- 固定普通文件实际 metadata 为 `root:qima 0640`，不是要求的 `root:qimao 0640`；`namei` 父链已取得，文件曾可由 qima 读取，但该事实不满足 qimao 合同。
- 唯一 runner 未启动；未读取 provider 值，未进入 loopback、生产 DB、SecretReference、engine、route、project 或 Worker 业务链。
- DeepSeek POST `0`、COS 上传 `0`、Tencent CreateRecTask `0`、Describe `0`。
- 本地临时目录、canonical runtime tree、固定上传目录均已精确删除并复核 residual `0`。

## remaining_gap

- 唯一缺口是发布编排的固定文件 group 参数错误（`qima` 与要求的 `qimao` 不一致）；本轮按停止条件未修补、未重试。
- 未完成术语 extraction、候选确认、TermVersion、Tencent ASR HotwordList 与同 TaskId 完成验收。

## next_owner

PLANNING

## residual

- 远端 canonical runtime tree：absent。
- 远端固定上传目录：absent。
- 本地 `qimao-term-control-e2e-16-r1`：absent。
- provider/current/static/迁移/unit 未在本轮修改；生产基线不变。

## requires_user

false
