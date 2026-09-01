# AI-RECOVERY-SERVER-MODEFIX-1622-R1 结果

状态：`artifact_written`；远端执行：`not_started`

## 本地执行资产

- `deploy/ai-recovery-1622/runner.sh`
- `deploy/ai-recovery-1622/recovery.mjs`
- `deploy/ai-recovery-1622/SHA256SUMS`

R1 已完成以下收口：

1. root runner 在读取 inbound 内容前占有固定非阻塞 `flock`。随后先把 inbound 目录收口为 `root:root:0700`，再把三文件收口为 `root:root`、单硬链接；runner 为 `0500`，helper 与 SHA manifest 为 `0400`，目录最终封为 `0500`。冻结 SHA 校验发生在上述 root takeover 之后，消除了校验期间的 `qimao-deploy` 写入窗口。
2. extractor env 备份、切换临时文件和回滚均使用 GNU `cp --archive --reflink=auto`。该路径保留原 owner、group、mode、ACL、xattr 与其他可保留元数据；内容替换在已复制 inode 上截断写入，原 metadata 不被重新创建。回滚恢复完整备份并复核内容及 owner/group/mode。
3. preflight 保持生产同形的 `spawn(extractor, args)`，不允许 `/usr/local/bin/node extractor.js` 绕过执行位。
4. full recovery 只在新 Attempt `51/51 completed`，且 51 个 Job 的 `queued=0`、`running=0`、`failed=0`、安全 settled `=51` 时成立。监控超时但仍无新失败、Tencent、unknown 或 old-media 时，只输出 `mode_fix_validated/continuation_required`，不得输出 full pass。
5. 保留唯一新 retry key、冻结 51 集且 episodes 恰为 `1..51`、r1→r2 仅 extractor `0644→0750`、POST 后不回滚且不重发；未增加 ASR、route 或 Provider 写入。

## 验证

- Git Bash `bash -n`：通过。
- Node `--check`：通过。
- SHA256 闭包：通过。
- CRLF：脚本与 manifest 均为 LF，CR 字节 0。
- 静态顺序门：`flock → directory takeover → file takeover → read-only seal → SHA`。
- 静态语义门：direct spawn 1 处；Node 绕过 0 处；新 key 1 处；旧 key 0 处；51/51 full gate 与 continuation terminal 各 1 条。

## 既有只读事实

- current 与 extractor env 均指向 r1。
- r1 extractor 为普通文件，`qimao:qimao:0644`；`qimao` 可读但不可执行。
- backend、ASR、OpenVINO 为 `active/running`、`NRestarts=0`；screen Worker 为止损状态 `inactive/dead`。
- r2、1622 runtime 与 inbound 均不存在。

## 外部状态与残留

- R1 严格未执行 SCP、SSH、systemd-run、POST 或任何远端动作。
- r2 未创建；current/env 仍保持 r1；新 retry command 为 0；screen Worker 未启动。
- 本地仅修改上述 deploy 资产与本结果文档；未修改业务源码、route、Provider、ASR 或数据库。
