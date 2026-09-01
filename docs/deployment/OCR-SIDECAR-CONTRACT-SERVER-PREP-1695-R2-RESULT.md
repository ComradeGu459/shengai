# OCR-SIDECAR-CONTRACT-SERVER-PREP-1695-R2 结果

- `outcome`: `passed`
- `role`: `SERVER`
- `target`: `103.36.63.67`（本卡未连接）
- `next_owner`: `规划 / SERVER（仅在重新授权后部署）`
- `requires_user`: `true`

## 修正范围

在同一唯一 1694 候选上，修正 runner 内全部同型 test 比较换行错误。所有 `[` 比较的运算符与右值现已位于同一有效命令行；未改变谓词、路径、SHA 常量、回滚语义、业务范围或 archive。修正覆盖 baseline、archive/candidate、env 及 rollback 中的全部命中项；`rg -U '=\s*$|!=\s*$'` 无命中。

## 冻结三件套

| 文件 | bytes | SHA-256 |
| --- | ---: | --- |
| `work/ocr-sidecar-contract-20260901-r1.tar.gz` | 7,254 | `e6abe176e7907f6c52fecfbd3d3209c91b201456257d9671621598cedb43abc0` |
| `deploy/ocr-sidecar-contract-1694/runner.sh` | 20,421 | `eb63552bc394f23669fb08f5fb0a32af64e3c973c519984a4e22780718e9cd22` |
| `deploy/ocr-sidecar-contract-1694/SHA256SUMS` | 182 | `99769028c5e55ec46d57d26d48c893273fa40d2a5aea568614ab6c71be1ae21b` |

最终 SHA 清单两行与 archive/runner 实际 hash 一致；archive bytes/SHA、成员顺序和两个 sidecar 文件内容均保持 1694-R1 不变。工作区只存在一个该 archive 和一个 `deploy/ocr-sidecar-contract-1694` 候选目录。

## 门禁证据

- Git Bash `--noprofile --norc -n`：runner exit `0`。
- `rg -U '=\s*$|!=\s*$'`：exit `1`（无命中）；不存在遗漏的运算符后换行。
- 安全本地 fixture 实际执行通过：baseline 的 path/hash/env/service 比较，candidate 的 archive 成员/runtime/drop-in/PID/path 比较，以及 rollback 的 env/drop-in/current 比较均为 `fixture=passed`、exit `0`。
- runner、SHA 清单和结果文档均 `CR=0`、无 UTF-8 BOM；archive 仍为 4 个安全成员、2 个 regular 文件。
- 静态范围门：`systemctl start=0`；`systemctl restart` 仅 candidate/rollback 同一 OpenVINO unit 两处；backend、ASR、screen、static、current、route、budget 未加入写入路径。

## 残留与边界

- fixture 临时目录已删除；无第二 archive、runner 或候选版本。
- 本卡未连接 SSH/SCP，未上传、未执行 root runner、未 daemon-reload、未重启服务，未读取或输出 Secret 值，未访问 Worker/Provider/COS/DB。

`remaining_gap`：候选尚未上传或部署。后续若重新授权，必须沿用本三件套及固定 `ocr-media-error-20260831-r1` current、geometry-r3 runtime 回滚身份执行一次传输与 root runner；失败由 runner 自动恢复原 unit/env 并精确清理。
