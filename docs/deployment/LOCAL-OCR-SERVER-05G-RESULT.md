# LOCAL-OCR-SERVER-05G 结果

## 终态

- `outcome=blocked`
- `formal_lease=1`
- `slice_outcome=blocked_before_control_plane_write`
- `remaining_gap=控制面要求 Cloudflare Access 交互登录；当前内置浏览器未登录，无法安全创建 deployment/version 或排队 connection-test`
- `next_owner=PLANNING`
- `requires_user=true`

## 已核对事实

- 既有候选仍为 `20260827-local-ocr-05d-backend-r1`，当前指针未改变。
- 本地唯一归档 `C:\tmp\local-ocr-05d-r1.tar.gz` SHA-256：`6bac3c0028a0fd6bc7c7017226f95f107b414393cef929b7cd2c0be88ed4fd62`；既有 manifest SHA：`4ef975904350d700897dd3a5e3d6334b66d28e77c47f8bd4ea62ffc084fc90ba`。
- backend：active/running，`NRestarts=0`；`GET /health=200`；未认证 `GET /api/projects=401`，`application/json; charset=utf-8`，响应长度 181 bytes。
- upload-completion：`qimao-upload-completion-worker.service` active/running。
- screen-text Worker：`qimao-worker@screen-text.worker.entry.js.service` active/running，`NRestarts=0`。
- OpenVINO：`qimao-local-ocr-openvino.service` active/running/enabled，`NRestarts=0`，仅监听 `127.0.0.1:3100`。
- ONNX：inactive/dead/disabled，`127.0.0.1:3101` 无监听。
- connection-test Worker：`qimao-worker@system-control.connection-test.worker.entry.js.service` 未安装/未运行；本轮未写入 unit、未启动。

## 控制面结果

- 访问管理员控制面时被 Cloudflare Access 登录页拦截（页面要求交互式邮箱登录）。
- 未创建 deployment、version 或 testRunId；未发送控制面 POST；未调用业务 route、COS、数据库写入、真实素材或模型探针。
- 不能代填或绕过 Access 凭据，因此本轮不继续任何服务器写入。

## 回滚、文件与残留

- `rollback_ready=true`；因本轮未切换，现有 R3 候选与服务状态保持不变，原回滚指针仍可用。
- `files=docs/deployment/LOCAL-OCR-SERVER-05G-RESULT.md`（本地结果记录）；服务器无新增 release/unit/archive/temp。
- `external_actions=仅只读 SSH 状态核对与一次管理员控制面导航；无远端写入`
- `residual=0（本轮无新 deployment/version/test、无临时文件；既有 R3 候选按基线保留）`

