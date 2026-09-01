# OCR-SIDECAR-CONTRACT-SERVER-PREP-1694-R1 结果

- `outcome`: `passed`
- `role`: `SERVER`
- `target`: `103.36.63.67`（本卡未连接）
- `next_owner`: `规划 / SERVER（仅在重新授权后部署）`
- `requires_user`: `true`

## 修正范围

本卡只修正现有唯一 1694 候选的两项冻结错误：

1. runner 的 `old_current` 已改为生产审计确认的 `/opt/qimao-terms-cloud/releases/ocr-media-error-20260831-r1`。
2. `SHA256SUMS` 已按最终 runner 字节刷新；归档内容未改动，未生成第二候选。

活动 sidecar 旧 runtime、候选 runtime、模型/venv 引用及仅重启 OpenVINO 的范围均保持不变。

## 冻结三件套

| 文件 | bytes | SHA-256 |
| --- | ---: | --- |
| `work/ocr-sidecar-contract-20260901-r1.tar.gz` | 7,254 | `e6abe176e7907f6c52fecfbd3d3209c91b201456257d9671621598cedb43abc0` |
| `deploy/ocr-sidecar-contract-1694/runner.sh` | 20,449 | `bc0ffe6f0e89eade2828776979a2a4b2a933fe3b581ed4a0c08156e81d2b4949` |
| `deploy/ocr-sidecar-contract-1694/SHA256SUMS` | 182 | `4264c172db1b6d9643cf1784dc506575ec482119d93190bfcd120dd2c28c1b19` |

SHA 清单两行分别与归档、runner 的最终 bytes/SHA 一致。归档成员严格为 `runtime/`、`runtime/node/`、`runtime/node/entry.js`、`runtime/node/sidecar.js`，无绝对路径、`..`、符号链接或额外成员；两个 regular member 分别为 1,139 / 29,118 bytes，内容 SHA 与 current 的 entry/sidecar 候选 SHA 一致：

- `entry.js`：`28853cc19392fa7fef149f48c8002089f33c9772f0bb91e5b8090d60bc13e200`
- `sidecar.js`：`a45a73beb385a4bdc0bd271b4a82c4c07b544319739a5e34b46beb25f5623e99`

## 门禁证据

- Git Bash `--noprofile --norc -n`：runner exit `0`。
- runner、SHA 清单和候选 JS 均为 `CR=0`、无 UTF-8 BOM；候选 `node --check` 两项通过。
- 本地 qimao 等价 import/HTTP 合同门通过：注入 fake engine，不访问模型或外部服务；`videoDurationMs=1234` 的合法 WireRequest 返回 HTTP `200`，`frameCount=1`、boxes 数组合法。
- 路径门已重跑：`old_current` 只出现生产 `ocr-media-error-20260831-r1`；旧 runtime 为 `20260831-local-ocr-geometry-r3`，新 runtime 为 `20260901-local-ocr-contract-r1`，env/drop-in 临时路径固定且无第二路径。
- 回滚门静态核对：失败时只移除 contract drop-in、以 root-only env 备份恢复原 env、`daemon-reload` 后仅重启 OpenVINO，并以 GET `/ocr`=`405` readiness 复验；`current`、backend、ASR、screen、static、route、budget 均不切换。
- runner 内 `systemctl start` 次数为 `0`，`systemctl restart` 仅为 candidate/rollback 的同一 OpenVINO unit 两处；未出现旧 `ai-recovery-1607-r3` 字符串。

## 残留与边界

- 本地归档审计临时目录已精确删除；工作区仅保留上述单一归档、runner、SHA 清单和本结果文档。
- 本卡未连接 SSH/SCP，未上传、未执行 root runner、未 daemon-reload、未重启服务，未读取或复制任何 Secret 值，未访问 Worker/Provider/COS/DB。

`remaining_gap`：候选尚未上传或部署。后续若重新授权，必须沿用本三件套及固定 current/geometry-r3 回滚身份执行一次传输与 root runner；失败必须由 runner 自动恢复原 unit/env 并精确清理。
