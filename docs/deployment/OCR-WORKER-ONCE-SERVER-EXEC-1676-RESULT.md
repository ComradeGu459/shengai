# OCR-WORKER-ONCE-SERVER-EXEC-1676 结果

- `outcome`: `passed`
- `artifact_written`: 2026-08-31
- `target`: `103.36.63.67`
- `next_owner`: 规划任务裁决后续单次 Worker 验收

## 执行证据

用户精确 SHA 授权下，唯一 SCP 与 root runner 均 exit 0；payload、baseline、candidate、真实 import、post-switch 全部 passed。发布工件为 PREP-1675 冻结三件套：

- archive：`ae720ef210e9a5512d5105d08595ccec173e78ec79e6df1a8717178586780293`
- runner：`48097ebb6f32d19e2be77d3f626b830d353f261b0c31c594a3fe52d199a78085`
- SHA 清单：`b01b60301c945d82545bc9d74816ef1f34531f8717fd706d59441a79a88ff7fc`

最终 current=`/opt/qimao-terms-cloud/releases/ocr-worker-once-20260831-r1`。backend `active/running/0/0` PID `827940`；ASR `active/running/0/0` PID `694703` 未变；screen `inactive/dead/0/0`；OpenVINO `active/running/0/0` PID `802334` 未变。health/projects/asr HTTP=`200/200/200`，专用 residuals=0。仅重启 backend=1，其余 unit restart/start=0；DB/COS/route/budget/Provider 写入均为 0。

## 剩余缺口

`remaining_gap`: 按用户本次明确范围，尚未执行 `--once`，也未处理 OCR 队列；本执行卡仅完成候选发布与稳定性门禁。

