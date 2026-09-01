# EMPLOYEE-AI-SERVER-02 结果

## artifact_written

`true`

## outcome

`blocked`

## evidence

- 观察日期：`2026-08-30`，Asia/Shanghai；本轮仅执行测试服务器只读 SSH、数据库只读投影、systemd 只读查询和本机 health GET。
- 约束文件已读取：仓库根 `AGENTS.md`、`docs/WORKFLOW.md`、`docs/status/CURRENT.md`。用户指定 v4-1518 尚未出现在仓库文件中；当前实际权威文件标记为 `CURRENT v4-1515`，未改写该文件。
- current：`/opt/qimao-terms-cloud/current` 的 link 与 realpath 均为 `/opt/qimao-terms-cloud/releases/term-budget-capability-20260830-r1`。
- static：`/srv/qimao-terms-cloud/system-frontend` 指向 `/srv/qimao-terms-cloud/system-frontend-term-budget-capability-20260830-r1`。
- current release 编译入口均为普通文件、`root:qimao`、`0640`，并由 `sudo -n -u qimao -- test -r` 逐项得到 exit `0`：
  - `backend/dist/modules/storage/s3-compatible-storage.js`，37276 bytes；
  - `backend/dist/modules/asr/tencent-asr-runtime.js`，10678 bytes；
  - `backend/dist/workers/asr.worker.entry.js`，3099 bytes；
  - `backend/dist/workers/screen-text.worker.entry.js`，5205 bytes；
  - `backend/dist/app.js`，14371 bytes；
  - `backend/dist/server.js`，9184 bytes。
- root-only env 仅记录元数据，未读取或输出值：
  - `/etc/qimao-terms-cloud/backend.env`：存在，`root:qimao`、`0640`、776 bytes，SHA-256=`05d21ec3dc196c1ce96243fca447fbb65e5a6047eb5ae3844065c52186ceac6f`；
  - `/etc/qimao-terms-cloud/object-storage.env`：存在，`root:qimao`、`0640`、421 bytes，SHA-256=`773b8362b39af2e3d71c5f88571210b0689397c5b825f820ea88f21f863b6259`；
  - `/etc/qimao-terms-cloud/provider.env`：存在，`root:root`、`0600`、241 bytes，SHA-256=`78407be9dc87c9564f50b6b18088710d42651e471d00e5416f4116a99663e40b`。
- system-control route 只读投影：`ocr_self_hosted_worker` 有且仅有 1 条 active target：routing version `7bd41c8c-18b0-46f3-83ec-17fdb0729b6f`、target `1a9eb5ee-3402-4c9b-a81b-1dd8ad7c88bc`、priority `1`、role `preferred`、provider `openvino`、adapter `screen_text_openvino_ppocrv6_small`、version `1`；`asr_api` active target 为 `0`。
- budget 只读计数：effective `active_budget_policy_pointers`=`0`；policy versions=`2`、rules=`2`、status=`active` events=`2`。由于 effective pointer 为 `0`，不能证明存在可供 ASR admission 使用的 active budget。
- canonical units 只读状态：
  - `qimao-backend.service`：`active/running`，MainPID=`664656`，NRestarts=`0`，ExecMainStatus=`0`；
  - `qimao-worker@term-extraction.worker.entry.js.service`：`active/running`，MainPID=`664658`，NRestarts=`0`，ExecMainStatus=`0`；
  - `qimao-worker@system-control.secret-validation.worker.entry.js.service`：`active/running`，MainPID=`664715`，NRestarts=`0`，ExecMainStatus=`0`；
  - `qimao-worker@system-control.connection-test.worker.entry.js.service`：`active/running`，MainPID=`664657`，NRestarts=`0`，ExecMainStatus=`0`。
- 既有 AI worker/本地 OCR 状态：`qimao-worker@asr.worker.entry.js.service`=`loaded/inactive/dead/disabled`、MainPID=`0`、NRestarts=`0`；`qimao-worker@screen-text.worker.entry.js.service`=`loaded/active/running/enabled`、MainPID=`345793`、NRestarts=`0`、ExecMainStatus=`0`；`qimao-local-ocr-openvino.service`=`loaded/active/running/enabled`、MainPID=`318206`、NRestarts=`0`、ExecMainStatus=`0`；ONNX 既有服务保持 `inactive/dead/disabled`。
- backend health：`GET http://127.0.0.1:3001/health`，HTTP=`200`，Content-Type=`application/json; charset=utf-8`，curl exit=`0`。
- 任务前门失败点是配置事实而非 compiled entry 或 env 可读性：缺少唯一 active `asr_api` route target，且没有 effective active budget pointer；因此不能安全启动 ASR worker，也不能声称 ASR/OCR 接线已完成。

## external_counts

- DeepSeek POST=`0`；Tencent API=`0`；COS=`0`；业务 batch/API 写入=`0`。
- systemd start/restart=`0`；数据库写入/迁移=`0`；route/budget/Secret/env/config 写入=`0`；发布/current/static 变更=`0`。
- 外部联网仅用于上述只读 SSH；健康检查为本机 loopback GET，无业务写入。

## rollback

- 无需回滚：本轮未启动 ASR/OCR worker，未重启任何 unit，未改变 current/static、数据库、控制面、env、Secret 或权限。

## residual

- 生产 current、static、数据库、控制面、四个 canonical unit 与现有 screen-text/OpenVINO OCR 运行状态保持原样。
- 本轮未创建临时文件、transfer、staging 或 transient unit；残留=`0`。
- 未输出 Secret、env 值、原始响应或载荷。

## remaining_gap

- 规划/控制面 Owner 需要先提供并审核既有唯一 active `asr_api` route target 及 effective active budget pointer，且确认其 SecretReference/env 绑定；本片不创建第二套控制面、不猜测 payload、不修改配置。

## next_owner

`PLANNER` / `SYSTEM-CONTROL OWNER`

## requires_user

`false`

