# LOCAL-OCR-SERVER-05D-R2 结果

- outcome: `blocked`（自动回滚完成）
- slice_outcome: `blocked_then_rolled_back`
- formal_lease: `1`
- 首个稳定失败门: `switch_backend/api_not_json`
- 直接事实: root 统一脚本完成 archive/manifest 校验、候选装配、current 原子切换；candidate health=200 且 backend active，但未认证 API 返回 HTTP `401` 后，响应体未满足脚本要求的 JSON object 形状，立即停止并回滚。未启动 screen-text Worker，未进入后续 Worker/最终门。
- root_cause: 候选 401 响应的 JSON 形状与既定 API 门不一致（本轮脚本未保留响应正文，故不推断具体内容）；旧 release 回滚后同一 API 只读核验为 401、JSON 有效。

## 固定归档与发布动作

- archive: `C:\tmp\local-ocr-05d-r1.tar.gz`
- archive SHA-256: `6bac3c0028a0fd6bc7c7017226f95f107b414393cef929b7cd2c0be88ed4fd62`
- manifest SHA-256: `4ef975904350d700897dd3a5e3d6334b66d28e77c47f8bd4ea62ffc084fc90ba`
- candidate release: `/opt/qimao-terms-cloud/releases/20260827-local-ocr-05d-backend-r1`
- base/current before switch: `/opt/qimao-terms-cloud/releases/20260827-system-live-server05-r1`
- 已执行：远端归档 hash/manifest 逐项校验；root 统一脚本解包、克隆旧 release、覆盖 backend/contracts dist、写入 OpenVINO-only env、backend/Worker drop-in、generic Worker unit、daemon-reload、原子切换 current、重启 candidate backend，并执行 health/API 门。
- 失败后：脚本停止 loop，移除候选 Worker/env/drop-in/unit，恢复旧 current，重启旧 backend 并复核 health=200；远端 archive/stage/candidate 与临时件已清零。本地固定归档保留。

## 回滚后只读证据

- current backend: `/opt/qimao-terms-cloud/releases/20260827-system-live-server05-r1`
- backend: `active`，`NRestarts=0`，health=`200`
- 未认证 API: `401`，响应体 `181` bytes、首字节为 JSON `{`、可解析 JSON=true（正文未输出）
- upload-completion Worker: `active`，`NRestarts=0`
- OpenVINO 04G: `active/enabled`，`NRestarts=0`，loopback `3100`
- ONNX: `inactive/disabled`，`3101` 无监听
- screen-text Worker: `inactive/disabled`，本轮未启动
- 员工/管理员静态指针保持原值；既有监听集合未增加
- 候选 env、backend drop-in、generic Worker unit、Worker drop-in、candidate release、远端 archive/stage: 均 `absent`

## 范围、残留与下一步

- 未执行数据库迁移、COS 请求/写入、业务 route、真实素材、静态/Nginx/04G/05B 修改；backend 仅发生 candidate 启动及失败回滚所需重启。
- OCR 新进程/新端口残留=`0`；候选与临时残留=`0`；既有旧 release、04G、05B 作为回滚历史保留。
- rollback: `ready`，旧 release 已恢复 current 且 health/API 门通过。
- remaining_gap: 需由 BACK/规划确认候选 API 401 错误响应为何不是 JSON object，并补最小兼容修复或调整候选门；本轮不再重放。
- next_owner: `BACK`
- files: `docs/deployment/LOCAL-OCR-SERVER-05D-R2-RESULT.md`（本轮唯一仓库写入）；本地 archive 保留。
- residual: `0`（不含有意保留的固定归档与历史 release）
- requires_user: `false`
