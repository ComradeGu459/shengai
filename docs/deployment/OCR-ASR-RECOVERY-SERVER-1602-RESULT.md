# OCR-ASR-RECOVERY-SERVER-1602

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: true
```

## outcome

R2 已按唯一 `/opt` stage + qimao PrivateTmp transient 路径真实运行同一失败素材；候选 extractor 返回 `SCREEN_TEXT_MEDIA_EXTRACTOR_FAILED`，故未发布、未启动 screen-text、未调用 retries。预算失败 requestId 的 schema detail 未被 backend/Nginx/journal/audit 持久化，禁止猜字段或第二次 POST。

## OCR evidence

- 冻结候选未重建：archive=`10269819` / `5fd5f3c485c2ee4155cc5b6a58962d544ef51d91fe233b0b0779820bd2f94782`；manifest=`3001639` / `f8215a15d8b7e1680e617c13560ad2dc2188bc132e142a6dbe27ce2cdd46e359`；audit=`654` / `de949397f5f20f5b638d07c491197b65e6f425f6dc199e53caeef80f574ab825`；preflight=`2466` / `0817cbc59fe8055cb1e26e12add7e3ccde6d85676addfc9b5ef159c1f08e9778`。
- 一次 SCP 只传上述四个冻结输入，runner 未传到 `/tmp` 或 `/var/tmp`。root 从标准输入执行成熟发布/回滚逻辑，并在固定 `/opt/qimao-terms-cloud/deploy-staging/ocr-asr-recovery-1602-r2` 创建 `root:qimao`、mode=`0750` stage 后解包。
- 同素材门仅由 `qimao-ocr-media-preflight-1602-r2.service` 执行；User/Group=`qimao:qimao`、WorkingDirectory=`/opt/.../release/backend`、`PrivateTmp=yes`、canonical 四份 env 只在 transient 内读取，未输出值。
- transient 成功启动候选 extractor，但约 30 秒后由 `screen-text-media.js` 返回 `ScreenTextMediaError: SCREEN_TEXT_MEDIA_EXTRACTOR_FAILED`，main exit=`1`；稳定首因=`OCR_PREFLIGHT_FAILED/SCREEN_TEXT_MEDIA_EXTRACTOR_FAILED`。这是真实候选在已验证 PrivateTmp harness 中的运行失败，不再归因 `/tmp` 权限或 `/var/tmp` 可见性。
- 门失败发生在 current 切换前：backend restart=`0`、screen-text Worker start=`0`、screen-text retries POST=`0`、OCR job/attempt 写入=`0`、OpenVINO 调用=`0`、Provider 调用=`0`、COS 写入=`0`。
- 终态：current=`/opt/qimao-terms-cloud/releases/ai-hotfix-1552`；OCR batch=`12 queued/39 failed`；backend=`active/running/0/0`；ASR Worker=`active/running/0/0`；screen-text Worker=`inactive/dead/0/0`；OpenVINO=`active/running/0/0`；health=`200 application/json; charset=utf-8`。
- 清理：R2 transfer、固定 `/opt` deploy-staging、candidate release 均 absent；preflight unit LoadState=`not-found`。

## budget 400 evidence

- 目标 requestId=`f72badf7-a302-4cb9-b610-a69ec4ebf00c`。浏览器 POST 已由任务输入裁定为明确 HTTP 400、无写入；本片未重发。
- 正确 UTC 时间窗内，backend unit journal、全量 system journal、`/var/log/nginx/*.log` 对该 requestId 均为 0 命中；`system_control_audit_events` 中 `audit_count=0`。因此失败发生在 audit 写入前，且服务器没有保留 TypeBox validation detail 或请求体。
- 当前前端 `onDraft` 的静态提交结构与 `SystemControlCreateBudgetPolicyBodySchema` 一致；在缺失目标请求体/响应 validation 数组的情况下，无法从源码唯一反推出具体字段。唯一可证伪首因=`BUDGET_400_VALIDATION_DETAIL_NOT_PERSISTED`，`schema_field=unrecoverable`；不得把某个可能的空阈值字段写成事实。
- 数据库权威 active budget 仍为 `78767e10-c54c-456e-9ec0-d2785df294a9|v3|enforcement_enabled=true`。浏览器页面一度显示“保护已关闭”且同时 GET 报错，不能替代数据库生效指针事实。

## external_counts

```yaml
r2_scp: 1
r2_preflight_transient: 1
r2_extractor_attempt: 1
r2_current_switch: 0
r2_backend_restart: 0
r2_screen_text_worker_start: 0
r2_screen_text_retries_post: 0
r2_ocr_db_writes: 0
budget_post: 0
deepseek: 0
tencent_create: 0
tencent_describe: 0
openvino_calls: 0
cos_writes: 0
route_writes: 0
manual_db_writes: 0
```

## rollback

OCR 失败位于切换前，无生产链接或服务可恢复；root runner 已删除本片 transfer、`/opt` stage 与未安装 candidate。预算车道为只读，无回滚项。

## remaining_gap

- OCR：候选 extractor 在正确 production-like PrivateTmp harness 中仍以 exit 1 失败；需要 BACK 依据该稳定码定位 MJPEG/image2 调用的实际退出原因。根据 R2 停止门，SERVER 不得再尝试第三种运行路径。
- 预算：要定位 `f72…` 的精确 schema 字段，必须取得当时 HTTP 400 响应中的 validation detail 或已发送请求体；现有服务器证据已不可恢复。未取得前禁止第二次预算 POST。

## next_owner

- OCR：`BACK`，只诊断/修复 extractor 的真实 exit 1，不改 server harness。
- 预算：`PLANNER/FRONT`，从原浏览器失败证据恢复 validation detail；若证据已丢失，先增加安全的 400 字段级可观测性，再另签一次请求，不由 SERVER 猜测。

## residual

- 生产保持：current=`ai-hotfix-1552`；active budget v3 且 enforcement=true；OCR batch=`12 queued/39 failed`；ASR batch未由本片触碰。
- 服务器本片固定 transfer/stage/candidate release/transient 残留=`0`。
- 本地仓库外仅保留原冻结候选三件套、原 preflight 与原 runner；R1/R2/只读对账临时脚本已删除。

## OCR-ASR-DIAG-SERVER-1603

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

### direct extractor evidence

- 仅复用同一冻结 archive 与同一 failed Asset；root 在 `/opt/qimao-terms-cloud/deploy-staging/ocr-asr-diag-1603` 解包，唯一 transient=`qimao-ocr-direct-extractor-diag-1603.service`，User/Group=`qimao:qimao`、PrivateTmp=`yes`、canonical env 只在进程内读取。
- probe 直接执行候选 `backend/dist/sidecars/local-ocr/frame-extractor.js`，未经过 `screen-text-media` wrapper。稳定结果：`extractorCode=QIMAO_FRAME_EXTRACTOR_OK`、exit=`0`、signal=`null`、frameCount=`123`、totalFrameBytes=`5243550`、manifestExists=`true`。
- canonical `QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN` 的目标值未输出；其内容 SHA=`b9c09abc4bd08785d269ac7dccdd5e8e9c137a742c6ec79c9bf27c145d8ff498`，与旧 extractor 字节一致，且不等于候选 SHA=`a7b9773907de75a25b369be637243d609796dfb1c0df801f177151ffef9d7f2f`。
- 因此 R2 的 wrapper 失败并未测试候选 extractor；唯一可证伪根因=`OCR_PREFLIGHT_EXTRACTOR_BINDING_STALE`。候选本身在同一素材、同一 `/opt` stage、同一 qimao PrivateTmp 条件下通过。
- 1603 未切换 current、未启动/重启业务 unit、未调用 OpenVINO、未重试 batch、未执行预算 POST。诊断 unit=`not-found`，transfer 与 `/opt` stage 均 absent。

### live budget contract generation

- live current 与 backend 进程一致：current=`/opt/qimao-terms-cloud/releases/ai-hotfix-1552`；backend MainPID=`694702`；ExecMainStart/ActiveEnter=`2026-08-31 00:51:29 CST`；cwd 精确为该 release。
- live contracts 文件存在，SHA=`1fc8ba365e55122c14211ded033209105daa60de9db93ea006004a2c937d2674`。其 `SystemControlCreateBudgetPolicyBodySchema` 只含 `budgetPolicyVersionId`、`environment`、`rules`，并设置 `additionalProperties:false`；`enforcementEnabled` 精确缺失。
- live budget service 文件存在，SHA=`ee72ae0beec62be8453b348a6d9eb8cb57136a7e6e2dd7e3aea9483d050f7179`；`input.body.enforcementEnabled ?? false` 写入和 `enforcement_enabled` 读取均存在。
- 所以 requestId=`f72badf7-a302-4cb9-b610-a69ec4ebf00c` 的 HTTP 400 唯一 schema 字段为 `enforcementEnabled`：浏览器按较新前端合同提交该字段，live contracts 因 `additionalProperties:false` 在路由 validation 阶段拒绝，故 audit_count=`0`。根因=`BUDGET_LIVE_CONTRACT_GENERATION_SKEW`，不是 service 不支持字段。
- 数据库生效事实仍为 active budget=`78767e10-c54c-456e-9ec0-d2785df294a9|v3|enforcement_enabled=true`；本片预算 POST=`0`。

### next_owner

- `BACK/RELEASE`：下一不可变候选必须同时包含更新后的 contracts 编译产物与 service 产物，消除 create-budget schema 代际错配。
- `SERVER`：后续 OCR 发布前门必须显式把 stage candidate extractor 绑定给 preflight，不再沿用 canonical 旧 extractor；本诊断片不实施发布。

### residual

- 生产 current、unit、OCR/ASR batch、budget pointer 均未改变。
- 1603 服务器 transfer/stage/transient 残留=`0`；本地临时 probe/runner/核对脚本已删除。
