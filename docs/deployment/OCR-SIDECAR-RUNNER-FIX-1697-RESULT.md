# OCR-SIDECAR-RUNNER-FIX-1697-R1 结果

- `artifact_written`: `true`
- `outcome`: `passed`
- `target`: `103.36.63.67`（本轮未连接）
- `next_owner`: `规划 / SERVER`（如需部署，必须重新授权）
- `requires_user`: `false`

## 修正范围

仅修正 `deploy/ocr-sidecar-contract-1694/runner.sh` 的 env 整文件身份校验：

- 删除整文件 SHA/bytes 的固定常量；保留 owner/mode、必需键、四个 old-runtime path-bearing 键及既有 unit/state/runtime/hash/residual 门。
- 在上述 env 结构门全部通过后，runner 动态捕获当前 env 的 SHA-256 和 bytes，作为本轮 rollback 身份。
- 在创建 backup 前、生成候选 env 后写入前分别重检当前 env 的动态身份；漂移时以 `ENV_CONCURRENT_CHANGE` 阻断，不能写入 env 或 `current`。
- backup 同时检查 SHA、bytes 和 `cmp`；env 已切换后的失败路径仍使用 backup 恢复，并以 `cmp` 验证原样恢复。
- archive 业务载荷、runtime candidate、unit/state/restart 范围未改；不记录 env 值或 Secret。

## 冻结三件套

| 文件 | bytes | SHA-256 |
| --- | ---: | --- |
| `work/ocr-sidecar-contract-20260901-r1.tar.gz` | 7,254 | `e6abe176e7907f6c52fecfbd3d3209c91b201456257d9671621598cedb43abc0` |
| `deploy/ocr-sidecar-contract-1694/runner.sh` | 21,320 | `409b3a6f8f11820fbdb0a8a09ce9e03e25f9f4d4d61f23644591dbebaee0851b` |
| `deploy/ocr-sidecar-contract-1694/SHA256SUMS` | 182 | `069b6e7ac9fd594d39cddf9529e18109cf63120712a4689c8e8f38f280d0c8bc` |

临时 staging 中执行 `sha256sum -c SHA256SUMS`：archive 与 runner 均 `OK`。archive 仍为 4 个安全成员、2 个 regular 文件；未生成第二候选 archive、runner 或版本目录。

## 验收证据

- `D:\Git\bin\bash.exe --noprofile --norc -n deploy/ocr-sidecar-contract-1694/runner.sh`：exit `0`。
- repository shell gate（空比较 RHS/LHS 扫描）：无命中；`systemctl start=0`，`systemctl restart=2`，仍仅为同一 OpenVINO unit 的 candidate/rollback 路径。
- 安全本地 fixture（Git Bash，临时目录，退出自动清理）实际通过，exit `0`：
  - 818B 与 900B 两种合法 env 大小均由动态捕获 baseline SHA/bytes，backup identity、候选替换前 `cmp`、恢复后 `cmp` 均通过；
  - 并发漂移在写入前被识别为 `ENV_CONCURRENT_CHANGE`，runner env write `0`、current write `0`；
  - 输出：`fixture=passed dynamic_sizes=818B,900B success_switch=backup_identity+prewrite_cmp+env_restore_cmp concurrency=blocked runner_env_write=0 runner_current_write=0`。
- runner 与 SHA 清单均 `CR=0`、无 UTF-8 BOM；runner 中不再出现旧/新整文件 env SHA 或 798/818 bytes 固定常量。

## 服务器动作与残留

本轮未执行 SSH/SCP、上传、root、daemon-reload、systemd restart、API、Provider、Worker、队列、DB、COS、route 或 budget 动作。临时 fixture/staging 已删除；无本地部署残留。

`remaining_gap`：三件套仍未上传或部署。后续若再次授权，须使用本清单；runner 失败自动恢复 geometry-r3 unit/env，并精确清理 stage/runtime/drop-in/inbound/temp。
