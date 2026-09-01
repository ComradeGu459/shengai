# TEST-S6-02 Rev 2 真实素材冒烟与隔离验收报告

日期：2026-08-16  
测试角色：全链测试与质量验收对话  
项目别名：`S6-真实素材冒烟`  
样本：第 1、14、26 集；E: 原始素材六文件全程只读。

## 结论

- 真实 MP4/SRT 已通过隔离上传、续传、Asset 绑定、零网络 ASR/OCR/术语链、前置审改、字幕验收和交付生成；未评价真实供应商识别准确率。
- 三集竖屏播放授权与只读播放端点均返回成功；实际返回字节仅在隔离内存中校验，未写入仓库、日志或截图。
- 最终交付为 7 个文件（3 集台词 SRT、3 集画面字 SRT、1 个术语 XLSX），均完成下载和摘要/大小核对。SRT cue 数与会话摘要一致；XLSX 以 `504b` ZIP 头及 5 个标准 OOXML 条目解析通过。
- 流畅性冒烟的点击/切换墙钟均在 3 秒内稳定；搜索 164 ms、筛选 155 ms、展开 403 ms、收侧栏 385 ms，控制台 error/warn=0/0。
- 发现两个非 P0 缺陷，编号 `QA-S6-02-001`、`QA-S6-02-002`；已完成冻结矩阵后一次性交规划，不直接通知返工角色。

## 真实输入与链路证据

| 集数 | MP4 字节 | MP4 时长 | SRT 字节 | SRT cue |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 156,739,874 | 122,752 ms | 2,459 | 49 |
| 14 | 78,023,694 | 60,480 ms | 1,497 | 26 |
| 26 | 112,063,980 | 96,960 ms | 2,368 | 42 |

上传阶段使用真实文件字节完成分片缺口检测、续传和完成校验；同一 MP4 绑定到 ASR 与画面字两条角色链。SRT 走真实公司字幕解析；ASR、画面字、术语识别均为零网络 Adapter，只验证流程交接。

## 流畅性矩阵

每个阶段均执行 A→B→A 五轮，记录页面切换墙钟时间（毫秒）：

| 阶段 | B→A 五轮（B ms / A ms） | 3 秒内稳定 |
| --- | --- | --- |
| 上传中 | 249/248、235/250、248/248、249/252、248/249 | 5/5 |
| 上传完成 | 250/247、234/247、235/249、247/250、247/250 | 5/5 |
| 识别中 | 251/250、235/249、245/251、233/250、234/248 | 5/5 |
| 审改脏态 | 142/142、160/139、126/125、150/135、165/140 | 5/5 |
| 交付 ready | 156/125、124/114、126/107、116/104、104/112 | 5/5 |

在上传中同时执行搜索、筛选、展开、暂停/继续、项目切换和收侧栏；三集播放器均使用竖屏视频授权。当前浏览器只读控制面不暴露 `PerformanceObserver`/Long Task 条目，因此无法提供 >200 ms / >500 ms 长任务源字段；以上为可复核墙钟证据，不冒充生产 SLA，已作为测试能力限制回报规划。

## 项目隔离矩阵

- 匿名项目 A/B 在上传中、完成、识别中、审改脏态、交付 ready 五阶段各执行 5 轮 A→B→A。
- 每次导航 URL 均携带目标 `projectId`；B 页面快照不含 A 标识。B 使用 A 交付文件 ID 返回 `404 DELIVERY_FILE_NOT_FOUND`，响应体不含路径或正文；B 自有素材清单请求仅返回 B 数据。
- A/B 的媒体、任务、选择、错误和 requestId 均按项目查询；本轮未观察到迟到 A 响应覆盖 B 页面。未注入人为网络延迟，故该项以顺序切换证据为限，不宣称并发竞态已穷尽。
- 脏态切换先处理自动警告再允许通过；全局项目列表归属正确。项目列表带分页字符串参数的前端请求另见 `QA-S6-02-002`。

## 最终文件摘要

- 台词 SRT：1/14/26 集分别 49/26/42 cues，下载后 UTF-8 BOM、字节数和 SHA-256 与清单一致。
- 画面字 SRT：1/14/26 集各 1 cue，下载后同样完成摘要/大小核对。
- 术语 XLSX：2,568 bytes，ZIP/OOXML 条目 `[Content_Types].xml`、`_rels/.rels`、`xl/workbook.xml`、`xl/_rels/workbook.xml.rels`、`xl/worksheets/sheet1.xml` 均可解析；当前零网络术语 Adapter 产出 0 条术语行，未据此推断识别质量。

## 缺陷

### QA-S6-02-001（P1）交付确认拒绝已 released 验收会话

