# 开发日志

## 2026-08-15 — 协作协议 v4.4 权限链路前置门

- 用户明确要求修复“固定对话 read-only → 普通本地写入误触审批 → auto_review 503 后才发现”的链路。根因属于目标任务运行权限和派发握手缺失，不是用户撤销授权，也不是业务实现失败。
- 项目级 `AGENTS.md` 与 `docs/WORKFLOW.md` 升级 v4.4：每次启动、返工和验收派发后，目标除 `inProgress` 外必须明确确认工作区根包含 `C:\Users\ComradeGu\Documents\七猫兼职`、目标仓库为 `workspace-write/:workspace`、普通仓库编辑不走 `auto_review`。
- `read-only`、根目录不匹配或普通仓库写入触发审批时，目标立即停止并回报 `permission_blocked`；规划负责写回阻塞、修正或重新派发，不计业务 Rev，不让用户传话。范围内本地写入/测试继续自动授权，购买、部署、推送、真实付费 API、云资源和破坏性操作继续单独授权。
- `CURRENT.md` 升级到 v4-250；FIFO 101/102 从表头外错误位置移动到正式规划接力队列，新增 FIFO 103 收集 UI/前端/后端权限握手。本次不改变 S5 范围或生产代码。
- FIFO 103 三角色回执已收到：后端明确根目录正确、`workspace-write` 可写并继续 BACK-M3-05A；UI 和前端均明确根目录正确但当前沙盒为 `read-only`，没有修改业务文件或触发 `auto_review`。规划将 `UI-M3-05` 与 `FRONT-M3-05B` 记为 `permission_blocked / Current actor=规划对话`，不增加业务 Rev；后端继续执行，UI/前端待环境恢复后重新握手自动续接。CURRENT 同步为 v4-251，FIFO 103 保持权限等待而不是伪装 closed。

## 2026-08-15 — S5 字幕验收工作台正式启动

- 用户明确要求恢复范围内本地写入、状态同步和跨角色自动接力；普通本地编辑、测试、规划审核、任务通知与送达确认不再逐次询问。购买、真实付费 API、云资源、部署、推送和破坏性操作继续保留单独授权门。
- 规划读取 M3 里程碑、`LOCAL_APP_PARITY.md` 和本地 `apps/short-drama-subtitle-review/README.md`，确认下一功能为 S5 字幕验收工作台，而不是继续扩画面字 OCR。
- 新增 `docs/contracts/M3-subtitle-acceptance-workbench.md`，固定不可变 S3 台词版本、可选 S4 画面字版本、双视频、三轨时间轴、完整轻量编辑、撤销恢复、确定性质量检查、逐集/整剧验收、局部返工、来源失效和不可变验收 Release。
- `CURRENT.md` 递增为 v4-246；`PLAN-M3-05` 标记 done，`UI-M3-05` 与 `BACK-M3-05A` 并行 ready，`FRONT-M3-05B` blocked 等待 UI/后端双依赖。未接真实云资源、付费、密钥、服务器或部署。
- 自动接力三段证据已完成：状态先写回 v4-247；FIFO 101/102 分别只唤醒 UI 与后端固定对话；`read_thread` 确认两条消息均送达，两个对话都明确回执并进入 `inProgress`。CURRENT 递增为 v4-248，两个通知队列关闭，任务状态改为 `in_progress`；用户无需传话。
- 项目级 `AGENTS.md` 已补长期授权边界：范围内本地编辑、测试、状态/日志写回、规划审核和固定对话自动接力默认授权；外部、付费、部署、推送和破坏性动作保留确认门。临时只读或自动审批服务故障只登记为工具异常，权限恢复后自动续接。CURRENT 同步为 v4-249。

## 2026-08-15 — S4 画面字 OCR 最终质量门通过并正式关闭

- 关闭同步已发送到固定 UI、前端、后端对话。UI 与前端均明确回执收到且保持等待；后端对话为 `notLoaded`，首次消息入队但没有启动 turn，立即重试时工具返回 `agent loop died unexpectedly`。该对话没有待办或后继依赖，故不反复唤醒；失败已写入 `CURRENT v4-245`，后端下次正常启动时以 CURRENT 为准，用户无需传话。
- UI 已完成 `FRONT-M3-04B` Rev 3 两个原失败场景的正式微终验，`P0=0 / P1=0`：未拆分左右父候选逐条与混合批量门禁、拆分后不可变 Release/SRT，以及来源/当前证据不可用时的全写锁、真实 requestId、唯一重读、防重复和失败/成功焦点恢复全部通过；证据见 `docs/ui/M3-screen-text-acceptance.md` §16。
- 规划按约定只运行一次完整 `pnpm check`。精确隔离数据库 `qimao_planning_s4_close_20260815` 从零应用 22 个迁移；仓库边界、lint、TypeScript、20 个测试文件 184/184、共享契约/后端/前端生产构建全部通过。Vite 构建为 164 modules，仅报告非阻断的 500 kB chunk 提示。
- 隔离数据库已删除并核对残留 0，本地 PostgreSQL 已按用户授权停止。`CURRENT.md` 递增为 v4-244，`FRONT-M3-04B` Rev 3 与 S4 标记 `done`；`LOCAL_APP_PARITY.md` 和 M3 里程碑已同步实际覆盖、真实 OCR 厂商/费用/存储剩余缺口及下一阶段 S5。
- 未提交、推送、部署、购买或创建云资源；未接真实 OCR/网络/密钥/付费/R2，也未自动启动 S5。

## 2026-08-15 — FRONT-M3-04B Rev 3 两场景 UI 微终验通过并交规划

- 使用正式 React、正式 Fastify 与精确隔离 PostgreSQL `qimao_ui_m304b_rev3_20260815_097` 只复验 §15 原失败 A/B；Product Design Audit 先取最小截图再审查，Impeccable 沿用规划新鲜定向结果 `[]`。§15 其余视觉、1440/1024、键盘、滚动和业务矩阵冻结，没有重跑完整页面或修改生产代码。
- 场景 A 通过：两集未拆分左右父候选逐条仅有忽略/拆分；混合批量只提交普通候选并播报父候选保持待确认，发布门禁未虚假放开。两集拆分并完成剩余合法决定后，正式不可变 Release `ccd1648a-2c25-4b6e-aa26-f3feff9ad8f1` 成功，两个 SRT 均含独立左/右 Cue。请求计数为创建 1、决定 4 请求/6 合法项、发布 1。
- 场景 B 通过：来源门禁 blocked/stale 时全部候选写动作和发布锁定；来源就绪时，隔离代理只把原 evidence GET 依次转给正式 3004/3004/3002，得到真实 `503 → 503 → 200`。错误块保留真实原因与 requestId，恰好一个重读；恢复中无重读入口、防重复且写动作全锁；再次失败焦点回重读，成功焦点回 `候选证据与编辑` 容器并恢复合法动作。控制台 `error=0 / warn=0`。
- 结论写入 `docs/ui/M3-screen-text-acceptance.md` §16，仓库外最小证据目录为 `front-m3-04b-rev3-ui-micro`。本轮 `P0=0 / P1=0`，无新增 P2/P3；任务保持 `review` 并交回规划，由规划只运行一次完整 `pnpm check` 后裁决 S4 关闭。
- 清理完成：in-app Browser 隔离标签已关闭，3000/3002/3004 已释放，隔离数据库精确删除并核对残留 0，3 个临时脚本已删除；3001、3010 与共享 PostgreSQL 55432 未触碰。
- v4.3 送达闭环完成：状态、验收与日志先写回 v4-242；正式交审只发送规划固定对话；`read_thread` 确认完整 FIFO 098 消息进入规划最新 inProgress turn，`wait_threads` 确认规划为 `active / inProgress`。同步版本递增为 v4-243，FIFO 098 关闭；UI 停止验收并等待规划最终关闭门，不直接通知前端/后端。

## 2026-08-15 — UI 领取 FRONT-M3-04B Rev 3 两场景微终验

- 已完整重读项目协议 v4.3、`CURRENT.md` v4-240、画面字 UI 验收 §15 与开发日志顶部，并按 Product Design Audit、Impeccable 和既定 in-app Browser 的有界终验流程进入执行。
- 本轮只复验两个原失败场景：未拆分左右父候选的逐条/混合批量资格与拆分后不可变 Release/SRT；来源门禁或当前代表截图 loading/真实失败时的全写锁、真实原因/requestId、唯一证据重读、防重复和失败/成功焦点恢复。§15 其余正式视觉、1440/1024、键盘、业务和控制台矩阵冻结。
- `CURRENT.md` 从 v4-240 最小递增为 v4-241，FIFO 097 转 `active`。不修改生产前后端、迁移、共享契约或 DESIGN，不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-15 — BACK-M3-04D / FRONT-M3-04B Rev 3 规划微审通过并路由 UI 两场景终验

- 规划逐项审计后端决定事务与新增回归，确认未拆分父候选以稳定持久化身份识别，approve/edit 在任何候选更新、事件、批次归约或幂等命令保存前拒绝；ignore/split、拆分左右子候选、普通候选与不可变 Release/SRT 正向链未回归。新鲜独立验证创建精确隔离库 `qimao_planning_m304d_20260815`，从零应用 22 个迁移，screen-text 13/13、正确后端生产构建、`check:repo` 和差异检查通过；隔离库已删除且残留 0，共享 PostgreSQL 未停止。
- 规划逐项审计前端 evidence query、统一 writeLocked、父候选逐条/批量资格和恢复焦点，确认来源或当前证据 loading/error 会清普通/跨页选择并锁定所有候选写入口；错误区忠实展示 Fastify 原因/requestId，唯一重读只 refetch 原 evidence 查询，父候选批量保留不会发送其 POST。新鲜复跑 screen-text 前端 14/14、TypeScript、Vite 164 modules 与差异检查通过。
- `BACK-M3-04D` 标记 done；`FRONT-M3-04B` Rev 3 转 UI 定向微终验。`CURRENT.md` 从 v4-239 最小递增为 v4-240，登记 FIFO 097 `notification_pending`。UI 只复验 §15 两个原失败场景，其他正式矩阵全部冻结；未运行完整 `pnpm check`，其仅在 UI 通过后由规划执行一次。

## 2026-08-15 — FRONT-M3-04B Rev 3 父候选资格与证据统一写锁完成并交规划

- 只修改 `frontend/src/features/screen-text/` 与 `tests/frontend/ScreenTextWorkspace.test.tsx`。用正式持久化投影 `source=ocr + pairGroupId 非空 + position=full` 识别未拆分左右父候选，不解析原文或文案；逐条隐藏直接保留/保存编辑，批量保留排除父项并明确提示先拆分、保持 pending。普通单屏与 `source=split + left/right` 子候选保持既有动作。
- 代表截图由正式 evidence query/fetch 读取，不再以 `img onError` 生成前端错误。来源门禁不满足，或当前代表截图 loading/error 时，候选选择、当前页/跨页选择、批量、人工新增、忽略/拆分/保留/恢复/保存和失败重试统一锁定；真实 `ScreenTextApiError` 原样显示原因与 requestId，错误块只有“重新读取候选证据”，只 refetch 原证据查询并覆盖恢复中防重复、再次失败回焦与成功回到证据区焦点。
- 高价值回归新增可控 evidence pending→503 `REQ-ST-EVIDENCE-503`→唯一人工重读→success、来源门禁零候选写请求、父候选逐条和混合批量只提交合法普通候选，并正向确认普通单屏及拆分子候选动作不回归。新鲜 screen-text 专项 1 文件 14/14、前端 TypeScript、Vite 164 modules 生产构建、Impeccable 定向检测 `[]`、`git diff --check` 全部通过。
- `CURRENT.md` 基于并行后端闭环后的 v4-237 最小递增为 v4-238；FIFO 094 关闭并登记 FIFO 096 `notification_pending`，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`。CSS 视觉主体、后端、迁移、共享契约、DESIGN 与 UI §15 其他冻结证据未改；未运行完整 `pnpm check`，未提交、推送或部署。下一步只正式唤醒规划固定对话并确认送达，不直接通知 UI。
- v4.3 交接闭环完成：正式交审只发送规划固定对话；`read_thread` 已确认完整 FIFO 096 / v4-238 消息进入规划最新 turn，规划任务为 `active / inProgress`。同步版本递增为 v4-239，FIFO 096 关闭；前端停止修改并等待规划独立微审，不直接通知 UI。

## 2026-08-15 — BACK-M3-04D Rev 1 左右父候选决定门禁完成并交规划

- 只修改 `screen-text.write.repository.ts` 与对应后端专项测试。权威决定事务用已有持久化事实 `source='ocr' + pair_group_id 非空 + position='full'` 识别未拆分左右同屏父候选；不使用原文换行、文字内容、文件名或浏览器推断，也无需迁移或共享契约变化。
- 父候选直接 approve/edit 在任何候选更新、事件、批次归约或幂等命令保存前稳定返回 `422 SCREEN_TEXT_DECISION_INVALID`。回归逐项比较失败前后目标候选状态/修订/文字、批次状态/修订/计数、目标 DecisionEvent 和两枚幂等键命令，全部零副作用。
- 正向回归覆盖父候选 ignore、在匿名测试中移除原文换行后仍可按持久化身份 split、拆分子候选保持 `source=split / position=left|right / status=edited`、普通单屏候选 approve，以及批次完成后原有不可变 Release/SRT 成功包含左右独立 Cue。既有发布事务未修改。
- 新鲜验证使用精确隔离数据库 `qimao_back_m304d_20260815_093`：从零应用 22 个迁移，screen-text 专项 13/13；后端生产构建、`check:repo`、`git diff --check` 全部通过。隔离库已精确删除且残留 0，共享 PostgreSQL 未停止；按边界未运行完整 `pnpm check`。
- 状态已写回：`CURRENT.md` 基于并行前端写入后的 v4-235 最小递增为 v4-236，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO 093 关闭并登记 FIFO 095 `notification_pending`。未改服务层、迁移、共享契约、Worker/Adapter、证据/播放、发布事务、生产前端或 DESIGN，未接真实 OCR/网络/密钥/付费/R2，未提交、推送或部署；下一步只唤醒规划并确认送达。
- v4.3 交接闭环完成：正式交审只发送规划固定对话；`read_thread` 已确认完整 FIFO 095 / v4-236 消息进入规划最新 turn，规划任务为 `active / inProgress`。同步版本递增为 v4-237，FIFO 095 关闭；后端停止修改并等待规划独立微审，不直接通知前端/UI。

## 2026-08-15 — FRONT-M3-04B Rev 3 领取与状态映射预检

- 已重读 v4.3 协议、`CURRENT.md` v4-234、画面字 UI 验收 §15、正式 screen-text 前端/API 与开发日志；确认 FIFO 094 为 `ready / Current actor=前端开发对话`，本轮与 `BACK-M3-04D` 目录互不重叠可受控并行。
- 预检确认无需修改共享契约：未拆分左右父候选可由正式 `source=ocr + pairGroupId + position=full` 身份识别，拆分后子候选为 `source=split + position=left/right`；证据读取端点的 Fastify 错误可由既有 `ScreenTextApiError` 忠实保留原因、retryable、action 和 requestId。
- 计划只收口两组 P1：父候选仅忽略/拆分且批量保留排除并提示；来源门禁或当前 evidence query loading/error 时统一锁定候选写操作，失败块只提供“重新读取候选证据”并在再次失败/成功后确定焦点。CSS 视觉主体、后端、迁移、共享契约、DESIGN 和 §15 其他通过项冻结。
- `CURRENT.md` 从 v4-234 最小递增为 v4-235，FIFO 094 转 `active`，任务转 `in_progress`。本轮不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-15 — 后端领取 BACK-M3-04D Rev 1 左右父候选决定门禁

- 已重读项目协议 v4.3、`CURRENT.md` v4-233、画面字 UI 终验 §15、S4 权威工作流与日志顶部；确认唯一后端缺口是合法决定校验发生过晚：未拆分左右同屏父候选当前可直接 approve/edit，直到不可变发布事务才被严格配对门禁拒绝。
- 本轮只在 screen-text 后端权威写状态机及对应后端测试中，用稳定持久化身份识别未拆分父候选；只允许 ignore 或 split，approve/edit 稳定 422 且目标候选、批次修订/计数、DecisionEvent 和幂等命令零副作用。拆分后左右子候选、普通单屏候选和发布事务保持不变。
- `CURRENT.md` 从 v4-233 最小递增为 v4-234，FIFO 093 转 `active`，任务转 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`。不改迁移、共享契约、Worker/Adapter、证据/播放、发布事务、生产前端或 DESIGN；不接真实 OCR/网络/密钥/付费/R2，不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-15 — FRONT-M3-04B Rev 2 两项 P1 根因裁决并拆定向并行返工

- 规划审阅正式 UI 终验 §15、正式前端动作投影和后端画面字写状态机，确认两项 P1 均成立。左右同屏父候选在前端可直接批量保留，后端也允许 pending→approved/edited，直到发布事务才检查 `{left,right}`，属于合法决定校验发生过晚；来源门禁只影响创建入口、没有进入当前候选写锁，代表截图又由浏览器图片失败文案处理，无法保留 Fastify `requestId` 或形成权威重读闭环。
- 拆为两个目录互不重叠的最小切片：`BACK-M3-04D` Rev 1 只把未拆分左右父候选的决定资格前置到后端，直接保留/编辑稳定 422 且零副作用，忽略/拆分与拆分后发布链保持；`FRONT-M3-04B` Rev 3 只同步动作资格和批量语义，把来源/当前证据就绪纳入统一候选写锁，并为代表截图正式读取失败提供原因、请求标识和唯一重读。
- `CURRENT.md` 从 v4-232 最小递增为 v4-233；FIFO 092 关闭，登记 FIFO 093/094 `notification_pending`。允许后端与前端在互不重叠目录受控并行；其他 §15 通过项冻结，UI 不参与编码，完整 `pnpm check` 继续等待双修正与 UI 两场景微终验通过。

## 2026-08-15 — FRONT-M3-04B Rev 2 正式 UI 终验退回两项 P1

- UI 使用 Product Design Audit、Impeccable 与既定 in-app Browser，在正式 React `3000`、Fastify `3001`、共享 PostgreSQL 上的精确隔离库 `qimao_ui_m304b_20260815_091` 完成一次完整领域终验；匿名项目、公司 SRT、术语 V2、整剧/单集批次、失败重试、明确空集和人工候选均经正式 API/页面建立，没有改生产代码、业务表、迁移或共享契约。
- 同状态高保真、正常双门禁、三范围、项目级批次/候选查询与排序、四态候选、当前页选择、stale 只读唯一新批次入口、失败重试、取消弹窗、证据放大、1440/1024 两态和控制台均通过。1024 侧栏 204/72px 时根页面均为 `1014/1014`，候选表为 `560/780`、`692/780`；控制台 `error/warn=0/0`，Impeccable 定向检测 `[]`。Rev 1 不可变 Release 与同 exportId 下载证据冻结引用。
- P1 一：未拆分的“左侧文字 / 右侧文字”双屏父候选可被批量保留，批次随即显示“已完成/可以发布”；正式发布被服务端以“左右配对必须恰好保留一条左轴和一条右轴”拒绝，而完成态右侧只剩“保存修改”，没有拆分、撤销或恢复入口。P1 二：隔离 backend 精确重启后真实恢复数据库批次但证据对象不可用，页面显示来源门禁未满足与代表截图不可用，“忽略/拆分左右/保留并下一条/保存修改”及候选选择仍 enabled，且没有带请求标识的唯一证据重读。
- 证据已追加到 `docs/ui/M3-screen-text-acceptance.md` §15；仓库外目录为 `front-m3-04b-rev2-ui-final`，阻断截图为 `06-p1-approved-dual-no-correction.png`、`07-p1-release-gate-mismatch.png`、`11-p1-evidence-unavailable-actions-enabled.png`。本轮结论 P0=0/P1=2/P2=2/P3=0，正式 UI 终验不通过。
- 状态已写回：`CURRENT.md` 从 v4-230 最小递增为 v4-231，FIFO 091 关闭并登记 FIFO 092 `notification_pending`；任务保持 Rev 2 并转 `blocked / Current actor=规划对话 / Reviewer=规划对话`。完整 `pnpm check` 继续冻结，下一步只通知规划总线并确认送达，不直接通知前端。
- v4.3 交接闭环已完成：正式退审只发送规划固定对话；`read_thread` 确认完整 P1、证据和最小建议进入规划最新 turn，`wait_threads` 确认规划为 `active / inProgress`，规划已明确开始处理左右配对的决定门禁根因。`CURRENT.md` 最小递增为 v4-232，FIFO 092 转 `active`。隔离数据库已删除且残留 0，3000/3001 服务已停止，本轮临时脚本/日志残留 0；既有 3010 与共享 PostgreSQL 55432 未停止。

## 2026-08-15 — FRONT-M3-04B Rev 2 规划微审通过并路由 UI 正式终验

- 规划逐项核对 `CommandInput` 判别联合、mutation 和 `CommandDialog` 首次提交：cancel/retry/empty/manual/release 的 batch、episode、episodeNumbers、expectedBatchRevision、manual body 和幂等键均在 intent 中一次冻结；mutation 与恢复不再读取实时 `detail.data` 或 `dialog`。
- 新鲜复验：screen-text 专项 1 文件 11/11；前端 TypeScript 通过；Vite 生产构建 164 modules；`git diff --check` 通过。两条未知结果回归确认 revision 5→6 后同 key/同真实 body，确定性 409 回归确认清意图后新 key/new revision。
- 规划接受 Rev 2，FIFO 090 关闭并登记 FIFO 091 `notification_pending`；正式 UI 终验只检查正式 React+Fastify/PostgreSQL 的同状态高保真、完整状态/异步/键盘/响应式/控制台矩阵，不改生产代码。UI 通过后规划只运行一次完整 `pnpm check` 关闭 S4。
- `CURRENT.md` 从 v4-228 最小递增为 v4-229。未改生产前后端、CSS、迁移、共享契约或 DESIGN，未接真实 OCR/网络/密钥/付费/R2，未提交推送部署。
- v4.3 路由闭环已完成：规划只唤醒 UI 固定对话；`wait_threads` 确认 UI 明确接收 FIFO 091 并进入 `active / inProgress`，按 Product Design Audit + Impeccable + 既定 in-app Browser 执行正式终验。`CURRENT.md` 最小递增为 v4-230，FIFO 091 转 `active`；生产前端冻结，未通知前端返工。

## 2026-08-15 — FRONT-M3-04B Rev 2 完整请求意图冻结并交规划微审

- 仅修改 `ScreenTextWorkspace.tsx` 与 `ScreenTextWorkspace.test.tsx`。五类 `CommandInput` 改为完整后端请求身份判别联合：首次提交冻结 `kind`、批次/集数、失败集集合、批次修订、人工新增 body 和幂等键；mutation 与重试只读取冻结 intent，不再从实时 `detail.data` 或 `dialog` 重组 URL/请求体。
- 未知/可重试失败继续重放首次完整事实；确定性非重试错误继续清除旧 intent 并刷新服务端权威详情，下一次用户显式提交生成新 key 和新请求体。取消、失败集重试、明确空集、人工新增和发布共用同一安全边界，没有新增浏览器业务状态源。
- 回归新增两条可控 pending→503→详情 revision 由 5 变 6→人工恢复链路：`confirm-empty` 第二次仍为原 key 与 `{ expectedBatchRevision: 5 }`，`release` 第二次仍为原 key 与 `{ batchId, expectedBatchRevision: 5 }`；另补确定性 409，证明刷新后新提交使用新 key 与 `{ expectedBatchRevision: 6 }`。
- 新鲜验证：`pnpm exec vitest run tests/frontend/ScreenTextWorkspace.test.tsx` 为 1 文件 11/11；前端 TypeScript 通过；Vite 生产构建 164 modules；`git diff --check` 退出码 0（仅既有 CURRENT/日志 CRLF→LF 提示）。未运行完整 `pnpm check`，未改 CSS、视觉、API、后端、迁移、共享契约、DESIGN，未重做 Rev 1 浏览器矩阵，未提交、推送或部署。
- 状态已写回：`CURRENT.md` 从 v4-226 最小递增为 v4-227，FIFO 089 关闭并登记 FIFO 090 `notification_pending`；任务转 `review / Current actor=规划对话 / Reviewer=规划对话`。下一步只正式唤醒规划固定对话并确认送达，不直接通知 UI。
- v4.3 交接闭环完成：正式交审只发送规划固定对话；`read_thread` 确认完整 FIFO 090 消息进入规划最新 turn，`wait_threads` 确认规划为 `active / inProgress`。`CURRENT.md` 最小递增为 v4-228，FIFO 090 转 `active`；未直接通知 UI，前端停止修改并等待规划微审。

## 2026-08-15 — FRONT-M3-04B Rev 1 规划预审退回同键异参 P1

- 规划完成正式画面字前端的状态源、异步恢复和同状态截图预审。服务端批次/候选/Release 读取、stale 只读、历史 exportId、候选四排序、当前页/显式跨页选择和 1440/1024 三栏结构均与冻结范围一致；新鲜运行画面字专项 8/8、前端 TypeScript、Vite 164 modules 生产构建和 `git diff --check` 全部通过。
- 唯一 P1 位于 `ScreenTextWorkspace.tsx` 的命令恢复：`commandIntent` 保存的是 UI 层 `kind` 和人工新增 body，但 `confirm-empty`、`release` 的真实 API body 每次 mutation 都从当前 `detail.data.revision` 重新组装。未知/可重试响应后，详情可能因并发或窗口重新聚焦发生刷新；再次点击“重试同一意图”会以原幂等键携带新的 `expectedBatchRevision`，后端请求摘要不同并稳定拒绝 `SCREEN_TEXT_IDEMPOTENCY_KEY_REUSED`。现有人工新增回归只证明 manual body 冻结，不能覆盖该缺口。
- 集中递增 `FRONT-M3-04B` Rev 2：首次提交时冻结五类命令完整请求身份，mutation 只消费该冻结事实；至少补 `confirm-empty` 与 `release` 两条“第一次 503/未知→详情修订变化→第二次同键同体”的回归。其余生产代码、CSS、视觉、正式 API/后端、迁移、共享契约、DESIGN 与 Rev 1 浏览器证据全部冻结。
- `CURRENT.md` 从 v4-224 最小递增为 v4-225，FIFO 088 关闭并登记 FIFO 089 `notification_pending`。本轮不路由 UI、不运行完整 `pnpm check`；完成后只交规划微审，用户无需传话。
- v4.3 派发闭环已完成：规划只唤醒前端固定对话；`wait_threads` 确认前端明确接收 FIFO 089 并进入 `active / inProgress`。`CURRENT.md` 最小递增为 v4-226，FIFO 089 转 `active`，任务转 `in_progress`；UI 未被提前唤醒。

## 2026-08-15 — FRONT-M3-04B Rev 1 正式画面字 React 工作台完成并交规划

- 在既有 AppShell 注册正式画面字路由与模块，新增 `features/screen-text` API、Workspace、Panels 和专属样式。页面只消费正式 PostgreSQL/API 权威事实，完成“集/批次队列—紧凑候选表—同源截图/视频证据与编辑”三栏，并覆盖双门禁、整剧/选中集/单集、11 类逐集状态、四态候选、服务端批次/候选/Release 查询、当前页与显式跨页选择、全部人工命令、取消/安全重试/需对账、stale 只读、原子不可变发布与历史 exportId 下载。
- 异步状态以冻结意图为边界：网络未知/可重试重放原 `kind/body/key`，确定性冲突清旧意图并刷新权威事实；候选 query identity 包含 batch/episode/search/status/category/sort/page，任何成员页变化先清普通选择，显式全部待确认保持独立语义。补两项终审回归证明排序不会提交隐藏旧候选，人工新增 503 后即使表单被编辑，唯一恢复仍原样重放第一次 body 与幂等键。
- 媒体只使用真实 `previewPath` 和短时播放授权。本地零网络 Adapter 返回证据不可用时，卸载失败图片、保留同构媒体区和 `role=alert` 明确阻断；不伪造截图、视频、OCR、术语命中、用量、集数或成功。`zero_network_call` 仅员工化显示为“零网络调用 N 次”，没有泄露供应商私参或费用配置。
- 新鲜验证：画面字专项 8/8；全部前端 9 文件 82/82；前端 TypeScript 通过；Vite 生产构建 164 modules；`git diff --check` 通过。Impeccable 单次定向检测发现 8 条同源单侧粗色边，已统一改为顶边/浅底/内轮廓；新鲜 finish reviewer 在两项状态修正后给出 `finish`、无 material finding。
- 真实浏览器走通素材/术语 V1→零网络批次→候选保留/忽略→1/1 完成→不可变 V1→历史 SRT；刷新前后 download URL 保持同一 exportId，发布/历史弹窗初始焦点、Escape 关闭和触发点恢复成立，控制台 `error/warn=0/0`。1440 根页面 `1430/1430`；1024 展开/收起侧栏 204/72px，根页面均 `1014/1014`，候选表容器为 `560/780`、`692/780`。最新版仓库外截图：`front-m3-04b/formal-1440x900-expanded.png`、`formal-1024x768-expanded.png`、`formal-1024x768-collapsed.png`、`formal-release-history-1440x900.png`。有意差异仅为真实 1 集项目、真实完成/Release 状态与零网络证据不可用事实。
- 状态已写回：`CURRENT.md` 从 v4-222 最小递增为 v4-223，FIFO 087 关闭并登记 FIFO 088 `notification_pending`；任务转 `review / Current actor=规划对话 / Reviewer=规划对话`。完整 `pnpm check` 依约留 UI 终验后的 S4 单次关闭门；未改后端、迁移、共享契约、DESIGN，未接真实 OCR SDK/网络/密钥/付费/R2，未提交、推送或部署。下一步只正式唤醒规划并确认送达/运行态，不直接通知 UI。
- v4.3 交接闭环完成：正式唤醒只发送规划固定对话；`read_thread` 确认 FIFO 088 完整消息进入规划最新 turn，`wait_threads` 确认规划为 `active / inProgress`，规划明确回执已收到并开始独立差异审计与定向复跑。`CURRENT.md` 最小递增为 v4-224，FIFO 088 转 `active`；未直接通知 UI，用户无需传话。

## 2026-08-15 — BACK-M3-04C 规划独立复验通过并恢复正式前端

- 规划逐项审计共享 `screen-text` 契约、正式路由、读取仓储、服务与后端回归：项目级批次列表由 PostgreSQL 提供状态筛选、ID/requestId 搜索、`updated_desc|created_desc`、稳定分页和真实 total；项目级 Release 列表按版本/文件名/batchId 搜索并忠实恢复既有 Release/Export 身份与下载路径；候选默认 `identity_first`，并支持 `time_asc|confidence_desc|pending_first`，所有排序均以不可变时间与 ID 补稳定次序。
- 新鲜独立验证使用精确隔离数据库 `qimao_planning_m304c_20260815`：从零应用 22 个迁移，`tests/backend/screen-text.test.ts` 为 12/12；共享 contracts 与后端生产构建、`check:repo`、`git diff --check` 全部退出码 0。验证结束只删除该精确隔离库，最终残留 0；共享 PostgreSQL 与既有服务未停止或清理。
- 规划接受 `BACK-M3-04C` Rev 1 并标记 done。原 `FRONT-M3-04B` 冲突已经解除，正式前端恢复为 ready：必须消费新增项目级批次/发布列表和四种服务端排序，继续按 `DESIGN.md` 5.5A、画面字 UI 验收 §1–14 及最终原型实现同状态高保真 React，不得使用浏览器历史 ID 缓存、当前页假排序、前端推算或原型假数据。
- `CURRENT.md` 从 v4-220 最小递增为 v4-221，登记 FIFO 087 `notification_pending`。完整 `pnpm check` 继续留在正式 React 经 UI 终验后的 S4 单次关闭门；未提交、推送、部署，未接真实 OCR SDK/网络/密钥/付费/R2。
- v4.3 派发闭环完成：正式唤醒只发送前端固定对话 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf`；`wait_threads` 确认前端明确收到 FIFO 087 并为 `active / inProgress`，已开始重读权威 UI、工作流和新增只读契约。同步版本递增为 v4-222，FIFO 087 转 `active`，任务转 `in_progress`；规划不并发修改生产前端，用户无需传话。

## 2026-08-15 — BACK-M3-04C Rev 1 只读解阻完成并交规划

- 共享契约与正式 API 新增项目级批次列表：服务端按状态筛选，按批次 ID/首次请求标识搜索，支持 `updated_desc|created_desc`、limit/offset、真实 total 和稳定 ID tie-break；摘要保留 scope、集数、术语/清单身份与版本、状态、修订、计数和时间，不复制 Job 全详情。读取可复用既有来源 stale 投影，但不创建业务事实。
- 新增项目级不可变 Release 列表：服务端按版本、文件名或 batchId 搜索，支持 `version_desc|created_desc` 与稳定分页；从 PostgreSQL 忠实恢复原 releaseId、版本、绑定身份、摘要、Cue 数和既有 Export 的 ID/集数/文件名/SHA-256/大小/下载路径，不创建、重建或重新绑定 Export。
- 候选查询新增 `identity_first`（默认，人名条优先后按首次出现）、`time_asc`、`confidence_desc`、`pending_first` 四种服务端排序；所有排序以 episode/start/end/id 等不可变字段补确定次序。TypeBox 保持 `additionalProperties:false`，未知 sort 和未知字段均返回 400。
- 回归新增两个批次的状态/标识搜索、两种排序与分页/空页 total；四种候选排序的并列值和跨页无重复漏项；两个不可变 Release 的刷新发现、三类搜索、原 Export ID/下载字节稳定，以及读取前后 Release/Cue/Export/command 数量不增。
- 新鲜验证使用精确隔离数据库 `qimao_back_m304c_20260815_085`：从零应用 22 个迁移，screen-text 专项 12/12；共享 contracts 与后端构建、`check:repo`、`git diff --check` 全部通过。隔离库已精确删除且残留 0，共享 PostgreSQL 未停止；按边界未运行完整 `pnpm check`。
- 状态已写回：`CURRENT.md` 从 v4-218 最小递增为 v4-219，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO 085 关闭并登记 FIFO 086 `notification_pending`。未改迁移、生产前端/DESIGN、Worker/Adapter、写仓储、证据/播放/发布事务，未接真实 OCR/网络/密钥/付费/R2，未提交、推送或部署；下一步只唤醒规划总线并确认送达，不直接通知或解锁前端。
- v4.3 交接闭环完成：正式交审只发送规划固定对话；`read_thread` 已确认完整 FIFO 086 / v4-219 消息进入规划最新 turn，规划任务为 `active / inProgress`。同步版本递增为 v4-220，FIFO 086 关闭；后端停止修改并等待规划独立复验，不直接通知或解锁前端。

## 2026-08-15 — FRONT-M3-04B 预检冲突成立并拆 BACK-M3-04C 只读解阻

- 规划独立核对冻结 UI、S4 工作流、共享 `screen-text` 查询契约、正式路由和读取仓储，确认前端冲突成立：项目级批次/发布发现列表不存在，新开页面无法从 PostgreSQL 恢复历史 `batchId/releaseId`；候选查询没有排序枚举且仓储固定时间顺序。浏览器缓存历史 ID、当前页假排序或原型数据都违反唯一权威状态和高保真门，前端停止编码是正确处理。
- 新增 `BACK-M3-04C` Rev 1，只补三项只读能力：批次历史列表、不可变发布历史列表、四种候选服务端稳定排序。批次列表固定状态筛选、ID/请求标识搜索、`updated_desc/created_desc` 与分页；发布列表固定版本/文件名/批次身份搜索、`version_desc/created_desc`、原 Release/Export 身份与分页；候选固定 `identity_first/time_asc/confidence_desc/pending_first`，均用不可变字段补稳定次序。
- 本任务不新增迁移，不修改 OCR Worker、Adapter、写状态机、证据/播放、发布事务、生产前端或冻结 UI；回归必须证明刷新可发现、空页保留真实 total、历史下载 ID 不重建、列表读取零业务新增和四种排序跨页稳定。完整 `pnpm check` 仍只在正式 React 经 UI 终验后运行。
- `CURRENT.md` 从 v4-216 最小递增为 v4-217，FIFO 084 关闭并登记 FIFO 085 `notification_pending`；`FRONT-M3-04B` 保持 blocked，待 `BACK-M3-04C` 规划独立验收通过后自动恢复，不要求用户传话。
- v4.3 派发闭环完成：正式唤醒只发送后端固定对话 `019ff4de-084b-7002-a7eb-20ff93d97d0a`；`wait_threads` 确认后端明确收到 FIFO 085 并为 `active / inProgress`。同步版本递增为 v4-218，FIFO 085 转 `active`，`BACK-M3-04C` 转 `in_progress`；规划不并发修改后端只读链路，前端继续安全等待。

## 2026-08-15 — FRONT-M3-04B Rev 1 编码前契约冲突审查

- 已完整重读 v4.3 协议、`CURRENT.md` v4-214、`DESIGN.md` 5.5A、画面字 UI 验收 §1–14、S4 工作流契约、共享 `screen-text` TypeBox、正式路由/读写/播放仓储和冻结原型；完成创建、读取、候选、决定、空集、取消、重试、证据、播放授权、发布与错误恢复的编码前映射。现有写状态机、证据和原子发布接口可复用，未发现需要前端复制 OCR/Usage/术语事实的理由。
- 冲突类型：UI/交互、代码契约与数据所有权。权威工作流和 UI 要求批次历史、不可变发布历史下载、服务端候选排序及刷新恢复；原型也有“批次历史”和“人名条优先/时间升序/置信度高到低/待确认优先”四种排序。但共享候选查询仅有 `episodeNumber/status/category/search/limit/offset`，正式仓储固定按 `episode_number/start_ms/end_ms/id` 排序；路由只支持创建批次、按已知 `batchId` 读取，以及创建发布、按已知 `releaseId` 读取，没有项目级批次或发布列表。
- 可复现证据：`packages/contracts/src/screen-text.ts:230-237`、`backend/src/modules/screen-text/screen-text.routes.ts:77-160`、`backend/src/modules/screen-text/screen-text.read.repository.ts:112`，对照 `docs/contracts/M3-screen-text-workflow.md:96,125` 与 `docs/ui/M3-screen-text-acceptance.md:51,55,106,125`。新开正式项目页无法从 API 发现当前/历史批次或发布版本，刷新后也不能仅凭 PostgreSQL 权威事实恢复历史下载；任意排序参数会被 TypeBox `additionalProperties:false` 拒绝。
- 影响与最小建议：三栏工作台的左栏批次历史、候选排序/跨页集合语义、发布历史和刷新恢复均受影响；建议只新增项目级批次列表、发布列表的服务端搜索/筛选/稳定排序/分页只读契约，并为候选查询增加四种已确认排序枚举。无需改迁移、OCR Worker、既有写状态机或 UI。缺口未关闭前不能以浏览器缓存、当前页假排序、固定原型数量或其他前端副本代替数据库权威状态，因此没有可安全提交的生产前端子集。
- 状态已写回：`CURRENT.md` 从 v4-214 最小递增为 v4-215，`FRONT-M3-04B` Rev 1 转 `blocked / Current actor=规划对话 / Reviewer=规划对话`；FIFO 083 关闭并登记 FIFO 084 `notification_pending`。本轮未修改 `frontend/`、`tests/frontend/`、后端、迁移、共享契约、DESIGN 或 UI 原型，未运行实现测试/构建，未提交、推送或部署。下一步只唤醒规划总线并确认送达，不直接通知 UI 或后端。
- v4.3 交接闭环完成：状态已写回 v4-215；正式唤醒已只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`；`read_thread` 确认完整 FIFO 084 消息出现在规划当前 turn，`wait_threads` 确认规划为 `active / inProgress`。同步版本递增为 v4-216，FIFO 084 关闭；前端保持阻塞，不通知 UI/后端，不要求用户传话。

## 2026-08-15 — BACK-M3-04A Rev 2 规划独立复验通过并解锁正式前端

- 规划独立代码审查确认五组 P1 已进入正式实现：普通重试只允许最新 Attempt 明确可重试且无外部副作用、安全取消或零候选，取消后的未知结果保持需对账；整剧范围由最新清单完整集派生并逐集验证 `screen_video`，创建与后续写入固定最新 TermVersion；Worker 经引擎中立 EvidenceStorage 保存派生证据字节，读取端校验项目候选、批次/集数归属、摘要、大小和类型；发布严格要求每组 `{left,right}`；批次 Usage 从持久 Attempt 按 provider/单位/币种分组，不再写死 fake 单位。
- 新鲜独立验证使用精确隔离库 `qimao_planning_m304a_rev2_20260815`：从零应用 22 个迁移；screen-text、terms、ASR、ASR Dispatch、pre-review 共 5 文件 47/47；共享 contracts 构建与后端生产构建均通过。无论验证结果如何均执行精确清理，最终隔离库残留为 0；共享 PostgreSQL `127.0.0.1:55432` 未停止或清理。
- 规划接受 `BACK-M3-04A` Rev 2 并标记 done。UI 与后端双依赖均满足，`FRONT-M3-04B` Rev 1 解锁：权威输入为 `DESIGN.md` 5.5A、画面字 UI 验收 §1–14、最终原型/10 张冻结证据、共享 `screen-text` 契约和正式 API。前端必须在既有 AppShell 中同状态高保真复原三栏工作台与完整状态矩阵，只消费真实后端事实，并提交 1440/1024 同视口证据及有意差异清单。
- `CURRENT.md` 从 v4-212 最小递增为 v4-213，FIFO 083 登记 `notification_pending`。完整 `pnpm check` 留正式 React 经 UI 终验后的 S4 单次关闭门；未提交、推送、部署，未接真实 OCR SDK/网络/密钥/付费/R2，也未创建云资源。
- v4.3 派发闭环完成：正式唤醒只发送前端固定对话 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf`；`wait_threads` 确认目标为 `active / inProgress`，前端已开始重读权威输入并进行契约/异步状态映射预检。同步版本递增为 v4-214，FIFO 083 转 `active`，任务转 `in_progress`；规划不并发修改生产前端，用户无需传话。

## 2026-08-15 — BACK-M3-04A Rev 2 五组集中返工完成并交规划

- 付费防重收口：普通重试只选择 latest Attempt `retryable=true / externalSideEffectPossible=false` 的失败、安全取消或明确零候选；`reconciliation_required` 永不进入普通重试。取消已请求后若 Adapter 返回未知或可能已有外部副作用，Attempt/Job/Batch 保持需对账，回归证明拒绝重试时 Attempt、Job 与幂等命令零副作用且不会发生第二次 Worker 调用。
- 来源一致性收口：`scope=all` 先从最新清单派生完整集数，再逐集验证已校验 `screen_video`，缺一集整体稳定阻断；创建必须使用项目最新已确认 TermVersion，后续新版本使旧批次刷新为 stale，候选写入与发布均稳定阻断且事件/命令/Release 零新增。
- 证据与发布收口：新增引擎中立 `ScreenTextEvidenceStorage`，零网络 Adapter 生成实际 SVG 字节，Worker 保存对象，读取端按项目候选、批次/集数前缀、SHA-256、大小与 content type 校验并返回原字节；对象缺失稳定 409 且不泄露 objectKey/Secret。发布前每个保留 pair group 必须恰有两项且位置集合严格为 `{left,right}`，否则 Release/Cue/Export 全部零新增。
- Usage 收口：批次不再硬编码 `zero_network_call / CNY`，而是从已持久化 Attempt Usage 按 provider、billingUnit、currency 确定分组；同构组确定聚合，异构组明确 `split`，不跨单位或币种求和。零网络 cloud API stub 实际返回 `image / 8 / USD / 0.08` 并通过正式 API 读取回归。
- 新鲜验证均使用精确隔离数据库 `qimao_back_m304a_rev2_20260815`：从零应用 22 个迁移；画面字专项 9/9；画面字、术语、ASR、ASR Dispatch、前置审改合计 5 文件 47/47；共享 contracts 与后端生产构建、`check:repo`、`git diff --check` 全部通过。隔离库已删除且残留计数 0，默认 `127.0.0.1:55432` 继续 accepting connections；完整 `pnpm check` 按边界留 S4 关闭门。
- 状态已写回：`CURRENT.md` 从 v4-210 最小递增为 v4-211，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO 081 关闭并登记 FIFO 082 `notification_pending`。未改生产前端或 DESIGN，未接真实 SDK/网络/密钥/付费/R2，未提交、推送或部署；下一步只唤醒规划总线并确认送达，不直接通知或解锁前端。
- v4.3 交接闭环完成：正式交审只发送规划固定对话；`read_thread` 已确认完整 FIFO 082 / v4-211 消息进入规划当前 turn，`wait_threads` 显示规划 `active / inProgress`。同步版本递增为 v4-212，FIFO 082 关闭；后端停止修改并等待规划独立复验，不通知或解锁前端。

## 2026-08-15 — 后端领取 BACK-M3-04A Rev 2 五组集中返工

- 完整重读项目协议 v4.3、`CURRENT.md` v4-209、画面字权威契约和开发日志顶部；确认规划从零 22 个迁移与现有 screen-text 6/6 已通过，Rev 1 三类 Registry/Worker/PostgreSQL 主链、候选审改、确定性 SRT 和无泄密事实冻结。
- 本轮只集中修正五组 P1：普通重试与取消未知的外部副作用防重；scope=all 完整集门禁与项目最新 TermVersion 来源；首版 Storage fake 的真实派生截图字节/摘要/归属链路；发布前 pair group 严格 `{left,right}`；忠实投影 Attempt Usage 并用非零 cloud stub 证明不再硬编码 fake 单位。
- `CURRENT.md` 从 v4-209 最小递增为 v4-210，任务转 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`，FIFO 081 转 `active`。不修改生产前端/DESIGN，不接真实 SDK/网络/密钥/付费/R2，不扩展管理员 API/服务器；完整 `pnpm check` 留 S4 关闭门。

## 2026-08-15 — UI-M3-04 关闭并集中退回 BACK-M3-04A Rev 2

- UI 最终微复验通过：stale 页三项旧决定均不可见且 disabled，唯一可见 enabled 写动作是“从新来源新建批次”，新鲜控制台为空。Rev 1/2 完整设计证据冻结，`UI-M3-04` 标记 done。
- 规划在精确隔离数据库 `qimao_planning_m304a_20260815` 从零应用 22 个迁移并运行 `tests/backend/screen-text.test.ts`，现有 6/6 通过；随后删除隔离库并复核残留为 0。通过项包括三类零网络 Adapter 正式链路、租约、候选、审计、空集和 UTF-8 BOM SRT。
- 独立代码/契约审查一次性发现五组现有测试漏项：普通重试未排除需对账/不可重试/可能外部副作用 Attempt，取消未知结果被压成 cancelled；整剧可能静默漏缺视频集且术语新版本未使旧批次只读；截图端点返回合成 SVG 而非 Adapter 对象字节；pair group 只看位置集合大小并把非 left 当 right；批次 Usage 硬编码零网络单位与 CNY。上述均与 S4 契约的付费防重、完整门禁、真实证据、左右双轴或引擎中立回执冲突。
- `BACK-M3-04A` 集中递增 Rev 2，只在 screen-text 后端/共享契约/测试必要范围内一次修正并补高价值回归；不接真实网络、SDK、密钥、付费或 R2，不改前端/DESIGN。`CURRENT.md` 更新至 v4-209，FIFO 081 `notification_pending`；`FRONT-M3-04B` 继续 blocked。

## 2026-08-15 — UI-M3-04 Rev 3 最后两个 stale 动作关闭并交规划

- 根因确认：`.decisionRow { display:grid }` 覆盖了 HTML `hidden` 的默认呈现。仓库外原型只补 `.decisionRow[hidden] { display:none }`，并在 stale 权限投影中原生禁用“忽略”“拆分左右”“保留并下一条”；既有 `staleReadOnly` 事件守卫继续作为第二层保护。
- 规划同形 URL `?view=stale&planning-audit=rev3` 的新鲜真实 DOM：`#ignoreOne` 与 `#keepOne` 均为 `count=1 / visible=false / enabled=false`，`#splitOne` 同为不可见且 disabled；全页可见且 enabled 的 `data-write-action` 恰好 1 项，为 `#primaryAction / new-source-batch / 从新来源新建批次`。
- 新鲜标签控制台日志为空；`node --check app.js` 与授权文档 `git diff --check` 通过。验收记录新增 §13；Rev 1/2 页面矩阵、视觉、响应式、键盘、弹窗和 10 张证据冻结未重跑，没有新增截图集。
- `CURRENT.md` 从 v4-206 最小递增为 v4-207；任务转 `review / Current actor/Reviewer=规划对话`，FIFO 079 关闭并登记 FIFO 080 `notification_pending`。未改 DESIGN、生产前后端、迁移或共享契约，未通知前端；下一步只唤醒规划微复验并确认送达。
- v4.3 交接闭环完成：正式交审只发送规划固定对话；`read_thread` 已确认完整 FIFO 080 / v4-207 消息进入规划当前 turn，`wait_threads` 显示规划 `active / inProgress`。同步版本递增为 v4-208，FIFO 080 关闭；UI 停止修改并等待规划裁决，未通知前端。

## 2026-08-15 — UI 领取 UI-M3-04 Rev 3 最后两个 stale 动作微返工

- 重读 `CURRENT.md` v4-205、画面字 UI 验收 §12 与日志顶部，确认唯一缺口为右侧“忽略”“保留并下一条”仍 `visible=true / enabled=true`；候选选择、编辑控件、行尾查看、新来源弹窗及 Rev 1/2 其余证据全部冻结。
- `CURRENT.md` 最小递增为 v4-206，任务转 `in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`，FIFO 079 转 `active`。本轮只补真实隐藏/原生禁用和精确 DOM 证明，不改 DESIGN、生产前后端、迁移或共享契约，不通知前端。

## 2026-08-15 — UI-M3-04 Rev 2 规划微复验退回最后两个 stale 动作

- 规划在独立本机标签强制重载 `?view=stale&planning-audit=rev2`。通过项冻结：候选选择与编辑控件禁用、行尾统一“查看”、旧范围只定位、唯一新来源弹窗键盘闭环、控制台 0/0。
- 新鲜 DOM 与交审描述不一致：右侧“忽略”和“保留并下一条”均为 `count=1 / visible=true / enabled=true`。点击“忽略”虽被只读事件守卫拦截、没有产生写入或弹窗，但按钮仍以可执行写动作进入视觉与焦点语境，不能视为“唯一可见未禁用写动作”。
- 任务递增为 Rev 3，只允许移除、禁用或只读替换这两个按钮，并补精确 DOM 状态；其余设计与证据全部冻结。`CURRENT.md` 更新至 v4-205，FIFO 079 `notification_pending`，前端继续 blocked。

## 2026-08-15 — UI-M3-04 Rev 2 来源失效只读门禁完成并交规划

- 只修改仓库外 `m3-screen-text-rev1` 的 stale 状态和 `docs/ui/M3-screen-text-acceptance.md`：加入单一 `staleReadOnly` 权限投影与事件守卫，旧候选、证据、术语命中、历史决定和搜索/筛选/逐集定位继续只读可查；没有重做 Rev 1 页面或修改 DESIGN 语义。
- stale 页只剩“从新来源新建批次”一个可见、未禁用且不在隐藏祖先内的 `data-write-action`。人工新增、取消、候选保留/忽略/恢复、左右拆分、批量决定和保存修改被移除或隐藏；四个候选复选框、当前页全选和五个编辑控件均禁用；旧范围的第 02/06 集只定位并播报，不打开空集或重试弹窗。
- 新鲜真实 DOM：四个行尾动作全部为“查看”，候选状态保持“待确认、待确认、已修改、已忽略”；点击第 06 集后播报“旧草稿只读 · 已定位第 06 集”且可见 dialog=0。唯一恢复弹窗标题/确认为“从新来源新建批次”，初始焦点在关闭，Tab/Shift+Tab 双向闭环，Escape 关闭后焦点恢复原页首主入口。
- 新鲜浏览器标签控制台 `error/warn=0/0`；`node --check app.js` 和授权文档 `git diff --check` 通过。新增 `evidence/10-source-stale-readonly-1440x900.png`，验收记录新增 §11；Rev 1 其余 9 张证据与完整矩阵冻结未重跑。
- `CURRENT.md` 从 v4-202 最小递增为 v4-203；任务转 `review / Current actor/Reviewer=规划对话`，FIFO 077 关闭并登记 FIFO 078 `notification_pending`。生产前后端、迁移、共享 contracts 和 DESIGN 既有语义未改，未通知或解锁前端；下一步只唤醒规划微复验并确认送达。
- v4.3 微复验交接闭环完成：状态已写回 v4-203；唤醒只发送规划固定对话；`read_thread` 确认完整 FIFO 078 / v4-203 / 唯一新来源动作消息已进入规划当前 turn，`wait_threads` 确认规划为 `active / inProgress`。同步版本递增为 v4-204，FIFO 078 关闭；UI 停止修改并等待规划裁决，未通知前端。

## 2026-08-15 — UI-M3-04 Rev 1 规划代理验收集中退审

- 规划按用户本次专属授权，在本轮新启动的本机预览中复验 1440 默认/批量/拆分/失败/来源失效/放大，以及 1024 侧栏 204/72 与读取失败。三栏结构、三范围创建、批量语义、证据 `contain`、失败唯一恢复、弹窗焦点闭环、根页面无横溢和控制台 `error/warn=0/0` 均通过；Impeccable detector 返回 `[]`，但因本机缺 HTML 解析模块仅作降级辅助，不替代真实 DOM/截图。
- 唯一 P1 为来源失效只读门禁：`?view=stale` 的页首与主按钮已正确表达“旧草稿只读 / 从新来源新建批次”，但人工新增、保留、忽略、批量决定和保存修改仍未禁用，真实 DOM 可继续执行旧草稿写操作，违反 `DESIGN.md`、UI 验收记录和 S4 工作流契约。
- 其余 Rev 1 证据全部冻结。任务集中递增为 Rev 2，只修 stale 下全部旧草稿写入口的禁用/移除、只读说明和唯一恢复动作，并补同状态 DOM/键盘/截图证据；不得重做页面、改变业务或修改生产前后端/迁移/contracts。`CURRENT.md` 递增为 v4-201，登记 FIFO 077 `notification_pending`；后端 Rev 1 继续等待规划独立复验，前端继续 blocked。
- v4.3 派发闭环完成：正式唤醒只发送 UI 固定对话；`wait_threads` 确认 UI 明确领取并为 `active / inProgress`。`CURRENT.md` 最小递增为 v4-202，FIFO 077 转 `active`，任务转 `in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`；用户不需要传话。

## 2026-08-15 — BACK-M3-04A Rev 1 画面字权威后端完成并交规划

- 新增 `packages/contracts/src/screen-text.ts` 与迁移 `1754976009000_create_screen_text_workflow.cjs`，PostgreSQL 持有批次、逐集 Job、Attempt、固定素材/术语/Adapter 身份、候选、不可变人工事件、命令幂等、短时播放授权、不可变 Release/Cue/Export；大体积视频和截图不进入数据库，员工 API 不返回对象键、内网地址、Secret 引用或厂商私参。
- 新增 `backend/src/modules/screen-text/`、有界租约 Worker、独立 Worker 入口与 development 接入。Registry 显式登记 `deterministic_fake`、零网络 `cloud_api` stub、零网络 `self_hosted_worker` stub，统一保存 adapter/provider/model/language/deployment、能力快照、输入输出版本、配置与实际输入摘要；三类实现复用同一正式 API→Registry→Worker→PostgreSQL→API 读取链路，没有真实 SDK、网络、密钥、付费或服务器。
- 权威行为包括 active/最新清单/已校验 `screen_video`/不可变 TermVersion 门禁，整剧/选中集/单集与范围冲突，术语投影及候选命中证据，抽帧/去重同构统计与 Usage，租约接管、取消结果落账、失败和零候选子集重试、未知结果需对账，条件版本/幂等保留/驳回/恢复/编辑/左右拆分/人工新增、来源 stale 零副作用、明确空集、人名条身份不臆造、单事务不可变 Release 和确定性 UTF-8 BOM SRT；同时提供 10 分钟只读视频授权和匿名截图证据读取。
- 新鲜验证：第二个精确隔离空库从零应用 22 个迁移后 `tests/backend/screen-text.test.ts` 6/6；同代码在隔离库运行 screen-text/terms/asr/pre-review 四文件 36/36；共享 contracts 构建、后端 TypeScript/lint 与生产构建、`check:repo`、`git diff --check` 全部通过。完整 `pnpm check` 按停止边界留 S4 关闭门。两个专用隔离库均已删除，默认 PostgreSQL `127.0.0.1:55432` 继续 accepting connections；未停止用户既有前后端服务。
- 状态已写回：`CURRENT.md` 从 v4-198 最小递增为 v4-199，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO 076 登记 `notification_pending`。未修改生产前端或 `DESIGN.md`，未提交、推送或部署；下一步只唤醒规划总线并确认送达，不直接通知或解锁前端。
- v4.3 交接闭环完成：状态已写回 v4-199；唤醒已只发送规划固定对话；规划明确回执 FIFO 076 已收到，目标任务为 `active / inProgress`，并说明按 FIFO 先完成 UI-M3-04 代理验收、随后独立复验后端。同步版本递增为 v4-200，FIFO 076 关闭；后端停止修改，不通知前端、不自行解锁，用户无需传话。

## 2026-08-15 — UI-M3-04 正式画面字工作台设计交付规划代理验收

- 在既有 AppShell、204→72 侧栏和紧凑表格体系内完成唯一成熟方向：左侧集/批次队列，中间候选表，右侧同源截图/视频证据与编辑；没有复制外部网站、另造视觉体系或混入上传、任务中心、字幕验收和管理员配置。
- `DESIGN.md` 新增 5.5A，固定双门禁、三范围创建、11 类逐集状态、四类候选决定、证据/术语回执、当前页与显式跨页选择、保留/忽略/恢复/编辑/人工新增、左右拆分、人名条、时间、明确空集、失败重试、取消/需对账、来源失效、发布门禁和不可变画面字 SRT。
- 新增 `docs/ui/M3-screen-text-acceptance.md`，记录完整状态/异步/键盘矩阵、生产停止边界和 9 张匿名证据。仓库外可操作原型位于 `m3-screen-text-rev1`；1440 默认/批量/拆分/失败/失效/放大及 1024 侧栏 204/72/读取失败已取证，1024 根页面 `scrollWidth=clientWidth=1009`，表格只在容器内横滚，控制台 `error/warn=0/0`。
- 真实 DOM 键盘定向复验：失败重试弹窗末项 `Tab` 回首项、首项 `Shift+Tab` 回末项，两态 `dialog.contains(activeElement)=true`；`Escape` 关闭后恢复第 06 集触发项。证据放大关闭也恢复原“放大”。
- `node --check` 与授权文档 `git diff --check` 通过。Impeccable detector 在 HTML 解析依赖不可用的降级正则模式下只报告一项 `border-accent-on-rounded`；人工核对命中的是模块导航 `border-bottom:3px` 活动态下划线，不是圆角卡片描边，不构成修正。无子代理授权，按 Impeccable 降级终审说明在同线程独立复核，结论 `disposition: ship`、P0/P1=0。
- `CURRENT.md` 从 v4-196 最小递增为 v4-197；任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 075 `notification_pending`。本轮未修改生产前端、后端、迁移或共享契约，未接真实 OCR/API、供应商、模型、密钥、付费、服务器或管理员页面，未自行解锁前端。
- v4.3 交接闭环完成：状态已写回 v4-197；唤醒已只发送规划固定对话；`read_thread` 确认完整 FIFO 075 消息出现在规划最新 turn，`wait_threads` 确认规划为 `active / inProgress`。同步版本递增为 v4-198，FIFO 075 关闭；UI 停止修改并等待规划代理裁决，未通知前端。

## 2026-08-15 — UI-M3-04 单次代理验收与 OCR 双类 Adapter 预埋补充

- 用户明确这一次画面字 UI 的交互预览由规划全权代理，自己休息，不再逐张确认；该授权只适用于 `UI-M3-04`，不自动扩展到后续字幕验收、交付或管理员网站。
- 规划采用现有 AppShell/项目工作台为视觉权威，只参考成熟生产后台的信息层级、筛选、状态、证据预览和批量操作；使用 Impeccable 的 Operate 模式做一次完整审查、最多一次集中修正和最终裁决，不重新设计品牌体系，不降低 UI→前端同状态高保真门。
- 用户同时要求预埋云 OCR 厂商与本地引擎接口。`M3-screen-text-workflow.md` 和 `BACK-M3-04A` 验收补充为：Adapter Registry 显式区分 `cloud_api`、`self_hosted_worker`、`deterministic_fake`，保存 deployment/能力快照，并用零网络云 API stub、本地 Worker stub 和 fake 通过同一正式链路。该要求只固定未来接入边界，不授权真实网络、SDK、密钥、付费或服务器。
- UI 领取与规划增量授权发生并行写回，UI 基于旧 Reviewer 字段把任务写成“用户验收”。规划没有覆盖其 `in_progress` 事实，只在 `CURRENT.md` v4-196 最小合并 Reviewer=规划、单次代理授权和双类 Adapter 验收；UI、后端增量消息均已送达且保持 `active / inProgress`，用户不需要传话。

## 2026-08-15 — UI 领取 UI-M3-04 Rev 1 画面字 OCR 工作台设计

- 完整重读项目协议 v4.3、最新 `CURRENT.md`、画面字工作流契约、职责矩阵画面字行、本地等价矩阵画面字行和开发日志顶部；确认本轮与 `BACK-M3-04A` 目录互不重叠并行，正式前端继续 blocked。
- 设计范围只含项目工作台“画面字”：三种识别范围、逐集状态、候选/证据/术语回执、人工决定与编辑、批量选择、左右双轴、人名条、明确空集、失败恢复和不可变版本发布门禁；使用现有 AppShell、204→72 侧栏与高密度紧凑表格语言。
- `CURRENT.md` 从 v4-194 最小递增为 v4-195，任务转 `in_progress / Current actor=UI 设计对话`。交付限于 `DESIGN.md`、`docs/ui/` 和仓库外匿名原型/截图；不修改生产前后端、迁移或共享契约，不接真实 OCR/API，不扩展任务中心、字幕验收、人物风险、服务器或管理员页面。

## 2026-08-15 — 后端领取 BACK-M3-04A Rev 1 画面字权威闭环

- 完整重读项目协议 v4.3、最新 `CURRENT.md` v4-193、`M3-screen-text-workflow.md`、职责矩阵画面字行、`LOCAL_APP_PARITY.md` 画面字等价行和开发日志顶部；确认规划已完成 S4 派发送达闭环，UI 与后端允许目录互不重叠并行，正式前端继续 blocked。
- 本轮只在后端所有权内交付共享 `screen-text` 契约、增量迁移、`backend/src/modules/screen-text/`、有界租约 Worker、Adapter Registry、零网络 deterministic fake 和后端测试；PostgreSQL 是批次、逐集、Attempt、候选、人工事件、草稿与不可变 Release/SRT 的唯一权威。
- 验收固定为术语版本 + `screen_video` Asset 双门禁、术语投影证据、抽帧/去重同构统计、租约接管、取消、失败集重试、未知结果需对账、人工决定不被重跑覆盖、来源 stale、明确空集、左右双轴、人名条不臆造、事务发布和确定性 SRT。
- `CURRENT.md` 从 v4-193 最小递增为 v4-194；任务转 `in_progress / Current actor=后端开发对话`。不修改生产前端或 `DESIGN.md`，不接真实 SDK/网络/密钥/付费/R2，不实现任务中心、字幕验收、风险/人脸、管理员 API 或服务器；完整 `pnpm check` 留 S4 关闭门，不提交、推送或部署。

## 2026-08-15 — PLAN-M3-04 画面字 OCR 方案确认并进入 S4

- 用户确认不直接进入原 S4 单剧整体验收，而是先实现画面字 OCR；后续顺序调整为 S4 画面字、S5 视频字幕验收、S6 单剧全流程联调、S7 交付产品库。
- 规划只读核对 `LOCAL_APP_PARITY.md`、职责矩阵以及本地 `short-drama-terms-workbench` 的画面字源码与回归，确认必须继承候选截图/视频时间、分类/位置/状态、术语提示、保留/忽略/修改、入出场精修、左右双轴、人名条证据、失败/空结果重试和按集画面字 SRT；不照搬桌面 Python 路径、引擎设置窗口或输出文件夹。
- 新增 `docs/contracts/M3-screen-text-workflow.md`，固定术语版本 + `screen_video` Asset 双门禁、三种识别范围、供应商中立 Adapter、抽帧/变化筛选/相似帧去重、可验证术语回执、PostgreSQL 权威状态、人工事件、明确空集、失败/取消/需对账、不可变 Release 与确定性 SRT。
- 同步更新 M3 里程碑、职责矩阵、本地等价矩阵、项目 `AGENTS.md` 和 `CURRENT.md` v4-192。`PLAN-M3-04` 标记 done；`UI-M3-04` 与 `BACK-M3-04A` 进入 ready，允许文件互不重叠的受控并行；`FRONT-M3-04B` 等待 UI 用户验收和后端规划验收。
- 未修改生产前端/后端、迁移或共享代码契约，未接真实 OCR 厂商、网络、SDK、密钥、付费、服务器、云资源、任务中心、字幕验收或交付；未提交、推送或部署。
- 状态已写回：规划任务、两个执行任务和停止边界已进入 `CURRENT.md` v4-192。唤醒已发送：只向 UI 固定对话与后端固定对话发送正式任务包，未通知前端。送达/运行态已确认：`wait_threads` 显示 UI 与后端均为 `active / inProgress`；同步版本递增为 v4-193，前端继续 blocked，用户无需传话。

## 2026-08-15 — S3 前置审改通过完整质量门并正式关闭

- 规划接受 `FRONT-M3-03B` Rev 3 UI 微复验：无活动模态层时媒体错误摘要继续获焦；全轴定位导致原按钮卸载时，焦点回到仍打开的抽屉容器，真实 Tab/Shift+Tab 保持在 dialog，Escape 关闭后回原触发点。P0/P1=0，Rev 2 完整 UI 矩阵和高保真证据冻结通过。
- 规划运行本轮新鲜完整 `pnpm check`，耗时 106.5 秒，退出码 0：仓库边界检查通过，全部 lint/TypeScript 通过，数据库迁移无待执行项，18 个测试文件 157 项全部通过，共享契约、后端和前端生产构建全部通过，前端为 160 modules。
- `CURRENT.md` 更新为 v4-190；`FRONT-M3-03B` Rev 3 标记 `done / Current actor=—`。`UI-M3-03`、`BACK-M3-03A`、`FRONT-M3-03B` 全部关闭，S3 前置审改模块正式完成。没有提交、推送、部署、付费调用、购买或云资源变更。
- 为方便用户醒来直接验收，当前统一预览 `http://127.0.0.1:3010/projects`、本地后端 3001 和 PostgreSQL 55432 保持运行；S4 单剧全流程验收尚未自动启动，字幕验收、OCR 和交付产品库仍为后续独立模块。
- 关闭后运行状态复核：统一预览 `/projects` 返回 HTTP 200；后端实际健康路由 `/health` 返回 HTTP 200，响应为 `status=ok / database=connected`。首次误用不存在的 `/api/health` 得到预期 404，未计为健康证据，随后已用权威路由重新验证。同步版本递增为 v4-191。

## 2026-08-15 — UI 通过 FRONT-M3-03B Rev 3 两场景焦点微复验

- 正式 React 无模态层场景：页面稳定后 `dialogCount=0`，媒体错误 `role=alert` 为真实 `activeElement`；“当前编码不受浏览器支持 / 需要后续兼容代理；当前视频证据已停止播放，不能据此继续看片判断”原阻断事实与文案不变。
- 正式 React 活动全轴场景：打开后初始 `activeElement=关闭本集全轴 / dialog.contains=true`；点击第三行“定位”后当前条目与媒体事实更新，原定位节点随刷新卸载，焦点确定落到抽屉可编程 `ASIDE`。此时 `dialogCount=1 / dialog.contains(activeElement)=true`，后台媒体 alert 仍显示但未获焦，定位成功播报为“已定位仅公司轴，视频将同步到当前轴”。
- 真实键盘补证：回退容器获得焦点后 Tab 与 Shift+Tab 均未离开 dialog，Shift+Tab 到达抽屉内“定位”；Escape 关闭抽屉后焦点恢复“本集全轴”。最终页面控制台 `error/warn=0/0`。
- 两个变化场景通过，P0/P1=0。Rev 2 同状态高保真、真实差异、五组 P1、视觉、1440/1024 和其他矩阵全部冻结；本轮未新增截图集、未修改生产代码、未运行完整 `pnpm check`。临时 3000 与两份精确日志已清理，既有 3001/55432 保持运行。`CURRENT.md` 从 v4-187 最小递增为 v4-188，任务保持 Rev 3 `review` 并转 `Current actor/Reviewer=规划对话`，FIFO 074 转 `notification_pending`；下一步只正式唤醒规划总线并确认送达。
- 唤醒已发送：正式通过结论只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，没有直接通知前端。
- 送达/运行态已确认：`read_thread` 显示完整微复验结论位于规划当前 turn；`wait_threads` 显示规划 `active / inProgress`。`CURRENT.md` 最小递增为 v4-189，FIFO 074 关闭；UI 停止操作并等待规划运行完整关闭门。

## 2026-08-14 — UI 领取 FRONT-M3-03B Rev 3 焦点微复验

- UI 重读 `CURRENT.md` v4-186、正式 UI 验收 §10、开发日志顶部和两个授权变更文件，确认规划已通过差异审核与专项 12/12；生产只调整活动 `aria-modal=true` 的焦点所有权，测试只覆盖定位项保留、节点卸载回抽屉容器和无模态层媒体错误获焦。
- 本轮只在正式 React 复验“全轴定位触发媒体错误”和“无活动模态层媒体错误”两条变化路径，记录真实 `activeElement`、`dialog.contains(activeElement)`、错误摘要与阻断文案；其余 Rev 2 完整矩阵冻结。不得改生产代码、重跑完整矩阵、增加截图集或运行完整 `pnpm check`。

## 2026-08-14 — 规划通过 FRONT-M3-03B Rev 3 微返工并路由 UI 定向复验

- 规划只核对两个授权文件：生产逻辑在媒体错误 effect 中识别活动 `aria-modal=true`，定位按钮仍在模态层内时不移动焦点，触发节点卸载时聚焦抽屉容器，无活动模态层时继续聚焦 `role=alert`；测试分别覆盖三条分支。未发现 CSS、文案、业务状态、API 或其他目录扩张。
- 规划新鲜复跑 `tests/frontend/PreReviewWorkspace.test.tsx` 为 12/12，两个授权文件 `git diff --check` 通过。前端已完成的 TypeScript、160 modules 构建和 Impeccable `[]` 作为同一代码版本证据保留；完整 `pnpm check` 继续留 UI 微复验后的关闭门。
- `CURRENT.md` 更新为 v4-186：任务保持 Rev 3 `review`，转 `Current actor/Reviewer=UI 设计对话`。UI 只复验“定位后焦点仍在抽屉”和“无模态层错误继续获焦”，Rev 2 其他完整矩阵与视觉证据全部冻结；FIFO 074 等待正式 UI 唤醒与送达确认。

## 2026-08-14 — FRONT-M3-03B Rev 3 焦点所有权微返工完成并交规划

- 生产修正仅在 `VideoEvidence` 媒体错误 `useLayoutEffect`：错误形成后先读取当前 DOM 的 `aria-modal=true` 模态层；现有焦点仍位于活动模态层时不移动，定位节点因刷新卸载而焦点脱落时聚焦模态容器，没有活动模态层时继续聚焦既有媒体错误摘要。媒体错误仍保留 `role=alert`、原阻断文案和不可播放事实。
- 对应回归覆盖三条边界：全轴“定位”按钮仍存在时媒体错误不抢焦点且 `dialog.contains(activeElement)=true`；按钮因全轴翻页加载卸载时焦点确定回到可编程抽屉容器；无模态层的媒体 error 与 play rejection 仍自动聚焦错误摘要。未修改 CSS、视觉、业务状态、媒体文案、API 或其他前置审改行为。
- 新鲜验证通过：`pnpm exec vitest run tests/frontend/PreReviewWorkspace.test.tsx --reporter=dot` 为 1 文件 12/12；前端 TypeScript 通过；Vite 8.2.1 生产构建 160 modules；Impeccable 定向检测 `[]`；`git diff --check` 退出码 0，仅有既有文档 CRLF 提示。按微返工边界未运行完整 `pnpm check`，未重做 1440/1024 浏览器矩阵。
- 状态已写回：`CURRENT.md` v4-184，任务保持 Rev 3 并转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 074 `notification_pending`。下一步只正式唤醒规划固定对话并确认送达/运行态，不直接通知 UI；未提交、推送或部署。
- 唤醒已发送：FIFO 074 正式交审只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，发送接口一次成功；未绕过规划通知 UI、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 074 完整交审消息位于规划当前 turn，规划任务为 `inProgress`；规划同一 turn 已明确观察到前端领取与执行，FIFO 073 派发事件同步关闭。`CURRENT.md` 最小递增至 v4-185，FIFO 074 转 `active`；前端停止修改并等待规划审核。

## 2026-08-14 — 前端领取 FRONT-M3-03B Rev 3 焦点所有权微返工

- 已重读协议 v4.3、`CURRENT.md` v4-182、UI 终验 §10 与开发日志顶部，确认 Rev 2 其他同状态高保真、真实差异、五组 P1、1440/1024、控制台和业务交互全部冻结；本轮只处理媒体错误与活动全轴模态层的焦点所有权冲突。
- 第一项预检锁定 `VideoEvidence` 的媒体错误 `useLayoutEffect`、全轴“定位”按钮和抽屉安全焦点的 DOM 挂载时序：媒体错误仍须渲染并由 `role=alert` 播报，但活动 `aria-modal=true` 存在时不得把焦点移出该模态层；定位节点卸载时才回抽屉内关闭按钮或可编程容器。
- 状态写回 `CURRENT.md` v4-183：任务保持 Rev 3，转 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`；FIFO 073 记录前端已收到并执行，等待规划完成发送方的 `read_thread`/`wait_threads` 送达确认。只修改指定生产/测试两文件，不改 CSS、视觉、文案、业务状态、接口或其他模块。

## 2026-08-14 — UI 终验唯一焦点 P1 进入 FRONT-M3-03B Rev 3 微返工

- UI 一次性完整矩阵结论为 P0/P1/P2/P3=`0/1/0/0`。唯一失败可稳定复现：全轴抽屉打开且定位成功后仍保留 `dialogCount=1`，但媒体错误 `role=alert` 把焦点从抽屉抢到遮罩后，`dialog.contains(activeElement)=false`。同状态高保真、真实差异、五组 P1、1440/1024、控制台及其他交互均通过或冻结。
- 规划代码核对确认根因为 `VideoEvidence` 中 `useLayoutEffect(() => { if (mediaError) mediaErrorRef.current?.focus(); }, [mediaError])` 无条件聚焦，没有尊重活动 `aria-modal=true` 的模态层焦点所有权。该问题不需要改后端、共享契约、业务状态、视觉或媒体阻断事实。
- 按 v4.3 微返工快车道，任务递增为 Rev 3，只允许修改 `PreReviewPanels.tsx` 与 `PreReviewWorkspace.test.tsx`：活动模态层存在时媒体错误仍显示但不得把焦点移出模态层；定位按钮仍存在时保持其焦点，否则回抽屉安全焦点；无模态层时媒体错误继续正常获焦。只跑专项、TypeScript、必要构建和差异检查，不重做完整 UI 矩阵或全量截图，不运行完整 `pnpm check`。
- 状态写回 `CURRENT.md` v4-182：Rev 3 为 `ready / Current actor=前端开发对话 / Reviewer=规划对话`，登记 FIFO 073 `notification_pending`。正式唤醒与送达确认后再关闭该交接事件。

## 2026-08-14 — UI 完成 FRONT-M3-03B Rev 2 正式终验并退回唯一焦点 P1

- Product Design Audit 本轮先采集并人工检查正式 React 的 1440×900、1024×768 侧栏 204/72、全轴抽屉和全局脏态新鲜截图，并将 1440 正式页与 UI Rev 4 权威参考放在同一比较输入中复核。1440 根宽 `1430/1430`、三栏 `196/640/310px`；1024 两态均为 `1014/1014`；中缝 `textContent="" / aria-hidden=true`，控制台 `error/warn=0/0`。真实 1 集、媒体不兼容、AI/风险无投影均按权威事实呈现，没有伪造参考数据。
- 五组 P1 与冻结矩阵中，问题状态切换时旧问题操作立即卸载、全局 AppShell 脏态门禁及放弃后单次原导航、未知/409 意图分流、媒体窗口/旧视频事实清理和中缝空 DOM 均通过正式交互或规划 11/11 + 本轮源码交叉证据；Rev 4 未变化的 limited/stale、六类决定、格式/长句、失败恢复、提交、完成/release 和真键盘顺序继续冻结引用。
- 唯一新 P1 可稳定复现：全轴打开时初始焦点为“关闭本集全轴”且在 dialog 内；点击“定位”后抽屉仍打开、主工作区定位反馈已更新，但不兼容媒体的 `useLayoutEffect` 把焦点移到遮罩后 `role=alert`，`dialog.contains(activeElement)=false`。这破坏模态层键盘语境。最小修正只需在全轴仍打开时禁止媒体错误抢焦点，并保持定位项或关闭按钮焦点，不改媒体阻断事实、业务数据或视觉。
- 完整 P0–P3 为 `0/1/0/0`，正式结论不通过。验收文档已追加本轮矩阵和 6 张仓库外证据；本轮临时 3000 和两份精确临时日志已清理，既有 3001/55432 保持运行。`CURRENT.md` 从 v4-179 最小递增为 v4-180，任务保持 Rev 2 `review` 并转 `Current actor/Reviewer=规划对话`，FIFO 072 登记 `notification_pending`。未修改生产前后端、迁移、共享契约或 DESIGN，未运行完整 `pnpm check`，未提交、推送或部署；下一步只正式唤醒规划总线并确认送达。
- 唤醒已发送：FIFO 072 正式退审只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，没有绕过规划通知前端。
- 送达/运行态已确认：`read_thread` 显示完整退审消息位于规划当前 turn；`wait_threads` 显示规划为 `active / inProgress`，且规划已明确回执“作为微返工只修焦点所有权，不重做页面或完整矩阵”。`CURRENT.md` 最小递增为 v4-181，FIFO 072 关闭；UI 停止操作，等待规划统一路由。

## 2026-08-14 — UI 领取 FRONT-M3-03B Rev 2 正式终验

- UI 设计对话重读协议 v4.3、`CURRENT.md` v4-178、UI Rev 4 权威参考、前置审改 DESIGN/UI 验收、共享契约、本地等价矩阵与开发日志顶部，确认规划映射审核已经通过且唯一当前动作是正式 React 领域终验。
- 本轮按 Product Design Audit 先采集并检查本轮 1440×900、1024×768 侧栏 204/72 的真实截图，再按 Impeccable 核对同状态结构/层级/比例/密度、五组 P1、键盘焦点、滚动与控制台；真实 1 集、媒体不兼容、AI/风险无投影作为权威有意差异保留。
- 停止边界不变：不修改生产前端、后端、迁移、共享契约或 DESIGN，不重跑规划已通过的专项/TypeScript/160 模块构建，不运行完整 `pnpm check`。结论完成后只写回规划总线并确认送达，不直接通知前端或自行标记 `done`。

## 2026-08-14 — 规划通过 FRONT-M3-03B Rev 2 映射审核并路由 UI

- 规划按协议 v4.3 审核“权威 UI → 正式 React → 证据”映射：人工对照 UI Rev 4 的 1440 权威参考与前端交付的 1440、1024 侧栏 204/72 三张新证据，首屏项目上下文、四项摘要、本地规则/AI 同构状态、集/问题双视图、关系带、A/B 双来源、无文字双色中缝、唯一最终稿、视频证据元数据和底部上一条/下一条/完成门禁均已恢复。
- 三项有意差异接受为真实事实而非视觉缺陷：匿名项目仅 1 集；真实媒体编码不受浏览器支持，按同尺寸阻断呈现；AI/风险无后端投影，显示未启用/暂无权威数据。未发现用假数据、前端推算或静态结果冒充权威事实。
- 规划代码扫描确认跨集/筛选/页码旧数据身份、确定性 409 与网络未知分流、全局 SPA/`beforeunload` 脏态门禁、`formatOverrideReason`、媒体 error/play rejection、空中缝 DOM 和上一条/下一条实现；新鲜复跑前置审改专项 11/11、前端实际 `pnpm --dir frontend typecheck` 与 `pnpm --dir frontend build`（160 modules）通过，`git diff --check` 无错误。首次误用不存在的 `@qimao/frontend` 筛选时明确返回“无匹配项目”，未计为证据，随后已用真实脚本重跑。
- 状态写回 `CURRENT.md` v4-177：任务保持 Rev 2 `review`，转 `Current actor/Reviewer=UI 设计对话`；UI 只做正式 React 同状态高保真、交互/键盘和真实状态矩阵终验，不修改生产代码、不跑完整 `pnpm check`。正式 UI 唤醒与送达确认完成后再关闭 FIFO 071。
- 唤醒已发送：规划只向 UI 固定对话发送正式终验包，没有通知前端重复动作。送达/运行态已确认：`wait_threads` 显示 UI 为 `active / inProgress` 并明确回执已领取，将按 Product Design Audit 与 Impeccable 对照正式 React/Rev 4；同步版本递增为 v4-178，FIFO 071 关闭。

## 2026-08-14 — FRONT-M3-03B Rev 2 五组 P1 与 UI Rev 4 高保真门完成并交规划

- 数据身份与恢复语义已按权威契约收口：主问题查询和本集全轴不再保留可交互旧响应，切集/筛选/翻页到新身份稳定前没有旧 selectedItem、定位或写命令；只有网络未知和 `retryable=true` 保留同请求体/幂等键，确定性 `409 / retryable=false` 清旧意图并刷新会话/列表/集状态，下一次用户显式动作使用新 revision/version 与新键，不自动重发。
- 离开与媒体根因已关闭：手动编辑时通过文档捕获覆盖 AppShell 全局 SPA 链接并保留 `beforeunload`，放弃后原导航只执行一次；长句理由模式保存沿用当前决定并提交 `formatOverrideReason`。主/放大视频处理媒体 error 和 `play()` rejection，显示“当前编码不受浏览器支持，需要后续兼容代理”，换条目清理旧画幅、播放和时间事实；视频名称、证据窗口、授权到期、真实 Asset 和编辑边界均来自正式响应/浏览器事实。
- UI Rev 4 同状态复原同轮完成：前置审改路由不再显示重复独立顶栏；首屏依次为项目上下文、公司稿/中文识别/术语/会话摘要、本地确定性规则与 AI 未启用层、三栏工作台和粘性逐条/逐集导航。左栏恢复集列表/问题列表切换及紧凑筛选；中栏恢复关系带、来源 A/B、无文字双色中缝和下游第三层唯一最终稿；右栏保留 172px 正常媒体位或同尺寸真实阻断、控制组和证据元数据；底部恢复上一条/下一条、剩余数量、格式阻断与唯一完成动作。
- 正式浏览器使用真实匿名项目 `42067015-0605-4c40-8997-cf98923cff91`：1440×900 根宽 `1430/1430`，项目上下文/摘要/规则/工作台分别从 y=24/88/177/233 开始，三栏为 `196/640/310px`，中缝 `textContent="" / aria-hidden=true`；1024×768 展开 204px 与收起 72px 两态均为根宽 `1014/1014`、水平范围 0，工作台为 `196+546` 与 `196+678`，证据区按验收下置。问题列表真实切换后筛选/搜索可见，控制台 `error/warn=0/0`。
- 三张仓库外证据保存于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\13\019ff92b-c7a6-7693-846b-fe5b3bfea3bf\front-m3-03b-rev2\`：`front-m3-03b-rev2-1440x900.png`、`front-m3-03b-rev2-1024x768-sidebar-204.png`、`front-m3-03b-rev2-1024x768-sidebar-72.png`。与 UI Rev 4 的有意差异只有权威真实事实：当前 1 集而非原型 30 集；真实 MP4 编码不受浏览器支持而显示兼容代理阻断；AI/风险无后端投影而显示未启用/暂无权威数据。没有伪造视频、数量、成功或风险命中。
- 本轮新鲜验证：前置审改专项 11/11；全部前端 8 文件 73/73；前端 TypeScript 通过；Vite 160 modules 生产构建通过；`git diff --check` 通过，仅有既有文档 CRLF 提示。最终 Impeccable 定向检测只复现 UI Rev 4 验收已明确接受的两条来源顶部 3px 内嵌身份线 `side-tab` 警告，真实截图确认其为 A/B 来源辨识且不是侧边装饰卡片，未改已确认视觉。完整 `pnpm check` 按停止边界留正式 UI 终验关闭门。
- 状态已写回：`CURRENT.md` 从 v4-174 最小递增为 v4-175，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO 071 登记 `notification_pending`。未修改后端、迁移、共享契约、`DESIGN.md` 或本地等价矩阵；未提交、推送或部署。本轮临时 Vite 3000 已停止并确认无监听，既有后端 3001 与 PostgreSQL 55432 保持运行。下一步只正式唤醒规划总线并确认送达/运行态，不直接通知 UI。
- 唤醒已发送：正式交审只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，发送接口一次成功；未直接通知 UI、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 071 完整交审消息位于规划最新 turn；`wait_threads` 显示规划为 `active / inProgress`，并明确回执正在核对代码范围、状态映射和三张同视口证据，通过后由规划直接唤醒 UI。`CURRENT.md` 最小递增为 v4-176，FIFO 071 转 `active`；前端停止修改并等待规划统一路由。

## 2026-08-14 — UI→前端一致性升级为长期硬门（协议 v4.3）

- 用户确认以后所有已验收 UI 都必须由正式前端保持一致，不能只在当前前置审改页面临时要求。规划据此更新项目级 `AGENTS.md` 与 `docs/WORKFLOW.md`：UI 关闭后，`DESIGN.md`、UI 验收记录和指定最终原型/截图共同成为权威输入；前端未经裁决不得自行简化、重排或重新设计。
- 前端首次交审新增必备证据：正式 React 与权威 UI 的同状态、同视口对照，必要的 DOM/几何/滚动/焦点测量，以及全部有意差异及来源。功能测试、TypeScript、构建或单张截图不能替代一致性验收；明显结构和视觉偏差不得进入 `done`。
- 同时保留真实事实优先：真实集数、媒体可用性、AI/风险启用状态和后端结果不得为了贴近示例图而伪造。确有契约或运行限制时，前端须按专业异议流程交规划裁决。该规则自 `FRONT-M3-03B` Rev 2 起立即执行，后续所有 UI→前端任务长期适用。
- 规划统筹责任同步固化：规划在解锁前端前负责形成权威参考、页面/状态、视口、真实字段映射、允许差异、目录边界和 Reviewer 完整交接包；前端交付后先做映射完整性审计，再由 UI 验收正式 React。双方差异统一回规划裁决，用户不承担传话。
- 状态已写回：协议 v4.3、CURRENT v4-174、前置审改高保真门和本日志已更新。唤醒已发送：FIFO 070 仅正式通知前端固定对话。送达/运行态已确认：`wait_threads` 显示前端为 `active / inProgress`，并明确回执已重读 v4.3、将一致性收口并入同一 Rev 2；FIFO 070 已关闭。

本文件只记录已发生并有证据的项目变更。计划和建议不得写成完成事实。

## 2026-08-14 — 用户指出正式 React 未充分复原 UI，规划追加同状态高保真门

- 规划按用户异议重新以 `1440×900` 打开当前 React，并与 UI Rev 4 权威参考 `20-default-compact-1440x900.png` 同视图人工比较；当前 React 截图保存于仓库外 `front-m3-03b-current-1440x900.png`。当前页面已在 Rev 2 热更新中移除旧 `⇄`，根页面 `1430/1430` 无横溢，Impeccable 单次检测为 `[]`；这些结果不代表视觉复原已经通过。
- 差异确认：当前生产页额外独立顶栏削弱首屏密度；来源摘要缺少中文识别与确定性规则/AI 同构状态层；左栏没有参考的集/问题双视图层级；当前关系带、双来源和唯一最终稿的色块、间距、比例明显弱化；视频控制/证据元数据与底部上一条/下一条导航不完整。部分数据差异来自真实项目只有 1 集、AI/风险无后端投影、媒体编码不受支持，这些必须保留真实状态，但不能据此删除已确认结构或伪造参考数据。
- 用户要求已纳入仍在执行的 `FRONT-M3-03B` Rev 2，不另拆第三轮：功能正确性修正后，同轮按 `docs/ui/M3-pre-edit-acceptance.md` 新增高保真门复原首屏结构、摘要/规则层、队列、关系带、双来源、唯一最终稿、视频证据和底部导航；1440/1024 都需同视口对比。任务不改后端、迁移、共享契约或 DESIGN，不伪造 30 集、AI 数量、风险或正常视频。
- `CURRENT.md` 更新至 v4-172，FIFO 070 登记 `notification_pending`；下一步只补充通知正在执行的前端固定对话并确认送达，不通知 UI 重新设计。

## 2026-08-14 — 规划独立审核 FRONT-M3-03B Rev 1 并退回 Rev 2

- 规划按 v4.2 重读权威前置审改契约、DESIGN 5.7、UI Rev 4 验收、生产前端、共享/后端错误语义和本地等价矩阵；新鲜复跑 `tests/frontend/PreReviewWorkspace.test.tsx` 7/7、全部前端 8 文件 69/69、前端 TypeScript、Vite 160 模块构建、Impeccable 定向检测 `[]` 与 `git diff --check`，全部通过。通过项只证明既有测试、构建、基础布局和已覆盖交互成立，不覆盖本轮新增根因。
- 正式浏览器重新打开匿名项目 `42067015-0605-4c40-8997-cf98923cff91`：生产页面能读取真实 PostgreSQL/Fastify 状态并显示三栏工作台、双来源、唯一最终稿、视频证据与 AI/风险“未启用”；当前截图保存于仓库外 `front-m3-03b-rev1-planning-audit.png`。同时真实复现“手动修改→输入未保存文本→点击全局侧栏项目中心”直接导航到 `/projects`，页面没有任何脏态提示；DOM 还确认双来源中缝可见 `⇄`，媒体元素不存在 error/abort 处理与兼容代理说明。
- 数据身份 P1：`items` 查询把集数、状态、搜索、页码放入 query key，却使用 `keepPreviousData`；切集时只清选择，不阻断旧响应，旧行仍渲染且 `commandPending=false`，effect 还会把旧集首行重新设为当前选择。因此新集请求未完成时可以对旧集条目发决定命令。`FullAxisDrawer` 的翻页读取同样保留旧页且定位按钮可用，纳入同一根因修正。
- 命令恢复 P1：`create/prepare/decision/undo/policy/complete/release` 的意图只在成功后清理，所有错误都呈现“重试同一意图”。后端 `preReviewConflict` 固定 `409 / retryable=false / reload_pre_edit`，但前端测试把真实确定性版本冲突写成第二次同键成功，掩盖了旧 expectedVersion/expectedRevision 无法靠同请求重放恢复的事实。Rev 2 必须只对网络未知或 `retryable=true` 保留原 body/key；确定性错误清意图、重读权威状态，不自动重提，下一次用户显式动作使用新版本与新键。
- 离开与媒体 P1：当前脏态只拦页面内部项目链接、切集和切问题；AppShell 全局导航不受控，真实 SPA 跳转绕过 `beforeunload`。理由模式行内“保存修改”又固定提交 `custom_text` 且不带 `formatOverrideReason`。视频虽然 `contain` 与放大成立，但没有 `onError`/播放 Promise rejection 处理，违反“不支持编码时明确阻断并提示兼容代理需求”；同时补视频可访问名称、换条目时旧元数据清理。冻结视觉 P1：CSS `sourceBlend::before { content: "⇄" }` 与用户已确认的“中缝无文字、无数字、无符号，只保留双色过渡”直接冲突。
- 规划把以上问题合并为唯一 Rev 2，不拆成多个往返；Rev 1 其他通过项冻结。`CURRENT.md` 更新至 v4-170，FIFO 068 关闭，FIFO 069 登记 `notification_pending`，任务转 `ready / Current actor=前端开发对话 / Reviewer=规划对话`。允许修改前置审改生产模块、必要应用壳脏态协作点及对应测试；不改后端、迁移、共享契约、DESIGN，不扩展 OCR、字幕验收、交付、真实 AI/风险或转码。规划本轮启动的 3000 预览已停止，既有 3001/55432 保持运行。
- 唤醒已发送：规划只向前端固定对话 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf` 发送 FIFO 069 完整退审，发送接口一次成功，未通知 UI、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 已看到完整 FIFO 069 位于前端最新 turn；`wait_threads` 显示前端为 `active / inProgress`，并明确回执从列表查询身份、命令幂等意图与全局导航状态转换预检开始。`CURRENT.md` 最小递增为 v4-171，FIFO 069 关闭，任务转 `in_progress / Current actor=前端开发对话`；规划停止并发修改生产前端。

## 2026-08-14 — FRONT-M3-03B Rev 1 正式前置审改工作台完成并交规划

- 新增 `frontend/src/features/pre-review/` 正式模块，并接入应用路由、侧栏模块注册和页面标题；只消费现有共享 `pre-review` 类型与 Fastify/PostgreSQL 权威 API，覆盖项目/来源/术语/会话门禁、集与问题服务端分页队列、公司稿/ASR 只读对照、组合轴唯一最终稿、六类决定、文本基准范围预览/应用、撤销/脏态、格式与至少 8 字长句理由、逐集完成、不可变 release/SRT 下载、来源变化/limited、按条目视频授权和本集全轴只读分页定位。
- 三画幅视频统一使用真实授权媒体与浏览器 `loadedmetadata`，默认紧凑播放器和按需放大均为 `object-fit: contain`；全轴只读表格保留 980px 最小宽度并只在自身容器横滚。当前契约没有 AI 运行/进度/数量/成功及风险命中投影，正式页只显示“未启用”，没有模拟请求、常量推算或静态词表扫描。
- 所有关键异步操作覆盖加载、稳定失败、requestId、唯一恢复、再次失败、提交中禁用与焦点语境；基准/全轴/视频放大弹窗具备初始焦点、Tab/Shift+Tab 闭环、Escape 返回触发点，脏态与完成/release 门禁消费后端事实。新增 `tests/frontend/PreReviewWorkspace.test.tsx` 的 7 条高价值回归。
- 本轮新鲜验证：前置审改专项 7/7；全部前端 8 文件 69/69；前端 TypeScript 通过；Vite 生产构建 160 modules 通过；Impeccable 定向检测 `[]`；`git diff --check` 通过，仅保留既有文档 CRLF 提示。完整 `pnpm check` 按任务停止边界留正式 UI 终验后的 S3 关闭门。
- 真实浏览器使用匿名本地项目 `42067015-0605-4c40-8997-cf98923cff91` 走现有公开 API 和零网络 Worker 生成权威会话：1440 根页面 `1430/1440`、工作台三列 `196px 632px 310px`；1024 侧栏展开/收起根页面均 `1014/1024`，展开为 `196px 538px` 且证据区下置，收起为 `196px 670px`；视频 `object-fit: contain`，基准/全轴焦点闭环、脏态、AI“未启用”和控制台 `error/warn=0/0` 均成立。仅为本地验证应用现有三条迁移，临时前端/Worker 与日志已停止并清理；既有后端和 PostgreSQL 保持原运行状态。
- 状态已写回：`CURRENT.md` 从 v4-167 最小递增为 v4-168，任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 068 `notification_pending`。未修改后端、迁移、共享契约、`DESIGN.md` 或本地等价矩阵，未提交、推送或部署；后续只由规划独立审核并统一路由 UI。
- 唤醒已发送：正式交审只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未直接通知 UI、后端或要求用户传话；发送接口一次成功，无需重试。
- 送达/运行态已确认：`read_thread` 显示 FIFO 068 完整交审消息位于规划最新 turn，`wait_threads` 显示规划任务为 `active / inProgress`。送达证据最小写回后 `CURRENT.md` 递增为 v4-169，FIFO 068 转 `active`；前端停止修改并等待规划审核。

## 2026-08-14 — 前端领取 FRONT-M3-03B Rev 1 并完成接口映射预检

- 完整重读项目协议 v4.2、`CURRENT.md` v4-166、前置审改权威契约、`DESIGN.md` 5.7、UI Rev 4 验收、本地等价矩阵前置审改能力行及开发日志顶部；确认 UI 与后端双依赖均已关闭，唯一当前动作是正式 React 前置审改集成。
- 第一项预检逐一映射页面状态与共享 `pre-review` 类型、正式 Fastify 路由和稳定错误结构：项目/术语门禁复用现有项目素材状态与术语工作区；会话列表/详情提供来源、集状态与完成签名；items 服务端按集、状态、搜索、`limit/offset` 同时支撑问题队列和只读全轴；正式命令覆盖会话创建/准备重试、基准预览/应用、六类决定、撤销、逐集完成、release/SRT 和播放授权。
- 三画幅不新增业务投影：浏览器只从已授权真实 MP4 的 `loadedmetadata` 读取 `videoWidth/videoHeight`，播放器统一 `object-fit: contain`。当前契约没有 AI 运行/进度/数量/成功和风险命中，正式页面只允许明确显示“未启用”，不发模拟请求、不用常量推算、不扫描静态词表。
- 未发现需要修改后端、迁移或共享契约的阻断。`CURRENT.md` 从 v4-166 最小递增为 v4-167，任务保持 Rev 1 `in_progress / Current actor=前端开发对话`；下一步先建立单一 API 错误封装、正式路由与读取骨架，再接入命令状态、脏态和焦点闭环。

## 2026-08-14 — 用户确认 UI-M3-03 Rev 4 并解锁正式前端

- 用户确认规划已通过的 Rev 4 方向；`UI-M3-03` 关闭为 `done`，Rev 1–4 的工作台结构、六类决定、格式/长句门禁、三画幅 `contain`、播放器按需放大、无文字双色来源分隔、本集全轴只读定位与未来 AI/风险占位方向冻结，不再继续 UI 返工。
- `BACK-M3-03A` Rev 3 与 UI 用户验收双依赖已满足，规划同轮解锁 `FRONT-M3-03B` Rev 1 为 `ready / Current actor=前端开发对话 / Reviewer=规划对话`。范围只包含正式 React 前置审改集成及现有契约支持的状态，不扩展 OCR、字幕验收、交付、管理员控制台、真实供应商、转码或时间轴编辑。
- 当前共享契约没有 AI 运行/进度/数量/成功和风险命中投影；正式前端首版只能隐藏或明确显示未启用，不得以常量、前端推算、模拟请求或静态词表伪造。完整 `pnpm check` 留正式前端与 UI 终验后的 S3 关闭门。
- 状态已写回：`CURRENT.md` v4-165 登记 FIFO 067 `notification_pending` 并解锁前端；送达确认后最小递增至 v4-166，FIFO 067 关闭，任务转 `in_progress / Current actor=前端开发对话`。
- 唤醒已发送：正式派发只发送前端固定对话 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf`，未通知 UI、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 067 完整消息位于前端最新 turn，`wait_threads` 显示目标任务为 `active / inProgress`；前端从异步状态转换与现有接口映射预检开始。

## 2026-08-14 — 规划独立审核 UI-M3-03 Rev 4 通过并路由用户

- 规划重新打开最新 Rev 4 原型，使用本轮新鲜浏览器状态复验默认紧凑页、竖屏放大层、本集全轴抽屉、AI 运行态和 1024 侧栏两态；1440 根页面为 `1430/1430`，1024 展开/收起侧栏分别为 204/72px 且根页面均为 `1014/1014`，没有页面级横向溢出。
- 默认播放器实测 `304×172px`；放大层具备 `role=dialog / aria-modal=true`、初始聚焦关闭、Tab 保持在弹窗语境和 Escape 回“放大”，三画幅均为 `object-fit: contain`。公司稿/中文识别中缝实测 `textContent="" / aria-hidden=true / 12px`，只保留双色过渡。
- “本集全轴”抽屉是只读定位工具，包含关系、差异、决定、格式、风险和定位列，没有复制决定动作；定位后播报同步结果，Escape 关闭后焦点返回原入口。AI 入口点击后只在原位显示 `role=status` 的 `38/64` 细进度，根页面宽度不变。
- Impeccable 单次降级检测只重复两条来源顶部 3px 内嵌身份线提示；结合截图与计算样式确认其为来源身份标识，没有新增 P0–P3。`node --check` 与授权文档 `git diff --check` 均通过，P0/P1=0。
- 状态写回 `CURRENT.md` v4-164：FIFO 066 关闭，`UI-M3-03` 转 `review / Current actor=用户 / Reviewer=用户`，等待用户方向确认；`FRONT-M3-03B` 继续 blocked。当前共享契约没有 AI/风险后端投影，生产前端不得伪造这些未来状态，未通知或解锁前端。

## 2026-08-14 — UI-M3-03 Rev 4 定向收口完成并交规划

- `DESIGN.md` 5.7 与 UI 验收已固化 Rev 4：默认播放器保持紧凑并增加同源放大层；公司稿/中文识别之间只留无文字双色过渡，关系事实进入问题元数据和“本集全轴”；全轴抽屉只读分页/定位；AI 五态只占摘要原位；风险词只作公司稿、识别稿、最终稿和全轴的非阻断核对提示。
- 仓库外原型补齐放大层、全轴加载/空/失败/再次失败/恢复/定位、AI 未启用/可运行/运行中/完成/失败和三类风险提示。异步焦点预检发现中间 Tab 依赖浏览器默认移动不稳定，唯一一轮定向修正改为显式逐项焦点循环；其余 Rev 1/2/3 冻结行为未改。
- 新增 9 张 Rev 4 定向证据。1440 默认页为 `1430/1430`、播放器 172px、来源中缝空文本；1024 展开/收起均为 `1014/1014`、侧栏 204/72px。三画幅放大均 `object-fit=contain`；放大与抽屉打开/闭环/Escape 返回、全轴两次失败恢复、行定位同步、AI 失败不阻断均通过，页面控制台 `error/warn=0/0`。
- Impeccable 单次降级检测只重复 Rev 3 已冻结的两条来源顶部 3px 内嵌身份线提示；人工截图确认没有新增侧边标签或装饰卡片，记为既有降级提示，无新增 P0–P3。`node --check` 与授权文档 `git diff --check` 通过；精确临时静态服务 PID 37552 已停止，浏览器视口已重置、标签页已清理。
- 当前共享契约仍没有 AI 调用/数量/进度/成功和风险命中的正式投影；原型状态只供设计验收，生产前端首版不得使用常量、前端推算、模拟请求或静态词表伪造事实。
- 状态已写回：`CURRENT.md` 从 v4-161 最小递增为 v4-162，`UI-M3-03` 转 `review / Current actor=规划对话`，FIFO 065 关闭并登记 FIFO 066 `notification_pending`；未修改生产前后端、迁移或共享契约，未直接通知或解锁前端。
- 唤醒已发送：正式交接只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知前端、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 066 完整消息位于规划最新 turn，规划任务状态为 `inProgress`；没有发送失败或重试。`CURRENT.md` 随后最小递增为 v4-163，FIFO 066 转 `active`，UI 停止修改并等待规划独立审核。

## 2026-08-14 — UI 领取 UI-M3-03 Rev 4 定向收口

- 完整重读项目协议 v4.2、`CURRENT.md` v4-160、前置审改权威契约、`DESIGN.md` 5.7、UI 验收全文和开发日志顶部，确认用户最终方向与规划停止边界一致。
- Rev 1/2 的六类决定、格式、键盘、错误恢复和 15 张证据继续冻结；Rev 3 的三画幅 `contain`、来源 A/B 身份和紧凑自动筛选摘要方向保留。
- 本轮只补默认紧凑播放器按需放大、无文字双色来源分隔、本集全轴浏览/定位、小型 AI 快速筛选未来状态和非阻断风险提示；正式设计前先做异步状态与焦点预检，最多执行一轮完整浏览器矩阵和一轮定向修正。
- `CURRENT.md` 从 v4-160 最小递增为 v4-161，任务保持 `in_progress / Current actor=UI 设计对话`。只修改 `DESIGN.md`、UI 验收、仓库外原型/证据及同步文档，不修改生产前后端、迁移或共享契约，不伪造 AI/风险生产事实。

## 2026-08-14 — 用户确认 UI-M3-03 Rev 4 定向边界并交 UI

- 用户确认播放器默认无需放大，但必须提供按需大尺寸看片；公司稿与中文识别之间不再显示 `1:2`、交叠率或组合轴编号，只保留低占用、无文字的双色过渡分隔，关系详情转入元数据与“本集全轴”抽屉。
- 用户同时接受低强调“本集全轴”查阅、摘要行内小型“AI 快速筛选”按钮/原位进度，以及公司稿、ASR、最终稿风险命中的非阻断定位方案；不增加独立风险模块或员工配置墙。
- 规划检查现有正式接口：本集全部对齐项已有按集分页读取入口，可以支持全轴抽屉；当前共享契约没有 AI 筛选运行/进度或风险投影，因此 Rev 4 只设计未来状态，正式前端不得用常量伪造调用和风险事实。
- `docs/contracts/M3-pre-edit-workbench.md` 已更新为本轮权威边界；`CURRENT.md` 递增为 v4-159，`UI-M3-03` 转 Rev 4 / ready / Current actor=UI 设计对话，FIFO 065 登记为 `notification_pending`。生产前后端、迁移、共享契约和既有原型尚未修改，`FRONT-M3-03B` 继续阻塞。
- 唤醒已发送：正式派发只发送 UI 固定对话 `019ff52d-d4a1-7440-81a2-fc9c1b0a0996`，未通知前端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 065 完整消息位于 UI 最新 turn，任务状态为 `inProgress`；同步版本递增为 v4-160，FIFO 065 转 `active`，`UI-M3-03` 转 `in_progress`。

## 2026-08-14 — 规划独立审核 UI-M3-03 Rev 3 通过并路由用户

- 规划重新打开最新 Rev 3 原型并采集四组新鲜审核证据：1440 竖屏双来源层级、自动筛选判断依据、1024 方形展开侧栏、1024 横屏收起侧栏。根页面实测为 `1430/1430` 和 `1014/1014`，侧栏 204/72px，三类媒体 `object-fit=contain`；窄屏播放器下置后未被队列覆盖。
- 原型源码与 DOM 复核确认公司稿/中文识别为独立来源 A/B，中间关系层显示 `1:2 / 交叠 92% / 组合轴`，唯一最终稿为下游第三层；筛选判断依据由具备 `aria-expanded/aria-controls` 的显式按钮按需展开。
- 与共享 `pre-review` 契约交叉检查后确认：当前后端只有确定性对齐、格式与待处理计数，没有真实 AI 筛选投影。Rev 3 的 `286/14/AI 已关闭` 只作为未来状态设计；正式 `FRONT-M3-03B` 不得伪造这些事实，首版只消费现有后端权威状态并保留未来接入位置。
- Impeccable 单次降级检测把两条顶部内嵌来源标识线报告为 `side-tab`；因检测器缺少 HTML 解析模块，结合新鲜截图和计算样式人工复核后判为误报，不要求为消除提示而削弱来源区分。P0/P1=0。
- 状态写回 `CURRENT.md` v4-158：FIFO 064 关闭，`UI-M3-03` 保持 `review` 并转 `Current actor/Reviewer=用户`；`FRONT-M3-03B` 仍阻塞到用户体验确认，未通知前端、未修改生产代码、迁移或共享契约。

## 2026-08-14 — UI-M3-03 Rev 3 三项定向增量完成并交规划

- `DESIGN.md` 5.7 与 UI 验收已补齐三项权威语义：竖屏/横屏/方形视频按元数据使用 `object-fit: contain` 完整显示；公司稿/中文识别使用独立来源层与中间对齐关系层，唯一最终稿保持下游第三层；自动筛选只显示本地规则优先、AI 可选且失败不阻断的紧凑摘要和按需判断依据。
- 仓库外原型新增三种匿名画幅海报和 4 张 Rev 3 定向证据，Rev 1/2 的 15 张截图与全部状态行为冻结。1024 下仅把队列粘性定位收敛为静态，避免向下查看证据时覆盖播放器，不改变业务动作。
- 真实浏览器结果：`1440×900 / 204px` 根页面 `1430/1430`；`1024×768 / 204px` 与 `/72px` 下竖屏、横屏、方形均为 `1014/1014`、`object-fit=contain`，判断依据可按需展开，最终控制台 `error=0 / warn=0`。
- `node --check` 与授权文档 `git diff --check` 通过。Impeccable 因 HTML 解析模块缺失使用正则降级，发现一条厚色边警告；已把 3px 顶部边框改为内嵌标识线，最终浏览器计算样式为 `border-top=0px / inset box-shadow=3px`，未把降级检测单独作为通过依据。
- 状态已写回：`CURRENT.md` 从 v4-155 最小递增为 v4-156，任务转 `review / Current actor=规划对话`，FIFO 064 登记为 `notification_pending`；未修改生产前后端、迁移或共享契约，未解锁前端。
- 唤醒已发送：正式交接只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知前端、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 064 完整消息位于规划最新 turn，规划任务状态为 `inProgress`；没有发送失败或重试。`CURRENT.md` 随后最小递增为 v4-157，FIFO 064 转 `active`，UI 停止修改并等待规划独立审核。

## 2026-08-14 — UI 领取 UI-M3-03 Rev 3 定向增量

- 完整重读项目协议 v4.2、`CURRENT.md` v4-154、前置审改/系统控制中心/本地等价权威契约、`DESIGN.md` 5.7、UI 验收记录和开发日志顶部，确认用户已通过 Rev 1/2 功能方向。
- 本轮只补三项 UI：证据播放器按元数据适配竖屏/横屏/方形并保持 `object-fit: contain`；公司稿与中文识别以来源标题、标签、边界、间距和中间关系层明确区分，唯一最终稿保持下游第三层；员工页增加紧凑本地规则优先/可选 AI 自动筛选摘要与按需判断依据。
- Rev 1/2 状态行为、六类决定、键盘、格式、错误及 15 张证据冻结；不改生产前后端、迁移或共享契约，不接真实 DeepSeek/API，不扩展系统控制台、优化智能体页面、OCR、完整风险、时间轴、转码、字幕验收或交付。
- `CURRENT.md` 从 v4-154 最小递增为 v4-155，任务转 `in_progress / Current actor=UI 设计对话`。

## 2026-08-14 — 用户确认前置审改 UI Rev 3 与长期优化智能体边界

- 用户确认前置审改 Rev 1/2 的整体功能方向，同时提出三个定向增量：短剧视频证据必须按元数据完整适配竖屏/横屏/方形素材；公司稿与中文识别同屏但须通过来源标题、分组边界和中间对齐关系层清晰区分；员工页只保留紧凑自动筛选摘要及按需判断依据，不增加模型配置墙。
- 只读核对本地应用后确认其存在 `deepseek-v4-flash` 配置以及“本地快速筛选 / AI 复核（可选）”行为。用户决定长期保留这一能力，但本地确定性规则足够优秀时应允许关闭 AI 或只做抽样；AI 停用、失败或超预算不得阻断人工工作台。
- 用户进一步明确人工操作不是逐条触发自动升级，而是长期保留为后台结构化日志；由系统控制台内的持久化优化智能体按管理员选择的模块、时间范围、目标和预算批量分析，输出本地规则、AI 筛选、提示词、热词/风险词和测试候选。候选仍须经过脱敏数据集、离线回归、人工批准和小流量验证，智能体无权直接发布或修改生产版本。
- 已更新 `docs/contracts/SYSTEM_CONTROL_CENTER.md`、`M3-pre-edit-workbench.md`、`LOCAL_APP_PARITY.md` 和 `docs/architecture.md`，固化本地优先/AI 可选、版本快照、长期日志、优化智能体、证据回溯、评测发布与回滚边界；真实 AI、管理 API、微调、付费和控制台生产实现仍后置。
- `CURRENT.md` 从 v4-152 递增为 v4-153：`PLAN-LONG-03` 与 `PLAN-SYSTEM-01` 升为 Rev 2 并关闭；`UI-M3-03` 定向递增为 Rev 3 / ready，只更新原型、DESIGN/UI 验收和对应证据，Rev 1/2 状态行为冻结；`FRONT-M3-03B` 继续等待该 UI 增量，避免正式前端返工。FIFO 063 已登记为 `notification_pending`，正式唤醒下一步只发送 UI 固定对话。
- 状态已写回：规划、系统控制台、等价矩阵和 UI Rev 3 任务先写回 `CURRENT.md` v4-153 与开发日志。
- 唤醒已发送：正式派发只发送 UI 固定对话 `019ff52d-d4a1-7440-81a2-fc9c1b0a0996`，未通知前端、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示完整 FIFO 063 消息位于 UI 最新 turn，UI 任务状态为 `inProgress`；没有发送失败或重试。规划最小写回 v4-154 并关闭 FIFO 063，等待 UI 自行登记领取和交付。

## 2026-08-14 — 规划独立复验通过 BACK-M3-03A Rev 3

- 规划只审 Rev 3 唯一门禁及回归，不重做 Rev 2 已冻结证据。代码确认 `completeEpisode` 在既有事务、项目+幂等键锁、session/episode 行锁内读取数据库 `status/limited_reason`，并在完成签名、episode/session 修订和命令落账前稳定返回 `409 PRE_EDIT_COMPLETION_BLOCKED / run_asr`。
- mixed-ASR 回归在正式 API 上调用 limited 集完成，逐项比较失败前后的 episode status/revision/completionSignature/limitedReason、session status/revision、完成命令总数和目标幂等键记录，全部不变；同文件既有 ready 集完成、完成签名与不可变 release/SRT 正向路径继续通过。
- 创建精确隔离数据库 `qimao_plan_back_m303a_rev3_20260814`，从零成功应用 21 个迁移；新鲜前置审改专项 1 文件 7/7、后端生产构建和 `git diff --check` 通过。隔离库已按精确名称删除并确认残留 0，共享 PostgreSQL 保持运行。
- `CURRENT.md` 从 v4-151 最小递增为 v4-152，FIFO 062 与 `BACK-M3-03A` 关闭。完整 `pnpm check` 留正式前端终验后的 S3 关闭门；后端依赖已满足，但 `UI-M3-03` 仍等待用户体验本地原型后确认，因此未通知或解锁 `FRONT-M3-03B`。

## 2026-08-14 — BACK-M3-03A Rev 3 limited 完成门禁完成并交规划

- 生产改动严格限定 `PreReviewWriteRepository.completeEpisode`：在既有事务取得 episode 行锁并读取 `status/limited_reason` 后，以数据库 `status=limited` 或 `limited_reason IS NOT NULL` 为权威事实，稳定拒绝完成并返回 `409 PRE_EDIT_COMPLETION_BLOCKED / run_asr`；未改共享契约、迁移或其他 Rev 2 状态机。
- 在真实 mixed-ASR 回归中对 limited 集调用正式完成 API，确认错误稳定，且 episode 的 status/revision/completionSignature/limitedReason、session 的 status/revision 及 `pre_edit_commands` 数量和目标幂等键记录均保持不变；既有 ready 集完成与不可变 release/SRT 正向路径仍通过。
- 精确隔离数据库 `qimao_back_m303a_rev3_20260814` 从零成功应用 21 个迁移；新鲜运行 `tests/backend/pre-review.test.ts` 为 1 文件 7/7，通过后端生产构建和 `git diff --check`。测试后 projects/pre-edit sessions/commands 均为 0，隔离库已按精确名称删除并确认残留 0，共享 PostgreSQL 保持运行。
- 本轮只修改后端仓储、对应后端测试和同步文档；未修改生产前端、`DESIGN.md`、迁移或共享契约，未接真实供应商、网络、R2、转码或 OCR，未运行完整 `pnpm check`，未提交、推送或部署。
- 状态已写回：`CURRENT.md` 从 v4-149 最小递增为 v4-150，任务转 `review / Current actor=规划对话`，FIFO 062 登记为 `notification_pending`；正式唤醒下一步只发送规划固定对话，不直接通知或解锁 UI/前端。
- 唤醒已发送：正式交接只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知 UI、前端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 062 完整消息出现在规划最新 turn，规划任务状态为 `inProgress`；没有发送失败或重试。`CURRENT.md` 随后最小递增为 v4-151，FIFO 062 进入 `active`，后端停止修改并等待规划独立复验。

## 2026-08-14 — 后端领取 BACK-M3-03A Rev 3 limited 完成门禁返工

- 完整重读项目协议 v4.2、`CURRENT.md` v4-147、前置审改权威契约与开发日志顶部，确认规划已独立通过并冻结 Rev 2 的 21 迁移、三文件 30/30、双构建及 Worker/来源/术语/时长/策略/幂等/理由证据。
- 本轮只在 `PreReviewWriteRepository.completeEpisode` 的既有事务和 episode 行锁内阻断 `status=limited` 或 `limited_reason IS NOT NULL`；补 mixed-ASR limited 集稳定错误与 episode/session/command 全量零副作用回归，同时保留 ready 集完成和 release 正向路径。
- `CURRENT.md` 从 v4-147 最小递增为 v4-148；任务转 `in_progress / Current actor=后端开发对话`。不修改迁移、共享状态机、生产前端或 `DESIGN.md`，不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-14 — 规划独立复验 BACK-M3-03A Rev 2 并定向退回 limited 完成门禁

- 规划核对共享契约、来源快照、Worker entry/租约回写、策略 preview/apply、人工决定/撤销、完成/release 和 Rev 2 新增回归。可停止 Worker、当前清单同视频 ASR 绑定、旧结果隔离、mixed-ASR limited、固定术语证据、权威视频时长、仅安全一对一自动策略、同计算预览/执行、项目+幂等键事务串行化及 trim 后至少 8 字理由均成立；Rev 2 这些通过项冻结。
- 创建精确隔离数据库 `qimao_plan_back_m303a_rev2_20260814`，从零成功应用 21 个迁移；新鲜运行 `tests/backend/pre-review.test.ts`、`terms.test.ts`、`asr.test.ts` 为 3 文件 30/30，通过共享契约构建、后端生产构建和 `check:repo`；`git diff --check` 退出码 0，仅报告既有两个文档的 CRLF→LF 提示。隔离库随后按精确名称删除并确认残留 0，共享 PostgreSQL 保持运行。
- P1 真实复现：规划在隔离库构造 `status=limited`、`limited_reason=ASR result missing`、只有公司轴且无待人工/格式阻断的单集，调用正式 `PreReviewWriteRepository.completeEpisode` 得到成功响应和 64 位完成签名；数据库随后为 `completed|ASR result missing|true`。服务层没有额外 limited 门禁，现有 limited 测试只检查进入 limited，没有尝试完成，因此全部绿灯不能证明该契约成立。
- 该行为违反前置审改权威契约和已通过 UI 的“有限审改只处理公司稿格式、不得冒充完成 ASR 对照”。`BACK-M3-03A` 递增为 Rev 3，只需在完成命令同一事务/行锁内阻断 limited 集，保证错误稳定且状态、修订、签名、命令均无副作用；补 mixed-ASR limited 负向回归，并保留 ready 正向完成/release 回归。不得重写 Rev 2 其他路径，不改生产前端/DESIGN、迁移或共享状态机。
- `CURRENT.md` 已从 v4-146 最小递增为 v4-147；FIFO 061 转 `notification_pending`，`FRONT-M3-03B` 继续等待 UI 用户确认和后端规划验收双依赖。状态已写回；正式退审下一步只发送后端固定对话，不要求用户传话。
- 唤醒已发送：规划只向后端固定对话 `019ff4de-084b-7002-a7eb-20ff93d97d0a` 发送 Rev 3 定向退审，没有通知 UI、前端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示完整 Rev 3 消息位于后端最新 turn，后端明确回执“已领取 BACK-M3-03A Rev 3，并进入 in_progress”；没有发送失败或重试。后端先按协议将领取写回 v4-148，规划随后最小合并为 v4-149，FIFO 061 关闭。

## 2026-08-14 — BACK-M3-03A Rev 2 四组 P1 与长句理由契约完成并交规划

- 新增可停止、有界轮询的 pre-review Worker entry、独立开发/启动脚本并接入 `development.ts`；queued 正式会话可实际推进。Worker 失败落账先以 `status=leased + lease_owner=当前 Worker` 条件取得所有权，旧 Worker 的迟到失败不能覆盖新租约或成功结果。
- 当前 ASR 查询必须同时匹配最新素材清单同集 `asr_video` Asset；旧视频结果被隔离，全剧无匹配结果返回 `PRE_EDIT_SOURCE_NOT_READY`，有 ASR 与缺 ASR 混合时保存 `limited` 集和会话。专项同时修正无 ASR 时 LEFT JOIN 重名列覆盖集数的真实运行错误。
- 第 21 个迁移为 episode 保存与当前 ASR Attempt 绑定的权威媒体时长，并为 item 保存固定 TermVersion 逐条术语匹配/冲突证据。API 明确返回 `videoDurationMs + known/unknown`；Worker、策略、人工决定和撤销均用保存时长计算 `after_video_end`，未知时不冒充已验证。
- `asr_text_primary` 只自动作用于安全一对一。新增只读策略 preview，按与 apply 相同的计算返回安全更新、保护人工和仍需人工数量；组合轴、低质量、格式或术语冲突继续人工。所有写命令在事务内先按项目+幂等键 advisory lock 串行化后重查，同键并发只产生一次资源/事件并稳定 replay，同键异参稳定 409。
- 按 v4-143 补充将 `formatOverrideReason` 共享契约改为至少 8 字，并由仓储对 trim 后长度做权威 422 校验；1–7 字不落 DecisionEvent、不改变 item/version、不解除门禁，合法理由只覆盖可覆盖的 `long_line` 并保存审计事实。
- 精确隔离库 `qimao_back_m303a_rev2_20260814` 从零成功应用 21 个迁移。最终前置审改专项 7/7；前置审改、术语、ASR 三文件合计 30/30；共享契约与后端构建、`check:repo`、`git diff --check` 全部退出码 0。本任务按约定未运行完整 `pnpm check`。
- 测试后 projects/pre-edit sessions/commands/playback grants 均为 0；隔离库已按精确名称删除并确认残留 0，共享 PostgreSQL 保持运行。未修改生产前端或 `DESIGN.md`，未接真实供应商、网络、密钥、R2、转码、OCR、字幕验收或云资源，未提交、推送或部署。
- `CURRENT.md` 从 v4-144 最小递增为 v4-145；任务转 `review / Current actor=规划对话`，FIFO 061 登记为 `notification_pending`。状态已写回；正式唤醒下一步只发送规划总线，不直接通知 UI/前端。
- 唤醒已发送：正式交接只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知 UI、前端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 061 完整消息位于规划最新 turn，目标状态为 `inProgress`；没有发送失败或重试。确认后 `CURRENT.md` 最小递增为 v4-146，FIFO 061 进入 `active`，后端停止修改并等待规划独立复验。

## 2026-08-14 — 规划登记 S3 长句理由前后端最小对齐补充

- `UI-M3-03` Rev 2 通过后的交叉检查确认：`DESIGN.md` 与正式 UI 已要求长句保留理由至少 8 字，但共享 `CreatePreEditDecisionBody.formatOverrideReason` 当前仍为 `minLength: 1`，后端仓储只 trim 并判断非空；若不提前对齐，1–7 字理由可绕过后端权威门禁。
- 本补充不新增功能或状态：只要求正在执行的 `BACK-M3-03A` Rev 2 把共享契约和后端校验统一为 trim 后至少 8 字，并补“不足 8 字不落事件/不解除门禁、有效理由可审计保存”回归；UI、前端和既有格式状态机保持冻结。
- 状态已写回：`CURRENT.md` v4-143 已登记本约束。
- 唤醒已发送：规划只向后端固定对话 `019ff4de-084b-7002-a7eb-20ff93d97d0a` 发送补充约束，没有通知 UI、前端或要求用户传话。
- 送达/运行态已确认：`wait_threads` 显示后端最新 commentary 明确回复“已收到规划总线 v4-143 的补充约束，并入当前 BACK-M3-03A Rev 2 / in_progress”，且已开始修改对应共享契约；没有发送失败或重试。确认后 `CURRENT.md` 最小递增为 v4-144。

## 2026-08-14 — 规划通过 UI-M3-03 Rev 2 独立审核并转用户方向确认

- 规划按 FIFO 060 对照 `M3-pre-edit-workbench.md`、`DESIGN.md` 5.7、UI 验收记录、仓库外原型源码与 5 张定向截图复核四项退审根因；本轮未修改生产前端、后端、迁移或共享契约。
- 应用内浏览器新鲜复验确认：`company_only` 只显示保留/手改/删除并写入 `keep_company / 公司轴 118`；`asr_only` 只显示补入/手改后补入/忽略并写入 `add_asr / 识别轴 132`；`limited` 只显示公司稿与公司稿格式处理，双源完成保持禁用且给出等待 ASR 后重建会话的下一步。
- 文本基准真实键盘序列为取消、确认、关闭、当前范围 radio、当前基准 radio 后闭环，Escape 关闭并恢复“调整文本基准”。长句不足 8 字时错误与焦点稳定且门禁不放行；有效理由保存 `reason_recorded`，真实裁短至 8 个有效字保存 `text_shortened`，两条路径均只读取已保存事实。
- 1440 根页面 `1430/1430`；规划另以 1024×768 新鲜复验根页面 `1014/1014`，展开/收起后工作区均无页面级横溢；控制台 error/warn 为空。Impeccable detector 返回 `[]`，但明确为缺 HTML 解析模块的正则降级，因此只作辅助，最终结论以截图、源码和真实 DOM/键盘为准。
- 审核结论 P0/P1=0。`CURRENT.md` 更新为 v4-142，FIFO 060 关闭，`UI-M3-03` 转 `review / Current actor=用户 / Reviewer=用户`，只等待正式 UI 方向确认。`FRONT-M3-03B` 继续等待 UI 用户确认与 `BACK-M3-03A` Rev 2 规划验收双依赖，不提前解锁。

## 2026-08-14 — UI 完成 UI-M3-03 Rev 2 四项定向收口并交规划

- `DESIGN.md` 5.7 与 UI 验收记录已把状态专属动作绑定到真实决定语义：仅公司轴只允许保留/手改/删除并使用公司轴时间，仅识别轴只允许补入/手改后补入/忽略并使用识别轴时间；有限审改移除全部 ASR 决定，只允许公司稿与格式处理，不能完成双源对照。
- 文本基准弹窗焦点循环已包含范围与基准 radio。真实 Tab 序列可由取消经过确认、关闭、范围 radio、基准 radio，Shift+Tab 反向成立；Escape 关闭后恢复原“调整文本基准”触发点。长句同时提供真实拆句/裁短与至少 8 字的明确保留理由，未保存或不足 8 字不会解除门禁，保存后形成可审计格式决定。
- Rev 1 三栏布局、视觉和 10 张证据全部冻结；仓库外 `evidence-rev2` 新增 5 张定向截图，分别证明仅公司轴、仅识别轴、有限审改、基准 radio 焦点和长句理由。新增状态在 1024×768 侧栏 204/72 两态根页面均为 `1014/1014`，控制台 `error/warn=0/0`。
- 原型 `node --check`、授权文档 `git diff --check` 通过；Impeccable `detect` 返回 `[]`，但仍是缺 HTML 解析模块的正则降级，只作辅助。临时原型服务 PID 40224 已精确停止并确认，本轮浏览器标签页已清理。
- 未修改生产 frontend/backend、迁移或共享契约，未扩展 OCR、完整风险、时间轴、转码、字幕验收、交付、供应商或云资源。`CURRENT.md` 在保留后端 v4-139 并行领取事实后最小递增为 v4-140；任务转 `review / Current actor=规划对话`，FIFO 060 为 `notification_pending`。状态已写回；正式唤醒下一步只发送规划总线。
- 唤醒已发送：正式交接只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知前端、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 060 完整消息位于规划最新 turn，目标状态为 `inProgress`；没有发送失败或重试。`CURRENT.md` 随后在 v4-140 基础上最小递增为 v4-141，FIFO 060 进入 `active`，UI 停止修改并等待规划独立审核。

## 2026-08-14 — 后端领取 BACK-M3-03A Rev 2 定向返工

- 完整重读项目协议 v4.2、`CURRENT.md` v4-138、前置审改权威契约和开发日志顶部，确认规划已冻结 Rev 1 的迁移、三文件 27/27、双构建与既有六类决定/撤销/stale/release/SRT/只读播放证据。
- 本轮只收口四组 P1：可停止轮询 Worker 入口与 lease-owner 失败回写；当前清单同集视频 Asset 的 ASR 绑定及 mixed/full-missing 行为；安全一对一策略预览、固定术语版本逐条证据和权威视频时长门禁；所有写命令的项目+幂等键并发串行化。
- `CURRENT.md` 从 v4-138 最小递增为 v4-139，任务保持 Rev 2 `in_progress / Current actor=后端开发对话`。不修改生产前端或 `DESIGN.md`，不接真实供应商、网络、密钥、R2、转码、OCR、字幕验收或云资源，不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-14 — 规划独立复验 BACK-M3-03A Rev 1 并一次性退回 Rev 2

- 规划按 FIFO 059 核对共享 `pre-review` 契约、第 20 个迁移、来源/读取/写入/Worker/路由、S3 产品契约及 4 项专项回归。创建精确隔离库 `qimao_plan_back_m303a_review_20260814`，从零成功应用 20 个迁移；新鲜运行前置审改、术语、ASR 三文件 27/27，通过共享契约与后端生产构建、`check:repo` 和 `git diff --check`。隔离库随后按精确名称删除，残留为 0；共享 PostgreSQL 继续运行，未干扰并行 UI。
- 真实运行 P1：仓库只有 `PreReviewWorker.runOnce()`，没有轮询 entry、独立启动脚本或 `development.ts` 接入；现有正式创建 API 只入队，除测试手动调用外无人消费，页面会永久停在 `preparing`。Worker 事务回滚后的失败更新也未带 `lease_owner=当前 Worker` 条件，存在旧失败回写覆盖新租约/成功的竞态。
- 来源 P1：`current_asr` 只按项目、集数和术语版本选最新结果，没有要求 `asr_results.asset_id` 等于最新清单同集 `asr_video` Asset；换视频后旧会话虽会 stale，但基于新清单创建时仍可能绑定旧视频识别结果。专项没有覆盖 mixed-ASR 的 `limited` 会话或旧视频结果隔离。
- 策略/术语 P1：`effectiveSystemDecision` 把 `one_company_many_asr` 也视为 ASR 优先可自动采用，违反组合轴必须人工裁决；固定 `termVersionId` 只进入来源摘要，没有逐条术语匹配/冲突证据。UI 已确认的基准弹窗需要保存前“安全更新/保护人工/仍需人工”权威数量，但共享契约只有执行后的结果，浏览器无法跨全剧分页安全预览。`after_video_end` 虽存在枚举与扫描函数，Worker/决定路径从未传入权威视频时长，当前不能真实触发。
- 并发一致性 P1：所有命令在读取 `pre_edit_commands` 后才取得项目/会话锁；两个并发同键同请求可以同时读到空记录，后到请求会得到版本冲突/唯一键异常而非稳定 replay。Rev 2 必须在同一事务先按项目+幂等键串行化再重查，确保同键同请求只产生一个资源/事件，同键异参稳定 409。
- 为减少往返，规划把以上问题合并成四组同源 Rev 2：运行与租约、当前来源与 limited、策略预览/术语/格式证据、并发幂等；既有六类人工动作、撤销、stale、release/SRT 和只读播放通过项冻结。`CURRENT.md` 更新为 v4-137，FIFO 059 进入 `notification_pending`，前端继续阻塞；完整 `pnpm check` 仍留 S3 关闭门。
- 唤醒已发送：规划只向后端固定对话 `019ff4de-084b-7002-a7eb-20ff93d97d0a` 发送 Rev 2 正式退审，没有通知 UI、前端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示完整 Rev 2 消息位于后端最新 turn，状态为 `inProgress`；未发生发送失败或重试。确认后 `CURRENT.md` 递增为 v4-138，FIFO 059 关闭，`BACK-M3-03A` Rev 2 进入 `in_progress`。

## 2026-08-14 — UI 领取 UI-M3-03 Rev 2 定向返工

- 完整重读协议 v4.2、`CURRENT.md` v4-134、前置审改契约 5–10、`DESIGN.md` 5.7、Rev 1 验收记录和开发日志顶部；使用 Impeccable harden/craft-floor 只审状态专属动作、表单键盘可达性和长句边界，不改变已通过视觉方向。
- 规划已在 v4-133 完成退审送达闭环并把任务置为 `in_progress / Current actor=UI 设计对话`；UI 在保留后端 v4-134 完成交接事实后最小合并为 v4-135，确认只修四项同源缺口。Rev 1 的三栏布局、来源失效、视频、失败恢复、1440/1024 与 10 张证据冻结。
- 本轮只修改 `DESIGN.md` 5.7 对应语义、`docs/ui/M3-pre-edit-acceptance.md`、仓库外原型/四项定向证据和同步文件；不修改生产 frontend/backend、迁移或 contracts，不扩展 OCR、完整风险、时间轴、转码、字幕验收、交付、供应商或云资源。

## 2026-08-14 — BACK-M3-03A Rev 1 前置审改权威后端完成并交规划

- 新增共享 `pre-review` TypeBox 契约和第 20 个增量迁移；PostgreSQL 固定项目、公司 SRT、术语版本、素材清单、视频、ASRResult、adapter、热词与配置摘要、算法和格式策略身份，保存会话、逐集、租约准备 Job、六类组合轴、唯一公司目标、决定/策略事件、幂等命令、完成签名、不可变 release/SRT 和短时播放授权。
- `backend/src/modules/pre-review/` 以只读 `TermSourceService`、现有 Asset/Storage 和当前 ASRResult 为最小来源边界。租约 Worker 生成一对一、一公司多 ASR、多公司一 ASR、company-only、asr-only、uncertain 六类确定性对齐；缺 ASR 的集进入 limited。整剧/选中集/单条策略只更新系统决定，人工决定永不被覆盖。
- 六类人工动作与追加撤销使用不可变 DecisionEvent、条件版本和项目级幂等命令；来源摘要变化把旧会话置为只读 stale，历史条目/事件仍可读取。28 字、中文标点、标记/括号、空文本和视频时长等格式门禁参与完成签名，显式理由只覆盖可覆盖问题；全部集签名后在单事务生成不可变 release 和确定性 UTF-8 BOM/CRLF SRT，重复同键返回同一资源。
- 短时视频证据仅保存 PostgreSQL 授权摘要和只读对象键，过期前可重复读取；没有转码、上传或复制真实素材。专项首轮真实暴露 HTTP 查询/路径整数未接受 URL 字符串以及 ASR `configDigest/hotwordDigest` SQL 别名丢失，两处均已在契约/来源边界修正并由回归覆盖。
- 精确隔离空库 `qimao_back_m303a_20260814` 从零成功应用 20 个迁移。新鲜前置审改专项 4/4；连同术语和 ASR 上游回归共 3 文件 27/27；共享契约与后端构建、`check:repo`、`git diff --check` 全部退出码 0。本任务按约定未运行完整 `pnpm check`。
- 测试后项目、会话、命令、release、播放授权匿名数据计数均为 0；隔离库已按精确名称删除并确认残留 0，共享 PostgreSQL 仍可连接。未修改生产前端或 `DESIGN.md`，未接真实 AI/ASR/OCR、完整风险词库、时间轴编辑、转码、字幕验收、学习规则批准、系统控制台或云资源，未提交、推送或部署。
- `CURRENT.md` 从 v4-133 最小合并为 v4-134；任务转 `review / Current actor=规划对话`，FIFO 059 登记为 `notification_pending`。状态已写回；正式唤醒下一步只发送规划总线，不直接通知 UI/前端。
- 唤醒已发送：正式交接只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知 UI、前端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 059 完整消息位于规划最新 turn，目标状态为 `inProgress`；没有发送失败或重试。确认后在保留 UI v4-135 领取事实的基础上将 `CURRENT.md` 最小递增为 v4-136，FIFO 059 进入 `active`，后端停止修改并等待规划独立复验。

## 2026-08-14 — 规划独立审计退回 UI-M3-03 Rev 2

- 规划对照 `M3-pre-edit-workbench.md`、职责/等价矩阵、`DESIGN.md` 5.7、UI 验收记录、10 张交付截图和仓库外 `index.html/app.js/styles.css`。总体布局、来源条、组合轴上下文、唯一最终稿、基准三范围、格式事实、逐集门禁、来源失效、直接 MP4、失败恢复与响应式方向成立，未发现 OCR、字幕验收、交付或云资源越界。
- P1 业务正确性：原型 `showState(companyOnly/asrOnly)` 只改按钮文字，没有切换事件语义。仅公司稿仍可点击采用识别文本并把“没有可用识别轴”写入最终稿；仅识别场景的“补入/手动修改后补入”仍分别调用普通保留公司稿/采用 ASR 事件。`limited` 仅插入提示条，普通双源决定仍全部可用，与“只处理公司稿格式、不得伪装双源对照”冲突。
- P1 键盘可达性：文本基准对话框的焦点循环只枚举 `button:not(:disabled)`，从取消/确认会在关闭按钮间循环，作用范围和文本基准 radio 不能通过键盘到达；现有“Tab/Shift+Tab 闭环”证据没有覆盖实际表单控件。
- P1 完成路径：权威契约允许超 28 字台词“手动拆句、裁短或明确保留理由”，DESIGN/验收/原型只有修正文案和持续阻断，没有可审计的保留理由入口，合法长句会形成无完成路径。Rev 2 只补状态专属动作、有限审改限制、完整表单焦点闭环和理由事件；其余通过项冻结。
- 规划本轮唯一 Impeccable detector 返回 `[]`，但工具明确为缺 HTML 解析模块的正则降级，不能推翻上述人工代码审查。in-app Browser 拒绝本地 `file://` 原型且规划未绕过安全策略；本轮视觉审查使用交接中明确提供的 10 张证据，源代码审查补足动态行为。截图实际为 full-page 取证（1440 组约 `1430×1032`、1024 组约 `1014×1622/1632`），不把文件像素高度冒充视口高度；既有 DOM 测量只作为 UI 交接证据保留。
- `CURRENT.md` 从 v4-131 更新为 v4-132；FIFO 058 进入 `notification_pending`，`UI-M3-03` 更新为 Rev 2 `ready / Current actor=UI 设计对话 / Reviewer=规划对话`。`BACK-M3-03A` 继续其不重叠后端范围，`FRONT-M3-03B` 继续阻塞。
- 唤醒已发送：规划只向 UI 固定对话 `019ff52d-d4a1-7440-81a2-fc9c1b0a0996` 发送 Rev 2 正式退审，没有通知前端、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示完整退审消息位于 UI 最新 turn，任务状态为 `inProgress`；没有发送失败或重试。确认后 `CURRENT.md` 递增为 v4-133，FIFO 058 关闭，`UI-M3-03` Rev 2 记为 `in_progress`。

## 2026-08-14 — UI 完成 UI-M3-03 Rev 1 前置审改正式设计

- `DESIGN.md` 5.7 已替换旧的泛化描述，正式限定为公司 SRT、ASR、组合轴上下文和唯一最终稿；新增集/问题队列、六类渐进动作、文本基准人工保护、撤销与编辑脏态、格式门禁、完成本集进入下一未完成集、不可变待验收修订和来源变化只读恢复。
- 新增 `docs/ui/M3-pre-edit-acceptance.md`，覆盖正常、仅公司轴、仅 ASR 轴、有限审改、格式阻断、加载、空、失败、再次失败、提交中、本集/整剧完成，以及危险确认、键盘闭环、请求标识、唯一恢复和生产实现停止边界。
- 仓库外可操作原型及 10 张匿名证据位于 `m3-pre-edit-rev1`。真实浏览器实测 1440 根 `1430/1430`，1024 侧栏 204/72 两态均 `1014/1014`；基准/危险弹窗安全聚焦，脏态聚焦保存，提交中决定区获焦且 Tab 不逸出，决定和上下文动作全锁定，成功回 `role=status`；首次重读再次失败后聚焦唯一恢复，第二次恢复成功。新标签页关键交互及 1440/1024 控制台均 `error/warn=0/0`。
- Impeccable `detect` 返回 `[]`，但因本机缺少 HTML 解析模块仅执行正则降级扫描，验收文档已如实标注并以真实浏览器、DOM、键盘和人工截图审查作为主要证据；`node --check` 与授权文档 `git diff --check` 通过。
- 未修改生产 React、后端、迁移或共享契约，未扩展 OCR、完整风险、任意时间轴编辑、转码、字幕验收、交付、真实供应商或云资源。本轮临时 127.0.0.1 静态服务 PID 39764 已精确停止，浏览器临时视口已复位、标签已清理。
- `CURRENT.md` 从 v4-129 最小合并为 v4-130；`UI-M3-03` 保持 Rev 1 转 `review / Current actor=规划对话`，FIFO 058 进入 `notification_pending`。状态已写回；正式唤醒下一步只发送规划总线。
- 唤醒已发送：正式交接只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知前端、后端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示 FIFO 058 消息位于规划最新 turn，目标状态为 `inProgress`；没有发送失败或重试。`CURRENT.md` 随后最小递增为 v4-131，FIFO 058 进入 `active`，UI 停止修改并等待规划审核。

## 2026-08-14 — UI 领取 UI-M3-03 Rev 1 前置审改工作台设计

- 完整重读项目协议 v4.2、`CURRENT.md` v4-128、前置审改权威契约、职责矩阵“前置审改”行、本地等价矩阵对应五项能力、M3 冲刺、现有 `DESIGN.md` 与开发日志顶部；只读核对本地 `dual_srt.py`、`subtitle_review_workflow.py`、`subtitle_sop.py`、`evidence_player.py` 及旧 UI 补丁中的组合轴、六类决定、下一待处理、完成签名和视频定位行为。
- `CURRENT.md` 从 v4-128 最小合并为 v4-129；`UI-M3-03` 保持 Rev 1 `in_progress / Current actor=UI 设计对话`。设计读取为现有企业工作台的新增高频 Operate 表面，参数为低变化、低动效、高密度；旧桌面多窗口和固定按钮堆叠不作为网页结构。
- 本轮只修改 `DESIGN.md`、`docs/ui/M3-pre-edit-acceptance.md`、仓库外可操作原型/匿名证据和共享同步文件；不修改生产 React、后端、迁移或共享契约，不实现 OCR、完整风险词库、任意时间轴编辑、转码、字幕验收、交付、真实供应商或云资源。

## 2026-08-14 — 后端领取 BACK-M3-03A Rev 1 前置审改权威流程

- 完整重读项目协议 v4.2、`CURRENT.md` v4-126、前置审改权威契约、职责矩阵“前置审改”行、本地双应用等价矩阵对应能力、M3 冲刺及术语/ASR 契约，确认唯一后端执行项为 `BACK-M3-03A` Rev 1。
- `CURRENT.md` 从 v4-126 最小合并为 v4-127，任务转为 `in_progress / Current actor=后端开发对话`。本轮只实现共享契约、增量迁移、`backend/src/modules/pre-review/`、必要 Worker/短时只读播放边界和匿名后端回归；PostgreSQL 为唯一权威。
- 生产前端、`DESIGN.md` 和本地两个应用保持只读；不接真实 AI/ASR/OCR、完整风险词库、任意时间轴编辑、转码、字幕验收、学习规则批准、系统控制台或云资源，不运行完整 `pnpm check`，不提交、推送或部署。

## 2026-08-14 — PLAN-M3-03 确认并发布前置审改 UI/后端并行任务

- 用户确认采用规划推荐的 S3 方案。规划只读核对 `short-drama-terms-workbench` 的 README、V3.57、V3.79–V3.82 功能契约、`dual_srt.py`、`subtitle_review_workflow.py`、`subtitle_sop.py` 与 `evidence_player.py`，以及字幕验收应用的只读工作流边界；未修改、复制或运行两个本地应用和任何真实素材。
- 新增 `docs/contracts/M3-pre-edit-workbench.md`：保留公司稿为默认文本/专名/断句/时间轴基准，ASR 只作证据；保留一对一/一对多/多对一、公司-only/ASR-only、唯一目标公司轴、六类决定、完成签名、逐集导航、原始来源保护和人工学习事件门禁。云端优化为整剧/选中集/单条文本基准、PostgreSQL 权威恢复、条件版本/幂等、不可变决定与撤销、直接 MP4 seek、28 字长轴门禁和确定性待验收 SRT。
- 同步更新职责矩阵、功能等价矩阵和 M3 冲刺：S3 不吸纳 OCR、完整风险词库、时间轴编辑、360p/1080p 转码、最终字幕验收、规则批准或交付产品库；这些能力继续保留为后续必做项，不通过改名假装完成。
- `CURRENT.md` 更新为 v4-126；`PLAN-M3-03` 关闭，`UI-M3-03` 与 `BACK-M3-03A` 以不重叠文件范围解锁 `ready`，`FRONT-M3-03B` 保持依赖阻塞。状态已写回；规划接下来按 v4.2 分别主动唤醒 UI/后端并确认送达/运行态，不要求用户传话。
- 唤醒已发送：规划只向 UI 固定对话 `019ff52d-d4a1-7440-81a2-fc9c1b0a0996` 和后端固定对话 `019ff4de-084b-7002-a7eb-20ff93d97d0a` 发送各自正式 S3 任务，没有通知前端或要求用户传话。
- 送达/运行态已确认：`read_thread` 显示两条正式派发都位于目标最新 turn，UI 与后端状态均为 `inProgress`；没有发送失败或重试。后端随后已按协议领取并把 `CURRENT` 合并为 v4-127；规划在保留该领取事实后将闭环确认合并为 v4-128，UI 与后端并行执行，前端继续依赖阻塞。

## 2026-08-14 — 规划关闭 FRONT-M3-02D 与 S2.1 多剧 ASR

- 规划接受 UI 对正式 React + Fastify Wave B 的完整领域终验：23 部项目、22 条 Dispatch、服务端搜索/筛选/排序/分页、当前页与显式跨页选择、20 部竞态、部分接受、未知创建同一 ID 只读恢复、取消未知只读恢复、列表/详情 503、详情 pending 键盘闭环、1440/1024 侧栏两态及控制台均有真实证据；P0/P1/P2/P3=0。Impeccable 审计继续采用前一规划轮的 `18/20（Excellent）` 与检测 `[]`，本关闭门未修改 UI 或生产代码。
- 规划创建精确隔离数据库 `qimao_plan_s21_waveb_close_20260814`，以该 `DATABASE_URL` 新鲜运行完整 `pnpm check`：从零成功应用 19 个迁移，16 个测试文件 138 项全部通过，仓库边界、lint、类型检查以及共享契约/后端/前端构建全部通过；前端生产构建为 155 modules。
- 隔离库在删除前按精确名称核对，删除后残留计数为 0；共享 PostgreSQL `127.0.0.1:55432` 仍接受连接，未停止或改写 UI 保留的默认服务。没有提交、推送、部署、接真实供应商/网络/密钥/付费、购买服务器或创建云资源。
- `CURRENT.md` 更新为 v4-125，FIFO 057 与 `FRONT-M3-02D` 关闭，M3 S2/S2.1 正式完成；M3 冲刺和本地功能等价矩阵同步真实状态。下一阶段只开启 `PLAN-M3-03` 用户产品细化，不提前发布 UI、后端或前端任务。

## 2026-08-14 — UI 通过 FRONT-M3-02D Rev 4 正式 Wave B 完整领域终验

- 正式 React + Fastify 以独立数据库 `qimao_ui_front_m3_02d_rev4_20260814` 完成一次完整浏览器矩阵。项目中心实际覆盖 23 部匿名项目：服务端搜索、资格/项目状态、三类排序与分页；当前页选择、翻页/排序保留、成员变化清除、18 部显式全量选择和默认 23 部超过 20 上限；5 部混合确认实际为 `3 accepted / 2 blocked / 13 集 / 11 新建`，两类阻断原因与部分接受结果同屏。
- 创建响应未知使用“Fastify 已接收、响应返回前刷新”真实取证：页面重建后只显示原派发恢复入口，连续两次 `ASR_DISPATCH_NOT_FOUND / 404 / retryable=false / reload_asr`、关闭/重开仍保留同一 `dispatchGroupId`，第三次 GET 成功才清理；隔离计数为创建 POST 1、同一 ID GET 3。
- 员工中文识别任务实际覆盖 22 条匿名 Dispatch 的 `10 / 10 / 2` 服务端分页、搜索、接受/运行双筛选、行动优先/更新时间/创建时间排序、需对账/识别中/已取消、详情与质量/用量摘要。任务列表 503 显示原因、请求标识和唯一重读，加载中 `aria-busy` 与按钮禁用，恢复成功聚焦状态消息；空搜索保留唯一返回项目中心入口。
- 详情普通初始加载不抢焦点；人工重读稳定 503 后，pending 确定聚焦 drawer，关闭/重读禁用，Tab/Shift+Tab/Escape 不离开语境，真实成功后焦点落“关闭任务详情”。取消确定路径由 Fastify 成功后投影已取消；取消未知使用同源一次性响应丢失，正式 UI 锁定关闭和第二次 POST、聚焦唯一只读恢复，GET 同一 Dispatch 后进入 cancelled，取消 POST 计数为 1。
- 响应式实测：项目中心 1440 根 `1430/1430`、1024 展开 `1014/1014 + 表格 744/1080`、收起 `1014/1014 + 876/1080`；任务页 1440 根 `1440/1440`、1024 展开 `1024/1024 + 754/1120`、收起 `1024/1024 + 886/1120`。根页面均无横溢，表格横滚只在容器。最终控制台真实 `error/warn=0/0`；P0/P1/P2/P3=0。
- 证据追加到 `docs/ui/M3-asr-dispatch-acceptance.md` 第 9 节；10 张匿名截图保存在仓库外 `front-m3-02d-rev4`。没有修改生产前端、后端、迁移、共享契约或 DESIGN，没有运行完整 `pnpm check`、提交、推送或部署。
- 精确清理已完成：本轮 3002/3020/3021 服务停止，隔离数据库删除并核对残留 0，临时 seed/代理/Vite 配置、flag 与日志删除；他人 3001 和共享 PostgreSQL 55432 保持监听。`CURRENT.md` 从 v4-122 最小合并为 v4-123，任务保持 Rev 4 `review` 并转 `Current actor=规划对话`，FIFO 057 进入 `notification_pending`。状态已写回；正式唤醒随后只发送给规划总线。
- 唤醒已发送：规划固定对话已收到 FIFO 057 正式交接。送达/运行态已确认：`read_thread` 显示该消息位于规划最新 turn，目标状态为 `inProgress`；没有发送失败或重试。确认后 `CURRENT.md` 递增为 v4-124、FIFO 057 进入 `active`，UI 不再继续修改或自行运行规划关闭门。

## 2026-08-14 — UI 领取 FRONT-M3-02D Rev 4 正式 Wave B 领域终验

- 完整重读项目 `AGENTS.md`、`WORKFLOW.md` v4.2、`CURRENT.md` v4-121、`DESIGN.md` 5.5 Wave B、正式多剧 UI 验收、Dispatch 契约、开发日志顶部及 `AsrProjectDispatch`、`AsrDispatches` 和现行样式；使用 Impeccable audit 的 Operate 模式核对权威状态、键盘闭环、错误恢复、紧凑表格与响应式滚动归属。
- `CURRENT.md` 从 v4-121 最小合并为 v4-122；任务保持 Rev 4 `review / Current actor=UI 设计对话` 并明确进入执行。本轮只用正式 React + Fastify + 精确隔离匿名数据完成 Wave B 唯一一次完整浏览器矩阵；Rev 2 原型与 Wave A 证据冻结。
- 允许写入仅限 `docs/ui/M3-asr-dispatch-acceptance.md`、同步文件、开发日志和仓库外匿名证据。不得修改生产前后端、迁移、共享契约或 DESIGN，不运行完整 `pnpm check`，不接真实供应商、网络、密钥、付费、系统控制台或 OCR，不提交、推送或部署。

## 2026-08-14 — 规划通过 FRONT-M3-02D Rev 4 并路由正式 UI 终验

- 规划核对 `AsrProjectDispatch`、`AsrDispatches`、真实后端 `asrNotFound` 语义与两份 Rev 4 回归：未知创建的 recovery GET 不再根据错误状态清除句柄，连续两次真实 `ASR_DISPATCH_NOT_FOUND / 404 / retryable=false / reload_asr` 后仍保留同一 ID；关闭/重开、组件卸载/页面重建继续只 GET 原 ID，成功后才清理，创建 POST 严格 1 次。伪“确定不存在”分支和回归已删除。
- Dispatch 详情仅在本次人工重读意图存在且 fetching 时聚焦可编程 drawer；既有 pending handler 阻断 Tab/Shift+Tab/Escape，关闭按钮、遮罩和重复读取均受锁定。可控延迟回归直接覆盖 pending drawer 焦点、再次失败回唯一重读、成功回关闭按钮；普通初始加载和无错误后台刷新没有焦点意图。
- 规划新鲜运行多剧专项 2 文件 12/12、前端 TypeScript、Vite 生产构建 `155 modules transformed` 和 `git diff --check`，全部通过。按既定边界没有重复运行 Impeccable；同一根因的既有检测 `[]` 与本轮人工复核合并后，技术审计评分为 `18/20（Excellent）`，P0=0、P1=0，未新增 P2/P3。
- `CURRENT.md` 从 v4-119 更新为 v4-120；`FRONT-M3-02D` 保持 Rev 4 `review` 并转 `Current actor/Reviewer=UI 设计对话`。UI 只做本切片唯一一次正式 React 完整领域终验，不修改生产代码；完整 `pnpm check` 留 UI 通过后的规划关闭门。
- 状态已写回：`CURRENT.md` v4-120 与本日志登记规划通过结论、UI 终验范围和停止边界。唤醒已发送：规划只向 UI 固定对话 `019ff52d-d4a1-7440-81a2-fc9c1b0a0996` 发送正式终验消息，没有要求用户或前端传话。送达/运行态已确认：`read_thread` 显示该消息位于 UI 最新 turn，目标状态为 `inProgress`；未发生发送失败或重试。确认后 `CURRENT.md` 递增为 v4-121，FIFO 056 关闭，UI 终验继续异步执行。

## 2026-08-14 — FRONT-M3-02D Rev 4 真实 404 与详情重读焦点修正完成

- 未知创建恢复不再把 `404 && !retryable` 解释为“确定不存在”，也删除了相应伪契约提示；真实后端 `ASR_DISPATCH_NOT_FOUND / 404 / retryable=false / action=reload_asr` 连续两次返回后，会话级句柄仍保存原预生成 `dispatchGroupId`。关闭/重开、卸载并重建页面后继续只 GET 同一 ID，只有成功读取同一 Dispatch 才清理句柄，创建 POST 全程恒为 1 次。
- Dispatch 详情的人工重读意图进入 pending 后，由 DOM 提交阶段确定聚焦既有可编程 drawer；现有 pending 键盘处理继续阻止 Tab/Shift+Tab/Escape 逃逸，关闭、遮罩和重复读取均锁定。再次失败聚焦唯一重读按钮，成功聚焦既有关闭按钮；普通初始加载与无人工意图的后台刷新不触发该焦点路径。
- 回归删除“真实形态 404 清句柄”的伪契约用例，改用正式后端错误形态覆盖连续 GET、关闭/重开、卸载/刷新、同一 ID 和单次 POST；详情可控延迟回归直接覆盖 pending drawer 获焦、双向 Tab/Escape/遮罩锁定、防重复、再次失败和成功焦点。
- 新鲜验证结果：多剧专项 `ProjectCenter.test.tsx` 与 `AsrDispatches.test.tsx` 为 2 文件 12/12；前端 TypeScript 退出码 0；Vite 生产构建 `155 modules transformed`；`git diff --check` 退出码 0。按规划本轮不重复 Impeccable 定向扫描，不运行完整 `pnpm check`。
- 范围保持在两个多剧生产 TSX 与对应两个测试；未修改 CSS、后端、迁移、共享契约、`DESIGN.md` 或单剧 ASR，未提交、推送或部署。
- 状态已写回：`CURRENT.md` 从 v4-117 更新为 v4-118，任务转 `review / Current actor=规划对话`，登记 FIFO 056；送达证据确认后同步版本递增为 v4-119。唤醒已发送：只向规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c` 发送正式审核消息，没有直接通知 UI。送达/运行态已确认：`read_thread` 显示 FIFO 056 消息位于规划最新 turn，目标状态为 `inProgress`；没有发送失败或重试，FIFO 056 更新为 `active`，等待规划独立审核与统一路由。

## 2026-08-14 — 规划根因审计退回 FRONT-M3-02D Rev 4

- 规划独立复跑 Rev 3 多剧专项 2 文件 13/13、前端 TypeScript、Vite 生产构建 `155 modules transformed`、本轮唯一一次 Impeccable 定向检测 `[]` 和 `git diff --check`，全部通过。代码核对确认会话级创建句柄、关闭/重开/刷新只读恢复、取消未知态锁定、全集响应重验及四类人工恢复主体均已实现，改动范围没有越过两个多剧 TSX 与对应测试。
- 实现完整性 P1：真实后端 `asrNotFound('ASR_DISPATCH_NOT_FOUND', ...)` 固定返回 `404 / retryable=false / action=reload_asr`；前端恢复仓储却把 `404 && !retryable` 解释为“确定不存在”，清除会话句柄并重新开放创建。权威 `M3-asr-bulk-dispatch.md` 第 42 行明确任何暂时 404 都必须保留同一 `dispatchGroupId`，不得据此创建第二个 Dispatch；Rev 3 测试使用后端不存在的 `retryable=true 404` 证明保留，又用真实形态证明清理，因而测试与正式 API 语义相冲突。裁决不改后端：任何详情 404 都继续保留句柄和唯一 GET，只有成功读取同一 Dispatch 才自动清理。
- 可访问性 P1：Dispatch 详情错误块的重读按钮在 `detail.isFetching` 后被替换为禁用按钮，同时关闭按钮也禁用；现有 effects 没有在 pending 时聚焦 `detailPanel`。真实浏览器可能把焦点落到 `body`，此后 drawer 的 Tab/Escape handler 无法约束焦点。Rev 4 只在详情人工重读 pending 时聚焦可编程 drawer，并补可控延迟 DOM 回归；错误恢复仍回唯一重读，成功仍回关闭按钮。
- Impeccable 技术审计评分为 `16/20（Good）`：Accessibility 3、Performance 4、Responsive 4、Theming 3、Implementation Integrity 2；P0=0、P1=2、P2/P3 不新增。机械检测 `[]` 是正面证据，但不能覆盖跨前后端错误语义和真实动态焦点，故本轮不得送 UI。
- `CURRENT.md` 从 v4-115 更新为 v4-116，任务递增为 Rev 4 `ready / Current actor=前端开发对话`，FIFO 055 先保持 `notification_pending`。后端、迁移、共享契约、DESIGN、CSS、单剧 ASR及 Rev 3 其他通过项全部冻结。
- 状态已写回：`CURRENT.md` v4-116 与本日志登记两个根因和 Rev 4 停止边界。唤醒已发送：规划只向前端固定对话 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf` 发送正式 Rev 4 领取消息。送达/运行态已确认：`read_thread` 返回该消息位于最新 turn，状态为 `inProgress`；没有发送失败或重试。确认后 `CURRENT.md` 递增为 v4-117、任务记为执行中并关闭 FIFO 055。

## 2026-08-14 — FRONT-M3-02D Rev 3 多剧异步恢复收口完成并交规划

- 创建未知结果新增只保存预生成 `dispatchGroupId` 的会话级最小恢复句柄，不缓存项目集合、幂等键或业务状态；关闭/重开和页面刷新后都只允许 GET 同一资源，不扫描列表或再次创建。恢复成功与确定不存在分别清理句柄；回归覆盖关闭/重开、卸载后重建页面、临时 404 继续读取、确定 404 清理，以及创建 POST 恒为 1。
- 取消未知结果期间禁用“暂不取消”和确认动作，Escape/遮罩均不能关闭，焦点确定落到唯一“重新读取取消结果”；恢复中锁定重复激活，再次失败保留原因/请求标识和恢复焦点，读取到未应用状态仍只允许继续读取，确认取消已保存后聚焦既有成功状态消息，取消 POST 恒为 1。
- 显式“选择全部”改为受控 mutation：首次读取、稳定/再次失败、请求标识、唯一恢复、重复激活锁定和成功反馈均有确定 DOM 状态；响应返回后重新核验 `total <= 20`、条目数量等于 total、项目 ID 唯一，超限或集合不完整不形成伪全选。项目资格列表/批量确认、Dispatch 列表/详情四类人工读取同样补齐恢复中锁定、防重复、再次失败按钮焦点和成功后确定落点；普通初始成功与无错误后台刷新没有聚焦意图。
- 新鲜验证结果：多剧专项 `tests/frontend/ProjectCenter.test.tsx` 与 `tests/frontend/AsrDispatches.test.tsx` 为 2 文件 13/13；前端 TypeScript 退出码 0；Vite 生产构建 `155 modules transformed`；本轮唯一一次 Impeccable 定向检测返回 `[]`；`git diff --check` 退出码 0。按规划未运行完整 `pnpm check`。
- 范围保持在 `AsrProjectDispatch.tsx`、`AsrDispatches.tsx` 与对应两个测试文件，没有修改 CSS、后端、迁移、共享契约、`DESIGN.md` 或单剧 ASR，没有接真实供应商/网络/密钥/付费/系统控制台/OCR，没有提交、推送或部署。
- 状态已写回：`CURRENT.md` 从 v4-113 更新为 v4-114，任务转 `review / Current actor=规划对话`，登记 FIFO 055；送达证据确认后同步版本递增为 v4-115。唤醒已发送：只向规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c` 发送正式审核消息，没有直接通知 UI。送达/运行态已确认：`read_thread` 显示 FIFO 055 消息位于规划任务最新 turn，目标状态为 `inProgress`；没有发送失败或重试，FIFO 055 更新为 `active`，等待规划独立审核与统一路由。

## 2026-08-14 — 规划退回 FRONT-M3-02D Rev 3 一次性异步恢复收口

- 规划按 Impeccable audit 规则核对正式 `AsrProjectDispatch`、`AsrDispatches` 与两个现有前端回归。新鲜执行多剧专项 2 文件 8/8、前端 TypeScript、Vite 生产构建 `155 modules transformed`、Impeccable 定向检测 `[]` 和 `git diff --check` 全部通过；机械检测和既有测试证明当前主链路可构建，但不能覆盖后续动态状态缺口。
- 创建结果未知时，确认面板已允许在非 pending 阶段关闭；再次打开会清空 `createIntent`、未知状态和原 `dispatchGroupId`，下一次提交会生成新 ID/新幂等键并发送第二个创建 POST。取消结果未知同样可由“暂不取消”/Escape/遮罩关闭，`closeCancel` 会清空 `cancelIntent`，重新打开后可再次 POST。两者均违反已确认的“未知结果只读取同一资源、命令 POST 始终 1 次”，属于送 UI 前必须阻断的 P1。
- 同源审查还确认：全集选择使用裸 `async` 点击处理，没有提交中锁定、稳定失败/请求标识/唯一恢复、再次失败或恢复成功焦点，并且只在发请求前检查一次 20 部上限；项目资格列表/确认和 Dispatch 列表/详情的读取恢复也没有一致覆盖恢复中重复激活锁定、再次失败保留和成功后确定焦点。现有 8 项回归没有覆盖上述关闭/重开、竞态和恢复焦点场景。
- `CURRENT.md` 从 v4-111 更新为 v4-112，`FRONT-M3-02D` 递增为 Rev 3 `ready / Current actor=前端开发对话`。允许范围仅为两个多剧页面、对应两个回归文件及必要的现有模块样式；后端、迁移、共享契约、DESIGN、单剧 ASR、已通过视觉/响应式与业务状态冻结。
- 状态已写回：`CURRENT.md` v4-112 与本日志登记 Rev 3 范围，FIFO 054 先保持 `notification_pending`。唤醒已发送：规划向前端固定对话 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf` 发送正式 Rev 3 领取消息。送达/运行态已确认：`read_thread` 返回该消息位于最新 turn，状态为 `inProgress`；没有发送失败或重试。证据确认后 `CURRENT.md` 递增为 v4-113、任务记为执行中并关闭 FIFO 054。

## 2026-08-14 — 用户要求跨角色交接强制主动唤醒与送达确认

- 用户指出只写 `CURRENT` 而未主动唤醒接收对话会造成隐性等待，要求长期强制执行三段闭环：状态/日志先写回；只向规划总线或 `CURRENT` 指定接收对话发送正式唤醒；再用 `read_thread`/`wait_threads` 确认消息已出现且目标进入 `inProgress` 或明确回执。发送失败或未唤醒必须立即重试，不能要求用户传话。
- `AGENTS.md` 与 `docs/WORKFLOW.md` 已更新，协议从 v4.1 升为 v4.2；明确 Owner/Reviewer 负责唤醒规划，规划负责唤醒 Reviewer、返工 Owner和下一角色，FIFO 只有在送达/运行态确认后才能关闭。交接完成汇报必须分别写明“状态已写回、唤醒已发送、送达/运行态已确认”。
- `CURRENT.md` 从 v4-109 更新为 v4-110，并登记 FIFO 054 `active`。本次协议同步不修改生产代码、不重跑 `FRONT-M3-02D` 已有业务测试或构建；规划的代码与 Impeccable 审计继续进行。
- 状态已写回：`AGENTS.md`、`docs/WORKFLOW.md` v4.2、`CURRENT.md` v4-110 和本日志均已更新。唤醒已发送：规划分别向 UI、后端、前端三个固定对话发送“仅确认接收”的正式同步。送达/运行态已确认：`read_thread` 显示 UI 与后端目标任务均为 `inProgress`，前端任务已完成并明确回复“已接收 v4.2 并将执行”；三处均未修改业务文件或自选任务，未发生发送失败。本次送达证据写回后 `CURRENT.md` 递增为 v4-111。

## 2026-08-14 — FRONT-M3-02D Rev 2 多剧 Wave B 前端完成并交规划

- 新增独立 Wave B 前端模块：项目中心改为消费服务端资格搜索、资格/项目状态筛选、行动优先/更新时间/名称排序和分页，支持逐行、当前页、显式跨页全选及 20 部上限；批量确认重新读取服务端资格，分别展示提交前 canCreate/blocked 与提交后 accepted/blocked，不在浏览器复制门禁。既有项目查询仅补充回收所需 `version`，项目创建/回收成功会同步刷新资格投影。
- 每个新建派发意图只生成一次规范化项目集合、随机 `dispatchGroupId` 与幂等键。首次创建 POST 只发送一次；网络未知后只 GET 同一预生成 ID，临时 404 显示“派发尚未确认”并保留唯一重新读取，读取再次失败继续显示本次 GET 的原因和请求标识，不扫描列表或重发创建。成功结果展示后端持久化的首次创建 `requestId` 并获得确定焦点。
- 全局 AppShell 新增“作业 / 中文识别任务”正式入口。员工页消费 Dispatch 服务端搜索、acceptance/execution 双筛选、行动优先/更新时间/创建时间排序、分页、项目/质量/用量汇总和持久创建请求标识；详情保留 accepted/blocked、子批次事实和唯一项目级动作。取消确认覆盖初始安全焦点、pending 容器焦点与键盘锁定、确定失败同幂等键显式重试、未知结果只读详情恢复和成功状态聚焦。
- 定向行为回归 `tests/frontend/ProjectCenter.test.tsx` 与 `tests/frontend/AsrDispatches.test.tsx` 共 8/8，通过服务端查询、选择层级、创建 POST 恒为 1、404 再读、读取失败 requestId、恢复焦点、回收 pending、取消确定/未知结果、单次取消和同键重试。前端 TypeScript 退出码 0；Vite 生产构建 `155 modules transformed`；本轮唯一一次 Impeccable 定向检测返回 `[]`；`git diff --check` 退出码 0。
- 本轮未运行完整 `pnpm check`，留正式 UI 终验关闭门。未修改后端、迁移、共享契约、DESIGN 或已冻结的单剧 ASR；未接真实供应商、网络、密钥、付费、系统控制台或 OCR，未提交、推送或部署。`CURRENT.md` 从 v4-108 更新为 v4-109，任务转 `review / Current actor=规划对话`，只通知规划总线，不直接通知 UI。

## 2026-08-14 — 前端领取 FRONT-M3-02D Rev 2 并完成异步预检

- 重读项目协议 v4.1、`CURRENT.md` v4-107、S2.1 多剧契约、`DESIGN.md` 5.5 Wave B、正式 UI 验收、新共享 ASR 契约和开发日志顶部，确认 `BACK-M3-02F` 已关闭且唯一前端执行项为 `FRONT-M3-02D` Rev 2。
- 按 v4.1 对资格/列表/详情读取、创建和取消逐项预检加载、稳定失败、请求标识、唯一恢复、再次失败、恢复焦点和关闭恢复。创建意图固定一组规范化项目 ID、一个预生成 `dispatchGroupId` 和一个幂等键；未知响应后只读取该 ID，临时 404 继续显示尚未确认且不重发 POST。取消未知结果同样只重读详情，不重发取消命令。
- 项目中心 ASR 资格与选择只由服务端资格投影驱动；现有项目查询仅保留为回收操作补充契约缺少的 `version`，不成为第二套资格或派发状态。未发现新的上游契约冲突，单剧 ASR 行为继续冻结。
- `CURRENT.md` 从 v4-107 更新为 v4-108，任务转 `in_progress / Current actor=前端开发对话`。本轮不修改后端、迁移、共享契约或 DESIGN，不接真实供应商、网络、密钥、付费、系统控制台或 OCR，不运行完整 `pnpm check`。

## 2026-08-14 — 规划独立复验通过 BACK-M3-02F 并恢复多剧前端

- 规划核对共享 schema、增量迁移、路由/service、Dispatch 事务和回归：预生成 `dispatchGroupId` 被规范化并进入请求摘要；幂等键锁与资源 ID 锁按确定顺序获取；同键异 ID、同 ID 异键分别返回稳定冲突；首次创建 `requestId` 只在新建时写入，同键重放不覆盖；未创建 ID 的详情 GET 只返回 404，不写 Dispatch、命令或子结果。
- 规划新建精确隔离库 `qimao_plan_m302f_20260814`，从零成功应用全部 19 个迁移；新鲜运行 `tests/backend/asr.test.ts` 与 `tests/backend/asr-dispatch-rev2.test.ts` 为 2 文件 20/20，通过共享契约构建、后端生产构建、`check:repo` 和 `git diff --check`。测试同时证明一次 POST 后按已知 ID 恢复同一 Dispatch/子批次、列表/详情请求标识一致及响应不含幂等键。
- 本轮隔离库已精确删除并确认残留 0；默认 PostgreSQL 保持运行，规划未清理或停止默认库。后端提供的 7005 down→历史行→up 回填证据与迁移代码一致，本轮不机械重复完整 `pnpm check`。
- `CURRENT.md` 从 v4-106 更新为 v4-107，FIFO 053 与 `BACK-M3-02F` 关闭；`FRONT-M3-02D` 递增为 Rev 2 `ready / Current actor=前端开发对话`，只消费新契约完成多剧 Wave B，未知响应不得重发 POST 或扫描列表。完整质量门留正式 UI 终验关闭，不接真实供应商、密钥、付费、系统控制台或 OCR。

## 2026-08-14 — BACK-M3-02F Rev 1 Dispatch 已知 ID 恢复完成并交规划

- `CreateAsrDispatchGroupBody` 现在必填客户端预生成 UUID `dispatchGroupId`；仓储将规范化 ID、项目集合和 `allowPartial` 一起纳入请求摘要，并以该 ID 显式写入 PostgreSQL。创建同时按幂等键与资源 ID 取得确定顺序的事务级 advisory lock：同键异资源稳定返回 `ASR_DISPATCH_IDEMPOTENCY_KEY_REUSED`，同资源异键稳定返回 `ASR_DISPATCH_GROUP_ID_REUSED`，两者都不创建第二条 Dispatch、命令或项目子批次。
- 新增第 19 个迁移，为 `asr_dispatch_groups` 增加非空 `request_id`。新建只保存首次 Fastify `request.id`，同键重放只读取已有 Dispatch、不覆盖；Summary/Detail 统一返回该稳定标识，列表通过既有详情投影得到同一值。历史行使用 `legacy-dispatch:<dispatch-id>` 确定性回填并有非空/长度约束；普通响应、URL和读取契约不包含幂等键。
- 未增加任何恢复端点。预生成 ID 的既有详情 GET 在记录尚不存在时返回稳定 404 且不会创建 Dispatch、命令或子结果；等价响应丢失回归只发送一次创建 POST，随后按预生成 ID GET 恢复同一 Dispatch、子批次和首次 `requestId`。另覆盖列表/详情/刷新一致、同键重放不覆盖、两类冲突、缺少资源 ID 校验和幂等键不泄露。
- 首次从零迁移运行真实暴露 `node-pg-migrate` 单列 API 形态不兼容并回滚，本轮随即改用仓库既有 `addColumns` 形式；随后同一精确隔离空库成功从零应用全部 19 个迁移。新鲜执行 `tests/backend/asr.test.ts` 与 `tests/backend/asr-dispatch-rev2.test.ts` 共 20/20，共享契约构建、后端生产构建、`check:repo` 和 `git diff --check` 均通过。
- 在业务数据归零后，隔离库实际执行最新迁移 down，插入一条匿名历史 Dispatch，再 up；读取结果为 `legacy-dispatch:11111111-1111-4111-8111-111111111111` 且非空，迁移数恢复 19。随后删除匿名行，只删除本轮精确隔离库 `qimao_back_m302f_20260814` 并确认无残留；默认 PostgreSQL 保持运行，未清理默认业务数据。
- 本轮未运行完整 `pnpm check`，未修改生产前端或 DESIGN，未接真实供应商、SDK、网络、密钥、付费、系统控制台或 OCR，未重写资格、列表查询语义、调度、取消或单剧 ASR，未提交、推送或部署。`CURRENT.md` 从 v4-105 更新为 v4-106，任务转 `review / Current actor=规划对话`，登记 FIFO 053；只通知规划总线，不自行解锁前端。

## 2026-08-14 — 后端领取 BACK-M3-02F Rev 1 Dispatch 已知 ID 恢复修正

- 完整重读项目协议 v4.1、`CURRENT.md` v4-104、多剧 Dispatch 契约第 3/8 节、正式 DESIGN/UI 验收中的创建单请求与未知结果恢复规则，以及开发日志顶部；确认本轮只处理前端预生成资源 ID、首次服务端请求标识持久化和对应稳定冲突。
- `CURRENT.md` 更新为 v4-105，任务转 `in_progress / Current actor=后端开发对话`。允许范围仅为共享 ASR TypeBox、一个增量迁移、Dispatch 后端与对应后端测试；不改生产前端或 DESIGN，不新增列表猜测/幂等键恢复端点，不重写资格、查询、调度、取消或单剧 ASR，不接真实供应商、网络、密钥、付费、系统控制台或 OCR，不运行完整 `pnpm check`。

## 2026-08-14 — 规划确认 FIFO 052 并裁决 Dispatch 已知 ID 恢复

- 规划交叉核对 `DESIGN.md` 268、UI 验收 69/73/102/176、共享 `asr.ts`、正式路由、Dispatch 仓储和建表迁移，确认前端异议成立：当前创建成功前浏览器不知道 groupId，响应丢失后既不能按已有 GET 恢复，也不能刷新后显示首次创建请求标识；按列表猜测或重发 POST 均违反已确认权威来源/单次创建语义。
- 裁决采用创建前已知资源 ID：前端首次提交前生成一个随机 UUID `dispatchGroupId`，创建 body 携带该 ID，后端显式写入并纳入幂等摘要。未知响应后只对该 ID 调用既有详情 GET；暂时 404 继续保留同一意图和唯一重新读取，不扫描列表、不重发创建。该 UUID 只是资源标识，不成为浏览器业务状态。
- 后端同时持久化首次创建的服务端 `requestId`，列表/详情稳定返回且幂等重放不覆盖；幂等键不进入 URL、员工页面或响应。`M3-asr-bulk-dispatch.md` 已同步，UI 的视觉和请求计数语义不变。
- `CURRENT.md` 从 v4-103 更新为 v4-104，FIFO 052 关闭；新增 `BACK-M3-02F` Rev 1 `ready / Current actor=后端开发对话`，只补共享契约、一个增量迁移、Dispatch 后端与定向回归。`FRONT-M3-02D` 继续冻结等待后端规划复验，不要求用户传话。

## 2026-08-14 — FRONT-M3-02D Rev 1 编码前预检发现 Dispatch 未知结果恢复契约冲突

- 完整重读项目协议 v4.1、`CURRENT.md` v4-102、S2.1 多剧契约、`DESIGN.md` 5.5 Wave B、UI 完整验收记录、共享 ASR TypeBox、正式路由及开发日志顶部；按第 13 节先对资格读取、创建、任务读取和取消执行异步状态转换预检。本轮未修改生产前端或前端测试。
- 冲突类型：UI/交互与共享代码契约、未知结果权威恢复。已确认 UI 在 `M3-asr-dispatch-acceptance.md` 69/73/176 和 `DESIGN.md` 268 要求创建未知响应后保留同一意图，只通过“重新读取同一 Dispatch”恢复，创建 POST 计数保持 1，不得以刷新名义重发创建。
- 可复现证据：`POST /api/asr/dispatch-groups` 的 body 不接收客户端 groupId，只有 200/201 成功体返回 `AsrDispatchGroupDetail.id`；网络在服务端落库后、前端收到响应前中断时，浏览器没有 groupId。现有只读路由只有 `GET /api/asr/dispatch-groups/:groupId`，共享契约和路由没有按 `Idempotency-Key`/意图读取命令结果的端点。仓储确实保存 `idempotency_key → dispatch_group_id`，但该事实没有可供前端消费的契约。按项目集合、时间或列表扫描匹配会产生猜测和竞态；同键重发 POST 虽可幂等重放，但直接违反当前“创建请求仍为 1 次/不得重发创建”验收。
- 同源补充：UI 验收 102 行要求详情顶部持久显示请求标识，但 `AsrDispatchGroupSummary/Detail` 没有 requestId 字段；错误响应里的 Fastify requestId 只在该次错误可见，不能作为刷新后的 Dispatch 事实。影响范围为批量创建未知结果、刷新恢复、详情身份和首次送 UI 的完整异步矩阵；资格搜索、列表查询和取消端点本身未发现字段冲突。
- 最小建议：由后端新增按稳定幂等意图只读恢复同一 Dispatch 的共享契约/GET，并让详情返回可刷新恢复的请求标识；或由规划与 UI 明确把同键 POST 重放定义为恢复并修改“请求始终 1 次”的验收。前端不能在现有边界内自行选择。`CURRENT.md` 从 v4-102 更新为 v4-103，任务保持 Rev 1 并转 `blocked / Current actor=规划对话`，登记 FIFO 052；等待规划一次性裁决，不通知 UI，不提交、推送或部署。

## 2026-08-14 — 规划关闭单剧 ASR Wave A 并解锁多剧前端

- FIFO 051 的两处真实焦点复验均通过：preparation/hotwords 从真实 `503` 经唯一人工重读恢复后，各自关闭按钮获焦、焦点仍在 dialog 内且真实 Tab 不离开面板；P0/P1=0。规划接受结果并关闭 `FRONT-M3-02B` Rev 4，Rev 3 其余完整矩阵继续冻结。
- 规划使用精确隔离数据库 `qimao_plan_s21_close_20260814` 新鲜运行一次完整 `pnpm check`：18 个迁移成功，15 个测试文件 131 项全部通过，仓库检查、lint/typecheck、前端 150 模块生产构建、后端与共享契约构建全部通过。隔离数据库随后已删除。
- 规划执行 `pnpm run db:stop` 成功停止本地 PostgreSQL；紧随其后的状态命令以退出码 1 表示“未运行”，与停止后的预期状态一致，不属于质量失败。
- `CURRENT.md` 从 v4-101 更新为 v4-102，FIFO 051 关闭。当前关闭的是单剧 ASR / Wave A，而非整个 S2.1；`FRONT-M3-02D` Rev 1 已按 v4.1 同轮解锁，下一步只做项目中心多剧派发和员工中文识别任务列表/详情，不接真实供应商、密钥、付费、系统控制台或 OCR。

## 2026-08-14 — UI 通过 FRONT-M3-02B Rev 4 两处真实焦点复验并交规划

- preparation 与 hotwords 各经过两次真实 `503`（覆盖一次自动重试）稳定显示原请求失败；人工点击各自唯一重读后均只转发一次原查询并恢复成功。隔离代理最终计数两端点均为 `injected=2 / forwarded=1`。
- preparation 成功态焦点为“关闭新建批次”，hotwords 成功态焦点为“关闭本批次热词证据”；两处 `dialog.contains(document.activeElement)=true`，随后真实 Tab 操作仍留在各自面板语境。定向结论通过，P0/P1=0；Rev 3 其余请求、业务、视觉、响应式、控制台和完整矩阵继续冻结，未新增截图。
- 按协议 v4.1 微返工快车道只回传两处结论：`CURRENT.md` 从 v4-100 最小合并为 v4-101，任务保持 Rev 4 `review` 并转 `Current actor=规划对话`，登记 FIFO 051；不修改生产代码，不自行 done 或解锁多剧前端。
- 本轮 3000/3001/3002 隔离服务已按端口和命令行精确停止；隔离数据库 `qimao_ui_front_m3_02b_rev4_20260814`、本轮代理/夹具/运行目录均已删除并确认数据库残留为 0。共享 PostgreSQL `127.0.0.1:55432` 保持监听，未清理或停止他人资源。

## 2026-08-14 — 用户确认协作协议 v4.1 加速规则

- 规划复盘 S2.1 近期交接，区分必要的权威接口补齐与可提前发现的错误恢复/动态焦点缺口。用户确认在不降低 P0/P1、规划总线和完整切片质量门的前提下优化协作与对接。
- `docs/WORKFLOW.md` 升级为 v4.1：新增最多 2 文件且不改接口/迁移/业务状态/视觉方向的微返工快车道；首次送 UI 前强制覆盖异步加载、失败、请求标识、唯一恢复、重试中、再次失败、恢复成功焦点和关闭恢复；每切片只做一次完整正式浏览器矩阵，返工后只增量复验；原始失败经一次修复仍失败时停止第三个局部补丁并做根因审查。
- 阶段简报增加“按完整内部可用版计算的完成比例”，明确同步版本/FIFO 只是协作事件，不是产品版本；规划可提前写好下一任务的 blocked 输入，在当前切片通过和完整质量门关闭的同一次写回中自动解锁并通知。`AGENTS.md` 与 `CURRENT.md` 已同步，协议为 v4.1、同步版本为 v4-100。当前 UI 两处真实焦点复验继续运行，不扩大或重做范围。

## 2026-08-14 — UI 领取 FRONT-M3-02B Rev 4 两处真实焦点复验

- 重读项目协议、`CURRENT.md` v4-098、Rev 3 终验段与开发日志顶部，确认本轮唯一范围是 preparation/hotwords 两个真实 503 的恢复成功焦点闭环；Rev 3 其余请求、业务、视觉、响应式、控制台和完整矩阵证据全部冻结。
- `CURRENT.md` 更新为 v4-099，任务保持 Rev 4 `review / Current actor=UI 设计对话`。只允许更新 UI 验收记录、同步文件与仓库外匿名证据；不修改生产代码，不运行整套自动化，不通知前端或解锁多剧任务。

## 2026-08-14 — 规划通过 FRONT-M3-02B Rev 4 并只路由两处真实焦点复验

- FIFO 050 源码核对确认 `NewBatchPanel` 与热词 `EvidencePanel` 使用彼此独立的一次性恢复焦点意图：只有错误块人工重读置位；对应 query success、非 fetching 且面板仍挂载时由 `useLayoutEffect` 在 DOM 提交阶段聚焦既有关闭按钮并清除。普通初始 success、无错误后台刷新和质量/对账面板没有触发条件。
- 两条可控延迟回归从唯一重试按钮获焦开始，恢复后分别断言关闭按钮获焦和 dialog 包含 `document.activeElement`，同时保留原请求次数、热词不增加详情请求、请求标识和业务恢复断言。规划新鲜单剧专项 1 文件 12/12、TypeScript、Vite `150 modules transformed`、Impeccable 定向检测 `[]` 与 `git diff --check` 全部通过，未运行完整质量门。
- `CURRENT.md` 从 v4-097 更新为 v4-098，FIFO 050 关闭；`FRONT-M3-02B` 保持 Rev 4 `review` 并转 `Current actor/Reviewer=UI 设计对话`。UI 只复验两个真实 503 恢复成功焦点，不重跑 Rev 3 其他已通过矩阵；通过后由规划运行 S2.1 唯一完整 `pnpm check` 并决定多剧前端解锁，不要求用户传话。

## 2026-08-14 — FRONT-M3-02B Rev 4 恢复成功焦点闭环完成并交规划

- `NewBatchPanel` 与热词 `EvidencePanel` 分别使用一次性恢复焦点意图：只有错误块中的人工重读动作会置位；对应 query 成功、DOM 已提交且面板仍打开时才聚焦既有关闭按钮并立即清除。普通初始成功、无错误的后台刷新和质量/对账面板不会进入该路径，既有 API、查询键、自动重试、业务状态与视觉未改。
- 两条既有可控延迟 503 回归补齐真实焦点时序：重读前显式让唯一恢复按钮获焦，恢复后断言既有关闭按钮获焦且 dialog 包含 `document.activeElement`；原逐集准备请求 2 次、热词请求 2 次、批次详情请求不增加、原因/请求标识/唯一恢复动作和成功事实继续通过。
- 新鲜验证结果：单剧专项 1 文件 12/12，前端 TypeScript 退出码 0，Vite 生产构建 `150 modules transformed`，Impeccable 定向检测 `[]`，`git diff --check` 退出码 0。按规划未运行完整 `pnpm check`。
- `CURRENT.md` 从 v4-096 更新为 v4-097，任务保持 Rev 4 并转 `review / Current actor=规划对话`，登记 FIFO 050。生产与测试只修改 `AsrPanels.tsx`、`AsrWorkspace.test.tsx`；未改后端、迁移、共享契约、`DESIGN.md` 或其他 ASR 页面，未解锁 `FRONT-M3-02D`，未提交、推送或部署；只通知规划总线，不直接通知 UI。

## 2026-08-14 — 前端领取 FRONT-M3-02B Rev 4 恢复成功焦点返工

- 完整重读项目协议、`CURRENT.md` v4-095、ASR UI Rev 3 终验结论与开发日志顶部，确认 FIFO 049 只退回两个只读查询从 error 恢复 success 后的动态焦点 P1。
- `CURRENT.md` 更新为 v4-096，任务转 `in_progress / Current actor=前端开发对话`。本轮只修改 `AsrPanels.tsx` 与 `AsrWorkspace.test.tsx`，让本次面板确实经历错误后恢复成功时于 DOM 提交后聚焦既有关闭按钮，并补两条可控延迟焦点回归；不触碰 Rev 3 冻结项，不解锁多剧前端。

## 2026-08-14 — 规划确认 FRONT-M3-02B 恢复成功焦点 P1 并定向退回 Rev 4

- FIFO 049 按 Impeccable audit 规则核对 UI 的两个真实 503 恢复证据、验收第 9 节、正式 `NewBatchPanel/EvidencePanel` 和定向测试。UI 已证明原因、请求标识、唯一原查询恢复、业务成功、请求计数、1440/1024 与控制台均成立，P0/P2/P3 为 0；这些通过项继续冻结。
- 唯一 P1 成立：人工点击重试后，当前焦点所在按钮随 error 块在 success 提交时卸载；两个面板都只有首次挂载聚焦 effect，没有 error→success 后的确定落点。真实浏览器两处均为 `activeElement=body`、`dialog.contains(activeElement)=false`，现有自动化也没有焦点断言，因此静态检测和数据恢复成功不能推翻动态证据。
- `CURRENT.md` 从 v4-094 更新为 v4-095，FIFO 049 关闭，`FRONT-M3-02B` 递增为 Rev 4 `ready / Current actor=前端开发对话`。本轮只允许两个面板在本次经历 error 后恢复 success 的 DOM 提交阶段聚焦既有关闭按钮，并补两条可控延迟回归；不得对普通 success/后台刷新抢焦点，不改 API、查询键、自动重试、视觉、业务状态或其他已通过范围，不运行完整质量门，不解锁多剧前端。

## 2026-08-14 — UI 完成 FRONT-M3-02B Rev 3 正式终验并交规划裁决

- 正式 React + Fastify + 精确隔离 PostgreSQL 完成一次性矩阵。既有 12/12、TypeScript、150 模块构建、Impeccable `[]`、五态回执、取消/失败集重试/需对账及 Rev 1–2 证据按规划冻结；本轮真实补双门禁、服务端搜索/筛选/排序、1440/1024 两态、两个新增错误恢复和最终控制台。
- 逐集准备与批次热词各用两次真实 503 覆盖一次自动重试，稳定显示原因、请求标识和唯一恢复按钮；人工重读后每个端点只向后端转发 1 次原查询并恢复成功。代理最终计数均为 `injected=2 / forwarded=1`，控制台 `error/warn=0/0`。
- 完整矩阵为 P0=0、P1=1、P2=0、P3=0。唯一同源 P1：两处 query 从 error 恢复 success 后弹窗仍打开，但焦点都落到 `body`，`dialog.contains(activeElement)=false`，Tab 不能恢复弹窗语境；错误态初始焦点、业务恢复、滚动和视觉均通过。
- 新证据写入仓库外 `front-m3-02b-rev3-17` 至 `22` 六张截图；验收记录补充真实步骤、测量、代理计数、分级矩阵和最小建议。`CURRENT.md` 从 v4-093 更新为 v4-094，任务保持 Rev 3 `review`、`Current actor=规划对话`，登记 FIFO 049；未修改生产前端、后端、迁移、共享契约或 DESIGN，未运行完整 `pnpm check`，未解锁多剧前端。

## 2026-08-14 — UI 领取 FRONT-M3-02B Rev 3 正式页面一次性终验

- 完整重读项目协议、`CURRENT.md` v4-092、`DESIGN.md` 5.5、中文识别 UI 全验收记录与开发日志顶部，并按 Impeccable audit 流程确认本轮只做正式 React 单剧中文识别页领域终验。
- `CURRENT.md` 更新为 v4-093，任务保持 `review / Current actor=UI 设计对话`。规划已通过的 12/12、TypeScript、150 模块构建、Impeccable `[]`、差异检查及既有响应式/视觉证据冻结；本轮重点补逐集准备与批次热词两条真实 503→请求标识→唯一原查询重读→恢复证据，并一次性回传 P0/P1/P2/P3 矩阵。只允许更新 UI 验收记录、同步文件和仓库外匿名证据，不修改生产代码或解锁后续任务。

## 2026-08-14 — 规划通过 FRONT-M3-02B Rev 3 并路由 UI 一次性终验

- FIFO 048 源码核对确认返工严格限定 `AsrPanels.tsx` 与 `AsrWorkspace.test.tsx`：逐集准备错误使用既有 `AsrApiError.requestId` 与原 preparation `refetch`；批次热词错误使用同一错误对象与当前 `asr-batch-hotwords` query `refetch`，没有刷新批次详情或建立第二状态源。可控延迟回归覆盖初始加载、503、原因、请求标识、错误块内唯一恢复按钮和恢复成功。
- 规划新鲜执行单剧专项 1 文件 12/12、前端 TypeScript、Vite 生产构建 `150 modules transformed`、Impeccable 定向检测 `[]` 与 `git diff --check`，全部通过；没有运行完整 `pnpm check`。实现完整性结论为通过，本轮未发现新的 P0/P1，Rev 2 的权威读取、视觉与响应式证据继续冻结。
- `CURRENT.md` 从 v4-091 更新为 v4-092，FIFO 048 关闭；`FRONT-M3-02B` 保持 Rev 3 `review` 并转 `Current actor/Reviewer=UI 设计对话`，只做一次正式 React 页面终验。只有真实 P0/P1 可以退审，P2/P3 进入后置清单；UI 通过后由规划运行 S2.1 唯一完整质量门并决定多剧前端解锁，不要求用户传话。

## 2026-08-14 — FRONT-M3-02B Rev 3 只读入口错误恢复完成并交规划

- 逐集准备失败块继续显示后端原因和唯一“重新读取准备事实”，并在错误为 `AsrApiError` 且存在 `requestId` 时显示请求标识；恢复沿用工作台传入的原 preparation query `refetch`。
- 批次热词证据失败块显示标题、后端原因、既有请求标识与唯一“重新读取热词证据”；点击只调用当前 `asr-batch-hotwords` query 的 `refetch`，不刷新批次详情、不建立第二个请求或状态源。
- 新增两项可控延迟回归，直接覆盖初始加载、503 失败原因、请求标识、错误块内唯一恢复按钮、恢复后成功态；热词回归额外断言重试前后批次详情请求计数不变。单剧专项 `12/12`、前端 TypeScript、生产构建 `150 modules transformed` 与 `git diff --check` 均通过；按规划未运行完整 `pnpm check`。
- `CURRENT.md` 从 v4-090 更新为 v4-091，任务保持 Rev 3 并转 `review / Current actor=规划对话`，登记 FIFO 048。生产代码仅修改 `AsrPanels.tsx`，测试仅修改 `AsrWorkspace.test.tsx`；未改后端、迁移、共享契约、`DESIGN.md`、视觉或其他 ASR 页面，未解锁 `FRONT-M3-02D`，未提交、推送或部署；只通知规划总线，不直接通知 UI。

## 2026-08-14 — 前端领取 FRONT-M3-02B Rev 3 只读入口错误恢复收口

- 重读项目协议、`WORKFLOW.md` 12.1/12.2、`CURRENT.md` v4-089、ASR 验收第 9 节与日志顶部，确认 FIFO 047 已关闭，Rev 3 为唯一 `ready / Current actor=前端开发对话`。
- `CURRENT.md` 更新为 v4-090，任务转 `in_progress`。本轮只在 `AsrPanels.tsx` 与对应专项回归中补逐集准备和批次热词证据的错误原因、`AsrApiError.requestId` 与唯一原查询重读动作；Rev 2 的权威读取、成功/加载态、五态回执、marker、弱文字、1440/1024 与视觉全部冻结，不解锁多剧前端。

## 2026-08-14 — 规划审核 FRONT-M3-02B Rev 2 并定向收口新增入口错误恢复

- FIFO 047 代码核对确认 Rev 2 已删除前端历史批次扇出和本地全集搜索/排序，批次准备、服务端列表、批次绑定热词证据、Attempt 五态回执、稳定代码/数量/原因、形状 marker 与 `#747481` 弱文字均消费后端权威事实；既有 1440/1024、滚动与控制台证据不回开。
- 规划新鲜执行 `pnpm exec vitest run tests/frontend/AsrWorkspace.test.tsx --reporter=dot` 为 1 文件 10/10，前端 TypeScript 退出码 0，Vite 生产构建 `150 modules transformed`。这些通过项冻结；完整 `pnpm check` 仍留 S2.1 关闭门。
- 送 UI 前按冻结验收矩阵发现两个同源 P1 恢复缺口：`/batch-preparation` 失败块已有原因与“重新读取准备事实”，但没有显示既有 `AsrApiError.requestId`；“本批次热词证据”失败块只有错误原因，没有请求标识或唯一重新读取动作。两处均违反“错误同时显示原因、请求标识和唯一恢复动作”，且真实网络失败后员工无法恢复热词侧栏。
- `CURRENT.md` 从 v4-088 更新为 v4-089，FIFO 047 关闭，`FRONT-M3-02B` 递增为 Rev 3 `ready / Current actor=前端开发对话`。只允许修改 `AsrPanels.tsx` 和对应回归，复用现有错误对象与 query `refetch`；不改后端、迁移、共享契约、DESIGN、视觉或其他通过行为，不运行完整质量门，不解锁多剧前端，完成后只回规划总线。

## 2026-08-14 — FRONT-M3-02B Rev 2 单剧权威投影收口完成并交规划

- 正式新建面板改读 `GET /asr/batch-preparation` 的逐集可执行/可复用/阻断事实，强制新识别由服务端重新计算；删除按历史批次详情扇出的客户端复用推断。历史批次把编号搜索、状态、行动优先/更新时间排序、20 条分页和真实总数全部提交给服务端，并在筛选切换时保留上一投影避免整页加载闪烁。
- “本批次热词”改读批次绑定证据，展示保存的术语版本、投影版本、摘要、纳入/过滤/截断数量、纳入示例及带稳定原因码的省略条目；Attempt 五态回执显示稳定代码、提交/省略数量和原因，缺失事实不猜成 0。回执与批次状态均使用中文文字、语义色和形状 marker，弱文字变量对齐 `#747481`；没有显示管理员入口或内部边界说明。
- 新鲜验证：单剧专项 `10/10`；全部前端 `6` 文件 `55/55`；前端 TypeScript 退出码 0；生产构建 `150 modules transformed`；Impeccable 定向检测 `[]`；`git diff --check` 退出码 0。未运行完整 `pnpm check`，按规划留给 S2.1 关闭门。
- 真实页面使用正式 React + Fastify + PostgreSQL：1440 展开态根页面 `1440/1440`；1024×768 侧栏展开/收起两态根页面均 `1014/1014`，批次表分别在 `744→1120` 与 `876→1120` 的自身 `overflow-x:auto` 容器横滚；批次绑定热词侧栏读取保存版本/摘要/纳入数量，弱文字实测 `#747481`，控制台 `error/warn=0/0`。临时前后端服务已停止，既有 PostgreSQL 保持运行。
- `CURRENT.md` 从 v4-087 更新为 v4-088，任务保持 Rev 2 并转 `review / Current actor=规划对话`，登记 FIFO 047。未修改后端、迁移、共享契约或 `DESIGN.md`，未进入多剧 Dispatch、真实供应商/API/密钥、管理员入口、字幕编辑、播放器或 S3，未提交、推送或部署；只通知规划总线，不直接通知 UI 或解锁多剧前端。

## 2026-08-14 — 前端领取 FRONT-M3-02B Rev 2 单剧权威投影收口

- 完整重读项目协议、`CURRENT.md` v4-086、S2 ASR 契约、`DESIGN.md` 5.5、UI 验收与日志顶部，确认 `BACK-M3-02E` 已通过 FIFO 046 独立复验，Rev 2 为唯一 `ready / Current actor=前端开发对话`。
- `CURRENT.md` 更新为 v4-087，任务转 `in_progress`。本轮冻结 Rev 1 已通过的创建/取消/失败集重试/需对账、刷新恢复、键盘、1440/1024 和主视觉，只消费批次准备、服务端批次查询、批次绑定热词证据及 Attempt 回执事实，并收口弱文字和状态 marker；不改后端、迁移、共享契约或 `DESIGN.md`，不进入多剧 Dispatch、真实供应商/API/密钥、管理员入口、字幕编辑、播放器或 S3。

## 2026-08-14 — 规划独立复验通过 BACK-M3-02E Rev 1

- FIFO 046 代码核对确认四项交付均使用后端唯一事实：历史热词入口按批次保存的 provider/adapter/model/language/configDigest、能力快照和投影版本重建并核对摘要，返回纳入与省略条目；Attempt 回执事实持久化提交数/省略数/稳定原因，Worker 校验数量与实际 payload 及五态语义；批次编号搜索、状态、行动优先/更新时间排序在数据库分页前执行并以独立 total 支持空页；批次准备一次返回 1–100 集可执行/可复用/阻断事实，复用结果使用单次 `unnest` 集合查询。
- 第一次隔离复验成功应用 18 个迁移，但规划附加诊断误查不存在的 `pgmigrations` 表，在业务测试开始前退出；该临时库已按精确名称删除，未把本次运行冒充通过。随后创建新的 `qimao_plan_fifo046_20260814132729`，使用正确 `schema_migrations` 确认 18 项迁移，新鲜 ASR 两文件 18/18、共享契约构建、后端构建、`check:repo` 和 `git diff --check` 全部通过；结束后只删除该临时库，默认库未清理或停止。
- 回归覆盖批次保存适配器与能力证据、规则过滤/截断原因、跨项目 404、部分提交回执刷新、100 集单次查询、逐集准备的复用/执行/阻断与强制新识别、跨项目术语 422，以及服务端搜索、行动排序、状态筛选、更新时间和空页真实总数。未发现新的 P0/P1。
- `CURRENT.md` 从 v4-085 更新为 v4-086，FIFO 046 与 `BACK-M3-02E` 关闭；`FRONT-M3-02B` 递增为 Rev 2 并解锁，只消费新权威接口和完成既定三个前端收尾，多剧前端继续阻塞。完整 `pnpm check` 仍留 S2.1 关闭门；未接真实供应商、网络、密钥、付费或云资源，未提交、推送或部署。

## 2026-08-14 — BACK-M3-02E Rev 1 单剧权威投影完成并交规划

- 共享 ASR 契约和正式只读 API 已补齐批次绑定热词证据、Attempt 回执事实与批次准备投影。历史批次热词严格使用批次保存的 `provider/adapter/model/language/configDigest`、能力快照和投影版本重建，并核对保存摘要；返回稳定纳入条目和规则过滤、去重、适配器不支持/条数/字符限制的省略条目，不使用读取时当前默认适配器替代历史事实。
- Attempt 新增实际 `submittedCount / omittedCount / reasonCode` 持久化；Worker 在写入前校验五态回执与实际 payload 数量一致，刷新可恢复完整提交、部分提交、不支持与未知事实。员工读取仍不返回对象键、密钥或实际媒体内容。
- 单剧批次列表在数据库分页前支持批次编号搜索、状态筛选、行动优先/更新时间排序，并通过独立总数投影保证 offset 空页仍返回真实 total；保留未指定排序时原创建时间顺序。批次准备 API 一次返回 1–100 集可执行、可复用和阻断事实，显式新识别语义通过 HTTP 布尔查询规范化；全部历史可复用结果只做一次 `unnest` 集合查询。
- 使用精确命名隔离数据库 `qimao_back_m302e_20260814` 从空库应用全部 18 个迁移；新鲜执行 `tests/backend/asr.test.ts` 与 `tests/backend/asr-dispatch-rev2.test.ts` 共 18/18，通过共享契约构建、后端生产构建、`check:repo` 和 `git diff --check`。测试结束时 projects/asr_batches/asr_attempts 均为 0，只删除该隔离库并确认无残留；默认 PostgreSQL 保持运行，未查询或清理默认业务数据。
- 本轮未运行完整 `pnpm check`，未修改生产前端或 `DESIGN.md`，未接真实供应商、SDK、网络、密钥、付费、管理员 API、OCR、S3 或通用任务中心，未提交、推送或部署。`CURRENT.md` 从 v4-084 更新为 v4-085，任务转 `review / Current actor=规划对话`，登记 FIFO 046；只通知规划总线，不自行解锁前端。

## 2026-08-14 — 后端领取 BACK-M3-02E Rev 1 单剧权威投影收口

- 完整重读项目协议、`CURRENT.md` v4-083、`M3-asr-batch.md` 最新单剧流程/热词/页面/API 语义与开发日志顶部，确认任务只补批次绑定热词证据、Attempt 回执事实、服务端批次全集查询和一次性逐集准备投影。
- `CURRENT.md` 更新为 v4-084，任务转为 `in_progress`。本轮允许修改共享 ASR TypeBox、必要持久化、后端 ASR API/仓储和后端测试，并只在精确隔离数据库验证；不修改生产前端或 `DESIGN.md`，不接真实供应商、SDK、网络、密钥、付费、管理员 API、OCR、S3 或通用任务中心，不运行完整 `pnpm check`。

## 2026-08-14 — 规划独立复验通过 BACK-M3-02D Rev 3

- FIFO 045 首次在默认本地数据库复跑 ASR 两文件时，16 项都在 `beforeEach/afterAll` 的全局项目清理阶段被既有匿名 `term_decision_events → term_drafts` RESTRICT 外键阻断，没有进入业务断言；后端构建、`check:repo` 与差异检查通过。规划没有删除默认库记录，也没有把该次运行误记为业务失败或通过。
- 改用本轮创建且名称经过正则校验的隔离临时数据库，从空库成功应用全部 17 个迁移；新鲜 `tests/backend/asr.test.ts + asr-dispatch-rev2.test.ts` 为 2 文件 16/16。结束后只删除本轮创建的 `qimao_plan_fifo045_20260814130042`，默认 `qimao_terms_cloud` 未查询、修改或清理。
- 代码核对确认三项定向修正：Dispatch 详情/摘要的 `totalEpisodes/newJobs/reusableResults` 只对 `acceptanceStatus=accepted` 归并；100 集复用资格通过一次 `unnest` 集合查询；资格与 Dispatch 列表使用独立 filtered total 投影，offset 空页仍返回真实总数。Rev 2 的状态分层、服务端筛选、取消幂等和 4/1 调度未重写。
- 为消除并行验收互相污染，`docs/WORKFLOW.md` 第 13 节新增 S2.1 试运行规则：数据库规划复验和质量门默认使用精确命名隔离库，禁止为了测试清空或停止另一角色的默认库。`CURRENT.md` 从 v4-082 更新为 v4-083，FIFO 045 与 `BACK-M3-02D` Rev 3 关闭，`BACK-M3-02E` 解锁给后端；多剧前端仍等待单剧共享组件稳定。未运行完整 `pnpm check`，未接真实供应商、网络、密钥、付费或云资源，未提交、推送或部署。

## 2026-08-14 — 规划审核通过 UI-M3-02D Rev 2

- 按 FIFO 044 复核 `DESIGN.md` Wave B、`docs/ui/M3-asr-dispatch-acceptance.md` Rev 2、仓库外原型和证据 12–16。人工核图与 DOM/脚本事实一致：`DSP-0814-026` 详情只含匿名项目甲/丙/丁，共 92 集、88 新建/4 复用、46/92 已形成或复用，被阻断项目乙不进入子批次。
- 代码核对确认创建和派发取消在 pending 时由容器获得焦点，按钮禁用，Escape/遮罩/关闭和重复激活均不会关闭或发送第二次请求；确定失败恢复安全焦点，未知创建只重新读取同一意图；取消成功只把匿名项目丙投影为取消请求中，匿名项目甲完成、匿名项目丁需对账、既有结果和历史用量均保留。搜索/资格/项目状态改变成员集合时清选，纯排序/翻页保留显式全量选择。
- 新鲜执行原型 `node --check` 通过；Impeccable detector 返回 `[]`，但 HTML 解析依赖缺失而降级为 regex，只作辅助；授权文档 `git diff --check` 无错误。完整矩阵未发现 P0/P1，Rev 1 已冻结布局、视觉、1440/1024 与滚动证据无需重做。
- `CURRENT.md` 从 v4-081 更新为 v4-082，FIFO 044 关闭，`UI-M3-02D` Rev 2 标记 `done`，FIFO 045 进入 active。未修改生产前后端、迁移或共享契约，未解锁多剧前端，未接真实供应商、网络、密钥、付费或云资源，未提交、推送或部署。

## 2026-08-14 — 规划完成 FIFO 043 单剧 ASR 前端冲突审查

- 规划独立交叉核对 `FRONT-M3-02B` 正式实现、共享 `asr.ts`、`DESIGN.md` 与 `M3-asr-acceptance.md`，并新鲜复跑 `tests/frontend/AsrWorkspace.test.tsx` 8/8。确认三项上游冲突均成立：批次列表固定读取 `limit=100` 后在浏览器按编号搜索/行动优先重排；逐集复用通过 `useQueries` 扫描当前页历史批次详情；热词预览只提供纳入项与省略计数，且入口按读取时当前默认适配器而不是历史批次保存身份重建，Attempt 也没有提交/省略数量和原因。
- 裁决保持正式 UI，不把缺口降级给前端猜测。更新 `docs/contracts/M3-asr-batch.md`，固化一次性逐集准备投影、批次编号服务端全集搜索与行动优先/更新时间排序、按批次保存的适配器身份/能力快照重建热词纳入与省略证据，以及可刷新恢复的 Attempt 厂商中立回执事实；新增 `BACK-M3-02E`，等待当前后端 Rev 3 审核关闭后一次实现。
- 同轮完成 Impeccable 有界审计：机械 detector 为 `[]`，但人工代码核对确认三个纯前端收尾——全局 `--text-muted: #777785` 的小字对比度弱于冻结设计值 `#747481`、热词回执标签缺少现有状态形状 marker 子元素、五态回执正文没有按状态显示提交/省略/原因事实。三项并入 `FRONT-M3-02B` 下一轮，不单独制造 UI 往返；已通过的主链路、1440/1024、创建/取消/重试和键盘证据冻结。
- `CURRENT.md` 从 v4-080 更新为 v4-081：FIFO 043 关闭，FIFO 044 进入 active；随后到达的 `BACK-M3-02D` Rev 3 登记 FIFO 045，不插队。未修改生产前后端、迁移或共享代码契约，未接真实供应商、网络、密钥、付费或云资源，未提交、推送或部署。

## 2026-08-14 — BACK-M3-02D Rev 3 最小查询与汇总返工完成并交规划

- Dispatch 详情、列表摘要与刷新恢复现在只以 `acceptanceStatus=accepted` 项目汇总 `totalEpisodes/newJobs/reusableResults`；blocked 项目仍进入 selected/blocked 和逐项目结果，但即使自身已有集数也不再污染 accepted 集合。Rev 2 的接受/执行状态、取消幂等、服务端筛选排序和公平调度未重写。
- `evaluateWithClient` 把每个 ready episode 的 `asr_results` 往返改为一次 `unnest` 集合查询；新增 100 集匿名回归直接计数该 SQL 只执行一次，没有放宽测试超时。资格和 Dispatch 列表改用同一 filtered CTE 的独立总数投影，即使 offset 落在空页，仍返回筛选后的真实 `total` 和空 `items`。
- 最终使用精确命名的隔离 PostgreSQL 从空库应用全部 17 个迁移，`tests/backend/asr.test.ts` 与 `tests/backend/asr-dispatch-rev2.test.ts` 共 16/16，通过后端生产构建、`check:repo` 与 `git diff --check`；隔离临时库查询为空，无残留。验证开始时本地实例实际未监听，后端只启动既有项目 PostgreSQL 以运行隔离库并保持其运行，未查询、修改或清理默认 `qimao_terms_cloud` 数据。
- 本轮业务修改只涉及 ASR 资格/Dispatch 仓储和对应后端测试；未修改共享契约、迁移、生产前端或 `DESIGN.md`，未接真实供应商、网络、密钥、付费、管理员 API、OCR 或通用任务中心，未提交、推送或部署。完整 `pnpm check` 按边界留给 S2.1 关闭门。`CURRENT.md` 在 UI v4-079 上最小合并为 v4-080，任务转 `review / Current actor=规划对话`，只通知规划总线，不自行解锁 `FRONT-M3-02D`。

## 2026-08-14 — UI-M3-02D Rev 2 派发定向收口完成并交规划

- Rev 1 已通过的信息架构、项目/任务页布局、7→18 选择、视觉、1440/1024、滚动归属和不受影响证据保持冻结。`DESIGN.md` 与 `docs/ui/M3-asr-dispatch-acceptance.md` 已明确成员集合变化和纯观察变化的选择语义、创建提交容器锁定、未知/确定失败恢复，以及只取消可取消未终结子批次的影响确认与反馈。
- 仓库外原型把 `DSP-0814-026` 统一为 accepted 匿名项目甲/丙/丁，合计 92 集、88 新建/4 复用、已形成或复用 46/92；blocked 匿名项目乙不再进入详情。新增 `12–16` 五张 1440 定向证据，旧 `05` 只在错误详情数据上被 `12` 取代，其余冻结证据不重做。
- 真实浏览器动态验证创建和取消 pending 均由容器获得焦点、双向 Tab 不离开、Escape/遮罩/关闭/重复激活受阻且请求计数保持 1；创建确定失败保留 7 部集合并恢复安全取消，未知结果只重新读取同一意图；取消确定失败保留甲/丙/丁原事实，成功仅把丙投影为取消请求中并聚焦 `role=status`，甲完成、丁需对账及历史用量保留。排序/翻页保留 18 部，搜索/资格/项目状态变化清选并播报。
- 最终 `node --check app.js`、授权文档与同步文件 `git diff --check` 通过；Impeccable detector 返回 `[]`，但 HTML 解析模块缺失而降级为 regex，只作辅助。未修改生产 React、后端、迁移或共享契约，未扩展 OCR、上传、通用任务中心、系统控制台或真实供应商，未提交、推送或部署。`CURRENT.md` 在并行前端最新 v4-078 上最小合并为 v4-079，登记 FIFO 044，任务转 `review / Current actor=规划对话`，只通知规划总线。

## 2026-08-14 — FRONT-M3-02B Rev 1 完成审查发现权威接口冲突并交规划

- 正式 React 单剧中文识别页已实现项目路由、素材与术语双门禁、整剧/选中集/单集创建、批次/逐集权威状态、取消、仅失败集重试、需对账、刷新恢复、未知结果同幂等键重放、键盘焦点和 1440/1024 响应式；员工页已省略内部边界说明与管理员入口，未进入多项目 Dispatch、真实供应商/API/密钥、OCR、字幕正文、播放器或 S3 前置审改。
- 新鲜验证通过：`tests/frontend/AsrWorkspace.test.tsx` 8/8、全部前端 6 文件 53/53、前端 TypeScript、Vite 生产构建 150 模块、Impeccable 定向检测 `[]`；独立完成审查确认页面结构、范围边界和 1024 响应式通过，但结论为 `revise`。完整 `pnpm check` 按任务边界未运行。
- 真实页面通过本地公共 API 创建排队批次并刷新恢复。1440×900 根页面 `1440/1440`，侧栏 204px；1024×768 展开/收起根页面均 `1014/1014`，批次表分别 `744/1120`、`876/1120`，横滚仅在表格容器；540px 新建侧栏不推动根页面。打开聚焦关闭、Shift+Tab 闭环、Escape 关闭并恢复触发按钮，控制台 `error/warn=0/0`。
- 冲突 1：`AsrHotwordPreviewSchema` 只提供实际纳入 `entries`、过滤/截断计数和 adapter 能力，不提供 UI Rev 2 明确要求的被过滤/截断具体条目及逐项原因；Attempt 回执也没有省略原因字段。前端不能读取后端内部规则或凭计数猜原因。
- 冲突 2：`AsrBatchListQuerySchema` 只有 `status / sortBy(createdAt|status) / sortDirection / limit / offset`，正式仓储也仅按创建时间或状态排序，没有批次编号搜索或行动优先排序。当前前端先取最多 100 条再搜索/重排不能证明全集，继续扩大客户端拉取会违反服务端分页与权威查询边界。
- 冲突 3：新建面板要求逐集显示“可执行/可复用”，但单项目现有接口只通过逐批次详情暴露 `job.reusedResult/currentResult`；资格接口只有聚合 `reusableResultCount`，没有逐集资格投影。前端若扫描历史批次详情会造成请求数随历史批次线性增长，且仍可能遗漏分页外结果。
- 按专业异议与规划总线协议，`CURRENT.md` 从并行后端最新 v4-077 最小合并为 v4-078，登记 FIFO 043，任务转 `blocked / Current actor=规划对话`。现有前端实现与通过证据冻结；等待规划裁决补共享契约/后端投影，或调整 UI 验收。验收服务和本地 PostgreSQL 已停止，3000/3001 端口已释放；未提交、推送或部署。

## 2026-08-14 — 后端领取 BACK-M3-02D Rev 3 最小查询与汇总返工

- 完整重读项目协议、`CURRENT.md` v4-076、S2.1 批量派发契约、`DESIGN.md` 5.5 Wave B、Dispatch UI 验收与日志顶部，确认 Rev 2 的状态分层、服务端筛选排序、最近批次、取消幂等、17 个迁移和 4/1 调度全部冻结。
- `CURRENT.md` 更新为 v4-077，任务转为 `in_progress`。本轮只在 ASR 资格/Dispatch 仓储与对应后端测试内修正 accepted 汇总、集合化可复用结果查询和空页真实 total；不修改共享契约、迁移、生产前端或 `DESIGN.md`，不停止默认 PostgreSQL、不清理前端数据，不接真实供应商、网络、密钥、付费、管理员 API、OCR 或通用任务中心。

## 2026-08-14 — 规划复验 BACK-M3-02D Rev 2 并合并最后三项服务端缺口

- 规划使用精确命名的隔离 PostgreSQL 数据库从空库应用全部 17 个迁移，并独立运行 `tests/backend/asr.test.ts` 与 `tests/backend/asr-dispatch-rev2.test.ts` 15/15、共享契约构建、后端生产构建、`check:repo` 与 `git diff --check`，全部通过。隔离库已删除；并行前端正在使用的默认 PostgreSQL 仍在运行，未停止服务、未清理其项目数据。
- 代码与 UI 唯一事实交叉审查确认 Rev 2 主链路成立，但发现一个 P1 汇总错误：`AsrDispatchRepository.load` 的总集数、新任务和可复用结果对全部 selected 结果求和，会把 `blocked` 项目混入 accepted 摘要，直接违反同一 Dispatch 的列表、详情和 92 集示例只能引用 accepted 集合的规则。
- 同时一次性登记两个送生产前端前的查询质量缺口：资格读取仍在每个项目内按每个就绪集数逐条查询可复用结果，项目中心查询上限 100 部、单剧上限 100 集时会产生线性数据库往返；资格与 Dispatch 列表使用窗口计数附着当前页，offset 落到空页时会把真实总数误报为 0。
- `CURRENT.md` 更新为 v4-076，FIFO 042 关闭并把同一任务合并为 Rev 3 `ready / Current actor=后端开发对话`。本轮只修 accepted 聚合、集合化可复用查询和空页 total，并补三类回归；Rev 2 的状态分层、筛选排序、取消幂等、迁移与调度全部冻结。单剧前端和 UI Rev 2 继续并行，`FRONT-M3-02D` 保持 blocked；未接真实 API、密钥、付费、服务器或云资源，未提交、推送或部署。

## 2026-08-14 — BACK-M3-02D Rev 2 Wave B 后端完成并交规划

- 共享 TypeBox 与 PostgreSQL 权威读取已将创建时的 `acceptanceStatus=accepted/partial/blocked` 和子批次事实派生的 `executionStatus` 分开；零 accepted 返回 `null`。项目中心新增服务端资格搜索、资格/工作流/生命周期筛选、行动优先/更新时间/名称排序、数据库分页和最近批次投影；Dispatch 列表新增搜索、双状态筛选、行动优先/有效更新时间排序，以及完成项目、质量和处理用量/待对账汇总。
- 新增持久化派发取消幂等命令。同键重放恢复同一结果，同键异组稳定冲突；取消只调用既有单批次领域命令处理 accepted 且 queued/running/cancel_requested 的未终结子批次，已完成、失败、需对账或已取消结果及历史用量不删除。接受后 queued→running/completed、部分完成与需对账等状态均由当前子批次事实派生，刷新不建立第二套状态源。
- 新增匿名高价值回归，覆盖项目中心服务端筛选/搜索/排序/跨分页与最近批次、接受结果在执行迁移中保持不变、完成/部分/需对账汇总、Dispatch 搜索/筛选/排序、取消重放与异参冲突、已完成结果/用量保护及刷新恢复。隔离临时 PostgreSQL 从空库成功应用全部 17 个迁移；`tests/backend/asr.test.ts` 与 `tests/backend/asr-dispatch-rev2.test.ts` 共 15/15，通过共享契约构建、后端生产构建、`check:repo` 和 `git diff --check`。完整 `pnpm check` 按任务边界留给 S2.1 关闭门。
- 两个精确命名的隔离临时数据库均已删除；并行 `FRONT-M3-02B` 正在使用的默认本地 PostgreSQL 与开发服务保持运行，后端未停止服务、未清理其项目数据。未修改生产前端或 `DESIGN.md`，未接真实供应商、网络、密钥、付费或云资源，未实现管理员网站/API、OCR 或通用任务中心，未提交、推送或部署。`CURRENT.md` 在 UI v4-074 上最小合并为 v4-075，任务转 `review / Current actor=规划对话`，只通知规划总线。

## 2026-08-14 — UI 领取 UI-M3-02D Rev 2 派发交互定向收口

- 完整重读项目协议、`CURRENT.md` v4-073、批量派发契约、`DESIGN.md` 5.5、Wave B UI 验收与开发日志顶部，并按 Impeccable harden 流程核对高风险提交、失败恢复、取消确认和跨页选择语义。
- `CURRENT.md` 更新为 v4-074，任务转为 `in_progress`。Rev 1 信息架构、7→18 选择、视觉、1440/1024、滚动归属及不受影响证据冻结；本轮只统一 `DSP-0814-026` 权威事实，补批量创建提交锁定、派发取消确认与成员集合变化时的选择清理，不修改生产前后端、迁移或共享契约。

## 2026-08-14 — 规划审核 UI-M3-02D Rev 1 并定向收口派发事实与高风险提交

- 规划按 Impeccable `audit` 规则重读产品/设计上下文、完整 UI 验收文档、原型 HTML/CSS/JS 和 11 张匿名证据。项目中心服务端资格表达、逐行/当前页/显式跨页全选、7→18 动态摘要、阻断项目保留、部分接受与运行状态分层、专用中文识别任务列表、1440/1024 侧栏两态、表格滚动归属和员工页禁用管理信息整体成立；原型 `node --check` 通过。Impeccable 检测因缺少 HTML 解析依赖降级为 regex，结果只作辅助而未冒充完整无缺陷证明。
- 同一 Dispatch 证据存在 P1 事实漂移：`DSP-0814-026` 的部分接受结果明确接受甲/丙/丁、阻断乙，但详情改为甲/乙/丁；由此接受项目总集数应为 92 却显示 83，新建/复用和项目行也随之错误。该问题会让员工进入不属于本次派发的子批次，违反 PostgreSQL 唯一状态源和不可变逐项目结果。
- 高风险动作还有两项 P1：批量创建的定时模拟在提交中仍允许 Escape/遮罩关闭，随后结果侧栏会再次弹出，不能证明真实付费请求只发送一次；“取消未终结项目”只有说明播报，没有影响范围确认、提交中锁定、失败恢复和成功反馈。跨页全选失效规则也需从单一资格筛选明确扩展到搜索、资格和项目状态等会改变成员集合的服务端查询，纯排序/翻页不得静默改写集合。
- `CURRENT.md` 从 v4-072 更新为 v4-073，FIFO 041 关闭；`UI-M3-02D` 合并为 Rev 2 `ready / Current actor=UI 设计对话`。Rev 1 已通过的信息架构、视觉、响应式和不受影响证据冻结，只补同一 Dispatch 数据、创建提交锁定、取消确认与选择失效语义；`FRONT-M3-02D` 保持 blocked，后端 Rev 2 和单剧前端继续并行。未修改生产前后端、迁移或共享契约，未接真实 API、密钥、付费或云资源，未提交、推送或部署。

## 2026-08-14 — UI-M3-02D Rev 1 Wave B 多剧派发设计完成并交规划

- 冻结 Wave A 单剧设计与 16 张既有证据，在 `DESIGN.md` 5.5 新增项目中心多剧选择、批量确认和员工侧“中文识别任务”正式规则；新增 `docs/ui/M3-asr-dispatch-acceptance.md`，明确服务端资格筛选、Project 选择单位、逐行/当前页/显式跨页全选、1–20 上限、筛选变化清理、selected/canCreate/blocked、逐项目 accepted/blocked，以及 Dispatch 接受结果与执行状态分层。
- 仓库外匿名原型位于 `m3-asr-dispatch-rev1`。当前页确认动态显示 `7 部 / 可创建 4 / 阻断 3 / 205 集 / 109 新任务 / 7 复用`；显式全量选择同步变为 `18 / 11 / 7 / 485 / 282 / 14` 并逐项目列出 18 行。部分接受、失败、取消请求、需对账、读取失败、刷新恢复和空态均有文字、形状、语义色及唯一下一动作。
- 11 张视觉证据覆盖 1440 项目中心/确认/部分接受/任务列表/详情/空错态和 1024 侧栏 204/72 两态。in-app Browser 外层视口固定为 1280×720，因此使用原型逻辑桌面画布按 1440×900 与 1024×768 精确裁切并在验收文档明确标注，不冒充真实外层视口调整；两种画布的 `body/AppShell` 均为等宽无横溢，项目/任务/侧栏内表只在各自容器横滚。
- 批量确认初始焦点、Shift+Tab/Tab 双向闭环、任务详情 Escape 恢复触发点、资格筛选清除选择播报和读取失败重新读取聚焦通过；员工任务页禁用词检查无供应商、并发、预算、服务器、密钥、精确金额或管理员入口，浏览器控制台 `error/warn=0/0`。原型 `node --check`、授权文档 `git diff --check` 通过；Impeccable 检测为 `[]`，但缺 HTML 解析模块而降级为 regex，仅作辅助。
- 本轮只修改 `DESIGN.md`、新增 UI 验收文档、同步文件与仓库外原型/截图；未修改生产 React、后端、迁移或共享契约，未建设 OCR、上传任务、通用任务中心、系统控制台或真实供应商，未提交、推送或部署。`CURRENT.md` 在后端 v4-071 上最小合并为 v4-072，登记 FIFO 041，任务转 `review / Current actor=规划对话`，只通知规划总线。

## 2026-08-14 — 后端领取 BACK-M3-02D Rev 2 Wave B 投影收口

- 完整重读项目协议、`CURRENT.md` v4-070、S2.1 批量派发契约、`DESIGN.md` 5.5 Wave B、Dispatch UI 验收矩阵与日志顶部，确认 Rev 1 的表、创建幂等、逐项目结果、活动批次竞态、单项目命令复用和 4/1 公平调度全部冻结。
- `CURRENT.md` 更新为 v4-071，任务转为 `in_progress`。本轮只补接受/执行状态分层、项目中心服务端资格搜索筛选排序分页及最近批次、Dispatch 服务端列表汇总和幂等派发取消；不改生产前端/DESIGN，不接真实供应商/网络/密钥/付费，不实现管理员网站/API、OCR 或通用任务中心。

## 2026-08-14 — 规划复验 BACK-M3-02D Rev 1 并合并 Wave B 投影缺口

- 规划重读 Wave B 产品契约、最新 `DESIGN.md` 与 UI 验收语义，审查 Dispatch 迁移、共享 TypeBox、资格/派发仓储、单项目创建命令、Worker 策略读取和公平领取。Rev 1 的 PostgreSQL DispatchGroup、规范化项目集合、创建幂等、逐项目 accepted/blocked、活动批次竞态门禁、项目轮转、项目内集数升序和开发默认全局 4/每项目 1 均成立。
- 本轮独立重新执行 `pnpm run db:setup`、ASR 专项、共享契约构建、后端生产构建、`check:repo` 与 `git diff --check`，全部退出码 0；随后停止本地 PostgreSQL，并由状态命令确认实例未运行。完整 `pnpm check` 继续留给 S2.1 关闭门。
- 跨角色契约审计发现同一根因的四项缺口：后端 Dispatch `status` 仍只表达 `accepted/partial/blocked` 创建结果，无法表达排队、运行、完成、失败、取消和需对账；列表缺少正式员工页要求的服务端搜索、运行状态/行动优先排序、有效更新时间和质量/用量汇总；项目中心只有最多 20 个已知 ID 的资格批查，不能按资格/最近任务做服务端筛选分页；派发级幂等取消尚未把取消意图传递给未终结子批次。继续让前端自行推导会形成第二套状态源，因此不能直接关闭后端 Wave B。
- `CURRENT.md` 从 v4-069 更新为 v4-070，登记并关闭 FIFO 040；`BACK-M3-02D` 合并为 Rev 2 `ready / Current actor=后端开发对话`，只收口项目选择投影、接受结果与运行状态分层、正式列表汇总和派发级取消。Rev 1 已通过基础冻结，不重复重写公平调度；`FRONT-M3-02D` 保持 blocked，正在进行的单剧前端和 UI Wave B 不受影响。未接真实 API、管理员网站、密钥、付费或云资源，未提交、推送或部署。

## 2026-08-14 — BACK-M3-02D Rev 1 Wave B 后端完成并交规划

- 新增 PostgreSQL `asr_dispatch_groups / asr_dispatch_project_results / asr_dispatch_commands / asr_project_scheduling` 与公平领取序列。共享 TypeBox 和正式业务 API 支持批量资格投影、幂等创建 DispatchGroup、逐项目 accepted/blocked 结果、列表及详情刷新恢复；员工请求仍不能选择厂商或调度容量。
- 资格投影由后端统一检查项目生命周期、最新不可变术语版本、最新素材清单、ASR 视频覆盖、活动批次和可复用结果。Dispatch 复用既有单项目批次领域命令，规范化项目集合，同键重放保持同一 group/batch，异参稳定冲突；`allowPartial=false` 有阻断项时不创建批次，显式 `allowPartial=true` 才只为合格项目创建，项目级活动批次锁阻止竞态重复批次。
- 新增稳定内部 `AsrSchedulingPolicyReader`，当前仅返回开发默认全局 4、每项目 1、无限定速率；Worker 入口按全局槽位启动有界轮询 lane，仓储用 PostgreSQL 租约、调度锁与 `SKIP LOCKED` 先在项目间轮转，再在项目内按集数/id 确定排序，过期租约和需对账保护保持原语义。
- 匿名回归以三项目覆盖可执行、缺术语、缺视频、整组阻断、显式部分派发、幂等重放、同键异参、刷新恢复、活动批次竞态、项目公平和 4/1 容量。`tests/backend/asr.test.ts` 12/12、共享契约构建、后端生产构建、`check:repo` 与 `git diff --check` 均退出码 0；完整 `pnpm check` 留 S2.1 切片关闭门。测试后 `projects / asr_dispatch_groups / asr_batches / asr_jobs / asr_attempts` 均为 0，本地 PostgreSQL 已停止。
- 本轮只修改共享 ASR 契约、后端 ASR 模块/Worker、必要迁移与后端测试；未修改生产前端或 `DESIGN.md`，未接真实供应商、SDK、网络、密钥、付费或云资源，未实现系统控制台、管理员网站/管理 API、OCR 或导出通用任务中心，未提交、推送或部署。任务写回 `review / Current actor=规划对话`，只通知规划总线。

## 2026-08-14 — UI 领取 UI-M3-02D Rev 1 Wave B 多剧派发设计

- 完整重读项目协议、`CURRENT.md` v4-067、S2.1 批量派发契约、`DESIGN.md` 5.5、Wave A 验收与开发日志顶部，确认 Wave A 单剧结构和证据全部冻结。
- `CURRENT.md` 更新为 v4-068，任务转为 `in_progress`。本轮只设计项目中心的服务端中文识别资格筛选、多剧选择与批量确认，以及员工侧专用“中文识别任务”列表/详情；不设计通用任务中心、系统控制台、OCR、上传任务或真实供应商，不修改生产前后端、迁移或共享契约。

## 2026-08-14 — 前端领取 FRONT-M3-02B Rev 1 单剧中文识别页

- 完整重读项目协议、`CURRENT.md` v4-066、S2 ASR 批次契约、`DESIGN.md` 5.5、UI 验收、功能等价矩阵与开发日志顶部，确认 `UI-M3-02` Rev 2 和 `BACK-M3-02C` 均已由规划关闭。
- `CURRENT.md` 更新为 v4-067，任务转为 `in_progress`。本轮只集成正式单剧中文识别 React 页面与既有零网络 fake 链路，消费后端权威热词预览、五类回执和批次状态；不实现多项目 Dispatch、管理员入口、真实供应商/API/密钥、OCR、字幕正文编辑、播放器或 S3 前置审改，不修改后端、迁移、共享契约或 DESIGN。

## 2026-08-14 — 规划通过 UI-M3-02 Rev 2 并关闭 Wave A 质量门

- 按 FIFO 039 审核 `DESIGN.md` 5.5、`docs/ui/M3-asr-acceptance.md`、原型代码和 evidence/13–16。热词同项目不可变证据、五态回执、准确率未验证、批次取消/需对账、员工处理用量与已通过后端契约一致；1440/1024 侧栏两态、根页面/表格滚动归属、侧栏焦点恢复及控制台证据完整，P0/P1=0。
- 规划运行 Impeccable 检测为 `[]`，但本机缺 HTML 解析模块而降级为 regex，只作辅助；脚本语法检查通过。唯一 P3 为原型可见“员工页边界/精确费用留在系统控制台”内部说明，正式前端直接省略，不要求 UI 返工，也不显示管理员网站入口。
- Wave A 完整 `pnpm check` 退出码 0，本地 PostgreSQL 已停止。`UI-M3-02` 标记 done、FIFO 039 关闭；`FRONT-M3-02B` 与 `UI-M3-02D` 解锁为 ready，可同已运行的 `BACK-M3-02D` 文件不重叠地并行。未接真实 API、管理员网站、密钥、付费或云资源。

## 2026-08-14 — 后端领取 BACK-M3-02D Rev 1 Wave B Dispatch 与公平调度

- 完整重读项目协议、`CURRENT.md` v4-064、S2.1 多剧批量契约、系统控制中心边界、职责矩阵与开发日志顶部，确认本轮只实现 PostgreSQL 权威 DispatchGroup/逐项目结果/幂等、服务端项目资格、复用单项目批次命令、开发默认全局 4/每项目 1 的项目公平领取和稳定内部策略读取接口。
- `CURRENT.md` 更新为 v4-065，任务转为 `in_progress`。本轮不创建通用任务中心、管理员网站或管理 API，不接真实供应商/SDK/网络/密钥/付费，不修改生产前端/DESIGN，不扩展 OCR 或导出。

## 2026-08-14 — 规划独立复验通过 BACK-M3-02C Rev 1

- 基于 `CURRENT.md` v4-063 按 FIFO 038 审核。规划重新执行 `pnpm run db:setup`，新增迁移成功应用；独立 ASR 专项 1 文件 9/9、共享契约构建、后端生产构建和 `check:repo` 全部退出码 0。
- 代码核对确认批次 `cancel_requested/reconciliation_required` 的共享/数据库/汇总/筛选一致，同项目不可变术语版本隔离、通用投影与 adapter 能力快照、调用前 Attempt payload 证据、五态回执及迁移前 deterministic fake v1 兼容成立；没有进入 Dispatch、管理员网站或真实 API。
- 本地 PostgreSQL 已停止。`BACK-M3-02C` 标记 done，FIFO 038 关闭；`BACK-M3-02D` 解锁为 ready，完整 `pnpm check` 继续留 Wave A 两项合并后的集成门。UI FIFO 039 仍按顺序独立审核，前端尚未解锁。

## 2026-08-14 — UI-M3-02 Rev 2 Wave A 增量设计完成并交规划

- 冻结 Rev 1 页面骨架及 `evidence/01–12`，在批次详情新增“本批次热词”次级入口：侧栏显示同项目不可变术语版本、投影版本、摘要、实际纳入/规则过滤/适配器截断数量和可展开证据；五类回执完整映射为 `simulated / submitted / partially_submitted / unsupported / unknown`，并持续提示“已发送不等于准确率已提升 / 热词链路已接通，准确率未验证”。
- 批次与逐集主表统一把“用量与费用”改为“处理用量”，员工侧只显示处理时长、任务数、质量及“已记录 / 待对账”，不再显示精确金额或内部 `deterministic_fake`；精确费用仅作为系统控制台边界说明，没有建设控制台 UI。批次 `cancel_requested / reconciliation_required` 均以中文文字、语义色和形状编码，需对账没有普通重试。
- 新增仓库外证据 `13–16`：1440 热词证据/五类回执，以及 1024 侧栏 204/72 两态批次需对账。实测 1440 根页面 `1430/1430`；1024 两态根页面均 `1014/1014`，批次/逐集横滚只在各自容器；热词侧栏初始焦点、Shift+Tab 闭环、Escape 关闭和原触发点恢复通过，控制台 `error/warn=0/0`。
- 原型脚本 `node --check` 和授权文档 `git diff --check` 通过；Impeccable 有界检测为 `[]`，因缺 HTML 解析模块使用 regex 降级，仅作辅助。`CURRENT.md` 在后端 v4-062 上最小合并为 v4-063，登记 FIFO 039，任务转 `review / Current actor=规划对话`。
- 本轮只修改 `DESIGN.md`、`docs/ui/M3-asr-acceptance.md`、规划同步文件与仓库外匿名原型/截图；未修改生产 React、后端、迁移或共享契约，未扩展项目中心多选、DispatchGroup、系统控制台、真实厂商、SDK、网络、密钥或付费，未提交、推送或部署；只通知规划总线。

## 2026-08-14 — BACK-M3-02C Rev 1 Wave A 后端完成并交规划

### 批次状态与权威热词投影

- 共享 TypeBox 与 PostgreSQL 批次状态统一增加 `cancel_requested/reconciliation_required`；汇总把 `cancel_requested` 从普通 running 中拆出独立计数。任一未终结 Job 有取消意图时批次明确显示取消请求；无可用结果且存在需对账 Job 时显示需对账；有可用结果混合失败/取消/需对账仍保持 `partial`。
- 新增 `GET /api/projects/:projectId/asr/hotwords/preview?termVersionId=...`。后端只接受属于当前项目的不可变术语版本，返回实际纳入的规范术语与人名别称、过滤/截断数量、adapter 能力、投影版本和摘要；跨项目版本稳定返回 `422 ASR_TERM_VERSION_NOT_FOUND`。
- 通用术语投影移除固定 100 项/2000 字截断；adapter 描述保存支持标记、条数和字符能力，批次创建、预览、重试和 Worker 都使用相同保存能力。迁移前 deterministic fake 批次继续按 v1 + 100/2000 重建核对，新批次统一写 v2，不让排队历史因部署升级失效。

### Attempt 证据、回归与范围

- Worker 在适配器调用前把实际热词 payload 的投影版本、SHA-256、条数、字符数及初始 `unknown` 回执写入 Attempt；适配器统一返回 `simulated/submitted/partially_submitted/unsupported/unknown` 之一，正式读取投影刷新后恢复同一证据。deterministic fake 返回 `simulated`，第二个零网络匿名 stub 以 2 项能力截断并返回 `partially_submitted`；普通批次日志仍不复制完整术语或对象地址。
- `pnpm run db:setup` 已实际应用新增迁移。最终 `pnpm exec vitest run tests/backend/asr.test.ts --reporter=verbose` 为 1 文件 9/9，覆盖批次取消/需对账状态、同项目预览与跨项目隔离、109 项通用投影不截断、adapter 截断、摘要错配零 Attempt、payload/回执读取及既有租约/取消/重试/成功保护；共享契约构建、后端生产构建、`pnpm run check:repo` 和 `git diff --check` 均通过。
- 本地 PostgreSQL 已停止并由状态命令确认未运行；完整 `pnpm check` 按规划留给 Wave A 集成门。本轮未实现 DispatchGroup、公平并发、真实供应商/SDK/网络/密钥/付费、系统控制台或生产配置写入，未修改生产前端/DESIGN，未提交、推送或部署。
- `CURRENT.md` 在规划 v4-061 上最小合并为 v4-062；`BACK-M3-02C` Rev 1 转为 `review / Current actor=规划对话`，登记 FIFO 038。只通知规划总线，不直接通知或解锁前端/UI/Wave B。

## 2026-08-14 — 规划确认 API 型识别与管理员动态并发边界

- 用户确认正式 ASR 长期只走云 API；OCR 在真实样本质量和单集费用合适时也可走云 API。员工按剧选择并同时启动多个项目，集只作为后台执行单位；项目启动数量、排队数量和实际在途 API 请求数不再混称为“并发”。
- 用户进一步限定当前只建设员工主站的云端业务功能，不在主站加入供应商、并发、预算或服务器调控页面；当前后端只预留稳定策略读取/Adapter 对接接口和开发默认值，独立管理员网站及管理 API 后续另立任务。
- 更新 `SYSTEM_CONTROL_CENTER.md`：控制台分别管理 ASR API、OCR API、OCR 自建 Worker 和视频转码资源池，并按全局/供应商/项目/速率/队列/预算取最严格生效限制；动态降低并发只影响新领取任务，不中断已受理请求。OCR API 路径记录抽帧、去重、实际提交帧和计费数量。
- 更新 `M3-asr-bulk-dispatch.md`：开发 fake 的 `全局 4 / 每项目 1` 只是本地安全默认；正式生产值由控制台和供应商配额决定。正在执行的 `UI-M3-02` Rev 2 与 `BACK-M3-02C` 范围不变，未接真实 API、密钥、网络、付费或云资源，未修改生产代码、数据库或 DESIGN。

## 2026-08-14 — UI 领取 UI-M3-02 Rev 2 Wave A 增量设计

- 完整重读项目协议、`CURRENT.md` v4-059、S2 ASR 批次/多剧扩展契约、`DESIGN.md` 与开发日志顶部，确认 Rev 1 页面结构及 12 张证据冻结。
- `CURRENT.md` 更新为 v4-060，任务转为 `in_progress`。本轮只补同项目权威热词摘要与证据、五类应用回执、批次 `cancel_requested/reconciliation_required` 以及员工侧处理用量/质量摘要；不设计多项目选择、DispatchGroup、系统控制台或真实厂商，不修改生产前后端、迁移或共享契约。

## 2026-08-14 — 后端领取 BACK-M3-02C Rev 1 Wave A 热词证据与批次状态收口

- 完整重读项目协议、`CURRENT.md` v4-058、S2 ASR 批次/多剧扩展契约、职责矩阵与开发日志顶部，确认本轮只补批次 `cancel_requested/reconciliation_required`、同项目不可变术语版本热词预览、adapter 能力内截断和 Attempt payload/回执证据。
- `CURRENT.md` 更新为 v4-059，任务转为 `in_progress`。本轮不实现 DispatchGroup、公平并发、真实供应商/SDK/网络/密钥/付费，不修改生产前端/DESIGN，不运行完整 `pnpm check`。

## 2026-08-14 — 用户确认 S2.1 热词证据、多剧批量与费用分层

- 用户确认术语热词必须不仅绑定正确项目，还要让员工看见权威预览、实际发送状态，并在真实供应商接入后用同一 1–3 集做无热词/有热词 A/B；fake/stub 只证明管线，不得宣称真实准确率。规划核对现有实现确认项目—术语版本—摘要—Worker 绑定成立，但通用投影仍固定截断 100 项/2000 字，且没有持久化适配器发送回执。
- 用户同时确认多剧批量识别：选择单位固定为项目，不选择上传会话；上传完成页只预选并跳转。新增 `docs/contracts/M3-asr-bulk-dispatch.md`，定义最多 20 项目批量意图、逐项目 accepted/blocked、持久化 DispatchGroup、默认全局 4/每项目 1 的公平调度、局部失败隔离和 PostgreSQL 唯一状态源。
- 冲突审查发现 UI 的批次级 `cancel_requested` 与后端批次状态集合不一致，且全部需对账时后端会汇总为普通 `failed`。契约已补批次 `cancel_requested/reconciliation_required`；共享契约、数据库、汇总、筛选与 UI 必须一次对齐，不允许前端推断另一套状态。
- 费用分层确认：员工主表只突出处理用量、质量和待对账；每次请求金额和按项目/日期/供应商/模型聚合进入独立系统控制台，共用 PostgreSQL Usage，不建立第二本账。同步更新 `M3-asr-batch.md`、职责矩阵、M3 里程碑和 `SYSTEM_CONTROL_CENTER.md`。
- `CURRENT.md` 从 v4-057 更新为 v4-058，登记完成的 `PLAN-M3-02B`。Wave A 解锁 `UI-M3-02` Rev 2 与 `BACK-M3-02C` 并行；`FRONT-M3-02B` 等两项验收后立即开始。Wave B 的 UI/后端/前端任务先登记 blocked，待各自上游关闭后受控并行。未修改生产代码、DESIGN、数据库或共享契约，未接真实 API、网络、密钥、付费、云资源，未提交、推送或部署。

## 2026-08-14 — 规划审核 UI-M3-02 与 BACK-M3-02A Rev 2

- 按 FIFO 先处理 036：规划逐张复核 UI 明确交付的 12 张 ASR 原型证据，运行、视频/术语双门禁、需对账、仅重试失败集、取消请求、完成、空态、读取失败和 1024 侧栏 204/72 两态均与 S2 契约一致，未发现 P0/P1。记录两个不阻塞 P2：正式员工页不显示 `deterministic_fake` 等内部适配器值，“本地服务正常”部署后使用中性“服务正常”。本轮 in-app Browser 安全策略拒绝重新打开另一任务的 `file://` 原型，规划未绕过，也未把既有截图冒充本轮动态浏览器执行；任务路由用户只做方向验收。
- 再处理 FIFO 037：规划执行 `pnpm run db:setup` 成功；新鲜 `pnpm exec vitest run tests/backend/asr.test.ts` 为 1 文件 7/7，共享契约与后端生产构建均退出码 0。代码核对确认创建 body `additionalProperties:false`，员工附带 provider 会被拒绝；普通响应不含对象地址或完整热词；第二个匿名零网络适配器经过同一 registry、Worker、PostgreSQL 和正式读取链路。
- `BACK-M3-02A` Rev 2 关闭为 `done`。当前结论只证明零网络模拟与多适配器边界，不代表真实供应商已可生产启用；真实 API 接入前必须把 `fakeEnabled`/生产 Worker 保护改为受授权配置，并为适配器意外抛错增加 Worker 级故障归一化。未接 SDK、网络、密钥、回调或付费，未修改生产前端/DESIGN，完整 `pnpm check` 仍留 S2 关闭门。
- `CURRENT.md` 从 v4-056 更新为 v4-057：FIFO 036/037 关闭，UI 转用户方向验收，后端标记完成；`FRONT-M3-02B` 仍只等待用户确认 UI 方向，不提前解锁。未提交、推送、部署或创建云资源。

## 2026-08-14 — BACK-M3-02A Rev 2 多适配器边界完成并交规划

### 登记元数据与厂商中立执行上下文

- 新增后端 `AsrAdapterRegistry`：适配器登记稳定 `provider/adapter/model/language/configDigest` 描述，批次创建只使用后端默认登记项，公开创建 body 不增加厂商字段；同键重放和失败子集重试继续复用已保存描述。共享读取 schema 与仓储行类型改为受长度约束的字符串，不再限定 `fake/deterministic_fake` 字面量。
- Worker 领取任务时联结不可变 Asset，内部输入包含 `assetId/objectKey/originalFilename/mediaKind/sizeBytes/checksum`；同时从不可变术语版本重建实际热词，先核对 `hotwordDigest` 再交适配器。普通 API 仍只返回热词摘要，不返回完整热词或 objectKey，Worker 也不记录执行上下文。
- 统一适配器输出包含 Cue、质量、明确失败、未知结果和同构 Usage；Worker 校验 Usage 的 provider、providerRequestId 与对账状态，仓储按适配器返回落账。执行前取消、项目回收和安全租约接管的内部零用量按批次 provider 记录，仓储路径不再写死 fake；Rev 1 状态转换、结果保护与 `reconciliation_required` 语义未重写。

### 第二 stub、Worker 入口与验证

- 后端新增独立 ASR Worker 启动入口和 API+Worker 本地开发入口。每次循环只领取一个任务，空闲轮询限制在 50ms–60s，AbortSignal 可立即中断等待并优雅关闭数据库；现有根级 `pnpm dev` 调用后端 `dev` 时会启动该组合入口，queued 任务可实际推进。
- 新增第二个仅测试用匿名零网络 stub，以非 fake 的描述元数据和非零同构 Usage 走正式 API 创建→registry 解析→可停止轮询 Worker→PostgreSQL→正式 API 读取；断言员工请求附带 provider 被 `400` 拒绝，适配器内部收到完整 Asset 和 `['林川','小川','雾城']` 实际热词，而响应不泄露 objectKey 或热词正文。
- 最终 `pnpm exec vitest run tests/backend/asr.test.ts` 为 1 文件 7/7；`pnpm --filter @qimao-terms-cloud/contracts run build`、`pnpm --filter @qimao-terms-cloud/backend run build` 和 `git diff --check` 均通过。本地 PostgreSQL 已停止；完整 `pnpm check` 按 v4 留给 S2 关闭门。
- 本轮未新增迁移，未实现真实厂商空壳、SDK、网络、回调、API Key、密钥引用或付费；未修改生产前端/DESIGN，未扩展任务中心、S3 对照或 OCR，未提交、推送或部署。`CURRENT.md` 在 UI v4-055 上最小合并为 v4-056，`BACK-M3-02A` Rev 2 转为 `review / Current actor=规划对话` 并登记 FIFO 037；只通知规划总线，不通知或解锁前端。

## 2026-08-14 — UI-M3-02 Rev 1 中文识别批次页完成并交规划

- 更新 `DESIGN.md` 5.5 并新增 `docs/ui/M3-asr-acceptance.md`，正式定义项目工作台“中文识别”页：术语版本与已校验 `asr_video` 双门禁、整剧/选中集/单集、持续可见模拟识别标识、行动优先批次表、原位逐集工作区、质量/尝试/对账侧栏，以及取消、失败集子集重试、需对账、版本过期和完整空错加载状态矩阵。
- 仓库外匿名原型位于 `C:\Users\ComradeGu\.codex\visualizations\2026\08\12\019ff52d-d4a1-7440-81a2-fc9c1b0a0996\m3-asr-rev1\`；最终 12 张截图覆盖 1440 运行/视频阻断/术语阻断/需对账/重试/取消/完成/空态与 1024 侧栏 204/72 两态及错误态。原型三个批次逐集记录为 30/8/30，状态专属事实不串用；单集为 radio 单选，取消和重试会推进示例内存事实。
- 真实浏览器测得 1440 根页面 `1430/1430`；1024 Windows 纵向滚动槽下展开/收起两态根页面均 `1014/1014`，侧栏 204px/72px，收起态导航图标均 18px；批次表 `1120px`、逐集表 `1080px` 的横滚只属于各自容器。加载 `aria-busy=true`，空态 `role=status`，读取失败 `role=alert/aria-live=assertive`；最终控制台 `error/warn=0/0`。
- 原型脚本 `node --check` 与同轮浏览器语法核对通过；Impeccable 机械检测为 `[]`，因缺 HTML 解析依赖仅作辅助。独立第二轮定向终审最终 `PASS`，未发现剩余 P0/P1。`CURRENT.md` 在规划 v4-054 上最小合并为 v4-055，登记 FIFO 036，任务保持 Rev 1 `review / Current actor=规划对话`。
- 本轮仅修改 `DESIGN.md`、`docs/ui/M3-asr-acceptance.md`、规划同步文件与仓库外原型/截图；未修改生产 React、后端、迁移或共享契约，未接真实供应商、密钥、网络、付费或云资源，未扩展密钥控制台、账号、全局任务中心、字幕编辑、播放器或 OCR，未提交、推送或部署；只通知规划总线，不自行解锁前端。

## 2026-08-14 — 规划固化两站一后台与统一系统控制台边界

- 用户确认员工工作台可通过公网域名访问，系统控制台作为另一网站只供部署所有者使用；两者不建设重复后端、数据库或强制使用两台服务器。规划明确“公网可达”不等于匿名开放：员工站使用显式员工邮箱白名单，控制台只允许部署所有者精确邮箱。
- 新增 `docs/contracts/SYSTEM_CONTROL_CENTER.md`，选择 Cloudflare Tunnel + 两个独立 Cloudflare Access Application 作为首期无自建账号入口；两个站使用不同 audience，后端验证 JWT 签名、issuer、audience 和有效期。同步固化引擎/API、路由、提示词/热词、服务器/Worker、预算、日志、Secret 引用和不可变审计的分区与配置生命周期。
- 更新 `PRODUCT.md` 与 `docs/architecture.md`，把原“身份提供方待定”收口为首期外部邮箱身份方案，同时保留未来应用账号、多租户、真实部署值和云资源授权门。未创建 Cloudflare 账户、Tunnel、Access Application、域名、服务器或密钥，未连接网络、未部署或付费。
- `CURRENT.md` 从 v4-053 更新为 v4-054，新增已完成 `PLAN-SYSTEM-01` 和 blocked 的 `UI-SYSTEM-01`。由于 `UI-M3-02` 正在修改 `DESIGN.md`，本轮不并发写同一文件；控制台 UI 合并等待当前 UI 交回规划并由用户确认优先级，不打断 `BACK-M3-02A` 或 `FRONT-M3-02B` 依赖。

## 2026-08-14 — 后端领取 BACK-M3-02A Rev 2 适配边界定向返工

- 完整重读项目协议、`CURRENT.md` v4-052、ASR 契约第 8/12 节和开发日志顶部，确认 Rev 1 已通过的双门禁、幂等、租约接管、结果保护和 `reconciliation_required` 状态机全部冻结。
- `CURRENT.md` 更新为 v4-053，任务转为 `in_progress`。本轮只补后端登记的适配器描述元数据、厂商中立执行输入/输出与 Usage、第二个零网络测试 stub，以及有界轮询和优雅停止的本地 Worker 启动入口；不实现真实厂商空壳、SDK、网络、密钥或付费，不修改生产前端/DESIGN，不扩展任务中心、S3 或 OCR。

## 2026-08-14 — 规划独立复验 BACK-M3-02A Rev 1 并定向退回适配边界

- 规划核对 ASR 迁移、共享 TypeBox 契约、批次/取消/重试命令、租约 Worker、读取投影、热词投影和零网络 fake；本轮重新执行 `pnpm exec vitest run tests/backend/asr.test.ts` 为 1 文件 6/6，通过共享契约构建和后端生产构建。Rev 1 的双门禁、幂等、租约接管、结果保护与需对账基线保留。
- 按用户“现在即预留大量厂商 API 接口”的最新要求做冲突审查，确认现有 `AsrAdapter` 只完成了 fake 测试隔离，尚不是可替换的正式厂商边界：`provider/adapter/model` 在共享契约、读模型、创建仓储和 Usage 写入中固定为 fake；执行输入只有文件名与热词摘要，没有 Asset 对象引用、校验元数据和实际热词；服务器/脚本没有启动 Worker 的入口，正式前端创建后任务不会自行离开 queued。
- 契约补充最小厂商中立边界：批次元数据由后端登记配置固定，Worker 按批次解析适配器；内部执行上下文提供不可变 Asset 元数据和与 digest 一致的实际热词；适配器统一返回 Cue、质量、未知结果和 Usage；第二个仅测试用零网络 stub 证明可替换性；本地 Worker 必须有有界轮询和优雅停止入口。当前仍不写任何真实厂商空壳，不接 SDK、密钥、网络或付费。
- `CURRENT.md` 更新为 v4-052，FIFO 035 关闭；`BACK-M3-02A` 递增为 Rev 2 `ready / Current actor=后端开发对话`。`UI-M3-02` 继续独立并行，`FRONT-M3-02B` 保持 blocked；完整 `pnpm check` 继续留 S2 关闭门。本轮未修改生产代码、前端、DESIGN 或数据库迁移，未提交、推送或部署。

## 2026-08-14 — BACK-M3-02A Rev 1 S2 ASR 后端完成并交规划

### 权威批次、租约恢复与结果保护

- 新增 S2 ASR 共享 TypeBox 契约和 PostgreSQL 迁移，批次、逐集 Job、Attempt、不可变 Result/Cue、Usage 及创建/取消/重试命令均以数据库为权威；正式 API 支持整剧、选中集、单集创建，列表/详情读取，取消与失败子集重试。创建时锁定项目、最新已确认素材清单、已校验 `asr_video` Asset 与当前项目不可变术语版本，缺失视频形成逐集 blocker，回收中项目和无效术语版本由稳定领域错误阻断。
- 新增数据库租约 Worker 和仅开发/测试可用的 `deterministic_fake` adapter，不调用网络、不读取密钥。Worker 支持安全租约接管；已知失败可显式重试，未知外部结果进入 `reconciliation_required` 且不自动重试；质量 `rejected` 结果保留在不可变尝试历史但不成为当前可用结果，后续失败或强制重跑不会覆盖既有成功结果。
- 术语热词从显式不可变 `TermVersion` 确定生成，过滤普通职位/泛称并按确定规则去重、截断；API 只返回摘要、数量和 digest，不返回完整热词。每次 fake 尝试均写入零时长、零字符、零费用用量；Cue 按集数、时间轴与轴号持久化并由数据库触发器禁止更新。

### 回归、清理与范围

- `pnpm exec vitest run tests/backend/asr.test.ts`：1 文件 6/6 通过，覆盖素材+术语双门禁、三种范围、规范化创建重放/同键异参、取消重放、失败子集重试、租约接管、通过/警告/拒绝/需对账、成功复用与强制失败保护、不可变结果/Cue、热词摘要及零费用用量。
- `pnpm exec vitest run tests/backend`：7 文件 60/60 通过；`pnpm --filter @qimao-terms-cloud/contracts run build`、`pnpm --filter @qimao-terms-cloud/backend run build`、`pnpm run check:repo` 与 `git diff --check` 均通过。迁移已由 `pnpm run db:setup` 从当前本地数据库实际应用；最终本地 PostgreSQL 已停止。完整 `pnpm check` 按 v4 留给 S2 纵切关闭门。
- 最终范围仅涉及共享 ASR 契约、ASR 后端模块/专属 Worker、必要迁移、应用路由注册和后端测试；未修改生产前端或 DESIGN，未接真实供应商、网络、API Key、ASR/OCR 云资源，未建立任务中心或 S3 对照编辑，未提交、推送或部署。
- `CURRENT.md` 在并行 UI 写入的 v4-050 上最小合并为 v4-051；`BACK-M3-02A` Rev 1 转为 `review / Current actor=规划对话`，登记 FIFO 035。只通知规划总线，`UI-M3-02` 保持 `in_progress`，`FRONT-M3-02B` 保持 blocked 且不由后端解锁。

## 2026-08-14 — UI 领取 UI-M3-02 Rev 1 中文识别批次页设计

- 完整重读项目协议、`CURRENT.md` v4-049、S2 ASR 批次契约、职责矩阵中文识别行、功能等价矩阵对应行、`DESIGN.md` 与开发日志顶部，确认本轮只设计项目工作台“中文识别”批次页与完整状态矩阵。
- `CURRENT.md` 更新为 v4-050，任务转为 `in_progress`。本轮只修改 `DESIGN.md`、`docs/ui/` 与仓库外匿名原型/截图；不修改生产 React、后端、迁移或共享契约，不设计密钥控制台、账号、全局任务中心、字幕编辑、播放器、OCR 或真实付费 API。

## 2026-08-14 — 后端领取 BACK-M3-02A Rev 1 S2 ASR 权威流程

- 完整重读项目协议、`CURRENT.md` v4-048、S2 ASR 批次契约、职责矩阵中文识别行、功能等价矩阵对应行与开发日志顶部，确认本轮只实现 PostgreSQL 权威批次、共享契约、正式 API、数据库租约 Worker、`deterministic_fake`、不可变 Cue、热词摘要、零费用用量和后端回归。
- `CURRENT.md` 更新为 v4-049，任务转为 `in_progress`。UI 可按不重叠目录并行；后端不修改生产前端/DESIGN，不接真实供应商/网络/密钥，不建立任务中心、S3 对照编辑或 OCR，不运行完整 `pnpm check`。

## 2026-08-14 — 用户确认 S2 ASR 推荐方案并解锁 UI/后端并行

- 用户明确确认“先用零付费 fake 固定完整流程，同时调研真实中文 ASR API；真实密钥和 1–3 集样本调用另行授权”的推荐方案。规划完成 `PLAN-M3-02`，没有购买服务器、创建云资源、接入密钥或产生付费调用。
- 规划只读核对本地应用 `batch_asr`、`asr_term_prompt`、ASR 历史与对应回归：保留整剧批次、确认术语热词、普通职位/泛称过滤、源文件保护、成功结果不覆盖、异常内容隔离、取消、失败集子集重试和整剧历史恢复；云端优化为 PostgreSQL 权威批次、不可变结果与数据库租约 Worker。
- 新增 `docs/contracts/M3-asr-batch.md`，固化整剧/选中集/单集、术语版本与已校验 ASR 视频双门禁、批次/逐集状态、不可变 Cue、运行与质量分离、热词摘要、创建/取消/重试幂等、未知结果需对账、零费用 fake、未来真实用量与密钥安全边界。同步更新 M3 冲刺、模块职责矩阵和本地功能等价矩阵。
- `CURRENT.md` 从 v4-047 更新为 v4-048：`PLAN-M3-02` 标记 `done`；`UI-M3-02` 与 `BACK-M3-02A` 分别设为 `ready` 并允许文件不重叠的受控并行；`FRONT-M3-02B` 保持 `blocked`，必须等待 UI 用户方向通过和后端规划独立验收。未修改业务代码、生产 UI、迁移或共享代码契约，未提交、推送或部署。

## 2026-08-13 — 规划关闭 M3 S1 术语纵切并进入 ASR 产品协商门

- 规划按 Impeccable 技术审计规则复核 UI 的完整终验矩阵，并抽查正式页面主表、真实 Cue 第 2 页人工新增、模板真实冲突恢复、全量发布确认、不可变历史下载以及 1024 侧栏展开/收起两态共 7 张关键截图；报告与画面一致，核心路径可完成，P0/P1 为 0。
- 接受 P2“模板/发布居中 dialog 非提交态点击遮罩不关闭”和 P3“历史标题暴露后端实现措辞”为后置项；Escape、取消/关闭、焦点闭环和核心任务均正常，不再制造当前切片返工。共享契约中无调用者的 `ConfirmTermVersion*` 记为 P3，因后端已无对应运行路由，推迟到下一次后端术语契约维护时删除。
- 按用户授权运行 S1 唯一一次完整 `pnpm check`，退出码 0；随后执行 `pnpm run db:stop` 成功，并用状态命令确认项目本地 PostgreSQL 未运行。M3 冲刺与功能等价矩阵已把多集 SRT 术语来源、术语人工审核、术语版本与导出更新为完成/已等价。
- `CURRENT.md` 从 v4-046 更新为 v4-047，FIFO 034 关闭，`FRONT-M3-01B` Rev 3 标记 `done`。新增 `PLAN-M3-02` Rev 1 `review / Current actor=用户`，只讨论中文 ASR 批次、供应商接入、术语热词、费用与授权边界；用户确认前不发布实现任务，不接密钥、不付费、不购买或部署云资源。本轮未提交、推送或部署。

## 2026-08-13 — UI 完成 FRONT-M3-01B Rev 3 正式 React 完整终验并交规划

- 使用正式 React `/terms` 与真实本地 API 建立 1 集 35 Cue 匿名项目，一次性完成来源摘要、搜索/四态/八类筛选、排序升降序、普通选择翻页清理、显式全量选择跨页、证据侧栏、Cue 第 2/2 页人工新增、逐行确认/驳回、公司五字段模板、单一发布、不可变 V1 和历史 XLSX 下载。真实状态最终为 36 个候选中的 33 待确认、1 已确认、1 已修改、1 已驳回；发布纳入 35 项并排除已驳回项。
- 模板管理真实制造启用指针并发变化，正式页面稳定显示 `TERM_EXPORT_TEMPLATE_VERSION_CONFLICT`、中文原因和请求标识，失败后焦点回到 dialog 内关闭按钮；刷新权威模板后，通过 UI 保存并启用 V4，字段顺序为 `type/name/aliases/note/gender`。发布绑定该 V4，历史下载地址返回 200、16463 字节和有效 XLSX/ZIP 签名，临时文件已删除。
- 1440×900 根页面 `1430/1430`；1024×768 Windows 纵向滚动槽下，侧栏展开 204px 和收起 72px 两态根页面均为 `1014/1014`，表格 `980px` 只在容器内产生 236px/104px 横滚。1024 模板窗口内部纵滚且根横溢为 0；最终控制台 `error/warn=0/0`。11 张正式页面截图与完整矩阵已追加到 `docs/ui/M3-terms-acceptance.md`。
- 正式请求完成过快，没有绕过 in-app Browser 隔离注入延迟器；CandidatePanel、TemplateDialog 与发布确认的提交中焦点/按钮锁定明确引用规划已独立复验的可控延迟 DOM 门作为等价证据，不冒充本轮真实延迟运行。完整终验未发现 P0/P1；记录 P2“模板和发布居中 dialog 的非提交态遮罩点击不关闭”与 P3“历史区标题暴露后端实现措辞”后置，不阻塞当前术语切片。
- 匿名项目与本轮模板 V2–V4 已按精确 ID/版本清理，启用模板恢复 V1；3000、3001、55432 端口已释放。`CURRENT.md` 从 v4-045 最小合并为 v4-046，登记 FIFO 034，任务保持 Rev 3 `review` 并转 `Current actor=规划对话`。未修改生产前端、后端、迁移、共享契约或 DESIGN，未重复冻结自动化、未提交、推送或部署，只通知规划总线。

## 2026-08-13 — UI 领取 FRONT-M3-01B Rev 3 一次性正式页面终验

- 完整重读项目协议、`CURRENT.md` v4-044、`DESIGN.md` 5.4、M3 术语 UI 验收、M3 术语契约和开发日志顶部，确认本轮只对正式 React 术语页做一次完整 UI 领域终验，不修改生产代码或扩展设计。
- `CURRENT.md` 更新为 v4-045；任务保持 Rev 3 `review / Current actor=UI 设计对话`。规划已通过的 17/17、TypeScript、145 模块构建、Impeccable、契约/等价矩阵和定向 DOM 门全部冻结，不重复运行。
- 本轮将统一覆盖 1440/1024 两态、来源与候选主链、普通/全量选择及分页、证据/人工新增、模板/发布/历史、三类弹窗/侧栏键盘焦点、滚动与控制台；真实 pending 注入若受浏览器隔离限制，只引用并明确标记规划的可控延迟 DOM“等价证据”。

## 2026-08-13 — 规划通过 FRONT-M3-01B Rev 3 并路由 UI 一次性终验

- 规划只读复核普通选择页码 effect、发布错误分类与查询刷新、CandidatePanel/TemplateDialog 的 pending/rejected 焦点 effect、dialog 容器自身 Tab/Shift+Tab 边界及四项新增定向回归；确认三项均处理原退审根因，Rev 2 已冻结的单一发布、只读门禁、候选状态、Cue 分页、视觉和等价矩阵未被改写。
- 独立运行 `pnpm exec vitest run tests/frontend/TermsWorkspace.test.tsx` 为 1 文件 17/17；前端 TypeScript、145 模块生产构建、Impeccable 定向机械检测 `[]` 和 `git diff --check` 全部通过。未发现新的 P0/P1，也未重复全部前端或完整 `pnpm check`。
- 按用户要求的速度与 v4 停止线，规划不再追加普通前端优化，将 `FRONT-M3-01B` 保持 Rev 3 `review` 并把 `Current actor/Reviewer` 路由 UI 设计对话，只进行一次正式 React 页面完整终验。UI 必须一次性回传全部发现；P2/P3 记录后置，不阻塞术语切片，只有真实 P0/P1 才允许退审。
- `CURRENT.md` 从 v4-043 更新为 v4-044，FIFO 033 关闭。本轮只修改规划状态与日志，未修改生产前端、后端、迁移、共享契约、DESIGN 或等价矩阵，未提交、推送或部署；完整 `pnpm check` 仍留 UI 通过后的 S1 关闭门。

## 2026-08-13 — FRONT-M3-01B Rev 3 交互恢复收口完成并交规划

### 三项定向修复

- 普通“当前页选择”现在随候选页码变化清空；显式 `allPendingSelected` 仍保持独立的跨页权威范围。新增回归从第一页选择后翻到第二页，确认普通批量栏消失，第二页批量请求只包含第二页新选择的候选 ID。
- CandidatePanel 与 TemplateDialog 在 mutation 进入 pending 后确定聚焦各自可编程 dialog；焦点位于容器时，Tab/Shift+Tab 会进入弹窗内首尾可操作项，无可操作项时留在容器，pending Escape/遮罩不关闭。请求失败、按钮重新可用且错误态已提交后，焦点确定回到关闭按钮；成功仍沿用既有关闭、触发点恢复与页面反馈语义。两类窗口均以可控延迟 Promise 覆盖 pending→rejected DOM 焦点。
- 正式发布仅在网络未知错误或 `TermApiError.retryable=true` 时保留同一 `publishIntent` body/key；明确非重试错误会清除旧意图并重新读取术语工作区、候选、版本/导出及模板状态，不自动再次提交。已有未知结果同键回归保留，新增确定性草稿冲突证明首次 revision 4/旧键失败后，刷新到 revision 5，下一次用户显式提交使用新 body/new key。

### 验证与边界

- 最终 `pnpm exec vitest run tests/frontend/TermsWorkspace.test.tsx`：1 文件 17/17 通过。首次限定验证的 2 项失败来自测试未等待候选详情按钮，以及 jsdom 无布局使 `offsetParent` 过滤后 Tab 保持在 dialog 容器；修正为等待详情和断言焦点始终处于 dialog 语境后复跑全绿，生产实现未因此改变。
- 前端 TypeScript 退出码 0，生产构建 145 模块通过，Impeccable 定向检测 `[]`，最终 `git diff --check` 退出码 0。按任务要求未重复全部前端测试或完整 `pnpm check`。
- `CURRENT.md` 从 v4-042 更新为 v4-043，`FRONT-M3-01B` Rev 3 转为 `review / Current actor=规划对话` 并登记 FIFO 033。未修改后端、迁移、共享契约、DESIGN 或 `LOCAL_APP_PARITY.md`，未提交、推送或部署；只通知规划总线。

## 2026-08-13 — 前端领取 FRONT-M3-01B Rev 3 交互恢复收口

- 完整重读项目协议、`CURRENT.md` v4-041、开发日志顶部和 Impeccable harden/质量底线，确认 Rev 2 的单一发布、统一只读、pending 状态、Cue 分页/跨筛选保留、视觉与等价矩阵均已通过规划独立审计并冻结。
- `CURRENT.md` 更新为 v4-042，任务转为 `in_progress`。本轮只修普通当前页选择跨页清理、CandidatePanel/TemplateDialog 的提交中与失败焦点，以及发布意图对网络未知/可重试和确定性非重试错误的分类恢复；不修改后端、迁移、共享契约、DESIGN 或 `LOCAL_APP_PARITY.md`。

## 2026-08-13 — 规划完成 FRONT-M3-01B Rev 2 审计并合并送 UI 前返工

- 规划独立核对正式术语 API、页面、候选/模板弹窗、测试、M3 契约、UI 验收矩阵和功能等价三行；确认 `/terms/releases` 单一发布、非活动/来源变化/提取运行统一只读、仅 `pending` 参与选择与批量、`rejected` 先恢复、Cue 服务端分页并跨筛选保留、两处视觉小修均按范围交付，未发现后端/契约/DESIGN 越权。
- 独立执行术语专项 13/13、全部前端 5 文件 41/41、前端 TypeScript、145 模块生产构建、Impeccable 机械检测 `[]` 和 `git diff --check`，全部通过；没有运行完整 `pnpm check`。这些通过项冻结，不在返工中重做。
- 送 UI 前按完整交互矩阵发现三项手工审计缺口：候选普通当前页选择在页码变化后保留旧页 ID，批量栏显示数量可能大于真正提交的当前页候选；CandidatePanel 与 TemplateDialog 的提交按钮/关闭按钮禁用后没有把焦点转入 dialog，动态失败后可能重现焦点落到背景；`publishIntent` 对确定性非重试错误也永久保留旧请求体/旧键，刷新后仍不能建立新提交意图。三项均有页面状态或源码路径证据，机械检测和已有通过测试不能覆盖。
- 为避免先送 UI 再退审，FIFO 032 关闭，`FRONT-M3-01B` 更新为 Rev 3 `ready / Current actor=前端开发对话`，一次性修正当前页选择清理、两类弹窗 pending→rejected 焦点和发布意图分类恢复并补定向 DOM 回归；其余业务、视觉、等价矩阵和后端事实冻结。本轮只更新规划状态与日志，未修改生产代码、契约或 DESIGN，未提交、推送或部署。

## 2026-08-13 — FRONT-M3-01B Rev 2 数据完整性收口完成并交规划

### 单一发布与统一只读

- 正式“确认并导出”已删除前端 `confirmTermVersion`、旧 `ConfirmTermVersion*` 引用和确认后再创建导出的双请求，只消费共享 `PublishTermVersionBody` 并调用 `POST /api/projects/:projectId/terms/releases`；历史导出列表/下载和附加导出 API 保持不变。发布未知结果会保留完整请求体和幂等键，重试直接重放同一发布意图，恢复后端返回的原版本、模板与导出绑定。
- 页面统一以项目 `active`、活动草稿来源仍为最新公司 SRT 摘要、最新提取不为 `running` 作为候选/模板/发布写入资格；不满足时仍可读取证据、模板历史、不可变版本与历史 XLSX，但隐藏或禁用人工新增、编辑、裁决、批量、模板写入/启用、发布及失败重试。普通选择与部分/全量批量只包含 `pending`；`rejected` 只保留“恢复”，不能直接编辑或再次裁决。

### Cue 分页、视觉小修与验证

- 人工新增 Cue 改为服务端 `limit=30/offset` 分页，继续支持原文搜索和集数筛选；翻页、搜索与筛选变化只重置当前页，不清空已选 Cue ID，可从总量超过 30 的后页选择真实证据并与首页证据一起提交。
- 按 Impeccable 已指出范围，仅把 `.pageNotice` 与证据引用的单侧 `4px/3px` 粗色边改为统一细边框，未改已确认布局、视觉层级或业务交互。定向检测无输出。
- 最终 `pnpm exec vitest run tests/frontend/TermsWorkspace.test.tsx` 为 1 文件 13/13，通过发布未知结果同键重放、四类只读状态、非 pending 限制和 Cue 跨页保留；全部前端为 5 文件 41/41。前端 TypeScript 退出码 0，生产构建 145 模块通过，`git diff --check` 退出码 0。首次验证曾因测试把原生 `summary` 错按 `button` 查询而出现 1 项失败，改为标签定位后复跑全绿；生产行为未因此变更。未运行完整 `pnpm check`。
- `LOCAL_APP_PARITY.md` 仅更新多集 SRT 导入、术语人工审核、术语版本与导出三行；`CURRENT.md` 从 v4-039 更新为 v4-040，`FRONT-M3-01B` Rev 2 转为 `review / Current actor=规划对话` 并登记 FIFO 032。未修改后端、迁移、共享契约或 DESIGN，未接真实 AI/ASR/OCR/云资源，未提交、推送或部署；只通知规划总线。

## 2026-08-13 — 前端领取 FRONT-M3-01B Rev 2 术语数据完整性收口

- 完整重读项目协议、`CURRENT.md` v4-038、M3 术语契约、冻结 UI、功能等价矩阵及开发日志顶部，确认 `BACK-M3-01E` 已通过规划独立复验，正式发布唯一写入口为 `POST /api/projects/:projectId/terms/releases`。
- `CURRENT.md` 更新为 v4-039，任务转为 `in_progress`。本轮只消费共享 `PublishTermVersion*`、统一只读资格、限制 `pending` 选择/批量、补 Cue 服务端分页与跨页已选保留，并移除两处单侧粗色边；不修改后端、迁移、共享契约、DESIGN 或冻结视觉，不扩展后续模块。

## 2026-08-13 — 规划通过 BACK-M3-01E 并解锁前端术语收口

- 规划独立核对共用写门禁、候选仓储、发布仓储、正式路由和共享 schema，确认事务锁顺序、项目 `active`、活动草稿、最新已确认公司 SRT 摘要、运行中提取、候选合法转换、发布失败回滚及同键同参重放均与 M3 S1 契约一致；旧 `POST /terms/versions` 已无后端运行入口，历史附加导出/下载仍保持独立且不构成正式发布双轨。
- 独立执行术语专项 1 文件 11/11、共享契约构建、后端生产构建、`check:repo` 与 `git diff --check`，全部通过；完整 `pnpm check` 按 v4 留给 S1 最终关闭门。本地 PostgreSQL 已确认停止。
- 共享契约仍保留 `ConfirmTermVersion*`，当前仅供尚未收口的前端旧调用编译；它不对应已注册的后端写路由，定为 P3 过渡清理项。`FRONT-M3-01B` Rev 2 只移除前端引用，待调用者归零后由 S1 关闭门清理共享死类型，不为此新增一次跨角色返工往返。
- `CURRENT.md` 从 v4-037 更新为 v4-038，FIFO 031 关闭，`BACK-M3-01E` 标记 `done`；`FRONT-M3-01B` Rev 2 自动转为 `ready / Current actor=前端开发对话`，一次性完成单一发布、统一只读、pending 选择、Cue 分页、未知结果回归和两处视觉小修。未修改生产代码、迁移或 DESIGN，未提交、推送或部署。

## 2026-08-13 — BACK-M3-01E Rev 1 数据完整性收口完成并交回规划

### 权威写入门禁与状态转换

- 新增共用术语写门禁，在候选决定、批量逐项决定、人工新增及正式发布各自的数据库事务内，按同一顺序锁定最新素材清单、术语提取、项目和活动草稿；项目非 `active`、草稿非活动、草稿来源摘要不再匹配最新全部已校验公司 SRT，或项目仍存在 `running` 提取时，均以稳定领域错误阻断写入。证据/历史等只读接口未改变。
- 普通采用/驳回只允许 `pending→approved/rejected`，恢复只允许 `rejected→pending`；编辑继续形成 `edited`，但不能绕过恢复直接编辑已驳回项。批量接口仍逐项提交并返回局部成功/失败，非法状态不再被覆盖写入。

### 单一幂等发布事务

- 共享契约新增显式 `templateVersionId` 的单一发布请求/结果；正式 `POST /api/projects/:projectId/terms/releases` 在一个 PostgreSQL 事务中确认不可变 `TermVersion`、绑定不可变模板版本并创建 `TermExport`，版本命令和导出命令使用同一幂等键/请求摘要。
- 首次成功与同键同参重放返回相同 `versionId/exportId/templateVersionId`；同键异参或命中旧的非完整命令记录稳定返回幂等冲突。显式模板不存在时不写版本；导出插入失败会回滚版本、条目、草稿状态和命令记录，网络未知结果可用原键重试，不会留下已确认版本但无 XLSX，也不会生成重复版本/导出。
- 旧 confirm-only `POST /api/projects/:projectId/terms/versions` 不再注册；版本读取、历史附加导出与按 `exportId` 下载仍保留，但不再是正式确认的必经第二步。显式模板绑定不读取当前启用指针，因此模板启用项并发变化不会改写本次或历史导出。

### 验证、清理与范围

- `pnpm exec vitest run tests/backend/terms.test.ts`：1 文件 11/11 通过。新增回归覆盖 `recycled/purging`、来源变化、运行中提取、非法重复采用/驳回/恢复与驳回后直接编辑、批量局部结果、模板不存在、事务失败无半成品、同键重放相同 IDs、同键异参冲突、启用模板变化下的显式绑定，以及原 V1→新草稿→V2/历史下载不回归。
- `pnpm --filter @qimao-terms-cloud/contracts build`、`pnpm --filter @qimao-terms-cloud/backend build` 与最终 `git diff --check` 均退出码 0。没有新增迁移；测试清理钩子已删除匿名项目、临时失败触发器和非默认模板，本轮本地 PostgreSQL 已正常停止。
- 对照 `LOCAL_APP_PARITY.md`，本轮实际覆盖“术语人工审核”的后端只读门禁/状态机和“术语版本与导出”的原子发布边界；矩阵语义与完成状态仍由规划复验后统一写回，本轮未越权修改。未运行完整 `pnpm check`，未修改生产前端、DESIGN，未接真实 AI/ASR/OCR 或云资源，未提交、推送或部署。
- `CURRENT.md` 从 v4-036 最小合并为 v4-037；`BACK-M3-01E` Rev 1 转为 `review / Current actor=规划对话`，登记 FIFO 031。只通知规划总线，`FRONT-M3-01B` 保持 blocked，不由后端通知或解锁。

## 2026-08-13 — 后端领取 BACK-M3-01E Rev 1 数据完整性收口

- 完整重读项目协议、`CURRENT.md` v4-035、M3 术语契约与 UI 验收、功能等价矩阵和开发日志顶部，确认本轮只覆盖“术语人工审核”“术语版本与导出”两项同源数据完整性边界。
- `CURRENT.md` 更新为 v4-036，任务转为 `in_progress`。只补数据库事务内的项目/活动草稿/当前来源/运行提取/候选转换门禁，以及单一幂等版本发布与模板导出绑定；前端 Rev 2 保持 blocked，不修改生产前端、DESIGN，不接真实 AI/ASR/OCR 或云资源。

## 2026-08-13 — 规划退审 FRONT-M3-01B Rev 1 并合并收口路径

- 规划独立核对正式术语页、候选/版本/导出后端状态机、共享契约、M3 契约、UI 验收和功能等价矩阵；独立复跑 `TermsWorkspace.test.tsx` 1 文件 6/6 与前端生产构建 145 模块通过。通过证据证明已有主路径可运行，但没有覆盖不可编辑、来源过期、非法状态转换、发布中断和 Cue 超过首 30 条的边界。
- 确认三个数据完整性缺口：项目已回收、来源变化或提取运行时，前端仍留有编辑/批量/驳回/恢复/重试入口，后端候选写入也没有完整生命周期与来源兜底；非 `pending` 可被批量确认/驳回；“确认版本”和“创建导出”由浏览器分两次请求，网络在中间中断会留下已确认版本但无本次 XLSX。另确认人工新增 Cue 固定 `limit=30/offset=0` 无分页，不能保证选择任意真实证据。
- 按 Impeccable 审计运行一次正式术语目录检测，发现 `.pageNotice` 与证据引用使用单侧 `4px/3px` 粗色边两项视觉反模式；该项只并入下一次前端 CSS 小修，不单独制造 UI 往返。专项测试与构建仍通过，不推翻上述真实契约缺口。
- `M3-terms-workflow.md`、`M3-terms-acceptance.md` 与 `LOCAL_APP_PARITY.md` 已同步权威门禁：候选状态转换与项目/来源只读必须前后端共同执行，Cue 选择必须服务端分页，“确认并导出”必须由单一后端幂等事务原子保存版本和模板导出绑定。矩阵三行退回“开发中”，不把计划当作完成事实。
- `CURRENT.md` 更新为 v4-035，FIFO 030 关闭；发布 `BACK-M3-01E` Rev 1 `ready`，`FRONT-M3-01B` 更新为 Rev 2 `blocked`。后端通过后再由前端一次性补门禁、分页、单一发布契约与视觉小修，最后只送 UI 一轮真实浏览器终验；本轮未修改生产前端/后端/迁移/共享代码，未运行完整 `pnpm check`，未提交、推送或部署。

## 2026-08-13 — FRONT-M3-01B Rev 1 正式术语页完成并交规划

### 实际交付

- 新增正式项目术语路由与模块入口，页面按已确认 UI 集成来源/提取门禁、服务端搜索/四态/八类筛选和正式排序、紧凑候选表、证据侧栏、人工新增/编辑/确认/驳回/恢复及项目生命周期保护；“概览与素材”可直接进入术语模块，ASR/OCR 与画面字仍保持未启用。
- 人工新增只调用 `GET /api/projects/:projectId/terms/cues` 搜索当前活动草稿及来源约束下的真实 Cue，没有证据不能保存；部分批量逐项回显成功/失败，显式“全部待确认”跨当前筛选读取后端权威全量，任一失败停止版本与导出并只为失败项提供逐项重试。
- 零待确认或全量采用成功后按“采用 → 不可变版本 → 显式模板绑定导出”执行；公司模板固定 `type/name/aliases/gender/note` 五字段，只以新版本保存和显式启用。页面刷新调用 `GET /api/projects/:projectId/terms/versions/:versionId/exports` 恢复原 `exportId/templateVersionId/columns`，不缓存导出 ID、不按当前模板重建历史文件。
- `LOCAL_APP_PARITY.md` 仅写回“多集 SRT 导入 / 术语人工审核 / 术语版本与导出”三行的云端覆盖、行为差异、验证证据与剩余缺口；未提前实现真实 AI/ASR/OCR、完整前置审改、风险、播放器、字幕验收或交付。

### 验证与交接

- `pnpm exec vitest run tests/frontend/TermsWorkspace.test.tsx`：1 文件 6/6 通过，覆盖服务端正式查询、真实 Cue 人工新增、部分/全量局部失败门禁、版本→导出顺序、历史绑定恢复和五字段模板版本。
- `pnpm exec vitest run tests/frontend`：5 文件 34/34 通过；前端 TypeScript 检查退出码 0；生产构建 145 模块通过。Impeccable 最终定向检测与 `git diff --check` 均无输出。
- `CURRENT.md` 从 v4-033 更新为 v4-034，`FRONT-M3-01B` Rev 1 转为 `review / Current actor=规划对话` 并登记 FIFO 030。依约未运行完整 `pnpm check`，真实浏览器终验留规划后继路由；未修改后端、迁移、共享契约或 DESIGN，未提交、推送或部署，只通知规划总线。

## 2026-08-13 — 前端领取 FRONT-M3-01B Rev 1 正式术语页

- 完整重读项目协议、`CURRENT.md` v4-032、M3 术语契约、已确认 UI、职责矩阵术语行、功能等价矩阵与新增本地应用等价要求；确认 `BACK-M3-01D` 已补齐人工新增真实 Cue 选择和历史导出绑定刷新恢复两项权威只读接口。
- `CURRENT.md` 更新为 v4-033，`FRONT-M3-01B` Rev 1 转为 `in_progress`。实现范围只覆盖多集 SRT 术语来源、术语人工审核、术语版本与导出三行，不提前实现 ASR/OCR、完整前置审改、播放器、字幕验收或交付；不修改后端、迁移、共享契约或 DESIGN。

## 2026-08-13 — 规划建立双应用等价门禁并通过 BACK-M3-01D

- 用户明确最终网站必须掌握并覆盖两个本地应用的基本全部功能，允许按第一性原理优化行为路径、交互和实现方式，但已有核心能力必须能够实现。
- 规划只读核对 `apps/short-drama-terms-workbench` 的 README、机器可读 `compatibility/feature_contracts.json`，以及 `apps/short-drama-subtitle-review` 的完整 README 与桌面核心/自测文件清单；确认现有云端主链路正确，但“仅作参考”和“内部版暂不阻塞”的文字不足以防止未来静默删减。
- `PRODUCT.md` 新增双应用功能等价硬门禁；新建 `docs/contracts/LOCAL_APP_PARITY.md`，分列审改/术语和字幕验收的来源保护、识别审改、风险/学习、播放器、时间轴、字幕编辑、冻结验收与导出恢复等能力域及当前状态。`WORKFLOW.md` 要求后续任务立项/关闭映射矩阵并写回差异与证据；两周内部版仍可分阶段，但未开始能力不能被当作永久非目标。
- 按 FIFO 029 独立核对 `BACK-M3-01D` 的共享 schema、路由、Cue 只读仓储、版本导出列表及回归；独立执行术语专项 1 文件 9/9、共享契约构建、后端生产构建和 `git diff --check` 均通过，随后本地 PostgreSQL 已停止。
- `CURRENT.md` 更新为 v4-032；`BACK-M3-01D` 关闭，`FRONT-M3-01B` 原 Rev 1 恢复为 `ready`，并新增当前术语切片的功能等价矩阵写回要求。本轮未修改生产前端、业务后端、迁移、共享契约或 DESIGN，未提交、推送或部署。

## 2026-08-13 — BACK-M3-01D Rev 1 权威只读契约完成并交回规划

### 实际交付

- 在共享术语契约增加 Cue 查询参数、Cue/分页结果与术语版本导出列表 schema。`GET /api/projects/:projectId/terms/cues` 强制 `draftId`，先核对草稿归属与 `active` 状态，再只读取该草稿 `sourceSrtSetDigest` 对应 Cue；支持原文包含搜索、集数、`limit/offset`，数据库按 `episodeNumber/cueIndex/id` 确定排序并返回独立 total。
- 新增单一 `TermCueRepository` 作为 PostgreSQL 只读边界，响应只含 `cueId/assetId/episodeNumber/cueIndex/startMs/endMs/text`。跨项目草稿返回 404，已确认或失效草稿返回 409；返回的 Cue ID 可直接通过既有人工新增接口的当前来源校验。
- `GET /api/projects/:projectId/terms/versions/:versionId/exports` 只从 `term_exports` 与不可变模板版本读取该术语版本的全部既有绑定，按 `createdAt DESC,id DESC` 排序；返回原 `exportId/templateVersionId/columns`，不创建、重建或改写导出。

### 验证、清理与边界

- `pnpm exec vitest run tests/backend/terms.test.ts`：1 文件 9/9 通过。新增回归覆盖跨项目、跨来源和非活动草稿隔离，原文搜索、集数、跨分页顺序、空结果、Cue 人工新增；并覆盖导出列表恢复原绑定、模板切换后历史绑定/下载稳定及读取不增加导出记录。
- `pnpm --filter @qimao-terms-cloud/contracts run build`、`pnpm --filter @qimao-terms-cloud/backend run build` 和最终 `git diff --check` 均退出码 0。本轮本地 PostgreSQL 已正常停止，专项清理钩子已清除匿名项目和非默认模板。
- `CURRENT.md` 从 v4-030 最小合并为 v4-031；`BACK-M3-01D` Rev 1 转为 `review / Current actor=规划对话`，登记 FIFO 029。依据职责矩阵“术语”行，未新增迁移，未修改前端、DESIGN、术语状态机或既有写入语义，未运行完整 `pnpm check`，未提交、推送或部署；只通知规划总线，`FRONT-M3-01B` 保持 blocked。

## 2026-08-13 — 后端领取 BACK-M3-01D Rev 1 权威只读契约补充

- 完整重读项目协议、`CURRENT.md` v4-029、M3 术语契约、职责矩阵术语行与开发日志顶部，确认前端提出的 Cue 选择和历史导出恢复缺口已经规划核对成立。
- `CURRENT.md` 更新为 v4-030，任务转为 `in_progress`。本轮只补活动草稿/来源摘要约束的 Cue 查询，以及按术语版本读取既有导出绑定；不新增迁移，不修改前端、DESIGN、术语状态机或既有写入路径，完成后只交规划总线。

## 2026-08-13 — 规划接受前端术语读取契约冲突并拆出最小后端补充

- 规划独立核对共享 schema、正式 Fastify 路由、工作区/版本投影、候选仓储和导出仓储，确认 `FRONT-M3-01B` 报告的两项缺口均成立：人工新增强制真实 `evidenceCueIds`，但没有查询任意来源 Cue 的入口；导出读取必须预先知道 `exportId`，但没有按 `termVersionId` 恢复历史绑定的入口。
- 裁决禁止前端复用其他候选证据、缓存导出 ID 或按当前模板重建历史文件。该问题属于已确认 S1 内的代码契约/数据所有权缺口，不需要用户重新选择产品方向；前端原 Rev 1 保持 `blocked` 且已完成部分冻结。
- 新增 `BACK-M3-01D` Rev 1：不做迁移，只增加受活动草稿及其 `sourceSrtSetDigest` 约束的 Cue 搜索/集数筛选/分页只读 API，以及按 `projectId + termVersionId` 确定性列出现有导出绑定的 API；回归覆盖隔离、分页顺序、人工新增可用性和切换模板后的历史恢复。
- `CURRENT.md` 更新为 v4-029，并登记 FIFO 028 已关闭；后端补充通过规划独立复验后，再自动恢复 `FRONT-M3-01B`。未修改生产前端、后端、迁移、共享契约或 DESIGN，未提交、推送或部署。

## 2026-08-13 — FRONT-M3-01B Rev 1 提交术语契约与刷新恢复冲突审查

### 冲突类型与当前依据

- 冲突类型为代码契约与权威数据所有权。依据 `M3-terms-workflow.md`、`DESIGN.md` 5.4、UI Rev 3 和职责矩阵术语行，正式前端必须支持“人工新增关联真实 SRT 证据”和“历史导出绑定原模板且刷新后恢复”，不得用浏览器缓存、现有候选证据或当前模板猜测。
- 前端在领取后只读映射全部共享术语 schema、正式 Fastify 路由、工作区投影、候选仓储和导出仓储；尚未修改生产代码或前端测试。

### 可复现证据与影响

- `CreateManualTermCandidateBodySchema` 强制 `evidenceCueIds` 至少 1 项；正式路由只有候选详情返回该候选已经绑定的 Cue，没有按项目/草稿查询或搜索真实 `term_cues` 的 API。人工新增遗漏术语时无法从权威来源选择任意字幕证据，复用其他候选证据会制造错误关联。
- PostgreSQL `term_exports` 和 `TermExportSchema` 持有 `termVersionId/templateVersionId/exportId`，但 `TermWorkspaceSchema`、`TermVersionSchema` 不投影导出绑定；正式 GET/下载路由均要求调用方预先知道 `exportId`，且没有按 `termVersionId` 列出导出的入口。刷新后浏览器无法恢复历史导出 ID 和原模板绑定；缓存 ID 会成为第二状态源，用当前启用模板重建则可能改变历史结构。
- 两项缺口直接阻断人工新增、模板绑定导出、历史重新下载和刷新恢复四个必验路径。其余候选筛选/裁决虽可单独编码，但会形成无法完成验收的半套正式页面，因此按协议停止。

### 最小建议、继续边界与路由

- 最小建议一：后端提供受当前草稿/来源摘要约束、可分页搜索的真实 SRT Cue 只读契约，返回 `cueId/集数/轴号/时间/原文`，供人工新增明确选择。
- 最小建议二：在工作区/版本投影加入已绑定导出摘要，或提供按 `projectId + termVersionId` 查询导出列表/当前正式导出的接口，使刷新后能从 PostgreSQL恢复 `exportId` 与原模板版本并下载历史结构。
- `CURRENT.md` 更新为 v4-028；`FRONT-M3-01B` 保持 Rev 1，转为 `blocked / Current actor=规划对话`。前端只通知规划总线，不直接联系后端/UI；未实现真实 AI/ASR/OCR 等越界功能，未提交、推送或部署。

## 2026-08-13 — 前端领取 FRONT-M3-01B Rev 1 正式术语纵切

- 前端开发对话完整重读项目协议 v4、`CURRENT.md` v4-026、M3 术语契约、`DESIGN.md` 5.4、UI Rev 3 验收、职责矩阵术语行及开发日志顶部，确认 UI 与术语/模板后端依赖均已通过且任务为 `ready`。
- 按 v4 规则只把任务改为 `in_progress`，不机械增加任务 Rev；范围仅为 `frontend/src/features/terms/`、必要 App 路由/模块注册/AppShell 标题和前端测试，PostgreSQL/API 继续作为候选、状态、版本和模板的唯一权威来源。
- 使用 Impeccable 的既有 Operate 工作台规则约束一致性、状态和可访问性，但不改写已确认 UI；不实现真实 AI/ASR/OCR、密钥控制台、视频播放器、任务中心或账号，不修改后端、迁移、共享契约或 DESIGN，不提交、推送或部署。

## 2026-08-13 — 用户确认术语 UI 并解锁正式前端集成

- 用户确认 `UI-M3-01` Rev 3 最终增量方向；规划将 UI 任务标记 `done`。已确认范围包括术语正式排序与证据、候选四态、选择全部待确认、一键全部采用并导出、局部失败原子门禁与唯一重试，以及公司五字段模板不可变版本管理。
- `BACK-M3-01A` 与 `BACK-M3-01C` 已先后通过规划独立复验，因此 `FRONT-M3-01B` 的全部依赖同时满足；任务从 `blocked` 解锁为 `ready / Current actor=前端开发对话`。
- 前端只允许实现 `frontend/src/features/terms/`、必要路由/模块注册和前端测试，并消费后端权威状态与显式导出绑定；完成后必须回到规划总线审核，不得直接通知 UI。真实 AI/ASR/OCR、播放器、密钥控制台、任务中心、账号权限、提交、推送和部署继续不在范围内。
- `CURRENT.md` 更新为 v4-026；本轮只更新状态与日志，未修改生产前端、后端、迁移、共享契约或 DESIGN。

## 2026-08-13 — 规划关闭 UI 证据复核与后端导出契约返工

- 按 FIFO 先审 `UI-M3-01` Rev 3：人工查看 `rev3-1440-template-fields-current.png` 与 `rev3-1440-bulk-failure-with-retry.png`，确认模板只显示 `type/name/aliases/gender/note`，局部失败同屏显示未创建版本/文件、具体并发原因和唯一“重试”。证据与当前契约一致，队列 026 关闭；任务路由用户只做最终增量方向确认，尚未标记 `done`。
- 再审 `BACK-M3-01C` Rev 2：代码核对确认 `TermExportTemplateColumnSchema` 的嵌套对象已严格关闭，旧无绑定 `/versions/:versionId/export.xlsx`、`exportVersion` 和 `defaultTemplate` 生产路径不存在，默认五列下载只走显式导出绑定。
- 规划独立运行 `pnpm run db:setup`、`pnpm exec vitest run tests/backend/terms.test.ts`（1 文件 8/8）、共享契约构建、后端生产构建和 `git diff --check`，全部退出码 0；随后 `pnpm run db:stop` 成功。队列 027 与 `BACK-M3-01C` 关闭；未运行完整 `pnpm check`，留给 S1 关闭门。
- `CURRENT.md` 更新为 v4-025。`FRONT-M3-01B` 仍未解锁，当前只等待用户确认 `UI-M3-01` 最终增量方向；未修改生产前端、业务后端、迁移、DESIGN，未提交、推送或部署。

## 2026-08-13 — BACK-M3-01C Rev 2 定向返工完成并交回规划

### 实际修正

- `TermExportTemplateColumnSchema` 的嵌套列对象增加 `additionalProperties: false`；API 回归分别提交 `formula`、`style` 和任意未声明配置，三类请求均返回 400，模板列表仍只有默认版本，证明请求被拒绝而非静默丢弃后保存。
- 删除无生产调用者的旧 `/api/projects/:projectId/terms/versions/:versionId/export.xlsx` 路由、`exportVersion` 服务方法和 `defaultTemplate` 仓储方法；代码扫描在后端与术语专项中不再发现这些符号。
- 默认五列表头、条目顺序、无示例行和重复下载字节一致性断言，统一改走“创建显式 `TermVersion + TemplateVersion` 导出绑定 → 按 exportId 下载”的正式链路。Rev 1 的迁移、表结构、模板启用、历史导出及术语状态机没有改动。

### 验证、清理与边界

- `pnpm exec vitest run tests/backend/terms.test.ts`：1 文件 8/8 通过。
- `pnpm --filter @qimao-terms-cloud/contracts run build` 与 `pnpm --filter @qimao-terms-cloud/backend run build`：均退出码 0；`git diff --check` 退出码 0。
- 专项 `afterAll` 已清理匿名项目及非默认模板，本轮启动的本地 PostgreSQL 已正常停止。按任务边界未运行完整 `pnpm check`，留给 S1 关闭门。
- 并行 UI 写回后重读 `CURRENT.md` v4-023，并最小合并为 v4-024；`BACK-M3-01C` Rev 2 转为 `review / Current actor=规划对话`，登记 FIFO 027。未修改迁移、候选/草稿/术语版本、项目生命周期、生产前端或 DESIGN，未提交、推送、部署或解锁前端；只通知规划总线。

## 2026-08-13 — UI 完成 UI-M3-01 Rev 3 最终证据刷新并交回规划

- 通过独立本机端口和 `?preview=1&rev=3-20260813` 强制加载仓库外当前原型，排除旧缓存。新模板证据 `rev3-1440-template-fields-current.png` 的 DOM 与画面均只含 `type/name/aliases/gender/note`，旧 `content/notes=false`。
- 当前失败样例原有具体原因但没有明确行级“重试”按钮。只在仓库外取证原型做最小呈现修正：将失败样例放到首行，并把该失败行的唯一主操作从普通“确认”改为“重试”。新证据 `rev3-1440-bulk-failure-with-retry.png` 同屏显示顶部“未创建 V1、未生成 XLSX”、叶知秋行具体并发更新原因和唯一“重试”；DOM 为 `retryCount=1 / confirmCount=0`。
- 模板与失败两态控制台均为 `error/warn=0/0`；仓库外 `app.js` 的 `node --check`、授权文档 `git diff --check` 通过。最终证据路径和实测已写入 `docs/ui/M3-terms-acceptance.md`；DESIGN 语义、生产前端、后端、迁移、共享契约及 Rev 2 其他冻结证据均未修改。
- 并行后端写回后重读 `CURRENT.md` v4-022，并最小合并为 v4-023；`UI-M3-01` 保持 Rev 3，转为 `review / Current actor=规划对话`，登记 FIFO 026。UI 只通知规划总线，不通知前端、不自行解锁 `FRONT-M3-01B`。

## 2026-08-13 — 后端领取 BACK-M3-01C Rev 2 定向返工

- 重读项目协议、`CURRENT.md` v4-021 与开发日志顶部，确认 Rev 1 的迁移、模板/导出表、显式绑定、历史确定性下载及术语主体证据冻结；本轮只收紧嵌套列请求边界，并移除无生产调用者的旧无绑定直出路径。
- `CURRENT.md` 更新为 v4-022，任务转为 `in_progress`。不修改迁移、候选/草稿/术语版本、项目生命周期、生产前端或 DESIGN；完成后只交规划总线复验。

## 2026-08-13 — UI 领取 UI-M3-01 Rev 3 最终证据刷新

- 重读 `CURRENT.md` v4-020、术语 UI 验收记录与开发日志顶部，确认规划已冻结 Rev 2 的 DESIGN、交互逻辑、模板窗口、键盘及 1024/1440 测量；本轮只刷新模板字段和局部失败两张最终截图并排除旧缓存。
- `CURRENT.md` 更新为 v4-021，任务保持 Rev 3 并转为 `in_progress`。不修改 DESIGN 语义、生产前端、后端、迁移或共享契约；只有当前原型无法呈现既定证据时才允许最小仓库外取证修正。

## 2026-08-13 — 规划审核 UI-M3-01 Rev 2 并只退最终证据同步

- 规划按 Impeccable `audit` 完成一次有界审计：`DESIGN.md` 与验收矩阵中的当前页/全部待确认范围、唯一主动作、批量局部失败、模板不可变版本、键盘焦点、1024/1440 滚动归属和模块边界均与 M3 契约一致。仓库外原型的当前 `fieldLabels` 明确为 `type/name/aliases/gender/note`；机械检测返回 `[]`，但因本机缺 HTML 解析模块为正则降级，只作辅助。
- 三张证据图人工核对发现两个证据完整性缺口：`rev2-1440-template-manager.png` 仍显示旧 `content/notes`，与当前原型、DESIGN、验收文字及共享契约的 `name/note` 直接矛盾；`rev2-1024-bulk-failure.png` 只展示顶部整批结论，没有展示验收文字所声称的失败行具体原因和唯一重试入口。
- 任务更新为 `UI-M3-01` Rev 3 `ready`，只刷新这两张与当前代码一致的最终证据并核对浏览器无旧缓存；Rev 2 的设计、交互、测量、键盘、正常全量截图和其他证据冻结。`CURRENT.md` 更新为 v4-020；前端继续阻塞，UI 仍只通过规划总线交接。

## 2026-08-13 — 规划独立复验 BACK-M3-01C Rev 1 并合并双路径契约返工

### 独立通过证据

- 规划逐项核对共享五字段契约、增量迁移、模板仓储、服务/路由、XLSX 生成和术语专项：公司模板版本、单例启用指针、条件启用、模板/导出幂等命令、`TermVersion + TemplateVersion` 显式绑定、不可更新触发器和确定性历史下载主链路与 S1 契约一致。
- 独立执行 `pnpm run db:setup` 后，13 个迁移成功；术语专项 `tests/backend/terms.test.ts` 为 1 文件 8/8，共享契约构建、后端生产构建和 `git diff --check` 均退出码 0。项目永久清理删除 `term_versions` 时由外键级联删除项目导出/命令，不影响公司级模板。随后本地 PostgreSQL 已正常停止。

### 一次性退审与停止边界

- P2 契约严格性：`TermExportTemplateColumnSchema` 的嵌套对象未设置 `additionalProperties: false`。规划用共享 schema 实测携带 `{ formula: '=1' }` 的列仍返回 `acceptsUndeclaredColumnConfig=true`；服务会静默丢弃该字段，与“首版不实现公式/样式/任意配置”的边界冲突，也会误导未来前端认为保存成功。
- P2 单一路径：正式后端同时保留显式“创建导出绑定 → 按 exportId 下载”和旧 `/versions/:versionId/export.xlsx` 无绑定直出。代码扫描确认旧路由只有后端测试调用；启用自定义模板后它仍固定读取默认 v1，既不创建审计绑定，也与 UI 的当前模板语义不一致。
- 两项属于同一个导出契约收口根因，合并为 `BACK-M3-01C` Rev 2：严格拒绝嵌套未声明配置，并删除/停用无真实调用者的旧无绑定路由，默认模板回归统一走显式绑定链路。Rev 1 迁移、数据模型、模板启用、历史字节稳定与数据库快照证据全部冻结；不重写状态机、不运行完整 `pnpm check`、不修改 UI/前端或解锁 `FRONT-M3-01B`。`CURRENT.md` 更新为 v4-019。

## 2026-08-13 — UI 完成 UI-M3-01 Rev 2 并交回规划

- 在 Rev 1 用户已确认的术语工作台结构上完成唯一增量方向：当前页选择后显式提供“选择全部 N 项待确认候选”；部分选择保留批量确认/驳回；权威全量态收起普通批量动作，只保留“全部采用并导出 XLSX”；零待确认页首主操作统一为“确认并导出”。
- 全量路径的确认框绑定来源摘要、待处理数量和当前模板版本；局部失败状态明确“未创建版本、未生成 XLSX”，同时保留成功项真实状态并在失败行显示稳定原因。公司模板窗口只允许编辑模板名和 `type/name/aliases/gender/note` 五个固定字段的表头/顺序，支持保存新版本、保存并启用、历史只读与旧版本启用，不形成任意列设计器。
- 只更新 `DESIGN.md`、`docs/ui/M3-terms-acceptance.md` 和仓库外 `m3-terms-rev2/` 原型/3 张证据；未修改生产前端、后端、迁移、共享契约、ASR/OCR、播放器、账号或任务中心。
- 真实浏览器验证：1440 根页面 `1425/1425`；1024 Windows 滚动槽下根页面 `1009/1009`，侧栏展开 `204px` 与收起 `72px` 时表格 `1040/759`、`1040/891`，横滚只在 `.tableWrap`；模板窗口 1024 为 `760/760`。全量选择显式升级、原子门禁、局部失败逐项提示、模板字段/历史与 Tab/Shift+Tab/Escape 闭环均通过，控制台 `error/warn=0/0`；仓库外脚本 `node --check` 与授权文档 `git diff --check` 通过。
- `CURRENT.md` 更新为 v4-018；`UI-M3-01` 保持 Rev 2，转为 `review / Current actor=规划对话`，登记 FIFO 024。UI 只通知规划总线，不直接通知前端、不自行解锁 `FRONT-M3-01B`。

## 2026-08-13 — UI 领取 UI-M3-01 Rev 2

- 重读项目协议 v4、`CURRENT.md` v4-015、M3 术语契约 5/7/9、职责矩阵术语行、`DESIGN.md` 5.4、既有 M3 UI 验收记录与开发日志顶部；确认 Rev 1 整体方向已获用户通过，本轮只补全部待确认选择升级、一键采用/导出门禁及公司级五字段模板版本窗口。
- 按 v4 将任务改为 `in_progress`，保留 Rev 2；只允许修改 `DESIGN.md`、`docs/ui/M3-terms-acceptance.md` 和仓库外原型/截图，不修改生产前端、后端、迁移或共享契约。
- 采用 Impeccable harden 约束处理全量选择歧义、批量局部失败、导出原子门禁、模板字段唯一性、历史版本只读和键盘焦点；不扩展到 ASR/OCR、播放器、账号、任务中心或任意列设计器。

## 2026-08-13 — BACK-M3-01C Rev 1 完成并交回规划

### 实际交付

- 新增共享模板/导出契约：五个固定字段 `type/name/aliases/gender/note`、字段—显示表头、不可变模板版本、当前启用版本、显式导出绑定及创建/启用请求；不暴露任意字段、公式或样式配置。
- 新增 1 个增量迁移：公司级模板版本、单例启用指针、模板幂等命令、术语导出绑定及导出幂等命令共 5 张表；默认 v1 固定为 `类型、中文内容、别称、性别、备注`。数据库约束保证五字段各一次、名称/表头非空，模板版本和导出绑定禁止更新。
- 新增模板列表、幂等保存新版本、条件启用 API，以及已确认 `TermVersion + TemplateVersion` 的幂等导出绑定、元数据和 XLSX 下载 API。模板启用只更新单例指针；旧版本保留，历史下载继续引用原模板版本。
- XLSX 生成器按模板列顺序读取固定五字段数据，不改变数据类型、别称分隔、空值和术语条目排序；原默认五列下载入口明确读取默认模板 v1，保持 `BACK-M3-01A` 已通过行为。

### 验证与清理

- 术语专项 `tests/backend/terms.test.ts` 为 1 文件 8/8：覆盖默认模板、重复/缺失字段 422、模板保存幂等、数据库不可更新、旧版本保留、新版本条件启用、导出绑定幂等、历史元数据、同一导出重复下载字节一致及自定义表头/顺序。
- 专项在模板启用和两种导出前后比较候选、草稿、术语版本和版本条目的完整 PostgreSQL JSON 快照，结果逐字段完全一致；启用 v2 后重新下载 v1 历史导出，字节保持一致。
- 后端生产构建、共享契约构建和 `git diff --check` 均通过。独立临时库从零执行 13 个迁移，核对 5 张导出相关表、2 个不可变触发器、默认 v1 和启用指针后已删除。
- 主库最终 `projects/term_exports/term_export_commands/term_export_template_commands` 均为 0，只保留迁移创建的默认模板 v1 且正确启用；本地 PostgreSQL 已停止。按 v4 未运行完整 `pnpm check`，留给 S1 关闭门。

### 边界与交接

- 依据职责矩阵“项目工作台 / 术语”行，仅修改共享模板契约、必要迁移、术语后端模块及后端测试；`BACK-M3-01A` 保持 done，没有修改候选、草稿、术语版本、上传或回收语义。
- 未修改生产前端/DESIGN，未实现任意字段、公式/样式设计器、账号审批、多租户或真实 AI/ASR，未提交、推送、部署或创建云资源。
- `BACK-M3-01C` 保持 Rev 1，转为 `review / Current actor=规划对话`；当前只通知规划独立复验，不直接通知或解锁前端。

## 2026-08-13 — 规划关闭 BACK-M3-01A Rev 2，并拆分一键采用与版本化模板任务

### 后端独立复验

- 规划独立核对 `term-candidate.repository.ts` 与术语 API 回归：人工新增只规范化名称一次，全空白名称在写库前返回 `422 / TERM_CANDIDATE_INVALID / edit_candidate`；失败后沿用原草稿修订可正常新增，证明错误请求没有推进修订。跨类型同名由草稿级唯一约束稳定返回 `409` 和准确文案。
- 本轮重新启动本地 PostgreSQL 后，术语专项 `tests/backend/terms.test.ts` 为 1 文件 8/8；后端生产构建成功，`git diff --check` 通过。随后已正常停止本地 PostgreSQL。Rev 1 的迁移、来源、证据、四态、不可变事件/版本和 XLSX 证据继续冻结，完整 `pnpm check` 留给 S1 切片关闭。
- `BACK-M3-01A` Rev 2 标记 `done`；队列 023 关闭。新增导出模板属于独立产品范围，不回开已经通过的术语核心任务。

### 用户确认与范围裁决

- 用户确认 Rev 1 术语页整体方向，并要求在 AI 候选质量足够时无需逐条确认：从当前页选择可显式扩展为本草稿全部待确认候选，随后一次完成全部采用、不可变版本创建和 XLSX 下载。局部失败必须保留真实逐项结果，但停止版本创建和导出；已驳回项不得被静默采用。
- 用户要求表头可通过模板编辑并由后端保存。规划把首版收敛为公司级、版本化的五字段表现模板：只允许改模板名称、`类型/中文内容/别称/性别/备注` 五字段的显示表头与列顺序；不允许删除字段、增加任意业务字段或改变术语数据。保存形成不可变模板版本，历史导出绑定原模板版本。
- `M3-terms-workflow.md`、职责矩阵和 M3 冲刺里程碑已同步上述边界；`CURRENT.md` 更新为 v4-014。`UI-M3-01` Rev 2 与独立 `BACK-M3-01C` Rev 1 受控并行，前者只更新已通过原型，后者只实现模板版本/导出后端；`FRONT-M3-01B` 继续阻塞，等待两项分别验收，不提前写占位实现。

## 2026-08-13 — BACK-M3-01A Rev 2 定向返工完成并交回规划

- 完整重读项目协议、`CURRENT.md` v4-011 与开发日志顶部，确认唯一后端可执行项是规范名输入边界返工；生产代码只修改 `backend/src/modules/terms/term-candidate.repository.ts`，测试只修改 `tests/backend/terms.test.ts`。
- `createManual` 现在只计算一次 trim 后的规范名，并在任何候选写入前拒绝空串，返回稳定 `422 / TERM_CANDIDATE_INVALID / edit_candidate`；数据库 `23505` 映射文案统一改为“同一草稿中已存在相同中文术语的候选”，准确覆盖跨类型同名约束。
- API 回归证明全空白名称不会落到通用 500，且不会增加草稿修订；随后同修订可正常人工新增。再以最新修订跨类型新增相同中文术语，稳定返回 `409 / TERM_CANDIDATE_INVALID / edit_candidate` 和准确文案。
- 定向术语专项 `tests/backend/terms.test.ts` 为 1 文件 8/8；后端生产构建退出码 0，`git diff --check` 无输出。按 v4 未运行完整 `pnpm check`；主库 `projects/term_candidates` 均为 0，本地 PostgreSQL 已停止。
- Rev 1 已通过的来源、提取、候选四态、事件、版本、XLSX、迁移、上传和回收证据全部冻结；未修改共享契约、其他术语状态机、前端/DESIGN，未提交、推送、部署或通知前端。任务保持 Rev 2，转为 `review / Current actor=规划对话`。

## 2026-08-13 — 规划完成 BACK-M3-01A Rev 1 独立复验并合并一次输入边界返工

### 独立通过证据

- 规划代码审查确认：最新清单全部 `company_srt` 必须绑定已校验 SRT Asset；对象字节会再次核对大小和 SHA-256；`sourceSrtSetDigest` 只由集数、Asset ID 和内容校验构成，视频变化不会使术语过期；SRT 解析保留稳定 Cue，候选必须引用真实 Cue。
- 独立启动本地 PostgreSQL 后，术语专项 `tests/backend/terms.test.ts` 为 1 文件 8/8；全部后端为 6 文件 51/51。共享契约构建、后端生产构建和 `check:repo` 均退出码 0；术语范围未发现外部网络调用或供应商密钥模式。
- 规划新建隔离数据库 `qimao_terms_cloud_audit_v4010` 从零执行全部 12 个迁移，查询得到 `12` 个迁移记录、`11` 张 `term_*` 表和 `3` 个不可变触发器；随后已删除该隔离数据库。本轮启动的本地 PostgreSQL 已正常停止。
- 规划从正式 `createTermVersionXlsx` 生成匿名两行样本，使用标准表格工具实际导入并渲染成功：仅 `Sheet1`，五列为 `类型、中文内容、别称、性别、备注`，人名先于地名，别称以 ` / ` 分隔，非人名性别为空，公式错误扫描为 0。该样本只保存在当前规划任务仓库外验收目录，不进入源码或交付。

### 合并缺口与定向路由

- 首轮代码审查发现一个 P2 输入边界：人工新增请求的 `name` 只在共享 schema 检查原始长度；`TermCandidateRepository.createManual` 将全空白字符串 `trim()` 后直接写入数据库，会触发 `term_candidates_values_valid`，再由全局错误处理误报为可重试 `500 INTERNAL_ERROR`，而不是员工可修正的稳定业务错误。
- 同一名称唯一性已经由数据库按 `draft_id + name` 强制，但现有 `23505` 文案仍写“相同类型和名称”，会在跨类型同名时误导员工。两项属于同一规范名输入/唯一性根因，合并为一次 Rev 2，不拆散成多轮。
- `BACK-M3-01A` 更新为 Rev 2 `ready / Current actor=后端开发对话`：只允许修改候选仓储与术语专项测试，补全空白名称 `422 TERM_CANDIDATE_INVALID` 和跨类型同名准确文案/API 回归；Rev 1 的来源、提取、事件、版本、XLSX、迁移、回收及零付费证据全部冻结。`FRONT-M3-01B` 继续阻塞。

## 2026-08-13 — BACK-M3-01A Rev 1 完成并交回规划

### 实际交付

- 按职责矩阵“项目工作台 / 术语”行新增唯一共享代码契约 `packages/contracts/src/terms.ts` 和 Fastify 术语 API：来源/运行/草稿/版本投影、候选分页/搜索/状态与类型筛选/确定性排序、候选详情与证据/审计、人工裁决与新增、批量局部结果、草稿克隆、版本确认和 XLSX 下载。所有业务错误沿用统一请求标识结构。
- 新增 3 个术语增量迁移，PostgreSQL 持有 `TermExtractionRun`、稳定 Cue、草稿候选、真实证据、不可更新的人工事件、不可更新的已确认版本快照和幂等命令；同一草稿中的名称保持单一正式类型。整项目永久清理仍可按依赖顺序删除这些审计记录，不阻塞既有 Asset 清理。
- 最新已确认清单中的全部 `company_srt` 必须绑定已校验 Asset；后端通过最小 `UploadStorage.readObject` 只读边界逐对象核对大小和 SHA-256，再按集数、Asset ID 和内容校验值生成 `sourceSrtSetDigest`。只修改视频保持摘要，修改公司 SRT 明确标记来源过期。
- SRT 严格解析 UTF-8、轴号、时间范围和非空原文，并以 Asset/集数/轴号/起止时间/原文生成稳定 Cue ID；单文件单轴错误会精确失败并保存 failed 提取运行，不能跳过坏文件。
- 交付前把稳定 Cue 持久化收口为 `jsonb_to_recordset` 单次集合写入，避免 50–100 集素材按 Cue 逐条往返数据库；不改变 Cue 身份、事务或失败语义。
- `TermExtractionAdapter` 可替换；本任务默认实现只识别匿名测试标记的确定性 fake，配置明确 `paid=false`、用量 `paidCalls=0`，没有网络调用、供应商 SDK 或密钥。adapter 输出仍须经过八类、名称唯一、置信度和真实 Cue 证据校验，失败项只记诊断，不能成为权威候选。
- 候选支持 `pending/approved/edited/rejected`、人工新增/修改/驳回/恢复、候选条件版本和草稿条件版本；批量确认/驳回逐项事务并返回局部结果。全部离开 pending 且来源仍匹配后才能幂等生成不可变 V1；从 V1 建立新草稿后再次显式确认生成 V2，不覆盖 V1。
- 正式 XLSX 只从已确认版本生成 `类型、中文内容、别称、性别、备注` 五列；八类顺序、人名优先、同类首次证据顺序、` / ` 别称分隔、非人名空性别和无示例行均由后端固定。

### 验证与清理

- 集合写入优化后重新运行术语专项 `tests/backend/terms.test.ts`：1 文件 8/8 通过，覆盖双集全部就绪、视频/SRT 两类来源变化、坏轴失败运行、八类真实证据、服务端分页筛选排序、条件裁决/恢复/人工新增、批量局部失败、事件不可更新、V1→V2、不变快照、五列 XLSX 和项目到期清理兼容。
- 最终全部后端测试：6 文件 51/51 通过；独立回收专项：1 文件 7/7 通过。后端生产构建、共享契约构建和后端静态检查均退出码 0。
- `pnpm run check:repo`、后端 lint、`git diff --check` 通过；术语范围密钥模式扫描 0 命中。按 v4 质量门未运行完整 `pnpm check`，留给 S1 切片关闭统一执行。
- 进程唯一临时 PostgreSQL 数据库从零执行 12 个迁移，核对 11 张术语表和 3 个不可变触发器后立即删除；主库最终 `projects/term_runs/term_drafts/term_versions/term_cues` 均为 0，本地 PostgreSQL 已停止。

### 边界与交接

- 唯一跨目录生产边界是 `UploadStorage.readObject`/内存 fake 的只读实现、应用术语路由注册，以及项目永久清理时先删除术语依赖；上传写入、分片、完成和 Asset 绑定未重构。
- 未调用真实 AI/ASR，未写入、返回或记录密钥，未修改生产前端/DESIGN，未实现 OCR、视频播放器、任务中心、管理员控制台或账号；未修改根级依赖，未提交、推送、部署或创建云资源。
- `BACK-M3-01A` 保持 Rev 1，更新为 `review / Current actor=规划对话`。当前只请求规划独立复验；后端未直接通知或解锁 UI/前端。

## 2026-08-13 — 规划通过 UI-M3-01 Rev 1 交接审计并路由用户方向验收

### 审计结论

- 规划逐项核对 `DESIGN.md` 5.4、`docs/ui/M3-terms-acceptance.md`、M3 术语契约和职责矩阵，确认页面只承载项目工作台“术语”：公司 SRT 来源/提取事实、候选筛选与正式排序、证据侧栏、四态人工裁决、人工新增/编辑、批量处理、待确认门禁、不可变版本和来源过期。
- 规划重新查看 6 张 1440/1024/证据侧栏/来源变化/V1 确认证据图；视觉层级、紧凑表格、中文状态与语义色、单一主动作、响应式滚动归属和来源变化阻断未发现 P0/P1，也没有把上传、任务中心、ASR/OCR、播放器、密钥、账号或学习库塞入当前切片。
- 证据侧栏保留集数、轴号、时间和原文，满足“结论回到真实 SRT 证据”；默认顺序与正式八类/人名优先/同类首次证据规则一致。现阶段无需让 UI 返工。

### 证据限制与路由

- 规划尝试在当前任务的应用内浏览器打开 UI 任务仓库外 `file://` 原型时被浏览器安全策略阻止，因此没有绕过策略重跑交互；该限制不等同于产品失败。规划使用 UI 已保存的原始证据图完成视觉审计，并保留 UI 已记录的控制台和焦点结果为交接证据，而非冒充规划任务的新浏览器实测。
- 确认版本弹窗的组合键动态读数仍未在设计原型阶段完整取得；正式前端必须以 DOM 回归和真实键盘终验覆盖初始焦点、Tab/Shift+Tab 闭环、Escape/取消恢复触发点。
- `UI-M3-01` 保持 Rev 1，转为 `review / Current actor=用户 / Reviewer=用户`。`BACK-M3-01A` 继续并行开发；`FRONT-M3-01B` 仍同时等待用户方向通过与后端规划独立验收，不提前解锁。

## 2026-08-13 — UI-M3-01 Rev 1 正式术语页设计完成并交回规划

### 正式交付

- 更新 `DESIGN.md` 5.4，固化项目工作台术语页的来源门禁、唯一主动作、紧凑表格、证据侧栏、四态裁决、人工新增/编辑、批量栏、不可变版本、来源过期和 1440/1024 滚动归属；后续章节顺延编号，没有修改业务契约。
- 新增 `docs/ui/M3-terms-acceptance.md`，记录设计判读、Impeccable 减法、状态矩阵、键盘规则、响应式、非颜色编码、开发停止边界和真实浏览器证据。
- 在仓库外 `m3-terms-rev1/` 交付可操作 HTML 原型；覆盖搜索、筛选、排序、逐行/当前页选择、批量确认/驳回、证据侧栏、人工新增、编辑、来源变化、提取加载/运行/失败/空、项目禁用和版本确认。6 张最终截图位于原型 `evidence/`。

### 验证与限制

- 1440×900 正常态和证据侧栏完成截图验收；1024×768 展开/收起侧栏均未出现页面底部横向滚动，表格最小宽度只在自身容器横滚。来源变化与 V1 确认态分别截图；修正了确认态顶部与表格状态不同步的原型投影问题后重拍，确认表格待确认标签为 0。
- 真实浏览器验证证据侧栏获得焦点、Escape 关闭后返回原触发按钮；逐行勾选后普通工具栏切换为批量栏；四态均有文字与语义色；最终控制台 `error/warn=0/0`。
- 确认框已实现初始聚焦取消、Tab/Shift+Tab 双向闭环、Escape/取消关闭和触发点恢复；组合键自动化在 in-app Browser 隔离焦点读取处超时，因此没有把未取得的动态读数冒充通过，已要求正式前端以 DOM 回归和真实键盘终验两层证明。
- 原型脚本 `node --check` 通过；Impeccable 检测返回 `[]`，但本机缺少 HTML 解析模块而降级为正则模式，仅作为辅助证据；`git diff --check` 通过。并行存在的前后端工作树改动未触碰。

### 范围与路由

- 本轮只修改 UI 权威文件和仓库外原型，没有修改 `frontend/src`、后端、迁移、`packages/contracts`、真实资料、密钥或云资源，没有提交、推送或部署。
- `CURRENT.md` 更新为 v4-007；`UI-M3-01` 保持 Rev 1，转为 `review / Current actor=规划对话`。UI 只通知规划总线，不直接通知前端、不自行解锁 `FRONT-M3-01B`。

## 2026-08-13 — UI 领取 UI-M3-01 Rev 1

- 完整重读项目协议 v4、`CURRENT.md` v4-005、`DESIGN.md`、M3 术语契约、职责矩阵和开发日志顶部，确认唯一 UI 可执行项为 `UI-M3-01 Rev 1 / ready`。
- 按 v4 规则只把任务改为 `in_progress`，不机械增加任务 Rev；交付范围限定为 `DESIGN.md`、`docs/ui/M3-terms-acceptance.md` 与仓库外交互预览/截图。
- 采用 Impeccable 的 Operate/shape 约束完成术语高密度工作台审计，并仅使用 design-taste-frontend 的既有品牌审计和最终预检规则；不修改生产前端、后端、迁移或共享契约，不设计 ASR/OCR、视频播放器、任务中心、管理员密钥页或账号。

## 2026-08-13 — 后端领取 BACK-M3-01A Rev 1

- 完整重读项目协议 v4、`CURRENT.md` v4-004、M3 术语契约、职责矩阵、M3 冲刺里程碑和开发日志顶部，确认唯一后端可执行项为 `BACK-M3-01A Rev 1 / ready`。
- 按 v4 规则只把任务改为 `in_progress`，不机械增加任务 Rev；范围限于术语共享契约、后端模块、必要迁移/路由、最小 SRT Asset/Storage 只读边界和后端测试。
- PostgreSQL 保持唯一权威；本轮只使用匿名小 SRT 和确定性 fake，不调用真实 AI/ASR，不写或返回密钥，不修改生产前端/DESIGN、根级依赖或其他工作台模块。

## 2026-08-13 — PLAN-M3-01 用户确认并发布 S1 并行任务

- 用户明确确认术语融合方案和双控制台 API 密钥安全方案；`docs/contracts/M3-terms-workflow.md` 从待审核草案升格为 M3 S1 权威产品/数据基线，`PLAN-M3-01` Rev 3 标记 `done`。
- 按协作协议 v4 的受控并行发布 `UI-M3-01` 与 `BACK-M3-01A`：UI 只负责项目工作台术语页的正式交互与状态证据；后端只负责 SRT 来源/证据、候选四态、人工事件、不可变版本、五列 XLSX 和无付费副作用的 extraction adapter/fake。
- `FRONT-M3-01B` 只登记为 `blocked`，必须同时等待 UI 方向通过和后端规划独立验收；前端不得提前写占位实现。三个角色的交付、异议和退审仍只回规划总线，不互相直接接力。
- 当前仍未授权真实 AI/ASR 密钥、付费调用、云资源、提交、推送或部署；S1 不吸纳 ASR、OCR、视频播放器、任务中心、管理员密钥页或账号系统。`CURRENT.md` 更新为 v4-004。

## 2026-08-13 — PLAN-M3-01 增补云端 API 密钥与控制台边界

- 用户提出本地 API 密钥迁移到多人云端网站后不能暴露。规划核对官方 Secret 管理与内部应用访问控制资料后，把控制面拆为“云平台密钥控制台”和“网站业务控制台”。
- 原始供应商密钥只允许部署所有者写入专用 Secret 管理设施，保存后不明文回显；首版网站不持有 Secret 管理写权限。未来业务控制台只管理启停、供应商/模型、预算、并发、有限重试、用量、连通性和 Secret 引用，不能查看完整密钥。
- 员工浏览器只向本系统后端创建幂等任务；Worker 在服务端读取 Secret 并调用供应商，PostgreSQL保存任务、配置快照、请求标识和用量。普通错误与日志必须脱敏。
- 当前没有应用账号系统，草案明确首个云端内部版本须先由身份感知代理、VPN 或允许名单保护整站；未来管理员路径再叠加更严格策略。`CURRENT.md` 更新为 v4-003，`PLAN-M3-01` Rev 3 继续等待用户审核，未发布实现任务或接入真实密钥。

## 2026-08-13 — PLAN-M3-01 术语纵切融合草案交付用户审核

### 只读继承与模板核对

- 规划只读核对原工作台的术语 SOP、全剧 Pro/Flash 与本地高召回补漏、真实字幕证据校验、四态人工裁决、版本和模板导出回归；确认旧实现的正式状态为 `pending / approved / edited / rejected`，只有后两种通过态进入识别与正式导出。
- 使用标准表格工具只读检查 `assets/术语库模板.xlsx` 并完成视觉核对：正式可见列为 `类型、中文内容、别称、性别、备注`，Sheet1 示例行不是业务数据。模板未被修改。

### 去其糟粕后的单一草案

- 新增 `docs/contracts/M3-terms-workflow.md`，以用户最新提示词为业务权威：正式对外使用人名、地名、特定物品、朝代、组织名、等级、物种/种族名、特殊概念/事件八类；人名优先、同类按首次 SRT 证据排序。
- 保留旧应用有效机制：全剧解析、本地高召回索引、AI 只产候选、证据必须回到真实 SRT、低频具名角色不静默遗漏、人工新增/确认/修改/驳回、不可变版本和五列 XLSX。
- 明确舍弃旧规则中的两类问题：不再把“张总裁、叶将军”等有稳定特指证据的职位称呼一律删除；不向员工直接暴露旧 17 类，旧类型只映射到八类。普通疾病、通用物品、泛称和无证据臆造仍排除。
- 术语来源使用独立 `sourceSrtSetDigest`，只改视频不使术语过期；公司 SRT 内容变化要求新草稿/新版本，但不覆盖旧版本或自动触发付费识别。正式导出只读已确认版本，证据和模型审计留在后端。

### 状态与边界

- 职责矩阵和 M3 里程碑已挂接草案；`CURRENT.md` 更新为 v4-002，`PLAN-M3-01` Rev 2 进入 `review / Current actor=用户`。
- 本轮没有修改生产前端、后端、迁移或共享代码契约，没有调用真实 AI/ASR、创建云资源、提交、推送或部署；用户确认前不拆 UI、后端和前端实现任务。

## 2026-08-13 — 回收站最终交付门通过并升级协作协议 v4

### 回收站关闭

- 规划裁决 UI Rev 21 的 B 项属于合规验收工具隔离，不是产品失败。Rev 20 可控延迟 DOM 回归已经直接覆盖 pending dialog 焦点、两按钮禁用、Tab/Shift+Tab/Escape/遮罩不逃逸、单次请求、失败恢复和同幂等键重试；规划代码审查与独立专项 15/15 证明该测试作用于正式状态机。UI 的真实 409 又在 500ms/1.2s 两次稳定读取中证明错误态聚焦取消且焦点位于 dialog 内，因此接受等价证据，不更换或绕过安全环境制造新一轮。
- 用户明确授权后，最终完整 `pnpm check` 退出码 0；随后执行 `pnpm run db:stop`，本地 PostgreSQL 正常停止并输出 `server stopped`。`FRONT-M2-06` Rev 22 标记 `done`，回收站纵向切片关闭。

### 协作协议 v4

- `docs/WORKFLOW.md` 升级为 v4：规划 FIFO 只串行审核交接，不再被解释为全局串行开发；同一纵向切片最多允许三个文件互不重叠的 UI/后端/前端任务受控并行。
- 新增阶段简报：连续 2–3 次交接、阶段变化、交付风险或两日无简报时，由规划只汇报当前阶段、完成事实、阻断、下一角色和最晚日期是否受影响。
- 新增协作持续改进：所有角色可带证据提议流程改进，规划统一审查、试运行和版本化；不得各自维护协议。连续两次退审强制根因审查；Reviewer 有界批量检查完整矩阵；P0–P3 分级；返工跑定向验证，完整检查留到切片关闭。
- 任务 Rev 改为工作包版本，单纯领取、通知或路由不再机械递增；同步版本仍随每次有效写回递增。`CURRENT.md` 进入同步协议 v4、版本 `v4-001`。

### 下一阶段

- 用户确认 2026-08-27 是内部可用工作台的最晚日期而非固定耗时，允许在保证质量门的前提下越早越好。新增 `docs/milestones/M3-internal-workbench-sprint.md`，按术语、ASR、前置审改、单剧验收四个纵向切片推进。
- 当前只建立 `PLAN-M3-01` 产品协商任务，不发布业务实现；下一步先与用户确认术语纵切的具体方案和验收边界。本轮未提交、推送、部署或创建云资源。

## 2026-08-13 — UI 执行 FRONT-M2-06 Rev 21 最终动态终验并交回规划

### A 项通过

- 正式页面用匿名项目触发真实版本冲突；`409` 返回请求标识 `835344ba-9785-4605-84cd-0d5c7c1411fb`。
- 错误稳定后 500ms 与 1.2s 两次读取均为“取消”获得焦点且 `dialog.contains(activeElement)=true`；截图已保存并人工检查。最终控制台 `error/warn` 为 0/0。

### B 项验收环境阻断

- 当前 in-app Browser 的页面评估是安全隔离视图，`fetch/window.fetch/XMLHttpRequest/document.createElement` 均不可见，`window/globalThis` 不可扩展，无法安装规划指定的页面内临时 fetch 包装器。
- 同页 `javascript:` 注入被 Browser URL 安全策略明确拒绝，并要求不得通过替代浏览器、底层 CDP 或间接注入绕过；UI 按安全规则停止，没有规避。
- 包装器从未安装，原 `window.fetch` 从未被替换。因此 pending 锁定 B 项没有真实动态结论，本轮既不冒充通过，也不作为产品失败；规划需决定补充合规终验环境，或接受 Rev 20 的可控延迟 DOM 回归与独立 15/15/构建证据为等价证据。

### 清理与路由

- 证据已追加 `docs/ui/M2-recycle-bin-acceptance.md`；截图位于仓库外 `frontend-recycle-dynamic-rev21/`。
- 2 个匿名项目已按精确 UUID 删除；本轮 3000、3001、55432 服务均已停止并确认端口释放。未修改生产代码、后端、迁移、共享契约或 DESIGN，未提交、推送或部署。
- `CURRENT.md` 更新为 v3-104；`FRONT-M2-06` Rev 22 保持 `review`，`Current actor` 转回规划对话。UI 只通知规划总线，不自行标记完成或直接通知前端。

## 2026-08-13 — 规划通过 FRONT-M2-06 Rev 20 送审前审计并路由最终动态终验

### 独立复验

- 规划核对正式实现：`role=dialog` 只增加 `tabIndex=-1`；确定状态 effect 在弹窗存在且 mutation pending 时聚焦 dialog，错误提交后聚焦重新启用的取消，成功路径仍由既有逻辑聚焦状态消息。现有 dialog `onKeyDown` 因此能在 pending 阶段接收并阻止 Tab/Escape，遮罩关闭继续由 pending 门禁拒绝。
- 延迟 Promise 回归在 pending 阶段直接断言 dialog 获焦、两按钮禁用、Tab/Shift+Tab/Escape/遮罩不逃逸和重复点击不产生第二请求；rejected 后聚焦取消并保留同幂等键重试。它补齐了 Rev 17 测试遗漏，未用源码字符串或结构断言代替真实 DOM 行为。
- 规划独立项目中心+回收站专项 2 文件 15/15、前端生产构建 141 模块通过；Impeccable 定向检测 `[]`，`git diff --check` 无输出。范围审计健康分 20/20（Accessibility、Performance、Responsive、Theming、Implementation Integrity 均 4/4），自动化与代码范围内没有新的 P0/P1/P2/P3；最终发布结论仍等待真实浏览器两项动态证据。

### 路由与交付门

- `CURRENT.md` 更新为 v3-103，队列 019 关闭；`FRONT-M2-06` Rev 21 保持 `review` 并路由 UI 设计对话。
- UI 不再使用数据库锁；在不修改生产代码的前提下，以页面内临时 `fetch` 包装器把本次 recycle 请求延迟约 1.5–2 秒，一次性验证 pending dialog 焦点、按钮禁用、Tab/Shift+Tab/Escape/遮罩不逃逸和无重复请求；另以正式 409 验证错误稳定后的取消焦点。临时包装器验收后恢复。
- UI 通过后仍先回规划；规划再运行一次完整 `pnpm check` 作为本切片交付门，随后才能标记 `done`。当前未发布工作台任务，未提交、推送或部署。

## 2026-08-13 — FRONT-M2-06 Rev 20 提交中弹窗焦点约束完成并交回规划

### 定向修改

- 只修改 `ProjectCenter.tsx`：为既有 `role=dialog` 容器增加 `tabIndex=-1` 使其可编程聚焦；保留 Rev 17 错误态逻辑，并扩展同一确定状态 effect，在 mutation 进入 pending 且弹窗存在时聚焦 dialog，从而让既有 dialog `onKeyDown` 能接收并阻止 Tab/Escape。rejected 后仍聚焦重新启用的取消，成功后仍聚焦既有状态消息。
- 只修改对应 `ProjectCenter.test.tsx`：可控延迟 Promise 回归在 pending 阶段直接断言 dialog 获焦，分别发送 Tab、Shift+Tab、Escape 和遮罩动作，确认焦点与弹窗均不逃逸；再次点击禁用的确认按钮后仍只有一次回收请求。rejected 后焦点回到取消且位于弹窗内，随后继续以同一幂等键重试成功。

### 验证与边界

- 项目中心+回收站联合专项：2 文件 15/15 通过；前端生产构建转换 141 模块成功；按用户点名的 Impeccable 技能完成一次定向机械检测，结果为 `[]`；`git diff --check` 无输出。
- 本轮没有修改 CSS、错误文案、视觉、API、状态机或回收站主体；Rev 17 错误聚焦、初始焦点、非提交 Tab 闭环与关闭恢复、成功消息均保持。未抽通用弹窗，未修改后端、迁移、共享契约或 DESIGN。
- 按规划裁决未运行完整 `pnpm check`；未提交、推送或部署。`FRONT-M2-06` 更新为 Rev 20 `review / Current actor=规划对话`，前端只请求规划总线独立复验，未直接通知 UI；工作台任务继续不发布。

## 2026-08-13 — 前端领取 FRONT-M2-06 Rev 18 提交中焦点合并返工

- 前端开发对话重读项目协议、协作协议 12.1/12.2/13/16、`CURRENT.md` v3-100、开发日志顶部，并按用户点名的 Impeccable 技能加载项目上下文、审计规则与代码质量底线；确认唯一缺口是 pending 双按钮禁用后 dialog 没有确定焦点目标，真实浏览器可能让焦点掉到 `body` 并绕过 dialog 键盘处理。
- 任务递增为 Rev 19 `in_progress`；只修改 `ProjectCenter.tsx` 与对应测试，使 pending 状态确定聚焦可编程聚焦的 dialog，并用可控延迟 Promise 覆盖焦点、键盘关闭约束、重复提交、失败恢复与幂等重试。
- Rev 17 错误态 effect、初始焦点、非提交闭环与关闭恢复、成功消息，以及文案、视觉、API、状态机、回收站主体均冻结；不修改后端、迁移、契约或 DESIGN，不运行完整 check，不提交、推送或部署。

## 2026-08-13 — 规划复验 FRONT-M2-06 Rev 17 并在送 UI 前合并提交中焦点缺口

### 通过证据

- 规划代码核对确认失效的 `onError → queueMicrotask` 已删除；`RecycleApiError` 提交且 mutation 退出 pending 后，新的 effect 会在弹窗仍存在时聚焦重新启用的“取消”。可控延迟测试覆盖 pending 后 rejection、手工模拟焦点脱落和同幂等键重试，原真实 409 退审根因已经得到针对性修正。
- 规划独立复跑项目中心+回收站 2 文件 15/15，通过；前端生产构建转换 141 模块成功；Impeccable 定向机械检测返回 `[]`，`git diff --check` 无输出。未运行完整 `pnpm check`，符合本轮“交付门统一运行”的裁决。

### 送审前冲突审查

- 规划没有直接路由 UI，因为下一轮已经明确要求真实验证“提交中锁定”，而现有代码在 pending 时同时禁用取消/确认、弹窗容器又不可聚焦。真实 Chrome 上焦点从禁用按钮脱落到 `body` 已由上一轮 409 证据证明；一旦焦点在 `body`，绑定于 dialog 的 `onKeyDown` 无法接收 Tab/Escape，Tab 可能进入遮罩后的页面。
- 新测试只断言两个按钮禁用、Escape/遮罩不关闭，随后才主动执行 `confirmButton.blur()`；没有在 pending 阶段断言焦点位置，也没有发送 Tab/Shift+Tab 或检查背景焦点，因此 15/15 不能证明该终验项。
- 这是与原缺陷同源的 P1 动态焦点问题。按用户要求的冲突审查与“整批发现、一次返工”原则，规划在送 UI 前直接并入 Rev 18：使 dialog 容器可编程聚焦，pending 提交后确定聚焦容器，并补齐 Tab/Shift+Tab/Escape/遮罩/重复提交/失败恢复的一个延迟回归。原错误态 effect 与其他通过项冻结。

### 路由与边界

- `CURRENT.md` 更新为 v3-100，队列 018 关闭；`FRONT-M2-06` Rev 18 保持前端 `ready`。本轮规划未修改生产代码，未启动服务、创建数据、提交、推送或部署。
- 回收站仍是唯一活动主线；工作台两周冲刺协议和新任务继续等待本任务最终关闭后发布。

## 2026-08-13 — FRONT-M2-06 Rev 17 动态失败焦点修正完成并交回规划

### 定向修改

- 只修改 `ProjectCenter.tsx`：删除 `recycleMutation.onError` 中可能早于错误态提交和浏览器焦点脱落的单次 `queueMicrotask`；改为在 `RecycleApiError` 已提交、mutation 已退出 pending 且确认框仍存在时，由 React effect 确定聚焦既有“取消”按钮。
- 只修改对应 `ProjectCenter.test.tsx`：未知结果路径改用可控延迟 Promise，真实覆盖 `pending → rejected`；提交中两个按钮禁用，Escape 与遮罩关闭均受阻；模拟焦点脱落后提交 rejection，确认错误态渲染后焦点回到取消且仍在弹窗内部，随后同一幂等键重试成功。

### 验证与边界

- 项目中心+回收站联合专项：2 文件 15/15 通过；前端生产构建转换 141 模块成功；`git diff --check` 无输出。
- 按规划裁决，本轮无需运行完整 `pnpm check`，留交付门统一执行。初始焦点、Tab 双向闭环、Escape/取消/遮罩恢复、成功消息焦点、文案、视觉、API、状态机、回收站主体及此前证据均冻结且未重做。
- 未抽通用弹窗，未修改后端、迁移、共享契约或 DESIGN，未提交、推送或部署。`FRONT-M2-06` 更新为 Rev 17 `review / Current actor=规划对话`，前端只请求规划总线独立复验，未直接通知 UI；工作台任务继续不发布。

## 2026-08-13 — 前端领取 FRONT-M2-06 Rev 15 动态失败焦点返工

- 前端开发对话重读项目协议、协作协议 12.1/12.2/13/16、`CURRENT.md` v3-097、UI Rev 13 真实键盘终验与开发日志顶部，确认唯一缺陷是 `onError` 单次微任务可能早于错误态 DOM 提交和浏览器焦点脱落。
- 任务递增为 Rev 16 `in_progress`；只修改 `ProjectCenter.tsx` 与对应前端测试，把失败聚焦改为已提交错误状态驱动的确定行为，并用可控延迟 Promise 覆盖提交中锁定与失败后弹窗内焦点。
- 初始焦点、Tab 闭环、三种关闭恢复、成功消息焦点、文案、视觉、API、状态机、回收站主体及既有证据全部冻结；不抽通用弹窗，不修改后端、迁移、契约或 DESIGN，不提交、推送或部署。

## 2026-08-13 — 规划确认 FRONT-M2-06 Rev 14 动态焦点退审并定向分派 Rev 15

### 冲突审计

- 规划按 Impeccable `audit` 的无障碍与键盘规则复核 UI Rev 13 真实证据、正式 `ProjectCenter` 焦点实现和现有回归。范围审计健康分为 17/20（Accessibility 2/4、Performance 4/4、Responsive 4/4、Theming 4/4、Implementation Integrity 3/4）；唯一问题为 1 个 P1 动态焦点缺陷，无新增 P0/P2/P3。已通过的初始焦点、Tab 闭环、三种关闭恢复、成功消息、响应式与视觉证据保持正向结论。
- Impeccable 定向机械检测对 `ProjectCenter.tsx` 与对应 CSS 返回 `[]`，但这不覆盖真实浏览器异步焦点时序。正式 409 后 500ms 与 1.2s 均为 `activeElement=body`，构成直接反证，退审成立。
- 根因位于 `recycleMutation.onError` 的单次 `queueMicrotask`：它可能在 React Query 错误态渲染提交、按钮解除禁用和浏览器从禁用按钮移除焦点之前执行；因此可能错误判断焦点仍在弹窗内，或在取消按钮仍禁用时聚焦无效。现有 jsdom 回归没有复现这一浏览器时序。

### 定向裁决

- `CURRENT.md` 更新为 v3-097，队列 017 关闭；`FRONT-M2-06` Rev 15 退回 `ready / Current actor=前端开发对话`。只把失败聚焦改为由已提交错误状态驱动的确定行为，并以可控延迟 Promise 覆盖 `pending → rejected → 弹窗内焦点`；失效的单次微任务路径须删除或停用。
- 下一轮 UI 只复验两项：真实失败渲染稳定后的弹窗内焦点，以及通过页面内可控延迟请求形成的提交中按钮禁用、Escape/遮罩不可关闭、Tab 不逃逸与重复提交受阻。已通过部分全部冻结，不重做回收站主体。
- 当前回收站任务继续优先收口；按用户要求，工作台两周冲刺协议与新任务在本任务最终关闭前不发布。本轮未修改生产代码，未启动服务、创建数据、提交、推送或部署。

## 2026-08-13 — UI 完成 FRONT-M2-06 Rev 13 真实键盘终验并退回规划

### 真实通过项

- 正式页面打开确认框后聚焦“取消”；Tab/Shift+Tab 在“取消”和“确认移入回收站”之间双向闭环。
- 非提交期 Escape、点击取消与点击遮罩均关闭弹窗，并恢复本次匿名项目原始行触发按钮。
- 成功提交后原行移除，焦点落到既有 `role=status`、`tabIndex=-1` 成功消息；最终控制台 `error/warn` 为 0/0。

### 唯一真实失败与证据限制

- 匿名项目在弹窗打开后由后端版本 1 改为 2；确认返回真实 `409` 与请求标识 `c2bfecfd-f97f-4df3-b369-24deda0fe61f`。弹窗、错误信息和按钮都保留，但 500ms 与 1.2s 两次 DOM 读取均为 `activeElement=body`、焦点不在弹窗内。
- 最小修正只需让失败错误渲染稳定后把焦点恢复到“取消”或错误摘要；不得改变已通过的初始焦点、Tab 闭环、三种关闭路径、成功焦点、文案、视觉、API 或状态机。
- 本轮尝试通过本地 PostgreSQL 锁构造提交中挂起窗口，但请求仍在首次 DOM 采样前完成；因此提交中禁止关闭/重复提交只保留既有自动化证据，本轮不冒充真实动态通过，也不列为新增失败。

### 清理与路由

- 证据已追加 `docs/ui/M2-recycle-bin-acceptance.md`；截图位于仓库外 `frontend-recycle-keyboard-rev13/`。
- 5 个匿名项目已按精确 UUID 删除；本轮 3000、3001、55432 服务均已停止并确认端口释放。未修改生产代码、后端、迁移、共享契约或 DESIGN，未提交、推送或部署。
- `CURRENT.md` 更新为 v3-096；`FRONT-M2-06` Rev 14 保持 `review`，`Current actor` 转回规划对话。UI 只通知规划总线，不自行标记完成或直接通知前端。

## 2026-08-13 — 规划通过 FRONT-M2-06 Rev 12 交接审计并路由 UI 终验

### 独立复验

- 规划核对唯一两个生产/测试改动目标：确认框打开聚焦安全的“取消”，Tab/Shift+Tab 在首末按钮双向闭环；非提交 Escape、取消和遮罩关闭均恢复本次原始行触发按钮；失败保留弹窗与内部焦点；成功后聚焦既有 `role=status`、`tabIndex=-1` 消息。
- 规划独立复跑 `ProjectCenter.test.tsx` 与 `RecycleBin.test.tsx`，2 文件 15/15 通过；独立前端生产构建转换 141 模块成功；`git diff --check` 无输出。前端报告的全部前端 28/28、完整 `pnpm check` 与 Impeccable 空检测结果作为交接证据保留，但未冒充规划本轮独立运行结果。
- 改动没有扩展到确认文案、视觉、API、状态机、回收站主体、后端、迁移、共享契约或 DESIGN；Rev 8 九张截图及此前通过的业务、查询和响应式证据继续冻结。

### 路由

- `CURRENT.md` 更新为 v3-095，队列 016 关闭；`FRONT-M2-06` 递增为 Rev 13，保持 `review` 并把 `Current actor` 指向 UI 设计对话。
- UI 只做真实浏览器键盘终验：初始焦点、Tab 双向闭环、三种取消路径焦点恢复、失败留框、成功消息聚焦，以及提交中禁止关闭/重复提交且焦点不逃到遮罩后的页面；同时确认控制台 error/warn 为 0。
- UI 不重做回收站主体、不修改生产代码；终验结论须先回规划总线，不能直接标记 `done` 或通知下一角色。本轮未提交、推送或部署。

## 2026-08-13 — FRONT-M2-06 Rev 12 项目回收确认框焦点闭环完成并交回规划

### 定向修改

- 只修改 `ProjectCenter.tsx`：打开项目回收确认框时保存本次行级触发按钮并聚焦安全的“取消”；弹窗自身处理 Tab 两端双向闭环与非提交 Escape，提交期间继续阻止关闭和重复操作。
- 取消、点击遮罩或 Escape 关闭后，焦点恢复到本次原始行级“移入回收站”按钮；确认失败保持弹窗，并在焦点意外丢失时恢复到弹窗内安全按钮。
- 确认成功且原项目行移除后，焦点转到既有成功状态消息；消息保留 `role=status` 并仅增加 `tabIndex=-1` 作为可编程焦点落点。确认文案、视觉、API 和状态机均未改变。
- `ProjectCenter.test.tsx` 新增真实 DOM 行为回归，覆盖打开初始焦点、Tab/Shift+Tab 两端闭环、Escape/取消/遮罩返回原触发器、失败留框内焦点与成功消息聚焦。

### 验证与边界

- 项目中心专项：1 文件 7/7 通过；项目中心+回收站联合专项：2 文件 15/15 通过；全部前端测试：4 文件 28/28 通过。
- 前端生产构建转换 141 模块成功；最终完整 `pnpm check` 退出码 0；Impeccable 对两个改动目标的机械检测返回空数组；`git diff --check` 无输出。
- Rev 8 的九张截图、回收站主体、正式 API、状态表达、服务端查询和响应式证据均按要求冻结且未重做。本轮未抽通用弹窗，未修改后端、迁移、共享契约或 DESIGN，未提交、推送或部署。
- `FRONT-M2-06` 更新为 Rev 12 `review / Current actor=规划对话`，只请求规划总线复验；前端未直接通知 UI、未自行标记 `done` 或解锁后继任务。

## 2026-08-13 — 前端领取 FRONT-M2-06 Rev 10 焦点闭环返工

- 前端开发对话重读项目协议、协作协议 12.1/12.2/13/16、`CURRENT.md` v3-092、UI Rev 8 终验和 Impeccable 无障碍审计规则，确认唯一缺陷是项目中心回收确认框缺少动态焦点管理。
- 任务递增为 Rev 11 `in_progress`；本轮只在 `ProjectCenter` 与对应前端测试中补安全初始焦点、Tab/Shift+Tab 双向闭环、非提交 Escape、关闭后触发按钮恢复、失败留框和成功消息焦点。
- 确认文案、视觉、API、状态机、回收站主体、Rev 8 九张截图及其他正式证据全部冻结；不抽通用弹窗，不修改后端、迁移、契约或 DESIGN。

## 2026-08-13 — 规划确认 FRONT-M2-06 Rev 9 UI 退审并定向分派 Rev 10

### 审核结论

- 规划读取 UI 终验记录、九张证据说明和现有 `ProjectCenter` 实现，并按 Impeccable 的 Accessibility/Keyboard Navigation 技术审计规则核对。UI 的动态证据成立：确认框虽然声明 `role="dialog"` 与 `aria-modal="true"`，但代码没有焦点进入、Tab/Shift+Tab 限制、Escape 关闭或关闭后的焦点恢复。
- 真实浏览器测得打开、取消和成功提交后的焦点位置，与源码缺少任何 `focus`/键盘处理完全一致。Impeccable 机械检测对两个项目中心目标文件返回空数组，只能说明没有命中静态规则，不能替代动态焦点验收。
- 该问题会使纯键盘用户进入遮罩后仍操作背景页面或在弹窗关闭后失去位置，属于发布前必须修复的 P1 无障碍缺陷；不涉及文案、视觉、API、数据状态或回收站主体。

### 定向裁决

- `CURRENT.md` 更新为 v3-092，队列 015 关闭；`FRONT-M2-06` Rev 10 定向退回 `ready / Current actor=前端开发对话`。
- 只允许在 `ProjectCenter` 与对应测试中补齐：打开聚焦安全操作、Tab 双向闭环、非提交 Escape 取消、取消/遮罩/Escape 恢复原触发按钮、成功后聚焦现有 `role=status` 消息。确认失败保持弹窗与内部焦点；提交期间仍禁止重复关闭或提交。
- UI 已通过的三项影响、后端数量、全部回收站状态、服务端查询、请求标识、1024 两态滚动、控制台和九张截图全部冻结。修正后 UI 只复验确认框键盘闭环，不重做回收站主体。
- 本轮未修改生产前端、后端、契约或 DESIGN，未启动服务、创建数据、提交、推送或部署。

## 2026-08-13 — UI 完成 FRONT-M2-06 Rev 8 正式页面终验并退回规划

### 通过项

- 正式项目中心确认框完整显示三项影响，回收成功直接呈现后端 `terminatedUploadCount`；匿名样本真实反馈 2 个未完成上传已终止。
- 正式回收站覆盖已回收倒计时、恢复成功/失败、清理中、等待后台重试、清理最终失败、请求标识和完整结果集中的已清理轮询提示；搜索、服务端筛选排序与恢复唯一动作均通过。
- 1024×768 展开/收起侧栏时根页面均为 `clientWidth=scrollWidth=1014`，10px 是 Windows 纵向滚动槽；980px 表格只在 `.tableWrap` 内部形成 `744/980`、`876/980` 横滚。最终控制台 `error/warn` 为 0/0。1440 与加载态复用 Rev 4 冻结正式证据，未发现回归。

### 不通过项与最小建议

- 确认框打开后焦点仍停留在遮罩后的“移入回收站”按钮；Tab/Shift+Tab 未进入或闭环于弹窗，Escape 不关闭。点击取消或确认成功后，焦点均落到 `body`；成功消息虽有 `role=status`，但没有确定焦点落点。
- 该问题只属于项目中心确认框的键盘/焦点实现缺陷。最小修正限定为：打开时聚焦弹窗内安全操作、Tab 闭环、Escape 等同取消、取消恢复触发按钮、成功后聚焦状态消息或列表标题；不得改变文案、视觉、API、状态机或回收站主体。

### 证据、清理与路由

- 证据已追加 `docs/ui/M2-recycle-bin-acceptance.md`；本轮 9 张正式页面截图位于仓库外 `frontend-recycle-qa-rev8/`。
- 8 个匿名项目已按精确 UUID 删除；本轮 3000、3001、55432 服务均已停止并确认端口释放。未修改生产前端、后端、迁移、共享契约或 DESIGN，未提交、推送或部署。
- `CURRENT.md` 更新为 v3-091；`FRONT-M2-06` Rev 9 保持 `review`，`Current actor` 转回规划对话。UI 只通知规划总线，不自行标记完成或直接通知前端。

## 2026-08-13 — 规划通过 FRONT-M2-06 Rev 7 并路由 UI 终验

### 定向复验

- 规划核对 `RecycleBin.tsx` 唯一修改：前次观察增加完整结果标识；只有查询签名一致、前后 `total === items.length` 且无 `cleanupJobStatus` 筛选时，才允许把先前 `purging` 项缺席表达为已清理。该条件不会把 `retryable → leased` 状态迁移或当前 100 条窗口变化伪装成清理成功。
- 新增两项负向回归分别覆盖 CleanupJob 筛选迁移与不完整窗口；原完整结果集正向提示继续通过。规划独立复跑项目中心+回收站专项为 2 文件 13/13，独立前端生产构建转换 141 模块成功。
- Rev 4 项目中心回收、正式 API、服务端排序筛选、幂等意图、1440/1024、侧栏两态、控制台和匿名数据清理证据保持冻结；本轮没有要求前端重做。

### 状态与路由

- `CURRENT.md` 更新为 v3-090，队列 014 关闭；`FRONT-M2-06` Rev 8 保持 `review`，`Current actor` 由规划切换为 UI 设计对话。
- UI 只做正式页面真实浏览器终验：复核既有业务状态、视觉层级、1440/1024 与侧栏两态滚动、项目回收确认框键盘/焦点、恢复动作、状态播报和控制台；结果无论通过或失败都先回规划总线，不直接通知前端。
- 本轮未修改生产代码、后端、契约或 DESIGN，未启动业务服务、创建测试数据、提交、推送或部署。

## 2026-08-13 — FRONT-M2-06 Rev 7 清理完成提示边界修正并交回规划

### 定向修改

- 只修改 `RecycleBin.tsx` 的既有清理完成观察记录：除查询签名和先前 `purging` 项外，同时保存该次响应是否满足 `total === items.length`。
- 仅当查询签名不变、前后两次响应都是当前查询完整结果集、且没有 `cleanupJobStatus` 筛选时，才把先前 `purging` 项缺席显示为“项目已清理”。无状态筛选+完整窗口的既有正向提示保持不变。
- 新增两项负向回归：`cleanupJobStatus=retryable` 中 Worker 重新领取为 `leased`、项目移出筛选结果时不提示已清理；前后响应均 `total > items.length`、项目仅移出当前 100 条窗口时不提示已清理。

### 验证与边界

- 回收站专项 `RecycleBin.test.tsx`：1 文件 8/8 通过；项目中心+回收站联合专项：2 文件 13/13 通过；全部前端测试：4 文件 26/26 通过。
- 前端生产构建 141 模块通过；最终完整 `pnpm check` 退出码 0；`git diff --check` 无输出。
- Rev 4 的项目中心、API、样式、服务端排序筛选、幂等逻辑、浏览器与响应式证据全部冻结且未重做。本轮未修改后端、迁移、共享契约或 DESIGN，未扩展分页 UI、云资源或其他业务，未提交、推送或部署。
- `FRONT-M2-06` 更新为 Rev 7 `review / Current actor=规划对话`，只请求规划总线复验；前端未直接通知 UI、未自行标记 `done` 或解锁后继任务。

## 2026-08-13 — 前端领取 FRONT-M2-06 Rev 5 定向返工

- 前端开发对话重读项目协议、协作协议 12.1/12.2/13/16、`CURRENT.md` v3-087 与规划退审日志，确认唯一缺陷是清理完成提示把筛选状态迁移或不完整结果窗口误判为 `purged`。
- 任务递增为 Rev 6 `in_progress`；Rev 4 的项目中心、API、样式、服务端排序筛选、幂等逻辑、浏览器与响应式证据全部冻结。
- 本轮只收紧 `RecycleBin` 同查询缺席推断：前后响应均完整且无 `cleanupJobStatus` 筛选时才允许提示已清理，并补状态迁移与不完整窗口负向回归；不修改后端、迁移、契约、DESIGN，不扩展分页或其他业务。

## 2026-08-13 — 规划定向退审 FRONT-M2-06 Rev 4

### 交接审计结论

- 规划复核正式回收站 API 消费、项目中心回收确认、回收站页面、服务端查询参数、CleanupJob 状态映射、回收/恢复幂等意图、测试和浏览器证据；目录范围与停止边界完整。独立复跑 `ProjectCenter.test.tsx` 与 `RecycleBin.test.tsx` 为 2 文件 11/11 通过。
- 项目中心只列 `active` 项目，回收成功反馈只使用后端 `terminatedUploadCount`；搜索、三类排序和两类状态筛选均提交服务端；恢复失败留行、未知结果同键重试、1024/1440 页面滚动归属等实现可以冻结，不要求重做。

### 失败证据与最小修正

- `RecycleBin.tsx` 当前把“相同查询签名下，先前任一 `purging` 项在新响应中缺席”直接解释为项目已清理。但查询签名包含 `cleanupJobStatus`：例如正在查看 `retryable` 时，Worker 把任务重新领取为 `leased`，项目仍为 `purging`，却会从筛选响应中消失并触发错误的“项目已清理”成功提示。
- `listRecycleBin` 当前固定读取 `limit=100`；当响应 `total > items.length` 时，某个项目也可能只是移出当前结果窗口，列表缺席同样不能证明 `purged`。该提示会把后端未完成事实伪装为成功，属于权威状态实现缺陷，不能先交 UI 验收。
- `CURRENT.md` 更新为 v3-087，队列 013 关闭；`FRONT-M2-06` Rev 5 定向退回 `ready / Current actor=前端开发对话`。只允许收紧提示条件：上次与本次响应均为当前查询完整结果，且没有 CleanupJob 状态筛选时才保留缺席推断；补状态迁移和不完整窗口两项负向回归。Rev 4 其余生产实现、测试和浏览器证据冻结，UI 暂不通知。
- 本轮未修改生产前端、后端、契约或 DESIGN，未启动服务、创建测试数据、提交、推送或部署。

## 2026-08-13 — FRONT-M2-06 Rev 4 正式回收站前端完成并交回规划

### 实际修改

- 项目中心新增行级“移入回收站”、包含项目名和三项影响的二次确认；请求成功前项目保持原列表，成功反馈只使用正式响应 `terminatedUploadCount`，0 时不虚构终止数量。回收网络未知结果保留项目与确认框，并以同一意图幂等键重试。
- 新增正式 `/recycle-bin` 导航、路由与页面：搜索、`recycleExpiresAt/name/recycledAt` 排序方向、`lifecycleStatus` 与 `cleanupJobStatus` 均进入服务端查询；前端不做单页假排序或假筛选。
- 页面显示后端 `recycledAt`、`recycleExpiresAt`、生命周期和 CleanupJob 权威事实；覆盖已回收倒计时、恢复、清理中、等待重试、最终失败、稳定失败原因、尝试次数、下次重试和请求标识。恢复失败保留项目；网络未知结果复用同一恢复意图键；同一查询刷新确认原 `purging` 项消失时显示“项目已清理”轻提示。
- 回收站加载态保留筛选与表头骨架，空态不提供创建或永久删除；980px 紧凑表格只在自身容器横向滚动。项目中心既有表格样式选择器收紧到自身容器，避免影响新页面。

### 实际验证

- `pnpm exec vitest run tests/frontend/ProjectCenter.test.tsx tests/frontend/RecycleBin.test.tsx`：2 文件 11/11 通过，覆盖三项确认、成功数量、未知结果幂等重试、服务端查询参数、加载/空态、清理中/重试/最终失败、恢复失败留行、请求标识、恢复成功和清理完成提示。
- 全部前端测试：4 文件 24/24 通过；最终完整 `pnpm check` 退出码 0，仓库边界、lint、类型、迁移、10 个测试文件 69 项及前后端构建全部通过；正式前端构建 141 模块。`git diff --check` 无输出。
- 真实浏览器以正式 API 完成匿名“创建项目 → 打开三项确认 → 回收成功 → 回收站恢复成功 → 再次回收”链路。1440×900 展开侧栏时根页面 `1440/1440`、表格容器 `1170/1170`；1024×768 展开 204px 时根页面 `1024/1024`、表格容器 `754/980`，收起 72px 时根页面 `1024/1024`、表格容器 `886/980`。页面无横溢，980px 表格横滚只在容器；恢复主操作可由正式控件到达，控制台错误/警告 0。
- 浏览器匿名项目按精确 UUID 删除并复核残留数为 0；本轮启动的 3000 前端端口已释放，未停止进入本轮前已存在的 3001 后端进程。

### 边界与交接

- 本轮只修改 `frontend/src/`、`tests/frontend/` 及协议要求的同步状态/日志；未修改后端、迁移、`packages/contracts` 或 DESIGN，未复制后端状态、猜数量或做单页假排序/筛选。
- 未实现立即永久删除、单文件/交付回收、真实 R2、账号权限、ASR/OCR/术语，未提交、推送或部署。
- `FRONT-M2-06` 更新为 Rev 4 `review / Current actor=规划对话`。当前只请求规划总线做交接审计；前端未直接通知 UI、未自行标记 `done` 或解锁下一任务。

## 2026-08-13 — 前端领取 FRONT-M2-06 Rev 2

- 前端开发对话重读项目级 `AGENTS.md`、协作协议 12.1/12.2/13/16、`CURRENT.md` v3-084、正式回收站 DESIGN/UI 验收、共享契约与开发日志顶部，确认 UI 与后端依赖均已通过且任务为 `ready / Current actor=前端开发对话`。
- 任务递增为 Rev 3 `in_progress`；本轮只实现项目中心项目级回收动作、正式回收站页面、服务端搜索/排序/筛选、后端权威生命周期与清理状态投影、稳定幂等意图重试及前端回归。
- 写入范围限定为 `frontend/`、`tests/frontend/` 及同步状态/日志；不修改后端、迁移、共享契约或 DESIGN，不实现立即永久删除、单文件/交付回收、真实 R2、账号权限、ASR/OCR/术语，不提交、推送或部署。完成后只交回规划总线。

## 2026-08-13 — 规划通过 BACK-M2-06 Rev 6 并解锁正式前端集成

### 独立复验

- 规划按 FIFO 审查新增迁移、共享 TypeBox 契约、回收/恢复路由、生命周期仓储与新增回归：`terminatedUploadCount` 由幂等命令记录持久化，首调与同键重放读取同一事实；恢复响应仍使用独立契约，不夹带回收专属字段。
- `recycledAt` 使用 CleanupJob 每次回收时重置的 `created_at`，不受 Worker 更新 `updated_at` 影响；`recycleExpiresAt/name/recycledAt` 只通过固定白名单映射为 SQL 列，方向限定 `ASC/DESC`，项目 ID 作为确定性并列键，排序在数据库 `LIMIT/OFFSET` 前执行。
- `cleanupJobStatus` 直接进入后端查询条件，前端无需从 `purging` 猜测重试状态。新增测试真实跨两个分页核对默认/名称/回收时间顺序，并区分两个 `purging` 项目中的 `retryable` 项。
- 本轮独立 `pnpm check` 退出码 0；随后独立复跑 `tests/backend/recycle.test.ts` 为 1 文件 7/7 通过。复验启动的本地 PostgreSQL 已正常停止。

### 状态与路由

- `CURRENT.md` 更新为 v3-084，队列 012 关闭；`BACK-M2-06` Rev 7 标记 `done`。Rev 3 已通过的事务、Storage fake、Worker、失败重试和竞态行为保持冻结，未发现新的阻断项。
- `UI-M2-04` 与后端依赖现已同时满足，`FRONT-M2-06` Rev 2 解锁为 `ready / Current actor=前端开发对话`。前端只消费正式契约，实现项目中心回收确认、回收站列表/搜索/服务端排序筛选、倒计时、恢复和清理状态；完成后仍先交回规划总线，再由规划路由 UI 做真实页面验收。
- 本轮未修改生产前端或后端业务代码，未接云资源，未提交、推送或部署。

## 2026-08-13 — BACK-M2-06 Rev 5 定向返工完成并交回规划

### 实际修改

- 新增迁移 `1754976005003_add_terminated_upload_count.cjs`，将回收时终止的未完成上传数量保存到幂等命令记录；回收首调与同键重放都从持久化事实返回相同 `terminatedUploadCount`。
- 共享回收站投影新增稳定 `recycledAt`；恢复后再次回收会重置 CleanupJob 的创建时间，Worker 后续更新 `updated_at` 不会改变回收时间。
- 共享查询新增 `sortBy=recycleExpiresAt/name/recycledAt`、`sortDirection=asc/desc` 和 `cleanupJobStatus`；排序以项目 ID 作为并列键，在 SQL 的 `LIMIT/OFFSET` 前执行。回收站分页参数同时接受经过范围约束的 URL 数字字符串，并在仓储边界归一化。
- 路由分别使用回收与恢复响应契约；回收响应包含终止数量，恢复响应保持原有项目结果。新增回归覆盖首调/重放数量一致、稳定回收时间、三类跨页排序及 `retryable` 清理状态筛选。

### 实际验证

- `pnpm exec vitest run tests/backend/recycle.test.ts`：1 个文件 7/7 通过。
- `pnpm exec vitest run tests/backend`：5 个文件 43/43 通过。
- `pnpm run lint`、`pnpm run typecheck`、`git diff --check`：均退出码 0。
- 完整 `pnpm check`：退出码 0；仓库边界、lint/typecheck、本地迁移、9 个测试文件 61 项、后端构建与前端 138 模块构建全部通过。
- 进程唯一临时 PostgreSQL 数据库从零执行 9 个迁移，确认 `terminated_upload_count` 为非空列后立即删除；主库最终 `projects=0`、`upload_sessions=0`、`cleanup_jobs=0`，本地 PostgreSQL 已停止。

### 边界与交接

- Rev 3 已通过的生命周期事务、Storage fake、CleanupJob Worker、失败重试和竞态行为未重写；未修改生产前端或 DESIGN，未接真实 R2、孤儿总核对、单文件/交付回收、账号权限，未提交、推送或部署。
- `BACK-M2-06` 更新为 Rev 6 `review / Current actor=规划对话`。当前只请求规划独立复验；后端未直接通知或解锁 `FRONT-M2-06`。

## 2026-08-13 — 后端领取 BACK-M2-06 Rev 4 定向返工

- 重读项目协议、`CURRENT.md` v3-081、正式回收站 DESIGN/UI 验收输入和规划退审证据，确认任务为 `ready / Current actor=后端开发对话`。
- 任务递增为 Rev 5 `in_progress`；冻结 Rev 3 已通过的事务、回收/恢复、Storage fake、CleanupJob Worker、失败重试和竞态行为。
- 本轮只补 `terminatedUploadCount` 稳定重放、`recycledAt` 稳定投影、数据库分页前的三类确定性排序、CleanupJob 状态筛选及相应后端回归；不修改生产前端/DESIGN，不扩展云资源或其他生命周期。

## 2026-08-13 — 规划退审 BACK-M2-06 Rev 3 并定向分派 Rev 4

### 独立复验结论

- 规划按 FIFO 登记后复核生命周期迁移、回收/恢复路由与事务、CleanupJob 租约 Worker、Storage fake、共享契约、职责矩阵和正式回收站验收规则；`pnpm run db:setup` 退出码 0，独立复跑 `tests/backend/recycle.test.ts` 为 1 文件 6/6 通过。
- Rev 3 的核心后端行为成立：回收事务会终止未完成会话且不影响已完成 Asset/清单；恢复不复活会话；分片/对象删除可重复；到期后进入 `purging`；租约有效时不重复领取、过期可接管；缺失对象可继续，删除失败保留原因并重试；竞态完成不能复活项目或会话。

### 退审证据与裁决

- `project-lifecycle.repository.ts` 只把 `terminatedUploadCount` 写入审计事件；`ProjectLifecycleCommandResultSchema` 和回收路由成功响应只返回 `project`。这无法实现已验收的“`N` 个未完成上传已终止”，且前端不能根据当前会话自行猜测。Rev 4 必须让首次回收和同键重放稳定返回同一数量。
- `RecycleBinItemSchema` 没有稳定 `recycledAt`；现有 `updatedAt` 会在 Worker 进入 `purging` 时变化，不能代表回收时间。查询也固定按到期时间排序，无法在数据库分页前执行已验收的项目名称/回收时间排序。Rev 4 必须提供稳定回收时间投影与带确定性次级键的服务端排序。
- `RecycleBinQuerySchema` 只能按项目生命周期筛选；`purging` 同时包含正在清理、等待重试和最终失败，不能在分页前实现“等待后台重试”筛选。Rev 4 必须提供类型化 CleanupJob 状态筛选，前端只做语义映射，不复制清理状态。
- 以上属于已确认 UI 与代码共享契约不一致的局部修正，不改变用户可见流程、成本或数据策略。`CURRENT.md` 更新为 v3-081：队列 011 关闭，`BACK-M2-06` Rev 4 定向退回 `ready / Current actor=后端开发对话`；`FRONT-M2-06` 保持阻塞。未修改生产代码、迁移、共享契约或前端，未接云资源，未提交、推送或部署。

## 2026-08-13 — BACK-M2-06 Rev 3 完成并交回规划复验

### 已完成

- 新增项目生命周期、清理任务、未完成上传清理、审计事件与最小墓碑迁移；共享代码契约覆盖回收/恢复命令、回收站列表和 CleanupJob 投影。
- 实现 `POST /api/projects/:projectId/recycle`、`POST /api/projects/:projectId/restore` 与 `GET /api/recycle-bin`：回收/恢复均使用幂等键和项目版本，48 小时窗口由集中配置提供，`purging`、过期或已清理项目不可恢复。
- 回收事务先锁项目，再锁并终止所有未完成上传；恢复保留已完成 Asset、清单和绑定，但已终止会话保持 `aborted`。相关上传确认、完成、过期和失败落账统一为项目锁优先，回收/完成竞态稳定返回 `PROJECT_NOT_ACTIVE`，不会复活会话或创建 Asset。
- 未完成分片及竞态形成的未完成对象由 Storage fake 可重复清理；清理失败不回滚项目回收，保存可重试事实，恢复和到期 Worker 均可继续清理。
- 新增无状态 `ProjectCleanupWorker.runOnce()`：以 PostgreSQL 租约领取到期任务，项目进入 `purging` 后不可恢复；对象删除幂等，缺失对象记录核对结果后继续；失败保留 `purging`、重试时间和原因，租约过期可由另一 Worker 接管；完成后清除业务明细、脱敏项目行并保存 `purged` 最小墓碑计数。

### 验证

- 回收专项 1 个文件 6 项全部通过：回收/恢复幂等、完成 Asset/清单保留、未完成会话不复活、分片清理失败恢复、过期恢复拒绝、缺失对象继续、删除失败重试、有效/过期租约和回收/完成竞态。
- 后端项目、素材、资产绑定、上传、回收专项 5 个文件 42 项全部通过；最终完整 `pnpm check` 退出码 0，仓库边界、lint、typecheck、本地 PostgreSQL 迁移、9 个测试文件 60 项测试和前后端构建全部通过。
- 在隔离临时数据库从零顺序执行 8 个迁移，迁移计数为 8，临时数据库随后删除；`git diff --check` 和最终 `pnpm check:repo` 通过。
- 自动化只使用匿名 4–8 字节代码内样例；最终项目表残留计数为 0，本地 PostgreSQL 已停止。

### 边界与交接

- 本轮只修改后端、迁移、共享契约、后端测试、后端说明及同步文件；没有修改生产前端或 DESIGN，没有接入真实 R2、全库孤儿核对、单文件/交付回收、账号权限或付费服务，没有提交、添加远程、推送或部署。
- 本地内存 Storage fake 不跨进程，测试通过依赖注入在同一进程运行 Worker；执行单元不持有内存业务状态，未来接入持久对象存储后可由独立 Worker 宿主复用。本任务已转为 `review / Current actor=规划对话`，只通知规划总线，后端停止且不自行解锁 `FRONT-M2-06`。

## 2026-08-13 — UI-M2-04 用户验收通过

- 用户查看规划审核后的正式回收站交互预览与五张关键截图后回复“确认”，验收整体交互方向。
- `CURRENT.md` 更新为 v3-079，`UI-M2-04` Rev 5 标记 `done`；顶部“页面/场景”下拉仅为原型状态切换器，不进入生产页面。
- `BACK-M2-06` 继续独立开发，不因 UI 验收被打断；`FRONT-M2-06` 仍保持 `blocked`，当前只剩后端交付经规划独立验收这一项依赖。规划通过后再自动解锁前端，不要求用户传话。

## 2026-08-13 — 规划通过 UI-M2-04 Rev 3 交接审计并路由用户验收

- 规划按 FIFO 读取 `CURRENT.md` v3-077、`DESIGN.md` 回收站正式章节、`docs/ui/M2-recycle-bin-acceptance.md`、日志顶部和仓库外五张截图，并按 Product Design 的 UX/可访问性审核框架逐张复核。
- 范围与契约一致：只设计整个项目的回收、48 小时恢复、清理中不可恢复和清理失败等待重试；项目中心确认框清楚列出未完成上传立即终止、已完成资料保留和到期不可恢复三项影响，没有立即永久删除、单文件删除、7 天交付回收、账号权限或真实 R2 越界。
- 五张截图的层级、状态文字、危险操作确认和恢复/清理反馈清楚；状态不只靠颜色表达，恢复失败保留项目，清理失败不伪装成功。1440 与 1024 根页面无横溢，1024 少量横滚只存在于紧凑表格；正式实现须保证恢复主操作仍能通过键盘和表格滚动到达。截图无法单独证明完整读屏语义，后续生产 UI 验收仍须验证焦点、键盘闭环和状态播报。
- `CURRENT.md` 更新为 v3-078，队列 010 关闭；`UI-M2-04` Rev 4 保持 `review` 并路由用户验收。顶部“页面/场景”选择器只属于原型状态切换器，不进入生产页面；`FRONT-M2-06` 继续阻塞，仍需 UI 用户验收和 `BACK-M2-06` 规划验收同时通过。

## 2026-08-13 — UI-M2-04 Rev 3 正式回收站设计交付并交回规划

- UI 设计对话沿用 UI-M2-01 已确认的冷灰 AppShell 与紧凑列表方向，在 `DESIGN.md` 新增项目回收站正式规则，并新增 `docs/ui/M2-recycle-bin-acceptance.md`；仓库外 `qimao-recycle-bin.html` 提供可交互电脑端预览与 5 张关键状态截图。
- 项目中心二次确认明确三项影响：立即终止全部未完成上传且恢复后不自动复活；已完成 Asset、清单和项目资料在 48 小时内保留；到期进入后台清理后不可恢复。回收站覆盖加载、空数据、倒计时、恢复成功/失败、清理中不可恢复、清理失败等待后台重试和项目已清理。
- 1440×900 实测根页面 `1440/1440`、表格 `1178/1178`；1024×768 展开 204px 侧栏根页面 `1024/1024`、表格容器 `778/842`，收起 72px 侧栏根页面仍为 `1024/1024`、表格容器 `910/922`。页面横向范围均为 0，少量横滚只在表格容器内部。
- 八类状态逐项检查通过；项目回收确认、恢复反馈、搜索/筛选/排序和侧栏开合可交互。修正一次侧栏图标重建问题后，以新浏览器标签复验控制台 error/warn 0；Impeccable 降级机械检测返回空结果，真实浏览器与截图为主要证据。
- 本轮未修改 `frontend/src`、后端、迁移或共享契约，未提供立即永久删除、单文件删除、7 天交付回收、账号权限或真实 R2。`CURRENT.md` 更新为 v3-077，`UI-M2-04` Rev 3 `review / Current actor=规划对话`；只交回规划总线审核，不自行请求前端开始或标记完成。

## 2026-08-13 — UI-M2-04 Rev 2 领取

- UI 设计对话完整重读项目级 `AGENTS.md`、协作协议 12.1/12.2、`CURRENT.md` v3-075、`DESIGN.md`、既有 M2 UI 验收、M2 生命周期契约、职责矩阵“回收站”行和开发日志顶部，领取 `UI-M2-04` Rev 1。
- 同步版本更新为 v3-076，任务更新为 Rev 2 `in_progress`；本轮沿用 UI-M2-01 已确认方向，只细化一套项目级回收站正式交互与电脑端预览，不重新做三版发散。
- 写入范围限定为 `DESIGN.md`、`docs/ui/`、仓库外原型与截图及本任务同步行/日志；不修改生产前端、后端、迁移或共享契约，不提供立即永久删除、单文件删除、7 天交付回收、账号权限或真实 R2。完成后只交回规划总线。

## 2026-08-13 — BACK-M2-06 Rev 2 领取

- 后端开发对话完整重读项目级 `AGENTS.md`、协作协议 12.1/12.2、`CURRENT.md` v3-074、M2 生命周期契约、职责矩阵“回收站”行、M2 里程碑和开发日志顶部，领取 `BACK-M2-06` Rev 1。
- 同步版本更新为 v3-075，任务更新为 Rev 2 `in_progress`；本轮只实现本地 Storage fake 下的项目回收/恢复、回收站投影、未完成上传终止与清理、48 小时集中配置、CleanupJob 租约 Worker、对象删除审计和 `purged` 最小墓碑。
- 写入范围限定为 `backend/`、迁移、`packages/contracts/`、`tests/backend/` 及本任务同步行/日志；不修改生产前端或 DESIGN，不接真实 R2，不做全库孤儿核对、单文件/交付回收、账号权限、提交、推送或部署。完成后只交回规划总线。

## 2026-08-13 — 用户确认先完成回收站并解锁 UI/后端并行任务

- 用户明确要求先把回收站相关能力做完，再开始术语与其他核心工作台。规划保持本地 Storage fake 路径，真实 R2、购买与部署继续后置。
- `PLAN-M2-06` 采用已展示的推荐行为并关闭：项目回收时立即终止全部未完成上传并可重复清理未完成分片；48 小时内恢复时保留已完成 Asset、清单和项目资料，但终止会话不自动复活，员工需重新选择原文件并新建上传任务。
- M2 生命周期契约补充上述删除/恢复顺序，并明确本切片的项目级 48 小时回收与长期交付“48 小时后进入 7 天可恢复期”是两个不同生命周期，当前不混做。
- `CURRENT.md` 更新为 v3-074；`PLAN-M2-06` Rev 2 标记 `done`，并行解锁 `UI-M2-04` 与 `BACK-M2-06` Rev 1 `ready`。`FRONT-M2-06` Rev 1 保持 `blocked`，等待 UI 用户验收和后端规划验收同时通过。
- UI 只设计正式回收站和项目中心回收动作；后端只实现项目生命周期、幂等命令、回收投影、租约 Worker、Storage fake 删除和审计。两者均不得扩展到真实 R2、孤儿总核对、单文件/交付回收、账号权限、提交、推送或部署。

## 2026-08-13 — 用户选择本地回收站优先并进入行为确认门

- 用户对 `PLAN-M2-05` 明确选择方案 A：先基于现有 Storage fake 实现本地项目回收站，真实 Cloudflare R2、办公网络实测、购买和部署继续后置。
- 规划核对 `PRODUCT.md`、M2 里程碑、M2 生命周期契约、职责矩阵、既有 UI 验收和当前代码，确认无需重新讨论的基线：只回收整个项目；48 小时内可恢复；`purging` 后不可恢复；普通页面不提供立即永久删除；清理 Worker 使用数据库租约、幂等对象删除、失败重试和最小审计墓碑。
- `CURRENT.md` 更新为 v3-073；`PLAN-M2-05` Rev 2 标记 `done`，新建 `PLAN-M2-06` Rev 1 `review / Current actor=用户`。唯一待确认建议是：回收时立即终止未完成上传并清理未完成分片；恢复时保留已完成 Asset、清单和项目资料，但未完成上传不自动复活，员工须重新选择文件并新建上传任务。
- 用户确认前不解锁 UI、后端或前端实现；本切片不包含 7 天交付素材回收、单文件删除、真实 R2、孤儿总核对、账号权限、提交、推送或部署。

## 2026-08-13 — 规划通过 UI 两态终验并关闭正式上传队列切片

- 规划按 FIFO 审核 `FRONT-M2-04B` Rev 19，读取 Rev 18 两态验收记录并逐张复核仓库外 `frontend-qa-rev18/` 两张 1024×768 截图；两态页面底部均无整页横向滚动条，唯一横向滚动条位于 980px 表格容器内部。
- 展开侧栏 204px 与收起 72px 两态均为根页面 `clientWidth=scrollWidth=1014`、水平范围 0；表格容器分别为 744→980 和 876→980。`innerWidth=1024` 多出的 10px 是 Windows 纵向滚动条槽，测量和视觉证据一致。
- 结合 Rev 8/13 已冻结的共享 MP4、错误恢复、完整上传、后端 `ready`、整批 100%、完成项折叠、1440 页面和控制台证据，规划判定正式多文件上传队列达到本切片验收标准。`CURRENT.md` 更新为 v3-072，队列 009 关闭，`FRONT-M2-04B` Rev 20 标记 `done`；M2 里程碑同步记录完成事实。
- 新建 `PLAN-M2-05` Rev 1 `review / Current actor=用户`，只用于选择下一切片顺序：A 本地回收站优先（推荐）、B 真实 R2 优先、C 暂停开发先预览。用户选择前不解锁任何实现、云资源、购买、部署、提交或推送。

## 2026-08-13 — FRONT-M2-04B Rev 19 UI 两态终验通过并交回规划

- UI 设计对话只复验正式 `/uploads` 的 1024×768 两态，没有重做共享 MP4、错误恢复、完整上传、完成项折叠、1440 页面或业务流程。
- 展开态侧栏 204px：根页面 `clientWidth=scrollWidth=1014`、水平范围 0；`.tableWrap clientWidth=744 / scrollWidth=980`、内部横滚 236px；表格宽 980px。
- 收起态侧栏 72px：根页面同为 `1014/1014`、水平范围 0；`.tableWrap 876/980`、内部横滚 104px；表格宽 980px。`innerWidth=1024` 多出的 10px 是 Windows 纵向滚动条槽，不构成横溢。
- 两张截图底部均无页面级横向滚动条，唯一横向滚动条保留在表格容器内；新增证据保存于仓库外 `frontend-qa-rev18/`。UI 领域结论为通过。
- 按规划总线将 `FRONT-M2-04B` 更新为 Rev 19 `review / Current actor=规划对话`，不自行标记 done、不通知前端或解锁后继任务。未修改生产代码；匿名项目 `1832f637-3a0e-4064-b721-06b13d0c59e6` 已删除，本轮 3000、3001、55432 服务均停止。

## 2026-08-13 — 规划通过 Rev 17 横溢修复审计并路由 UI 两态终验

- 规划按 FIFO 审核 `FRONT-M2-04B` Rev 17，确认本轮生产改动严格限定为 `UploadQueue.module.css`：`.page` 增加 `min-width: 0`，`.tableWrap` 增加 `position: relative`，既有 `overflow-x: auto` 与表格 `min-width: 980px` 保持不变。
- 测量口径核对通过：Windows 非覆盖式纵向滚动条会使 `innerWidth=1024` 而根布局宽为 1014；无页面横溢应以 `scrollWidth === clientWidth` 或水平可滚范围 0 判断。前端证据显示根节点两态均为 1014/1014，表格容器展开 744→980、收起 876→980，横滚只存在于表格容器。
- 规划独立运行 `pnpm exec vitest run tests/frontend/UploadQueue.test.tsx`，1 个文件 7 项全部通过；独立运行正式前端构建，138 个模块构建成功；CSS 行级核对和 `git diff --check` 通过。
- `CURRENT.md` 更新为 v3-070，队列 008 关闭；任务递增为 Rev 18 `review / Current actor=UI 设计对话`。UI 只复验 1024×768 侧栏 204px/72px 两态，不重做共享入口、错误恢复、完成态、1440 页面或业务流程；结论仍须先交回规划总线。

## 2026-08-13 — FRONT-M2-04B Rev 17 修复 1024 页面级横溢并交回规划

- 修复前在同一匿名共享清单下复现 UI 证据：1024×768 展开侧栏 204px 时根页面 `scrollWidth=1188`，收起为 72px 后 `scrollWidth=1056`；表格保持 980px，横向内容逃逸到根页面。
- 根因不是 AppShell 外层网格：`.workspace`、`.main` 和 `.tableWrap` 已允许收缩。实际逃逸来自 UploadQueue 嵌套 Grid 的隐式最小内容约束，以及末列表头绝对定位的全局 `sr-only` 文本没有在表格滚动容器内建立定位上下文。
- 只修改 `frontend/src/features/uploads/UploadQueue.module.css` 两个约束：`.page { min-width: 0; }`；`.tableWrap` 增加 `position: relative`，保留既有 `min-width: 0; overflow-x: auto` 和表格 `min-width: 980px`。没有修改 AppShell、JSX、业务状态或交互。
- 1024×768 修复后展开/收起实测：侧栏分别 204px/72px；两态根节点均为 `scrollWidth=clientWidth=1014`、页面水平可滚范围 0。浏览器 `innerWidth=1024` 与布局宽 1014 的 10px 差值来自 Windows 非覆盖式纵向滚动条槽，因此无横溢的正确判据是 `scrollWidth === clientWidth`，不是强制等于包含滚动条槽的 `innerWidth`。
- 表格自身滚动保持：展开态 `.tableWrap clientWidth=744 / scrollWidth=980`，内部横向范围 236px；收起态为 `876 / 980`，内部横向范围 104px；两态表格实际宽度均为 980px。1024 截图目视确认横向滚动条只出现在表格容器，页面底部不再出现横向滚动条，控制台错误/警告为 0。
- 上传专项 `UploadQueue.test.tsx` 7/7 通过；前端生产构建 138 模块通过；完整 `pnpm check` 退出码 0，8 个测试文件 54 项、lint、类型、迁移与前后端构建全部通过；Impeccable 检测返回空结果，`git diff --check` 无输出。
- 匿名布局项目已核对零残留，本轮 3000、3001、55432 服务均停止。共享 MP4、错误恢复、完整上传、完成项折叠、视觉层级和全部业务交互冻结；未修改后端、迁移、共享契约、DESIGN，未提交、推送或部署。
- `FRONT-M2-04B` 从 Rev 16 `in_progress` 更新为 Rev 17 `review / Current actor=规划对话`；按规划总线只通知规划做交接审计，不直接通知 UI 或解锁下一任务。

## 2026-08-13 — FRONT-M2-04B Rev 16 领取 1024 横溢定向返工

- 前端开发对话重读项目约定、规划总线、`CURRENT.md` v3-067、UI Rev 13 余项复验和日志顶部，确认唯一目标是消除正式 `/uploads` 在 1024×768 的页面级横向溢出。
- `FRONT-M2-04B` 从 Rev 15 `ready` 更新为 Rev 16 `in_progress`；本轮只检查 AppShell 主内容列与 UploadQueue 容器的最小收缩约束，保留 `.tableWrap` 内 980px 表格最小宽度和自身横向滚动。
- 共享 MP4、错误恢复、完整上传、完成态、视觉层级和全部业务交互冻结；不修改后端、迁移、共享契约、DESIGN 或重构其他页面。完成后只交回规划总线。

## 2026-08-13 — 规划审核 1024 横溢并定向退回前端

- 规划按 FIFO 审核 `FRONT-M2-04B` Rev 14：核对 UI 的五张新增证据、页面测量、验收记录、正式 AppShell 与 UploadQueue CSS，确认共享 MP4 正常入口、指纹错误恢复、完整上传、后端 `ready`、完成项折叠和控制台均已通过。
- 唯一退审项成立：1024×768 展开侧栏时页面 `scrollWidth=1188`，收起后仍为 `1056`，密集表格的横向滚动逃逸到整页；这属于已确认设计内的前端布局收缩约束缺陷，不需要重新讨论产品方案。
- `CURRENT.md` 更新为 v3-067，规划队列 007 关闭；同一任务递增为 Rev 15 `ready / Current actor=前端开发对话`。返工仅允许修正 AppShell 主内容列或 `/uploads` 容器收缩，使页面无横溢且 `.tableWrap` 保留自身横向滚动和 980px 表格最小宽度。
- 其余 UI 已通过项全部冻结；前端不得修改后端、迁移、共享契约、DESIGN 或重构其他页面。修复交回规划后，UI 只复验 1024×768 侧栏展开/收起两态，不重做其他证据。

## 2026-08-13 — FRONT-M2-04B Rev 14 UI 余项复验发现 1024 页面级横溢

- UI 设计对话基于 `frontend-qa-rev8/` 既有证据继续余项，没有重做已通过的 1440×900 页面。新增 5 张真实页面截图保存于仓库外 `frontend-qa-rev13/`。
- 通过项：正常素材确认 UI 已允许同集双视频角色共享同一 MP4，保存后上传页 3 项绑定聚合为 2 个物理文件/共享 MP4 单行；错误文件显示“失败”和唯一“重新选择原文件”，正确文件可恢复；完整上传后后端 `ready`、整批 100%、完成项默认折叠并可展开；控制台错误和警告为 0。
- 唯一不通过项：1024×768 展开侧栏时 `documentElement.scrollWidth=1188 > innerWidth=1024`，收起为 72px 后仍 `1056 > 1024`；截图底部出现页面级横向滚动，完成表格从 `x=105` 延伸至 `x=1085`。这违反横向滚动仅留在密集表格容器的 UI 验收边界。
- 最小建议只修正 `/uploads` 主内容网格/容器的收缩约束，保留侧栏 204→72、980px 表格最小宽度、现有视觉与交互；复验只需 1024×768 展开/收起两态，不重做其余通过项。
- 按规划总线将 `FRONT-M2-04B` 更新为 Rev 14 `review / Current actor=规划对话`，只回传规划审核，不直接退回前端或标记 done。未修改生产前端、后端、迁移或共享契约；匿名项目、夹具和本轮服务已清理，3000、3001、55432 均无监听。

## 2026-08-13 — 规划通过 Rev 12 交接审计并路由 UI 继续验收

- 规划按总线登记并审核 `FRONT-M2-04B` Rev 12：修改范围严格限定为 `frontend/src/features/materials/scan.ts` 与 `tests/frontend/ProjectMaterials.test.tsx`，未触碰上传页主体、后端、迁移、共享契约或 DESIGN。
- 代码审计确认路径占用记录现在保留集数与角色，只允许同集、角色恰为 `asr_video + screen_video`、扫描文件为视频的共享；跨集、字幕、其他角色组合和类型/指纹无效继续阻断，与后端 83–99 行规则一致。
- 规划独立运行 `pnpm exec vitest run tests/frontend/ProjectMaterials.test.tsx tests/frontend/UploadQueue.test.tsx`，2 个文件 13 项全部通过；独立运行完整 `pnpm check`，退出码 0。
- 前端提交的真实浏览器证据同时满足正常素材确认 UI 首次保存 HTTP 201、3 项绑定、上传页 2 个物理文件、共享 MP4 单行和控制台 0 错误；匿名项目、夹具与本地服务已经清理。
- `CURRENT.md` 更新为 v3-065，FIFO 006 关闭；任务更新为 Rev 13 `review / Current actor=UI 设计对话`。UI 只从已有 `frontend-qa-rev8/` 证据继续 1024×768、完整完成/折叠、错误恢复、最终控制台和共享入口修正复验，不从头重做。
- UI 无论通过或退审都必须按规划总线交回规划，不直接通知前端、标记 `done` 或解锁下一任务。本轮没有修改生产代码、提交、推送或部署。

## 2026-08-13 — FRONT-M2-04B Rev 12 完成共享 MP4 定向返工并交回规划

- `findPairingBlockers` 的路径占用记录改为保留集数与角色；仅当同一路径在同一集恰好组成 `asr_video + screen_video` 且扫描文件为视频时允许共享。跨集复用、字幕复用、其他角色组合和素材类型/指纹错误继续形成阻断。
- `ProjectMaterials.test.tsx` 新增回归同时覆盖合法同集双视频共享、跨集视频复用、跨集字幕复用和字幕角色占用视频等其他组合；修改范围严格限定为规划指定的两个前端文件，上传页主体未改。
- 素材专项 `ProjectMaterials.test.tsx` 6/6 通过；上传队列专项 `UploadQueue.test.tsx` 7/7 通过；完整 `pnpm check` 退出码 0，仓库检查、lint、类型检查、数据库迁移、全量测试与前后端构建均通过；`git diff --check` 无输出。
- 真实浏览器从正式素材确认页选择匿名文件夹，将同集 EP01.mp4 同时选为中文识别视频与画面字视频后显示 0 个阻断且确认按钮可用；首次保存回显清单 v1、3 项绑定。该新建清单走后端 `created` 成功分支 HTTP 201，前端仅在 `response.ok` 后回显成功。
- 随后通过正式“上传任务”导航进入 `/uploads`：批次显示清单 v1、物理文件 2；EP01.srt 一行，EP01.mp4 以“中文识别视频 · 画面字视频 / 共享文件 · 上传一次”恰好一行展示；浏览器控制台 0 错误。
- 匿名验收项目 `a473aedd-cc1b-423c-a5be-a7e79f8b946b` 已按精确 UUID 删除并核对零残留，临时夹具目录已删除，3000、3001、55432 端口均释放。未修改后端、迁移、共享契约、DESIGN 或上传页主体，未提交、推送、部署或创建云资源。
- `FRONT-M2-04B` 从 Rev 11 `in_progress` 更新为 Rev 12 `review / Current actor=规划对话`；按规划总线只通知规划做交接审计，不直接通知 UI、不标记 `done`、不解锁下一任务。

## 2026-08-13 — FRONT-M2-04B Rev 11 领取共享 MP4 定向返工

- 前端开发对话重读项目约定、规划总线、`CURRENT.md` v3-062、UI Rev 8 冲突证据、M2 契约共享规则和日志顶部，确认当前唯一动作是素材确认前端的局部阻断修正。
- `FRONT-M2-04B` 从 Rev 10 `ready` 更新为 Rev 11 `in_progress`；本轮只修改 `frontend/src/features/materials/scan.ts` 与 `tests/frontend/ProjectMaterials.test.tsx`，允许同集同一路径恰好用于 `asr_video + screen_video`。
- 跨集复用、字幕复用和其他角色组合继续阻断；不修改上传页主体、后端、迁移、共享契约或 DESIGN。完成后运行素材专项、UploadQueue 专项、完整 `pnpm check` 和正常 UI 确认到共享上传队列的真实浏览器链路，再只交回规划总线。

## 2026-08-13 — 规划审核共享 MP4 冲突并定向退回前端

- 规划按总线读取 `CURRENT.md` v3-061、UI Rev 8 六张截图说明、冲突复现、前端 `findPairingBlockers`、后端素材清单验证和既有资产绑定测试，并登记 FIFO 005。
- 冲突成立：`frontend/src/features/materials/scan.ts` 使用 `Map<relativePath, episode>` 对任意重复路径一律阻断；`backend/src/modules/materials/material.routes.ts` 已明确允许同集、两个角色恰为 `asr_video + screen_video`、视频元数据完全一致的共享绑定。后端既有测试还验证共享 MP4 一次上传并绑定唯一 Asset。
- 规划将问题分类为“已确认契约下的局部前端实现缺陷”，无需用户重新选择方案。只允许修正 `findPairingBlockers` 的共享视频例外并在 `ProjectMaterials.test.tsx` 补充同集共享允许、跨集/字幕/其他组合仍阻断的回归；不改上传页主体、后端、迁移、共享契约或已验收视觉。
- `CURRENT.md` 更新为 v3-062，FIFO 005 关闭；`FRONT-M2-04B` 更新为 Rev 10 `ready / Current actor=前端开发对话`。前端须运行素材与上传专项、完整 `pnpm check`，并从正常素材确认 UI 证明 API `201`、上传页 2 个物理文件和共享 MP4 单行。
- 前端完成后按规划总线只交回规划；规划审核通过才路由 UI 从已有 1440×900 证据继续 1024×768、完整完成/折叠、错误恢复和最终控制台复验，不从头重做。
- 本轮只修改状态与日志，没有修改生产前端、后端、迁移、共享契约或 UI 设计，没有提交、推送或部署。

## 2026-08-13 — FRONT-M2-04B Rev 9 UI 验收发现共享清单入口冲突

- UI 设计对话从正式 React `/uploads` 页面执行 1440×900 真实浏览器验收，已验证空状态、素材文件夹/多文件双入口、行动优先紧凑表格、唯一整批总体进度、单文件文字状态、五列排序、素材筛选、选择后批量栏、行内详情和共享物理文件单行；6 张截图保存在仓库外 `frontend-qa-rev8/`。
- 可复现冲突：素材确认页把同集同一 MP4 同时选为中文识别视频和画面字视频后显示“已用于第 1 集，不能重复占用”并禁用确认；但职责矩阵与 M2 契约明确允许该共享。相同清单直接提交本地 API 返回 `201` 和 3 项绑定，上传页正确归并为 2 个物理文件且共享 MP4 只显示一行。
- 根因只读定位为 `frontend/src/features/materials/scan.ts` 的 `findPairingBlockers` 对任意重复路径一律阻断，缺少后端已有的“同集 asr_video/screen_video 且视频元数据完全一致”例外。这是生产正常入口冲突，不是测试操作或非阻断展示问题。
- 按专业异议机制将 `FRONT-M2-04B` 更新为 Rev 9 `blocked / Current actor=规划对话`。最小建议是只修正素材确认前端共享例外并补前端回归；1024×768、完整完成/折叠、错误恢复和最终控制台复验暂缓，修正后从现有证据继续。
- 没有修改 `frontend/src`、后端、迁移或共享契约。匿名项目 `f1ecbe6b-e976-4b49-86c4-144e56c79006`、临时夹具和本轮本地服务已清理，3000、3001、55432 端口已释放；截图证据保留。

## 2026-08-13 — 所有跨角色交接升级为规划总线

- 用户明确要求：后端、前端和 UI 完成任何环节后，无论原本要通知 Reviewer、返工 Owner 还是下一角色，都必须先经过规划对话审核和总流程调度。
- `docs/WORKFLOW.md` 已改为两次规划门：Owner 交付先回规划做交接审计；指定 Reviewer 形成领域结论后再次回规划。只有规划可以标记最终 `done`、退回 `ready`、解锁后继任务及发送跨角色启动/返工通知。
- `AGENTS.md` 同步禁止 UI、前端、后端直接互相接力。所有交付、验收、退审和冲突统一进入 `CURRENT.md` 的规划 FIFO 队列，用户不承担复制和传话。
- `CURRENT.md` 更新为 v3-060；正在执行的 `FRONT-M2-04B` Rev 8 UI 验收不重启，但 UI 的通过、退审或冲突结论必须先回规划，不得直接通知前端或解锁端到端验收。
- 本轮只修改协作协议、项目级约定、当前看板和日志，没有修改生产前端、后端、迁移、共享契约或 UI 设计，没有提交、推送或部署。

## 2026-08-13 — FRONT-M2-04B Rev 8 完成正式多文件上传队列并转 UI 验收

- 新增正式 `/uploads` React 路由和行动优先队列；交付多文件/文件夹双入口、唯一物理文件合并、素材/状态/集数筛选、五列排序、完成项折叠、行内详情、选择后批量暂停/继续/取消、错误重选和原行恢复。
- 单文件只显示文字状态；顶部按后端会话与 Asset 事实计算唯一整批总体进度。ASR 与画面字角色共享同一 MP4 时只形成一行、一个 SHA-256、一个 `UploadSession` 和一个最终 Asset。
- 上传引擎使用服务端分片大小、单文件并发 3、浏览器总并发 12；SHA-256 按 4 MiB 分块并让出主线程。断网恢复后自动续传缺失分片，授权过期自动续签一次，创建/确认/完成/取消复用稳定幂等意图。
- 最终完整 `pnpm check` 退出码 0：8 个测试文件 53 项测试全部通过，lint、类型检查、迁移、前后端构建和仓库边界通过；上传专项 1 个文件 7 项通过，`git diff --check` 无输出，`impeccable` 检测为空。
- 1440×900 真实浏览器以匿名 2 B SRT 和 8 B 共享 MP4 完成双会话完整上传，后端项目归约为 `ready`；页面为整批 100%、2 个物理文件、共享 MP4 单行，完成筛选、批量栏和侧栏收起正常，无横向溢出，控制台 0 错误。
- 匿名验收项目按精确 UUID 核对零残留，2 个临时夹具和本轮本地服务已清理，3000、3001、55432 端口释放。未修改后端、迁移、共享契约、产品或设计规划；未提交、推送、部署、接真实 R2 或创建云资源。
- `FRONT-M2-04B` 从 Rev 7 `in_progress` 更新为 Rev 8 `review / Current actor=UI 设计对话`；下一步仅由 UI 对话按 Rev 15 合并方向做真实页面视觉/交互验收，通过后再通知规划端到端验收。

## 2026-08-13 — FRONT-M2-04B Rev 7 领取正式多文件上传队列

- 前端开发对话重读 `AGENTS.md`、协作协议、`CURRENT.md` v3-057、职责矩阵“上传任务”行、`DESIGN.md` 5.2、M2 上传契约、已验收 Rev 15 合并方向和开发日志顶部，确认 UI 与后端依赖均已通过。
- `FRONT-M2-04B` 已从 Rev 6 `ready` 递增为 Rev 7 `in_progress`；本轮仅实现正式 React 多文件上传队列、前端测试和真实浏览器验证。
- 写入边界固定为 `frontend/src/`、`tests/frontend/`、前端自有说明以及本任务必需的共享状态/日志行；不修改后端、迁移或共享契约，不实现或注册任务中心、术语、ASR/OCR、审改、验收、交付、真实 R2 或云资源。

## 2026-08-13 — 规划登记 UI-M2-03 Rev 16 通过并解锁正式前端

- 规划按队列读取 `CURRENT.md` v3-056、最终 UI 验收记录、`DESIGN.md`、职责矩阵和 Rev 15 合并方向截图，确认用户已明确验收通过，且最终稿只包含上传模块能力。
- 最终方向固定为：行动状态分组、完成项折叠和行内详情；“选择素材文件夹 / 选择多个文件”双入口；轻量素材/状态标签、普通筛选与选择后批量栏；单文件只显示文字状态，整批顶部显示唯一总体进度。
- `PLAN-M2-04`、`BACK-M2-04A` 与 `UI-M2-03` 三项依赖全部满足。规划队列新增并关闭 004；`CURRENT.md` 更新为 v3-057，`FRONT-M2-04B` 递增为 Rev 6 `ready / Current actor=前端开发对话`。
- 前端只获准修改 `frontend/src/`、`tests/frontend/` 和前端自有说明，消费现有后端与共享契约；不得实现或注册任务中心、术语、ASR/OCR、审改、验收、交付、真实 R2 或云资源。完成后由 UI 对话验收真实页面，再由规划做端到端验收。
- 规划检查发现 UI 验收记录第 148、150 行仍保留验收前旧停止边界；该文档属于 UI 设计角色，将自动通知 UI 做非阻塞机械修正，不影响已由顶部结论、CURRENT 和用户明确反馈成立的验收结果。
- 本轮未修改生产前端、后端、迁移或共享契约，未提交、推送、部署或创建云资源。

## 2026-08-13 — UI-M2-03 Rev 16 用户验收通过

- 用户对 Rev 15 合并确认稿反馈“目前没看出什么问题”，确认该组合方向可作为正式前端实现依据。
- 最终方向保持方案一的行动状态分组、完成项折叠和行内详情，采用方案二的上传双入口、轻量标签、普通筛选与选择后批量栏；单文件不显示百分比或进度条，只有整批顶部显示总体进度。
- `UI-M2-03` 更新为 Rev 16 `done` 并清空 `Current actor`；验收记录与截图证据见 `docs/ui/M2-upload-queue-acceptance.md`。
- UI 对话没有修改或解锁生产前端、后端、迁移和共享契约。下一步交给规划对话按队列与依赖协议决定是否解锁 `FRONT-M2-04B`；生产实现完成后仍须由 UI 设计对话进行真实页面视觉/交互验收。

## 2026-08-13 — UI-M2-03 Rev 15 组合方向确认稿

- 用户从 Rev 12 三版中选择“方向 1 整体 + 方向 2 局部控件”：保留行动状态分组、完成项折叠和行内详情，替换为并列的“选择素材文件夹 / 选择多个文件”、轻量素材/状态标签、普通筛选与选择后批量栏。
- 按用户反馈移除所有单文件上传百分比和逐文件进度条；单文件只显示“上传中”等文字+语义色状态，整批顶部保留唯一总体进度与百分比。
- 已生成并目视复核 Rev 15 合并确认稿：`C:\Users\ComradeGu\.codex\visualizations\2026\08\12\019ff52d-d4a1-7440-81a2-fc9c1b0a0996\rev12\04-selected-combined-direction.png`。稿件只包含素材上传范围，没有后续流程导航。
- `UI-M2-03` 更新为 Rev 15 `review / Current actor=用户`，等待用户确认组合稿。`FRONT-M2-04B` 继续阻塞；没有修改生产前端、后端、迁移或共享契约。

## 2026-08-13 — UI-M2-03 Rev 14 上传专用三版交付

- Product Design audit 重新查看当前上传页与用户参考截图，确认可保留的是紧凑表格、分类/筛选层级、文字+语义色、排序、选择和行尾菜单；需要删除的是常驻技术详情、竞争动作和任何后续流程导航。
- Impeccable distill 将页面单一目标收敛为“员工一次选择多个文件或素材文件夹，在一个紧凑队列中看到多个物理文件并行上传，并优先恢复失败项”；相对路径、指纹、会话、分片和请求 ID 仅在原行展开。
- Product Design ideate 独立生成并逐张复核恰好三版 1440×1024 方向，分别使用行动状态分组、单表行动优先和按集台账三种组织方式；三张证据保存在仓库外 `rev12/` 目录，显示顺序即用户选择编号。
- 三版均只包含多文件/文件夹选择、素材分类、上传状态筛选、紧凑物理文件列表、批量选择、排序、进度、恢复和取消未完成上传；没有术语、中文识别、画面字、前置审改、字幕验收或交付流程导航。
- `UI-M2-03` 更新为 Rev 14 `review / Current actor=用户`，等待用户选择 1/2/3 或提出组合返工。`FRONT-M2-04B` 继续阻塞；没有修改生产前端、后端、迁移或共享契约，没有提交、推送、部署或创建云资源。

## 2026-08-13 — UI-M2-03 Rev 13 领取上传专用三版返工

- UI 设计对话完整重读项目协议、`CURRENT.md` v3-052、模块职责矩阵、`DESIGN.md` 5.2、M2 里程碑和上传队列验收记录；任务指向职责矩阵“上传任务”单一模块行。
- 同步版本更新为 v3-053，任务更新为 Rev 13 `in_progress`。本轮按 Product Design audit → Impeccable distill → Product Design ideate 执行并只交付恰好三版电脑端方向。
- 三版仅覆盖多文件/文件夹选择、素材分类、上传状态筛选、紧凑物理文件列表、多文件并行状态与恢复；禁止出现术语、中文识别、画面字、前置审改、字幕验收和交付流程标签。
- 只修改 `DESIGN.md`、`docs/ui/` 和仓库外原型/截图；不修改生产前端、后端、迁移或共享契约，不解锁 `FRONT-M2-04B`。

## 2026-08-13 — 规划完成 UI-M2-03 Rev 11 跨角色范围冲突审查

### 裁决与权威边界

- 异议成立。上传任务只拥有多素材选择、物理文件上传、素材分类、上传状态、暂停/续传、服务端校验、失败恢复和取消未完成上传；术语、中文识别、画面字、前置审改、字幕验收和交付不得出现在上传页流程导航。
- 新增 `docs/contracts/MODULE_RESPONSIBILITY_MATRIX.md`，逐项固定用户目标、模块归属、任务 ID、UI/前端/后端权限、权威数据、允许目录、非目标、依赖和验收；`docs/WORKFLOW.md` 同步要求每个 `ready` 任务只能指向一个矩阵模块行。
- 明确“上传任务 / 任务中心 / 项目工作台”三边界：上传任务只传文件；任务中心后续汇总 ASR/OCR/AI/导出异步执行；项目工作台承载术语确认、识别结果、人工审改、验收和交付。
- 多文件选择按唯一物理文件建立多个独立 `UploadSession`，项目与清单版本下的批次只是只读投影；同集两个视频角色共享同一 MP4 时只上传一次，批量动作逐项执行现有会话命令。

### 跨代码审查与任务写回

- 只读扫描 `frontend/src`、`backend/src/modules`、`packages/contracts/src` 和相关测试：正式前端尚无上传页；术语、中文识别、画面字仅是未路由且未由 AppShell 展示的 `planned` 项目模块。后端只有项目、素材和上传模块，素材角色名称没有对应 ASR/OCR 执行接口或供应商调用，因此无需返工已验收生产代码。
- 修正 `DESIGN.md`、M2 里程碑、M2 上传契约、架构和 UI 验收记录，清除上传页与后续处理混放的输入，并把旧稿浏览器证据明确降为作废历史，不能用于新稿验收。
- 规划队列 003 关闭；`CURRENT.md` 更新到 v3-052。`UI-M2-03` 递增为 Rev 12 `ready / Current actor=UI 设计对话`，只重做三版多素材上传方向；`FRONT-M2-04B` 递增为 Rev 5 且继续 `blocked`，等待修正版 UI 用户验收。
- 本轮没有修改生产前端、后端、迁移或共享代码契约，没有接入任务中心、术语、ASR/OCR、回收站、云资源或付费服务，没有提交、推送或部署。

## 2026-08-13 — UI-M2-03 Rev 11 提交任务边界冲突审查

- 用户明确指出上传任务只负责素材分类与素材上传，并须支持一次选择多个素材、多个物理文件并行上传；术语、中文识别、画面字、前置审改、字幕验收和交付属于任务中心或后续工作流。
- UI 首轮三版错误地把七个后续流程标签放入上传任务，均已作废；`DESIGN.md` 与 UI 验收记录已撤回该错误边界，没有修改生产前端、后端、迁移或共享代码契约。
- 冲突类型为产品规则、UI/交互与任务所有权冲突。可复现证据是三版顶部流程导航与用户最新口径直接相反；若继续会把错误信息架构传入 `FRONT-M2-04B`，并可能掩盖前后端同类越界。
- `UI-M2-03` 更新为 Rev 11 `blocked / Current actor=规划对话`。最小建议是规划形成逐环节职责/范围矩阵，覆盖模块归属、任务 ID、UI、前端、后端、权威数据、允许目录、非目标、依赖和验收，并审查现有前后端任务后再重新分派 UI。
- 不受影响且可保留的输入为：13 类状态、紧凑物理文件列表、文字+语义色、五列排序、选择后批量栏、行内渐进详情、唯一主恢复动作和需确认的“取消未完成上传”。受影响的视觉出图与开发解锁已停止。

## 2026-08-13 — UI-M2-03 Rev 10 领取三版视觉返工

- UI 设计对话完整重读项目级 `AGENTS.md`、协作协议 v3、`CURRENT.md` v3-049、`DESIGN.md`、M2 里程碑与开发日志顶部，并直接查看用户提供的参考截图。
- 同步版本更新为 v3-050，任务更新为 Rev 10 `in_progress`；本轮按指定顺序执行 Product Design audit、Impeccable distill 和 Product Design ideate。
- 交付限定为恰好三版可视方向，均保留上传流程与 13 类状态，并覆盖本地化一级流程、二级筛选、紧凑列表、行内渐进详情、文字+语义色状态、五列表头排序、勾选后批量栏、行尾三点菜单和唯一主恢复动作。
- 本轮只修改 `DESIGN.md`、`docs/ui/` 与仓库外原型/截图；不修改 `frontend/src`、后端、迁移或共享契约，不自行确定最终版，不提前解锁前端。危险动作只允许需确认的“取消未完成上传”，已完成 Asset 不删除。

## 2026-08-13 — UI-M2-03 Rev 8 补充状态、排序、批量选择与行级菜单

### 已确认的表格行为

- 用户确认借鉴参考截图的状态标签、表头排序、逐行/全选勾选和行尾三点菜单；这些能力必须与紧凑列表一起设计，不能重新铺成一排操作按钮。
- 状态同时使用文字和语义色；文件/标题、集数、状态、大小、更新时间支持可见的升降序，默认先突出失败、待处理和进行中项目，再按集数排列。
- 勾选后才出现批量操作栏；三点菜单只放低频行级操作。主要恢复动作继续直接可见，避免用户每次都进入菜单寻找“继续、重试”等当前必要动作。
- 删除语义拆开：未完成上传只能执行“取消未完成上传”，并明确已完成素材不删除；已完成 Asset、原始素材或整个项目的删除必须等待回收站契约，不能在上传列表用通用“删除”直接清除。

### 状态与边界

- `UI-M2-03` 从 Rev 8 递增为 Rev 9，仍为 `ready / Current actor=UI 设计对话`；`FRONT-M2-04B` 继续阻塞。
- 本轮只补充 UI 任务输入，没有修改生产实现、后端契约、上传状态或数据删除规则。

## 2026-08-13 — UI-M2-03 Rev 7 补充鬼手式分类的本地化适配

### 已确认的信息架构

- 用户提供鬼手项目页截图，只要求学习“一级分类标签、当前分类筛选、紧凑列表”的组织方法，不要求复刻品牌、配色、栏目名称或业务逻辑。
- 规划只读核对原本地工作台：中文识别与画面字是两类独立任务；项目术语是识别与审改的前置门禁；字幕审改和视频验收是前后两个不同工作台；学习库是后台不可变记录和维护能力，不属于普通员工主导航。
- 云端项目内一级流程固定按真实生产顺序表达为“素材、术语、中文识别、画面字、前置审改、字幕验收、交付”；二级筛选随当前模块变化。人名条属于素材角色/画面字，视频任务属于任务事实，公司级规则资产和学习库保留为未来受控入口。
- 顶部标签只突出待处理或失败数量，不机械展示各模块不同单位的总数；列表继续采用紧凑主列和按需展开详情，避免分类改进反而增加信息噪声。

### 状态与边界

- `UI-M2-03` 从 Rev 7 递增为 Rev 8，仍保持 `ready / Current actor=UI 设计对话`；本次只是 UI 返工输入补充，不改变后端、里程碑范围或前端阻塞状态。
- 参考截图仅作为当前设计输入，不进入生产素材或业务数据库；UI 三版预览必须经过用户选择，不能把参考站点直接当成已确认设计。

## 2026-08-13 — UI-M2-03 Rev 6 用户视觉退审并定向返工

### 用户结论与返工范围

- 用户确认当前上传队列列表观感偏杂乱，未通过 Rev 6 的最终视觉验收；既有上传流程、物理文件聚合、共享角色、暂停/继续、刷新重选、错误恢复和 13 类状态均继续保留。
- 返工方向确认为“紧凑主列表 + 行内渐进展开详情”：默认只显示文件/集数、角色、状态、进度/大小和一个主操作；路径、指纹、会话、分片、请求标识和完整错误详情按需展开；批次摘要压成一行，已完成项可折叠，次要操作收进更多菜单。
- UI 对话须先用 Product Design audit 形成当前稿的截图证据，再用 Impeccable distill 做信息减法，最后用 Product Design ideate 提供恰好三版可视方向给用户选择；不得由 UI 对话自行确定最终方案。

### 状态与边界

- `UI-M2-03` 递增为 Rev 7，退回 `ready / Current actor=UI 设计对话`；规划队列 002 已关闭，交接改由固定 UI 对话执行。
- 本轮没有修改 `DESIGN.md`、UI 原型或生产代码，没有删除功能，没有改变后端契约；`FRONT-M2-04B` 继续保持阻塞，直到用户选定并验收新的 UI 方向。

## 2026-08-13 — 规划独立验收 BACK-M2-04A Rev 5 通过

### 验证与结论

- 重新运行完整 `pnpm check`，退出码 0；仓库边界、lint、typecheck、本地 PostgreSQL 18.4 迁移、7 个测试文件 46 项测试以及共享契约、后端和前端构建全部通过。
- 单独复跑 `material-assets.test.ts`、`materials.test.ts`、`uploads.test.ts`，3 个后端测试文件 31 项全部通过。
- 代码级核对确认：同一物理文件必须一次覆盖清单内共享该指纹的全部角色；完成落账、Asset 创建与槽位绑定处于同一数据库事务；非生产且确为内存 Storage fake 时才注册本地二进制 PUT，生产环境不暴露该入口。
- `git diff --check` 对后端、共享契约和后端测试无输出；范围扫描没有发现 AWS SDK、R2 客户端、ASR/OCR、API Key 或 `.env` 接入，命中仅为正常的运行环境判断。

### 写回与边界

- `BACK-M2-04A` 递增为 Rev 6 并标记 `done`；规划队列 001 已关闭。
- `FRONT-M2-04B` 递增为 Rev 4 但继续保持 `blocked`，当前只等待 `UI-M2-03` 的用户视觉/交互验收；本轮没有提前唤醒前端。
- 未修改后端业务实现，没有接入 R2、回收站、ASR/OCR，没有创建云资源、提交、推送、部署或发布。

## 2026-08-13 — 规划自动交接改为单活动先进先出队列

### 已完成

- 在 `docs/WORKFLOW.md` 12.2 固化规划接力收件队列：按首次有效交接到达顺序分配序号，不按角色或预设开发顺序写死。
- 规定全局最多一个 `active` 项；后到自动消息只能入队，等待用户或依赖的项目保留原序号但让出执行位，同任务同 Rev 重复消息合并、新 Rev 重新排到队尾。
- 在 `CURRENT.md` 建立权威队列表：`BACK-M2-04A` Rev 5 为当前活动复验，`UI-M2-03` Rev 6 保留第二到达序号并等待用户视觉/交互验收。
- 明确普通自动消息不得抢占；只有用户明确要求停止、替换或调序时才能改变当前优先级并记录原因。

### 边界

- 本轮只修改协作协议、当前队列和日志，没有改变 UI 或后端任务的业务验收状态，没有解锁 `FRONT-M2-04B`。
- 后端独立复验此前因系统审批连接中断尚未形成通过或退回结论，仍需作为当前活动项继续完成。

## 2026-08-13 — UI-M2-03 Rev 6 完成并转交用户验收

### 已完成

- 在 `DESIGN.md` 固化正式上传队列：按物理文件聚合，同集中文识别视频与画面字视频共享同一 MP4 时只上传一次；批次和单文件分别提供暂停、继续、重新选择、取消与错误恢复。
- 明确本机暂停不改变服务端会话；刷新后先恢复后端清单与分片事实，再重新选择原文件并只续传缺失分片；指纹不符、会话过期、后端校验和项目回收均有独立动作。
- 完成仓库外交互预览与 `docs/ui/M2-upload-queue-acceptance.md`；侧栏支持 204px 与 72px 收展，高风险取消使用原生确认层，项目回收提供明确恢复出口。

### 验证

- 无头 Chrome 覆盖 13/13 状态；正常队列状态各有 5 条物理文件行，可见页面标题始终为 1，整页横向溢出为 0，控制台错误为 0。
- 暂停/继续实际往返 `uploading` / `paused`，刷新恢复重新选择后返回 `uploading`；侧栏实测 204↔72，1024px 默认保持 204px。
- 取消确认实际打开，安全返回按钮默认获得焦点；详情包含会话有效期和最近错误，项目回收恢复按钮可见。
- 1440×900 正常上传与 1024×768 刷新恢复截图完成；Impeccable 降级机械检测的唯一进度条动画警告已修正。独立完成复核首轮 `revise` 的 5 项实质缺口全部 `resolved`，最终 disposition 为 `ship`。
- `git diff --check` 对本轮 UI 权威文件无输出；未修改 `frontend/src`、后端、迁移或共享代码契约。

### 边界与交接

- `UI-M2-03` 已转为 Rev 6 `review`，当前只等待用户视觉与交互验收；`FRONT-M2-04B` 仍不得由 UI 对话提前解锁。
- 本轮未读取真实媒体字节，未接 R2、回收站 Worker、识别或付费服务，没有提交、推送、部署或创建云资源。

## 2026-08-13 — BACK-M2-04A Rev 5 完成并转交规划复验

### 已完成

- 后端开发对话按 M2.1 契约建立 `material_asset_bindings` 与 `upload_session_material_targets`，由 PostgreSQL 持有清单版本、集数、素材角色、Asset 和源指纹的权威关联；清单读取和上传会话读取返回共享代码契约中的绑定信息。
- 素材清单只放宽同一集 `asr_video` / `screen_video` 对同一路径、同元数据 MP4 的共享，其他跨集、公司 SRT 或跨类型重复仍拒绝；一次上传必须覆盖共享文件的全部角色，并最终绑定同一个 Asset。
- 新清单按项目、指纹、大小和媒体类型复用已校验 Asset；上传过程中出现同一身份的新清单时，旧会话完成也会把 Asset 安全投影到最新清单，不跨项目复用。
- 项目状态由后端按最新清单和上传/绑定事实统一归约，优先级为 `blocked → verifying → uploading → ready → draft`；未选择 `screen_video` 不阻塞 `ready`，失败、过期或清单变更造成的可操作缺口进入 `blocked`。
- 新增项目详情、项目上传会话列表，以及仅在非生产环境且使用内存 Storage fake 时注册的二进制 HTTP PUT 分片入口；生产环境不暴露该入口，也未实现真实对象存储适配器。

### 验证

- 资产绑定、素材清单和上传协议定向回归 3 个测试文件 31 项全部通过；覆盖同文件双角色唯一 Asset、清单复用与变更阻断、错误指纹/不完整角色拒绝、无画面字仍就绪、上传期间新清单绑定，以及既有上传生命周期回归。
- 完整 `pnpm check` 退出码 0：仓库边界、lint、typecheck、本地 PostgreSQL 18.4 迁移、7 个测试文件 46 项测试、共享契约与前后端构建全部通过。
- 源码范围扫描未发现 AWS SDK、R2 客户端、ASR/OCR 实现、API Key 或 `.env`；测试仅使用匿名 4–8 字节代码内样例。

### 边界与交接

- 本任务没有修改 `frontend/`、UI 原型或产品语义，没有接入 R2、回收站、ASR/OCR，没有购买或创建云资源，也没有提交、添加远程、推送、部署或发布。
- `BACK-M2-04A` 已转为 `review`，当前轮到规划对话按 M2.1 契约独立复验；本后端对话停止，不自动领取前端或后续任务。

## 2026-08-13 — UI-M2-03 Rev 5 领取

- UI 设计对话完整重读项目级 `AGENTS.md`、协作协议 v3、`CURRENT.md` v3-041、`DESIGN.md`、M2 里程碑和 M2.1 契约，领取 `UI-M2-03` Rev 4。
- 同步版本更新为 v3-042，任务更新为 Rev 5 `in_progress`；与 `BACK-M2-04A` 并行期间只拥有 `DESIGN.md`、`docs/ui/` 和仓库外原型/截图。
- 本轮只设计整剧/单文件上传队列、同文件双视频角色标识、浏览器暂停/继续、刷新后重新选择、错误恢复和完整状态预览；不修改 `frontend/src`、后端、迁移、共享代码契约，不接真实 R2，不提交、推送或部署。

## 2026-08-13 — BACK-M2-04A Rev 4 领取

- 后端开发对话完整重读项目级 `AGENTS.md`、协作协议 v3、`CURRENT.md` v3-040、M2 里程碑和 M2.1 契约，领取 `BACK-M2-04A` Rev 3。
- 同步版本更新为 v3-041，任务更新为 Rev 4 `in_progress`；与 `UI-M2-03` 并行期间只拥有 `backend/`、迁移、`packages/contracts/` 和 `tests/backend/`。
- 本轮只交付版本化 Asset 绑定、同集双视频角色共享一次上传、后端项目状态归约、非生产 fake HTTP 分片入口及后端回归；不修改前端/UI，不接真实 R2、回收站或识别功能，不提交、推送或部署。

## 2026-08-13 — PLAN-M2-04 确认与自动接力启用

### 用户确认与规划固化

- 用户明确回复“可以”，确认紧邻上下文中的 `PLAN-M2-04` 路径：UI 设计与后端资产绑定并行，两项分别验收后再由前端集成。
- M2 契约升级为 M2.1 规划确认基线：同集 `asr_video` 与 `screen_video` 可以共享一次上传和同一个已校验 Asset；其他跨集、公司 SRT 或跨类型复用仍禁止。新增清单角色—Asset 独立绑定语义，并确定后端项目状态归约优先级。
- `PLAN-M2-04` 更新为 Rev 3 `done`；`UI-M2-03` 更新为 Rev 4 `ready`，`BACK-M2-04A` 更新为 Rev 3 `ready`；`FRONT-M2-04B` 更新为 Rev 3 并继续等待两个上游验收。

### 自动通知机制

- `CURRENT.md` 登记规划、UI、后端和前端四个固定 Codex 任务 ID；协议新增“交付后通知 Reviewer、验收后通知下一角色、冲突通知规划”的自动接力规则。
- 自动消息只负责唤醒，接收任务必须重读权威文件；消息发送失败不得要求用户手动传话。只有 `Current actor=用户` 的产品、视觉、成本或数据决策仍需用户本人确认。

### 边界

- 同步版本更新为 `v3-040`。本轮只固化已确认规划、解锁任务和协调规则；没有修改业务实现、数据库迁移或生产 UI，没有提交、推送、部署、购买或创建云资源。

## 2026-08-13 — COORD-v3 四角色协议与冲突审查机制

### 已完成的协作升级

- 用户授权新增独立“前端开发对话”，现有开发对话固定为“后端开发对话”；代码仍保留在同一个 `qimao-terms-cloud` 仓库和同一工作目录，不拆成两个代码项目。
- `docs/WORKFLOW.md` 升级为 v3，明确规划、UI 设计、后端开发和前端开发的目录所有权、共享契约唯一写入者、任务颗粒度、并行条件、七项交接、前端依赖门禁和双阶段验收。
- 项目级 `AGENTS.md`、M2 里程碑、README 和 `CURRENT.md` 已同步四角色名称；新开发任务使用 `BACK-*` / `FRONT-*`，历史 `DEV-*` 保留为历史事实。
- 主线拆为 `UI-M2-03`、`BACK-M2-04A` 和 `FRONT-M2-04B`：UI 与后端只在用户确认后并行，前端必须等待两项依赖通过，不能复制接口或另建业务状态。
- 已在同一保存项目和本地工作目录创建并置顶前端开发任务 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf`。它首次读取 `v3-036`、随后主动接收规划同步并重读 `v3-037`，均正确识别 `FRONT-M2-04B` 为阻塞状态并停止；两轮都未修改文件或领取任务。
- 规划已直接向现有 UI 与后端任务发送 `v3-038` 同步；两者均返回固定角色、所有权、禁写边界、冲突升级方式和当前任务状态，且没有修改文件或提前领取任务。用户不再承担这次角色协议的人工转述。

### 专业异议与主管审查

- 用户补充确认：每个角色都可以评价方案和提出专业意见。发现 UI 不合理、前后端对接、状态、成本、性能或安全冲突时，角色将受影响任务暂停并把可复现证据交给规划对话。
- 规划负责区分实现缺陷、文档/代码契约不一致、UI/技术冲突和产品取舍；已确认范围内直接裁决，涉及体验、范围、成本或数据策略时形成选项并与用户共同决定，再一次性更新所有受影响任务。
- 异议不授权各角色自行改方案；裁决必须记录采纳/拒绝、依据、影响、下一动作和验收。用户不承担跨对话传话。

### 边界

- 本轮只更新协作、里程碑和任务状态文档，并创建独立前端开发任务；未修改业务代码、数据库或 M2 代码契约，没有提交、推送、部署或创建云资源。
- 最终看板同步到 `v3-039`；只有 `PLAN-M2-04` 的 `Current actor=用户`，三个依赖任务在等待期间使用 `Current actor=—`，避免把同一个用户决策伪装成三项待办。

## 2026-08-13 — PLAN-M2-04 主线恢复与方案确认门建立

### 已核对事实

- M2 已完成项目中心、整剧素材元数据清单和内存 Storage fake 分片协议；正式上传队列 UI、浏览器真实分片、Asset 与清单角色绑定及回收站仍未完成。
- 当前内存 fake 只通过测试代码的 `uploadAuthorizedPart` 接收字节，没有浏览器可调用的 HTTP 上传目标，因此不能直接解锁正式上传 UI 并声称端到端可验收。
- 当前 `Asset` 只绑定项目，尚未绑定清单版本、集数和素材角色；项目 `ready` 也不能依据最新清单的必需绑定可靠计算。
- 现有清单对 `manifest_id + relative_path` 设置唯一约束并禁止重复占用，与用户已确认“同一 MP4 可同时作为同集 ASR 视频和画面字视频”冲突，下一切片必须定向修正。

### 状态与边界

- `CURRENT.md` 同步至 `v2-035`，新增 `PLAN-M2-04` Rev 1 `review`、`UI-M2-03` Rev 1 `blocked` 和 `DEV-M2-04A` Rev 1 `blocked`，当前轮到用户确认具体推进路径。
- 规划推荐 UI 上传交互设计与后端绑定/本地浏览器上传桥并行，二者验收后再由独立开发任务集成正式页面；用户确认前不解锁。
- 本轮只读核对并更新任务状态，没有修改 M2 契约、业务代码或数据库；没有提交、推送、部署、购买或创建云资源。

## 2026-08-13 — PLAN-LONG-03 批量基准切换与后台学习库确认

### 已确认的产品结论

- 公司稿/ASR 基准支持系统默认、整剧、选中集批量和单集覆盖；批量切换只写入对应单集覆盖值，并且只影响未确认项，不覆盖已有采纳稿。
- 每次人工采纳、修改、合并、断句和时间轴修正都保存不可变学习事件；项目回收或删除不能删除已经归档的学习证据。
- 项目内已确认修正可立即生成后续建议，跨项目证据只聚合为隐藏候选；候选经过人工批准、真实回归和版本化评估后才能发布为公司级热词、纠错规则或训练数据版本。
- 普通员工不显示跨项目学习库或候选规则；当前无账号阶段不提供普通业务读取接口。第一阶段不复制音频或视频，真正的 ASR 微调或蒸馏需要另行确认数据授权、保留期限、评估和预算。

### 文档与范围

- 更新 `PRODUCT.md`、`DESIGN.md` 和 `docs/architecture.md`，统一基准解析、批量命令、学习事件所有权、隐藏范围、发布门禁和失败恢复。
- `CURRENT.md` 同步至 `v2-034`，新增已完成的 `PLAN-LONG-03`；没有创建或解锁开发任务。
- 本轮未修改本地应用、云端业务代码、数据库或 M2 契约；没有采集训练数据、提交、推送、部署、付费调用或创建云资源。

## 2026-08-13 — PLAN-LONG-02 双源字幕采纳与格式规则确认

### 已确认的产品结论

- 公司 SRT 与 ASR 都作为只读来源；每集允许切换对照主基准，逐条通过采用公司稿、采用 ASR、合并或人工修改形成唯一采纳稿，并记录采纳来源。
- ASR 质量推荐综合音频覆盖、术语命中、低置信片段、时间轴完整度和异常长句比例，不使用单一置信度，也不自动覆盖人工结果。
- 最终台词轨去除常规中英文标点，停顿用空格，多人对白保留行首半角减号；对照时忽略纯标点、空格和相邻分轴差异。画面字轨不应用台词去标点规则。
- 单轴目标不超过 18 个有效字，19–28 字提示优化，超过 28 字阻断待验收发布；自动断句优先使用停顿、词级时间戳和语义边界，并保护术语、姓名和数字，无法可靠切分时转人工确认。

### 文档与范围

- 更新 `PRODUCT.md`、`DESIGN.md` 和 `docs/architecture.md`，同步双源数据所有权、界面动作、质量推荐和确定性格式门禁。
- `CURRENT.md` 同步至 `v2-033`，新增已完成的 `PLAN-LONG-02`；没有创建或解锁开发任务。
- 本轮未修改两个本地应用、云端业务代码、数据库或 M2 契约；没有提交、推送、部署、付费调用或创建云资源。

## 2026-08-13 — PLAN-LONG-01 双工作台长期边界校准

### 已确认的产品结论

- 只读核对原“海外短剧审改工作台”“字幕验收工作台”及其交接规格后，将长期主链路明确为：前置审改发布待验收修订，视频字幕验收读取快照并形成冻结验收版本，正式交付只读取有效冻结版本。
- 用户确认：单个局部问题可在视频字幕验收端直接修正；整集或批量问题退回前置审改并产生新修订。
- 用户确认：视频字幕验收首期保留文字、开始/结束时间、拖动、增加和删除字幕；不在验收端重新运行 ASR、OCR 或制作术语。
- 复杂内容风险、人物/人脸画面风险和严重等级阻断退出近期主流程；近期只保留视频证据与字幕时间轴等技术门禁，后续根据真实使用再设计。

### 文档与范围

- 更新 `PRODUCT.md`、`DESIGN.md` 和 `docs/architecture.md`，统一双工作台职责、返工边界、冻结失效规则、交付产品库和视频清晰度/保留策略。
- `CURRENT.md` 同步至 `v2-032`，新增已完成的 `PLAN-LONG-01`，没有创建或解锁开发任务。
- 本轮未修改业务代码、数据库或 M2 契约；没有提交、推送、部署、付费调用或创建云资源。`DEV-M2-04` 仍须先与用户讨论清单版本—集数—素材角色—资产绑定和项目状态计算。

## 2026-08-13 — DEV-M2-03 Rev 9–10 规划最终复验通过

### 独立验证

- 重新运行完整 `pnpm check`，退出码0：仓库边界、lint/typecheck、本地 PostgreSQL迁移、6个测试文件41项测试和前后端构建全部通过。
- 上传专项17项逐项通过；新增“会话完成后仍稳定重放此前成功的分片确认”与此前16项状态机回归全部保持通过。
- 规划独立匿名8字节终验真实执行两分片上传流程：首次确认200、整份完成 `200 / completed`、完成后原键原请求迟到重放 `200 / completed`，返回最终素材且数据库素材计数为1。
- 匿名项目按精确 UUID 清理；范围扫描未发现 AWS SDK、R2、浏览器文件读取或下一阶段实现；`git diff --check` 无输出。
- 首次专项因本地 PostgreSQL已停止而在连接阶段统一失败；随后使用项目统一 `pnpm check` 完成数据库准备，并取得上述专项17/17和完整41/41的有效结果。

### 正式结论与边界

- 最后一处延迟幂等重放缺口达到复验标准；同步版本由 `v2-030` 更新为 `v2-031`，`DEV-M2-03` 从 Rev 9 `review` 更新为 Rev 10 `done`，`Current actor` 清空。
- 完成范围为本地内存 Storage fake 与分片上传协议地基，不代表正式上传 UI、真实文件直传、R2、网络吞吐、回收站或云端部署已完成。
- 未创建或解锁下一任务。下一步先由规划对话与用户协商清单版本—集数—素材角色—资产绑定和项目状态计算；未提交、推送、部署或创建云资源。


## 2026-08-13 — DEV-M2-03 Rev 8–9 延迟幂等重放修正完成

### 实际修改

- 路由在项目生命周期、会话状态、过期和存储信息门禁前，先按幂等键、请求摘要和上传会话识别已持久化的 `confirm_part` 命令；同键同请求直接返回当前权威会话。
- 仓储事务内同样把既有命令识别移到当前状态门禁之前，覆盖路由预检完成后发生并发状态变化的窗口。
- 同键异请求仍返回 `IDEMPOTENCY_KEY_REUSED`；没有既有命令的全新确认仍执行原有项目、过期、状态、分片和存储门禁。
- 新增“分片确认成功→其余分片确认→会话完成→原确认迟到重放”回归，断言返回 `200 / completed` 与唯一素材。

### 真实验证

- `pnpm lint` 退出码 0。
- 上传专项：1 个测试文件、17 项测试全部通过。
- 完整 `pnpm check` 退出码 0：仓库边界、lint/typecheck、本地 PostgreSQL 18.4 迁移、6 个测试文件 41 项测试和前后端构建全部通过。
- `git diff --check` 无输出；本地 PostgreSQL 已停止。

### 未完成与交接

- 本轮没有改动其他已通过状态机，没有开始正式上传 UI、清单资产绑定、真实 R2、云资源、回收站、识别或后续切片。
- 未创建提交、远程、推送或部署。`DEV-M2-03` 转为 Rev 9 `review`，轮到规划对话只复验延迟重放、上传专项和完整检查。

## 2026-08-13 — DEV-M2-03 Rev 8 延迟幂等重放修正领取

- 开发对话读取 `CURRENT.md` v2-028，领取规划第二轮复验定向退回的 `DEV-M2-03` Rev 7。
- 同步版本更新为 v2-029，任务更新为 Rev 8 `in_progress`；本轮只让已存在的分片确认命令在当前项目/会话状态与存储核对前完成同键重放识别。
- 同键异请求和全新确认的全部既有门禁保持不变；不改其他状态机，不开始下一切片，不提交、推送、部署或创建外部资源。

## 2026-08-13 — DEV-M2-03 Rev 6–7 第二轮规划复验定向退回

### 已通过

- 规划对话重新运行完整 `pnpm check`；退出码0，迁移、6个测试文件40项测试、类型/规范检查和前后端构建全部通过。
- 临时独立复验使用匿名4–8字节数据覆盖5条路径，其中对象合并后落账中断恢复、迟到确认不复活取消终态、项目回收后拒绝授权/确认/完成但允许取消、完成/取消竞态4项通过。
- 这证明上一轮四类严重退审问题及补充竞态已经修复，可以保留现有状态机和回归测试。

### 唯一未通过项

- 分片1以固定幂等键确认成功，分片2随后确认并使整份上传完成；再次发送分片1的原键原请求，实际返回 `409`，未满足“同键同请求稳定重放”。
- 根因是确认路由与仓储均在查询既有 `confirm_part` 命令前检查当前项目、过期和会话状态；会话成为 `completed` 后，合法迟到重试先被 `UPLOAD_STATE_INVALID` 拦截。

### 写回与边界

- 临时规划复验文件已删除；所有匿名项目按精确 UUID 清理，残留计数为0；`git diff --check` 无输出。
- 同步版本由 `v2-027` 更新为 `v2-028`，原任务从 Rev 6 `review` 更新为 Rev 7 `ready` 并退回开发对话。
- 返工只调整分片确认的幂等重放顺序：已存在命令的同键同请求先稳定重放，同键异请求仍冲突；全新确认请求继续执行全部项目、会话、分片和存储门禁。增加一项延迟重放回归并重新运行专项与完整检查。
- 不修改其他已通过状态机，不开始正式上传 UI、素材清单资产绑定、真实 R2、云资源或后续切片。


## 2026-08-13 — DEV-M2-03 Rev 5–6 状态机返工完成

### 实际修改

- 完成命令在调用存储前写入 `upload_commands` 占位；同一完成意图在对象已合并、数据库尚未落账时先核对对象，再补建唯一素材并转为 `completed`。
- 分片确认在同一事务锁内重读项目与会话状态，并真正绑定 `Idempotency-Key` 与规范请求摘要；同键同请求重放不增加版本，同键异请求返回 `IDEMPOTENCY_KEY_REUSED`。
- 取消命令在锁内先把会话写为 `aborted` 并保存命令，再执行可重复的存储清理；完成/取消竞态由先取得锁的命令唯一决定，迟到确认不能复活终态。
- 项目非 `active` 时拒绝分片授权、确认和完成；取消清理仍可执行。短时分片授权不改变 PostgreSQL 业务状态，因此移除无实际语义的强制幂等请求头。
- 扩展内存 Storage fake，仅为匿名测试增加“对象已合并后中断”、分片核对暂停和完成暂停故障控制；没有引入真实对象存储或外部网络。
- 更新上传契约、M2 里程碑和后端说明，固化恢复顺序、并发赢家、幂等边界和项目生命周期门禁。

### 真实验证

- `pnpm lint` 退出码 0。
- 上传专项 `pnpm exec vitest run tests/backend/uploads.test.ts`：1 个测试文件、16 项测试全部通过。
- 新增 5 项高价值回归：确认同键同/异请求、对象合并后落账中断恢复、已通过存储核对的迟到确认、完成/取消确定性竞态、项目回收后拒绝授权/确认/完成但允许取消。
- 完整 `pnpm check` 退出码 0：仓库边界、lint、typecheck、本地 PostgreSQL 18.4 迁移、6 个测试文件 40 项测试、前后端生产构建全部通过。
- `git diff --check` 无输出；源码范围扫描未发现 AWS SDK、R2 适配或新增外部网络/识别实现。扫描中的 `asr_video`、`ocr` 和浏览器 `fetch` 命中均为已存在的素材角色命名或站内 API。
- 本轮只使用匿名 4–8 字节合成数据；本地 PostgreSQL 已停止，未创建云资源、远程、提交、推送或部署，也未修改只读参考应用。

### 未完成与交接

- 正式上传 UI、清单版本—集数—素材角色—资产绑定方案、AWS SDK/R2、网络吞吐、回收站/Worker、ASR/OCR/术语仍未实现。
- `DEV-M2-03` 转为 Rev 6 `review`，`Current actor=规划对话`；规划须独立复验本轮四类退审探测与完整检查，开发不会自动开始 `DEV-M2-04`。

## 2026-08-12 — DEV-M2-03 Rev 5 状态机返工领取

- 开发对话读取 `CURRENT.md` v2-025 和规划对 Rev 3 的故障注入/并发复验结果，领取退回的 `DEV-M2-03` Rev 4。
- 同步版本更新为 v2-026，任务更新为 Rev 5 `in_progress`；owner 与 reviewer 保持不变。
- 本轮只修对象合并后的数据库落账恢复、迟到分片确认与完成/取消竞态、确认幂等键语义、项目非 active 门禁，并补故障注入与并发回归。
- 保留首轮迁移、Storage fake、契约和常规测试；不做正式上传 UI、清单资产绑定方案、AWS SDK/R2、云资源、回收站、ASR/OCR/术语、提交、推送或部署。

## 2026-08-12 — DEV-M2-03 Rev 3–4 规划独立评审退回

### 已通过基础

- 规划对话按 `CURRENT.md` v2-024 领取 `DEV-M2-03` Rev 3 `review`，重新运行完整 `pnpm check`；退出码 0，迁移、6 个测试文件 35 项测试、类型检查、规范检查和前后端构建通过。
- 单一 `UploadStorage`、内存 fake、PostgreSQL 上传表、SRT/MP4 边界、缺失分片、常规重复确认/完成/取消、过期与对象校验等首轮实现可以保留。
- `git diff --check` 无输出；源码范围未发现 AWS SDK、R2、浏览器文件读取、回收 Worker、ASR/OCR 或术语实现，没有越过云资源和后续切片边界。

### 未通过证据

- 完成中断探测：Storage fake 已合并对象后，在最终数据库落账前注入一次异常。首次完成返回 `500 INTERNAL_ERROR`；同一请求重试返回 `409 UPLOAD_VERSION_CONFLICT`；最终会话为 `completing`、`asset=null`，无法通过现有协议恢复。
- 终态并发探测：分片确认先通过存储检查并暂停，取消请求随后返回 `200 / aborted`；恢复迟到确认后其仍返回 `200 / uploading`，最终数据库状态被改回 `uploading`、版本 3。
- 幂等探测：同一 `Idempotency-Key` 用于两个不同分片确认，两次均返回 200 且两个分片都被写入，强制请求头没有实际同键异请求保护。
- 生命周期探测：项目被精确置为 `recycled` 后，原上传会话仍能取得新分片授权并返回 200。
- 探测只使用匿名 4–8 字节数据和唯一名称项目，均按精确 UUID 清理；残留名称查询计数为 0。

### 正式退回与复验标准

- 同步版本由 `v2-024` 更新为 `v2-025`；`DEV-M2-03` 保持原 owner，从 Rev 3 `review` 更新为 Rev 4 `ready`，`Current actor` 退回开发对话。
- 返工只处理同一状态机根因：外部存储成功但数据库结果未知时可核对恢复且只创建一个素材；事务锁内重读会话与项目状态，迟到确认不能复活终态；确认及保留强制幂等头的授权落实同键语义；项目非活动后禁止授权、确认和完成但允许安全取消清理。
- 必须增加与上述四个探测等价的自动化回归，并通过专项测试和完整 `pnpm check`。不要求重写已通过基础，不实现正式上传 UI、真实 R2、云资源、素材清单绑定方案或下一切片。
- 上传对象与已确认清单版本、集数、素材角色的权威关联属于下一切片前的产品协商项，本轮开发不得自行扩展。


## 2026-08-12 — DEV-M2-03 Rev 2–3 内存 Storage fake 与分片协议地基

### 输入与范围

- 按用户确认的方案 A 和 `CURRENT.md` v2-022 执行，仅建立真实云存储接入前的上传协议地基。
- 输入为 `ADR-0001`、`ADR-0002`、M2 权威契约及里程碑的 `DEV-M2-03` 已确认范围；没有引入正式上传队列 UI、真实浏览器直传或云资源。

### 实际实现

- 新增上传共享契约：会话、分片、最终素材、创建/授权/确认/完成/取消请求、授权响应和带缺失分片详情的稳定错误。
- 新增 PostgreSQL 迁移，建立 `assets`、`upload_sessions`、`upload_parts`、`upload_commands` 及上传状态/媒体类型枚举；数据库保存业务状态、版本、错误和素材绑定。
- 新增单一 `UploadStorage` 接口与 `InMemoryStorageFake`。fake 模拟分片授权、匿名小字节写入、ETag/SHA-256、按序合并、对象查询、取消和可控故障；不接触网络或云凭据。
- 集中配置默认 64 MiB 分片、单文件并行 3、单浏览器并行 12、会话/授权时限和文件大小上限；测试通过注入配置使用 4 字节匿名分片，不把测试大小写成业务常量。
- 实现创建会话、读取会话、授权缺失分片、确认分片、幂等完成和幂等取消六个 API。创建时校验项目 active、SRT/MP4、大小和幂等键；完成时用版本条件、有序确认分片和 SHA-256 校验，只创建一个最终素材。
- 生产环境没有真实存储适配器时明确拒绝启动，避免内存 fake 被误当作生产存储。

### 验证与修正

- 首轮 10 项专项测试中，取消命令重放因已取消后的版本变化被错误判为冲突；修正为先命中幂等命令，并进一步把同键异取消请求的幂等/版本判断放到存储副作用之前。
- 最终专项 11 项全部通过，覆盖创建幂等与同键异请求、非活动项目、类型/大小限制、缺失分片阻断、只授权缺失分片、重复确认/完成/取消、授权过期重签、会话过期、指纹不符、临时存储故障恢复、对象不存在、大小与校验失败。
- 最终 `pnpm check` 退出码 0：仓库边界、TypeScript lint/typecheck、本地 PostgreSQL 18.4 迁移、6 个测试文件 35 项测试和共享契约/后端/前端构建全部通过。
- `git diff --check` 通过；范围扫描未发现 AWS SDK、R2、外部网络请求、浏览器文件内容读取、回收站、ASR/OCR 或术语实现。

### 边界与交接

- 未使用真实视频、字幕、表格或客户数据；Storage fake 仅处理测试代码生成的匿名小字节。
- 未创建 R2、Neon、Railway 或其他云资源，未做 1 GB/10 GB、网络吞吐或 5–6 真实并发批次测试。
- 未修改只读参考应用；未提交、添加远程、推送或部署。完整验证后停止 PostgreSQL 和残留后端进程，3000/3001/55432 均无监听。
- `CURRENT.md` 更新为 v2-024，`DEV-M2-03` Rev 3 `review`，交规划对话独立复验；不得自动开始 `DEV-M2-04`。

## 2026-08-12 — DEV-M2-03 Rev 2 协议地基领取

- 开发对话读取 `CURRENT.md` v2-022，领取用户已选择方案 A 后解锁的 `DEV-M2-03` Rev 1。
- 同步版本更新为 v2-023，任务更新为 Rev 2 `in_progress`；owner 和 reviewer 保持不变。
- 本轮只实现上传会话/分片/幂等与素材绑定迁移、内存 Storage fake、创建/读取/授权/确认/完成/取消 API、稳定错误和自动化测试。
- 不实现正式上传队列 UI、真实浏览器文件直传、AWS SDK/R2、云资源、网络吞吐、回收站、ASR/OCR/术语，不提交、推送或部署。

## 2026-08-12 — PLAN-M2-03 第三切片方案确认与开发交接

### 用户取舍

- 规划对话先比较三条路径：A“先完成上传协议地基”、B“协议与正式上传页面合并”、C“直接接入真实 R2 实测”。
- 用户明确选择方案 A。该选择只授权本地开发内存 Storage fake 与完整分片协议，不授权创建云资源、真实文件上传、网络测试或正式上传队列 UI。

### 规划写回

- 在 `docs/milestones/M2-upload-lifecycle.md` 固化 `DEV-M2-03` 的数据所有权、创建/授权/确认/完成/取消、幂等、过期、校验、失败恢复、集中配置和匿名测试验收边界。
- 新建 `PLAN-M2-03` Rev 1 并标记为 `done`；新建 `DEV-M2-03` Rev 1、状态 `ready`、`Current actor=开发对话`、`Reviewer=规划对话`。
- 同步版本从 `v2-021` 递增为 `v2-022`。开发对话可以直接读取共享文件领取任务，用户不需要转述具体实现要求。

### 明确未完成

- 未修改业务源码、数据库或正式 UI，未运行功能测试。
- 未引入 AWS SDK、未创建 R2/Neon/Railway 或任何外部资源，未产生云费用。
- 未提交、推送、部署，也未解锁 `DEV-M2-04` 或其他后续切片。

## 2026-08-12 — DEV-M2-02 Rev 9–10 规划独立复验通过

### 复验结果

- 规划对话按 `CURRENT.md` v2-020 读取 `DEV-M2-02` Rev 9 `review`，逐项检查服务端路径校验、确定性幂等摘要、前端留空回显、确认前文件信息、人工集数门禁、回归测试和 M2 权威契约。
- 本轮重新运行完整 `pnpm check`，退出码 0；仓库边界、类型与规范、本地 PostgreSQL 迁移、5 个测试文件 24 项测试及前后端构建全部通过。
- 素材专项 2 个测试文件 14 项逐项通过；非法路径测试同时证明数据库未写入清单，语义等价但属性顺序不同的同键请求稳定重放首次结果。
- 源码范围扫描未发现文件内容读取、AWS SDK、对象存储、ASR/OCR 作业、回收 Worker 或下一切片实现；`git diff --check` 通过。

### 正式结论与边界

- 六类退审缺口全部达到复验标准，`DEV-M2-02` 验收通过；同步版本由 `v2-020` 更新为 `v2-021`，任务由 Rev 9 `review` 更新为 Rev 10 `done`，`Current actor` 清空。
- 当前完成范围仅为项目中心和整剧素材元数据配对确认；文件字节上传、Storage fake、R2、分片协议、术语提取、ASR/OCR、回收站和云端部署均未实现或授权。
- 本轮没有提交、推送、部署或创建外部资源，也没有新增或解锁下一任务；下一切片必须先与用户讨论并明确确认。

## 2026-08-12 — DEV-M2-02 Rev 8–9 六类验收缺口定向修正

### 完成

- 已确认详情改为按集固定显示公司 SRT、中文识别视频、画面字视频三角色；可选画面字没有绑定时明确显示“明确留空”和空路径占位。
- 扫描确认前的配对选项和待分配文件同时显示文件名、完整相对路径和格式化大小；同名候选可按路径区分，未知类型或非法集数显示问题原因。
- 人工目标集数在浏览器端只接受 1–100 的整数；小数、0、负数和 101 等越界值保持禁用，分配函数再次校验而不只依赖输入控件属性。
- 服务端不再剥离绝对路径前缀；严格拒绝绝对、空段、`.`、`..`、非当前根目录、文件名带路径分隔符和路径末段/`fileName` 不一致，统一返回 `MATERIAL_MANIFEST_INVALID`。
- 素材确认幂等摘要改为递归排序对象键后的确定性 JSON，语义等价但属性顺序不同的请求可稳定重放，同键异请求仍冲突。
- `docs/contracts/M2-upload-lifecycle.md` 补齐素材清单、绑定和命令实体，以及读取/确认 API、版本权威、路径约束和稳定错误边界。

### 验证

- 首次素材专项运行中 3 条测试因旧样例通过改变根目录制造冲突、且前端查询未区分两个同名按钮而失败；把样例修正为同根目录内合法差异并精确定位目标按钮后，专项 2 个测试文件 14 项全部通过。
- 最终 `pnpm check` 退出码 0：仓库边界、TypeScript lint/typecheck、本地 PostgreSQL 18.4 迁移、5 个测试文件 24 项测试和前后端生产构建全部通过。
- 后端新增回归逐项覆盖绝对、越界、错根、路径末段/文件名不一致，以及同键语义等价 JSON 的属性顺序变化；非法路径均未写入清单。
- 真实浏览器在 1440×900 电脑屏幕使用 4 个匿名合成文件完成同名候选区分、大小显示、非法 1.5 集门禁、确认 v1 和刷新恢复；三角色详情明确回显画面字留空，控制台错误与警告为 0。
- `impeccable` 机械检测返回空结果；截图复核未发现信息层级、表格宽度或溢出回归。

### 边界与交接

- 本轮没有读取或上传文件字节，没有引入 AWS SDK/Storage fake、分片上传、术语提取、ASR/OCR、回收站或云资源。
- 匿名浏览器项目按精确 UUID 删除，临时测试文件不可恢复地删除，本轮 3000/3001/55432 服务均已停止。
- 没有新增实现提交、远程、推送或部署；`DEV-M2-02` 更新为 Rev 9 `review`，交规划对话按 6 条标准独立复验后停止。

## 2026-08-12 — DEV-M2-02 Rev 8 定向修正领取

- 开发对话读取 `CURRENT.md` v2-018 和规划对 Rev 6 的独立复验结果，领取退回的 `DEV-M2-02` Rev 7。
- 同步版本更新为 v2-019，任务更新为 Rev 8 `in_progress`；owner 和 reviewer 保持不变。
- 本轮只修已确认留空回显、确认前文件信息、相对路径完整性、人工集数边界、幂等规范化和权威契约 6 类缺口，并补针对性自动化测试。
- 不改变视觉方向与电脑屏幕支持范围，不开始文件字节、对象存储、分片上传、术语提取、ASR/OCR、回收站、提交、推送或资源创建。

## 2026-08-12 — DEV-M2-02 Rev 6–7 规划独立评审退回

### 通过的基础验证

- 规划对话按同步协议读取 `CURRENT.md` v2-017，确认 `DEV-M2-02` Rev 6 为 `review` 且 `Current actor=规划对话`，未依赖开发日志直接判定。
- 本轮重新运行完整 `pnpm check`，退出码 0；仓库边界、类型与规范、本地 PostgreSQL 迁移、5 个测试文件 18 项测试和前后端构建通过。
- 另行运行素材专项测试，2 个测试文件 8 项测试逐项通过，覆盖现有确认、刷新、幂等、版本冲突、必需角色、多候选和对话框焦点路径。

### 未通过的验收证据

- 已确认详情只遍历实际绑定，刷新后没有按集回显可选画面字“明确留空”；与里程碑“缺失状态必须可见”和 UI 验收中的草稿原样回显不一致。
- 确认前界面没有展示文件大小；同名候选的下拉选项只显示文件名，不能依靠相对路径区分。
- 匿名本地 API 边界探测中，集数 101 被统一拒绝；但 `../EP01.srt`/`../EP01.mp4` 越界相对路径以及相对路径末段与 `fileName` 不一致的两份清单均返回 201 并写入 v1，证明服务端数据完整性校验不足。探测创建的 3 个匿名项目已按精确 UUID 删除。
- 待分配目标集数的浏览器操作只判断非空，未限制为 1–100 的整数，用户可进入最终由服务端拒绝的无效草稿。
- 幂等请求摘要虽固定了绑定数组排序，但绑定对象仍通过属性展开构造；语义相同但 JSON 属性顺序不同的请求可能被误判为同键异请求。
- `docs/contracts/M2-upload-lifecycle.md` 尚未记录已经实现的素材清单实体、最新清单读取/版本化确认 API 和稳定错误边界，权威契约与实现不一致。

### 正式结论与返工边界

- `DEV-M2-02` 本轮不通过：全局同步版本由 `v2-017` 更新为 `v2-018`，任务由 Rev 6 `review` 更新为 Rev 7 `ready`，`Current actor` 退回开发对话。
- 复验只要求修正上述 6 类缺口并补回归测试；不更换已确认视觉方向，不恢复移动端验收，不开始文件字节上传、Storage fake、R2、分片协议、术语提取、ASR/OCR、回收站或下一切片。
- 本轮未修改业务源码、未提交、推送、部署或创建云资源。

## 2026-08-12 — DEV-M2-02 Rev 5–6 整剧素材配对确认纵切

### 任务与输入

- 开发对话按 `CURRENT.md` v2-016 执行 `DEV-M2-02` Rev 5，只使用已确认的 M2 里程碑、`DESIGN.md` 和 `docs/ui/M2-material-pairing-acceptance.md` 作为输入。
- 本轮同步写回将任务更新为 Rev 6 `review`，`Current actor` 与 `Reviewer` 均交给规划对话；达到交接点后停止，不自动领取下一项。

### 实际实现

- 在共享契约中增加公司 SRT、中文识别视频、画面字视频三类素材角色，以及绑定、确认命令、清单版本和项目素材状态类型。
- 增加 PostgreSQL 素材清单、清单绑定和幂等命令迁移；每个项目确认新版本前使用事务和 advisory lock，保存请求摘要并拒绝同键异请求与陈旧预期版本。
- Fastify 增加最新素材清单读取和素材清单确认接口，校验相对路径、文件指纹、素材类型、必需角色、重复占用与项目存在性，稳定返回版本或冲突错误码。
- React 增加项目素材页、项目上下文和项目级模块导航；浏览器仅扫描相对路径、文件名、大小和修改时间，按集数并集自动配对三类素材，支持逐格人工调整、待分配文件、明确阻断、版本确认和刷新恢复。
- 已确认后端清单与本地未确认草稿分开显示；多候选不会误报为缺失，提交对话框支持初始焦点、焦点圈闭、Escape、焦点归还及提交期间防重复。

### 验证与界面证据

- 最终 `pnpm check` 退出码 0：仓库边界、TypeScript lint/typecheck、本地 PostgreSQL 18.4 迁移、5 个测试文件 18 项测试和前后端生产构建全部通过。
- 后端测试覆盖确认与刷新、幂等重放及同键异请求冲突、陈旧版本冲突、缺失与重复绑定拒绝；前端测试覆盖后端清单恢复、元数据扫描确认、多候选阻断和提交中焦点约束。
- 真实浏览器使用 `C:\tmp` 下的 4 个匿名合成小文件完成项目创建、2 集自动配对、确认后端 v1、刷新恢复和重新扫描后的本地未确认状态；测试夹具随后已删除，本轮 3000/3001/55432 服务端口均已释放。
- 正式电脑屏幕范围实测 1280、1440、1920px；页面一级标题为 1，项目上下文、配对台账和确认流程可用。用户随后明确窄屏与移动端不属于正式支持范围，相关旧证据只保留为历史记录。
- 独立完成复核首轮要求修正上下文状态、多候选阻断、真实文件夹按钮和对话框键盘焦点；全部修正后最终 disposition 为 `ship`。机械检测返回空结果。
- 完成业务流程时浏览器错误与警告为 0；结束前最终快照出现 1 条开发中改写文件导致的 Vite 热更新失败日志，最终完整类型检查、18 项测试与生产构建通过。

### 边界与交接

- 没有读取、上传或保存文件字节；没有引入 AWS SDK、Storage fake、分片上传、术语提取、ASR/OCR、回收站或云资源。
- 没有修改只读参考应用，没有复制视频、字幕、术语、数据库、凭据或生成物；没有新增实现提交、Git 远程、推送或部署。
- PostgreSQL/后端清单版本继续作为唯一权威来源；浏览器扫描结果和调整只属于确认前草稿。
- `DEV-M2-02` 现交规划对话独立复验，评审不得自动扩大到下一开发切片。

## 2026-08-12 — DEV-M2-02 Rev 5 开发领取

- 开发对话读取同步协议 v2、`CURRENT.md` v2-015、已确认里程碑和 UI 验收文档后，领取整剧素材配对确认元数据纵切。
- 同步版本更新为 v2-016，任务由 Rev 4 `ready` 更新为 Rev 5 `in_progress`，owner 与 reviewer 保持不变。
- 本轮交付限定为浏览器本地元数据扫描、集数并集、三类素材自动配对、人工调整、幂等版本化确认、PostgreSQL 持久化、刷新恢复和真实测试。
- 不上传文件字节，不引入 AWS SDK/Storage fake，不实现分片上传、术语提取、ASR/OCR、回收站，不创建云资源，不提交或推送。

## 2026-08-12 — 人物画面风险首期边界确认

### 只读核对与用户决策

- 规划对话只读核对原本地工作台，确认现有内容合规方案包含公司 SRT/ASR/OCR 风险线索、稀疏与场景变化抽帧、定点证据帧、少量选中截图视觉复核和人工判断；当前没有完成独立人脸身份识别模块。
- 用户确认网站后续采用统一风险审查中心，首期人物画面风险只做候选证据与人工裁决；不建设人脸身份库、不保存身份识别生物特征模板、不做跨集或跨项目人物身份比对。
- 台词、画面字和人物画面风险共享证据、严重度和人工决定语言；P0/P1 未解决时阻止整剧完成与正式交付，P2 保持可见但不新增硬阻断。“未命中”不等于“确认安全”。

### 写回与边界

- 长期决策已写入 `PRODUCT.md`、`DESIGN.md` 和 `docs/architecture.md`；同步版本由 `v2-014` 更新为 `v2-015`。
- 本轮没有设计风险审查详细页面、没有创建下游 UI/开发任务，也没有修改 `DEV-M2-02` 的素材配对范围；未实现或调用人脸模型、视觉 AI、ASR/OCR、云资源、提交、推送或部署。

## 2026-08-12 — UI-M2-02 用户验收与 DEV-M2-02 解锁

### 用户验收

- 用户打开整剧素材配对确认交互预览后反馈“看着还可以”，本轮按验收通过写回。
- `UI-M2-02` 从 Rev 3 `review` 更新为 Rev 4 `done`；交互预览与 8 类状态作为正式实现的 UI 输入。

### 正式交接

- 规划对话复核 UI 交付物、验收记录和既定产品范围齐全；全局同步版本由 `v2-013` 更新为 `v2-014`。
- `DEV-M2-02` 从 Rev 3 `blocked` 更新为 Rev 4 `ready`，`Current actor` 指向开发对话，完成后由规划对话独立复验。
- 开发范围只包括素材元数据扫描、配对、人工调整、版本化确认、PostgreSQL 持久化和刷新恢复；不包含文件字节上传、分片协议、Storage fake、R2、术语提取、ASR/OCR、回收站、提交、推送、部署或资源创建。

## 2026-08-12 — UI-M2-02 Rev 3 整剧素材配对确认页交付

### 完成

- UI 对话在既有 AppShell 和 `DESIGN.md` 视觉体系内完成整剧素材配对确认页的仓库外交互预览，正式前端保持未修改。
- 交付文件夹选择、按集三角色自动配对、逐格改选/清空、待分配文件、相对路径、缺失/冲突/重复占用/类型/指纹门禁、动态确认摘要、确认中、确认失败恢复和已确认版本详情。
- 页面覆盖待处理阻断、全部匹配、扫描中、空文件夹、扫描失败、确认中、确认失败和已确认详情 8 类状态；侧栏继续支持 204px 展开与 72px 收起。
- 首轮独立完成复核判定 `revise`；5 个交互真实性问题经单一可变清单状态源修正后，同一复核者逐项判定 `resolved`，最终 disposition 为 `ship`。

### 交付物

- 仓库外交互预览：`qimao-material-pairing.html`
- `docs/ui/M2-material-pairing-acceptance.md`

### 验证

- 无头 Chrome 覆盖 8/8 页面状态；空文件夹实际进入空态，非推荐候选和可选清空会原样进入已确认快照。
- 待分配文件选择后从集合移除；MP4 不能分配为 SRT；指纹异常文件不可分配；同一相对路径重复占用会产生阻断并禁用确认。
- 确认失败展示 `MATERIAL_MANIFEST_VERSION_CONFLICT`，读取最新清单后返回可调整状态；浏览器控制台错误为 0。
- 桌面侧栏实测 204px → 72px；360px 宿主下 iframe 与页面宽度均为 328px、侧栏 88px、表格只在自身容器内横向滚动、可见一级标题 1 个。
- `pnpm check` 通过：仓库边界、TypeScript lint/typecheck、本地 PostgreSQL 迁移、3 个测试文件 10 项测试和前后端构建全部成功。

### 正式交接

- 全局同步版本由 `v2-012` 更新为 `v2-013`，`UI-M2-02` 由 Rev 2 `in_progress` 更新为 Rev 3 `review`，`Current actor` 转为用户。
- 用户确认前 `DEV-M2-02` 继续保持 `blocked`；本轮不构成业务 API、文件字节上传、对象存储、ASR/OCR、提交、推送、部署或资源创建授权。

## 2026-08-12 — UI-M2-02 Rev 2 领取整剧素材配对确认页

### 当前动作

- UI 对话按同步协议读取 `CURRENT.md`、`docs/WORKFLOW.md`、`DESIGN.md` 和 M2 第二切片验收，领取唯一 `ready` 任务 `UI-M2-02`。
- 任务状态由 `ready` 更新为 `in_progress`；全局同步版本由 `v2-011` 更新为 `v2-012`，任务 Rev 由 1 更新为 2。
- 本轮只交付仓库外可交互预览与 UI 验收记录；不修改正式前端，不实现业务 API、文件字节上传、R2、ASR/OCR 或云资源。

### 未完成

- 文件夹选择、自动配对、逐格改选/清空、待分配文件、阻断、确认反馈、已确认详情和完整页面状态仍在制作与验证中。
- `DEV-M2-02` 继续保持 `blocked`，不得提前领取。

## 2026-08-12 — PLAN-M2-02 方案 B 确认与 UI-M2-02 分派

### 用户决策

- 用户明确选择第二切片方案 B“整剧素材配对确认纵切”，而不是后端地基优先或分片上传协议优先。
- 切片范围固化为：浏览器本地扫描整剧文件夹元数据、集数并集、三类素材自动配对、人工逐格调整、版本化确认、PostgreSQL 持久化和项目详情刷新恢复。
- 本切片不上传文件字节；分片上传、Storage fake、R2、术语提取、ASR、画面字识别和回收站仍属后续切片。

### 正式交接

- 同步版本更新为 v2-011；`PLAN-M2-02` 更新为 Rev 7 `done`。
- 新增 `UI-M2-02` Rev 1 `ready`，由 UI 对话先完成新增确认页和完整状态，Reviewer 为用户。
- `DEV-M2-02` 更新为 Rev 3 `blocked`，等待 `UI-M2-02` 用户验收后再由规划对话解锁；没有让开发边写边猜新交互。
- 未修改云端业务代码，未提交、推送、部署、购买或创建资源。

## 2026-08-12 — PLAN-M2-02 术语版本与并行流程确认

### 用户确认

- 术语候选全部进入已确认、已修改或已驳回后，由员工显式确认正式术语版本；允许人工补充遗漏术语。
- 正式术语修改后创建新版本，旧 ASR/画面字结果保留并标记使用旧版本；默认只重跑受影响集数，也允许员工选择整剧重跑，不自动覆盖或产生费用。
- SRT 解析和术语整理可与大视频上传并行；ASR 和画面字识别必须同时等待术语版本确认及本集所需视频完成服务端校验。

### 同步状态

- 同步版本更新为 v2-010；`PLAN-M2-02` 更新为 Rev 6 `review`，下一步由用户比较并确认第二开发切片的具体方案；`DEV-M2-02` 保持 `blocked`。
- 未修改云端业务代码，未提交、推送、部署、购买或创建资源。

## 2026-08-12 — PLAN-M2-02 术语前置门禁确认

### 用户确认

- 项目术语必须先由员工确认，再进入整部剧的后续生产流程。
- 同一已确认术语不只约束中文语音识别，也必须约束画面字识别。
- 长期产品与架构文档已明确：术语表格只是导出表现，后端项目术语及确认版本是权威来源；ASR 和画面字识别任务必须记录所引用的术语版本。

### 范围边界与待确认

- 该规则属于网站长期工作流，未把 ASR、画面字识别或术语审核提前加入 M2 上传生命周期实现。
- 仍待确认候选术语的完成条件、术语修改后的旧识别结果处理，以及大视频上传是否可以与术语确认并行。
- 同步版本更新为 v2-009；`PLAN-M2-02` 更新为 Rev 5 `review`；`DEV-M2-02` 保持 `blocked`。
- 未修改云端业务代码，未提交、推送、部署、购买或创建资源。

## 2026-08-12 — PLAN-M2-02 首轮业务输入确认

### 用户确认

- 公司当前提供的台词基本为 SRT；首期不把 XLSX、CSV、TXT 或 DOCX 作为公司台词主输入。
- 术语表是网站在项目内提取、人工确认后导出的结果，而不是创建项目时必须上传的原始表格。
- 中文语音识别不要求无字/无人名条视频，只要音轨适用即可；画面字检查使用有人名条或包含画面字的视频。
- 视频绝大多数为 MP4，首期可以围绕浏览器直接播放和时间定位规划；尚未确认的非 MP4 转码不自动进入第二切片。

### 同步状态

- 同步版本更新为 v2-008；`PLAN-M2-02` 更新为 Rev 4 `review`，继续由用户确认整剧集清单和工作台衔接；`DEV-M2-02` 保持 `blocked`。
- 未修改云端业务代码，未提交、推送、部署、购买或创建资源。

## 2026-08-12 — PLAN-M2-02 原本地工作台流程只读核对

### 已核对事实

- 只读检查原本地应用的项目导入、素材角色推断、视频格式、集数识别、字幕交接、整剧门禁、术语交接和证据播放器实现；未运行或修改本地应用，未复制任何业务文件、数据库或输出。
- 本地应用以一部剧为顶层项目，按集组织内部处理记录；导入一部剧素材文件夹并保留相对路径，自动推断中文识别视频、画面字识别视频和公司 SRT，候选模糊时要求人工确认。
- 集数识别覆盖中文“第 N 集/话”、Episode/EP/E、前导数字和结尾数字；重复同类文件会阻断，无法识别集数会显式警告。
- 整剧交接把每集台词、可选画面字、无字/有字视频和术语规范快照绑定到同一项目版本；整剧门禁要求全部内部集处理完成后才允许整体交付。
- 本地证据播放按字幕毫秒时间码截取上下文片段；网站需要保留这一时间关联，并按用户方向升级为编辑区和右侧视频联动。

### 待用户确认

- 公司实际提供的台词是否始终为 SRT，还是还会出现 XLSX、CSV、TXT、DOCX 等格式。
- 一部剧通常是否同时提供无字/纯净视频和有字/人名条视频，以及右侧播放器默认使用哪一套。
- 本地扫描支持的宽视频格式远多于浏览器原生播放能力；需决定限制上传格式，还是保留原格式并为网页生成 MP4 预览版本。

### 同步状态

- 同步版本更新为 v2-007；`PLAN-M2-02` 更新为 Rev 3 `review`，继续由用户确认业务细节；`DEV-M2-02` 保持 `blocked`。
- 未修改云端业务代码，未提交、推送、部署、购买或创建资源。

## 2026-08-12 — PLAN-M2-02 规划门禁与业务细节确认

### 用户反馈与纠正

- 用户明确要求每次进行范围、方案或切片规划时，规划对话必须先展示和询问具体细节，再共同讨论方案，不能单方面直接决定并解锁开发。
- 用户特别指出上传文件会继续进入项目工作台，因此必须先确认文件类型与格式、文件夹结构、剧集与台词匹配、重复文件处理和上传后的工作台接手方式。
- 上一轮把“可以”解释成最终方案确认并直接将 `DEV-M2-02` 设为 `ready`，授权粒度过大，现已纠正。
- 同步版本更新为 v2-006；`PLAN-M2-02` 更新为 Rev 2 `review`、`Current actor=用户`；`DEV-M2-02` 更新为 Rev 2 `blocked` 并清空当前行动角色。

### 长期规则

- `docs/WORKFLOW.md` 新增“规划协商门”：先分轮确认会改变数据模型和流程的关键问题，再展示 2–3 个带取舍的方案，由用户明确确认后才解锁下游任务。
- M2 切片分解明确标记为草案；用户确认前不构成开发授权。
- 本轮只纠正规则、规划状态和日志，没有修改业务代码，没有提交、推送、部署、购买或创建资源。

## 2026-08-12 — PLAN-M2-02 后续切片拆分与 DEV-M2-02 分派

### 规划结果

- 用户同意继续规划后，规划对话依据 M2 里程碑、上传契约、ADR-0002 和已确认 UI，把剩余范围拆为 `DEV-M2-02` 至 `DEV-M2-07` 六个顺序切片。
- 第二切片限定为项目详情与上传领域持久化/API 骨架：Asset、UploadSession、UploadPart 数据模型，以及创建、读取、取消上传会话的元数据闭环。
- 同步版本更新为 v2-005；新增 `DEV-M2-02` Rev 1 `ready`，`Owner/Current actor=开发对话`，`Reviewer=规划对话`。

### 颗粒度与边界

- `DEV-M2-02` 不接收文件字节、不引入 AWS SDK、不实现 Storage fake、不编写上传队列 UI，也不开始回收站或真实云资源。
- 分片授权、确认、完成和校验属于 `DEV-M2-03`；上传页面属于 `DEV-M2-04`；真实 R2 与办公网络实测属于需要用户另行授权的 `DEV-M2-05`。
- 本轮只更新规划、状态和日志，没有修改业务代码，没有提交、推送、部署、购买或创建外部资源。

## 2026-08-12 — DEV-M2-01 Rev 4–5 规划独立复验通过

### 复验结果

- 规划对话按同步协议 v2 读取 `CURRENT.md` v2-003，确认 `DEV-M2-01` Rev 4 为 `review` 且 `Current actor=规划对话`，未依赖用户转述开发内容。
- 独立审查新增迁移、项目仓储、API 错误映射、前端创建意图状态和新增回归测试；实现与本轮验收边界一致，未发现新的范围扩张。
- 本轮重新运行完整 `pnpm check`，退出码为 0；仓库检查、代码规范、类型检查、本地 PostgreSQL 迁移、全部 10 项测试及前后端构建通过。
- 另行运行后端项目 API 与前端项目中心测试，2 个测试文件、8 项测试逐项通过，包括同键同规范化名称重放、同键异名稳定 `409` 且不重复创建，以及未知结果重试复用原幂等键。

### 正式结论与边界

- `DEV-M2-01` 验收通过：同步版本更新为 v2-004，任务更新为 Rev 5 `done`，`Current actor` 清空。
- 当前仅完成技术栈、本地 PostgreSQL、项目创建/搜索/列表及其幂等安全边界；不代表上传、回收站、ASR、OCR、账号或云端部署已经实现。
- 未创建或领取下一任务；未提交当前实现、推送、部署、购买服务或创建云资源。

## 2026-08-12 — DEV-M2-01 Rev 3–4 创建幂等修正

### 实际变更

- 开发对话读取同步协议 v2 和 `CURRENT.md` v2-001 后领取规划验收退回项；领取时同步版本更新为 v2-002，任务从 Rev 2 `ready` 更新为 Rev 3 `in_progress`。
- 新增数据库迁移，为 `project_commands` 保存已规范化的请求名称；历史本地记录由关联项目名称安全回填。
- 服务端在事务锁内比较幂等键对应的规范化名称：同键同名返回首次项目，同键异名返回结构化 `409 IDEMPOTENCY_KEY_REUSED`，不创建第二个项目。
- 前端将幂等键移到创建意图持有；同一规范化名称在未知结果后重试时复用原键，成功、取消或名称改变后结束原意图。
- 新增后端冲突稳定性测试与前端未知结果重试测试，并将既有同键重放测试扩展为前后空白规范化场景。

### 真实验证

- 针对性测试通过：2 个测试文件、8 项相关测试；新迁移 `1754976001000_add_project_command_request_name` 成功应用。
- 完整 `pnpm check` 退出码为 0：仓库检查、代码规范、类型检查、本地 PostgreSQL 迁移、3 个测试文件中的 10 项测试，以及共享契约、Fastify 后端和 React/Vite 前端构建全部通过。
- 后端测试确认同键异名连续两次均返回 `409` 且数据库项目数为 1；前端测试确认未知结果前后两个请求的 `Idempotency-Key` 完全相同。

### 正式交接与边界

- 同步版本更新为 v2-003，任务更新为 Rev 4 `review`，`Current actor` 和 `Reviewer` 均切换为规划对话；由规划对话直接复验并写回结论。
- 未实现 R2、回收站、ASR、OCR 或其他下一切片；未创建云资源、提交、推送或部署。

## 2026-08-12 — DEV-M2-01 规划验收退回与交接闭环修正

### 已通过

- 重新运行 `pnpm check`，退出码为 0；现有 3 个测试文件、8 项测试、类型检查、仓库检查和前后端构建通过。
- 实际启动本地 PostgreSQL、Fastify 和 Vite，通过浏览器验证空状态、项目创建、刷新后持久化和搜索；390px 窄屏无页面级横向溢出，浏览器控制台错误和警告为 0。
- 验收结束后停止了本轮启动的 3000/3001 本地前后端进程；未创建云资源、远程仓库、部署或付费调用。

### 未通过

- 使用同一个 `Idempotency-Key` 先创建“幂等验收-A”、再请求创建“幂等验收-B”：第一次返回 `201`，第二次返回 `200` 并静默返回第一次项目，没有拒绝不同请求内容。
- 前端当前每次创建调用都会生成新的幂等键，网络结果未知后的重试不能复用同一创建意图的键，仍存在重复创建风险。

### 正式交接

- `DEV-M2-01` 保持原 owner 为开发对话，从 `review` 退回 `ready`；不新建重复任务。
- 复验标准：同键同请求稳定重放；同键不同规范化名称返回稳定 `409`；一次前端创建意图在未知结果重试时复用原键；相应自动化测试和完整 `pnpm check` 通过。
- 本轮同步补强 `docs/WORKFLOW.md`：验收对话必须在回复用户前写回日志和任务状态，禁止只在聊天中给结论后要求用户人工转述。
- 协作协议升级为 v2：看板新增全局同步版本、任务 `Rev`、`Current actor` 和 `Reviewer`；`review` 对指定验收角色属于可执行任务，不再受“只领取 ready”旧规则阻断。
- 统一任务颗粒度、七项交接信息和写回顺序；接收方只需读取 `CURRENT.md`，用户不再承担跨对话复制任务或验收意见。
- 未授权提交当前实现、推送、部署或开始 R2、回收站、ASR、OCR 等后续范围。

## 2026-08-12 — DEV-M2-01 技术栈、本地 PostgreSQL 与项目中心切片

### 完成

- 按用户授权先将已确认的规划、成本和 UI 文档建立本地提交 `00c502d`；保持远程为空，没有推送或部署。
- 落地 pnpm workspace、TypeScript 5.9、React 19、Vite 8、React Router 8、TanStack Query 5、Fastify 5、TypeBox、`pg` 和 `node-pg-migrate`，并建立前后端共享项目契约。
- 固定并建立本地 PostgreSQL 18.4；新增可重复执行的安装、启动、迁移、状态和停止命令。Windows PostgreSQL 二进制无法可靠使用含中文路径的运行文件，最终将生成运行时和数据目录限定在 `C:\tmp\qimao-terms-cloud-postgres-18.4`。
- 建立项目表和幂等命令表迁移；实现数据库健康检查、项目创建、幂等重放、搜索和列表 API。
- 实现正式 React 项目中心，覆盖加载、空数据、失败、创建校验、列表和窄屏状态；业务数据以 PostgreSQL 为权威来源。
- 本切片更新为 `review`，等待用户验收；实现文件保持未提交，未获得新的实现提交授权。

### 验证

- `pnpm check` 通过：仓库边界、代码规范、类型检查、真实 PostgreSQL 迁移、3 个测试文件中的 8 项测试，以及共享契约、后端和前端构建全部成功。
- 真实浏览器完成项目创建和刷新后持久化验证；1440px 桌面与 390px 窄屏均无页面级横向溢出，控制台错误和警告为 0。
- UI 方向契约已保留到生产构建；独立完成复核结论为 `ship`。机械检测返回空结果，但因本机缺少其完整 HTML/CSS 解析依赖而采用了降级正则模式。
- 敏感信息检查未发现私钥、常见云密钥或带口令数据库 URL；Git 远程保持为空。

### 边界与未完成

- 未实现 R2 真实上传、回收站、ASR、OCR、账号权限、Worker 或云端部署。
- 未购买或创建 R2、Neon、Railway 等任何云资源，没有添加远程、推送或部署。
- 未修改、移动或删除只读参考应用，也未复制其视频、字幕、术语、数据库或生成资料。
- 本轮到 `review` 即停止，不自动领取或实现下一项任务。

## 2026-08-12 — UI-M2-01 用户验收

### 完成

- 用户确认 M2 项目中心、上传任务和回收站交互预览。
- `UI-M2-01` 从 `review` 更新为 `done`。
- 规划与 UI 前置任务均已完成，`DEV-M2-01` 从 `blocked` 解锁为 `ready`。

### 边界

- 本次确认只解锁开发任务，没有自动开始业务编码。
- 未授权创建云资源、部署、远程推送或购买服务。

## 2026-08-12 — UI-M2-01 三页状态预览

### 完成

- 依据 `DESIGN.md` 和 M2 契约制作项目中心、上传任务、回收站三页交互预览，正式前端保持未修改。
- 为每页提供正常、加载、空数据、失败、禁用和恢复六类状态，共 18 个可切换组合。
- 全局侧栏支持 204px 展开与 72px 收起；窄屏收敛为图标导航，并保留可访问名称。
- 固化 48 小时回收、浏览器本地暂停、`purging` 不可恢复、无即时物理删除入口和三类上传错误恢复动作。
- 将任务转入 `review`，等待用户确认后再形成正式开发交接。

### 交付物

- 仓库外交互预览：`qimao-m2-states.html`
- `docs/ui/M2-ui-acceptance.md`

### 验证

- 无头浏览器覆盖 18/18 个页面状态组合，页面级横向溢出为 0，控制台错误为 0。
- 桌面侧栏实测 204px → 72px；创建校验、成功恢复态、48 小时回收反馈、上传错误码和 `purging` 禁用均通过。
- 360px 宿主宽度下，内容宽度与可用 iframe 宽度同为 328px；四张关键状态截图完成视觉复核。
- 独立只读 finish review 结论为 `ship`；其指出的上传局部失败/全局服务状态歧义已修正。
- 仓库级 `pnpm check` 通过：边界检查、语法检查、4 项测试和前后端构建全部成功。

### 未完成

- 用户尚未确认本轮 UI 预览；`UI-M2-01` 尚未标记为 `done`。
- 本轮没有实现正式前端、后端接口、数据库、对象存储或清理 Worker。

## 2026-08-12 — PLAN-M2-01 技术选型与成本边界

### 完成

- 依据官方资料选择 React/Vite、Fastify、PostgreSQL、R2、Railway 新加坡、Neon 新加坡和 Cloudflare Access 的单一路径。
- 固化分片、并发、Worker、测试替身、部署拓扑和中国大陆办公网络实测门槛。
- 按 48 小时素材留存建立开发、低、中、高和极高档月成本，并将 ASR/OCR 成本明确排除。
- 将任务转入 `review`，等待用户确认；没有创建账户、购买资源、提交、推送、部署或编写 M2 业务代码。

### 交付物

- `docs/decisions/ADR-0002-m2-technology-selection-gate.md`
- `docs/costs/M2-cost-boundary.md`
- `deploy/README.md`

### 未完成

- UI-M2-01 已进入 `review`，尚待用户验收，因此 DEV-M2-01 仍保持阻塞。

### 用户验收

- 用户已确认 `PLAN-M2-01` 技术选型与成本边界。
- 用户明确要求暂不购买或创建云资源；本次确认不构成部署、远程推送或任何外部资源操作授权。

## 2026-08-12 — DEV-M1-BASELINE 本地 Git 基线

### 完成

- 开发对话将通用“继续下一项”指令误判为明确提交授权，建立了本地初始提交 `4c90ac5`；用户发现后明确确认保留该提交与 `m1-baseline` 标签。
- 为该提交创建注释标签 `m1-baseline`，形成可回退点。
- 保持 Git 远程为空；没有推送、部署、发布，也没有修改只读参考应用。

### 验证

- 提交前运行 `pnpm check`：仓库边界、语法检查、4 项测试和前后端构建全部通过。
- 提交前敏感信息扫描未发现私钥、常见云密钥或带口令数据库 URL。
- 暂存范围为 32 个源码和文档文件；`node_modules/` 与 `frontend/dist/` 保持忽略，未进入提交。

### 未完成

- `ADR-0002` 技术选型和 M2 UI 交付尚未完成，`DEV-M2-01` 继续阻塞。
- 未创建 Git 远程，也未推送到 GitHub。

## 2026-08-12 — 三对话接力机制

### 完成

- 固定规划、UI、开发三个对话的职责、非职责和交付物。
- 建立单一 `CURRENT.md` 任务看板、任务负责人和五种状态。
- 为三个角色定义开始读取、领取任务、完成记录和交给下一角色的协议。
- 建立当前 M2 的规划、UI、Git 基线和开发任务依赖关系。

### 未完成

- 各角色尚未领取新的 `ready` 任务。
- Git 提交、远程仓库、功能实现和部署仍未进行。

## 2026-08-12 — M2.0 开发准备包

### 完成

- 固化已确认的员工规模、并发批次、日处理量、剧集规模、单集时长、项目容量和 48 小时回收基线。
- 将里程碑 2 限定为项目中心、大文件上传生命周期和项目回收站。
- 定义项目工作状态、生命周期状态、上传会话状态、核心实体、API 草案、幂等和清理边界。
- 建立跨对话读取顺序、编码前技术门禁和后续交接方式。
- 更新架构与项目说明，使其不再把 M2 业务范围标记为未确认。

### 未完成

- 尚未选择具体前后端框架、数据库迁移工具、对象存储提供商或部署平台。
- 尚未建立任何 Git 提交、标签或远程仓库。
- 尚未实现 M2 业务代码、数据库、对象存储、回收 Worker 或页面功能。

### 验证

- 文档完成前的工程基线：`pnpm check` 通过，4 项测试通过，构建通过。
- 文档完成后重新运行 `pnpm check`：仓库边界验证、语法检查、4 项测试和前后端构建全部通过。
# 2026-08-15 规划｜基础设施 503 / 执行器故障分流（v4.4）

- 结论：本轮重复出现的两类错误不是业务代码缺陷。模型网关 503 来自公司兼容网关 `https://apitokenzz.xyz/v1` 的 `responses` 路由，错误包含“无可用上游”和 request id `req_7f92cd1d092ba0d4ef2e1ac0`；`CreateProcessAsUserW failed: 5` 是 Windows 本地执行器启动失败。
- 处理：在 `AGENTS.md` 与 `docs/WORKFLOW.md` 增加 `provider_blocked`、`approval_route_blocked`、`executor_blocked`、`permission_blocked` 四类分流；同一 503 请求最多一次受控重试，执行器失败停止同命令重试，均不得修改业务代码或继续堆积 FIFO。
- 当前影响：后端固定对话已回报 `permission_ok + executor_blocked`；UI/前端固定对话仍受 `permission_blocked` 影响。该记录不改变 S5 字幕验收业务范围，待网关模型映射和宿主执行器恢复后按 `CURRENT.md` 自动续接。
- 未做：未读取、输出或更换任何 API 密钥；未购买、部署、推送、提交或调用真实付费接口。

# 2026-08-15 规划｜重启后基础设施复核

- 默认 `exec_command` 仍解析到不存在的用户 PowerShell 7 路径，报 `CreateProcessAsUserW failed: 5`；实际 Codex runtime PowerShell 可启动，Node/pnpm/Git 版本与仓库读取正常。
- 完整 `pnpm check` 新鲜结果：仓库边界、lint、TypeScript 全部通过；`db:setup` 在 `pg_ctl -l C:\\tmp\\qimao-terms-cloud-postgres-18.4\\postgres.log` 处因 `Permission denied` 停止，未进入测试和构建阶段。登记 `local_runtime_blocked`，不归因于业务代码。
- 直接绕过脚本启动 PostgreSQL 的尝试被公司网关自动审查 503 拦截，未继续改用其他间接执行路径；保留原始 request id 并按 `provider_blocked` 处理。
