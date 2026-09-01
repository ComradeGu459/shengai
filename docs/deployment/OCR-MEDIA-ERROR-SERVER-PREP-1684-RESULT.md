# OCR-MEDIA-ERROR-SERVER-PREP-1684 结果

- `outcome`: `passed`
- `role`: `SERVER`
- `artifact_written`: 2026-08-31
- `target`: `103.36.63.67`（本卡未连接）
- `next_owner`: 规划任务（如需部署，沿用本冻结三件套并另行授权）
- `requires_user`: `true`（仅后续部署需要；本卡不上传、不切换 current）

## 冻结三件套

- archive：`work/ocr-media-error-20260831-r1.tar.gz`，`8,505,235` bytes，SHA256 `5cf2c9cb1d13e58707b585503daba0f26c51bca4e04d340eb8232598a4568225`。
- runner：`deploy/ocr-media-error-1684/runner.sh`，`14,994` bytes，SHA256 `9f90ee4351d08fb1ed27cfca4d9db710a14b3f65c5dad259d1ec27bcaf8c2833`。
- SHA 清单：`deploy/ocr-media-error-1684/SHA256SUMS`，`177` bytes，SHA256 `2b2877714c1b0b5065762f18d0c517e75486dba9a8668f37f5523a13098cd8b5`；两行分别匹配 archive 与 runner。
- 未生成第二个 archive、runner 或候选版本。

archive 以已成功的 `ocr-worker-once-20260831-r1` archive（`8,504,735` bytes，SHA `ae720ef210e9a5512d5105d08595ccec173e78ec79e6df1a8717178586780293`）为基线，成员序列和链接图保持不变：`14,912` members（`11,343` regular、`2,188` directories、`476` symlinks、`905` hardlinks），unsafe/missing symlink=`0`。内容 SHA 差量严格为以下 8 个运行时 dist 文件：

- `backend/dist/modules/screen-text/screen-text-media.d.ts`
- `backend/dist/modules/screen-text/screen-text-media.js.map`
- `backend/dist/sidecars/local-ocr/sidecar.d.ts`
- `backend/dist/sidecars/local-ocr/sidecar.js`
- `backend/dist/sidecars/local-ocr/sidecar.js.map`
- `backend/dist/workers/screen-text.worker.d.ts`
- `backend/dist/workers/screen-text.worker.js`
- `backend/dist/workers/screen-text.worker.js.map`

候选变更对应媒体 typed error：`ScreenTextMediaError('UNKNOWN')`、Worker 媒体错误不再吞掉并映射为稳定错误码，以及 sidecar timeout 可选/默认 60 秒；未改变发布架构、route、budget 或 Provider。

## 本地门禁

- contracts `tsc -p packages/contracts/tsconfig.build.json`：exit `0`。
- backend `tsc -p backend/tsconfig.build.json`：exit `0`；sidecars `tsc -p backend/tsconfig.sidecars.build.json`：exit `0`。
- backend typecheck `tsc -p backend/tsconfig.json --noEmit`：exit `0`。
- 6 个生产入口 `node --check` 全部 exit `0`：backend server、ASR/screen-text/pre-review/term-extraction worker entry、local-OCR sidecar entry。
- 真实 import 门通过：`@tus/server`、storage、Tencent ASR runtime、ASR Worker、screen-text Worker/entry、app/server、sidecar；typed error 断言 `code=UNKNOWN`、`message=SCREEN_TEXT_MEDIA_UNKNOWN` 通过。
- archive rewrite audit 通过：成员数量/顺序/type/linkname 不变，8 个 regular member 内容差量精确匹配，JSON source maps 可解析，symlink 安全计数为 0。
- runner LF/BOM 门：CR bytes=`0`、UTF-8 BOM=`false`；入口、owner/mode、rollback target、transient/runtime/inbound 固定路径均沿用已成功模板。当前 Windows 工作站无 Bash 解释器，未伪称本地 `bash -n`；runner 保留远端 root `/bin/bash -n` 门，且仅 `systemctl restart qimao-backend.service`，无 `systemctl start`、无 OpenVINO restart、无 env `mv`。
- 上游已提供的媒体专项 `30/30`、backend typecheck 与 diff-check 结果未被本卡改写；本卡在构建后重新跑了上述 typecheck、入口、import 与 archive rewrite 门。

## runner 合同

runner 的 old release 为 `/opt/qimao-terms-cloud/releases/ocr-worker-once-20260831-r1`，new release 为 `/opt/qimao-terms-cloud/releases/ocr-media-error-20260831-r1`；current 使用专用 `current.ocr-media-error-1684.next` 原子切换，失败路径恢复 old release 并重启 backend。候选成功路径只重启 backend，保持 static、ASR、screen worker、OpenVINO、env、route、budget 不变；部署 runner 自带 SHA、入口、导入、健康、稳定 PID 和精确清理门。

## 服务器与残留

本卡未执行 SSH/SCP/root runner、未读取 Secret、未启动 Worker、未消费队列、未改 DB/COS/route/budget、未产生 Provider 调用。用于本地 archive audit 的临时解包目录已在校验后精确删除；工作区仅保留上述单一 archive、runner、SHA 清单和本结果文档。

## 剩余缺口

`remaining_gap`: 候选尚未上传或部署；后续需在同一 target、同一 current 回滚基线和同一 SHA 身份下另行获得部署授权后，才可执行一次 SCP/root runner。若部署失败，必须使用 runner 的自动回滚与精确清理，不得现场补丁或重建候选。
