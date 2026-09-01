# AI-RECOVERY-SERVER-EXEC-1616-R9 结果

## outcome

`artifact_written`

仅在本地修复已复现的 `SECRET_ENV_LOAD_FAILED`，修改 `deploy/ai-recovery-1614/runner.sh`、`loader.sh`、`SHA256SUMS` 并新增本结果文档。未执行服务器、SSH/SCP、root、API、Provider、POST 或数据库动作。

## behavior

- runner 已删除对四份 `/etc/qimao-terms-cloud/*.env` 的 shell source 及 `set -a/set +a`。
- 未使用 `set +u`，未新增 env parser，也未读取或输出任何环境值。
- systemd transient service 通过四个原生 `EnvironmentFile=` 设置把现有 env 注入进程环境。
- runner 只检查执行路径所需的继承变量“已设置且非空”；失败仅输出变量名，不输出值。
- runner 在验证 inherited env 后，仍只覆盖候选 `QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN`，其余环境值保持 systemd 注入结果。
- R5 `post_started`、R6 RuntimeDirectory、R7 canonical extractor、R8 state-dir preflight、retry/preflight/route/monitor 均未修改。

## 字面 `$` 边界

`EnvironmentFile=` 由 systemd 读取并直接形成子进程环境；loader 与 runner 均不再 source、eval 或重新解析 env 文本。runner 对继承的 `QIMAO_EMPLOYEE_PASSWORD_VERIFIER` 仅做普通变量读取，并在不回显值的前提下要求字面 `$N=`、`$r=`、`$p=` 标记仍存在。

本地独立探针把包含上述字面标记的合成值通过进程环境传给 Bash，同一检查通过，证明该检查路径没有 Bash 二次解析 `$...`。

## 冻结 systemd-run 参数

主通道只能把已审核且通过 `bash -n` 的同一 loader 内容作为 stdin，并使用以下参数；不得改回 shell source：

```text
sudo -n systemd-run \
  --unit=qimao-ai-recovery-1616-loader \
  --collect \
  --wait \
  --pipe \
  --service-type=exec \
  --property=User=root \
  --property=Group=root \
  --property=RuntimeDirectory=qimao-ai-recovery-1616-loader \
  --property=RuntimeDirectoryMode=0700 \
  --property=RuntimeDirectoryPreserve=no \
  --property=EnvironmentFile=/etc/qimao-terms-cloud/backend.env \
  --property=EnvironmentFile=/etc/qimao-terms-cloud/object-storage.env \
  --property=EnvironmentFile=/etc/qimao-terms-cloud/screen-text-local-ocr-05d.env \
  --property=EnvironmentFile=/etc/qimao-terms-cloud/local-ocr-frame-extractor-05b.env \
  /bin/bash -s -- \
  /var/tmp/qimao-ai-recovery-1616-inbound \
  /run/qimao-ai-recovery-1616-loader/transfer \
  < deploy/ai-recovery-1614/loader.sh
```

## fixed hashes

- `runner.sh`：bytes `18198`，SHA-256 `b48390073bf4dc8a5117b7fb69491861fd3bd51a914aa63ba029193d33bc7a96`
- `preflight.mjs`：bytes `6582`，SHA-256 `0001ed941c76311de3192f455553413e53a7a753cb8ad343d2f53913a6f937c9`
- `retry.mjs`：bytes `12445`，SHA-256 `de97eb5725070be4159da828aa7f03cb155fb738704d45e4a8a7e6821cd9ba4e`
- `SHA256SUMS`：bytes `232`，SHA-256 `39d3e94d15273eee907f4e5e6f554894fa82dd13d9e82b5c0d28c15f60bc3dd7`
- `loader.sh`：bytes `7799`，SHA-256 `c85b9a239df53489a79a924757358c5326087aea9a32cd47892e25e7c9844213`

## verification

- `D:\Git\bin\bash.exe -n deploy/ai-recovery-1614/runner.sh`：通过。
- `D:\Git\bin\bash.exe -n deploy/ai-recovery-1614/loader.sh`：通过。
- `node --check deploy/ai-recovery-1614/preflight.mjs`：通过。
- `node --check deploy/ai-recovery-1614/retry.mjs`：通过。
- 审核 A：runner 中 env source、`set ±a`、`set +u` 均为 0；仅审本次 env 差量，通过。
- 审核 B：继承环境的字面 `$` 合成探针、固定哈希闭包及 loader 内嵌 bytes/SHA，通过。
- CR=0、BOM=0、尾随空白和限定 diff-check：通过。

## residual

- 外部动作：0。
- Secret 值读取/输出：0。
- 业务代码、retry/preflight/route/monitor、`docs/status/CURRENT.md` 修改：0。
- 未执行远端 R9；后续不得创建 R10/PREP 变体。
