# LOCAL-OCR-SERVER-05G-R4 结果

```yaml
outcome: rolled_back
slice_outcome: blocked_browser_navigation_timeout
requires_user: false
next_owner: PLANNING
registration_post: 0
connection_test_post: 0
deployment_id: not_created
deployment_version_id: not_created
test_run_id: not_created
residual: 0
```

## 发布与离线门

- 唯一归档未重建：`local-ocr-05g-r1-20260828010403.tar.gz`，SHA-256=`277a4778e0cef6fff279977ac36c435fa36f713c6b0f7fc6773bfce3f930b58e`；manifest SHA-256=`2b5c68ec3b7eefb60be23ebb9da7fbb99b1a66e0903536bc9af65693bb6ccd5a`。
- 以现行05D release `/opt/qimao-terms-cloud/releases/20260827-local-ocr-05d-backend-r1` 为 base；package SHA=`b8f5c90c0fd6d5e13343e2b1cc4a1113b9434d3d9b991159c588ad97e06612a9`，lock SHA=`985edc13039ad1168758cb64c38d36288a9da22f83cab84fe9467327a5d0bd9f`，两级 `node_modules` 均存在。
- 归档 manifest 346 项逐项校验通过；仅在候选路径 overlay `backend/dist`、`packages/contracts/dist` 及其余 payload，未重建包或修改业务源码。候选 engine-registry SHA=`95785dcd739721d50272ae6dcbb761f821d16584ab8c59e60f059da88d367e7b`；connection-test entry SHA=`ee0a3ff5e24e2e32e81e58b5b2a35494db4eb2c1c0fa2787c2ec1d28f2467901`。
- 同一 root-only env 由内存解析后以 `qimao` 身份离线 import 成功：`resolve=true`，key=`screen_text_openvino_ppocrv6_small`，descriptor digest=`8efd489fcdc4386a659fab8229b0a183b55a8e5409e4deb5428788dd444f7af4`；未输出环境值。

## 候选服务门

- 候选 release：`/opt/qimao-terms-cloud/releases/20260828-local-ocr-05g-r4-composite`。
- backend candidate MainPID=`331012`，`/proc/PID/cwd` 指向候选 release；health=`200`、未认证 API=`401`。
- upload-completion、screen-text、project-cleanup Workers 均保持 active；候选 backend `NRestarts=0`；connection-test Worker 启动后 active、`NRestarts=0`。
- 本轮未创建 deployment/version/testRun，未发任何控制面 POST；Edge 已登录会话导航 `https://milaidi.top/engines` 超时，因此没有可对账的 deploymentId/testRunId，也未重试或盲发请求。

## 回滚与残留

- 已停止并禁用 connection-test Worker，移除本轮专用 drop-in；current 恢复至 `/opt/qimao-terms-cloud/releases/20260827-local-ocr-05d-backend-r1`。
- 回滚后 backend active、health=`200`、API=`401`、`NRestarts=0`；既有静态、Worker、Nginx、COS、数据库未改动。
- 候选 release、远端归档及临时件均已精确删除；remote candidate/archive residual=`0`。本地固定归档按输入保留。
- 未访问 COS、未写业务 DB、未创建 route/业务任务、未使用真实素材。

## 差口

- `remaining_gap=edge_control_plane_unavailable`：服务器复合 runtime 与 Worker 门已通过，但 Edge 控制台导航超时，未能在同一窗口完成一次登记与一次 connection test。
- `next_owner=PLANNING`；后续需另行安排可验证的 Edge 控制台窗口，再按同一归档和稳定身份执行一次且仅一次登记/测试。
