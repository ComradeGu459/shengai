# OCR-SIDECAR-DROPIN-ORDER-FIX-1702 结果

- `artifact_written`: `true`
- `outcome`: `passed`
- `target`: `103.36.63.67`（本轮未连接）
- `next_owner`: `规划 / SERVER`（如需部署，必须重新授权）
- `requires_user`: `false`

## 唯一修正

仅将候选 drop-in basename 从 `contract-1694-r1.conf` 改为 `zz-contract-1694-r1.conf`，并同步 runner 内 source/temp 路径：

- `new_dropin=/etc/systemd/system/qimao-local-ocr-openvino.service.d/zz-contract-1694-r1.conf`
- `new_dropin_tmp=/etc/systemd/system/qimao-local-ocr-openvino.service.d/.zz-contract-1694-r1.conf.tmp`
- `dropin_source=/run/qimao-ocr-sidecar-contract-1694/zz-contract-1694-r1.conf`

`zz-` 明确晚于既有 `geometry-1628-r3.conf`，使候选的 `WorkingDirectory`、`ExecStart`、`ReadOnlyPaths` 在 systemd 字典序合并后最终覆盖为 new。旧 geometry drop-in 仍是 rollback 目标；archive、env、业务、Worker、队列、DB、COS、route、budget 均未改。

## 冻结三件套

| 文件 | bytes | SHA-256 |
| --- | ---: | --- |
| `work/ocr-sidecar-contract-20260901-r1.tar.gz` | 7,254 | `e6abe176e7907f6c52fecfbd3d3209c91b201456257d9671621598cedb43abc0` |
| `deploy/ocr-sidecar-contract-1694/runner.sh` | 21,294 | `99d26a531c4f78a3d9533e7248d8d46f54d894cfef8ab241f86011bc4bfe0463` |
| `deploy/ocr-sidecar-contract-1694/SHA256SUMS` | 182 | `16ed36df29c63483f9d8294b32374e897f08a07f4410b939c43515cae4e2ef3b` |

临时 staging 中 `sha256sum -c SHA256SUMS`：archive 与 runner 均 `OK`。archive SHA/bytes 和四个安全成员保持不变，唯一 archive 仍为 `ocr-sidecar-contract-20260901-r1.tar.gz`。

## 验收证据

- 安全本地 fixture 实际通过，exit `0`：

  `fixture=passed order=geometry-1628-r3.conf,zz-contract-1694-r1.conf effective=zz-contract-1694-r1 success_switch=atomic_mv failed_rollback=old_dropin_preserved cleanup=passed`

  fixture 逐行模拟 systemd drop-in 字典序合并，最终三项均为 new；随后验证候选原子 `mv`、失败回滚保留 old、临时件清理。
- 项目固定 Node `v24.19.0` 的候选 import：`node24_import=passed top_level_await=passed dynamic_import=passed protocol=screen_text_local_ocr_v1`，exit `0`。
- `D:\Git\bin\bash.exe --noprofile --norc -n deploy/ocr-sidecar-contract-1694/runner.sh`：exit `0`；旧 `/contract-1694-r1.conf` literal 命中 `0`，新 `zz-contract-1694-r1.conf` 命中 `3`，新 temp 命中 `1`。
- 静态范围门：`systemctl start=0`、`systemctl restart=2`；空比较 RHS/LHS 无命中；runner、SHA 清单 `CR=0`、无 UTF-8 BOM。

## 服务器动作与残留

本轮未执行 SSH/SCP、上传、root、daemon-reload、systemd restart、API、Provider、Worker、队列、DB、COS、route 或 budget 动作。临时 fixture/staging 已删除，无本地发布残留。

`remaining_gap`：排序修正尚未上传或部署；后续需另行授权并沿用本三件套，失败继续由 runner 自动回滚到 geometry-r3 与原 env。
