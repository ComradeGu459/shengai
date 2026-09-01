# OCR-SIDECAR-NODE24-FIX-1699 结果

- `artifact_written`: `true`
- `outcome`: `passed`
- `target`: `103.36.63.67`（本轮未连接）
- `next_owner`: `规划 / SERVER`（如需部署，必须重新授权）
- `requires_user`: `false`

## 唯一修正

仅从 `deploy/ocr-sidecar-contract-1694/runner.sh` 的候选 import gate 删除 Node 24 不接受的冗余 `--experimental-default-type=module`，保留 `--input-type=module -e`、top-level `await`、dynamic import、HTTP 200 与 `videoDurationMs` 契约检查。未改 archive、业务代码、env 基线、rollback、unit/state 或服务范围。

Node.js v24 CLI 文档将 `--input-type=module` 定义为控制 `--eval` 输入按 ESM 解析的选项：[Node.js v24.11.0 CLI 文档](https://nodejs.org/download/release/v24.11.0/docs/api/cli.html#--input-typetype)。

## 冻结三件套

| 文件 | bytes | SHA-256 |
| --- | ---: | --- |
| `work/ocr-sidecar-contract-20260901-r1.tar.gz` | 7,254 | `e6abe176e7907f6c52fecfbd3d3209c91b201456257d9671621598cedb43abc0` |
| `deploy/ocr-sidecar-contract-1694/runner.sh` | 21,285 | `ae88de7515c2cdffdbc60b0ed9c2d34e942bf20f25d99768c99509f83ce87349` |
| `deploy/ocr-sidecar-contract-1694/SHA256SUMS` | 182 | `bfc834d515ca4a5feae7dc57e0f26c5de776d6a3d638b7a6b843ca09a11e4cc8` |

临时 staging 中执行 `sha256sum -c SHA256SUMS`：archive 与 runner 均 `OK`。archive 成员仍为 `runtime/`、`runtime/node/`、`runtime/node/entry.js`、`runtime/node/sidecar.js`；archive SHA/bytes 未变，candidate archive 数量为 `1`。

## 验收证据

- 项目固定 Node：`v24.19.0`。
- 旧参数实测返回 `old_flag_rc=9`；新命令实际通过：`node24_import=passed top_level_await=passed dynamic_import=passed protocol=screen_text_local_ocr_v1`，`new_flag_rc=0`。
- 同形态 candidate fixture 实际通过，exit `0`：`fixture=passed node24_import=1 top_level_await=1 dynamic_import=1 http_status=200 videoDurationMs=1234`。
- `D:\Git\bin\bash.exe --noprofile --norc -n deploy/ocr-sidecar-contract-1694/runner.sh`：exit `0`；`--experimental-default-type=module` 命中 `0`，`--input-type=module` 命中 `1`。
- repository diff-check：空比较 RHS/LHS 无命中；`systemctl start=0`，`systemctl restart=2`；runner 与 SHA 清单 `CR=0`、无 UTF-8 BOM；SHA 清单 `sha256sum -c` exit `0`。

## 服务器动作与残留

本轮未执行 SSH/SCP、上传、root、daemon-reload、systemd restart、API、Provider、Worker、队列、DB、COS、route 或 budget 动作。临时 Node fixture/staging 已删除；无本地部署残留。

`remaining_gap`：候选仍未上传或部署；如需执行，须重新授权并沿用本清单。若 import 门再次失败，按 runner 的既有失败回滚路径停止，不增第二路线。
