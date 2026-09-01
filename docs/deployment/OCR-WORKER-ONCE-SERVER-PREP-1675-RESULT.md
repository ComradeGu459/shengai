# OCR-WORKER-ONCE-SERVER-PREP-1675 结果

- `outcome`: `passed`
- `artifact_written`: 2026-08-31
- `next_owner`: SERVER（仅在后续获得发布授权后执行一次传输/回滚 runner）

## 冻结三件套

- archive：`work/ocr-worker-once-20260831-r1.tar.gz`，8,504,735 bytes，SHA256 `ae720ef210e9a5512d5105d08595ccec173e78ec79e6df1a8717178586780293`。
- runner：`deploy/ocr-worker-once-1675/runner.sh`，14,671 bytes，SHA256 `48097ebb6f32d19e2be77d3f626b830d353f261b0c31c594a3fe52d199a78085`。
- SHA 清单：`deploy/ocr-worker-once-1675/SHA256SUMS`，SHA256 `b01b60301c945d82545bc9d74816ef1f34531f8717fd706d59441a79a88ff7fc`。

archive 以当前生产候选 `ocr-timeout-20260831-r1` 为基线，顶层仅 `backend`，14,912 members（11,343 regular、2,188 dirs、476 symlinks、905 hardlinks），unsafe/missing symlink=0、bad hardlink=0。与基线 backend 文件差异严格只有：

- `backend/dist/workers/screen-text.worker.entry.js`
- `backend/dist/workers/screen-text.worker.entry.d.ts`
- `backend/dist/workers/screen-text.worker.entry.js.map`

新 entry 已包含 `runScreenTextWorkerOnce`、`--once` 解析和无参常驻模式。

## 门禁证据

- `tsc -p backend/tsconfig.build.json` exit 0，生成上述三文件。
- Bash `-n` exit 0；runner/manifest CR bytes=0。
- SHA 清单逐文件复算通过。
- 本地真实 import 通过：`@tus/server`、storage、Tencent ASR runtime、ASR worker、screen-text worker entry、app、server、sidecar 与 `localOcrTimeoutsFor(60000)`（61000/62000）。
- worker mode 门通过：`[] -> continuous`、`['--once'] -> once`、额外参数被拒绝；错误路径 runner 返回 `ROOT_REQUIRED`/64。
- runner 仅切换 backend current、重启 backend；不改 static/env/route/DB，不启动任何 Worker。

## 范围与剩余缺口

本卡未连接 SSH、未 SCP、未执行 root runner、未调用 Provider/COS、未启动 screen Worker。`remaining_gap`: 尚未进行生产发布或 `--once` 单次运行；这些动作需后续独立授权与执行卡，且必须保持本冻结身份不变。

