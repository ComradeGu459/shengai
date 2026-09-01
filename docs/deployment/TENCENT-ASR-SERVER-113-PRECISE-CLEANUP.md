# ASR-SERVER-113-PRECISE-CLEANUP

## outcome

blocked。R3 使用 Node `--env-file` 装配后远端以退出码 1 结束且无结构化状态输出，保守稳定码为 `REMOTE_CLEANUP_UNVERIFIED`。

## evidence

- 锁定 RunId：`asr-109-20260829-r1`；目标 root 与隔离 DB 均由该 RunId 固定推导。
- root 所有权与占用前置门通过；正确目标为 `$env_dir/object-storage.env`，其 root:qimao 0640 与 qimao 可读性门通过。
- 隔离 DB 以 `--dbname=qimao_asr_05a_109_20260829_r1` 显式选择，`current_database()` 精确匹配，project name 精确匹配 1 行。
- R3 已按 qimao + Node 两个 `--env-file` 启动既有 storage client，但远端未返回对象计数或阶段码；不能证明 COS 删除/HEAD 结果。
- 未执行可证明的隔离 DB drop 或 remote root 删除。
- 未调用 CreateRecTask、DescribeTaskStatus、cancel、重启或生产修改。
- external writes=0；未输出对象键、URL、Secret、文本或连接串。

## cleanup

按“任一步失败立即停止”执行；COS/DB/root 后续步骤均未运行。本机一次性 cleanup helper 已删除。

## residual

109 remote root 与隔离 DB 保留；COS known object count 未返回、状态未核验；`db_absent=false`、`root_absent=false`、`cleanup_errors=1`、`residual=1`。

## remaining_gap

Node 环境文件装配已改正，但远端退出码 1 且无安全阶段信息，无法确认 COS/DB/root 的后续状态；不得猜测或扩大清理路径。

## next_owner

PLANNING
