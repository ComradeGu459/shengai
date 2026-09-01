# LOCAL-OCR-SERVER-05G-R5 结果

## outcome

`blocked`（候选已保留）。登记请求和连接测试请求均已各发生一次；连接测试当前仍为 `queued`，因此没有把它宣称为成功，也没有再次点击或 POST。

## evidence

- 本地唯一归档：`C:\Users\ComradeGu\Documents\七猫兼职\local-ocr-05g-r1-20260828010403.tar.gz`。
- 归档 SHA-256：`277a4778e0cef6fff279977ac36c435fa36f713c6b0f7fc6773bfce3f930b58e`。
- 归档 manifest SHA-256：`2b5c68ec3b7eefb60be23ebb9da7fbb99b1a66e0903536bc9af65693bb6ccd5a`。
- 候选 release：`/opt/qimao-terms-cloud/releases/20260828-local-ocr-05g-r4-composite`。
- 基线/回滚目标：`/opt/qimao-terms-cloud/releases/20260827-local-ocr-05d-backend-r1`。
- 候选门：payload 346 项逐项 hash 通过；离线 import/resolve=true，key=`screen_text_openvino_ppocrv6_small`；engine-registry SHA=`95785dcd739721d50272ae6dcbb761f821d16584ab8c59e60f059da88d367e7b`；connection entry SHA=`ee0a3ff5e24e2e32e81e58b5b2a35494db4eb2c1c0fa2787c2ec1d28f2467901`；health=200；未认证 API=401；backend MainPID=331631，`/proc/PID/cwd` 为候选 release；既有 upload-completion/screen-text/project-cleanup Worker active。
- 浏览器：复用既有 Edge `/engines` 标签，DOM 读到“登记引擎部署”；未导航、未 reload。表单字段为 screen_text / 自建 Worker / `screen_text_openvino_ppocrv6_small`。
- 实际登记 POST 计数：1。实际 deploymentId=`998dea43-3257-4a0b-9a05-765598cbfdd8`；实际 versionId=`e0ac8bc6-feea-4d12-836d-17e7e82dfcda`；状态“可用于草稿”。UI 生成的实际 ID 与预先生成的规划 ID 不同；预生成 deployment/version/test ID 未被 UI 采用，已如实保留在本记录中：deployment=`9889a8ab-d922-4d8a-99c5-37244a8e5635`，version=`818ff21d-859e-4b50-a0f8-622651341ba6`，test=`4d568f7e-0207-4263-b981-a62465833aff`。
- 实际 connection-test POST 计数：1；实际 testRunId=`24bf93fb-acad-4a79-aa8c-63ceb92bea01`；requestId=`4cd1c37f-bff5-4730-8d9f-34dc12f79e29`；DB 精确 GET 对账：status=`queued`、attempt_count=0、reason_code 为空。Edge 同页显示“排队中”、尝试 0、无延迟。
- connection-test Worker 首次失败的稳定原因：模板原始 ExecStart 指向不存在的 `/usr/bin/node`，systemd 状态为 203；已在同一实例 drop-in 中改为已存在的 `/usr/local/bin/node`，daemon-reload 后 Worker 当前 active/running、ExecMainStatus=0、MainPID=332572。该服务的历史 NRestarts=80（修复前重启计数保留，未重置）。

## remaining_gap

同一 testRunId 尚未从 `queued` 进入终态，且 Worker 仍带有历史 NRestarts=80；按本轮停止指令不再等待、不重发。候选运行时、登记 deployment/version、connection-test Worker 与测试事实均保留，供规划决定后续唯一动作。

## external_actions

- 已在测试服务器按 R4 复合流程重放并原子切换候选 backend；未改两站静态、COS、业务 route、真实素材或数据库业务数据。
- 已创建并启动唯一 connection-test Worker 实例；为修复稳定的 Node 路径错误，仅写入实例 drop-in `/etc/systemd/system/qimao-worker@system-control.connection-test.worker.entry.js.service.d/05g-node-path.conf`，内容将 ExecStart 指向 `/usr/local/bin/node`，权限 root:qimao 0640。
- Edge 登记按钮严格一次；连接测试按钮严格一次；未启用 deployment、未创建 route/业务任务，未访问 COS。

## rollback

未回滚：写入已成功且用户要求保留候选与资源。精确回滚目标仍为 `/opt/qimao-terms-cloud/releases/20260827-local-ocr-05d-backend-r1`；candidate backend/static/env 及既有 Worker 状态保持在线。

## residual

- 候选 release、root-only env、Worker drop-in、唯一 deployment/version/testRun 仍保留。
- 归档远端临时副本按 R4 记录仍保留（`remote_archive_retained=1`）；本轮没有执行删除，以免在写入成功后扩大范围。
- 未产生 COS 对象、业务项目、业务任务或数据库业务数据残留；连接测试记录本身为唯一排队事实。

## files

- 本地新增：`docs/deployment/LOCAL-OCR-SERVER-05G-R5-RESULT.md`。
- 服务器实际新增/更新：上述 connection-test 实例 drop-in；候选 release 为既有 R4 身份。

## next_owner

`PLANNING`（决定如何处理仍排队的同一 testRunId；禁止重复 POST）。

## requires_user

`false`
