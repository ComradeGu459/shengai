# OCR-SIDECAR-PROC-ENV-FIX-1706-R1 结果

- `artifact_written`: `true`
- `outcome`: `passed`
- `target`: `103.36.63.67`（本轮未连接）
- `next_owner`: `规划 / SERVER`
- `requires_user`: `false`

## 已完成修正

runner 的 env 变换在 335–340 将旧 runtime 路径全部替换为 `new_runtime`。本轮将候选进程 `/proc/$candidate_pid/environ` 校验同步为同一变换结果：

- `QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR=$new_model_dir`
- `QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE=$new_python`
- `QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT=$new_runtime/node/paddle_hpi_runner.py`
- `PATH` 必须命中新 runtime 且不命中 old runtime

新增变量定义为 `new_model_dir="$new_runtime/models/work/openvino"`、`new_python="$new_runtime/venv/bin/python"`。archive 未改。

## 已重验门禁

- `bash -n`：exit `0`。
- assignment-aware shell AST：`unassigned=`；`set -u` 引用均有定义或为 Bash 内建特殊变量。
- `sha256sum --strict -c SHA256SUMS` staging：archive、runner 均 `OK`，exit `0`。
- Node `v24.19.0` 候选 import/HTTP contract：exit `0`，通过 top-level await、dynamic import、HTTP `200`、`videoDurationMs=1234`。
- 精确旧 drop-in 路径命中 `0`；`systemctl start=0`、`restart=2`；空比较命中 `0`；runner/SHA 清单无 CR、无 BOM。

## Source-faithful runner 验证

使用临时隔离 mock host 对最终 runner 做 source-faithful 派生执行；派生仅包含 root gate、隔离根路径、系统命令映射及 proc 路径映射等白名单替换，机器差异证明为：

- `diff_outside_whitelist=0 whitelist_replacements=17`
- `terminal=passed deployment:sidecar-contract-r1`
- `proc_env_paths=new old_runtime_hits=0`
- `asr_state_pid=unchanged backend_state_pid=unchanged screen=stopped`
- `cleanup=passed`（inbound、stage、临时文件及运行目录均清理）

直接在当前 Windows Git Bash 执行未派生 runner 仍受 `terminal=blocked code=ROOT_REQUIRED`（exit `64`）限制；本轮因此只完成本地隔离验证，未连接或写入远端。

## 当前冻结三件套

| 文件 | bytes | SHA-256 |
| --- | ---: | --- |
| `work/ocr-sidecar-contract-20260901-r1.tar.gz` | 7,254 | `e6abe176e7907f6c52fecfbd3d3209c91b201456257d9671621598cedb43abc0` |
| `deploy/ocr-sidecar-contract-1694/runner.sh` | 21,597 | `b81e5ef9cc8cc860558100e77d7559fe79dd45b7eb67075784f6045f0b4eb79c` |
| `deploy/ocr-sidecar-contract-1694/SHA256SUMS` | 182 | `be84ff5d979822f9956b4fcd783f038eab83b0368e6d21d8cef50cb28dcc6d18` |

`remaining_gap`：三件套尚未上传或部署至 `103.36.63.67`；本轮未执行任何远端动作。
