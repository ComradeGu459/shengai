# AI-RECOVERY-SERVER-PREP-1614-R3 结果

## outcome

`artifact_written`

仅在本地修正 `deploy/ai-recovery-1614/loader.sh`、`runner.sh`、`SHA256SUMS`，并新增本结果文档。未执行服务器、SSH/SCP、root、systemd-run、API、Provider 或数据库动作。

## R3 修正

### loader 输入所有权

- root、固定参数、inbound 精确目录、`qimao-deploy:qimao-deploy:700`、七个 regular file、每文件 `qimao-deploy:qimao-deploy:600` 及每文件固定 bytes/SHA 全部通过前，不安装任何会删除 inbound 的 trap。
- inbound 无效或 transfer 已被占用时直接失败，保留 inbound，也不删除未知 transfer。
- transfer 通过原子 `mkdir --mode=0700` 创建；只有 `mkdir` 成功后才设置 `created_transfer=1`，随后显式固定为 `root:root:700`。竞态占用导致 `mkdir` 失败时不会接管或清理该路径。

### runner 统一安全收口

- 现有输入与生产基线只读门全部通过后、首个写操作前，同时安装 ERR、EXIT、INT、TERM trap。
- `rollback` 入口第一步解除 ERR、EXIT、INT、TERM 全部 trap，避免递归收口。
- INT/TERM 与其他异常复用同一个 rollback；POST 前按既有 `commit-state` 证明决定是否回 1552，committed/unknown 后仍只安全停止 Screen Text Worker并保留 1607/current/env。
- 正常成功完成清理后解除 ERR、EXIT、INT、TERM 全部 trap，再输出成功终态。

### 哈希闭包

- `SHA256SUMS` 已同步当前 runner，并继续固定 runner/preflight/retry 三项。
- loader 中 runner 与 `SHA256SUMS` 的内嵌固定 SHA 已同步；preflight/retry 固定 SHA 未变化。

## local verification

- runner/preflight/retry 与 `SHA256SUMS` 哈希闭包：通过。
- loader 内嵌四项固定 SHA 与当前文件：一致。
- loader trap 顺序、原子 mkdir 与 created flag 顺序：通过限定静态检查。
- runner 四类 trap 安装、rollback 入口解除和成功出口解除顺序：通过限定静态检查。
- R3 涉及文件 CR=0、BOM=0、尾随空白=0，限定 diff-check：通过。

## residual

- 外部动作：0。
- retry/preflight 逻辑、业务源码与 `docs/status/CURRENT.md` 修改：0。