复现：验收会话完成 release 后调用 `deliveries/confirm`/交付创建，确认中的 release 为空或创建返回 `DELIVERY_SESSION_NOT_READY`。后端既有创建契约要求 `ready_to_release`，而 release 后会话为只读 `released`，两者无法首尾衔接。本轮以全新 `ready_to_release` 会话按既有测试契约完成交付，缺陷证据保留在隔离数据库日志中。

### QA-S6-02-002（P1）项目列表分页查询参数类型不匹配

复现：`GET /api/projects?lifecycleStatus=active&limit=50&offset=0` 返回 `400 REQUEST_VALIDATION_FAILED`，导致正式前端项目选择器读取失败。本轮临时代理仅剥离分页参数以继续执行隔离矩阵；未修改生产代码。

## 清理与边界

- 隔离 PostgreSQL、API、Vite/本地代理、内存对象、播放授权、临时交付文件和测试脚本均在任务结束后精确停止/删除；隔离数据库计数由 1 降至 0。
- E: 原始六文件未改动；未把真实台词、视频帧或文件字节写入仓库/日志/截图。未接真实供应商、密钥、付费、云资源、外部网络、部署或 Git。
- 脱敏运行证据保存在仓库外：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a0065d-ce1c-7f11-94d8-56b91f062cf8\s6-02-live-state.json`。

## 交接

本报告、状态和开发日志写回后，`TEST-S6-02 Rev 2` 转 `review / Current actor=规划对话`。正式回流严格遵循“测试 → 规划 → 返工角色 → 规划 → 原测试任务复验 → 规划关闭”，本对话不直接通知前端、后端或 UI。

---

## TEST-S6-02 Rev 3 定向复验（FIFO 151）

日期：2026-08-16  
范围：仅复验 `QA-S6-02-001`、`QA-S6-02-002`；Rev 2 真实素材、流畅性、A/B 隔离、播放器、下载摘要和识别链证据冻结，不重读或导入 E: 原始素材。

### 结论

- `QA-S6-02-001`：通过。匿名最小夹具从 S5 `ready_to_release` 进入正式 S7 confirm/create；旧 S5 POST 返回 `404`，旧调用前后 `AcceptanceRelease=0`、`DeliveryProduct=0`、`acceptance_commands=2`、`delivery_commands=0` 均无变化。稳定 `deliveryId` 的 S7 创建返回 `202`，Worker 返回 `ready`，同一会话变为 `released`；数据库恰好 1 条 `AcceptanceRelease`、1 条 `DeliveryProduct`、1 条生成命令。两次 Release GET 和两次 Delivery detail GET 均保持同一 ID/ready，不创建第二条。
- `QA-S6-02-002`：通过。真实 HTTP 默认请求、`limit=1/100`、`offset=0/1` 以及 `lifecycleStatus=active&limit=50&offset=0` 均返回 `200`，`total/items` 与页大小/偏移一致；`limit/offset` 的 0、101、负数、非数字、小数和前导零格式均稳定返回 `400 REQUEST_VALIDATION_FAILED`。正式前端 `listProjects` 使用 `URLSearchParams` 携带 `lifecycleStatus=active&limit=100`，未发现代理剥参、删参或 fallback；`offset` 为契约可选项并由服务端默认 `0`。
- 活跃生产源静态门：`createAcceptanceRelease`、`CreateAcceptanceReleaseBody`、`AcceptanceReleaseCommandResult` 和 S5 POST 路径均为 `0`（`frontend/src`、`backend/src`、`packages/contracts/src`）。

### 定向证据

- 隔离库：`qimao_test_s6_02_r3_20260816`；仅匿名项目/合成字幕夹具，未读取 E: 文件。
- 后端定向自动化：`tests/backend/projects.test.ts`、`tests/backend/subtitle-acceptance.test.ts`、`tests/backend/deliveries.test.ts` 选定场景 `3/3` 通过（其余 `26` 项跳过）。前端项目中心回归 `8/8` 通过。
- 脱敏 JSON 证据（只含 HTTP 状态、计数、ID 稳定性和分页摘要，不含台词、帧或文件字节）：`C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a0065d-ce1c-7f11-94d8-56b91f062cf8\s6-02-rev3-redacted.json`。

### 清理与边界

- Rev 3 隔离数据库、内存对象、测试脚本和 Node shim 在完成后精确删除/停止；未改生产 frontend/backend、迁移、contracts 或 DESIGN，未接真实供应商/网络/密钥/付费/云资源，未提交/推送/部署。
- 原始 E: 六文件全程只读且本轮未访问；未把真实台词、视频帧或文件字节写入仓库、日志或截图。

### 交接

本节、`CURRENT` 与开发日志写回后，`TEST-S6-02 Rev 3` 转 `review / Current actor=规划对话`。正式回流严格遵循“测试 → 规划 → 返工角色 → 规划 → 原测试任务复验 → 规划关闭”，本对话只唤醒规划固定任务，不直接通知前端、后端或 UI。
