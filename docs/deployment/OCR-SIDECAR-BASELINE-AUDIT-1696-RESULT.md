# OCR-SIDECAR-BASELINE-AUDIT-1696 结果

- `artifact_written`: `true`
- `outcome`: `baseline_mismatch`
- `target`: `103.36.63.67`
- `next_owner`: `规划 / SERVER`
- `requires_user`: `true`（修正候选前需重新确认 env 基线身份）

本卡只读逐项对账 1695-R2 runner 的 baseline 门；未修改 runner、未上传、未执行 root runner、未重启服务。

## 逐项门禁

| runner predicate | result | 实际（脱敏/归一化） |
| --- | --- | --- |
| `current -> old_current` | pass | `/opt/qimao-terms-cloud/releases/ocr-media-error-20260831-r1` |
| old runtime directory / non-symlink | pass | `directory`，`/opt/qimao/local-ocr/20260831-local-ocr-geometry-r3` |
| old `entry.js` regular / non-symlink | pass | `regular`, 1,139 bytes，SHA=`28853cc19392fa7fef149f48c8002089f33c9772f0bb91e5b8090d60bc13e200` |
| old `sidecar.js` regular / non-symlink | pass | `regular`, 28,940 bytes，SHA=`99ee3eb60a220b5c41ed7f1a50a2020c50d9511ce37f5e2198ee475c5967c3ed` |
| env owner/mode | pass | `root:qimao:640` |
| env SHA predicate（runner 先执行） | **fail / 首个失败** | 实际 SHA=`ed640752583c587ddf4fa7970bfc7b2c33edade85b3a0f0c8e10f3ff2e6e4d18`；runner 期望旧快照 `08c3578a100eac83f38043d14eb86bb84abdef559170c71e2d6d40f72adb9c09` |
| env bytes predicate（同一根因的后续佐证） | fail | 实际 `818`；runner 期望 `798` |
| env key-name 集合 | pass（值未读取） | `PATH,QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIGEST,QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR,QIMAO_LOCAL_OCR_SIDECAR_BACKEND,QIMAO_LOCAL_OCR_SIDECAR_ENABLED,QIMAO_LOCAL_OCR_SIDECAR_HOST,QIMAO_LOCAL_OCR_SIDECAR_PORT,QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE,QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT,QIMAO_LOCAL_OCR_SIDECAR_STARTUP_TIMEOUT_MS,QIMAO_LOCAL_OCR_SIDECAR_TIMEOUT_MS` |
| env path-bearing key-name 集合 | pass（只报键名） | `PATH,QIMAO_LOCAL_OCR_PP_OCRV6_SMALL_MODEL_DIR,QIMAO_LOCAL_OCR_SIDECAR_RUNNER_EXECUTABLE,QIMAO_LOCAL_OCR_SIDECAR_RUNNER_SCRIPT` |
| unit User / Group | pass | `qima / qima` |
| unit WorkingDirectory | pass | `/opt/qimao/local-ocr/20260831-local-ocr-geometry-r3/node` |
| unit EnvironmentFiles | pass | `/etc/qimao-terms-cloud/local-ocr-04g-openvino.env (ignore_errors=no)` |
| geometry drop-in present / contract drop-in absent | pass | old drop-in present；`contract-1694-r1.conf` absent |
| old drop-in owner/mode and three path lines | pass | `root:root:644`；WorkingDirectory、ExecStart、ReadOnlyPaths 均指向 geometry-r3 |
| PrivateTmp / ProtectSystem / ProtectHome / NoNewPrivileges | pass | `yes / strict / yes / yes` |
| OpenVINO / screen / ASR / backend state | pass | `active/running/0/0`、`inactive/dead/0/0`、`active/running/0/0`、`active/running/0/0` |
| MainPID | pass | sidecar=`802334`、screen=`0`、ASR=`694703`、backend=`831090` |

### 唯一根因归一化

runner 的第一个失败谓词是 env SHA 比较；随后 env bytes 比较也失败，但二者是同一项“runner 固定的 798B/旧 SHA 与生产当前 818B/env SHA 漂移”，不是两个独立故障。env 内容和值、Secret 均未输出或读取到结果中；仅记录 owner/mode、bytes、SHA、键名和 path-bearing 键名。

## 残留

以下固定目标均 absent：new runtime、runtime stage、1694 `/run` runtime、env 临时/restore 文件、contract drop-in/临时文件、1694 inbound；`/tmp/qimao-screen-text-*` 残留计数为 `0`。

## 剩余缺口

`remaining_gap`：1695-R2 runner 的 env SHA/bytes 基线仍按旧 798B 快照冻结，无法通过当前生产 baseline；本卡未修复。`next_owner` 为规划决定是否以当前 818B env 重新冻结（不输出 Secret），随后 SERVER 才能在同一 archive/runner 身份下继续。禁止在未重签前上传或部署。
