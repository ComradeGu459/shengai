# LOCAL-OCR-SERVER-05G-R1 结果

```yaml
outcome: rolled_back
slice_outcome: blocked_control_plane_registration
requires_user: false
next_owner: PLANNING
rollback_ready: true
files:
  - docs/deployment/LOCAL-OCR-SERVER-05G-R1-RESULT.md
  - C:\Users\ComradeGu\Documents\七猫兼职\local-ocr-05g-r1-20260828010403.tar.gz
residual: remote_candidate_and_temp=0; local_archive_and_staging_retained_intentionally
```

## 候选与发布

- 从当前工作树构建了唯一 immutable backend 候选（未复用 05D 归档）：
  - `releaseId`: `20260828-local-ocr-05g-backend-r1`
  - 本地归档：`C:\Users\ComradeGu\Documents\七猫兼职\local-ocr-05g-r1-20260828010403.tar.gz`
  - archive SHA-256：`277a4778e0cef6fff279977ac36c435fa36f713c6b0f7fc6773bfce3f930b58e`
  - manifest SHA-256：`2b5c68ec3b7eefb60be23ebb9da7fbb99b1a66e0903536bc9af65693bb6ccd5a`
  - base Git commit：`45179303982d6c13838668eba0ec0c6519003006`
  - manifest payload：346 项；包含 05F `system-control.connection-test.worker.entry.js`，不含 source-map、Secret 或 node_modules。
- 远端曾原子切换到上述 release，并安装专用 connection-test drop-in；候选校验、backend readiness 与既有服务门均通过。
- 控制面为 Edge 已登录会话（`https://milaidi.top/engines`）。“登记引擎部署”表单提交后稳定返回“适配器不属于 Wave A 允许的零网络 probe”类别（`screen_text_openvino_ppocrv6_small`）；未创建 deployment、version，也未产生 testRunId。未重发测试或业务请求。

## 回滚与最终只读核验

- 精确回滚目标：`/opt/qimao-terms-cloud/releases/20260827-local-ocr-05d-backend-r1`。
- `current` 已恢复到该目标；候选 release、远端上传归档与本轮 connection-test drop-in 均已移除。
- 最终服务器状态：
  - `qimao-backend.service`: active，`NRestarts=0`；`/health=200`，未认证 `/api/projects=401`。
  - `qimao-upload-completion-worker.service`: active。
  - `qimao-worker@screen-text.worker.entry.js.service`: active。
  - `qimao-local-ocr-openvino.service`: active/enabled。
  - `qimao-local-ocr-onnx.service`: inactive/disabled；`127.0.0.1:3101` 无监听。
  - connection-test worker：inactive/disabled。
- 两站静态、Nginx、COS 配置/对象、PostgreSQL 数据、业务 route、真实素材与既有 Worker 均未改动；未创建 deployment/test、未写数据库、未访问 COS。

## 根因与差口

- `root_cause`: 控制面拒绝了本候选的稳定适配器类别；源码候选虽包含该 key，但运行时控制面未将其视为可登记的 Wave-A 零网络 probe。当前证据不足以安全区分运行时注册未装配与控制面策略版本差异，故未猜测其他 adapter key。
- `remaining_gap`: 需要由 BACK/PLANNING 裁决并修复“本地 OCR 运行时注册 ↔ 控制面允许登记”契约；修复后应另立任务再做一次登记，不在本切片重试。

## 文件与残留

- 本轮唯一仓库写入：本文件。
- 本地 immutable 归档及其 staging 目录保留作审计/回滚输入；旧 R3 release 保留。
- 远端本轮候选 release、上传归档、临时文件和 connection-test drop-in：残留 0。
- `rollback_ready=true`；无需用户追加授权。
