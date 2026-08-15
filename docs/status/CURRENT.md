# 当前项目交接状态

最后更新：2026-08-15

同步协议：v4.4

同步版本：`v4-254`

最近写入角色：规划对话

## 当前结论

- 用户要求对权限链路做长期修正。协议已升级 v4.4：每次派发前后必须完成工作区根、`workspace-write/:workspace` 和普通仓库写入不走 `auto_review` 的权限握手；`read-only`、根不匹配或仓库内编辑触发审批统一标记 `permission_blocked`，由规划修正/重派，不计业务 Rev、不要求用户传话。FIFO 103 实测：后端 `permission_ok` 并继续 S5；UI 与前端虽然根目录正确，但当前固定对话均为 `read-only`，已转规划权限阻塞且不得写业务文件。前端本就等待双依赖；UI 设计暂停，待其任务环境恢复 workspace-write 后由规划重新握手和自动续接。购买、部署、推送、真实付费 API、云资源和破坏性操作仍保留单独授权门。本次只改协议/派发链路，不改变 S5 任务范围。
- 用户已明确要求恢复范围内本地写入和跨角色自动接力，并授权启动下一功能。规划据既有里程碑、本地应用说明与 `LOCAL_APP_PARITY.md` 正式启动 S5 字幕验收工作台；权威输入为 `docs/contracts/M3-subtitle-acceptance-workbench.md`。`PLAN-M3-05` 关闭，`UI-M3-05` 与 `BACK-M3-05A` 已自动唤醒并进入 `in_progress`，`FRONT-M3-05B` 继续等待 UI 核心结构与后端共享契约双通过。范围内本地编辑、测试、状态写回、规划审核和任务通知不再逐次询问；购买、部署、推送、真实付费 API、云资源和破坏性操作仍单独确认。长期授权说明已写入项目级 `AGENTS.md`，临时只读或审批服务故障不得再被解释为用户撤销授权。
- S4 关闭状态已主动同步给固定 UI、前端、后端对话。UI 与前端均已明确回执“收到并等待”，没有修改文件或启动 S5；后端对话当前为 `notLoaded`，首次消息已入队但未唤醒，按 v4.3 立即重试时工具返回 `agent loop died unexpectedly`。该失败只影响一个已 `done` 对话的冗余关闭通知，不影响权威 `CURRENT v4-245`、S4 完成事实或任何后继依赖；已如实登记，不要求用户传话，后端下次被正常唤醒时须先重读 CURRENT。
- 规划已完成 S4 画面字 OCR 工作台最终关闭门。UI 对 `FRONT-M3-04B` Rev 3 两个原失败场景的正式微终验为 `P0=0 / P1=0`：未拆分左右父候选不能误保留，完成拆分与合法决定后可生成不可变 Release/SRT；来源或候选证据不可用时全部写操作锁定，正式 evidence 原查询 `503 → 503 → 200` 的真实原因、requestId、唯一重读、防重复和焦点恢复成立。规划随后只运行一次完整 `pnpm check`，在精确隔离数据库 `qimao_planning_s4_close_20260815` 上从零应用 22 个迁移，20 个测试文件 184/184、仓库边界、lint、TypeScript、共享契约/后端/前端生产构建全部通过；前端构建 164 modules，仅保留非阻断的 500 kB chunk 提示。隔离数据库残留 0，本地 PostgreSQL 已按用户授权停止。`FRONT-M3-04B` Rev 3 与 S4 正式标记 `done`；本轮未提交、推送、部署或接入真实 OCR/网络/密钥/付费/R2。
- UI 已完成 `FRONT-M3-04B` Rev 3 两场景微终验并通过，`P0=0 / P1=0`、无新增 P2/P3。正式 React+Fastify+精确隔离 PostgreSQL 证明：未拆分左右父候选逐条仅可忽略/拆分，混合批量只提交合法普通候选并使父候选保持 pending；拆分并完成合法决定后，不可变 Release `ccd1648a-2c25-4b6e-aa26-f3feff9ad8f1` 及两集独立左/右 SRT Cue 成功。来源 blocked/stale 时全部候选写动作锁定；正式 evidence 原查询以 `503 → 503 → 200` 恢复，真实原因/requestId、唯一重读、防重复、再次失败回焦与成功回焦证据区均成立。控制台 `error=0 / warn=0`，§15 其余冻结矩阵未重跑，生产代码未改，完整 `pnpm check` 未运行。验收写入 `docs/ui/M3-screen-text-acceptance.md` §16，任务保持 `review` 并转 `Current actor=规划对话 / Reviewer=规划对话`；FIFO 097 关闭，登记 FIFO 098 `notification_pending`，由规划运行一次完整 `pnpm check` 后裁决 S4 关闭。
- FIFO 098 已完成 v4.3 主动送达闭环：状态、验收与日志先写回 v4-242；正式交审只发送规划固定对话；`read_thread` 已确认完整 FIFO 098 消息进入规划最新 inProgress turn，`wait_threads` 确认规划任务为 `active / inProgress`。本次同步递增为 v4-243，FIFO 098 关闭；UI 停止验收并等待规划最终关闭门，不直接通知前端/后端。
- 规划已独立通过 `BACK-M3-04D` Rev 1 与 `FRONT-M3-04B` Rev 3 两项微审。后端代码确认父候选门禁位于任何候选更新、事件、批次归约和命令保存之前；规划新建精确隔离库 `qimao_planning_m304d_20260815`，从零应用 22 个迁移，screen-text 13/13、正确的 `@qimao-terms-cloud/backend` 生产构建、`check:repo` 与差异检查均通过，隔离库已删除且残留 0。前端代码确认正式 evidence fetch/query、来源/证据统一写锁、父候选逐条/批量资格和 requestId/唯一重读链成立；规划新鲜复跑 screen-text 前端 14/14、TypeScript、164 modules 生产构建与差异检查均通过。
- `BACK-M3-04D` 标记 done；`FRONT-M3-04B` Rev 3 进入 UI 定向微终验。FIFO 095/096 关闭，登记 FIFO 097 `notification_pending`：UI 只复验 §15 的两个原失败场景——未拆分父候选不能被逐条/批量保留且拆分后可完成发布；来源或代表截图不可用时候选写操作全锁、错误保留真实 requestId、唯一证据重读恢复后合法动作与焦点回来。§15 其余已通过矩阵全部冻结，不重跑完整页面，不修改生产代码。完整 `pnpm check` 继续等待 FIFO 097 通过后由规划运行一次。
- 前端已完成 `FRONT-M3-04B` Rev 3 并提交规划微审。正式页面以 `source=ocr + pairGroupId 非空 + position=full` 识别未拆分左右父候选：逐条只保留忽略/拆分，直接保留与保存编辑不再出现；批量保留会排除父候选、明确提示必须先拆分并使其继续保持 pending，普通单屏与 `source=split + left/right` 子候选沿用既有动作。候选代表截图改为正式 evidence query/fetch；来源门禁不满足，或当前证据 loading/error 时，候选选择、当前页/跨页选择、批量、人工新增及全部决定/编辑/恢复入口统一锁定。真实失败保留 Fastify 原因与 requestId，错误块内唯一“重新读取候选证据”只 refetch 原查询，恢复中防重复，失败回焦重读、成功回焦证据区；不再以 `img onError` 伪造错误事实。
- 新鲜验证：screen-text 专项 1 文件 14/14、前端 TypeScript、Vite 164 modules 生产构建、Impeccable 定向检测 `[]`、`git diff --check` 全部通过。新增可控回归覆盖 evidence pending→真实 503/requestId→唯一人工重读→success 焦点、来源门禁零写请求，以及父候选逐条/普通单屏/拆分子项/混合批量保留只提交合法候选。只修改 `frontend/src/features/screen-text/` 与对应前端测试；CSS 视觉主体、后端、迁移、共享契约、DESIGN 和 §15 其他冻结证据未改，未运行完整 `pnpm check`，未提交、推送或部署。任务转 `review / Current actor=规划对话 / Reviewer=规划对话`；FIFO 094 关闭。v4.3 交接已闭环：状态/日志先写回 v4-238，正式唤醒只发送规划固定对话；`read_thread` 确认 FIFO 096 完整消息已进入规划最新 turn，规划为 `active / inProgress`。同步版本递增为 v4-239，FIFO 096 关闭；未直接通知 UI。

- 后端已完成 `BACK-M3-04D` Rev 1 并提交规划微审：权威决定事务以持久化 `source='ocr' + pair_group_id 非空 + position='full'` 识别未拆分左右父候选，不再依赖原文换行；父候选直接 approve/edit 稳定返回 `422 SCREEN_TEXT_DECISION_INVALID`，事务回滚保证候选状态/修订、批次状态/修订/计数、DecisionEvent 与目标幂等命令零副作用；ignore 与 split 正常，split 后 `source='split' + left/right` 子候选、普通单屏 approve 和既有不可变 Release/SRT 链均通过。精确隔离空库 `qimao_back_m304d_20260815_093` 从零应用 22 个迁移，screen-text 专项 13/13，后端构建、`check:repo`、`git diff --check` 全部通过；隔离库已删除且残留 0，共享 PostgreSQL 未停止。任务保持 `review / Current actor=规划对话 / Reviewer=规划对话`；v4.3 三段交接已闭环：状态/日志先写回 v4-236，正式唤醒只发送规划固定对话，`read_thread` 确认 FIFO 095 进入规划最新 turn 且规划为 `active / inProgress`，FIFO 095 关闭。未运行完整 `pnpm check`，未改服务层、迁移、共享契约、Worker/Adapter、证据/播放、发布事务、前端或 DESIGN，未提交、推送或部署。

- 前端已按 FIFO 094 正式领取 `FRONT-M3-04B` Rev 3。编码前映射确认可直接使用正式候选身份 `source=ocr + pairGroupId + position=full` 区分未拆分左右父候选，拆分后 `source=split + position=left/right` 子候选不受影响；正式 evidence 路由沿用 `ScreenTextApiError` 可保留后端原因和 requestId，无需复制契约或伪造状态。本轮只在 `frontend/src/features/screen-text/` 与对应前端测试中收口父候选动作资格、批量提示、来源/证据统一写锁和唯一证据重读；任务转 `in_progress`，FIFO 094 转 `active`。CSS 视觉主体、后端、迁移、共享契约、DESIGN 与 §15 其他证据冻结。

- 后端已领取 `BACK-M3-04D` Rev 1：本轮只在 screen-text 后端权威写状态机与对应后端测试中稳定识别未拆分左右同屏父候选，使其仅允许忽略或拆分；直接 approve/edit 必须稳定 422，并证明候选/批次修订与计数、事件及目标幂等命令零副作用。拆分后的左右子候选、普通单屏候选与既有发布链全部冻结。任务转 `in_progress / Current actor=后端开发对话 / Reviewer=规划对话`，FIFO 093 转 `active`；不改迁移、共享契约、Worker/Adapter、证据/播放、发布事务、生产前端、DESIGN，不运行完整 `pnpm check`。

- 规划已完成 FIFO 092 两项 P1 的根因裁决，结论均成立，并按互不重叠目录拆成受控并行的两个最小切片。`BACK-M3-04D` Rev 1 只在后端写状态机与回归中把“未拆分左右同屏父候选”限制为仅可忽略或先拆分，直接保留/编辑必须稳定拒绝且零副作用；拆分后 `{left,right}` 子候选仍沿用既有发布链。`FRONT-M3-04B` Rev 3 只在正式画面字前端与回归中同步动作资格、批量保留排除/提示、来源门禁写锁，以及代表截图经正式读取失败时的 `requestId + 唯一重新读取候选证据`；来源或当前证据未就绪时选择、批量和全部候选写操作必须禁用。其他 §15 已通过的视觉、响应式、查询、历史、键盘与业务证据冻结。
- FIFO 092 关闭；登记 FIFO 093（后端决定门禁）与 FIFO 094（前端状态/证据门禁）为 `notification_pending`。两个任务只允许目录互不重叠的受控并行，不修改共享契约、迁移、DESIGN、OCR Worker/Adapter、发布事务或其他模块；完成后分别交规划独立微审，再由规划只路由 UI 复验 §15 的两个变化场景。S4 完整 `pnpm check` 继续冻结到双修正与 UI 微终验均通过。
- FIFO 092 已完成 v4.3 主动送达闭环：状态、验收与日志先写回 v4-231；正式退审只发送规划固定对话，未直接通知前端；`read_thread` 确认完整 P1、证据路径与最小修正建议进入规划最新 turn，`wait_threads` 确认规划为 `active / inProgress`，且规划已明确开始按“决定状态机过晚校验”处理左右配对缺口。同步版本递增为 v4-232，FIFO 092 转 `active`。本轮隔离数据库残留 0，3000/3001 已停止，临时文件残留 0；既有 3010 与共享 PostgreSQL 55432 保持运行。
- UI 已完成 `FRONT-M3-04B` Rev 2 正式 React+Fastify/PostgreSQL 完整领域终验，结论为不通过，P0=0/P1=2。第一项 P1：未拆分的左右双屏候选可被批量保留并使批次显示“已完成/可以发布”，服务端随后以“左右配对必须恰好保留一条左轴和一条右轴”拒绝发布，而完成态候选只剩“保存修改”，没有拆分、撤销或恢复路径。第二项 P1：精确重启隔离 backend 后真实出现来源门禁未满足与代表截图不可用，但候选选择、批量决定及“忽略/拆分左右/保留并下一条/保存修改”仍可执行，且没有带请求标识的唯一证据重读入口。证据与完整矩阵已写入 `docs/ui/M3-screen-text-acceptance.md` §15，仓库外证据目录为 `front-m3-04b-rev2-ui-final`。
- 冻结通过项：正式页同状态高保真、双门禁正常态、三范围、批次/候选查询与排序、四态候选、stale 只读、明确空集、失败集重试、取消弹窗、证据放大、1440/1024 侧栏 204/72 两态、根页面无横溢、表格容器内横滚、控制台 `error/warn=0/0` 与 Impeccable `[]`。Rev 1 的不可变 Release 成功及刷新后同 exportId 下载证据继续冻结引用。本轮未修改生产代码、后端、迁移、共享契约或 DESIGN，未运行完整 `pnpm check`。FIFO 091 关闭，登记 FIFO 092 `notification_pending`；任务保持 Rev 2 并转 `blocked / Current actor=规划对话 / Reviewer=规划对话`，由规划裁决最小前端返工或只读事实补充。
- 规划已通过 `FRONT-M3-04B` Rev 2 定向微审。代码核对确认五类 `CommandInput` 已变为完整后端请求身份的判别联合，mutation 与恢复不再读取实时详情或弹窗；本轮新鲜复跑 screen-text 11/11、前端 TypeScript、Vite 164 modules 与 `git diff --check` 全部通过。`confirm-empty/release` 回归证明详情修订 5→6 后第二次仍使用首次 key 与完全相同的真实 body，确定性 409 回归证明清意图后使用新 key/revision 6。FIFO 090 关闭；登记 FIFO 091 `notification_pending`，正式路由 UI 仅对正式 React+Fastify/PostgreSQL 做一次完整领域终验和冻结 UI 同状态高保真对比。UI 通过后规划只运行一次完整 `pnpm check` 关闭 S4；本轮不修改生产代码、不回开 Rev 1/2 已通过证据。
- FIFO 091 已完成 v4.3 送达闭环：规划先写回 v4-229，再只唤醒 UI 固定对话；`wait_threads` 确认 UI 明确收到 Rev 2 正式终验路由并进入 `active / inProgress`，将使用 Product Design Audit、Impeccable 与既定 in-app Browser 完成冻结 UI/正式 React 同状态对比和真实动态矩阵。同步版本递增为 v4-230，FIFO 091 转 `active`；生产前端冻结，用户无需传话。

- 前端已完成 `FRONT-M3-04B` Rev 2 同键异参 P1 定向修复并提交规划微审。`CommandInput` 现为五类完整后端请求身份的判别联合：首次提交即冻结 `kind`、`batchId`、`episodeNumber`、`episodeNumbers`、`expectedBatchRevision`、manual body 与幂等键；`commandMutation` 和唯一恢复只消费冻结 intent，不再读取实时 `detail.data` 或 `dialog`。未知/可重试结果保留首次完整请求；确定性非重试错误清 intent、刷新权威详情，下一次显式提交使用新 key 与新 revision。
- 定向证据：screen-text 专项 1 文件 11/11、前端 TypeScript、Vite 164 modules 生产构建、`git diff --check` 全部退出码 0。两条可控 pending→503→详情 revision 5→6→人工恢复回归分别证明 `confirm-empty` 与 `release` 第二次请求的幂等键和真实 body 与第一次完全相同；独立 409 回归证明刷新后新提交改用新 key 与 `expectedBatchRevision: 6`。只修改 `ScreenTextWorkspace.tsx` 与对应测试；CSS、视觉、API、后端、迁移、共享契约、DESIGN 及 Rev 1 浏览器矩阵均冻结，未运行完整 `pnpm check`，未提交、推送或部署。任务保持 `review / Current actor=规划对话 / Reviewer=规划对话`。
- FIFO 090 的 v4.3 交接已闭环：状态与日志先写回 v4-227；正式唤醒只发送规划固定对话，未通知 UI；`read_thread` 确认完整 FIFO 090 消息进入规划最新 turn，`wait_threads` 确认规划任务为 `active / inProgress`。同步版本递增为 v4-228，FIFO 090 转 `active`；前端停止修改并等待规划定向微审，用户无需传话。

- 规划已完成 `FRONT-M3-04B` Rev 1 的代码、状态映射与同状态截图预审；页面范围、PostgreSQL/API 权威读取、stale 只读、服务端排序分页、历史 Export 恢复和 1440/1024 主结构均成立，本轮新鲜专项 8/8、前端 TypeScript、Vite 164 modules 与 `git diff --check` 通过。但发现 1 个付费前必须关闭的 P1：`commandIntent` 只冻结了 UI 层 `kind/body/key`，`confirm-empty` 和 `release` 的真实请求体仍在每次 mutation 时从可变化的 `detail.data.revision` 重新组装；未知/可重试失败后若详情因并发或重新聚焦刷新，同一幂等键可能携带不同 `expectedBatchRevision`，后端会稳定返回 `SCREEN_TEXT_IDEMPOTENCY_KEY_REUSED`，与交审所称“同一 kind/body/key”不符。任务集中递增为 `FRONT-M3-04B` Rev 2 `ready / Current actor=前端开发对话 / Reviewer=规划对话`：只把五类命令的完整后端请求身份（kind、batch/episode、episodeNumbers、expectedBatchRevision、manual body）在首次提交时冻结进 intent，并补 `confirm-empty`、`release` 的未知结果→详情修订变化→同键同体回归；不改视觉、API、后端、迁移或其他已通过证据。FIFO 088 关闭，登记 FIFO 089 `notification_pending`；UI 正式终验与完整 `pnpm check` 继续等待该微返工通过。
- FIFO 089 已完成 v4.3 主动送达闭环：规划先写回 v4-225，再只唤醒前端固定对话；`wait_threads` 确认前端明确回执“已收到 FIFO 089”并进入 `active / inProgress`，开始只处理命令意图冻结与两条回归。同步版本递增为 v4-226，FIFO 089 转 `active`，任务转 `in_progress`；未通知 UI，用户无需传话。

- 前端已完成 `FRONT-M3-04B` Rev 1 正式画面字 React 工作台并提交规划独立审核。实现只位于 `frontend/` 与 `tests/frontend/`：在既有 AppShell 接入正式路由，消费 PostgreSQL/正式 API 的门禁、批次/逐集/候选、证据与播放授权、人工命令、不可变 Release/Export；覆盖整剧/选中集/单集、11 类逐集状态、四态候选、服务端批次与 Release 搜索/筛选/排序/分页、候选四排序、当前页与显式跨页待确认选择、保留/忽略/恢复/编辑/人工新增/左右拆分/明确空集、取消/安全失败集重试/需对账、来源 stale 只读唯一新批次入口，以及刷新后原 exportId 下载。网络未知/可重试只重放冻结的 `kind/body/key`，确定性冲突清旧意图并重新读取权威事实；查询身份变化期间旧候选不可继续选择或提交。零网络 Adapter 的证据缺失按真实 `SCREEN_TEXT_EVIDENCE_NOT_AVAILABLE` 显示受控占位和明确阻断，不伪造截图、视频、OCR、用量或成功。
- 新鲜验证：画面字专项 1 文件 8/8、全部前端 9 文件 82/82、前端 TypeScript、Vite 164 modules 生产构建、`git diff --check` 全部退出码 0。Impeccable 单次定向检测发现 8 条同源 `side-tab`，已统一移除单侧粗色边并改为顶边/浅底/内轮廓；新鲜 finish reviewer 在补齐“排序清普通选择”和“命令冻结 kind/body/key”两项修正与回归后结论为 `finish`、无剩余 material finding。真实浏览器完成素材/术语 V1→零网络批次→两候选保留/忽略→1/1 完成→不可变 V1→刷新后同 exportId 下载；控制台 `error/warn=0/0`。1440 根页面 `1430/1430`；1024 展开/收起侧栏分别 204/72px，根页面均 `1014/1014`，候选表容器分别 `560/780`、`692/780`，横滚只在表格容器。最新版证据位于仓库外 `front-m3-04b/formal-1440x900-expanded.png`、`formal-1024x768-expanded.png`、`formal-1024x768-collapsed.png`、`formal-release-history-1440x900.png`；有意差异仅真实 1 集项目、真实完成/Release 状态和当前零网络证据不可用事实。
- v4.3 三段交接已闭环：状态与日志先写回 v4-223；正式唤醒只发送规划固定对话，未直接通知 UI；`read_thread` 确认 FIFO 088 完整消息进入规划最新 turn，`wait_threads` 确认规划为 `active / inProgress`，并明确回执“已收到 FIFO 088，正式前端已交回规划审核”。同步版本递增为 v4-224，FIFO 088 转 `active`；任务保持 `review / Current actor=规划对话 / Reviewer=规划对话`。完整 `pnpm check` 依约留正式 UI 终验后的 S4 单次关闭门；未改 backend、迁移、packages/contracts、DESIGN，未接真实 OCR SDK/网络/密钥/付费/R2，未提交、推送或部署。

- 规划已通过 `BACK-M3-04C` Rev 1 独立复验并恢复 `FRONT-M3-04B` Rev 1。代码审查确认新增能力只位于共享 screen-text 只读契约、项目级批次/Release 列表、候选排序和后端回归；批次按状态及 ID/requestId 搜索、发布按版本/文件名/batchId 搜索，列表均由 PostgreSQL 计算稳定排序、分页和真实 total，历史 Release 忠实返回既有 Export 身份与下载路径；候选默认 `identity_first`，并支持 `time_asc|confidence_desc|pending_first`，全部使用不可变字段补 tie-break。规划新建精确隔离库 `qimao_planning_m304c_20260815`，从零应用 22 个迁移，screen-text 专项 12/12、共享契约与后端构建、`check:repo`、`git diff --check` 全部通过；隔离库已删除且残留 0，共享 PostgreSQL 未停止。`BACK-M3-04C` 标记 done；原 UI/API 冲突已解除。v4.3 派发三段闭环已完成：状态/日志先写回 v4-221，正式唤醒只发送前端固定对话，`wait_threads` 确认 FIFO 087 已明确接收且目标为 `active / inProgress`；任务现为 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`，用户无需传话。完整 `pnpm check` 仍只在正式 React 经 UI 终验后执行一次。

- 后端已完成 `BACK-M3-04C` Rev 1 三项只读解阻并提交规划独立复验：新增项目级批次列表，支持状态、ID/请求标识搜索、`updated_desc|created_desc`、稳定分页和不含 Job 全详情的恢复摘要；新增项目级不可变 Release 列表，支持版本/文件名/batchId 搜索、`version_desc|created_desc`、稳定分页并忠实返回既有 Export 身份与下载路径；候选查询新增默认 `identity_first` 及 `time_asc|confidence_desc|pending_first`，全部以不可变时间与 ID 补稳定次序。列表回归证明空页保留真实 total、跨页无重复漏项、历史下载 ID/字节稳定、读取前后 Release/Cue/Export/command 零新增，未知 sort/字段由 TypeBox 明确拒绝。精确隔离空库 `qimao_back_m304c_20260815_085` 从零应用 22 个迁移，screen-text 专项 12/12、共享契约/后端构建、`check:repo`、`git diff --check` 全部通过；隔离库已删除且残留 0，共享 PostgreSQL 未停止。任务保持 `review / Current actor=规划对话 / Reviewer=规划对话`；v4.3 三段交接已闭环：状态/日志先写回 v4-219，正式唤醒只发送规划固定对话，`read_thread` 确认 FIFO 086 消息进入规划最新 turn 且规划为 `active / inProgress`，FIFO 086 关闭。未运行完整 `pnpm check`，未改迁移、生产前端/DESIGN、Worker/Adapter/写仓储/证据/播放/发布事务，未提交、推送或部署。

- 规划独立核对 `FRONT-M3-04B` Rev 1 的 FIFO 084 冲突并确认成立，现新增最小解阻任务 `BACK-M3-04C` Rev 1。共享契约和正式 API 当前确实只能按已知 `batchId/releaseId` 读取，无法让新开页面从 PostgreSQL 发现批次历史与不可变发布历史；候选查询也没有已确认排序字段且固定按时间排序。前端若使用浏览器缓存、当前页假排序或原型 ID，会破坏唯一权威状态。`BACK-M3-04C` 只补三项只读能力：项目级批次列表、项目级发布列表、候选四种服务端稳定排序；不新增迁移，不改 OCR Worker、写状态机、证据/播放/发布事务、生产前端或冻结 UI。任务转 `ready / Current actor=后端开发对话 / Reviewer=规划对话`，登记 FIFO 085 `notification_pending`；`FRONT-M3-04B` 保持 blocked，待该只读切片规划验收通过后自动恢复。

- `BACK-M3-04C` 的固定契约语义：批次列表支持服务端状态筛选、ID/请求标识搜索、`updated_desc/created_desc`、稳定分页并返回恢复所需批次摘要；发布列表支持版本/文件名/批次身份搜索、`version_desc/created_desc`、稳定分页并返回原 `releaseId`、绑定身份与既有 Export 下载元数据，不创建或重建历史版本；候选排序枚举固定为 `identity_first`（默认，人名条优先后按首次出现）、`time_asc`、`confidence_desc`、`pending_first`，每种都以 `episode_number/start_ms/end_ms/id` 等不可变字段补稳定次序。列表读取不得产生业务写入，来源 stale 只允许既有刷新投影，不得改写历史 Release/Export。

- `FRONT-M3-04B` Rev 1 编码前契约/异步状态映射预检发现 UI 与正式 API 存在阻断性冲突，任务转为 `blocked / Current actor=规划对话 / Reviewer=规划对话`，请求规划按 v4.3 审查。冲突类型为 UI/交互、代码契约与数据所有权：`docs/contracts/M3-screen-text-workflow.md:96,125` 与 `docs/ui/M3-screen-text-acceptance.md:51,55,106,125` 要求批次历史、不可变发布历史下载、服务端候选排序及刷新恢复；但 `packages/contracts/src/screen-text.ts:230-237` 的候选查询没有排序字段，`screen-text.read.repository.ts:112` 只有固定时间顺序，正式路由 `screen-text.routes.ts:77-160` 只有创建和按已知 `batchId/releaseId` 读取，没有项目级批次/发布发现列表。前端若以浏览器缓存保存历史 ID、在当前页假排序或复制原型数据补齐，将违反 PostgreSQL 唯一权威和本任务禁止缓存/前端推算/假数据的硬门。

- 冲突审查最小建议：后端/共享契约补项目级批次列表和发布列表只读查询（服务端搜索/筛选/稳定排序/分页并返回恢复所需 ID 与摘要），并为候选查询补已确认四种服务端排序枚举及稳定次序；无需改迁移、OCR Worker、写状态机或 UI。现有创建、按 ID 读取、候选决定、空集、取消/重试、证据、播放授权和原子发布接口预检可继续复用，但受影响页面无法在缺口关闭前安全局部实现，生产前端与测试均保持未修改。FIFO 083 派发接收闭环关闭；FIFO 084 正式唤醒已只发送规划固定对话，`read_thread` 确认完整消息出现，`wait_threads` 确认规划为 `active / inProgress`，状态/唤醒/送达三段闭环完成。

- 规划已通过 `BACK-M3-04A` Rev 2 独立复验并正式解锁 `FRONT-M3-04B` Rev 1。代码审查确认安全重试/取消未知、整剧完整集与最新术语来源、派生截图对象归属与摘要、严格 `{left,right}` 配对、Attempt Usage 分组均进入正式仓储/Worker/读取链路；规划新建精确隔离库 `qimao_planning_m304a_rev2_20260815`，从零应用 22 个迁移，运行 screen-text/terms/ASR/ASR Dispatch/pre-review 共 5 文件 47/47，并完成共享契约与后端构建，全部通过。隔离库已删除且残留 0，共享 PostgreSQL 保持运行。`BACK-M3-04A` 标记 `done`；`FRONT-M3-04B` 已完成正式唤醒并进入 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`。完整 `pnpm check` 继续只在正式 React 经 UI 终验后运行一次。

- `FRONT-M3-04B` 的唯一权威 UI→前端交接包为：`DESIGN.md` 5.5A、`docs/ui/M3-screen-text-acceptance.md` §1–14、仓库外 `m3-screen-text-rev1` 最终原型/10 张冻结证据、`packages/contracts/src/screen-text.ts` 与正式 `/api/projects/:projectId/screen-text/*` API。正式 React 必须在既有 AppShell 中复原“集/批次队列—紧凑候选表—同源截图/视频证据与编辑”三栏，覆盖双门禁、三范围、11 类逐集状态、四态候选、搜索/筛选/排序/当前页与显式跨页选择、保留/忽略/恢复/编辑/人工新增、左右拆分、人名条、时间编辑、明确空集、取消/安全重试/需对账、来源 stale 只读唯一新批次入口、不可变发布和 SRT 下载。必须用真实后端集数、状态、证据、术语命中、Usage 和版本，不得复制原型参数、匿名数量、对象键、供应商私参或伪造成功；1440×900、1024×768 侧栏 204/72 两态须同状态高保真，根页面无横溢、表格只在容器横滚。允许差异只有真实项目数据、真实媒体可用性和当前零网络 Adapter 的权威结果，均须列入交审差异清单。

- `BACK-M3-04A` Rev 2 的 v4.3 三段交接已闭环：状态与日志先写回 v4-211；正式交审只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知前端；`read_thread` 已确认完整 FIFO 082 / v4-211 消息进入规划当前 turn，`wait_threads` 显示规划为 `active / inProgress`。送达与运行态成立，FIFO 082 关闭；任务继续 `review / Current actor/Reviewer=规划对话`，后端停止修改并等待独立复验，不自行解锁前端。

- 后端已完成 `BACK-M3-04A` Rev 2 五组集中返工并提交规划独立复验：普通重试只允许最新 Attempt 明确可重试且无外部副作用、可安全取消或零候选，需对账永不普通重试，取消后未知结果保持 `reconciliation_required`；整剧范围由最新清单完整集数派生并逐集校验视频，创建/写入/发布固定项目最新 TermVersion；代表截图经引擎中立 InMemory 派生对象接口保存真实字节并按批次归属、摘要、大小和类型读取；发布要求每个保留 pair group 恰为 `{left,right}`；批次 Usage 忠实按持久 Attempt 的 provider/单位/币种分组，同构聚合、异构拆分。精确隔离空库从零应用 22 个迁移，画面字专项 9/9，连同术语/ASR/前置审改 5 文件 47/47，双构建、`check:repo`、`git diff --check` 全部通过；隔离库已删除且共享 PostgreSQL 保持运行。任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO 081 关闭并登记 FIFO 082 `notification_pending`；未运行完整 `pnpm check`，未改生产前端/DESIGN，未接真实 SDK/网络/密钥/付费/R2，未提交、推送或部署。

- 规划已完成 `UI-M3-04` Rev 3 唯一微复验并通过：同形 URL `?view=stale&planning-audit=rev3` 中“忽略”“保留并下一条”“拆分左右”均为 `visible=false / enabled=false`，`#appShell[data-readonly=stale]` 成立，全页唯一可见且 enabled 的 `data-write-action` 确为“从新来源新建批次”，新鲜控制台日志为空。Rev 1/2 已冻结的结构、视觉、响应式、键盘和 10 张证据继续有效；任务标记 `done / Current actor=—`。本次用户授权的 UI 代理验收至此关闭，不再返工页面。

- 规划已完成 `BACK-M3-04A` Rev 1 的一次完整独立审核。新鲜隔离库从零 22 个迁移和现有 screen-text 6/6 均通过，三类 Registry/Worker/持久化主链成立；但现有 6 项测试未覆盖 5 组会影响付费防重、来源一致性和正式证据的 P1：①普通重试可重跑 `reconciliation_required`、不可重试失败或可能已有外部副作用的 Attempt，且取消后未知结果会被压成 `cancelled`；②整剧范围以“已有已校验 screen_video”作为全集，可能静默漏掉缺视频集，且创建/写入/发布未校验批次术语版本仍为项目最新版本；③截图 API 始终生成 `zero-network` SVG，Adapter 只落对象键元数据、没有真实派生截图字节链路；④发布把任意两个不同位置的 pair group 当成左右并把非 left 一律输出为“右”；⑤批次 Usage 把计费单位和币种硬编码为 `zero_network_call / CNY`，不能忠实投影未来云 OCR 回执。任务集中递增为 `BACK-M3-04A` Rev 2 `ready / Current actor=后端开发对话 / Reviewer=规划对话`，一次修完并补上述回归；其余通过项冻结。登记 FIFO 081 `notification_pending`；正式前端继续 blocked。

- `UI-M3-04` Rev 3 的 v4.3 微复验交接已闭环：状态、验收与日志先写回 v4-207；正式交审只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知前端；`read_thread` 已确认完整 FIFO 080 / v4-207 / 三项 `visible=false / enabled=false` 消息进入规划当前 turn，`wait_threads` 显示规划为 `active / inProgress`。送达与运行态成立，FIFO 080 关闭；任务继续 `review / Current actor/Reviewer=规划对话`，UI 停止修改并等待裁决。

- UI 已完成 `UI-M3-04` Rev 3 最后两个 stale 旧草稿动作定向关闭并提交规划微复验：根因是 `.decisionRow { display:grid }` 覆盖了元素 `hidden` 的默认呈现；现增加显式 `.decisionRow[hidden] { display:none }`，并在 stale 投影中原生禁用“忽略”“拆分左右”“保留并下一条”，既有事件守卫继续保留。真实浏览器 DOM：`忽略` 与 `保留并下一条` 均为 `count=1 / visible=false / enabled=false`；全页可见且 enabled 的 `data-write-action` 恰好 1 项，为“从新来源新建批次”。新鲜标签控制台日志为空，`node --check` 与授权文档 `git diff --check` 通过。任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO 079 关闭并登记 FIFO 080 `notification_pending`；Rev 1/2 全部证据冻结，未改 DESIGN、生产前后端、迁移或共享契约，未通知前端。

- UI 已按 v4.3 正式领取 `UI-M3-04` Rev 3：只关闭来源失效态右侧“忽略”“保留并下一条”两个伪可执行旧草稿动作，并用真实 DOM 证明两者不再同时可见且 enabled；“从新来源新建批次”继续是唯一可见且 enabled 的写动作。任务转 `in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`，FIFO 079 转 `active`；Rev 1/2 页面、状态、视觉、响应式、键盘与截图证据全部冻结，不修改 DESIGN、生产前后端、迁移或共享契约。

- 规划对 `UI-M3-04` Rev 2 做新鲜 stale 微复验后发现交审结论仍有 1 个同源缺口：`?view=stale` 的候选复选框、编辑控件、行尾动作与唯一新来源入口符合只读方向，但右侧“忽略”和“保留并下一条”仍是可见且 `isEnabled=true` 的按钮；点击虽被事件守卫拦截并只播报只读，视觉和键盘仍把它们表达为可执行旧草稿写动作，且直接反驳“唯一可见未禁用写动作”的交审事实。其余 Rev 1/2 证据继续冻结。任务递增为 `UI-M3-04` Rev 3 `ready / Current actor=UI 设计对话 / Reviewer=规划对话`；唯一允许修改是把这两个 stale 动作移除、禁用或替换为明确只读查看表达，不改页面、业务、DESIGN 或生产代码。登记 FIFO 079 `notification_pending`；`BACK-M3-04A` 继续由规划审核，`FRONT-M3-04B` 继续 blocked。

- `UI-M3-04` Rev 2 的 v4.3 微复验交接闭环完成：状态、验收与日志先写回 v4-203；正式交审只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`；`read_thread` 已确认完整 FIFO 078 / v4-203 / “从新来源新建批次”消息出现在规划当前 turn，`wait_threads` 显示规划仍为 `active / inProgress`。送达与运行态成立，FIFO 078 关闭；任务继续 `review / Current actor/Reviewer=规划对话`，UI 停止修改并等待 stale 微复验裁决，未通知前端或自行解锁。

- UI 已完成 `UI-M3-04` Rev 2 唯一 stale 只读门禁返工并提交规划微复验：`?view=stale` 现在只有“从新来源新建批次”一个可见、未禁用且不在隐藏祖先内的写动作；人工新增、取消、候选保留/忽略/恢复、左右拆分、批量决定、保存修改、当前页/跨页选择及旧范围空集/重试/发布均被移除、禁用或事件守卫。候选、截图/视频证据、术语命中、历史决定和搜索/筛选/逐集定位保持只读可查。新鲜真实 DOM 证明四个行操作均为“查看”、四个候选复选框与当前页全选禁用、五个编辑控件禁用，第 06 集点击仅播报只读且可见 dialog=0；唯一恢复弹窗打开后聚焦关闭，Tab/Shift+Tab 双向闭环，Escape 回原主入口。新鲜标签控制台 `error/warn=0/0`，`node --check` 与授权文档 `git diff --check` 通过；新增 `10-source-stale-readonly-1440x900.png` 并更新验收记录 §11。任务转 `review / Current actor/Reviewer=规划对话`，FIFO 078 等待规划微复验；Rev 1 其余通过项冻结，生产前后端、迁移、contracts 与 DESIGN 语义未改，前端继续 blocked。

- `UI-M3-04` Rev 2 的定向派发已完成 v4.3 三段闭环：规划先写回状态、验收记录与开发日志 v4-201；正式唤醒只发送 UI 固定对话，没有通知前端；`wait_threads` 已确认 UI 明确领取并为 `active / inProgress`。任务转 `in_progress / Current actor=UI 设计对话 / Reviewer=规划对话`，FIFO 077 `active`；本轮只关闭 stale 旧草稿写入口和补同状态证据，其他 Rev 1 通过项冻结。后端 Rev 1 继续等待规划复验，前端继续 blocked，用户无需传话。

- 规划已完成 `UI-M3-04` Rev 1 的本轮独立代理验收并执行“最多一次集中修正”规则。通过并冻结：既有 AppShell 三栏结构、三种识别范围、逐集与候选状态、当前页/显式跨页选择、左右拆分、失败集唯一重试、竖屏证据 `contain` 放大、弹窗焦点闭环、读取失败唯一恢复、1440 与 1024 侧栏 204/72 两态无根横溢、控制台 `error/warn=0/0`。唯一 P1 为 `?view=stale`：页首已显示“来源已变化 / 旧草稿只读”，但人工新增、保留、忽略、批量决定和保存修改仍为可点击，违反 `DESIGN.md`、UI 验收记录和 S4 契约的只读门禁。任务集中递增为 `UI-M3-04` Rev 2 `ready / Current actor=UI 设计对话 / Reviewer=规划对话`；只允许修正 stale 时的写入口禁用/移除与只读说明，并补同一状态键盘/DOM/截图证据，其余全部冻结。登记 FIFO 077 `notification_pending`；`BACK-M3-04A` Rev 1 继续排队等待规划独立复验，`FRONT-M3-04B` 继续 blocked。

- `BACK-M3-04A` Rev 1 的 v4.3 三段交接已闭环：状态与日志先写回 v4-199；正式交审只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`，未通知前端；规划已明确回执 FIFO 076 收到，目标任务为 `active / inProgress`。规划当前按 FIFO 先完成 UI-M3-04 代理验收，随后独立复验后端并统一决定是否解锁前端。送达与运行态成立，FIFO 076 关闭；后端停止修改并等待规划，不要求用户传话。

- 后端已完成 `BACK-M3-04A` Rev 1 并提交规划独立复验：新增共享 `screen-text` 契约、22 号增量迁移、PostgreSQL 权威批次/逐集/Attempt/候选/不可变人工事件/Release/Cue/Export、短时只读播放授权、有界租约 Worker 与本地 development/独立入口。Adapter Registry 显式登记 `deterministic_fake / cloud_api / self_hosted_worker`，零网络 fake、云 API stub、本地 Worker stub 均通过同一正式 HTTP 创建→Registry→Worker→PostgreSQL→HTTP 读取链路，保存 execution/deployment/能力/输入输出版本/configDigest/inputDigest，响应不暴露对象键、内网地址或 Secret。匿名回归证明双门禁、三范围、术语证据、抽帧/去重、租约接管、取消落账、失败/空结果子集重试、需对账、条件版本/幂等人工事件、人工决定保护、来源 stale、明确空集、左右双轴、人名条证据、原子 Release 与 UTF-8 BOM SRT。任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 076 `notification_pending`；完整 `pnpm check` 仍留 S4 关闭门，前端不得由后端自行解锁。

- `UI-M3-04` Rev 1 的 v4.3 交接三段闭环完成：状态与日志先写回 v4-197；正式交审只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`；`read_thread` 已确认 FIFO 075 完整消息出现在规划最新 turn，`wait_threads` 显示规划为 `active / inProgress`。送达与运行态成立，FIFO 075 关闭；任务继续 `review / Current actor/Reviewer=规划对话`，UI 停止修改并等待规划代理裁决，未通知前端或自行解锁。

- UI 已完成 `UI-M3-04` Rev 1 正式画面字工作台设计并提交规划代理验收：在既有 AppShell 下固定“集/批次队列—紧凑候选表—同源截图/视频证据与编辑”三栏，覆盖三种创建范围、11 类逐集状态、四类候选决定、当前页与显式跨页全选、保留/忽略/恢复/编辑/人工新增、左右拆分、人名条、时间编辑、明确空集、失败重试、取消/需对账、来源失效、发布门禁、不可变 SRT、异步恢复和键盘焦点。`DESIGN.md` 5.5A、`docs/ui/M3-screen-text-acceptance.md`、仓库外可操作原型及 9 张 1440/1024 匿名证据已完成；1024 侧栏 204/72 两态根页面无横溢，控制台 `error/warn=0/0`，Node 语法与授权文档差异检查通过。Impeccable 检测仅以降级正则把模块导航的 `3px` 活动态下划线误报为圆角卡片描边，人工核对不是卡片边框；同线程降级终审为 `disposition: ship`，P0/P1=0。任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，FIFO 075 等待规划代理裁决；不解锁前端，也未修改生产前后端、迁移或共享契约。

- 用户仅对本次 `UI-M3-04` 明确授权规划全权代理交互预览验收，不再等待用户逐张确认。规划将以现有 AppShell/项目工作台为视觉权威，参考成熟生产后台的筛选、状态、证据预览和批量操作方式，并用 Impeccable 做一次完整审查、最多一次集中修正后裁决；不得借授权改变业务范围、设计另一套视觉体系或降低 UI→前端高保真门。后端当前任务同步强化 Adapter 预埋：显式支持 `cloud_api`、`self_hosted_worker`、`deterministic_fake` 三类，至少以零网络云 API stub 和本地 Worker stub 走通同一正式链路；不接真实厂商、网络、密钥或付费。

- UI 已按 v4.3 正式领取 `UI-M3-04` Rev 1：本轮只设计项目内画面字 OCR 工作台，覆盖整剧/选中集/单集、逐集状态、紧凑候选表格、截图/视频证据、术语回执、保留/忽略/恢复/编辑/人工新增、当前页与显式跨页全选、左右拆分、人名条、时间编辑、明确空集、失败重试、发布门禁及完整异步/键盘状态；交付限于 `DESIGN.md`、`docs/ui/M3-screen-text-acceptance.md` 和仓库外匿名可操作原型/1440 与 1024 证据。生产前后端、迁移、共享契约、真实 OCR/API、供应商/模型/密钥/金额/并发/策略墙、字幕验收、任务中心、人物风险、服务器和管理员页面均不在范围；完成后只交规划审核。

- 后端已按 v4.3 正式领取 `BACK-M3-04A` Rev 1：本轮只实现画面字职责矩阵行内的共享 `screen-text` 契约、增量迁移、PostgreSQL 权威批次/逐集/Attempt/候选/人工事件/Release、有界租约 Worker、Adapter Registry、零网络 deterministic fake 和后端回归。任务转 `in_progress / Current actor=后端开发对话`；固定术语版本与 `screen_video` Asset 双门禁、抽帧/去重同构统计、租约接管/取消/失败集重试/需对账、人工决定保护、stale/空集/左右双轴/人名条证据和事务发布是本轮验收边界。生产前端、`DESIGN.md`、真实 SDK/网络/密钥/付费/R2、任务中心、字幕验收、风险/人脸、管理员 API 与服务器全部不在范围，完整 `pnpm check` 留 S4 关闭门。

- S4 首次派发已完成 v4.3 三段闭环：规划先写回 `CURRENT.md` v4-192 与开发日志；正式唤醒只分别发送 UI 固定对话和后端固定对话，没有通知前端；`wait_threads` 已确认 UI 与后端均为 `active / inProgress`。`UI-M3-04` 与 `BACK-M3-04A` 开始受控并行，允许目录互不重叠；`FRONT-M3-04B` 继续 `blocked`，用户不需要传话。

- 用户已确认把画面字 OCR 提升为 S3 后的下一主线。`PLAN-M3-04` 已完成：新增 `docs/contracts/M3-screen-text-workflow.md`，并同步 M3 里程碑、职责矩阵、本地双应用等价矩阵和项目开发约定。S4 固定术语版本 + `screen_video` Asset 双门禁、整剧/选中集/单集、零网络确定性 Adapter、抽帧/去重证据、候选人工裁决、文字/时间/分类/位置修改、左右双轴、人名条证据、明确空集、失败集重试和不可变画面字 SRT。`UI-M3-04` 与 `BACK-M3-04A` 可受控并行；`FRONT-M3-04B` 等待 UI 用户验收和后端规划验收。真实 OCR 厂商、密钥、付费、管理员控制、字幕验收、交付、服务器和部署未授权。

- S3 前置审改模块已正式关闭。`FRONT-M3-03B` Rev 3 的正式 React 微复验 P0/P1=0，Rev 2 高保真、真实差异、五组状态修复、1440/1024 和完整交互矩阵全部冻结通过；规划随后运行本轮新鲜完整 `pnpm check`，仓库检查、lint、全部 TypeScript、数据库迁移、18 个测试文件 157 项测试及共享契约/后端/前端构建全部通过，前端生产构建为 160 modules。`FRONT-M3-03B` 标记 `done / Current actor=—`，至此 `UI-M3-03`、`BACK-M3-03A`、`FRONT-M3-03B` 三项全部关闭。没有提交、推送、部署、购买、付费调用或真实云资源变更；当前 3010 统一预览返回 HTTP 200，3001 `/health` 返回 HTTP 200 且 `database=connected`，55432 PostgreSQL 保持运行，方便用户验收。S3 关闭时记录的原 S4 单剧验收顺序已被后续 `PLAN-M3-04` 用户确认调整为先做画面字 OCR。

- `FRONT-M3-03B` Rev 3 UI 微复验已完成 v4.3 三段交接：状态与日志先写回 v4-188；正式通过结论只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`；`read_thread` 已确认完整消息位于规划当前 turn，`wait_threads` 显示规划为 `active / inProgress`。送达与运行态成立，FIFO 074 关闭；任务继续 `review / Current actor/Reviewer=规划对话`，UI 停止操作并等待规划运行完整关闭门，未通知前端或自行标记 `done`。

- UI 已完成 `FRONT-M3-03B` Rev 3 两场景正式 React 微复验并通过，P0/P1=0。无活动模态层时真实媒体 error 保持 `dialogCount=0`，既有 `role=alert` 自动获得焦点，原文“当前编码不受浏览器支持 / 需要后续兼容代理；当前视频证据已停止播放，不能据此继续看片判断”不变。打开“本集全轴”后初始焦点为“关闭本集全轴”且 `dialog.contains(activeElement)=true`；点击第三行“定位”触发换条目媒体错误后，定位节点随当前事实刷新卸载，焦点按授权回退到抽屉可编程 `ASIDE`，抽屉仍为 `dialogCount=1`、`dialog.contains(activeElement)=true`，后台媒体 alert 未获焦且定位成功播报保留。真实 Tab/Shift+Tab 后焦点继续在 dialog 内，Escape 关闭后回“本集全轴”；控制台 `error/warn=0/0`。Rev 2 全部证据冻结，本轮没有新增截图集、修改生产代码或运行完整 `pnpm check`。临时 3000 与精确日志已清理，3001/55432 保持运行。任务保持 Rev 3 `review` 并转 `Current actor/Reviewer=规划对话`，FIFO 074 等待规划最终审核与关闭门。

- UI 已领取 `FRONT-M3-03B` Rev 3 微复验：任务保持 `review / Current actor/Reviewer=UI 设计对话`。本轮只用正式 React 验证两个变化场景——活动“本集全轴”内定位触发媒体错误后焦点仍属于 dialog，以及没有活动模态层时媒体错误摘要仍正常获焦；Rev 2 已通过的高保真、视觉、响应式、五组 P1、控制台和其他状态全部冻结，不重跑完整矩阵、不新增截图集、不修改生产代码或运行完整 `pnpm check`。

- 规划已通过 `FRONT-M3-03B` Rev 3 微返工差异与定向回归审核，并统一路由 UI 只复验变化场景。生产差异只在 `PreReviewPanels.tsx`：媒体错误 DOM 提交后先读取活动 `aria-modal=true`；定位按钮仍持有焦点时不移动，节点卸载时聚焦可编程抽屉容器，无活动模态层时继续聚焦既有错误摘要。测试只新增定位按钮保留、节点卸载安全回退及无模态层媒体错误自动聚焦；规划新鲜复跑专项 12/12 与差异检查通过，未发现视觉、业务状态、API 或其他文件扩张。任务保持 Rev 3 `review`，转 `Current actor/Reviewer=UI 设计对话`；UI 仅用正式 React 定向复验“全轴定位触发媒体错误后抽屉仍开且焦点仍在抽屉内”及“无模态层错误仍获焦”，其他 Rev 2 完整矩阵全部冻结，不重跑全量截图或完整 `pnpm check`。FIFO 074 等待规划正式唤醒 UI 并确认送达。

- `FRONT-M3-03B` Rev 3 前端→规划的 v4.3 三段交接已完成：状态与日志先写回 v4-184；FIFO 074 正式交审只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`；`read_thread` 已确认完整消息出现在规划当前 turn，规划任务为 `inProgress`。送达与运行态成立，FIFO 074 转 `active`；规划同一 turn 也已明确观察到前端领取与执行过程，FIFO 073 派发事件关闭。前端停止修改并等待规划微返工审核与统一 UI 定向复验路由，未直接通知 UI，用户无需传话。

- 前端已完成 `FRONT-M3-03B` Rev 3 唯一焦点微返工并提交规划审核：`VideoEvidence` 的媒体错误在 DOM 提交后先识别当前 `aria-modal=true` 模态层；被激活的全轴“定位”按钮仍连接且持有焦点时不抢焦点，节点因查询刷新卸载时聚焦可编程抽屉容器，只有没有活动模态层时才继续自动聚焦既有 `role=alert`。媒体错误仍渲染、播报并保持原阻断文案，未改视觉、业务状态或 API。前置审改专项 12/12、前端 TypeScript、Vite 160 modules 生产构建、Impeccable `[]` 与 `git diff --check` 通过。任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 074 `notification_pending`；FIFO 073 的前端派发接收事实已由 v4-183 记录，等待规划在处理本交审时合并关闭。未运行完整 `pnpm check`，未重做浏览器矩阵，未提交、推送或部署。

- 前端已按协议 v4.3 正式领取 `FRONT-M3-03B` Rev 3 微返工：重读项目协议、CURRENT v4-182、UI 终验 §10、开发日志与指定实现边界后，确认唯一根因是后台 `VideoEvidence` 媒体错误聚焦未尊重仍活动的 `aria-modal=true` 全轴抽屉。任务转 `in_progress / Current actor=前端开发对话 / Reviewer=规划对话`；只检查并修改 `PreReviewPanels.tsx` 与对应 `PreReviewWorkspace.test.tsx`，先核对媒体错误 effect、全轴定位按钮和抽屉安全焦点的 DOM 挂载时序，再补“有活动模态层不抢焦点 / 无模态层继续自动聚焦”两类回归。其他 UI、业务、视觉和接口事实继续冻结，不运行完整 `pnpm check`。

- 规划已独立审核并接受 `FRONT-M3-03B` Rev 2 UI 终验的唯一 P1，按 v4.3 微返工快车道合并为 Rev 3：根因是 `VideoEvidence` 的媒体错误 `useLayoutEffect` 在错误状态形成时无条件聚焦遮罩后的 `role=alert`，没有尊重仍打开的 `aria-modal=true` 全轴抽屉。Rev 3 只允许修改 `frontend/src/features/pre-review/PreReviewPanels.tsx` 与 `tests/frontend/PreReviewWorkspace.test.tsx`：当任一活动模态层仍打开时，后台媒体错误仍须渲染和播报但不得抢走模态层焦点；若定位按钮仍存在则保持其焦点，否则回抽屉内安全焦点。回归必须覆盖“打开全轴→定位触发媒体错误→抽屉仍开→`dialog.contains(activeElement)=true`”，并保留无模态层时媒体错误正常获焦。UI 已通过的同状态高保真、真实差异、五组 P1、1440/1024、控制台和其他交互全部冻结；不改媒体阻断事实、视觉、业务状态、后端/契约/DESIGN，不重复完整矩阵或全量截图。任务递增为 Rev 3 `ready / Current actor=前端开发对话 / Reviewer=规划对话`，登记 FIFO 073 `notification_pending`；完整 `pnpm check` 继续留 UI 微复验通过后的关闭门。

- `FRONT-M3-03B` Rev 2 UI 退审已完成 v4.3 三段交接：状态、验收与日志先写回 v4-180；正式唤醒只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`；`read_thread` 已确认 FIFO 072 完整退审消息位于规划当前 turn，规划明确回执将其作为微返工只修焦点所有权、不重做页面或完整矩阵，`wait_threads` 显示规划为 `active / inProgress`。送达与运行态成立，FIFO 072 关闭；任务继续 `review / Current actor/Reviewer=规划对话`，UI 停止操作并等待规划统一路由，未直接通知前端，用户无需传话。

- UI 已完成 `FRONT-M3-03B` Rev 2 的一次性正式 React 终验并退回规划总线：同状态高保真、真实 1 集/媒体不兼容/AI 风险无投影表达、旧响应卸载、未知/409 分流、全局脏态、中缝空 DOM、媒体事实清理、1024/1440 与控制台均通过或按冻结证据成立；但发现 1 个真实 P1。打开“本集全轴”后初始 `activeElement=关闭本集全轴 / dialog.contains(activeElement)=true`，点击任一“定位”后抽屉仍为 `dialogCount=1` 且定位反馈成功，但焦点被遮罩后的媒体错误 `role=alert` 抢走，变成 `dialog.contains(activeElement)=false`，违反 Rev 4“定位后焦点仍在抽屉内”的正式键盘门。P0=0、P1=1、P2=0、P3=0；最小修正只需在全轴仍打开时禁止媒体错误抢焦点，并把焦点保持在定位项或抽屉关闭按钮，不改媒体阻断事实、业务状态或视觉。证据与完整矩阵已写入 `docs/ui/M3-pre-edit-acceptance.md`，新鲜截图在 UI 对话仓库外 `front-m3-03b-rev2-ui-final/`；本轮临时 3000 和精确日志已清理，既有 3001/55432 保持运行。任务保持 Rev 2 `review`，转 `Current actor/Reviewer=规划对话`，FIFO 072 等待规划审核与统一路由；UI 未修改生产代码、未运行完整 `pnpm check`、未直接通知前端。

- UI 已按协议 v4.3 正式领取 `FRONT-M3-03B` Rev 2 终验：任务保持 `review / Current actor=UI 设计对话 / Reviewer=UI 设计对话`。本轮只对正式 React + Fastify/PostgreSQL 做一次有界完整矩阵，按 Product Design Audit 先采集本轮同视口真实截图，再用 Impeccable 核对 UI Rev 4 的层级、密度、状态、键盘与 1024/1440 响应式门；真实 1 集、媒体编码不支持、AI/风险无后端投影均按权威事实验收，不要求伪造 30 集、可播放视频或 AI/风险结果。不修改生产前后端、迁移、共享契约或 DESIGN，不运行完整 `pnpm check`。

- 规划已完成 `FRONT-M3-03B` Rev 2 的 UI→前端映射与代码边界独立审核并通过，现统一路由 UI 做正式 React 终验。规划人工对照 UI Rev 4 权威 1440 参考与前端新 1440/1024 三张证据，确认首屏阅读顺序、摘要与规则层、集/问题双视图、关系带、A/B 双来源、无文字双色中缝、唯一最终稿、视频证据元数据和底部逐条/逐集导航已恢复；真实 1 集、媒体编码不支持、AI/风险无后端投影三项差异均有权威来源且未伪造。代码扫描确认 `beforeunload`、全局 SPA 脏态门禁、`formatOverrideReason`、媒体失败阻断、中缝空 DOM 及上一条/下一条实现存在；规划新鲜复跑前置审改专项 11/11、前端真实 TypeScript 与 Vite 160 模块生产构建均通过，`git diff --check` 无错误。任务保持 Rev 2 `review`，转 `Current actor/Reviewer=UI 设计对话`；UI 只做正式 React 同状态高保真、交互/键盘和真实状态矩阵终验，不修改生产代码，不运行完整 `pnpm check`。状态已写回；正式唤醒只发送 UI 固定对话；`wait_threads` 已确认 UI `active / inProgress` 并明确领取，送达与运行态成立，FIFO 071 关闭。

- `FRONT-M3-03B` Rev 2 的 v4.3 三段交接已完成：状态与日志先写回 v4-175；正式唤醒只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`；`read_thread` 已确认 FIFO 071 完整交审位于规划最新 turn，`wait_threads` 显示规划为 `active / inProgress`，并明确回执正在审核代码范围、状态映射和三张同视口证据，通过后由规划直接唤醒 UI。送达与运行态成立，FIFO 071 转 `active`；前端停止修改并等待规划统一路由，未直接通知 UI，用户无需传话。

- 前端已完成 `FRONT-M3-03B` Rev 2 并提交规划映射审核：查询身份变化期间旧集/旧筛选/旧页条目与全轴定位均卸载；网络未知/`retryable=true` 保留同 body/key，确定性 `409 / retryable=false` 清旧意图、刷新权威事实后由下一次显式动作生成新 body/key；全局 SPA/浏览器离开共用行内脏态门禁，理由保存保持原决定语义；媒体 error/play rejection 明确阻断并提示兼容代理；中缝无文字无符号。正式 React 同轮按 UI Rev 4 恢复首屏阅读顺序、公司稿/中文识别/术语/会话摘要、本地规则与 AI 未启用层、集/问题双视图、关系带、A/B 双来源、唯一最终稿、真实视频证据元数据和上一条/下一条门禁条。前置审改专项 11/11、全部前端 8 文件 73/73、TypeScript、Vite 160 模块构建与 `git diff --check` 通过；Impeccable 只复现 UI Rev 4 已接受的两条 3px 来源顶部内嵌身份线提示。真实浏览器 1440×900 为根宽 `1430/1430`、三栏 `196/640/310px`；1024×768 侧栏 204/72 两态均为 `1014/1014`、横向范围 0，证据区下置，控制台 `error/warn=0/0`。仓库外三张证据位于本前端对话 visualizations 的 `front-m3-03b-rev2/`。有意差异仅为权威真实事实：当前项目 1 集而非原型 30 集、真实媒体编码不受支持而显示同尺寸阻断、AI/风险无后端投影而显示未启用/暂无权威数据；没有伪造参考数据。任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 071 `notification_pending`；完整 `pnpm check` 仍留正式 UI 终验关闭门，未提交、推送或部署。

- 用户已把“已确认 UI 必须由正式前端一致复原”升级为长期强制规则，协作协议更新为 v4.3：UI 用户验收关闭后，`DESIGN.md`、对应 UI 验收记录和指定最终原型/截图共同成为权威设计输入；前端交审必须提供同状态、同视口对照和有意差异清单，功能测试/构建通过不能替代视觉与交互一致性验收。真实集数、媒体、AI/风险和后端状态仍必须如实呈现，不得为还原截图伪造数据；若契约或运行条件无法实现，必须先交规划冲突审查。该规则从正在执行的 `FRONT-M3-03B` Rev 2 起立即生效，并适用于后续全部 UI→前端任务。

- UI→前端统筹责任已明确落到规划总线：规划必须先形成包含权威参考、页面/状态、视口、真实字段映射、允许差异、目录边界和 Reviewer 的单一交接包，前端完成后先经规划映射审计，再由 UI 验收正式 React。FIFO 070 的 v4.3 追加规则已正式发送到前端固定对话；`read_thread`/`wait_threads` 已确认目标保持 `active / inProgress`，前端明确重读 v4.3、保留已完成五组功能修复与 73/73 回归，并把 UI 高保真收口并入同一 Rev 2 后再交审。状态已写回、唤醒已发送、送达/运行态已确认，FIFO 070 关闭，用户无需传话。

- 用户对统一预览提出正式异议：当前 React 前置审改虽然功能已接后端，但没有充分复原已确认 UI Rev 4。规划以同一 `1440×900` 视口并排复核权威参考 `evidence-rev4/20-default-compact-1440x900.png` 与当前 React `front-m3-03b-current-1440x900.png`，确认异议成立。当前生产页额外占用独立顶栏、来源摘要缺少中文识别/本地规则状态层、集/问题队列结构与密度不同、问题关系带/双来源/唯一最终稿的层级与间距明显弱化、视频控制/证据元数据和底部上一条/下一条导航缺失；这不是后端功能缺失可以解释的全部差异。媒体不支持状态、真实集数和 AI 未启用必须继续显示真实事实，不能为还原截图伪造正常视频、30 集、AI 数量或风险命中。规划已把“同状态高保真复原”加入仍在执行的 `FRONT-M3-03B` Rev 2，不另拆第三轮：信息结构与交互 100% 对齐已确认 UI，1440/1024 同视口视觉层级、比例、密度、颜色和组件形态应达到可肉眼确认的高一致；只允许使用真实后端事实，缺字段时保留同构占位/禁用状态。FIFO 070 已完成正式唤醒与运行态确认并关闭；UI 不重新设计，DESIGN 语义不变。

- `FRONT-M3-03B` Rev 2 定向退审已完成 v4.2 三段交接：状态与日志先写回 v4-170；正式唤醒只发送前端固定对话 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf`；`read_thread` 已确认 FIFO 069 完整任务位于前端最新 turn，`wait_threads` 显示目标为 `active / inProgress`，前端已明确回执从列表查询身份、命令幂等意图与全局导航状态转换开始。送达与运行态成立，FIFO 069 关闭，任务转 `in_progress / Current actor=前端开发对话`；规划不并发修改生产前端、不提前通知 UI，用户无需传话。

- 规划已完成 `FRONT-M3-03B` Rev 1 独立审核并一次性退回 Rev 2：本轮新鲜复跑前置审改专项 7/7、全部前端 8 文件 69/69、TypeScript、Vite 160 模块构建、Impeccable `[]` 与 `git diff --check` 均通过；正式 React 页面、API 消费、三画幅 `contain`、AI/风险“未启用”和响应式基础成立。但代码与真实页面审查发现五组 P1：问题列表用 `keepPreviousData` 后切集期间旧集条目仍可操作；所有写命令把确定性 `409 / retryable=false` 版本冲突错误保留为同幂等键重试，现有测试还把该错误伪造成第二次成功；未保存门禁只覆盖页内项目链接与切集/切问题，真实点击全局侧栏可直接离开到 `/projects` 且无提醒，长句理由模式的“保存修改”也会丢失理由语义；视频没有媒体解码/播放失败阻断和兼容代理提示；已冻结的无文字双色中缝被 CSS `content: "⇄"` 重新显示为可见符号。另将同源的全轴翻页旧数据可定位、视频可访问名称与换条目元数据清理纳入同一轮收口，不另开返工。任务递增为 Rev 2、转 `ready / Current actor=前端开发对话 / Reviewer=规划对话`；FIFO 068 关闭，登记 FIFO 069 `notification_pending`。正式前端只修上述根因和高价值回归，不改后端、迁移、共享契约、DESIGN、OCR、字幕验收、交付、真实 AI/风险或转码；本轮规划启动的 3000 预览已停止，既有 3001/55432 保持运行。

- `FRONT-M3-03B` Rev 1 已完成 v4.2 三段交接：状态与日志先写回 v4-168；正式唤醒只发送规划固定对话 `019ff4f8-4a77-7870-8edf-6350490b316c`；`read_thread` 已确认 FIFO 068 完整交审消息位于规划最新 turn，`wait_threads` 显示规划任务为 `active / inProgress`。送达与运行态成立，FIFO 068 转 `active`，任务保持 `review / Current actor=规划对话`；前端停止修改并等待规划独立审核与统一路由，未直接通知 UI，用户无需传话。

- 前端已完成 `FRONT-M3-03B` Rev 1 并提交规划独立审核：正式 React 前置审改工作台已接入来源/术语/会话门禁、集与问题分页队列、公司稿/ASR 只读对照、唯一最终稿、六类决定、文本基准预览/应用、撤销与脏态、格式/至少 8 字长句理由门禁、逐集完成、不可变 release/SRT 下载、来源变化/limited、按需视频授权/三画幅 `contain`/放大和本集全轴只读分页定位；AI 与风险因无权威投影仅明确显示“未启用”，不发请求、不推算、不扫描静态词表。前置审改专项 7/7、全部前端 8 文件 69/69、TypeScript、Vite 160 模块构建、Impeccable `[]`、`git diff --check` 全部通过。真实浏览器用匿名本地项目 `42067015-0605-4c40-8997-cf98923cff91` 验证：1440 根宽 `1430/1440`，1024 展开/收起均 `1014/1024`，三画幅统一 `object-fit: contain`，基准/全轴弹窗焦点闭环、脏态与控制台 `error/warn=0/0` 成立。任务转 `review / Current actor=规划对话 / Reviewer=规划对话`，登记 FIFO 068 `notification_pending`；完整 `pnpm check` 按停止边界留正式 UI 终验后的 S3 关闭门，未提交、推送或部署。

- 前端已正式领取 `FRONT-M3-03B` Rev 1 并完成编码前第一轮异步状态/接口映射预检：现有共享 `pre-review` 契约和 Fastify 路由可权威提供项目/术语门禁、会话与集状态、按集分页问题/全轴、六类决定、基准预览/应用、撤销、逐集完成、不可变 release/SRT 和按条目播放授权；浏览器从真实视频 `loadedmetadata` 读取画幅并统一 `contain`，不建立业务状态副本。当前 AI 运行/进度/数量/成功和风险命中没有投影，正式页只显示“未启用”且不触发请求、不推算数量、不扫描静态词表。未发现需要改共享契约的阻断，任务继续 `in_progress / Current actor=前端开发对话`，下一步先建立唯一 API 错误封装、路由与工作台读取骨架，再逐项接入命令状态闭环。

- `FRONT-M3-03B` Rev 1 派发已完成 v4.2 三段闭环：状态与日志先写回 v4-165；正式唤醒只发送前端固定对话；`read_thread` 已确认 FIFO 067 完整消息位于前端最新 turn，`wait_threads` 显示目标任务为 `active / inProgress`。送达与运行态成立，FIFO 067 关闭，任务转 `in_progress / Current actor=前端开发对话`；前端正在从异步状态转换与现有接口映射预检开始，用户无需传话。规划此时不重复修改业务文件，也不提前唤醒 UI。

- 用户已确认 `UI-M3-03` Rev 4 正式方向。`UI-M3-03` 现关闭为 `done`，已通过的 Rev 1–4 结构、六类决定、格式/长句门禁、三画幅 `contain`、紧凑播放器按需放大、无文字双色来源分隔、本集全轴只读定位及未来 AI/风险占位方向冻结，不再继续 UI 返工。`BACK-M3-03A` Rev 3 与 UI 用户验收双依赖已全部满足，规划同轮解锁 `FRONT-M3-03B` Rev 1 为 `ready / Current actor=前端开发对话 / Reviewer=规划对话`，登记 FIFO 067 `notification_pending`。正式前端只能消费现有 PostgreSQL/共享契约事实；当前没有 AI 运行/进度/数量/成功和风险命中投影，首版须隐藏或明确显示未启用，不得用常量、前端推算、模拟请求或静态词表伪造。完整 `pnpm check` 留正式前端与 UI 终验后的 S3 关闭门。

- 规划已完成 `UI-M3-03` Rev 4 独立审核并通过：本轮重新打开最新原型，以当前浏览器实测默认紧凑页、竖屏放大层、本集全轴定位、AI 运行态及 1024 侧栏两态；1440 根页面为 `1430/1430`，1024 展开/收起侧栏分别为 204/72px 且根页面均为 `1014/1014`。默认播放器实测 `304×172px`，放大层具备 `role=dialog / aria-modal=true`、初始聚焦关闭、Tab 留在弹窗和 Escape 回“放大”；三画幅均 `object-fit: contain`。公司稿/中文识别中缝实测 `textContent="" / aria-hidden=true / 12px`，只显示双色过渡；全轴抽屉是只读 5 行代表数据，覆盖关系、差异、决定、格式、风险与定位，无重复决定动作，定位后状态播报和关闭焦点恢复成立。AI 按钮切换为原位 `role=status` 的 `38/64` 进度，根页面宽度不变。Impeccable 单次降级检测只重复两条来源顶部 3px 内嵌身份线提示；结合本轮截图与计算样式判为既有来源身份标识，不构成新增缺陷。`node --check` 与授权文档 `git diff --check` 均通过，P0/P1=0。FIFO 066 关闭；任务转 `review / Current actor=用户 / Reviewer=用户` 等待方向确认，`FRONT-M3-03B` 仍保持 blocked，不提前通知或解锁前端；当前共享契约没有 AI/风险投影，正式前端不得伪造这些未来状态。

- `UI-M3-03` Rev 4 已完成 v4.2 三段交接：状态与日志先写回 v4-162；正式唤醒只发送规划固定对话；`read_thread` 已确认 FIFO 066 完整消息位于规划最新 turn，规划任务状态为 `inProgress`。送达与运行态成立，FIFO 066 转 `active`；UI 停止修改并等待规划独立审核与统一用户路由，未直接通知或解锁前端。

- UI 已完成 `UI-M3-03` Rev 4 定向收口并提交规划审核：默认播放器保持 172px 紧凑证据并提供同源放大层，竖屏/横屏/方形均为 `object-fit: contain`；公司稿与中文识别之间只保留 `textContent="" / aria-hidden=true` 的无文字双色过渡，关系事实进入问题元数据与只读“本集全轴”抽屉；AI 五态只占摘要原位，风险仅作三层非阻断提示和全轴定位。全轴加载、空、两次失败/恢复、定位同步和放大/抽屉焦点闭环均通过。真实浏览器 1440 为 `1430/1430`，1024 侧栏 204/72 两态均为 `1014/1014`，页面控制台 `error/warn=0/0`；新增 9 张仓库外证据。Impeccable 只重复 Rev 3 已冻结的两条来源身份线降级提示，无新增 P0–P3。`node --check` 与授权文档 `git diff --check` 通过；精确临时服务 37552 已停止。任务转 `review / Current actor=规划对话`，FIFO 066 等待规划独立审核；正式前端仍不得伪造尚无契约投影的 AI/风险事实。

- UI 已按 v4.2 领取 `UI-M3-03` Rev 4：Rev 1/2 的六类决定、格式、键盘、错误恢复和 15 张证据继续冻结，Rev 3 的三画幅 `contain`、来源 A/B 身份与紧凑自动筛选摘要方向保留；本轮只收口默认紧凑播放器按需放大、无文字双色来源分隔、本集全轴浏览/定位、小型 AI 快速筛选未来状态和非阻断风险提示。正式设计前先做异步状态与焦点预检，最多执行一轮完整浏览器矩阵和一轮定向修正；只修改 `DESIGN.md`、UI 验收、仓库外原型/证据及同步文档，不修改生产前后端、迁移或共享契约，不伪造 AI/风险生产事实。

- 用户已确认 `UI-M3-03` Rev 4 定向方向：默认播放器保持紧凑但必须支持点击放大；公司稿与中文识别之间的关系区不得显示文字、编号或比率，只保留低占用的双色过渡分隔，详细关系移入问题元数据与“本集全轴”抽屉；同时增加低强调全轴查阅入口、小型“AI 快速筛选”按钮及原位进度，并把公司稿/ASR/最终稿风险命中收敛为非阻断快速定位。规划已把边界写入前置审改权威契约；AI 运行、进度和风险命中当前仍无后端投影，Rev 4 只做可操作 UI 方向，正式前端不得伪造。状态、契约和日志先写回 v4-159，正式唤醒只发送 UI 固定对话；`read_thread` 已确认 FIFO 065 完整消息位于 UI 最新 turn 且任务为 `inProgress`，送达与运行态成立。同步版本递增为 v4-160，FIFO 065 转 `active`；`FRONT-M3-03B` 继续阻塞到 Rev 4 用户确认。

- 规划已完成 `UI-M3-03` Rev 3 独立审核并通过：本轮重新打开最新原型，采集并人工检查 1440 竖屏、自动筛选依据、1024 方形展开侧栏和 1024 横屏收起侧栏四组新鲜证据；根页面分别保持 `1430/1430` 与 `1014/1014`，侧栏实测 204/72px，三类媒体均为 `object-fit=contain`，窄屏队列不覆盖下置播放器。公司稿/中文识别的独立来源层、中间 `1:2 / 交叠 92% / 组合轴` 关系和下游唯一最终稿层级清楚；自动筛选仍是本地规则优先、AI 可选且失败不阻断的一行摘要，展开控件具备 `aria-expanded/aria-controls`。规划交叉核对共享前置审改契约，确认当前生产契约没有真实 AI 筛选投影，因此 Rev 3 中 `286/14/AI 已关闭` 只作为未来状态设计，`FRONT-M3-03B` 不得伪造这些后端事实；首版只消费已存在的确定性对齐/格式/人工队列事实，并保留后续筛选投影入口。Impeccable 降级检测仍把两条顶部内嵌来源标识线提示为 `side-tab`，人工截图审查确认其用于双来源辨识且未形成卡片侧边装饰，记为检测器误报而非 P1。P0/P1=0，FIFO 064 关闭；任务转 `review / Current actor=用户 / Reviewer=用户`，只等待用户体验确认，确认后同轮解锁 `FRONT-M3-03B`。

- UI 已完成 `UI-M3-03` Rev 3 三项定向增量并提交规划审核：证据播放器依据元数据覆盖竖屏/横屏/方形，媒体层统一 `object-fit: contain` 且 1024 下队列不再压住下置播放器；公司稿与中文识别保持同屏但以独立来源标题/标签/边界和中间 `1:2 / 交叠 92% / 组合轴` 关系层区分，唯一最终稿明确为下游第三层；自动筛选压缩为本地规则优先、AI 可选/可关闭/失败不阻断的一行摘要，并只按需展开当前判断依据。Rev 1/2 的 15 张证据冻结，本轮新增 4 张定向证据。真实浏览器 1440 为 `1430/1430`，1024 侧栏 204/72 两态及三种画幅均为 `1014/1014`、`object-fit=contain`，最终控制台 `error/warn=0/0`。Impeccable 降级检测发现的一条厚色边警告已改为 3px 内嵌标识线并用最终计算样式复核。任务转 `review / Current actor=规划对话`，FIFO 064 等待规划独立审核；未修改生产前后端、迁移或共享契约，不解锁前端。

- `UI-M3-03` Rev 3 已完成 v4.2 三段交接：状态与日志先写回 v4-156；正式唤醒只发送规划固定对话；`read_thread` 已确认完整 FIFO 064 消息位于规划最新 turn，规划任务状态为 `inProgress`。送达与运行态成立，FIFO 064 转 `active`；UI 停止修改并等待规划独立审核与统一用户路由，未直接通知或解锁前端。

- UI 已按 v4.2 领取 `UI-M3-03` Rev 3：Rev 1/2 的状态行为、六类决定、键盘、格式、错误及 15 张证据全部冻结；本轮只补视频证据按元数据适配竖屏/横屏/方形且 `object-fit: contain`、公司稿/中文识别清晰分组与中间关系层、紧凑本地规则优先/可选 AI 自动筛选摘要和按需判断依据。只修改 `DESIGN.md`、UI 验收、仓库外原型/最少新证据及同步文档，不修改生产前后端、迁移或共享契约，不接真实 DeepSeek/API，不扩展系统控制台、OCR、完整风险、时间轴、转码、字幕验收或交付。

- 用户已确认 `UI-M3-03` 正式方向并提出 Rev 3 定向收口：视频证据必须按元数据完整适配竖屏/横屏/方形素材；公司稿与中文识别保持同屏对照，但用清晰来源标题、分组边界和对齐关系层表达彼此独立；页面只预留紧凑“自动筛选”摘要和按需判断依据，不增加模型配置墙。用户同时确认长期保留本地快速筛选与可选 AI 复核，本地规则质量足够时允许关闭 AI；人工操作长期进入后台结构化日志库，由持久化优化智能体按批次归纳规则/提示词/热词/风险词候选，不能逐条自动升级或直接发布。`SYSTEM_CONTROL_CENTER.md`、前置审改契约、架构和本地等价矩阵已同步本地优先、AI 可选、长期日志、优化智能体、评测批准和回滚边界。`UI-M3-03` 递增为 Rev 3 并定向交回 UI；`FRONT-M3-03B` 继续等待 Rev 3 用户确认，避免生产前端返工。真实 AI、管理 API、微调、付费和系统控制台生产实现继续后置。

- `UI-M3-03` Rev 3 派发已完成 v4.2 三段闭环：状态、权威契约和日志先写回 v4-153；正式唤醒只发送 UI 固定对话；`read_thread` 已确认完整 FIFO 063 消息出现在 UI 最新 turn，UI 任务状态为 `inProgress`。送达与运行态成立，FIFO 063 关闭；用户无需传话。UI 后续按协议自行写回领取和交付，规划不在此时解锁前端。

- 规划已独立复验通过 `BACK-M3-03A` Rev 3：代码确认 `completeEpisode` 在既有事务、项目幂等锁、session/episode 行锁内读取数据库 `status/limited_reason`，在任何完成签名、修订或命令写入前稳定拒绝 limited 集；真实 mixed-ASR 回归完整比较失败前后 episode 状态/修订/签名/limited 原因、session 状态/修订、完成命令总数与目标幂等键记录，均零副作用，ready 集完成与 release/SRT 正向路径继续通过。规划精确隔离空库从零应用 21 个迁移，前置审改专项 7/7、后端生产构建和 `git diff --check` 通过；隔离库已删除并确认残留 0，共享 PostgreSQL 保持运行。FIFO 062 关闭，`BACK-M3-03A` 标记 `done`；完整 `pnpm check` 留正式前端终验后的 S3 关闭门。后端依赖已经满足，但 `UI-M3-03` 仍等待用户体验后确认，因此 `FRONT-M3-03B` 暂不解锁、不通知前端。

- `BACK-M3-03A` Rev 3 已完成 v4.2 三段交接：状态与日志先写回 v4-150；正式唤醒只发送规划固定对话；`read_thread` 已确认 FIFO 062 完整消息出现在规划最新 turn，规划任务状态为 `inProgress`。送达证据写回后同步版本递增为 v4-151，FIFO 062 进入 `active`；后端停止修改并等待规划独立复验，未直接通知或解锁 UI/前端。

- 后端已完成 `BACK-M3-03A` Rev 3：`completeEpisode` 在既有事务与 episode 行锁内，以数据库 `status=limited` 或 `limited_reason IS NOT NULL` 为权威完成阻断，稳定返回 `409 PRE_EDIT_COMPLETION_BLOCKED / run_asr`；mixed-ASR 回归证明失败后 episode 状态/修订/签名、session 状态/修订和 `pre_edit_commands` 均零副作用，既有 ready 集完成与 release 正向路径继续通过。精确隔离空库从零应用 21 个迁移，前置审改专项 7/7、后端构建、`git diff --check` 通过；匿名计数为 0，隔离库已删除且共享 PostgreSQL 保持运行。任务转 `review / Current actor=规划对话`，FIFO 062 为 `notification_pending`；未改迁移、共享契约、生产前端或 `DESIGN.md`，未运行完整 `pnpm check`，未提交、推送或部署。

- 后端已领取 `BACK-M3-03A` Rev 3：本轮只在 `completeEpisode` 现有事务与 episode 行锁内阻断 `status=limited` 或 `limited_reason IS NOT NULL`，补 mixed-ASR limited 完成失败的全量零副作用回归，并保留 ready 集完成/release 正向回归。任务转 `in_progress / Current actor=后端开发对话`；Rev 2 已通过的 Worker、来源、术语/时长、策略、幂等和 8 字理由全部冻结，不改迁移、共享状态机、UI 或前端。

- 规划已完成 `BACK-M3-03A` Rev 2 独立复验：可停止 Worker/租约所有者保护、当前清单同视频 ASR 绑定与旧结果隔离、固定术语证据、权威视频时长、仅安全一对一的 `asr_text_primary`、preview/apply 同计算、项目+幂等键串行化及 trim 后至少 8 字理由均成立。规划在精确隔离库从零应用 21 个迁移，前置审改/术语/ASR 三文件 30/30、共享契约与后端构建、`check:repo`、`git diff --check` 均通过；隔离库已删除并确认残留 0，共享 PostgreSQL 保持运行。但真实隔离样本确认一个 P1：`status=limited / limited_reason=ASR result missing` 的缺 ASR 单集仍可被正式 `completeEpisode` 成功写成 `completed` 并生成完成签名，违反“有限审改不得冒充完成 ASR 对照”，现有测试只断言进入 limited 而未覆盖完成门禁。任务一次性递增为 `BACK-M3-03A` Rev 3，只在事务内阻断 limited 单集完成并补正反向回归；Rev 2 其他通过项全部冻结，`FRONT-M3-03B` 不解锁。状态/日志先写回 v4-147；正式退审只发送后端固定对话，`read_thread` 已确认完整消息出现且后端明确回执“已领取 / in_progress”，送达与运行态成立；后端领取写回 v4-148 后，规划将闭环确认最小合并为 v4-149，FIFO 061 关闭。

- 后端已完成 `BACK-M3-03A` Rev 2 四组 P1 与 v4-143 长句理由补充：可停止 Worker/租约所有者保护、当前视频 ASR 绑定与 mixed-ASR limited、固定术语证据/权威视频时长/同计算策略 preview、项目+幂等键事务串行化及 trim 后至少 8 字理由均已落地。精确隔离空库从零应用 21 个迁移，前置审改专项 7/7，连同术语/ASR 三文件 30/30，双构建、`check:repo`、`git diff --check` 全部通过；匿名数据 0，隔离库已删除且共享 PostgreSQL 保持运行。任务为 `review / Current actor=规划对话`；正式唤醒已只发送规划固定对话，`read_thread` 已确认 FIFO 061 完整消息位于规划最新 turn 且状态为 `inProgress`，队列转 `active`。未改生产前端/DESIGN，未运行完整 `pnpm check`，未提交、推送或部署。

- 规划在 `UI-M3-03` Rev 2 通过后完成前后端契约交叉检查，发现可在当前后端 Rev 2 内提前消除的一处同源偏差：正式 UI 与 `DESIGN.md` 要求长句保留理由至少 8 字，但共享 `CreatePreEditDecisionBody.formatOverrideReason` 当前仍为 `minLength: 1`，仓储只做非空 trim。为避免正式前端集成后再返工，`BACK-M3-03A` Rev 2 增加最小对齐要求：共享契约和后端权威校验统一 trim 后至少 8 个字符，并补“不足 8 字不落事件/不解除门禁、8 字以上可审计保存”的定向回归；这不改变既有格式状态机、UI 方向或任务边界。状态/日志已写回 v4-143；正式补充只发送后端固定对话，`wait_threads` 已确认后端明确回执“已收到并入当前 Rev 2 / in_progress”，送达与运行态成立，未通知 UI/前端。送达证据最小写回后同步版本递增为 v4-144。

- 规划已完成 `UI-M3-03` Rev 2 独立审核并通过：对照前置审改权威契约、`DESIGN.md` 5.7、Rev 2 验收记录、原型源码和 5 张定向证据，确认 `company_only` 写入 `keep_company/公司轴 118`、`asr_only` 写入 `add_asr/识别轴 132`，`limited` 仅保留公司稿与格式处理且保持双源完成禁用；应用内浏览器新鲜复验真实 Tab 顺序包含两组 radio，Escape 回原触发点，长句不足 8 字不放行、有效理由与真实裁短分别形成 `reason_recorded/text_shortened`，1024 根页面无横溢且控制台 0/0。Impeccable 检测为 `[]`，但仍按解析器缺失的正则降级只作辅助；本轮以截图、源码和真实 DOM/键盘为主要证据。P0/P1=0，任务转 `review / Current actor=用户 / Reviewer=用户`，只等待用户确认正式 UI 方向；`FRONT-M3-03B` 仍须同时等待用户确认 UI 和 `BACK-M3-03A` Rev 2 规划验收，不提前解锁。

- UI 已完成 `UI-M3-03` Rev 2 四项定向收口并提交规划审核：`company_only` 与 `asr_only` 的可见动作、决定类型、最终文本和时间来源均绑定各自真实轴；`limited` 已移除全部 ASR 决定并保持双源完成禁用；文本基准弹窗真实 Tab/Shift+Tab 覆盖范围与基准 radio，Escape 恢复原触发点；`>28` 字同时支持真实裁短和保存至少 8 字明确理由，两者均形成完成门禁可读取的审计事实。Rev 1 的 10 张整体证据冻结，本轮新增 5 张定向证据；1024 侧栏 204/72 两态根页面均 `1014/1014`，最终控制台 `error/warn=0/0`。任务保持 `review / Current actor=规划对话`；正式唤醒已只发送规划固定对话，`read_thread` 已确认 FIFO 060 消息位于规划最新 turn 且状态为 `inProgress`，队列转 `active`。未修改生产前后端、迁移或共享契约，不解锁前端。

- 后端已按 v4-138 正式领取 `BACK-M3-03A` Rev 2，并确认一次性只修四组 P1：可运行 Worker/租约所有者、当前清单 ASR 绑定与 limited、策略预览/术语证据/权威视频时长、并发同键串行化。任务保持 `in_progress / Current actor=后端开发对话`；Rev 1 已通过的六类人工决定、撤销、stale、release/SRT 和只读播放冻结，不改生产前端/DESIGN，不运行完整 `pnpm check`。

- UI 已按最新 v4-134 领取事实确认 `UI-M3-03` Rev 2：Rev 1 已通过的三栏布局、视觉、来源失效、视频证据、错误恢复、响应式和 10 张证据全部冻结；本轮只收口 companyOnly/asrOnly 决定语义、limited ASR 动作限制、文本基准 radio 完整键盘闭环和 `>28` 字可审计保留理由，并新增四项定向证据。任务保持 `in_progress / Current actor=UI 设计对话`，不修改生产前后端、迁移或共享契约。

- 规划已完成 `BACK-M3-03A` Rev 1 独立复验并退回 Rev 2：隔离空库从零应用 20 个迁移，前置审改/术语/ASR 三文件 27/27、共享契约与后端构建、`check:repo`、`git diff --check` 全部通过，隔离库残留 0 且共享 PostgreSQL 保持运行；但代码与真实运行链路审查发现四组 P1 根因。前置审改 Worker 没有开发或部署运行入口，正式会话会停在 `preparing`；ASR 结果没有限制为当前清单绑定的同一视频 Asset，素材换版后可能给新会话选到旧视频识别结果；`asr_text_primary` 会自动应用到组合轴且没有术语冲突证据或保存前权威影响预览；项目级幂等命令在并发同键请求下没有串行化重查，Worker 回滚后的失败写入也没有校验当前租约所有者。另需把已有 `after_video_end` 契约接入权威视频时长事实并补 mixed-ASR/limited 回归。任务一次性退回 `BACK-M3-03A` Rev 2，只修运行闭环、来源绑定、策略/术语/格式投影与并发一致性；不改 UI、不接真实供应商/R2/转码/OCR。FIFO 059 进入 `notification_pending`，`FRONT-M3-03B` 继续阻塞。

- 规划对 `UI-M3-03` Rev 1 的范围、权威契约、10 张交付截图和仓库外原型源码完成独立审计：整体三栏信息架构、公司稿/ASR/组合轴/唯一最终稿、来源失效、格式事实、视频证据和 1440/1024 方向成立，且未越界吸纳 OCR、字幕验收或交付；但送用户前仍有三个 P1 同源行为缺口。`companyOnly/asrOnly` 只替换按钮文案而继续调用普通双源事件，可能把“无可用识别轴”写入最终稿；`limited` 只增加提示条却仍保留采用 ASR 等双源动作；文本基准弹窗的焦点循环只枚举 button，键盘无法到达基准范围/策略 radio。另有一个契约缺口：`>28` 字只有“修正文案”，没有权威契约允许的“明确保留理由”。任务定向退回 `UI-M3-03` Rev 2，只修状态专属动作、键盘可达性、长句合法处理路径及对应证据；布局、视觉、其余 10 张已通过证据冻结，`FRONT-M3-03B` 不解锁。
- `UI-M3-03` Rev 2 退审已按 v4.2 完成三段闭环：状态/日志先写回 v4-132；正式唤醒仅发送 UI 固定对话；`read_thread` 已确认完整退审消息位于 UI 最新 turn 且状态为 `inProgress`，未发生发送失败或重试。FIFO 058 关闭，UI 进入定向修正，后端继续不重叠开发，用户无需传话。

- `UI-M3-03` Rev 1 已完成 v4.2 三段交接：状态与日志先写回 v4-130；正式唤醒只发送规划固定对话；`read_thread` 已确认 FIFO 058 消息位于规划最新 turn 且规划进入 `inProgress`。送达证据写回后同步版本递增为 v4-131，FIFO 058 进入 `active`；UI 当前停止修改，等待规划独立审核与统一用户路由。

- UI 已完成 `UI-M3-03` Rev 1 正式前置审改设计并提交规划审核：`DESIGN.md` 5.7 已以公司 SRT/ASR/组合轴/唯一最终稿为唯一范围，仓库外原型覆盖集/问题队列、六类上下文决定、文本基准人工保护、撤销与脏态、格式门禁、逐集完成、直接 MP4、来源失效、再次失败和提交中焦点锁定。1440 根页面 `1430/1430`，1024 展开/收起均 `1014/1014`，最终控制台 `error/warn=0/0`；Impeccable `[]` 为解析模块缺失下的正则降级结果，已由真实浏览器 DOM/键盘/截图补足。任务保持 Rev 1 转 `review / Current actor=规划对话`，FIFO 058 等待规划独立交接审计；未修改生产前后端、迁移或共享契约。

- UI 已按 v4.2 领取 `UI-M3-03` Rev 1：完整重读前置审改契约、职责/等价矩阵、M3 冲刺、现有 DESIGN 与本地只读等价实现，确认采用既有 AppShell 下的高密度三栏工作台；本轮只写 DESIGN、UI 验收、仓库外原型/证据和同步日志，不修改生产前后端、迁移或共享契约，不扩展 OCR、完整风险、任意时间轴、转码、字幕验收或交付。

- 里程碑 1 工程骨架已经形成可回退的本地 Git 基线：提交 `4c90ac5`，标签 `m1-baseline`。
- 里程碑 2 产品范围已经确认：项目中心、大文件上传生命周期和回收站。
- 用户已授权把协作升级为四个固定角色和同一仓库流水线：规划、UI 设计、后端开发、前端开发。`docs/WORKFLOW.md` v4.1 已规定目录所有权、契约唯一写入者、受控并行、交接总线、微返工快车道、质量门、阶段简报与持续改进机制。
- 规划自动交接继续采用动态先进先出队列：谁先完成并首次有效通知，谁先取得到达序号；规划审核同时最多一个 `active` 交接，但已经解锁、文件范围互不重叠的 UI、后端、前端任务可以受控并行，同一纵向切片默认最多三个执行任务。
- 用户已确认主管式冲突审查机制：所有角色可对产品、UI、接口、数据、成本和实现提出有证据的专业异议；受影响任务暂停并交给规划分类审查。规划在已确认范围内直接裁决实现/契约问题，涉及体验、范围、成本或数据策略时提供选项并与用户共同取舍，再一次性同步所有角色。
- 用户已确认所有跨角色交接升级为“规划总线”：UI、前端、后端的交付、验收、退审、冲突和下一任务解锁均须先回到规划 FIFO 队列。规划先审查范围、颗粒度、证据、依赖、清理与下一接收者，再统一通知 Reviewer、返工 Owner 或下一角色；任何执行角色不得直接互相接力、自行标记最终完成或解锁后继任务。
- 用户已确认协作协议升级为 v4.1：保留规划总线和质量下限，同时增加最多 2 文件/无接口状态变化的微返工快车道、异步交互完整状态转换预检、每切片一次完整浏览器矩阵加定向复验、同步版本与产品进度分离的阶段简报，以及当前切片通过后同轮自动解锁预备任务。原始失败经一次修复仍失败时停止第三个局部补丁，改做根因/状态时序审查。
- 规划已审核 UI 对 `FRONT-M2-04B` 提交的共享 MP4 冲突并确认成立：后端素材清单验证与资产绑定已经允许同集 `asr_video + screen_video` 共享同一 MP4，前端素材确认的 `findPairingBlockers` 却对任意重复路径一律阻断。裁决只修正前端共享例外并补回归，不改上传页主体、后端、共享契约或已验收视觉。
- 前端已完成共享 MP4 定向返工并通过规划总线交接审计：规划独立代码核对确认共享例外与后端一致，独立复跑素材与上传两个前端测试文件 13 项全部通过，完整 `pnpm check` 退出码 0。任务已重新路由 UI，只继续此前暂缓的真实页面验收，不重做已有证据。
- 规划已审核 UI 对 `FRONT-M2-04B` Rev 13 的余项复验并确认退审成立：共享入口、错误恢复、完成态、后端 `ready` 和控制台均通过，唯一缺口为 1024×768 的页面级横向溢出。该问题属于已确认设计内的前端布局实现缺陷，定向退回前端只修主内容列/上传容器收缩与滚动归属；其余通过项冻结，不重做、不扩展业务范围。
- 前端已完成 1024×768 横溢定向修复并通过规划交接审计：唯一生产改动是上传页 Grid 显式允许收缩并让表格滚动容器包含绝对定位的无障碍文本；规划独立复跑上传专项 7/7、前端构建 138 模块通过。任务只路由 UI 复验侧栏展开/收起两态，其他已通过流程继续冻结。
- `FRONT-M2-04B` 已完成最终验收：规划复核 Rev 8/13 的冻结业务证据与 Rev 18 两张 1024×768 终验截图，确认共享上传、错误恢复、完成态、1440 页面、控制台和 1024 展开/收起滚动归属全部通过。正式多文件上传队列本切片关闭；M2 下一开发切片须先由用户选择“本地回收站优先 / 真实 R2 优先 / 暂停开发”，当前未解锁任何实现或云资源。
- 用户已在 `PLAN-M2-05` 明确选择方案 A：先基于现有 Storage fake 完成本地项目回收站，不购买或连接真实 R2。规划已复用既有 48 小时项目级恢复、无立即物理删除、清理租约/审计和失败重试契约；当前只等待用户确认“回收时如何处理未完成上传”，确认后再拆 UI、后端、前端任务。
- 用户再次确认先把回收站完整做完，再进入术语与核心工作台。`PLAN-M2-06` 采用推荐行为并关闭：回收立即终止未完成上传，恢复保留已完成 Asset/清单但不复活未完成会话。`UI-M2-04` 与 `BACK-M2-06` 已按同一契约并行解锁；`FRONT-M2-06` 等待两项分别验收后再集成。
- 规划已通过 `UI-M2-04` Rev 3 交接审计：范围严格限定项目级回收、恢复和清理状态，确认框后果、48 小时窗口、不可恢复边界、失败重试表达与五张截图一致；1440/1024 无页面级横溢，控制台 0 错误/警告。任务已路由用户只验收正式交互方向，仍未解锁前端；1024 紧凑表格的少量横滚留在表格容器，正式实现须保证恢复主操作可通过键盘和表格滚动到达。
- 用户已确认 `UI-M2-04` 正式回收站交互方向；任务标记完成，UI 进入等待。`FRONT-M2-06` 仍只缺 `BACK-M2-06` 规划独立验收这一项依赖，后端当前继续开发，规划不会提前解锁或让用户传话。
- 规划已完成 `BACK-M2-06` Rev 3 交接审计：本地迁移成功，回收专项独立复跑 6/6，通过事务锁、幂等回收/恢复、终止未完成会话、Storage fake 重复清理、租约接管、对象缺失和失败重试等核心行为；但共享 API 尚不能完整支撑已经验收的正式回收站。回收成功响应没有返回已终止上传数量，列表没有稳定的回收时间事实与服务端名称/回收时间排序，查询也不能在分页前单独筛选 CleanupJob 重试状态。任务已定向退回后端 Rev 4，只补这三类契约/投影及回归；`FRONT-M2-06` 继续阻塞，禁止前端猜数量或做单页假排序/假筛选。
- 规划已独立复验通过 `BACK-M2-06` Rev 6：代码审查确认回收首调/重放从幂等命令记录返回同一 `terminatedUploadCount`，CleanupJob 每次回收重置的 `created_at` 作为稳定 `recycledAt`，三类排序使用白名单列并在数据库 `LIMIT/OFFSET` 前执行，`cleanupJobStatus` 直接筛选后端权威状态；独立回收专项 7/7 与完整 `pnpm check` 均退出码 0，本地 PostgreSQL 已停止。后端任务关闭，UI 与后端两项依赖同时满足，`FRONT-M2-06` 已由规划解锁为正式回收站前端集成。
- 规划已审核 `FRONT-M2-06` Rev 4 交接：项目中心回收、正式回收站、服务端查询、后端权威状态、幂等重试、响应式证据与范围边界均完整，独立专项 2 文件 11/11 通过；但“项目已清理”提示仍有一个权威事实缺陷。当前实现把同一查询中任意 `purging` 项消失都判为已清理，在 `cleanupJobStatus=retryable` 等筛选下，Worker 仅把任务重新领取为 `leased` 就会从结果消失并被误报成功；返回总数超过当前 100 条窗口时也不能由缺席证明已清理。任务已定向退回前端 Rev 5，只修安全确认条件并补负向回归，UI 尚未被通知。
- 规划已独立复验通过 `FRONT-M2-06` Rev 7 定向修正：同一查询前后只有在结果均完整且没有 CleanupJob 状态筛选时才允许从 `purging` 项缺席提示已清理；`retryable → leased` 筛选迁移与不完整结果窗口两项负向回归均成立，原完整窗口正向提示保留。规划独立项目中心+回收站专项 13/13、前端生产构建 141 模块通过；任务已路由 UI 设计对话只做正式页面真实浏览器终验，Rev 4 浏览器业务链路和响应式证据继续冻结。
- UI 已完成 `FRONT-M2-06` Rev 8 正式页面终验：回收站主体状态、恢复成败、请求标识、服务端筛选排序、已清理轮询提示、1024 侧栏两态滚动归属和控制台均通过；但项目中心回收确认框打开后焦点仍留在遮罩后的触发按钮，Tab/Shift+Tab 未进入弹窗、Escape 不关闭，取消或确认后焦点落到 `body`。该缺口违反已确认的确认框键盘/焦点验收项，领域结论不通过；任务只交回规划裁决，已通过部分冻结。
- 规划已按 Impeccable 无障碍审计规则复核并确认 `FRONT-M2-06` Rev 9 退审成立：现有确认框只有 `role=dialog/aria-modal` 声明，没有打开后焦点进入、Tab/Shift+Tab 闭环、Escape 关闭、取消恢复触发点或成功后的确定焦点落点；机械检测无静态告警不推翻真实浏览器 DOM/键盘证据。任务已定向退回前端 Rev 10，只修项目中心确认框焦点管理和对应回归；回收站主体、文案、视觉、API、状态机、九张截图和所有已通过业务证据冻结。
- 规划已通过 `FRONT-M2-06` Rev 12 交接审计：改动严格限定 `ProjectCenter` 与对应测试，初始焦点、Tab 双向闭环、非提交 Escape、三种取消路径的触发点恢复、失败留框和成功消息聚焦均与退审要求一致；独立复跑项目中心+回收站 15/15、前端生产构建 141 模块及 `git diff --check` 全部通过。任务已路由 UI 只做确认框真实键盘终验；提交中不得关闭或重复提交，并须确认焦点仍被约束在弹窗语境内。回收站主体及其他冻结证据不重做。
- UI 已完成 `FRONT-M2-06` Rev 13 真实键盘终验：打开聚焦取消、Tab/Shift+Tab 双向闭环、Escape/取消/遮罩恢复本次原始行触发按钮、成功后聚焦既有 `role=status` 及控制台 0/0 均通过；但真实 409 失败后弹窗虽保留，焦点在 500ms 与 1.2s 两次读取都落到 `body`，没有留在弹窗内部。提交中本地请求未形成可观察挂起窗口，本轮不冒充动态通过；回收站主体与 Rev 8 证据继续冻结。任务只交回规划裁决。
- 规划已按 Impeccable 无障碍审计规则确认 `FRONT-M2-06` Rev 14 退审成立：静态检测为 `[]`，但真实 409 的两次稳定 DOM 读取证明存在一个 P1 动态焦点缺陷。源码只在 `onError` 的单次 `queueMicrotask` 中检查焦点，可能早于 React Query 错误态提交和浏览器对禁用按钮的焦点脱落；现有单元测试也没有复现该真实时序。任务已定向退回前端 Rev 15，只把失败后的焦点恢复改为错误状态渲染提交后的确定行为并补延迟失败回归；下一轮 UI 用可控延迟请求一次性复验失败焦点和提交中锁定。其他通过项全部冻结，工作台任务继续不发布。
- 规划复验 `FRONT-M2-06` Rev 17 时确认原 409 失败聚焦修正成立，独立专项 15/15、构建 141 模块、Impeccable 静态检测 `[]` 和 `git diff --check` 均通过；但同一延迟测试暴露下一轮既定终验仍不可满足。提交中两个按钮同时禁用、弹窗容器不可聚焦，真实 Chrome 已证明焦点会从禁用按钮掉到 `body`；此时 Tab/Escape 不再经过弹窗 `onKeyDown`，现有测试只检查关闭受阻并在之后手工 `blur()`，没有验证提交中焦点约束。为避免再送 UI 后退审，任务保持前端定向返工：提交中把焦点确定放到可编程聚焦的弹窗容器并验证 Tab 不逃逸；原错误态 effect 与所有通过项冻结。
- 规划已通过 `FRONT-M2-06` Rev 20 送审前审计：dialog 现可编程聚焦，状态 effect 在 pending 聚焦 dialog、error 聚焦重新启用的取消，success 仍聚焦状态消息；延迟回归直接覆盖 pending 焦点、Tab/Shift+Tab/Escape/遮罩不逃逸和单次请求。规划独立专项 15/15、前端构建 141 模块、Impeccable 检测 `[]`、`git diff --check` 全部通过，范围审计未发现新的 P0–P3。任务已路由 UI 只做最后一次真实动态终验；通过后由规划运行完整 `pnpm check` 并关闭回收站，工作台任务仍未发布。
- UI 执行 `FRONT-M2-06` Rev 21 最终动态终验：正式 409 在 500ms/1.2s 两次读取都已聚焦“取消”且焦点位于 dialog 内，A 项通过；B 项因当前 in-app Browser 的安全隔离上下文不暴露 `window.fetch`/XHR/脚本创建能力，且 `javascript:` 同页注入被安全策略明确拒绝并禁止绕过，无法安装页面内临时 fetch 延迟器。包装器从未安装，原 fetch 未被替换；该项是验收环境阻断而非产品失败，也不能冒充通过。任务交回规划决定补充合规终验环境或接受 Rev 20 延迟 DOM 自动化为等价证据。
- 规划接受 Rev 20 的可控延迟 DOM 回归作为提交中锁定的等价证据：该测试直接覆盖 pending dialog 焦点、按钮禁用、Tab/Shift+Tab/Escape/遮罩不逃逸、单次请求、失败恢复与同幂等键重试；UI 的真实 409 已补足浏览器错误态证据。用户授权后的最终完整 `pnpm check` 退出码 0，本地 PostgreSQL 已正常停止；`FRONT-M2-06` 与项目回收站纵向切片正式关闭。
- 用户确认内部可用工作台以 2026-08-27 为最晚日期、允许更早交付且必须保证基础质量。M3 快速冲刺采用“术语确认 → ASR → 前置审改 → 单剧验收”四个纵向切片，细节见 `docs/milestones/M3-internal-workbench-sprint.md`；当前只开启下一轮产品规划协商，不先发布 UI/后端/前端业务实现任务。
- `PLAN-M3-01` 已完成旧工作台术语流程、现有 XLSX 模板和用户最新提示词的融合草案：正式对外收敛为八类，保留全剧高召回、真实 SRT 证据、人工四态、不可变版本与模板导出，舍弃过度删除特指职位别称和直接外露旧 17 类的做法。草案见 `docs/contracts/M3-terms-workflow.md`，当前交给用户审核；确认前不发布执行任务。
- 针对云端 API 密钥暴露问题，`PLAN-M3-01` 草案新增双控制台安全边界：原始密钥只由部署所有者写入云平台 Secret 管理设施，网站业务控制台未来只管理启停、模型、预算、并发、用量和 Secret 引用；员工浏览器只创建本系统任务，由后端 Worker 读取密钥调用供应商。无应用账号阶段必须先用身份感知代理/VPN/允许名单保护整站，不得公开裸奔。
- 用户已确认 `PLAN-M3-01` 融合方案及双控制台安全边界。术语产品/数据契约升格为 M3 S1 权威基线，规划已关闭该任务并按同一纵向切片发布 `UI-M3-01` 与 `BACK-M3-01A` 并行；`FRONT-M3-01B` 仅登记为依赖阻塞，必须等待两项分别通过规划审核后才能领取。
- 规划已通过 `UI-M3-01` Rev 1 范围与视觉证据审计：页面严格限定项目工作台“术语”模块，来源门禁、正式排序、紧凑表格、证据侧栏、四态人工裁决、批量栏、不可变版本与来源过期均与 S1 契约一致；6 张 1440/1024/侧栏/来源变化/版本确认证据未发现 P0/P1 或跨模块越界。任务现路由用户只做方向验收；规划任务内因浏览器安全策略不能重新打开另一任务的 `file://` 原型，已把该项记录为证据限制，正式前端仍须补确认框 DOM 回归与真实键盘终验。`FRONT-M3-01B` 继续等待用户通过 UI 方向及后端规划独立验收，不提前解锁。
- 规划已完成 `BACK-M3-01A` Rev 1 首轮独立复验：从零 12 个迁移得到 11 张术语表和 3 个不可变触发器；术语专项 8/8、全部后端 51/51、共享契约/后端构建、仓库检查及实际五列 XLSX 导入渲染均通过，来源、证据、四态事件、V1→V2、回收清理和零付费边界成立。但人工新增接口只依赖 schema 的原始 `minLength: 1`，`name = "   "` 经 `trim()` 后直接写库，会触发数据库检查约束并被全局处理成可重试 `500 INTERNAL_ERROR`；同一名称跨类型冲突文案也仍误称“相同类型和名称”。该 P2 输入边界会进入正式员工表单，已合并为一次最小 Rev 2 返工：仓储层写入前拒绝空白规范名并返回稳定 `422 TERM_CANDIDATE_INVALID`，同时修正文案并补 API 回归。其余通过项冻结，前端不解锁。
- 规划已独立复验通过 `BACK-M3-01A` Rev 2：空白名称在写库前稳定返回 `422 / TERM_CANDIDATE_INVALID / edit_candidate` 且不推进草稿修订，跨类型同名返回准确的草稿级唯一性文案；本轮术语专项 8/8、后端生产构建和 `git diff --check` 通过，本地 PostgreSQL 已停止。任务关闭，不因新增导出模板范围回开。
- 用户确认 `UI-M3-01` 整体方向，并补充快速工作流：可以从本页选择进一步切换为“选择全部待确认候选”，一次完成全部采用、创建不可变版本和 XLSX 下载；局部失败时停止版本/导出并逐项说明。用户同时要求导出表头可由模板编辑并由后端保存。规划把模板收敛为公司级、版本化的五字段表现配置：首版只改模板名、五个表头名称与顺序，不删字段、不加任意字段、不改变术语数据；历史导出绑定原模板版本。
- `UI-M3-01` Rev 2 与独立的 `BACK-M3-01C` 已按同一契约受控并行：UI 只更新全部采用/导出及模板管理交互，后端只实现公司模板版本与确定性导出；`FRONT-M3-01B` 继续等待两项完成和规划审核，不提前领取。
- UI 已完成 `UI-M3-01` Rev 2 增量设计：Rev 1 已确认结构保持不变；当前页选择可显式升级为权威“全部 N 项待确认候选”，全量态只保留“全部采用并导出 XLSX”，局部失败停止版本/文件并逐项回显；零待确认使用“确认并导出”。页首与确认框绑定当前公司模板名称/版本，模板窗口只允许模板名及 `type/name/aliases/gender/note` 五字段表头/顺序，保存形成不可变新版本并可启用，历史只读。1024 侧栏 204/72 两态根页面无横溢，表格只在容器横滚，模板弹窗键盘闭环且控制台无错误/警告；现交规划总线审计，不自行解锁前端。
- 规划对 `BACK-M3-01C` Rev 1 完成整矩阵独立复验：13 个迁移、术语专项 8/8、共享契约/后端构建、确定性历史下载、模板/导出不可变及项目级级联清理主链路均成立，本地 PostgreSQL 已停止；但发现两个同源 P2 契约缺口。共享列对象会接受并静默丢弃未声明的 `formula/style` 等配置；同时仍保留不创建 `TermVersion + TemplateVersion` 绑定的旧直出路由，启用新模板后仍固定输出默认 v1，形成两套“正式导出”路径。任务合并为一次 Rev 2，只严格关闭嵌套列对象并删除/停用无真实调用者的旧无绑定路由，补正反向回归；其余通过项冻结，前端继续阻塞。
- 规划完成 `UI-M3-01` Rev 2 的 DESIGN、验收矩阵、原型代码、三张截图和 Impeccable 有界审计：全量选择、唯一主动作、局部失败门禁、模板版本、焦点闭环及 1024/1440 滚动归属均与契约一致，机械检测为 `[]` 但因缺 HTML 解析模块仅作辅助。唯一问题是最终证据与当前代码不同步：模板截图仍显示旧 `content / notes`，而当前原型和共享契约已为 `name / note`；批量失败截图也未包含声称的失败行原因/重试入口。任务只退 Rev 3 刷新这两张证据并确认无旧缓存，设计、原型逻辑和其他通过项冻结。
- UI 已完成 `UI-M3-01` Rev 3 最终证据刷新：以独立端口和版本查询标识强制重载，模板窗口只显示 `type/name/aliases/gender/note` 且未出现旧字段；局部失败图同屏显示“未创建 V1、未生成 XLSX”、首行具体失败原因和唯一“重试”入口。仅对仓库外失败取证场景做最小呈现修正，DESIGN 语义和全部冻结项未变；两态控制台 `error/warn=0/0`、脚本语法及授权文档差异检查通过，现只交规划总线复核。
- 规划已通过 `UI-M3-01` Rev 3 最终证据复核：两张新图与当前五字段契约、全量失败原子门禁及行级唯一恢复动作一致，未发现旧缓存、跨模块扩展或新的 P0–P3。任务现路由用户只确认最终增量方向；在用户确认前不标记 `done`、不解锁前端。
- 规划已独立复验通过 `BACK-M3-01C` Rev 2：共享列对象严格拒绝 `formula`、`style` 和任意未声明配置，旧无绑定直出路由/服务/仓储路径已移除，默认五列与确定性下载只走显式 `TermVersion + TemplateVersion` 绑定。独立术语专项 8/8、共享契约构建、后端生产构建和 `git diff --check` 全部通过，本地 PostgreSQL 已停止；任务关闭。`FRONT-M3-01B` 当前只剩 `UI-M3-01` 用户最终确认这一项依赖。
- 用户已确认 `UI-M3-01` Rev 3 最终增量方向；术语 UI 与后端模板/导出两项依赖现均关闭。规划已把 `FRONT-M3-01B` 解锁为 `ready`，只集成正式术语页、后端权威状态、全量采用/导出和公司五字段模板管理；不得扩展到真实 AI/ASR/OCR、播放器、密钥控制台或任务中心。
- 规划独立核对并接受 `FRONT-M3-01B` 的契约冲突：正式 API 确实没有供人工新增选择任意真实 SRT Cue 的来源约束查询，也没有按术语版本恢复既有 `exportId + templateVersionId` 的读取入口。前端缓存、复用其他候选证据或按当前模板重建都会形成第二状态源。规划已拆出最小 `BACK-M3-01D`：不新增迁移，只补活动草稿/来源约束的 Cue 分页搜索和按版本读取导出绑定；前端保持阻塞，待后端通过规划复验后原任务继续。
- 用户明确把两个本地应用的基本全部功能设为最终成品硬验收标准。规划已把 `PRODUCT.md` 从“只作参考”修正为“功能等价迁移”，新增 `docs/contracts/LOCAL_APP_PARITY.md`，按审改/术语工作台与字幕验收工作台逐域登记已等价、开发中和必做未开始能力；两周内部版允许分阶段，但不构成永久删减。`WORKFLOW.md` 现要求相关切片立项和关闭都指向矩阵行并写回差异/证据；界面与实现可按第一性原理优化，业务结果、证据、恢复和保护规则不得缺失。
- 规划已独立复验通过 `BACK-M3-01D`：Cue 查询严格受活动草稿、项目与 `sourceSrtSetDigest` 约束，按原文/集数/分页确定读取且返回项可直接用于人工新增；版本导出列表只读恢复原 `exportId/templateVersionId/columns`，切换启用模板不改变历史绑定或下载。独立术语专项 9/9、共享契约与后端构建、`git diff --check` 全部通过，本地 PostgreSQL 已停止。后端补充关闭，`FRONT-M3-01B` 恢复为 `ready`。
- 前端已按规划总线领取 `FRONT-M3-01B` Rev 1：任务转为 `in_progress`，只集成已确认术语页、真实 Cue 证据选择、后端权威四态/批量/版本/模板/导出及刷新恢复，并在交付时写回功能等价矩阵指定三行；不扩展到 ASR/OCR、完整前置审改、播放器、字幕验收或交付。
- 前端已完成 `FRONT-M3-01B` Rev 1 并交规划总线审计：正式路由覆盖来源/提取门禁、服务端搜索筛选排序、证据侧栏、四态与人工新增编辑、部分批量、显式全量采用、不可变版本、公司五字段模板和历史导出刷新恢复；Cue 与版本导出均消费后端权威接口，不缓存或重建业务事实。术语专项 6/6、全部前端 5 文件 34/34、TypeScript 检查、145 模块生产构建、Impeccable 定向检测及 `git diff --check` 通过；等价矩阵指定三行已写回覆盖/差异/证据/缺口。
- 规划完成 `FRONT-M3-01B` Rev 1 独立审计：本轮独立术语专项 6/6 与 145 模块生产构建通过，但测试只证明已覆盖路径，未证明正式切片可关闭。审计合并发现三个同源数据边界：项目回收/来源变化/提取运行时页面仍可发起部分写操作且后端候选写入缺少同等门禁；非 `pending` 候选仍可被普通批量确认/驳回；浏览器用两个独立请求执行“确认版本→创建导出”，网络中断可留下版本已确认但无 XLSX。另有人工新增 Cue 只取前 30 条、Impeccable 检出两处单侧粗色边视觉反模式。为避免多轮 UI 退审，规划先发布一次 `BACK-M3-01E`，把生命周期/来源/状态转换和 `TermVersion + TemplateVersion + TermExport` 单一幂等发布事务收口；`FRONT-M3-01B` Rev 2 暂停等待，后端通过后一次性补只读门禁、pending 选择、Cue 分页、单一发布契约及两处视觉小修，再只送 UI 一轮真实终验。
- 规划已独立复验通过 `BACK-M3-01E` Rev 1：事务锁顺序、项目 `active`、活动草稿、最新公司 SRT 摘要、运行中提取门禁、候选合法转换、发布失败全回滚及同键同参稳定重放均与 S1 契约一致；独立术语专项 11/11、共享契约与后端生产构建、`check:repo`、`git diff --check` 全部通过，本地 PostgreSQL 已停止。旧确认 POST 已无后端运行入口；前端须在切换到 `/terms/releases` 时同轮移除旧类型引用，待调用者归零后由 S1 关闭门清理共享死类型，不另造一次返工往返。后端任务关闭，`FRONT-M3-01B` Rev 2 已由规划自动解锁。
- 前端已领取 `FRONT-M3-01B` Rev 2：任务转为 `in_progress`，本轮只切换单一幂等 `/terms/releases`、统一项目/来源/提取只读资格、限制 `pending` 选择与批量、补 Cue 服务端分页和跨页保留，并移除两处 Impeccable 单侧粗色边；历史导出与冻结视觉方向不变。
- 前端已完成 `FRONT-M3-01B` Rev 2 并交规划总线审计：正式发布只调用单一幂等 `/terms/releases`，未知结果以原请求体/原键重放；项目非 active、来源变化或提取运行时统一只读，候选选择/裁决仅限 `pending`，`rejected` 只可先恢复；人工新增 Cue 支持服务端分页、搜索/集数筛选和跨页保留。术语专项 13/13、全部前端 5 文件 41/41、TypeScript、145 模块生产构建、Impeccable 定向检测及 `git diff --check` 均通过；首次验证仅暴露测试把原生 `summary` 错认作 button，修正定位器后全绿。等价矩阵指定三行已写回，完整 `pnpm check` 留 S1 关闭门。
- 规划对 `FRONT-M3-01B` Rev 2 完成送 UI 前独立审计：单一发布、统一只读、候选状态、Cue 分页和等价矩阵主交付成立；独立术语专项 13/13、全部前端 41/41、TypeScript、145 模块构建、Impeccable 检测 `[]` 与 `git diff --check` 均通过。但完整交互矩阵发现三个应合并处理的恢复缺口：当前页选择翻页后仍保留旧页 ID，批量栏数量与实际提交范围不一致；候选侧栏和模板窗口提交时禁用当前焦点按钮，却未把焦点确定移入弹窗容器，失败后可能落到页面背景；正式发布对确定性非重试错误仍永久复用旧幂等意图，无法在刷新权威草稿后建立新请求。任务定向退回 Rev 3 一次修完并补 DOM 回归，暂不路由 UI；其余通过项冻结。
- 规划已独立复验通过 `FRONT-M3-01B` Rev 3 送审门：当前页选择随页码清理且显式全量选择保持跨页；CandidatePanel/TemplateDialog 在 pending 与 rejected 两态具有确定焦点及弹窗键盘语境；网络未知/可重试发布保留原意图，确定性冲突清理意图、刷新权威状态并由下一次显式提交生成新 body/key。独立术语专项 17/17、TypeScript、145 模块构建、Impeccable 检测 `[]` 和 `git diff --check` 全部通过，范围无越界且未发现新 P0/P1。按停止线不再追加前端打磨，任务已路由 UI 进行一次有界真实页面终验；P2/P3 只记录后置，不阻止当前术语切片，除非真实证据证明核心任务、数据、安全或键盘操作不可用。
- 前端已领取 `FRONT-M3-01B` Rev 3：本轮只修普通当前页选择跨页清理、CandidatePanel/TemplateDialog 提交中与失败后的确定焦点、发布意图在非重试确定性错误后的清理和权威刷新；Rev 2 单一发布、只读门禁、状态/Cue/视觉/等价矩阵结论全部冻结。
- 前端已完成 `FRONT-M3-01B` Rev 3 并交规划总线审计：普通当前页选择随候选页码变化清空，显式全量选择语义不变；CandidatePanel/TemplateDialog 在提交中聚焦可编程 dialog、Tab/Shift+Tab/Escape 保持弹窗语境，失败提交后聚焦重新启用的关闭按钮；发布网络未知或可重试错误继续保留原意图，确定性非重试错误清除意图并刷新权威术语/模板状态，下一次显式提交使用新 body/new key。术语专项 17/17、TypeScript、145 模块构建、Impeccable `[]` 与 `git diff --check` 全部通过；未重复全部前端或完整 `pnpm check`。
- UI 已完成 `FRONT-M3-01B` Rev 3 一次性正式 React 页面终验：1440 与 1024 侧栏 204/72 两态根页面无横溢，筛选排序、普通/全量选择与分页、证据、真实 Cue 人工新增、四态、模板真实冲突恢复、单一发布、不可变 V1 与历史 XLSX 下载均通过，最终控制台 `error/warn=0/0`。真实请求完成过快，三类提交中焦点明确采用规划已复验的可控延迟 DOM 门作为等价证据；未冒充真实延迟运行。未发现 P0/P1；记录 P2“模板/发布居中弹窗非提交态点击遮罩不关闭”和 P3“历史区标题暴露后端实现措辞”后置。匿名项目、临时模板与服务已清理，任务交规划最终审核，不自行标记完成或通知前端。
- 规划已完成 `FRONT-M3-01B` Rev 3 最终审核并关闭 M3 S1：抽查 7 张关键正式页面证据与完整矩阵一致，P0/P1 为 0；P2 遮罩关闭一致性和 P3 历史标题措辞进入后置清单，不制造新的返工轮次。S1 完整 `pnpm check` 退出码 0，本地 PostgreSQL 已停止；正式术语页、真实 Cue 人工新增、四态审核、全量采用、不可变版本、公司五字段模板和历史 XLSX 已形成可工作的纵向闭环。共享契约中无调用者的 `ConfirmTermVersion*` 只剩 P3 死类型，不存在后端运行路由，推迟到下一次后端术语契约维护时清理，不阻塞 S1。
- 下一阶段进入 `PLAN-M3-02` 产品协商门，只讨论 S2 中文 ASR 批次的输入、供应商接入策略、术语热词、批次/失败恢复、用量与成本边界；用户确认前不发布 UI、后端或前端实现任务，不接真实密钥、不产生付费调用、不创建云资源。
- 用户已明确确认 `PLAN-M3-02` 推荐方案。规划只读核对本地应用的批量识别、术语热词过滤、成功结果保护、失败集子集重试、取消和历史恢复行为，并固化 `docs/contracts/M3-asr-batch.md`：S2 支持整剧/选中集/单集，以不可变术语版本和已校验 `asr_video` Asset 双门禁，使用开发/测试专用 `deterministic_fake` 跑通批次、逐集状态、租约、不可变 Cue、质量、用量、取消、需对账与显式重试。`UI-M3-02` 与 `BACK-M3-02A` 已按同一契约并行解锁，`FRONT-M3-02B` 等待两项分别通过规划审核；真实供应商选品、密钥、费用、服务器和云资源继续单独授权。
- 后端已完成 `BACK-M3-02A` Rev 1 并交规划总线独立复验：新增 PostgreSQL 权威批次/任务/尝试/结果/Cue/用量/幂等命令与租约 Worker，共享 TypeBox 契约、正式 API 和零网络 `deterministic_fake`；覆盖素材+术语双门禁、三种范围、创建/取消/失败子集重试幂等、租约接管、成功结果保护、未知结果 `reconciliation_required`、热词摘要、不可变 Cue 和零费用用量。ASR 专项 6/6、全部后端 60/60、共享契约与后端构建、仓库检查及差异检查通过；完整 `pnpm check` 留 S2 关闭门，本地 PostgreSQL 已停止。`UI-M3-02` 保持并行开发，`FRONT-M3-02B` 不由后端解锁。
- 规划对 `BACK-M3-02A` Rev 1 的独立复验确认现有批次、幂等、租约恢复和 fake 基线成立，本轮新鲜 ASR 专项 6/6、共享契约与后端构建均通过；但按用户最新要求，当前适配边界仍不具备多厂商可替换性：共享契约、读取类型、批次创建和 Usage 仓储把 `fake/deterministic_fake` 写死，适配器输入只有文件名与热词摘要，没有不可变对象引用和实际热词，服务启动也没有可运行的 Worker 入口。FIFO 035 关闭并定向退回 `BACK-M3-02A` Rev 2，一次只补厂商中立适配器登记/元数据/媒体与热词执行上下文/同构用量、第二个零网络测试 stub 和本地 Worker 启停闭环；不接真实厂商、SDK、密钥、网络或付费。`UI-M3-02` 继续并行，`FRONT-M3-02B` 继续阻塞。
- 用户确认长期采用“两套网站、一个后台系统”：员工工作台可通过公网域名访问，但以员工邮箱白名单经 Cloudflare Access 保护，不匿名开放真实数据或付费能力；独立系统控制台只允许部署所有者邮箱。两站使用不同 Access Application/audience 和后端访问域，共用模块化后端、PostgreSQL、对象存储和 Worker，不要求两台服务器。规划已新增 `docs/contracts/SYSTEM_CONTROL_CENTER.md` 并同步产品/架构；当前 UI 正在写 `DESIGN.md`，为避免并行覆盖，控制台设计合并与独立 UI 任务后置到 `UI-M3-02` 交回规划之后，不打断 ASR 主线。
- UI 已完成 `UI-M3-02` Rev 1 正式中文识别批次页设计：双门禁、整剧/选中集/单集、模拟识别、批次/逐集状态、取消、失败集重试、需对账、质量/用量、状态专属事实和完整空错加载矩阵均已落入 `DESIGN.md`、UI 验收记录与仓库外原型。真实浏览器覆盖 1440×900、1024×768 侧栏 204/72 两态，根页面无横溢、表格滚动归属正确、控制台 0/0；独立第二轮定向终审 `PASS`，未发现剩余 P0/P1。任务只交规划总线审核并等待用户方向验收，不自行解锁前端。
- 后端已完成 `BACK-M3-02A` Rev 2 并交规划总线复验：批次元数据由内部 adapter registry 的稳定描述固定，员工创建请求仍不能选厂商；共享读取契约和 PostgreSQL 可保存已登记字符串。Worker 按批次 adapter/configDigest 解析，内部取得不可变 Asset 对象元数据及经 digest 校验的实际热词；适配器统一返回 Cue/质量/错误/未知结果和 Usage，仓储不再写死 fake。第二个仅测试匿名零网络 stub 通过同一 API 创建→registry→可停止轮询 Worker→PostgreSQL→API 读取链路保存非 fake 元数据与同构非零用量。ASR 专项 7/7、共享契约与后端构建、差异检查通过，本地 PostgreSQL 已停止；完整 `pnpm check` 留 S2 关闭门，前端不由后端解锁。
- 规划已完成 `UI-M3-02` Rev 1 交接审计：逐张复核 12 张明确交付的运行、双门禁、需对账、失败集重试、取消、完成、空错加载及 1024 两态证据，范围与 S2 契约一致且未发现 P0/P1。记录两个不阻塞 P2：员工页正式实现不显示 `deterministic_fake` 等适配器内部标识，“本地服务正常”部署后改为中性的“服务正常”；技术事实只进入详情或独立系统控制台。本轮 in-app Browser 安全策略阻止重新打开另一任务的 `file://` 原型，规划未绕过、未冒充本轮动态操作；任务现路由用户只验收方向，前端仍不解锁。
- 规划已独立复验通过 `BACK-M3-02A` Rev 2：重新执行本地迁移、ASR 专项 7/7、共享契约构建和后端生产构建均通过；代码核对确认员工 body 严格拒绝厂商选择，普通 API 不返回对象地址或完整热词，第二个匿名零网络适配器实际经过同一 registry/Worker/PostgreSQL/读取链路。任务关闭。真实供应商接入前另设硬门：把生产 `fakeEnabled`/Worker 启动保护改为受授权配置，并为适配器意外抛错增加 Worker 级故障归一化；这两项不影响当前零网络模拟闭环，也不在 S2 前端切片内提前接网络、密钥或付费。
- 用户确认把热词可验证、多剧批量发起、公平并发和费用分层纳入 S2.1。规划新增 `M3-asr-bulk-dispatch.md`：项目是批量选择单位，上传完成页只预选项目；批次固定项目术语版本，页面显示权威热词预览和适配器回执；fake 只证明链路，真实准确率必须用同一 1–3 集做无热词/有热词 A/B。多项目意图由 PostgreSQL `ASRDispatchGroup` 持久化并逐项目回显 accepted/blocked，不静默跳过。
- 冲突审查发现 UI 已定义批次级 `cancel_requested`，共享契约和数据库汇总却只有逐集该状态；同时全部任务需对账时后端会落为普通 `failed`。规划已确认批次补 `cancel_requested / reconciliation_required`，禁止前端猜状态。当前固定 `100 项 / 2000 字` 的通用热词截断也移到适配器能力层，由 Attempt 保存实际 payload 摘要、数量和 `simulated/submitted/partially_submitted/unsupported/unknown` 回执。
- S2.1 采用两波受控并行：Wave A 由 `UI-M3-02` Rev 2 与 `BACK-M3-02C` 并行，只补单剧热词证据、员工用量简化和状态对齐；两项通过即解锁 `FRONT-M3-02B`。Wave B 再让单剧前端与 `UI-M3-02D`、`BACK-M3-02D` 并行，补项目中心多选、全局中文识别任务、DispatchGroup 和默认全局 4/每项目 1 的公平调度。系统控制台 UI 继续后置，不抢占本轮 ASR UI 角色。
- 用户确认正式 ASR 长期只走云 API；OCR 在真实质量与单集成本合适时也可走云 API。当前只建设员工主站的云端业务功能：员工按剧同时启动多个项目，查看排队/运行/失败和结果，不显示供应商、并发、预算、服务器或 Secret 调控。开发 fake 的 `全局 4 / 每项目 1` 仅是本地默认；后端只预留稳定策略读取/Adapter 接口，未来独立管理员网站通过管理 API 分别控制 ASR API、OCR API、OCR 自建 Worker 和视频转码，不回填员工页面。本决定不改变正在执行的 Wave A 范围，也不授权真实 API、密钥、付费或云资源。
- 后端已按规划总线领取 `BACK-M3-02C` Rev 1：本轮只收口 Wave A 的批次状态对齐、同项目不可变术语版本热词预览、adapter 能力内截断及 Attempt payload/回执证据；不实现 DispatchGroup、公平并发、真实供应商/SDK/网络/密钥/付费，不修改生产前端或 DESIGN。
- 后端已完成 `BACK-M3-02C` Rev 1 并交规划总线复验：批次共享契约、数据库枚举、汇总/筛选统一支持 `cancel_requested/reconciliation_required`，计数单列取消请求；新增同项目不可变术语版本热词预览，通用投影不再固定 100/2000 截断，由保存的 adapter 能力生成批次摘要和 Worker 核对；Attempt 在调用前保存实际 payload 投影版本、摘要、条数、字符数和 `unknown` 初始回执，fake/stub 完成后写入五态回执之一。最小迁移兼容迁移前 fake 批次的 v1 投影；ASR 专项 9/9、双构建、仓库边界与差异检查通过，本地 PostgreSQL 已停止。完整 `pnpm check` 留 Wave A 集成门。
- 规划已独立复验通过 `BACK-M3-02C` Rev 1：本轮重新应用迁移并执行 ASR 专项 9/9、共享契约构建、后端生产构建和仓库边界检查，全部退出码 0；代码核对确认批次状态优先级、项目—术语版本隔离、adapter 能力快照、调用前 Attempt payload 证据、五态回执和迁移前 fake v1 兼容均成立，没有进入真实 API、管理员网站或 Wave B 实现。FIFO 038 关闭，本地 PostgreSQL 已停止；`BACK-M3-02D` 现可独立开始多项目 Dispatch、公平调度及稳定策略读取接口，UI FIFO 039 继续等待规划审核。
- 后端已按规划总线领取 `BACK-M3-02D` Rev 1：本轮只实现 PostgreSQL 权威 DispatchGroup/逐项目结果/幂等命令、服务端项目资格投影、复用单项目批次领域命令，以及读取开发默认全局 4/每项目 1 的内部调度策略与项目公平领取；不建立通用任务中心、管理员网站/管理 API，不接真实供应商/SDK/网络/密钥/付费，不修改生产前端或 DESIGN。
- 规划按 FIFO 039 完成 `UI-M3-02` Rev 2 独立审计：DESIGN 增量、完整矩阵、原型代码及 13–16 四张新证据与后端五态回执/批次状态一致；1440/1024 侧栏两态、表格滚动归属、热词侧栏焦点闭环和员工用量减法均通过，Impeccable 检测为 `[]`（HTML 解析模块缺失，regex 降级只作辅助），P0/P1=0。唯一 P3 是原型可见“员工页边界/精确费用留在系统控制台”属于内部说明，正式前端直接省略该卡片，不显示管理员入口或实现措辞。Wave A 完整 `pnpm check` 退出码 0，本地 PostgreSQL 已停止；UI 和后端两项关闭，`FRONT-M3-02B` 与 `UI-M3-02D` 现在分别解锁并与已运行的 `BACK-M3-02D` 受控并行。
- 后端已完成 `BACK-M3-02D` Rev 1 并交规划总线复验：新增 PostgreSQL DispatchGroup、逐项目资格/accepted/blocked 结果和幂等命令，正式资格/创建/列表/详情 API 复用现有单项目批次领域命令；默认调度通过稳定内部策略读取开发值 `全局 4 / 每项目 1`，按项目轮转、项目内集数升序并继续使用租约与 `SKIP LOCKED`。匿名三项目覆盖可执行、缺术语、缺视频、整组阻断、显式仅派发可执行项目、重放/异参冲突、恢复、活动批次竞态和 4/1 容量；ASR 专项 1 文件 12/12、共享契约/后端构建、仓库边界与差异检查均通过，匿名数据为 0，本地 PostgreSQL 已停止。完整 `pnpm check` 留 S2.1 切片关闭门；未接真实供应商/网络/密钥/付费，未改生产前端/DESIGN，未建立管理员网站或管理 API。
- 规划对 `BACK-M3-02D` Rev 1 的独立复验确认 Dispatch 创建/重放、活动批次竞态门禁、项目公平轮转和开发默认 4/1 容量基础成立；本轮重新执行迁移、ASR 专项、共享契约/后端构建、仓库与差异检查全部退出码 0，本地 PostgreSQL 已停止。但并行形成的 Wave B 正式 UI 契约暴露四项同根投影缺口：现有 `status=accepted/partial/blocked` 把创建接受结果误作运行状态；Dispatch 列表没有服务端搜索、运行状态/行动优先排序及质量/用量汇总；项目中心只有所选 ID 的资格批查，不能服务端完成资格筛选/分页/最近任务投影；没有派发级幂等取消来向未终结子批次保存取消意图。FIFO 040 关闭并把同一任务合并为 Rev 2 定向收口，Rev 1 已通过的数据表、幂等创建、单项目命令复用和公平调度冻结；`FRONT-M3-02D` 继续阻塞，单剧前端与 UI Wave B 不受影响。
- 后端已按规划总线领取 `BACK-M3-02D` Rev 2：冻结 Rev 1 的 Dispatch 表、创建幂等、逐项目结果、活动批次竞态、单项目命令复用和 4/1 公平调度，只补 acceptance/execution 状态分层、项目中心服务端资格查询、Dispatch 正式列表汇总与幂等派发取消；不改生产前端/DESIGN，不接真实供应商/网络/密钥/付费，不实现管理员网站/API、OCR 或通用任务中心。
- 后端已完成 `BACK-M3-02D` Rev 2 并交规划总线复验：共享契约和 PostgreSQL 权威投影已分离不可变接受结果与子批次派生执行状态；项目中心新增服务端资格搜索/筛选/排序/分页及最近批次，Dispatch 列表新增服务端搜索、双状态筛选、行动优先/有效更新时间排序与完成项目/质量/处理用量汇总；派发取消通过持久化幂等命令只向已接受且未终结子批次保存取消意图，保留完成结果和用量。隔离临时 PostgreSQL 从空库应用 17 个迁移，ASR 两文件 15/15、共享契约/后端构建、仓库检查和差异检查均通过；临时数据库均已删除。完整 `pnpm check` 仍留 S2.1 关闭门；并行前端正在使用的默认本地 PostgreSQL 保持运行，后端未干预其服务或数据。
- 规划对 `BACK-M3-02D` Rev 2 的独立隔离复验确认接受/执行状态分层、服务端查询、取消幂等和已完成结果/用量保护主链路成立：精确临时库从空库应用 17 个迁移，ASR 两文件 15/15、共享契约/后端构建、仓库与差异检查全部通过；临时库已删除，前端使用的默认 PostgreSQL 继续运行且数据未被触碰。送多剧前端前仍有三项同端点收口：Dispatch 的总集数/新任务/复用数当前把 `blocked` 项目也计入，违反 accepted 集合唯一事实；资格查询按每个就绪集数逐条查询可复用结果，单页最多 100 部、单剧最多 100 集时会线性放大数据库往返；资格与 Dispatch 的窗口计数在请求空页时错误返回 `total=0`。FIFO 042 已一次性合并为 `BACK-M3-02D` Rev 3 最小返工，Rev 2 已通过的契约、取消、调度和迁移全部冻结；单剧前端与 UI Rev 2 继续并行，多剧前端不提前解锁。
- 后端已按规划总线领取 `BACK-M3-02D` Rev 3：只修 accepted 汇总边界、资格可复用结果集合查询与两类列表空页真实总数，并补部分接受含有集数的 blocked 项目、100 集查询次数及资格/Dispatch 空页端点回归；Rev 2 主链路、共享契约、迁移、取消、调度和前端/UI 全部冻结。
- 后端已完成 `BACK-M3-02D` Rev 3 并交规划总线复验：Dispatch 的总集数、新任务和复用结果只汇总不可变 accepted 项目，blocked 仍保留在 selected/blocked；资格读取把每个就绪集数的可复用结果查询合并为单次集合查询；资格与 Dispatch 列表在 offset 超出结果时仍返回筛选后的真实 total。匿名回归新增含集数 blocked 项目的部分接受汇总、100 集单次结果查询和两端点空页；隔离临时 PostgreSQL 从空库应用 17 个迁移，ASR 两文件 16/16、后端构建、仓库与差异检查均通过，临时库无残留。未修改共享契约或迁移，完整 `pnpm check` 仍留 S2.1 关闭门。
- 规划按 FIFO 041 完成 `UI-M3-02D` Rev 1 审计：项目中心多选、7→18 显式全量选择、selected/canCreate/blocked、部分接受与执行状态分层、任务列表密度、1440/1024 两态、表格滚动归属、员工/管理员边界整体成立；Impeccable 检测因缺 HTML 解析模块降级为 regex，只作辅助，原型语法检查通过。审计发现三项必须在送生产前一次收口的 P1：同一 `DSP-0814-026` 的部分接受为甲/丙/丁、详情却变成甲/乙/丁且 92 集误写 83 集；批量创建提交中仍可 Escape/遮罩关闭并由延时回调重新弹出结果，未证明单次请求；派发取消缺少确认、提交中锁定、失败恢复和成功反馈。另把跨页选择失效规则明确到搜索/资格/项目状态等会改变成员集合的查询，纯排序/翻页不应静默改写集合。FIFO 041 关闭并定向退回 Rev 2；既有布局、视觉、响应式与其他证据冻结，`FRONT-M3-02D` 继续阻塞，后端 Rev 2 和单剧前端不受影响。
- 前端完成 `FRONT-M3-02B` 主链路、专项/全前端测试、TypeScript、150 模块构建和 1440/1024 真实页面验证后，在独立完成审查中发现三项不能由浏览器安全补齐的上游冲突：权威热词预览只返回已纳入条目与过滤/截断计数，没有 UI Rev 2 要求的被过滤/截断条目及具体原因；单剧批次列表没有批次编号搜索或行动优先服务端排序，只能按状态或创建时间分页；新建面板要求逐集显示可复用事实，但现有单项目接口只有逐批次详情，聚合资格接口也只返回总数，若前端自行补齐会产生按历史批次数扇出的详情请求。为避免猜原因、在前 100 条上假搜索/假排序或建立第二套复用状态，任务按专业异议机制转 `blocked / Current actor=规划对话`，登记 FIFO 043；现有实现与已通过证据冻结，等待规划决定补契约/后端投影或调整 UI 验收。
- 规划已完成 FIFO 043 冲突审查并确认三项上游缺口全部成立：正式前端当前固定读取最多 100 个批次后本地搜索/重排，逐集复用通过 `useQueries` 扫描当前页历史批次详情，批次热词入口只读取当前默认适配器下的 term-version 预览且契约没有省略条目/原因或 Attempt 提交/省略事实。已按已确认 UI 语义更新 `M3-asr-batch.md`，新增 `BACK-M3-02E` 一次性后端收口；不降低 UI 验收，也不重做已通过主链路。前端补充发现的全局弱文字对比度、回执标签缺少形状 marker 和五态事实文案一并留给同一 `FRONT-M3-02B` 下一轮收口。FIFO 043 关闭，FIFO 044 进入规划审核；`BACK-M3-02D` Rev 3 的后来交接登记为 FIFO 045，不插队。
- 规划已完成 FIFO 044 的 `UI-M3-02D` Rev 2 定向审核：DESIGN、完整验收矩阵、原型脚本和证据 12–16 相互一致，`DSP-0814-026` 只含 accepted 甲/丙/丁共 92 集、88 新建/4 复用、46/92 已形成或复用；创建和派发取消的 pending 均锁定容器焦点、阻止关闭/重复激活并保持请求计数 1，确定失败/未知结果恢复成立，取消只影响丙而保留甲完成、丁需对账和历史用量。新鲜 `node --check`、Impeccable 降级检测 `[]` 和授权差异检查通过，人工核图未发现 P0/P1。FIFO 044 关闭，UI Rev 2 标记完成；FIFO 045 进入规划独立复验，多剧前端仍等待后端 Rev 3 和单剧共享组件稳定。
- 规划已完成 FIFO 045 的 `BACK-M3-02D` Rev 3 独立复验。默认库首次运行被另一匿名术语夹具的 RESTRICT 外键阻断在测试清理钩子，未进入业务断言；规划没有删除默认库数据，改用精确命名隔离库从空库应用 17 个迁移后，ASR 两文件 16/16 全部通过，后端构建、仓库检查和差异检查通过，隔离库已删除。代码核对确认 accepted-only 汇总、100 集单次 `unnest` 集合查询和空页真实 total 成立，Rev 3 标记完成。协作协议新增 S2.1 隔离数据库质量门试运行规则；`BACK-M3-02E` 现解锁补单剧权威投影，`FRONT-M3-02D` 继续等待单剧共享组件稳定。
- 规划已完成 FIFO 046 的 `BACK-M3-02E` Rev 1 独立复验：代码核对确认批次热词按保存的身份/能力/投影版本重建并核对摘要，Attempt 回执数量受 Worker 与数据库双重约束，批次搜索/行动优先/更新时间排序在数据库分页前执行，逐集准备用一次集合查询返回 1–100 集。新鲜隔离空库应用 18 个迁移，ASR 两文件 18/18、共享契约/后端构建、仓库与差异检查全部通过；第一次仅因规划诊断误写迁移表名在测试前退出，临时库已删除且未计作通过，第二个新隔离库完成全部证据并删除。FIFO 046 与后端 E 关闭，`FRONT-M3-02B` Rev 2 解锁一次性消费新接口并完成既定三项前端收尾；多剧前端继续等待单剧组件稳定。
- 前端已完成 `FRONT-M3-02B` Rev 2 并交规划总线审计：新建面板只读 `/batch-preparation` 的逐集可执行/可复用/阻断事实，历史列表把编号搜索、状态、行动优先/更新时间排序和分页全部交给服务端，批次热词入口改读批次绑定证据；五态回执显示稳定代码、提交/省略数量与原因，并以文字、语义色和形状 marker 三重编码。单剧专项 10/10、全部前端 6 文件 55/55、TypeScript、150 模块生产构建、Impeccable 定向检测 `[]` 与 `git diff --check` 通过；真实页面验证 1440 根页面 `1440/1440`，1024 展开/收起根页面均为 `1014/1014`，批次表横滚只在自身容器，弱文字为 `#747481`，控制台 `error/warn=0/0`。完整 `pnpm check` 按规划留 S2.1 关闭门；多剧前端仍保持 blocked，不由前端解锁。
- 规划已完成 FIFO 047 送 UI 前审计：权威批次准备、服务端搜索/筛选/排序/分页、批次绑定热词证据、五态回执事实、形状 marker 与弱文字修正均成立；本轮独立复跑单剧专项 10/10、TypeScript 和 150 模块生产构建通过。但新接入的两个只读入口没有完整遵守已冻结的错误恢复规则：逐集准备失败只有原因和重试，没有请求标识；批次热词证据失败只有原因，既没有请求标识也没有唯一“重新读取”动作。两项均可直接消费既有 `AsrApiError.requestId` 与 React Query `refetch`，不需要后端或设计变更。为避免送 UI 后再次退审，FIFO 047 关闭并把 `FRONT-M3-02B` 递增为 Rev 3 一次性最小收口；其余 Rev 2 通过项冻结，多剧前端继续阻塞。
- 前端已领取 `FRONT-M3-02B` Rev 3：本轮只在 `AsrPanels.tsx` 与对应专项回归中补逐集准备、批次热词两个只读入口的错误原因、既有请求标识与唯一原查询重读动作；Rev 2 的权威读取、成功/加载态、五态回执、视觉及响应式证据全部冻结，多剧前端继续 blocked。
- 前端已完成 `FRONT-M3-02B` Rev 3 并交规划总线审计：逐集准备失败保留原因与唯一“重新读取准备事实”并显示既有请求标识；批次热词失败显示原因、请求标识与唯一“重新读取热词证据”，恢复只调用原 hotwords query `refetch`。单剧专项 12/12、TypeScript、150 模块生产构建与 `git diff --check` 通过；未运行完整 `pnpm check`，Rev 2 全部冻结项未改动，多剧前端仍保持 blocked。
- 规划已完成 FIFO 048 独立审计并通过：源码和可控延迟回归证明两个错误块均同时提供原因、既有请求标识与唯一恢复动作，逐集准备只重读 preparation，热词证据只重读 `asr-batch-hotwords` 且不增加批次详情请求；成功与加载态保持原语义。规划新鲜复跑单剧专项 12/12、TypeScript、150 模块生产构建、Impeccable 定向检测 `[]` 与差异检查全部通过，未发现新的 P0/P1。FIFO 048 关闭，`FRONT-M3-02B` 保持 Rev 3 并统一路由 UI 设计对话做一次正式 React 页面终验；只有真实 P0/P1 才允许退审，P2/P3 只登记后置，不拖延 S2.1。多剧前端继续等待单剧终验和质量门关闭。
- UI 已完成 `FRONT-M3-02B` Rev 3 正式 React 一次性终验：双门禁、三种创建范围、服务端搜索/筛选/排序、批次详情、热词证据、1024 两态滚动归属和控制台均通过；逐集准备与批次热词两个真实 503 均显示原因、请求标识、唯一重读并各只转发一次原查询恢复。但两处人工恢复成功后弹窗仍打开，焦点都落到 `body` 且不再属于 dialog，Tab 不能恢复弹窗语境。该同源动态焦点缺口为 P1；其余证据冻结，任务只交规划裁决，`FRONT-M3-02D` 继续 blocked。
- 规划已完成 FIFO 049 裁决并确认 P1 成立：两个错误块的重试按钮都是恢复期间的当前焦点，query 成功后按钮随错误块卸载；`NewBatchPanel` 与 `EvidencePanel` 的现有 effect 只在面板首次挂载时聚焦关闭按钮，没有观察 error→success 的 DOM 提交，因此真实浏览器稳定落到 `body`，现有两条恢复测试也只断言数据和请求次数而未断言焦点。FIFO 049 关闭，`FRONT-M3-02B` 递增为 Rev 4 一次性最小返工：两个面板分别记住是否经历错误，在恢复成功且面板仍打开的 DOM 提交后确定聚焦既有关闭按钮，并补两条可控延迟焦点回归。API、查询键、自动重试、视觉、业务状态和全部通过证据冻结；多剧前端继续阻塞。
- 前端已领取 `FRONT-M3-02B` Rev 4：本轮只修正 `NewBatchPanel` 与热词 `EvidencePanel` 在本次经历错误并恢复成功后的确定焦点，并把既有两条可控延迟回归补齐重试按钮及关闭按钮焦点断言；Rev 3 的业务、API、查询键、自动重试、视觉与响应式证据全部冻结，多剧前端继续 blocked。
- 前端已完成 `FRONT-M3-02B` Rev 4 并交规划总线审计：两个面板只在错误态人工重读后记录一次性恢复焦点意图，查询成功并完成 DOM 提交且面板仍打开时聚焦既有关闭按钮；普通初始 success、无错误的后台刷新、质量/对账面板不会触发该路径。既有两条可控延迟回归从重试按钮真实获焦开始，并在恢复后断言关闭按钮获焦且 `dialog.contains(document.activeElement)=true`；单剧专项 12/12、TypeScript、150 模块生产构建、Impeccable 定向检测 `[]` 与 `git diff --check` 通过，未运行完整 `pnpm check`，多剧前端仍保持 blocked。
- 规划已完成 FIFO 050 独立审计并通过：两个一次性 ref 只由各自错误块的人工重读按钮置位，`useLayoutEffect` 仅在对应 query success、非 fetching、面板仍挂载且意图存在时聚焦关闭按钮并立即清除；普通初始 success、无错误后台刷新、质量/对账侧栏均不会抢焦点。规划新鲜复跑单剧专项 12/12、TypeScript、150 模块生产构建、Impeccable 定向检测 `[]` 与差异检查全部通过，未发现新的 P0/P1。FIFO 050 关闭，`FRONT-M3-02B` 保持 Rev 4 并只路由 UI 复验 preparation/hotwords 两个真实 503 恢复后的焦点；Rev 3 其他矩阵继续冻结，多剧前端仍等本次复验与 S2.1 完整质量门。
- UI 已完成 `FRONT-M3-02B` Rev 4 两处定向真实复验：preparation 与 hotwords 均在真实 `503` 稳定错误后由唯一人工重读恢复，成功态焦点分别落到“关闭新建批次”和“关闭本批次热词证据”，两处 `dialog.contains(document.activeElement)=true`，随后 Tab 均未离开面板语境。隔离代理两端点计数均为 `injected=2 / forwarded=1`；P0/P1=0，Rev 3 其余矩阵冻结。任务只回规划总线审核，不自行关闭或解锁多剧前端。
- 后端已按规划总线领取 `BACK-M3-02E` Rev 1：本轮只补批次绑定的热词纳入/省略证据与 Attempt 回执事实、单剧批次服务端全集查询和 1–100 集一次性准备投影；使用精确隔离数据库验证，不修改生产前端/DESIGN，不接真实供应商、网络、密钥、付费或管理员控制面。
- 后端已完成 `BACK-M3-02E` Rev 1 并交规划总线复验：批次热词读取按保存的适配器身份、配置与能力快照重建并核对纳入/省略条目，Attempt 持久化实际提交数、省略数和稳定可空原因；单剧批次列表新增服务端编号搜索、行动优先/更新时间排序、状态筛选、分页与空页真实总数，批次准备一次返回 1–100 集可执行/可复用/阻断事实且用一次集合查询核对历史结果。精确隔离空库成功应用 18 个迁移，ASR 两文件 18/18、共享契约/后端构建、仓库与差异检查通过；隔离库已删除，默认 PostgreSQL 保持运行。完整 `pnpm check` 未运行，未接真实供应商、网络、密钥、付费或管理员控制面，未改生产前端/DESIGN。
- 独立“前端开发对话”已创建并置顶，任务 ID 为 `019ff92b-c7a6-7693-846b-fe5b3bfea3bf`；它已两次读取协议并确认 `FRONT-M2-04B` 仍被上游依赖阻塞，未修改文件或领取任务。现有“后端开发对话”和“UI/UX 设计管理”继续使用原任务，不新建重复对话。
- 规划已直接向现有 UI 与后端任务发送最新协议同步，不再由用户传话。两者均已确认固定角色、文件所有权、禁写边界、专业异议格式和当前阻塞任务；本次同步没有修改文件或提前领取后继工作。四个角色后续每次启动仍须重读本文件的最新版本。
- `DEV-M2-01` 的首个端到端切片及创建幂等修正已经规划对话独立复验通过并标记为 `done`：服务端会校验幂等键对应的规范化项目名称，前端会在同一创建意图的未知结果重试中复用原键。
- `DEV-M2-02` 整剧素材配对元数据纵切及 6 类退审修正已由规划对话独立复验通过并标记为 `done`；实现保持未提交。
- `DEV-M2-03` 已由规划对话独立复验通过并标记为 `done`：内存 Storage fake 与完整分片协议覆盖中断恢复、终态并发、项目生命周期门禁及稳定幂等；完成后的原分片确认迟到重放返回 `200 / completed` 且最终素材唯一。下一切片尚未协商，不得自动领取。
- 用户已确认 `PLAN-M2-04`：UI 设计与后端资产绑定并行，二者分别验收后再由前端集成；清单角色通过独立绑定指向已校验 Asset，同集 ASR 视频与画面字视频可共享一次上传和同一个 Asset；项目状态由后端按已确认契约归约。
- `BACK-M2-04A` 已由规划独立复验通过：完整 `pnpm check` 为 7 文件 46 项，资产/素材/上传专项为 3 文件 31 项；生产环境不暴露本地 fake PUT，未接 R2、ASR/OCR、回收站、云资源、提交、推送或部署。
- `UI-M2-03` 已通过用户验收：最终采用方案一的行动状态分组、完成项折叠和行内详情，吸收方案二的上传双入口、轻量素材/状态标签、普通筛选与选择后批量栏；单文件只显示文字状态，整批顶部保留唯一总体进度。规划已核对最终截图、职责矩阵和验收记录，确认前端 UI 与后端两项依赖均满足。
- 用户进一步明确：上传任务只负责素材上传和素材分类，必须支持一次选择并同时上传多个素材；术语、中文识别、画面字、前置审改、字幕验收和交付属于任务中心或后续工作流，不得放入上传任务导航。此前把七个流程标签写入上传页的 Rev 9 输入与首轮三版全部作废。
- 规划已完成跨 UI、前端、后端的范围冲突审查，并建立 `docs/contracts/MODULE_RESPONSIBILITY_MATRIX.md`：上传任务、任务中心和项目工作台分别拥有文件传输、异步执行观测和人工业务流程，不得互相吸纳；所有后继 `ready` 任务必须指向一个矩阵模块行。
- 代码审查确认现有生产实现没有跟随错误视觉稿越界：正式前端尚无上传页，`modules.ts` 中术语/中文识别/画面字仅为未路由且未展示的 `planned` 项目模块；后端只有项目、素材和上传模块，`asr_video` / `screen_video` 只是素材角色，没有 ASR/OCR 执行或任务中心。无需返工已验收后端。
- 用户确认继续借鉴截图中的成熟表格行为：状态以文字和语义色标签共同呈现；文件/标题、集数、状态、大小和更新时间支持明确的升降序；勾选后才出现批量操作栏；行尾三点菜单承载低频动作。删除语义必须本地化拆分为“取消未完成上传”和未来“移入回收站”，不得用含糊删除直接清除已完成 Asset 或原始素材。
- `UI-M2-02` 已交付并通过用户验收：整剧素材配对确认交互预览覆盖 8 类完整状态；正式实现仍须以后端清单版本为唯一权威来源。
- 规划已重新只读核对两个本地应用并完成长期边界校准：前置审改工作台负责公司 SRT、术语、ASR/OCR 证据和大范围修正；视频字幕验收工作台负责最终看片、时间轴检查和轻量字幕修改，二者通过版本化待验收修订交接。
- 用户已确认验收端的两个边界：单个局部问题可直接修正，整集或批量问题退回前置审改；验收首期保留文字、开始/结束时间、拖动、增加和删除字幕，不重新运行 ASR/OCR 或制作术语。
- 用户已确认双源字幕策略：每集可切换公司稿或 ASR 为对照主基准，每条仍通过“公司、ASR、合并、人工修改”形成唯一采纳稿；两个原始来源只读，质量推荐不得自动覆盖人工结果。
- 用户已确认台词格式策略：最终台词去除常规中英文标点，停顿用空格，多人对白保留行首半角减号；单轴目标不超过 18 个有效字，19–28 字提示优化，超过 28 字阻断待验收发布。自动断句保护术语、姓名和数字；该规则不作用于画面字轨。
- 用户已确认基准切换层级：系统可配置公司稿或 ASR 默认值，整剧、选中集和单集均可显式覆盖；高层切换只影响未确认项，不得覆盖已经确认的采纳稿。选中集批量写入单集覆盖值，不形成新的权威状态层。
- 用户已确认后台学习机制：每次人工修改保存不可变学习事件，项目内可立即生成建议，跨项目只聚合隐藏候选，经过人工批准和回归验证后才能发布为公司级热词、纠错规则或训练数据版本。普通员工不显示学习库；当前阶段不保存音频或视频用于训练。
- 复杂内容风险、人物/人脸画面风险和严重等级阻断从近期主流程撤下，待真实使用后另行设计；近期只保留视频缺失、字幕重叠/共端点、非法时间段等技术门禁。此前“风险中心首期作为统一硬门禁”的表述已由最新用户决策覆盖。
- 原本地工作台已完成只读流程核对：整剧是顶层项目，每集是内部处理单元；素材文件夹自动识别三类角色并允许人工改选；集数自动匹配；整剧交接包含每集台词/视频和术语快照；时间码驱动视频证据定位。
- 用户已确认：公司台词基本为 SRT；术语表是项目内生成并导出的结果，不是必传原始文件；中文语音识别可使用任一音轨适用视频；画面字检查使用有人名条/画面字视频；视频绝大多数为 MP4。
- 用户已确认术语人工确认是整剧后续流程的硬门禁；已确认术语同时约束中文语音识别与画面字识别，术语未确认时两类识别和后续审改不能正式开始。
- 用户已确认术语版本和并行规则：候选全部裁决后显式确认；修改生成新版本，旧结果保留并标记过期，默认只重跑受影响集数；大视频上传可与术语整理并行，识别等待术语确认和本集视频校验双门禁。
- 用户已确认 M2 第二切片采用方案 B“整剧素材配对确认纵切”；先完成新增确认页的 UI 交付和用户验收，再由开发实现元数据扫描、自动配对、人工调整、版本化确认和刷新恢复。
- PostgreSQL 是项目元数据的唯一权威来源；前端通过 Fastify API 创建、搜索和读取项目，不使用浏览器副本驱动业务状态。
- 用户已明确当前正式界面验收只考虑常见电脑桌面与笔记本屏幕；窄屏和移动端不属于支持范围，既有降级样式不构成兼容承诺。
- 原本地应用仍是只读参考；没有复制素材、字幕、数据库、凭据、缓存或历史构建物。
- UI 已完成 `UI-M3-02` Rev 2 Wave A 增量设计：Rev 1 页面结构及 12 张证据冻结；批次详情新增同项目不可变热词证据侧栏和五类中文回执，员工主表统一为处理用量/质量/待对账，批次 `cancel_requested/reconciliation_required` 均有非颜色单一编码。新增 4 张 1440/1024 证据，根页面无横溢、热词侧栏焦点闭环、控制台 0/0；任务只交规划审核，不自行解锁前端。
- 规划已完成 FIFO 051 最终审核：UI 对 preparation/hotwords 两个真实 `503` 人工重读后的焦点闭环均复验通过，P0/P1=0。规划随后在精确隔离数据库 `qimao_plan_s21_close_20260814` 上运行本轮完整集成检查，18 个迁移、15 个测试文件 131 项、仓库检查、类型检查以及前端/后端/共享契约构建全部通过；隔离库已删除，本地 PostgreSQL 已停止。`FRONT-M3-02B` 单剧 ASR / Wave A 正式关闭；这不是整个 S2.1 完成，Wave B 的 `FRONT-M3-02D` 现已解锁，只集成项目中心多剧派发与员工中文识别任务列表/详情。
- 前端对 `FRONT-M3-02D` Rev 1 完成 v4.1 编码前异步状态转换预检并提交冲突审查：已确认资格、列表、详情和取消可消费现有权威接口，但多项目创建的未知结果恢复缺少可读取的稳定关联。UI 明确要求未知响应只重新读取同一 Dispatch、创建 POST 始终 1 次；现有创建成功才返回 `dispatchGroupId`，网络未知时前端拿不到该 ID，且共享契约/路由只有按 groupId 的详情 GET，没有按幂等意图读取命令结果的端点。Dispatch 详情契约也没有已确认 UI 要求持久展示的请求标识。前端不得按项目集合/时间猜任务、扫描列表认领或重发 POST 冒充 GET，故任务保持 Rev 1 并转 `blocked / Current actor=规划对话`；本轮没有修改任何生产前端或测试。
- 规划完成 FIFO 052 冲突审查并确认前端停止正确。裁决不采用同键 POST 重放，也不新增按列表猜测的恢复：创建请求改为携带前端预生成的随机 `dispatchGroupId`，后端以该 ID 创建 PostgreSQL 权威资源并持久化首次服务端 `requestId`；未知响应后前端只用已知 ID 调用现有详情 GET，暂时 404 仍保留同一意图和唯一重新读取。该技术修正不改变已确认 UI、付费边界或业务状态，新增 `BACK-M3-02F` 一次性补共享契约、增量迁移、后端实现和回归；`FRONT-M3-02D` 冻结等待，不要求用户选择或传话。
- 规划已独立复验通过 `BACK-M3-02F` Rev 1：代码核对确认预生成 ID 进入请求摘要、同键/同 ID 双锁顺序稳定、首次 `requestId` 不被重放覆盖、详情 404 无写副作用且幂等键不外露；新建精确隔离空库从零应用 19 个迁移，ASR 两文件 20/20、共享契约/后端构建、仓库与差异检查全部通过。隔离库 `qimao_plan_m302f_20260814` 已删除，默认 PostgreSQL 保持运行。FIFO 053 和后端任务关闭，`FRONT-M3-02D` Rev 2 同轮恢复，只消费新契约完成多剧 Wave B 前端。
- 用户已把跨角色主动唤醒与送达确认升级为长期强制规则，协作协议更新为 v4.2：任何交接必须依次完成状态/日志写回、只向规划或 `CURRENT` 指定接收对话发送正式唤醒、使用 `read_thread`/`wait_threads` 确认目标进入运行或明确回执；失败必须立即重试。完成汇报分别列出“状态已写回、唤醒已发送、送达/运行态已确认”，只写 `CURRENT` 不再视为通知。规划正在向 UI、后端、前端固定对话同步并确认送达；`FRONT-M3-02D` 的既有审计继续，不重做业务证据。
- v4.2 首次强制同步已完成三段闭环：状态与日志已写回；规划分别向 UI、后端、前端固定对话发送正式唤醒；`read_thread` 已确认 UI 与后端目标任务进入 `inProgress`，前端已完成明确回执“已接收 v4.2 并将执行”。三处都未修改业务文件或越级领取任务，未发生发送失败，因此无需重试；后续交接沿用同一送达门禁。
- 前端已领取 `FRONT-M3-02D` Rev 2，并按 v4.1 重新完成创建、读取、取消的异步状态转换预检：创建未知结果只按预生成 `dispatchGroupId` 读取详情，取消未知结果只重读同一详情；两类路径都不扫描列表或以恢复名义重发命令。项目中心保留既有项目查询只补充回收所需版本事实，ASR 资格、筛选、选择与派发决策仍只消费服务端权威投影。任务进入实现，单剧 ASR 冻结。
- 前端已完成 `FRONT-M3-02D` Rev 2：项目中心消费服务端资格搜索/筛选/排序/分页并支持逐行、当前页和显式跨页选择，批量确认展示服务端预检与 accepted/blocked 返回；全局作业入口提供 Dispatch 服务端列表、双状态、汇总、详情、持久创建请求标识和派发取消。创建未知结果的专项证明创建 POST 恒为 1 次，临时 404 和再次失败都只读取同一预生成 ID；取消确定/未知结果分别覆盖同键显式重试与只读恢复。多剧专项 2 文件 8/8、前端 TypeScript、155 模块生产构建、Impeccable 定向检测 `[]`、`git diff --check` 全部通过，任务交回规划总线审计。
- 规划完成 `FRONT-M3-02D` Rev 2 送 UI 前的代码、状态时序与测试覆盖审计：新鲜复跑多剧专项 2 文件 8/8、前端 TypeScript、155 模块生产构建、Impeccable 定向检测 `[]` 和 `git diff --check` 均通过；但现有回归未覆盖四组同源 P1。创建结果未知时仍可关闭确认面板，重新打开会清空原 `dispatchGroupId`/意图并允许第二次 POST；取消结果未知同样可关闭并清空原取消意图，重新打开会生成新键再次 POST。项目全集选择、资格列表/确认读取、Dispatch 列表/详情读取的人工恢复也缺少统一的提交中锁定、再次失败保留及恢复成功焦点，其中全集选择还必须在响应返回后重新校验 20 部上限。为避免 UI 再次退审，任务递增为 Rev 3 一次性异步恢复收口，后端、共享契约、DESIGN、业务状态和已通过视觉全部冻结。v4.2 三段交接已完成：状态/日志写回 v4-112，正式唤醒已发送到前端固定对话，`read_thread` 已确认消息出现且目标进入 `inProgress`；FIFO 054 关闭，任务执行中。
- 前端已完成 `FRONT-M3-02D` Rev 3 一次性异步恢复收口：创建未知结果以会话级最小资源句柄跨关闭/重开和刷新只读恢复原 `dispatchGroupId`，成功或确定不存在后清理；取消未知态锁定关闭、Escape、遮罩和第二次 POST，只允许读取同一 Dispatch。显式全集选择及项目资格列表/确认、Dispatch 列表/详情的人工读取均覆盖恢复中锁定、防重复、再次失败、请求标识和成功焦点，全集响应返回后重新核验真实总数与成员完整性。新鲜多剧专项 2 文件 13/13、TypeScript、155 模块生产构建、Impeccable `[]` 与 `git diff --check` 全部通过。v4.2 交接闭环已完成：状态/日志写回 v4-114，正式唤醒只发送给规划固定对话，`read_thread` 已确认消息出现且规划任务进入 `inProgress`；FIFO 055 现由规划审核中。
- 规划对 `FRONT-M3-02D` Rev 3 完成根因级代码/契约/可访问性审计：独立复跑多剧专项 2 文件 13/13、TypeScript、155 模块生产构建、Impeccable 检测 `[]` 和 `git diff --check` 均通过；会话句柄、取消未知锁定、全集完整性和四类恢复主体成立。但发现两个送 UI 前 P1。第一，真实后端 `ASR_DISPATCH_NOT_FOUND` 由 `asrNotFound` 返回 `404 / retryable=false / reload_asr`，而前端恰以该组合判定“确定不存在”并清除句柄；这与权威契约“详情暂时 404 仍保留同一意图、不得据此创建第二个 Dispatch”直接冲突，现有测试虚构了后端不存在的 `retryable=true 404`。第二，Dispatch 详情人工重读期间会卸载当前焦点按钮并禁用关闭，但没有把焦点转移到可编程聚焦的详情 drawer；真实浏览器可能落到 `body`，Tab 不再受弹窗约束。任务进入 Rev 4 根因修正：任何详情 404 都不得自动清除创建恢复句柄，只有成功 GET 才清理；详情重读 pending 必须聚焦 drawer 并约束 Tab/Escape。其余 Rev 3 通过项冻结。v4.2 三段交接已完成：状态/日志写回 v4-116，正式唤醒已发送到前端固定对话，`read_thread` 已确认消息出现且目标进入 `inProgress`；FIFO 055 关闭，任务执行中。
- 前端已完成 `FRONT-M3-02D` Rev 4 根因修正：未知创建的详情读取不再依据 `404 / retryable=false` 清除会话恢复句柄，真实 `ASR_DISPATCH_NOT_FOUND / reload_asr` 连续两次仍只读取同一预生成 ID，关闭/重开与卸载/刷新后继续恢复，只有成功 GET 清理，创建 POST 恒为 1 次；Dispatch 详情仅在人工重读 pending 时聚焦可编程 drawer，Tab/Shift+Tab/Escape/遮罩和重复读取均被约束，再次失败回唯一重读、成功回既有关闭按钮。新鲜多剧专项 2 文件 12/12、前端 TypeScript、155 模块生产构建和 `git diff --check` 全部通过；按派发未重复 Impeccable、未运行完整 `pnpm check`。v4.2 三段交接已完成：状态/日志写回 v4-118，正式唤醒只发送给规划固定对话，`read_thread` 已确认 FIFO 056 消息出现且规划进入 `inProgress`；同步版本递增为 v4-119，任务等待规划独立审核与统一路由。
- 规划已独立复验通过 `FRONT-M3-02D` Rev 4：源码确认 recovery GET 的任何错误都只更新诊断事实，不再清除会话句柄；只有成功 GET 清理并进入同一 Dispatch。真实后端形态的两次 404、关闭/重开、卸载/刷新、同一 ID 和创建 POST=1 回归成立。详情人工重读意图在 fetching 时聚焦 drawer，既有 pending 键盘处理阻断 Tab/Shift+Tab/Escape，遮罩与重复读取也被锁定；再次失败与成功焦点分别回唯一重读和关闭按钮，普通初始加载不进入该路径。规划新鲜复跑多剧专项 2 文件 12/12、TypeScript、155 模块生产构建和 `git diff --check` 全部通过；此前同一根因的 Impeccable `[]` 继续有效，审计评分提升为 `18/20（Excellent）`、P0/P1=0。任务已按 v4.2 主动路由 UI 做 Wave B 唯一一次正式 React 终验，正式消息已送达且 UI 任务进入 `inProgress`；完整 `pnpm check` 留 UI 通过后的规划关闭门，用户无需传话。
- UI 已领取 `FRONT-M3-02D` Rev 4 正式领域终验：完整重读 v4.2 协议、Wave B DESIGN/UI 验收、Dispatch 契约、开发日志与两个正式 React 组件，确认本轮只用正式 React + Fastify + 精确隔离匿名数据执行一次完整浏览器矩阵。任务保持 `review / Current actor=UI 设计对话`；生产前后端、迁移、共享契约与 DESIGN 只读，Rev 2 原型和 Wave A 证据冻结，不运行完整 `pnpm check`，只有新 P0/P1 才退审。
- UI 已完成 `FRONT-M3-02D` Rev 4 正式 Wave B 完整领域终验并通过：真实 23 部项目覆盖服务端搜索/资格/状态/排序/分页、当前页/跨页全量选择、成员变化清除、20 部竞态及 5 部混合 `3 accepted / 2 blocked`；22 条 Dispatch 覆盖三页服务端分页、双状态、需对账/识别中/已取消、详情与列表 503 恢复。创建响应前刷新后连续两次正式形态 404、关闭/重开仍只 GET 同一预生成 ID，第三次成功才清理，创建 POST=1；取消响应真实丢失后只读同一 Dispatch 恢复，取消 POST=1。详情人工重读 pending drawer 焦点、Tab/Shift+Tab/Escape 锁定和成功关闭焦点成立。1440、1024 侧栏 204/72 根页面均无横溢，表格横滚只在容器，控制台 `error/warn=0/0`；P0/P1/P2/P3 均为 0。隔离库、匿名数据、本轮 3002/3020/3021 和临时脚本已精确清理，3001/55432 保留。任务保持 `review` 并交规划最终审核，不由 UI 自行标记 done 或运行完整 `pnpm check`。
- `FRONT-M3-02D` Rev 4 UI 交规划的 v4.2 三段闭环已完成：状态与日志先写回 v4-123；正式唤醒仅发送到规划固定对话；`read_thread` 已确认 FIFO 057 消息出现在规划最新 turn，目标状态为 `inProgress`。送达证据写回后同步版本递增为 v4-124，FIFO 057 进入 `active`；未直接通知前端或要求用户传话。
- 规划已最终关闭 `FRONT-M3-02D` Rev 4 与 S2.1 多剧 ASR / Wave B：正式 React + Fastify 终验为 P0/P1/P2/P3=0；规划随后在精确隔离库 `qimao_plan_s21_waveb_close_20260814` 从零应用 19 个迁移，完整 `pnpm check` 通过 16 个测试文件 138 项、仓库检查、lint、类型检查及共享契约/后端/前端构建，前端构建 155 modules。隔离库已删除并确认残留 0，共享 PostgreSQL 55432 按并行边界继续运行。S2.1 正式完成；下一阶段进入 `PLAN-M3-03` 前置审改产品细化，执行角色暂不解锁。
- 用户已确认 `PLAN-M3-03` 推荐方案。规划只读核对两个本地应用的 README、V3.79–V3.82 功能契约、公司稿优先对照核心、六类决定、完成签名、逐集导航、字幕 SOP 和证据播放器，形成 `M3-pre-edit-workbench.md`：保留公司稿/ASR 原文只读、组合轴唯一所有权、人工决定不被覆盖、来源变化失效和不可变事件；云端优化为整剧/选中集/单条文本基准、PostgreSQL 恢复、直接 MP4 seek 和确定性待验收 SRT。`UI-M3-03` 与 `BACK-M3-03A` 已解锁受控并行，`FRONT-M3-03B` 等待两项规划验收。
- S3 派发已按 v4.2 完成三段闭环：规划先写回 v4-126，再分别只唤醒 UI 与后端固定对话；`read_thread` 已确认两条正式任务均位于各自最新 turn，UI 与后端均为 `inProgress`，未发生发送失败或重试。`UI-M3-03` 与 `BACK-M3-03A` 现并行执行，用户无需传话；前端继续等待两项验收依赖。
- 后端已按规划总线领取 `BACK-M3-02F` Rev 1：只补创建 body 必填预生成 `dispatchGroupId`、Dispatch 首次服务端 `requestId` 增量持久化、同 ID/幂等键冲突与既有详情 GET 只读恢复回归；冻结资格、列表查询语义、调度、取消、单剧 ASR、生产前端和 DESIGN，不新增恢复端点或暴露幂等键。
- 后端已完成 `BACK-M3-02F` Rev 1 并交规划总线复验：创建 body 必填预生成 UUID，后端显式以该 ID 创建 Dispatch 并纳入规范化摘要；首次 Fastify `requestId` 持久化后由列表/详情稳定返回，同键重放不覆盖。既有详情 GET 对未创建 ID 返回 404 且无副作用，创建响应未知后可只按已知 ID 恢复；同键异资源和同资源异键分别返回稳定冲突且不落第二条记录/子批次，普通响应不泄露幂等键。精确隔离空库从零应用 19 个迁移，ASR 两文件 20/20、共享契约/后端构建、仓库与差异检查通过；另以最新迁移 down/up 实际证明匿名历史行获得稳定非空回填。隔离库已删除，默认 PostgreSQL 保持运行；未运行完整 `pnpm check`，未改生产前端/DESIGN 或冻结的资格、列表、调度、取消、单剧 ASR。

## 当前任务看板

### 固定角色任务登记

| 角色 | Codex 任务 ID | 自动通知用途 |
| --- | --- | --- |
| 规划对话 | `019ff4f8-4a77-7870-8edf-6350490b316c` | 产品确认、冲突审查、后端验收和端到端验收 |
| UI 设计对话 | `019ff52d-d4a1-7440-81a2-fc9c1b0a0996` | UI 交付、真实页面视觉/交互验收 |
| 后端开发对话 | `019ff4de-084b-7002-a7eb-20ff93d97d0a` | 后端、迁移、共享契约和后端测试 |
| 前端开发对话 | `019ff92b-c7a6-7693-846b-fe5b3bfea3bf` | 生产前端、浏览器交互和前端测试 |

### 规划接力收件队列

队列按首次有效交接的到达顺序排列；业务状态仍以紧随其后的任务看板为准。当前全局只能有一个 `active` 项。

| 到达序号 | 任务 / Rev | 来源 | 交接事实 | 调度状态 | 说明 / 可执行条件 |
| ---: | --- | --- | --- | --- | --- |
| 001 | `BACK-M2-04A` Rev 5 | 后端开发对话 | 后端完成并请求规划独立复验 | `closed` | 规划独立复验通过并已写回 `BACK-M2-04A` Rev 6 `done` |
| 002 | `UI-M2-03` Rev 6 | UI 设计对话 | UI 完成并请求用户视觉/交互验收 | `closed` | 用户确认不通过当前列表视觉；已定向退回 `UI-M2-03` Rev 7，并自动通知 UI 对话返工 |
| 003 | `UI-M2-03` Rev 11 | UI 设计对话 | 七流程标签与上传任务边界冲突，请求规划审查 | `closed` | 规划完成职责矩阵与前后端代码审查；错误三版作废，`UI-M2-03` Rev 12 已按上传专用范围重新分派 |
| 004 | `UI-M2-03` Rev 16 | UI 设计对话 | 用户验收通过并请求规划处理前端依赖 | `closed` | 规划核对最终截图、验收记录与职责矩阵通过；`FRONT-M2-04B` Rev 6 已解锁并自动通知前端 |
| 005 | `FRONT-M2-04B` Rev 9 | UI 设计对话 | 真实页面验收发现共享 MP4 正常入口被前端素材确认错误阻断 | `closed` | 规划独立核对前后端实现与契约，确认是前端局部实现缺陷；`FRONT-M2-04B` Rev 10 已定向退回前端 |
| 006 | `FRONT-M2-04B` Rev 12 | 前端开发对话 | 完成共享 MP4 定向返工并请求规划交接审计 | `closed` | 规划核对两文件范围和正反向边界，独立专项 13/13、完整 `pnpm check` 通过；Rev 13 已路由 UI 继续剩余验收 |
| 007 | `FRONT-M2-04B` Rev 14 | UI 设计对话 | 余项复验发现 1024×768 页面级横向溢出 | `closed` | 规划核对截图测量、验收边界与正式 CSS，确认是前端局部收缩约束缺陷；Rev 15 已定向退回前端 |
| 008 | `FRONT-M2-04B` Rev 17 | 前端开发对话 | 完成 1024 横溢定向修复并请求规划交接审计 | `closed` | 规划核对唯一 CSS 改动和滚动测量口径，独立上传专项 7/7、前端构建 138 模块通过；Rev 18 已路由 UI 只复验两态 |
| 009 | `FRONT-M2-04B` Rev 19 | UI 设计对话 | 1024 展开/收起两态终验通过并请求规划最终裁决 | `closed` | 规划复核两张终验截图、测量和 Rev 8/13 冻结证据通过；Rev 20 已标记 `done`，下一切片进入用户规划门 |
| 010 | `UI-M2-04` Rev 3 | UI 设计对话 | 正式回收站交互设计完成并请求规划交接审计 | `closed` | 规划按 Product Design 审核框架复核 DESIGN、验收记录和五张截图通过；Rev 4 已路由用户验收，前端继续阻塞 |
| 011 | `BACK-M2-06` Rev 3 | 后端开发对话 | 生命周期、清理 Worker 与共享契约完成并请求规划独立复验 | `closed` | 规划独立迁移与回收专项 6/6 通过，但发现正式 UI 所需的终止上传数量、稳定回收时间/服务端排序及 CleanupJob 重试筛选没有进入共享契约；Rev 4 已定向退回后端，前端继续阻塞 |
| 012 | `BACK-M2-06` Rev 6 | 后端开发对话 | 三项共享契约定向返工完成并请求规划独立复验 | `closed` | 规划代码审查、回收专项 7/7 和完整 `pnpm check` 通过；Rev 7 已标记 `done`，`FRONT-M2-06` Rev 2 已解锁并自动通知前端 |
| 013 | `FRONT-M2-06` Rev 4 | 前端开发对话 | 正式回收站前端完成并请求规划交接审计 | `closed` | 规划独立专项 11/11 通过，但发现筛选状态迁移或不完整结果窗口会把“列表缺席”误报为“项目已清理”；Rev 5 已定向退回前端，UI 暂不路由 |
| 014 | `FRONT-M2-06` Rev 7 | 前端开发对话 | 唯一清理提示根因修正并请求规划复验 | `closed` | 规划代码核对、项目中心+回收站专项 13/13、前端构建 141 模块通过；Rev 8 保持 `review` 并已自动路由 UI 做正式页面终验 |
| 015 | `FRONT-M2-06` Rev 9 | UI 设计对话 | 正式页面终验发现项目回收确认框键盘/焦点管理缺失 | `closed` | 规划按真实 DOM 证据和 Impeccable 无障碍审计规则确认退审成立；Rev 10 已定向退回前端，仅修确认框焦点闭环，回收站主体全部冻结 |
| 016 | `FRONT-M2-06` Rev 12 | 前端开发对话 | 完成确认框焦点闭环定向返工并请求规划交接审计 | `closed` | 规划核对两文件范围与动态焦点路径，独立项目中心+回收站专项 15/15、前端构建 141 模块通过；Rev 13 已路由 UI 只做确认框真实键盘终验 |
| 017 | `FRONT-M2-06` Rev 14 | UI 设计对话 | 真实 409 失败后焦点落到 `body`，请求规划定向裁决 | `closed` | 规划确认单次 `queueMicrotask` 早于真实错误渲染/焦点脱落时序，属于 P1 动态焦点缺陷；Rev 15 已退回前端只修错误态提交后的确定聚焦并补延迟失败回归 |
| 018 | `FRONT-M2-06` Rev 17 | 前端开发对话 | 完成错误态 effect 修正并请求规划复验 | `closed` | 原 409 修正和独立专项/构建通过，但规划在送 UI 前发现提交中双按钮禁用后无弹窗内焦点目标，现有测试未覆盖 Tab 逃逸；Rev 18 继续定向补弹窗容器焦点，不制造新的 UI 往返 |
| 019 | `FRONT-M2-06` Rev 20 | 前端开发对话 | 完成提交中弹窗容器焦点约束并请求规划复验 | `closed` | 规划核对状态 effect 与完整延迟断言，独立专项 15/15、构建 141 模块、Impeccable `[]` 通过；Rev 21 已路由 UI 一次性终验真实失败与可控 pending |
| 020 | `FRONT-M2-06` Rev 22 | UI 设计对话 | 真实 409 通过；提交中动态包装器受合规工具隔离，请求规划裁决 | `closed` | 规划接受已独立核对的可控延迟 DOM 回归为等价证据；用户授权后完整 `pnpm check` 退出码 0、PostgreSQL 已停止，任务关闭 |
| 021 | `UI-M3-01` Rev 1 | UI 设计对话 | 正式术语页设计、状态矩阵与 6 张视觉证据完成，请求规划审查 | `closed` | 规划核对 DESIGN、S1 契约、职责矩阵、验收记录与全部证据图通过；未发现 P0/P1 或范围越界，现路由用户只做方向验收，前端依赖仍未满足 |
| 022 | `BACK-M3-01A` Rev 1 | 后端开发对话 | 术语后端权威流程完成并请求规划独立复验 | `closed` | 规划独立从零迁移 12 项、术语 8/8、全部后端 51/51、双构建、仓库检查和真实 XLSX 导入渲染通过；发现人工新增全空白名称会落到数据库约束并误报可重试 500，且跨类型同名冲突文案不准确，已合并为 Rev 2 一次最小定向返工 |
| 023 | `BACK-M3-01A` Rev 2 | 后端开发对话 | 人工新增输入边界返工完成并请求规划复验 | `closed` | 规划独立核对两文件范围，术语专项 8/8、后端构建和 `git diff --check` 通过；空白名与跨类型同名语义均正确，数据库已停止，Rev 2 标记 `done` |
| 024 | `UI-M3-01` Rev 2 | UI 设计对话 | 全量采用/导出与公司模板管理增量设计完成，请求规划交接审计 | `closed` | 设计与交互主体验收通过，但两张最终截图未证明当前代码事实：模板图仍为旧 `content/notes`，失败图未显示行级原因/重试；已定向退回 Rev 3 只刷新证据，不重做设计 |
| 025 | `BACK-M3-01C` Rev 1 | 后端开发对话 | 公司模板版本与显式导出绑定完成，请求规划独立复验 | `closed` | 主链路与定向验证通过；规划发现嵌套列对象接收未声明配置、旧无绑定 v1 直出形成双路径两个 P2 缺口，已合并为 Rev 2 最小返工；UI 队列 024 不受影响，前端继续阻塞 |
| 026 | `UI-M3-01` Rev 3 | UI 设计对话 | 两张最终证据已与当前原型和共享字段同步，请求规划复核 | `closed` | 规划人工核对两张最终图通过：五字段、顶部门禁、具体失败原因、唯一重试和无缓存事实一致；现路由用户确认最终增量方向，前端尚未解锁 |
| 027 | `BACK-M3-01C` Rev 2 | 后端开发对话 | 两项导出契约定向返工完成，请求规划独立复验 | `closed` | 规划代码核对并独立复跑术语专项 8/8、共享契约/后端构建、`git diff --check` 全部通过；两项 P2 已关闭，本地 PostgreSQL 已停止 |
| 028 | `FRONT-M3-01B` Rev 1 | 前端开发对话 | 发现人工新增证据与历史导出刷新缺少权威读取契约，请求规划冲突审查 | `closed` | 规划独立代码核对确认两项均成立；禁止前端缓存或猜测，已合并为 `BACK-M3-01D` 一次最小后端补充，前端原任务冻结等待 |
| 029 | `BACK-M3-01D` Rev 1 | 后端开发对话 | Cue 与版本导出只读契约完成，请求规划独立复验 | `closed` | 规划核对共享契约、路由、两只读仓储和回归，并独立复跑术语专项 9/9、共享契约/后端构建、`git diff --check` 全部通过；数据库已停止，前端原任务恢复 |
| 030 | `FRONT-M3-01B` Rev 1 | 前端开发对话 | 正式术语页及等价矩阵三行写回完成，请求规划独立审计 | `closed` | 规划独立专项 6/6 与构建通过，但发现生命周期/来源/状态转换后端门禁、版本与导出单一幂等发布、Cue 分页及两处视觉规则缺口；已合并为一次后端前置和一次前端收口，不提前路由 UI |
| 031 | `BACK-M3-01E` Rev 1 | 后端开发对话 | 候选权威写入门禁与单一幂等发布事务完成，请求规划独立复验 | `closed` | 规划独立核对事务锁、非法迁移、回收/来源/运行提取门禁、失败回滚和版本—模板—导出同键重放，并复跑术语专项 11/11、双构建、仓库检查与差异检查通过；数据库已停止，前端 Rev 2 解锁 |
| 032 | `FRONT-M3-01B` Rev 2 | 前端开发对话 | 正式术语页数据完整性收口完成，请求规划独立审计 | `closed` | 规划独立复验自动化全部通过，但送 UI 前完整交互审计发现当前页选择跨页残留、候选/模板提交中与失败焦点脱离、确定性发布错误永久复用旧意图三项恢复缺口；已合并为 Rev 3 一次最小返工，暂不路由 UI |
| 033 | `FRONT-M3-01B` Rev 3 | 前端开发对话 | 送 UI 前三项交互恢复收口完成，请求规划独立审计 | `closed` | 规划代码核对并独立复跑术语专项 17/17、TypeScript、145 模块构建、Impeccable `[]` 与差异检查通过，三项恢复行为成立且无新 P0/P1；按停止线路由 UI 一次性真实终验 |
| 034 | `FRONT-M3-01B` Rev 3 | UI 设计对话 | 正式 React 完整 UI 终验通过并请求规划最终审核 | `closed` | 规划抽查关键截图与完整矩阵通过，P0/P1=0；完整 `pnpm check` 退出码 0，PostgreSQL 已停止，S1 正式关闭。P2/P3 只进入后置清单，不返工当前切片 |
| 035 | `BACK-M3-02A` Rev 1 | 后端开发对话 | S2 ASR 权威批次、租约 Worker、确定性 fake 与恢复契约完成，请求规划独立复验 | `closed` | 规划独立专项 6/6、共享契约/后端构建通过；批次状态机基线成立，但多厂商适配元数据、媒体/热词执行上下文、同构 Usage 与可启动 Worker 仍被 fake 写死或缺失，已合并为 Rev 2 一次定向返工；不接真实供应商 |
| 036 | `UI-M3-02` Rev 1 | UI 设计对话 | 正式中文识别批次页、完整状态矩阵及 12 张视觉证据完成，请求规划交接审计 | `closed` | 规划复核 12 张交付证据与验收矩阵，P0/P1=0；两个实现词 P2 留正式前端收口，不制造 UI 返工。现只路由用户方向验收，不直接解锁前端 |
| 037 | `BACK-M3-02A` Rev 2 | 后端开发对话 | 多适配器登记边界、厂商中立执行上下文/Usage 与本地 Worker 启停闭环完成，请求规划独立复验 | `closed` | 规划重新应用迁移并独立复跑 ASR 7/7、共享契约与后端构建通过；当前零网络多适配器边界关闭。生产授权门和适配器异常兜底登记为真实供应商接入前硬门，完整质量门留 S2 关闭 |
| 038 | `BACK-M3-02C` Rev 1 | 后端开发对话 | Wave A 批次状态、权威热词预览及 Attempt payload/回执证据完成，请求规划独立复验 | `closed` | 规划重新应用迁移并独立复跑 ASR 9/9、共享契约/后端构建和仓库边界检查全部通过；代码与范围审查通过，本地 PostgreSQL 已停止，完整 `pnpm check` 留 Wave A 集成门 |
| 039 | `UI-M3-02` Rev 2 | UI 设计对话 | Wave A 热词证据、五类回执、批次新状态与员工用量简化完成，请求规划交接审计 | `closed` | 规划核对 DESIGN、完整矩阵、原型与证据 13–16 通过，P0/P1=0；Wave A 完整 `pnpm check` 退出码 0，数据库已停止。P3 内部边界卡在正式前端省略，不返工 UI |
| 040 | `BACK-M3-02D` Rev 1 | 后端开发对话 | Wave B Dispatch、项目资格与公平调度完成，请求规划独立复验 | `closed` | 规划独立迁移、ASR 专项、双构建、仓库与差异检查通过，冻结创建幂等/竞态/4-1 公平调度；正式 UI 契约审计发现接受结果与运行状态混用、服务端列表/项目资格投影不足和派发级取消缺口，已合并为 Rev 2 一次定向收口 |
| 041 | `UI-M3-02D` Rev 1 | UI 设计对话 | Wave B 项目中心多剧选择、批量确认和员工中文识别任务设计完成，请求规划交接审计 | `closed` | 整体信息架构、视觉与 7→18 选择方向通过；同一 Dispatch 逐项目事实漂移、创建提交中可关闭/重复风险、缺少派发取消确认与恢复三项 P1 已合并为 Rev 2 定向修正，既有通过证据冻结 |
| 042 | `BACK-M3-02D` Rev 2 | 后端开发对话 | 服务端状态、项目资格、Dispatch 汇总和取消完成，请求规划独立复验 | `closed` | 隔离空库迁移、ASR 15/15、双构建及仓库检查通过；规划发现 blocked 项目污染 accepted 汇总、资格逐集查询放大及空页 total 归零三项送前端前缺口，已合并为 Rev 3 一次最小返工，其余通过项冻结 |
| 043 | `FRONT-M3-02B` Rev 1 | 前端开发对话 | 单剧正式前端完成审查发现热词证据、批次全集查询与逐集复用预览缺少权威接口，请求规划冲突审查 | `closed` | 规划独立核对 UI 契约、共享 TypeBox 和正式前端，三项冲突全部成立；不允许降低验收或由前端猜测，已固化批次绑定热词证据、服务端全集查询和一次性逐集准备投影语义，新增 `BACK-M3-02E` 等后端当前任务关闭后一次收口。全局弱文字对比度、回执 marker 与状态事实文案并入下一轮前端，不制造单独往返 |
| 044 | `UI-M3-02D` Rev 2 | UI 设计对话 | Wave B 派发事实、创建锁定、取消确认和选择语义已定向收口，请求规划交接审计 | `closed` | 规划核对 DESIGN、验收矩阵、原型代码与证据 12–16 通过；同一 Dispatch 事实、创建/取消单次请求和提交锁定、失败/未知恢复、取消影响范围与选择失效语义成立，P0/P1=0，UI 任务关闭 |
| 045 | `BACK-M3-02D` Rev 3 | 后端开发对话 | accepted 汇总、100 集集合查询与空页总数完成，请求规划独立复验 | `closed` | 规划没有清理含其他匿名夹具的默认库；改用精确隔离空库应用 17 个迁移，ASR 两文件 16/16、后端构建、仓库与差异检查通过，代码核对三项修正成立。Rev 3 关闭，隔离数据库规则进入 S2.1 试运行 |
| 046 | `BACK-M3-02E` Rev 1 | 后端开发对话 | 单剧批次热词证据、Attempt 回执、服务端全集查询与逐集准备投影完成，请求规划独立复验 | `closed` | 规划代码核对通过；新隔离空库应用 18 个迁移，ASR 两文件 18/18、共享契约/后端构建、仓库与差异检查通过，临时库已删除。后端任务关闭，单剧前端 Rev 2 解锁 |
| 047 | `FRONT-M3-02B` Rev 2 | 前端开发对话 | 单剧权威准备、服务端批次查询、批次热词证据和五态回执收口完成，请求规划独立审计 | `closed` | 规划独立专项 10/10、TypeScript 与 150 模块构建通过；核心权威读取和视觉收口成立。送 UI 前发现逐集准备失败缺请求标识、热词证据失败缺请求标识与唯一重新读取动作，已合并为 Rev 3 最小返工，其余通过项冻结 |
| 048 | `FRONT-M3-02B` Rev 3 | 前端开发对话 | 两个新增只读入口的错误恢复事实完成，请求规划独立审计 | `closed` | 规划独立复跑单剧专项 12/12、TypeScript、150 模块构建、Impeccable `[]` 与差异检查通过；两处失败的原因、请求标识、唯一原查询恢复动作及恢复成功均成立，现统一路由 UI 一次性正式终验 |
| 049 | `FRONT-M3-02B` Rev 3 | UI 设计对话 | 正式页面终验发现两个错误面恢复成功后焦点共同落到 `body`，请求规划裁决 | `closed` | 规划核对真实 DOM 证据、面板 effect 和两条回归后确认 P1 成立：错误按钮卸载后没有 error→success 的确定聚焦。已合并为 Rev 4 一次最小返工，其余业务、视觉、响应式和错误恢复事实全部冻结 |
| 050 | `FRONT-M3-02B` Rev 4 | 前端开发对话 | 两个只读查询人工恢复成功后的弹窗焦点闭环完成，请求规划独立审计 | `closed` | 规划核对一次性意图与 layout effect 成立，独立单剧专项 12/12、TypeScript、150 模块构建、Impeccable `[]`、差异检查通过；仅路由 UI 复验两个真实恢复焦点场景 |
| 051 | `FRONT-M3-02B` Rev 4 | UI 设计对话 | 两个真实 503 人工重读恢复后的关闭按钮焦点与 Tab 语境复验通过，请求规划最终审核 | `closed` | 规划接受两处真实复验；精确隔离库完整 `pnpm check` 通过 15 文件 131 项及全部构建，隔离库删除、PostgreSQL 停止。单剧 ASR / Wave A 关闭，`FRONT-M3-02D` 同轮解锁 |
| 052 | `FRONT-M3-02D` Rev 1 | 前端开发对话 | 编码前异步状态预检发现创建未知结果无法按已确认 UI 只读恢复，请求规划冲突审查 | `closed` | 规划确认冲突成立，裁决为创建前预生成 `dispatchGroupId` + 现有详情 GET 只读恢复，并持久化首次服务端 `requestId`；新增 `BACK-M3-02F`，前端冻结等待 |
| 053 | `BACK-M3-02F` Rev 1 | 后端开发对话 | Dispatch 已知 ID 恢复、首次 requestId 持久化与稳定冲突完成，请求规划独立复验 | `closed` | 规划代码核对通过；精确隔离空库 19 个迁移、ASR 两文件 20/20、共享契约/后端构建、仓库与差异检查通过，隔离库已删除。后端关闭，前端 Rev 2 解锁 |
| 054 | `FRONT-M3-02D` Rev 2 | 前端开发对话 | 多剧 Wave B 前端完成并请求规划独立审计 | `closed` | 规划复验现有 8/8、TypeScript、155 模块构建、Impeccable `[]` 与差异检查均通过，但异步状态审计发现创建/取消未知结果关闭后可丢失原意图并再次 POST，以及全集选择和四类读取恢复缺少完整锁定/再次失败/成功焦点闭环；Rev 3 状态/日志已写回，正式唤醒已发送，`read_thread` 已确认前端消息出现并进入 `inProgress` |
| 055 | `FRONT-M3-02D` Rev 3 | 前端开发对话 | 多剧异步恢复收口完成，请求规划独立审计 | `closed` | 规划独立 13/13、TypeScript、155 模块构建、Impeccable `[]` 与差异检查均通过，但根因审计确认真实后端所有 Dispatch 404 均为 `retryable=false`，前端会错误清除未知创建句柄；详情重读 pending 也未把焦点约束在 drawer。Rev 4 状态/日志已写回，正式唤醒已发送，`read_thread` 已确认前端消息出现并进入 `inProgress` |
| 056 | `FRONT-M3-02D` Rev 4 | 前端开发对话 | 真实 Dispatch 404 句柄与详情人工重读焦点根因修正完成，请求规划独立审计 | `closed` | 规划已独立通过：真实形态连续 404 保留同一句柄、成功才清理，详情重读 pending 焦点与键盘约束成立；新鲜 12/12、TypeScript、155 模块构建、差异检查通过，P0/P1=0。状态/日志已写回 v4-120，正式唤醒只发送给 UI 固定对话，`read_thread` 已确认消息位于 UI 最新 turn 且任务进入 `inProgress`；v4.2 交接闭环完成，UI 正式 React 终验正在执行 |
| 057 | `FRONT-M3-02D` Rev 4 | UI 设计对话 | 正式 Wave B 完整领域终验通过，请求规划最终审核与完整质量门 | `closed` | 规划接受正式 UI 终验，P0/P1/P2/P3=0；精确隔离库从零 19 迁移，完整 `pnpm check` 通过 16 文件 138 项及全部检查/构建。隔离库删除且残留 0，共享 PostgreSQL 保持运行；任务与 S2.1 正式关闭，转入 `PLAN-M3-03` 用户产品细化 |
| 058 | `UI-M3-03` Rev 1 | UI 设计对话 | 正式前置审改工作台设计、可操作原型、完整状态与 1440/1024 证据完成，请求规划独立交接审计 | `closed` | 规划确认总体方向与边界成立并定向退回四项同源缺口；状态/日志写回 v4-132，正式唤醒只发送 UI 固定对话，`read_thread` 已确认消息位于最新 turn 且 UI `inProgress`。Rev 2 进入执行，前端不解锁 |
| 059 | `BACK-M3-03A` Rev 1→2 | 后端开发对话 | Rev 1 独立复验后合并真实运行、来源、策略证据与并发一致性返工 | `closed` | 状态/日志已写回 v4-137；正式退审只唤醒后端固定对话；`read_thread` 已确认完整 Rev 2 消息位于后端最新 turn 且状态为 `inProgress`。四组根因进入一次性修正，前端仍阻塞，用户无需传话 |
| 060 | `UI-M3-03` Rev 2 | UI 设计对话 | 四项同源缺口完成定向修正并补 5 张证据，请求规划独立审核 | `closed` | 规划已对截图、源码与应用内浏览器真实 DOM/键盘独立审核通过，P0/P1=0；v4-142 转 `Current actor/Reviewer=用户` 只确认正式 UI 方向。前端仍等待 UI 用户确认与后端 Rev 2 规划验收双依赖，不提前解锁 |
| 061 | `BACK-M3-03A` Rev 2→3 | 后端开发对话 | Rev 2 独立复验发现 limited 单集仍可被后端完成并签名，定向退回权威完成门禁 | `closed` | 规划隔离空库 21 迁移、三文件 30/30、双构建与仓库检查通过；真实样本复现 `limited → completed + signature`。状态/日志先写回 v4-147；正式唤醒只发送后端固定对话，`read_thread` 已确认消息与“已领取 / in_progress”回执；后端 v4-148 领取后，规划以 v4-149 关闭交接。其他通过项冻结，前端不解锁 |
| 062 | `BACK-M3-03A` Rev 3 | 规划对话 | limited 完成门禁与全量零副作用回归完成，请求规划独立复验 | `closed` | 规划确认事务/行锁内门禁与全量零副作用断言成立；独立隔离空库 21 个迁移、前置审改专项 7/7、后端构建和差异检查通过，隔离库已删除。后端任务关闭；前端只剩 UI 用户确认依赖，不提前通知或解锁 |
| 063 | `UI-M3-03` Rev 3 | UI 设计对话 | 用户方向确认后补竖屏视频、双来源层级和可选自动筛选摘要，请 UI 定向更新原型与证据 | `closed` | 状态、权威契约和日志先写回 v4-153；正式唤醒只发送 UI 固定对话；`read_thread` 已确认消息位于 UI 最新 turn 且任务为 `inProgress`。UI 已开始执行，前端仍等待正式交付 |
| 064 | `UI-M3-03` Rev 3 | UI 设计对话 | 三项定向 UI 增量、4 张新证据及 1440/1024 真实浏览器结果完成，请规划独立审核并统一路由用户 | `closed` | 规划已用本轮新鲜 1440/1024 截图、DOM/布局测量、原型源码与前置审改契约完成独立审核，P0/P1=0；Rev 3 自动筛选数字和 AI 状态明确只作未来状态设计，正式前端不得伪造当前后端没有的筛选投影。任务转用户体验确认，确认后同轮解锁前端 |
| 065 | `UI-M3-03` Rev 4 | 规划对话 | 用户确认紧凑播放器按需放大、无文字双色关系分隔、本集全轴抽屉、小型 AI 快速筛选进度和非阻断风险定位，请 UI 定向收口 | `closed` | UI 已完成定向设计、真实浏览器矩阵和 9 张新证据；转 FIFO 066 交规划独立审核，前端仍不解锁 |
| 066 | `UI-M3-03` Rev 4 | UI 设计对话 | Rev 4 定向原型、权威设计增量、全状态/焦点/1440/1024 证据完成，请规划独立审核并统一路由用户 | `closed` | 规划已用本轮新鲜 1440/1024 浏览器测量、DOM/键盘、原型源码与证据完成独立审核，P0/P1=0；播放器放大、无文字中缝、全轴只读定位和 AI 原位进度方向成立。任务转用户方向确认，前端继续保持 blocked |
| 067 | `FRONT-M3-03B` Rev 1 | 规划对话 | 用户确认 UI Rev 4；双依赖满足，正式解锁 React 前置审改工作台集成 | `closed` | 状态与日志先写回 v4-165；正式唤醒只发送前端固定对话；`read_thread` 已确认完整消息位于最新 turn，`wait_threads` 显示目标为 `active / inProgress`。送达与运行态成立，前端已开始预检 |
| 068 | `FRONT-M3-03B` Rev 1 | 前端开发对话 | 正式 React 前置审改工作台、回归与真实浏览器证据完成，请求规划独立审核 | `closed` | 规划独立专项 7/7、全部前端 69/69、TypeScript、160 模块构建、Impeccable `[]` 与真实页面复验完成；确认五组 P1 根因并合并退回 Rev 2，不通知 UI |
| 069 | `FRONT-M3-03B` Rev 2 | 规划对话 | 一次性修正跨集旧数据、确定性错误重试、全局脏态离开、媒体失败和无文字中缝回归 | `closed` | 状态与日志先写回 v4-170；正式唤醒只发送前端固定对话；`read_thread` 已确认完整任务位于最新 turn，`wait_threads` 显示目标为 `active / inProgress`。前端已开始状态转换预检，送达闭环完成 |
| 070 | `FRONT-M3-03B` Rev 2 | 规划对话 | 用户确认当前 React 未充分复原 UI Rev 4，追加同状态高保真视觉复原门 | `closed` | 状态/协议/验收先写回 v4-173；正式唤醒仅发送前端固定对话；`read_thread`/`wait_threads` 已确认前端保持 `active / inProgress` 并明确把 v4.3 一致性门并入当前 Rev 2。不得伪造真实视频、集数、AI/风险事实，不重新设计或扩大业务范围 |
| 071 | `FRONT-M3-03B` Rev 2 | 前端开发对话 | 五组 P1 与 UI Rev 4 同状态高保真复原完成，请求规划映射审核 | `closed` | 前端→规划交接已在 v4-176 送达；规划独立映射审核、专项 11/11、TypeScript 与 160 模块构建通过后写回 v4-177，并只唤醒 UI 固定对话。`wait_threads` 确认 UI `active / inProgress` 且明确领取正式 React 终验；v4.3 状态/唤醒/送达闭环完成 |
| 072 | `FRONT-M3-03B` Rev 2 | UI 设计对话 | 正式 React 终验发现全轴定位后焦点逃到遮罩后媒体错误，提交唯一 P1 与最小修正建议 | `closed` | 状态、验收与日志先写回 v4-180；正式唤醒只发送规划固定对话；`read_thread` 确认完整退审已到达，`wait_threads` 显示规划 `active / inProgress`，并明确回执按微返工只修焦点所有权、不重做页面或完整矩阵。送达闭环写回 v4-181 |
| 073 | `FRONT-M3-03B` Rev 3 | 规划对话 | 只修活动全轴模态层与后台媒体错误之间的焦点所有权冲突 | `closed` | 状态与日志写回 v4-182 后规划正式唤醒前端；前端写回 v4-183 并进入 `in_progress`，规划当前 turn 已明确观察到领取与执行，派发送达闭环完成 |
| 074 | `FRONT-M3-03B` Rev 3 | 前端开发对话 | 活动模态层与后台媒体错误焦点所有权修正完成，请求规划定向审核 | `closed` | 前端→规划与规划→UI 路由已成立；UI 两场景微复验写回 v4-188 并只唤醒规划固定对话，`read_thread` 确认完整通过结论已出现，`wait_threads` 显示规划 `active / inProgress`。送达闭环写回 v4-189，下一步由规划运行关闭门 |
| 075 | `UI-M3-04` Rev 1 | UI 设计对话 | 正式画面字工作台、全状态矩阵、可操作原型与 1440/1024 证据完成，请求规划代理验收 | `closed` | 状态与日志先写回 v4-197；正式交审只发送规划固定对话；`read_thread` 已确认完整消息位于规划最新 turn，`wait_threads` 显示规划 `active / inProgress`。送达闭环写回 v4-198，UI 停止并等待代理裁决 |
| 076 | `BACK-M3-04A` Rev 1 | 后端开发对话 | 画面字权威后端、三类零网络 Adapter、租约 Worker、人工审计与不可变 SRT 完成，请求规划独立复验 | `closed` | 状态与日志先写回 v4-199；正式交审只发送规划固定对话；规划明确回执已收到且目标为 `active / inProgress`。送达闭环写回 v4-200；规划按 FIFO 先审 UI、随后复验后端，前端继续 blocked，后端停止修改 |
| 077 | `UI-M3-04` Rev 2 | 规划对话 | 代理验收发现来源失效态仍可执行旧草稿写操作，集中定向退回 UI | `closed` | 状态、验收记录与日志先写回 v4-201；正式唤醒只发送 UI 固定对话；`wait_threads` 确认 UI 明确领取并为 `active / inProgress`。UI 已完成唯一 stale 定向返工并转 FIFO 078 交审 |
| 078 | `UI-M3-04` Rev 2 | UI 设计对话 | stale 旧草稿写入口全部关闭并补真实 DOM、键盘和 1440 同状态证据，请求规划微复验 | `closed` | 状态、验收与日志先写回 v4-203；正式交审只发送规划固定对话；`read_thread` 确认完整 FIFO 078 / v4-203 消息位于规划当前 turn，`wait_threads` 显示规划 `active / inProgress`。送达闭环写回 v4-204，UI 停止等待裁决 |
| 079 | `UI-M3-04` Rev 3 | 规划对话 | stale 微复验发现右侧“忽略”“保留并下一条”仍可见且 enabled，定向退回最后两个旧草稿动作 | `closed` | UI 已按定向范围完成显式隐藏与原生禁用，并转 FIFO 080 提交规划微复验；其余 Rev 1/2 全部冻结 |
| 080 | `UI-M3-04` Rev 3 | UI 设计对话 | 最后两个 stale 旧草稿动作已关闭并补真实 DOM 证据，请求规划微复验 | `closed` | 状态、验收与日志先写回 v4-207；正式交审只发送规划固定对话；`read_thread` 确认完整消息已进入规划当前 turn，`wait_threads` 显示规划 `active / inProgress`。送达闭环写回 v4-208，UI 停止等待裁决 |
| 081 | `BACK-M3-04A` Rev 2 | 规划对话 | 独立审核集中退回付费防重、全集/术语来源、真实截图证据、左右配对和同构 Usage 五组 P1 | `closed` | 后端已于 v4-210 领取并一次性完成五组修正，转 FIFO 082 提交规划独立复验；Rev 1 冻结项未回开，未改前端/DESIGN、未接真实网络/密钥/付费/R2 |
| 082 | `BACK-M3-04A` Rev 2 | 后端开发对话 | 五组数据、证据与付费安全缺口完成，请求规划独立复验 | `closed` | 状态与日志先写回 v4-211；正式交审只发送规划固定对话；`read_thread` 确认完整消息进入规划当前 turn，`wait_threads` 显示规划 `active / inProgress`。送达闭环写回 v4-212，后端停止等待独立复验，不通知前端 |
| 083 | `FRONT-M3-04B` Rev 1 | 规划对话 | UI 与后端双依赖已通过，正式解锁画面字 React 工作台 | `closed` | 状态与日志先写回 v4-213；正式唤醒只发送前端固定对话；`wait_threads` 确认目标为 `active / inProgress`。前端完成编码前预检并于 v4-215 提交阻断性 UI/API 冲突，转 FIFO 084 交规划裁决 |
| 084 | `FRONT-M3-04B` Rev 1 | 前端开发对话 | 编码前预检发现批次/发布历史发现与候选服务端排序缺少权威读取契约，请求规划冲突审查 | `closed` | 状态与日志先写回 v4-215；正式唤醒只发送规划固定对话；`read_thread` 确认完整 FIFO 084 消息出现，`wait_threads` 确认规划为 `active / inProgress`。任务保持 `blocked / Current actor=规划对话`，生产前端与测试未修改，前端停止等待裁决 |
| 085 | `BACK-M3-04C` Rev 1 | 规划对话 | 补批次/发布历史发现与候选四种服务端稳定排序，只读解阻正式前端 | `closed` | 状态与日志先写回 v4-217；正式唤醒只发送后端固定对话；`wait_threads` 确认后端明确收到 FIFO 085 且为 `active / inProgress`；后端已完成只读切片并以 v4-219 转交规划复验 |
| 086 | `BACK-M3-04C` Rev 1 | 后端开发对话 | 批次/发布只读发现与候选稳定排序完成，请求规划独立复验 | `closed` | 状态与日志先写回 v4-219；正式唤醒只发送规划固定对话；`read_thread` 确认 FIFO 086 消息进入最新 turn，规划为 `active / inProgress`。送达闭环写回 v4-220，后端停止修改，不直接通知或解锁前端 |
| 087 | `FRONT-M3-04B` Rev 1 | 规划对话 | BACK-M3-04C 规划独立复验通过，恢复正式画面字 React 工作台开发 | `closed` | 状态与日志先写回 v4-221；正式唤醒只发送前端固定对话；`wait_threads` 确认前端明确收到 FIFO 087 且为 `active / inProgress`。前端已完成实现、测试、真实浏览器与 finish review，转 FIFO 088 交规划独立审核 |
| 088 | `FRONT-M3-04B` Rev 1 | 前端开发对话 | 正式画面字 React 工作台、权威恢复、高保真与全量前端验证完成，请求规划独立审核 | `closed` | 状态与日志先写回 v4-223；规划在 v4-225 完成预审并确认主体通过，但退回同键异参 P1，转 FIFO 089 定向微返工；完整 `pnpm check` 继续留正式 UI 终验后的 S4 单次关闭门 |
| 089 | `FRONT-M3-04B` Rev 2 | 规划对话 | 冻结五类命令的完整后端请求身份，关闭同键异参 P1 | `closed` | 状态与日志先写回 v4-225；正式唤醒只发送前端固定对话；`wait_threads` 确认前端明确收到 FIFO 089 并为 `active / inProgress`。前端已完成两文件定向修复与 11/11 专项，转 FIFO 090 交规划微审 |
| 090 | `FRONT-M3-04B` Rev 2 | 前端开发对话 | 五类命令完整请求身份已冻结，请求规划定向微审 | `closed` | 状态与日志先写回 v4-227；规划于 v4-229 完成定向代码审计与新鲜 11/11、TypeScript、164 modules 构建、差异检查，结论通过并转 FIFO 091 路由 UI 正式终验 |
| 091 | `FRONT-M3-04B` Rev 2 | 规划对话 | 规划微审通过，正式路由 UI 完整领域终验 | `closed` | UI 已完成完整终验并在 §15 记录 P0=0/P1=2；同状态高保真、主要状态、响应式、键盘和控制台通过，但左右配对发布门禁与证据不可用阻断均存在真实 P1，转 FIFO 092 交规划裁决 |
| 092 | `FRONT-M3-04B` Rev 2 | UI 设计对话 | 正式领域终验发现发布闭环与证据/来源门禁两项 P1，请求规划审查并定向返工 | `closed` | 规划确认两项 P1 成立并在 v4-233 拆为互不重叠的 FIFO 093 后端决定门禁与 FIFO 094 前端状态/证据门禁；其余 §15 通过项冻结，完整 `pnpm check` 继续冻结 |
| 093 | `BACK-M3-04D` Rev 1 | 规划对话 | 未拆分左右父候选仅可忽略或拆分；保留/编辑稳定拒绝且零副作用 | `closed` | 后端已完成稳定持久化身份门禁、非法 approve/edit 零副作用及 ignore/split→发布回归，并以 v4-236 转交规划微审 |
| 094 | `FRONT-M3-04B` Rev 3 | 规划对话 | 同步左右父候选动作资格、来源门禁写锁及代表截图唯一权威重读 | `closed` | 前端已完成正式 identity 动作限制、批量排除提示、evidence query 统一写锁与 requestId/唯一重读；screen-text 专项 14/14、TypeScript、164 modules 构建、Impeccable `[]`、差异检查通过，转 FIFO 096 交规划微审 |
| 095 | `BACK-M3-04D` Rev 1 | 后端开发对话 | 左右父候选决定门禁与零副作用回归完成，请求规划独立微审 | `closed` | 状态与日志先写回 v4-236；正式唤醒只发送规划固定对话；`read_thread` 确认完整消息进入最新 turn，规划为 `active / inProgress`。送达闭环写回 v4-237，后端停止修改，不直接通知前端/UI |
| 096 | `FRONT-M3-04B` Rev 3 | 前端开发对话 | 父候选动作与来源/证据统一写锁完成，请求规划独立微审 | `closed` | 状态与日志先写回 v4-238；正式唤醒只发送规划固定对话；`read_thread` 确认完整消息进入规划最新 turn，规划为 `active / inProgress`。送达闭环写回 v4-239，前端停止修改，不直接通知 UI |
| 097 | `FRONT-M3-04B` Rev 3 | UI 设计对话 | 双微审通过，只路由 UI 复验 §15 两个原失败场景 | `closed` | UI 基于 v4-240 领取并完成；正式父候选逐条/混合批量→拆分→不可变发布、来源全写锁及 evidence `503→503→200` 唯一重读恢复全部通过，P0/P1=0，证据见验收 §16 |
| 098 | `FRONT-M3-04B` Rev 3 | UI 设计对话 | 两场景微终验通过，请规划运行一次完整关闭门并裁决 S4 | `closed` | 状态、验收 §16 与日志先写回 v4-242；正式唤醒只发送规划固定对话，`read_thread` 确认完整消息进入最新 inProgress turn，`wait_threads` 确认规划为 active/inProgress；送达闭环写回 v4-243 |
| 099 | `FRONT-M3-04B` Rev 3 / S4 | 规划对话 | 运行唯一完整质量门并正式关闭画面字模块 | `closed` | 精确隔离库从零 22 个迁移；完整 `pnpm check` 20 文件 184/184、全部检查和构建通过；隔离库残留 0，本地 PostgreSQL 已停止。S4 标记 done，不自动启动 S5 |
| 100 | S4 关闭同步 | 规划对话 | 把最终完成状态同步给固定 UI/前端/后端对话 | `closed` | UI、前端已收到并明确等待；后端为 notLoaded，首次消息入队但未唤醒，立即重试返回 agent loop died unexpectedly。因后端任务已 done、无后继动作，权威 CURRENT 已覆盖，不阻塞且无需用户转述 |
| 101 | `UI-M3-05` Rev 1 | 规划对话 | 启动 S5 字幕验收工作台 UI 设计与完整验收矩阵 | `closed` | 状态与契约已写回 v4-247；唤醒已只发送 UI 固定对话；`read_thread` 确认消息送达、UI 明确回执并进入 `inProgress`；权限握手按 FIFO 103 补录 |
| 102 | `BACK-M3-05A` Rev 1 | 规划对话 | 启动 S5 字幕验收权威契约、迁移与后端状态机 | `closed` | 状态与契约已写回 v4-247；唤醒已只发送后端固定对话；`read_thread` 确认消息送达、后端明确回执并进入 `inProgress`；权限握手按 FIFO 103 补录 |
| 103 | v4.4 权限链路同步 | 规划对话 | 向 UI、前端、后端固定对话同步工作区可写性前置门并收集明确回执 | `permission_blocked` | 三角色消息均送达并明确回执：后端根目录正确且 workspace-write，继续 S5；UI、前端根目录正确但实际为 read-only，均未修改业务文件。规划已登记阻塞，待目标环境恢复后重新握手，不要求用户传话 |

| ID | Rev | Owner | Current actor | Reviewer | Status | Goal | Inputs / Deliverables / Acceptance | Boundary / Next |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- |
| PLAN-M2-01 | 1 | 规划对话 | — | 用户 | `done` | 完成 M2 一次性技术选型与成本边界 | 输入：`PRODUCT.md`、M2 里程碑、两个 ADR；交付：已接受的 `ADR-0002`、`docs/costs/M2-cost-boundary.md`；验收：用户已确认 | 未授权购买、创建云资源或部署 |
| UI-M2-01 | 1 | UI 设计对话 | — | 用户 | `done` | 设计项目中心、上传任务、回收站的完整状态 | 输入：`DESIGN.md`、M2 里程碑、M2 契约；交付：仓库外交互预览、`docs/ui/M2-ui-acceptance.md`；验收：用户已确认 | 正式前端后续由开发按已确认设计实现 |
| DEV-M1-BASELINE | 1 | 开发对话 | — | 用户 | `done` | 建立可回退的 M1 Git 基线 | 交付：本地提交 `4c90ac5`、标签 `m1-baseline`；验收：用户确认保留 | 未创建远程或推送 |
| DEV-M2-01 | 5 | 开发对话 | — | 规划对话 | `done` | 完成 M2 第一个端到端切片并修正创建幂等边界 | 交付：技术栈、本地 PostgreSQL、项目创建/搜索/列表、`project_commands.request_name` 迁移、服务端 `409 IDEMPOTENCY_KEY_REUSED`、前端创建意图键复用及回归测试；规划独立复验：本轮 `pnpm check` 退出码 0，相关 2 个测试文件 8 项测试逐项通过 | 本切片已验收；后续由独立任务 `DEV-M2-02` 继续，不回开本任务 |
| PLAN-M2-02 | 7 | 规划对话 | — | 用户 | `done` | 与用户讨论并确认 M2 第二切片的业务输入、项目工作台对接和实施路径 | 已确认业务规则、术语前置门禁、版本与并行策略；用户最终选择方案 B“整剧素材配对确认纵切”；范围与验收见 M2 里程碑 | 规划已完成；只解锁 UI 交付，不自动解锁开发或后续切片 |
| UI-M2-02 | 4 | UI 设计对话 | — | 用户 | `done` | 设计整剧素材配对确认页及其完整状态 | 交付：仓库外交互预览、`docs/ui/M2-material-pairing-acceptance.md`；验收证据：8/8 状态、草稿动态回显、缺失/冲突/重复/类型/指纹门禁、空文件夹、确认失败恢复、204→72 侧栏、328px 窄屏无整页溢出、控制台 0 错误、独立复核 `ship`；用户反馈“看着还可以”并验收通过 | 正式前端未修改；交互输入转交 `DEV-M2-02`，不构成后续功能授权 |
| DEV-M2-02 | 10 | 开发对话 | — | 规划对话 | `done` | 实现整剧素材配对确认纵切并修正全部验收缺口 | 交付：共享契约、PostgreSQL 版本化清单、读取/幂等确认 API、浏览器元数据扫描、自动配对与人工调整、确认阻断、刷新恢复、留空回显、路径完整性、集数边界、确定性幂等摘要和权威契约；规划本轮独立复验：`pnpm check` 退出码 0，素材专项 2 个测试文件 14 项逐项通过，范围扫描与 `git diff --check` 通过 | 本任务已完成；未提交。下一切片不得自动开始，先由规划对话与用户讨论目标、范围和取舍；文件字节、AWS SDK/Storage fake、分片上传、术语提取、ASR/OCR、回收站、提交、推送和资源创建仍未授权 |
| PLAN-M2-03 | 1 | 规划对话 | — | 用户 | `done` | 与用户比较并确认 M2 第三切片实施路径 | 用户在“协议地基 / 协议与 UI 合并 / 直接 R2 实测”三条路径中明确选择方案 A；已把 Storage fake、分片协议、幂等、校验、过期与恢复的可观察验收写入 M2 里程碑 | 只解锁 `DEV-M2-03`；不解锁正式上传 UI、真实 R2、云资源、网络实测或后续切片 |
| DEV-M2-03 | 10 | 开发对话 | — | 规划对话 | `done` | 完成内存 Storage fake 与完整分片上传协议地基 | 交付：上传会话/分片/幂等/素材迁移、单一存储接口与内存 fake、创建/读取/授权/确认/完成/取消 API、集中配置、稳定错误及17项上传回归；规划独立验收：完整 `pnpm check` 6文件41项通过，上传专项17/17通过，匿名终验首次确认200、完成 `200/completed`、完成后原分片确认迟到重放 `200/completed`、素材数1 | 本切片已完成且未提交；不代表正式上传 UI、浏览器直传、R2、网络吞吐或部署已经实现。后继工作经 `PLAN-M2-04` 确认后拆为 `UI-M2-03`、`BACK-M2-04A`、`FRONT-M2-04B`，不得自动领取 |
| PLAN-LONG-01 | 1 | 规划对话 | — | 用户 | `done` | 校准前置审改与视频字幕验收的长期职责和交接边界 | 输入：两个本地应用及其交接规格；交付：`PRODUCT.md`、`DESIGN.md`、`docs/architecture.md`；验收：用户确认“局部直改/批量退回”和“验收仅保留轻量字幕编辑” | 不改变 M2 当前范围，不实现风险、验收或交付业务代码，不解锁 M2 后继开发 |
| PLAN-LONG-02 | 1 | 规划对话 | — | 用户 | `done` | 确认公司 SRT/ASR 双源采纳与台词格式规则 | 交付：每集基准切换、逐条唯一采纳稿、质量推荐边界、去标点和 18/28 字断句门禁；验收：用户确认采用推荐默认值 | 不修改本地应用，不改变 M2 范围，不解锁 M2 后继开发 |
| PLAN-LONG-03 | 2 | 规划对话 | — | 用户 | `done` | 确认批量基准、长期操作日志库与优化智能体边界 | 用户确认：人工操作长期保存为不可变结构化日志；优化智能体按管理员选定范围批量归纳本地规则、AI 筛选、提示词、热词/风险词和测试候选，经脱敏数据集、离线评测、人工批准和小流量后才能发布 | 普通员工不开放日志库；单条事件不触发升级，智能体不能直接改生产或读取隐藏思维；原始音视频默认不进入训练数据，真实微调需单独授权 |
| PLAN-M2-04 | 3 | 规划对话 | — | 用户 | `done` | 确认上传资产绑定、项目状态与四角色推进顺序 | 用户已确认：UI 与后端并行，二者通过后再由前端集成；同集两个视频角色可共享一次上传和一个已校验 Asset；状态含义与归约见 M2 契约 | 规划门禁已关闭；未授权真实 R2、云资源、提交、推送或部署 |
| UI-M2-03 | 16 | UI 设计对话 | — | 用户 | `done` | 重新设计只负责多素材并行上传的正式上传页，并完成紧凑表格视觉减法 | 用户反馈“目前没看出什么问题”并验收通过 Rev 15 合并方向：方向 1 的行动状态分组、完成项折叠和行内详情，方向 2 的“选择素材文件夹 / 选择多个文件”双入口、轻量素材/状态标签、普通筛选与选择后批量栏；单文件只显示“上传中”等文字状态，不显示逐文件百分比或进度条，整批顶部保留唯一总体进度；证据路径见 `docs/ui/M2-upload-queue-acceptance.md` | UI 设计交付完成且已被规划作为前端输入；`FRONT-M2-04B` Rev 6 已解锁。UI 对话不修改生产前端、后端、迁移或共享契约；生产实现完成后再由 UI 对话做真实页面视觉/交互验收 |
| BACK-M2-04A | 6 | 后端开发对话 | — | 规划对话 | `done` | 建立清单—上传—Asset 绑定、项目状态归约和浏览器可用的本地 fake 上传入口 | 交付：版本化素材角色—Asset 绑定及上传目标迁移、同集双视频角色一次上传/同一 Asset、最新清单身份复用、`blocked → verifying → uploading → ready → draft` 后端归约、项目/上传读取接口、非生产 fake HTTP PUT、共享代码契约和 5 项资产绑定回归；规划独立复验：完整 `pnpm check` 7 文件 46 项通过，资产/素材/上传专项 3 文件 31 项通过，代码与范围审查通过 | 本任务已完成且未提交；未修改正式前端/UI，未接 R2、回收站、ASR/OCR，未推送或部署。后端依赖已经被 `FRONT-M2-04B` Rev 6 消费，无需重复领取或返工 |
| FRONT-M2-04B | 20 | 前端开发对话 | — | UI 设计对话 | `done` | 完成正式多文件上传队列及真实页面验收 | Rev 8/13 冻结证据已覆盖共享 MP4 正常入口、3 绑定→2 物理文件、指纹错误恢复、完整上传后端 `ready`、整批 100%、完成项折叠、1440 页面和控制台 0 错误；Rev 18 终验覆盖 1024×768 侧栏 204/72 两态，根页面水平范围 0、980px 表格横滚仅在 `.tableWrap`；规划独立上传专项 7/7、前端构建 138 模块通过 | 本任务关闭且未提交；未接真实 R2、云资源、回收站、ASR/OCR、术语或后续工作台。任何后继开发必须经过新的用户规划门，不回开本任务 |
| PLAN-M2-05 | 2 | 规划对话 | — | 用户 | `done` | 选择 M2 下一切片顺序 | 用户已选择方案 A：先基于现有 Storage fake 实现本地项目回收站、48 小时恢复、到期清理与清理审计；真实 R2 和办公网络实测后置 | 该选择只确定顺序，不授权真实云资源、购买、部署、提交或推送；具体回收行为由 `PLAN-M2-06` 确认后再拆任务 |
| PLAN-M2-06 | 2 | 规划对话 | — | 用户 | `done` | 确认本地项目回收站的最终行为与任务拆分 | 用户确认先完成回收站；采用项目级 `active → recycled → purging → purged`、48 小时恢复、无立即永久删除、租约清理/审计/失败重试；回收立即终止未完成上传并清理未完成分片，恢复保留已完成 Asset、清单和项目资料，但未完成上传须重新选择文件并新建任务 | 已解锁 `UI-M2-04` 与 `BACK-M2-06` 并行；不实现 7 天交付素材回收、单文件删除、真实 R2、孤儿总核对、账号权限、提交、推送或部署 |
| UI-M2-04 | 5 | UI 设计对话 | — | 用户 | `done` | 完成本地项目回收站正式交互设计并通过用户验收 | 用户已确认整体方向；正式规则已写入 `DESIGN.md`，验收记录与五张截图覆盖项目中心二次确认、回收站正常/1024、恢复成功和清理失败；确认框明确终止未完成上传、48 小时保留已完成资料、到期清理不可恢复；1440/1024 根页面无横溢，控制台 0 错误/警告 | UI 输入已经满足；顶部“页面/场景”选择器只属于原型，不进入生产页面。`FRONT-M2-06` 仍须等待 `BACK-M2-06` 规划独立验收通过后才由规划解锁 |
| BACK-M2-06 | 7 | 后端开发对话 | — | 规划对话 | `done` | 完成本地项目回收、恢复、租约清理及正式回收站共享契约 | Rev 3 生命周期/Worker 基础与 Rev 6 三项定向修正均通过规划独立验收：回收首调/重放稳定数量、稳定 `recycledAt`、数据库分页前三类确定性排序及 CleanupJob 状态筛选；规划独立回收专项 7/7、完整 `pnpm check` 退出码 0，数据库已停止 | 后端切片关闭且未提交；未修改生产前端/DESIGN，未接真实 R2、孤儿总核对、单文件/交付回收、账号权限，未推送或部署；正式契约由 `FRONT-M2-06` 消费，不回开本任务 |
| FRONT-M2-06 | 22 | 前端开发对话 | — | UI 设计对话 | `done` | 完成项目中心回收动作、正式回收站和全部真实/等价动态验收 | UI 真实 409 在 500ms/1.2s 均聚焦取消且焦点位于 dialog 内；提交中锁定由 Rev 20 可控延迟 DOM 回归覆盖 pending 焦点、按钮禁用、Tab/Shift+Tab/Escape/遮罩不逃逸、单次请求、失败恢复和同幂等键重试。最终完整 `pnpm check` 退出码 0；本地 PostgreSQL 已停止 | 回收站纵向切片关闭且未提交/推送/部署；真实 R2、孤儿核对、容量演练、单文件/交付回收和账号权限仍不在本任务。后继工作进入 M3，不回开本任务 |
| PLAN-M3-01 | 3 | 规划对话 | — | 用户 | `done` | 确认 S1 术语纵切及 API 密钥控制边界 | 用户已确认 `docs/contracts/M3-terms-workflow.md`：正式八类、旧工作台高召回/证据/版本、现有五列模板、双控制台分离、后端 Worker 调用、预算/并发/脱敏和无账号入口保护 | 规划门关闭；只解锁同一 S1 的 UI 与后端并行，不授权真实 AI/ASR 密钥、付费、云资源、提交、推送或部署 |
| PLAN-PARITY-01 | 1 | 规划对话 | — | 用户 | `done` | 建立两个本地应用的功能等价迁移硬门禁 | `PRODUCT.md` 已明确最终成品覆盖两个本地应用基本全部生产能力；`docs/contracts/LOCAL_APP_PARITY.md` 已建立审改/术语与字幕验收两组能力域、云端归属和当前状态；`WORKFLOW.md` 已要求后续任务立项/关闭映射矩阵并写回证据 | 允许优化界面、步骤和云端实现，不允许静默删除；内部版暂不阻塞项继续保留为必做，最终矩阵存在“开发中/必做未开始”时不得宣称成品完成 |
| UI-M3-01 | 3 | UI 设计对话 | — | 用户 | `done` | 完成术语页、全量采用/导出与公司五字段模板管理设计 | 用户已确认 Rev 3 最终增量方向；规划核对无缓存证据通过：模板固定字段为 `type/name/aliases/gender/note`，局部失败同屏展示“未创建 V1、未生成 XLSX”、具体原因与唯一“重试”。最终路径与实测见 `docs/ui/M3-terms-acceptance.md` | UI 输入关闭，供 `FRONT-M3-01B` 实现；不扩展 ASR/OCR、播放器、密钥控制台或任务中心，正式页面完成后再由 UI 做真实页面终验 |
| BACK-M3-01A | 2 | 后端开发对话 | — | 规划对话 | `done` | 收口人工新增规范名的空白输入与唯一性错误语义 | 规划独立核对：全空白名称不写库、不推进草稿修订并稳定返回 `422`；跨类型同名稳定返回草稿级唯一性文案。术语专项 1 文件 8/8、后端生产构建和 `git diff --check` 均通过 | Rev 1/2 后端术语核心关闭，主库匿名数据残留 0，本地 PostgreSQL 已停止；新增模板不回开本任务，未运行完整 `pnpm check`，留给 S1 关闭门 |
| BACK-M3-01C | 2 | 后端开发对话 | — | 规划对话 | `done` | 收口五字段模板请求边界与唯一正式导出路径 | 规划独立核对并复跑：嵌套列对象拒绝 `formula/style/任意未声明配置`，旧无绑定 route/service/repository 路径已移除，默认五列与确定性下载只走显式导出绑定；术语专项 1 文件 8/8、共享契约构建、后端生产构建和 `git diff --check` 均通过 | Rev 1/2 模板与导出后端关闭，本地 PostgreSQL 已停止；未改迁移、数据表、术语状态机、项目生命周期、生产前端/DESIGN，完整 `pnpm check` 留 S1 关闭门，不回开本任务 |
| BACK-M3-01D | 1 | 后端开发对话 | — | 规划对话 | `done` | 补齐人工新增证据选择与历史导出刷新所需的权威只读契约 | 规划独立确认 Cue 查询的项目/活动草稿/来源隔离、搜索/集数/分页顺序和人工新增可用性；版本导出列表只读恢复全部原绑定，模板切换不改变历史下载。独立术语专项 1 文件 9/9、共享契约与后端生产构建、`git diff --check` 均通过 | 本任务关闭；本地 PostgreSQL 已停止，未新增迁移、未改前端/DESIGN/术语状态机，完整 `pnpm check` 留 S1 关闭门，不回开本任务 |
| BACK-M3-01E | 1 | 后端开发对话 | — | 规划对话 | `done` | 收口术语候选写入门禁和单一幂等发布事务 | 规划独立确认事务内项目 `active`、活动草稿、最新公司 SRT 摘要、运行提取门禁与候选合法转换；`POST /api/projects/:projectId/terms/releases` 原子创建或重放 `TermVersion + TemplateVersion + TermExport`，失败无半成品，旧确认 POST 无运行入口。独立专项 11/11、双构建、仓库与差异检查通过 | 未新增迁移，未改生产前端/DESIGN，未接真实 AI/ASR/OCR/云资源；S1 完整质量门已通过且 PostgreSQL 已停止。无调用者的 `ConfirmTermVersion*` 记为 P3，下次后端术语契约维护时删除，不回开本任务 |
| FRONT-M3-01B | 3 | 前端开发对话 | — | UI 设计对话 | `done` | 完成正式术语页并通过一次有界真实页面终验 | UI 正式 React 完整终验通过：1440/1024 两态、来源/筛选/选择、真实 Cue 与四态、模板真实冲突恢复、单一发布、不可变历史下载、焦点和控制台均有证据；三类提交中状态明确引用规划可控延迟 DOM 等价证据。P0/P1=0；S1 完整 `pnpm check` 退出码 0 | M3 S1 已关闭且 PostgreSQL 已停止；P2 遮罩关闭一致性、P3 历史标题措辞后置，不回开本任务。不含真实 AI/ASR/OCR、播放器或后续工作台 |
| PLAN-M3-02 | 1 | 规划对话 | — | 用户 | `done` | 与用户确认 S2 中文 ASR 批次的产品路径、供应商策略和成本/授权边界 | 用户已确认推荐方案；`docs/contracts/M3-asr-batch.md` 固化整剧/选中集/单集、术语版本+视频 Asset 双门禁、确定性 fake、批次/逐集状态、不可变结果、租约恢复、取消、失败子集重试、需对账、用量和服务器端密钥边界 | 规划门已关闭，只解锁 UI 与无付费后端 fake 并行；真实供应商选品、密钥、付费、服务器、云资源和部署继续需要用户另行授权 |
| PLAN-M3-02B | 1 | 规划对话 | — | 用户 | `done` | 确认 S2.1 热词可验证、多剧批量、公平并发和费用分层 | 用户确认推荐方案；`M3-asr-bulk-dispatch.md` 固化项目级批量选择、热词预览/发送回执、真实 A/B 准确率门、DispatchGroup、批次状态对齐、默认全局 4/每项目 1 公平调度，以及员工用量/管理员费用分层 | 只授权 fake/stub、契约、UI 和本地实现；不授权真实厂商、SDK、密钥、网络、付费、云资源或部署。按 Wave A/B 解锁，不把多剧选择塞入上传任务 |
| PLAN-M3-03 | 1 | 规划对话 | — | 用户 | `done` | 与用户细化 S3 前置审改最小闭环及本地双应用等价边界 | 用户确认推荐方案；`M3-pre-edit-workbench.md` 已固定公司稿优先底座、组合轴唯一所有权、整剧/选中集/单条文本基准、六类决定、不可变事件、格式门禁、逐集导航、直接 MP4 证据和待验收 SRT | 真实 API/OCR、完整风险词库、时间轴编辑、360p/1080p 转码、字幕验收、学习规则发布、云资源和部署继续后置；执行按 UI/后端并行、前端集成进行 |
| UI-M3-03 | 4 | UI 设计对话 | — | 用户 | `done` | 收口紧凑播放器按需放大、无文字双色关系分隔、本集全轴浏览、小型 AI 快速筛选进度和非阻断风险定位 | 规划独立审核 P0/P1=0，用户已确认 Rev 4；Rev 1–4 结构、状态、键盘、响应式和证据全部冻结 | UI 任务关闭，不再继续返工；不接真实 AI/API、费用、管理员配置或风险词库，不伪造生产筛选/风险事实，不增加独立风险模块，不编辑时间轴 |
| BACK-M3-03A | 3 | 后端开发对话 | — | 规划对话 | `done` | 阻断 limited 单集冒充完成 ASR 对照 | 规划独立确认 `completeEpisode` 在事务与 episode 行锁内权威拒绝 `status=limited` 或 `limited_reason IS NOT NULL`，稳定返回 `PRE_EDIT_COMPLETION_BLOCKED / run_asr`；mixed-ASR 回归证明 episode/session/command 全量零副作用，ready 单集完成与 release 正向路径保留。隔离空库 21 迁移、专项 7/7、后端构建通过 | 后端 S3 依赖关闭；Rev 2 冻结项不回开，不改 UI/前端/迁移/共享状态机，不接真实供应商/R2/转码/OCR。完整 `pnpm check` 留 S3 前端终验关闭门 |
| FRONT-M3-03B | 3 | 前端开发对话 | — | 规划对话 | `done` | 阻止后台媒体错误在活动全轴模态层仍打开时抢走焦点，并完成正式前置审改 React 收口 | `PreReviewPanels.tsx` 尊重活动 `aria-modal=true`；前端/规划专项 12/12，UI 两场景微复验 P0/P1=0，Rev 2 高保真与完整矩阵冻结通过；规划完整 `pnpm check` 通过 18 文件 157 项及全部检查/构建，前端构建 160 modules | S3 正式关闭；不回开已通过证据。S4、真实 R2/ASR/OCR、字幕验收、交付、账号、云资源、提交推送部署均须按独立任务继续 |
| PLAN-M3-04 | 1 | 规划对话 | — | 用户 | `done` | 与用户确认 S4 画面字 OCR 工作台、本地应用等价范围和后续主线顺序 | 用户确认推荐方案；`M3-screen-text-workflow.md` 已固定双门禁、三范围、供应商中立 Adapter、抽帧/去重、术语证据、逐集状态、候选/人工事件、空集/失败恢复、不可变版本和画面字 SRT；里程碑调整为 S4 画面字、S5 字幕验收、S6 单剧联调、S7 交付产品库 | 只授权规划、UI、零网络后端 fake 与后续正式前端；不授权真实厂商/SDK/网络/密钥/付费、服务器、管理员控制台、字幕验收、交付或部署 |
| UI-M3-04 | 3 | — | — | 规划对话 | `done` | 关闭来源失效态最后两个伪可执行旧草稿动作 | 规划微复验确认三项旧决定均不可见且 disabled，唯一可见 enabled 写动作是“从新来源新建批次”，控制台为空；Rev 1/2 完整设计证据冻结通过 | 本次用户授权的 UI 代理验收已关闭；未改生产前后端、迁移、contracts 或 DESIGN，等待后端通过后由规划形成 UI→前端包 |
| BACK-M3-04A | 2 | 后端开发对话 | — | 规划对话 | `done` | 集中关闭画面字后端五组数据与付费安全缺口 | 安全重试/取消未知、完整集与最新术语来源、真实截图对象归属/摘要读取、严格左右配对、忠实 Usage 聚合/拆分均已实现并补高价值回归 | 规划独立隔离库从零 22 迁移、5 文件 47/47、共享契约/后端构建全部通过，隔离库残留 0；完整 `pnpm check` 留 S4 关闭门 |
| BACK-M3-04C | 1 | 后端开发对话 | — | 规划对话 | `done` | 补正式画面字页面所需只读发现和排序契约 | 规划独立代码审查与精确隔离库从零 22 迁移通过；screen-text 12/12、共享契约/后端构建、仓库与差异检查全通过，隔离库残留 0 | 只读解阻关闭；无迁移，无生产前端/DESIGN，未改 BACK-M3-04A 写链、Worker、证据、播放与发布事务。完整 `pnpm check` 仍留 S4 关闭门 |
| BACK-M3-04D | 1 | 后端开发对话 | — | 规划对话 | `done` | 把未拆分左右父候选的合法决定前置到权威写状态机 | 规划代码审查确认门禁先于任何写入；独立隔离库从零 22 迁移、screen-text 13/13、正确后端生产构建、仓库与差异检查通过，隔离库残留 0 | 后端微切片关闭；未改迁移、共享契约、Worker/Adapter、证据/播放、发布事务、前端/DESIGN。完整 `pnpm check` 留 S4 关闭门，不回开本任务 |
| FRONT-M3-04B | 3 | 前端开发对话 | — | 规划对话 | `done` | 关闭左右父候选动作错配及来源/代表截图失效时的误写入口 | 规划代码审查与 screen-text 14/14、TypeScript、164 modules 构建通过；UI 两场景终验 P0/P1=0；最终完整 `pnpm check` 在隔离空库应用 22 个迁移并通过 20 文件 184/184、全部检查与构建 | S4 正式关闭；零网络 Adapter 与正式员工工作台功能成立。真实 OCR 供应商、网络、密钥、费用与生产存储继续单独授权，不回开本任务 |
| PLAN-SYSTEM-01 | 2 | 规划对话 | — | 用户 | `done` | 确认两站一后台及可持续迭代的统一系统控制台边界 | 用户确认员工工作台公网可达、系统控制台仅本人使用；`SYSTEM_CONTROL_CENTER.md` 固化独立访问、引擎/API、路由、服务器、预算、日志和密钥，并新增“策略与学习”：本地规则、AI 筛选、提示词、热词/风险词、长期日志库、优化智能体、评测发布和回滚 | 未创建 Cloudflare/服务器/域名或真实密钥；优化智能体不能直接发布，微调需数据/预算单独授权；当前不打断员工工作台主线 |
| UI-SYSTEM-01 | 1 | UI 设计对话 | — | 用户 | `blocked` | 设计独立系统控制台的应用外壳、总览与分区信息架构 | 输入为 `SYSTEM_CONTROL_CENTER.md`、现有设计系统和成熟 AI Gateway/服务器控制台参考；交付独立 `ControlShell`、总览、引擎/API、策略与学习、操作日志库、优化智能体、配置版本、服务器、预算、日志、安全和审计状态矩阵 | 等当前 `UI-M3-03` Rev 3 关闭并由用户确认优先级后再解锁；不得与当前 UI 同时写 `DESIGN.md`，不实现生产 React、真实密钥、微调、云资源或服务器写操作 |
| UI-M3-02 | 2 | UI 设计对话 | — | 规划对话 | `done` | 在已通过的单剧中文识别页补齐热词证据、员工用量简化和新批次状态 | Rev 1 布局及 12 张证据冻结；同项目热词侧栏、五态回执、准确率未验证、批次取消/需对账及员工处理用量均经规划审计，证据 13–16、1440/1024、焦点与控制台通过 | UI Wave A 关闭；正式前端省略原型的“员工页边界”内部说明卡，不显示管理员入口。未设计多项目 Dispatch、系统控制台、真实厂商或付费，不回开本任务 |
| BACK-M3-02A | 2 | 后端开发对话 | — | 规划对话 | `done` | 收口 S2 多厂商可替换适配边界与可运行 Worker 闭环 | 规划独立应用迁移、复跑 ASR 专项 7/7、共享契约与后端生产构建通过；员工不能选择厂商，Worker 按登记描述消费不可变 Asset 与实际热词，第二零网络 stub 走同一执行和读取链路 | 当前零网络模拟后端关闭；真实供应商接入前必须另行完成生产授权配置和适配器意外抛错兜底，不接真实 SDK/网络/回调/密钥/付费。完整 `pnpm check` 留 S2 关闭门 |
| BACK-M3-02C | 1 | 后端开发对话 | — | 规划对话 | `done` | 收口 Wave A 批次状态和热词可验证证据 | 共享/数据库/汇总统一状态、同项目权威热词预览、adapter 能力内截断、Attempt payload/五态回执和迁移前 fake 批次兼容均经规划独立复验；ASR 专项 9/9、共享契约/后端构建和仓库边界检查通过 | Wave A 后端关闭，完整 `pnpm check` 留 Wave A 集成门；未接真实供应商/SDK/网络/密钥/付费，未改前端/DESIGN，不回开本任务 |
| BACK-M3-02E | 1 | 后端开发对话 | — | 规划对话 | `done` | 补齐单剧 ASR 的批次热词证据、服务端全集查询与逐集准备投影 | 规划确认共享 TypeBox、Attempt 回执事实迁移、批次热词/准备只读 API 与服务端批次查询成立：历史批次按保存身份/能力重建纳入和省略证据并核对摘要；回执刷新恢复提交数/省略数/原因；编号搜索、行动优先/更新时间排序、状态筛选、分页及空页真实总数；一次返回 1–100 集可执行/可复用/阻断，历史结果核对为一次集合查询 | 规划隔离空库应用 18 个迁移，ASR 两文件 18/18、共享契约/后端构建、`check:repo`、`git diff --check` 通过，临时库已删除。完整 `pnpm check` 留切片关闭门；未接真实供应商/网络/密钥/付费，未改生产前端/DESIGN，不回开本任务 |
| FRONT-M3-02B | 4 | 前端开发对话 | — | UI 设计对话 | `done` | 修正并终验两个 ASR 只读查询恢复成功后的弹窗焦点闭环 | UI 定向真实复验通过：preparation/hotwords 的 503 错误均由唯一人工重读恢复；成功后各自既有关闭按钮获焦，dialog 包含 activeElement，Tab 仍在面板语境；P0/P1=0。规划完整 `pnpm check` 通过 15 文件 131 项及全部构建 | 单剧 ASR / Wave A 关闭；Rev 3 其余矩阵和既有接口冻结。真实供应商、密钥、付费、系统控制台、OCR 仍不在本任务范围 |
| UI-M3-02D | 2 | UI 设计对话 | — | 规划对话 | `done` | 收口 Wave B 派发事实一致性、付费提交锁定与取消确认 | 规划已核对 DESIGN、完整矩阵、原型脚本与证据 12–16：`DSP-0814-026` accepted 甲/丙/丁、92 集、88 新建/4 复用、46/92；创建/取消提交锁定与请求计数 1、失败/未知恢复、取消只影响丙、成员集合变化清选和纯排序/翻页保留 18 部均成立，P0/P1=0 | 本 UI 任务关闭，既有布局、视觉、1440/1024 和交互证据冻结；未改生产前端/后端/迁移/共享契约。`FRONT-M3-02D` 仍等待后端 Rev 3 规划关闭和 `FRONT-M3-02B` 共享组件稳定，不由 UI 单独解锁 |
| BACK-M3-02D | 3 | 后端开发对话 | — | 规划对话 | `done` | 修正 accepted 汇总边界、资格查询放大与空页总数 | 规划在精确隔离空库应用 17 个迁移并复跑 ASR 两文件 16/16、后端构建、仓库和差异检查通过；确认 `totalEpisodes/newJobs/reusableResults` 只汇总 accepted，blocked 只保留 selected/blocked，1–100 集复用核对为单次集合查询，两类空页仍返回筛选后真实 total | 本任务关闭，Rev 1–2 已通过的状态分层、取消、调度和迁移继续冻结。默认库未被规划清理，隔离临时库已删除；完整 `pnpm check` 留 S2.1 关闭门，不回开本任务 |
| BACK-M3-02F | 1 | 后端开发对话 | — | 规划对话 | `done` | 补齐 Dispatch 创建未知结果的已知 ID 恢复与持久请求标识 | 规划确认创建 body、显式 ID、首次 `requestId`、历史回填、同键/同 ID 冲突、无副作用 404 和不泄露幂等键均成立；独立隔离空库 19 个迁移、ASR 两文件 20/20、共享契约/后端构建、仓库与差异检查通过 | 本后端任务关闭，默认 PostgreSQL 保持运行；完整 `pnpm check` 留 Wave B 前端终验关闭门。不得回开真实供应商、网络、密钥、付费或其他冻结模块 |
| FRONT-M3-02D | 4 | 前端开发对话 | — | UI 设计对话 | `done` | 完成并终验 Wave B 正式 React 多剧派发与员工任务页 | UI 正式终验通过：23 部项目覆盖查询/选择/20 部竞态与 `3 accepted / 2 blocked`；22 条 Dispatch 覆盖三页分页、双状态、恢复、取消、未知创建同一 ID/POST=1、详情 pending 键盘闭环、1440/1024 与控制台 0/0，P0/P1/P2/P3=0。规划最终隔离库完整 `pnpm check` 通过 16 文件 138 项、19 迁移和全部构建 | S2.1 多剧 ASR / Wave B 正式关闭；隔离库已删除且共享 PostgreSQL 保持运行。真实供应商/网络/密钥/付费/系统控制台/OCR 仍未授权，不回开本任务 |

| PLAN-M3-05 | 1 | 规划对话 | — | 用户 | `done` | 冻结 S5 字幕验收工作台、本地应用等价范围和分阶段实现边界 | 用户已明确启动下一功能并恢复自动授权/自动接力；`M3-subtitle-acceptance-workbench.md` 固定上游不可变版本、多轨时间轴、视频版本、编辑/撤销、质量检查、逐集/整剧验收、局部返工和不可变验收 Release | 只授权本地规划、UI、后端和后续前端；不授权真实厂商、付费、服务器、部署、推送或破坏性操作 |
| UI-M3-05 | 1 | UI 设计对话 | 规划对话 | 规划对话 | `blocked` | 设计正式字幕验收工作台并建立完整状态/交互验收矩阵 | 业务输入与范围保持有效；FIFO 103 权限握手确认该固定对话根目录正确但当前为 read-only，无法写 DESIGN/验收/原型状态 | `permission_blocked` 不计业务 Rev；UI 不写业务文件，待 workspace-write 恢复后由规划重新握手并自动续接，不要求用户传话 |
| BACK-M3-05A | 1 | 后端开发对话 | 后端开发对话 | 规划对话 | `in_progress` | 实现字幕验收权威共享契约、迁移、编辑/检查/返工和不可变 Release | PostgreSQL 唯一权威；固定 S3/S4/素材/视频/术语来源，覆盖逐集 Cue 工作副本、事件、幂等写、撤销恢复、硬检查、一键通过资格、局部返工和来源失效 | 不改生产前端/DESIGN，不做真实转码/云资源/风险模型；完整 `pnpm check` 留 S5 关闭门 |
| FRONT-M3-05B | 1 | 前端开发对话 | 规划对话 | UI 设计对话 | `blocked` | 按冻结 UI 和共享契约实现正式 React 字幕验收工作台 | 继续等待 UI/后端双依赖；FIFO 103 同时确认该固定对话根目录正确但当前为 read-only，未来解锁前必须重新完成 workspace-write 权限握手 | 依赖阻塞与 `permission_blocked` 均不计业务 Rev；不得提前编码、触发 auto_review 或要求用户传话 |

每个对话只处理 `Current actor` 指向自己的任务。`ready` 用于实现，`review` 对指定 Reviewer 同样是可执行状态。详细规则见 `docs/WORKFLOW.md`。

## 权威文档读取顺序

1. `docs/WORKFLOW.md`：四角色职责、目录所有权、任务状态、依赖和接力规则。
2. `PRODUCT.md`：用户、工作量、MVP、非目标和成功标准。
3. `docs/contracts/LOCAL_APP_PARITY.md`：两个本地应用的功能等价范围、当前覆盖和最终关闭门。
4. `docs/milestones/M2-upload-lifecycle.md`：当前里程碑范围、流程和验收。
5. `docs/contracts/M2-upload-lifecycle.md`：状态、数据所有权、API 和恢复边界。
6. `docs/contracts/MODULE_RESPONSIBILITY_MATRIX.md`：每个环节的模块归属、角色权限、目录、非目标、依赖和验收。
7. `DESIGN.md`：UI 信息架构、视觉变量、公共组件和页面状态。
8. `docs/architecture.md`：长期模块边界和数据所有权。
9. 本文件和 `docs/logs/DEVELOPMENT_LOG.md`：最新进展与交接证据。

若对话记忆与这些文件冲突，以用户最新明确要求为最高优先级；否则先更新权威文档，再修改实现。

## 技术门禁状态

- [x] 确定前端框架与路由、数据请求和测试方式，见 `ADR-0002`。
- [x] 确定后端框架、PostgreSQL 驱动与迁移工具，见 `ADR-0002`。
- [x] 选择 R2 Standard、短时分片授权和未完成分片生命周期清理；公司试用前仍需网络实测。
- [x] 确定内存 Storage fake、可选 R2 集成测试以及开发、测试、生产环境配置边界。
- [x] `ADR-0002` 已更新为单一技术路径，没有并行实现多个供应商。
- [x] 开发对话曾将通用“继续”误判为提交授权并建立本地基线；用户随后明确确认保留提交 `4c90ac5` 和标签 `m1-baseline`；未创建远程。
- [ ] 若启用远程仓库，调整 `tools/verify-repository.mjs` 中“禁止任何远程”的里程碑 1 临时规则。

门禁已经满足本地开发所需条件；真实 R2、托管数据库和部署仍需用户另行授权并完成公司网络实测。

## 最近真实验证

2026-08-13 前端对 `FRONT-M2-04B` Rev 7 完成实现、自测并转交 UI 真实页面验收：

- 正式 `/uploads` React 页面已经接入项目、最新素材清单、上传会话和本地 fake PUT 契约；同一路径/指纹的 ASR 与画面字视频合并成唯一物理文件行和唯一会话，批次只在前端按后端事实聚合。
- 页面提供“选择多个文件 / 选择素材文件夹”双入口、素材/状态/集数筛选、五列排序、完成项折叠、行内技术详情、选择后批量暂停/继续/取消、错误原行恢复和错误文件重选；单文件只显示文字状态，顶部只有一个整批总体进度。
- 上传引擎按服务端分片大小计算，单文件并发 3、浏览器总并发 12；大文件 SHA-256 使用 4 MiB 分块且主动让出主线程；断网恢复后自动继续缺失分片，直传授权过期只自动续签一次，创建/确认/完成/取消命令均保持稳定幂等意图。
- 最终完整 `pnpm check` 退出码 0：仓库边界、lint、类型检查、本地 PostgreSQL 迁移、8 个测试文件 53 项测试及前后端构建全部通过；上传队列专项 1 个文件 7 项逐项通过，包含共享物理文件、真实请求顺序、错误重选和授权过期续签。
- 真实浏览器在 1440×900 下使用匿名 2 B SRT 与 8 B 共享 MP4 完成“多文件选择 → 两个独立会话 → 授权/PUT/确认/完成 → 后端项目 ready”链路；页面显示整批 100%、2 个物理文件、共享 MP4 单行、完成筛选、批量栏和 204→72 侧栏收起，无整页横向溢出，浏览器控制台错误为 0。
- `impeccable` 静态设计反模式检测返回空结果，`git diff --check` 无输出；匿名验收项目按精确 UUID 核对为零残留，临时 2 个夹具已删除，3000、3001、55432 服务端口已释放。
- 本轮只修改 `frontend/src/`、`tests/frontend/` 及任务必需的共享同步状态/日志；未修改后端、迁移、共享契约、产品或设计规划，未提交、推送、部署、接真实 R2 或创建云资源。

以上证据满足前端开发自测门槛，当前只进入 UI 设计对话的真实页面视觉/交互验收，不构成 UI 或规划最终验收已通过。

2026-08-13 规划对 `DEV-M2-03` Rev 9 最终独立复验通过：

- 按统一命令重新运行完整 `pnpm check`，退出码0；仓库边界、lint/typecheck、本地 PostgreSQL迁移、6个测试文件41项测试和前后端构建通过。
- 上传专项17项逐项通过，包括完成后的原分片确认迟到重放回归，以及此前已通过的对象合并后落账恢复、迟到确认终态保护、完成/取消竞态与项目回收门禁。
- 独立匿名8字节终验真实经过项目创建、两分片授权/确认、完成和迟到重放：首次确认200，完成 `200/completed`，原键原请求迟到重放 `200/completed`，返回同一最终素材，数据库素材计数为1。
- 独立探测项目按精确 UUID 清理；源码范围扫描未发现 AWS SDK、R2客户端、浏览器文件读取或下一阶段实现；`git diff --check` 无输出。
- 首次直接运行专项时本地 PostgreSQL已停止，17项在连接阶段统一报 `ECONNREFUSED`；按项目统一命令准备数据库后，专项17/17和完整41/41均真实通过，该环境前置失败不属于代码失败。

以上证据满足本切片全部验收。该完成结论只覆盖本地 Storage fake 与分片协议正确性，不证明真实大文件速度、5–6批网络并发或R2适配能力。

2026-08-13 开发对 `DEV-M2-03` Rev 8 完成定向修正并转交评审：

- 路由先读取既有确认命令，仓储锁内也在当前项目/会话状态门禁前识别命令，避免已成功确认因后来完成、过期或回收而被拒绝；全新请求的既有门禁未改变。
- 新增回归稳定复现并通过“分片 1 确认成功、分片 2 确认、会话完成、原键原请求重放分片 1”，最终返回 `200 / completed` 与唯一素材。
- 上传专项 1 个测试文件 17 项全部通过；完整 `pnpm check` 退出码 0，仓库边界、lint/typecheck、本地 PostgreSQL 18.4 迁移、6 个测试文件 41 项测试和前后端构建通过。
- `git diff --check` 无输出；本地 PostgreSQL 已停止。未提交、未添加远程、未推送、未部署或创建云资源。

该结果只表明定向开发修正达到自测门槛，仍需规划对话独立复验后才能标记 `done`。

2026-08-13 规划对 `DEV-M2-03` Rev 6 第二轮独立复验并定向退回：

- 重新运行完整 `pnpm check`，退出码 0；仓库边界、lint/typecheck、本地 PostgreSQL 迁移、6 个测试文件40项测试和前后端构建通过。
- 使用临时规划复验文件运行5项匿名4–8字节探测：对象已合并后的落账中断恢复、迟到确认不复活取消终态、项目回收门禁、完成/取消竞态4项通过；分片确认延迟幂等重放1项失败。
- 失败路径可稳定复现：分片1以某幂等键确认成功，分片2确认并使会话完成后，再以原键原请求重放分片1确认，实际返回 `409 UPLOAD_STATE_INVALID`，而已确认契约要求同键同请求稳定成功重放。
- 根因位于门禁顺序：确认路由和仓储都先检查当前项目/过期/会话状态，再读取已持久化的 `confirm_part` 幂等命令；因此合法迟到重试在终态被提前拦截。修正须只让已存在命令的同键重放先行，全新请求仍执行全部现有门禁。
- 临时复验文件已删除；所有匿名项目均按精确 UUID 清理，名称残留计数为0；`git diff --check` 无输出。未使用真实资料、外部网络或云资源。

该结果证明上一轮四类严重问题已经修复，当前只剩一个局部幂等顺序问题；不需要重做状态机其他部分，也不解锁后续切片。

2026-08-13 开发对 `DEV-M2-03` Rev 5 完成返工并转交评审：

- 完成命令在外部存储调用前持久化命令占位；Storage fake 注入“对象已合并但结果未知”后，首次完成返回可重试 `503`，同一完成请求可核对现有对象并恢复为唯一 `completed` 素材，资产计数为 1。
- 分片确认在数据库锁内重读项目与会话状态；自动化暂停点证明已通过存储核对的迟到确认在取消落账后返回 `409 UPLOAD_STATE_INVALID`，最终仍为 `aborted` 且没有确认分片。
- 同一确认幂等键同请求重放保持版本不变，同键用于另一分片返回 `409 IDEMPOTENCY_KEY_REUSED`；可续期短时授权不再强制无语义幂等头。
- 完成与取消竞态测试证明完成先取得锁后，取消返回 409，最终唯一状态为 `completed`；取消在锁内先写终态，存储清理可重复。
- 项目改为 `recycled` 后，授权、确认和完成均返回 `409 PROJECT_NOT_ACTIVE`，没有创建对象或素材；取消仍返回 `200 / aborted`。
- 上传专项 1 个测试文件 16 项测试通过；完整 `pnpm check` 退出码 0，仓库边界、lint/typecheck、本地 PostgreSQL 18.4 迁移、6 个测试文件 40 项测试和前后端构建通过。
- `git diff --check` 无输出；源码范围扫描未发现 AWS SDK、R2 适配或新增外部网络/识别实现。只使用匿名 4–8 字节数据，本地 PostgreSQL 已停止；未创建云资源、提交、远程、推送或部署。

该结果只表明开发返工已达到自测门槛，仍需规划对话独立复验后才能标记 `done`。

2026-08-12 规划对 `DEV-M2-03` Rev 3 独立复验并退回：

- 重新运行完整 `pnpm check`，退出码 0；仓库边界、类型与规范、本地 PostgreSQL 迁移、6 个测试文件 35 项测试及前后端构建通过。
- 匿名小字节故障注入证明完成状态不具备未知结果恢复：Storage fake 已合并对象后在数据库最终落账前模拟中断，首次返回 `500 INTERNAL_ERROR`；同一完成请求重试返回 `409 UPLOAD_VERSION_CONFLICT`，会话永久保持 `completing` 且 `asset=null`。
- 匿名并发探测证明终态可被迟到请求复活：取消先返回 `200 / aborted`，此前已通过存储检查但稍后落库的分片确认仍返回 `200 / uploading`，最终 PostgreSQL 状态为 `uploading`、版本 3。
- 同一 `Idempotency-Key` 分别确认两个不同分片时两次都返回 200 并保存两个分片，说明确认接口虽强制要求幂等头，但没有实际执行同键异请求冲突保护。
- 项目精确改为 `recycled` 后，既有上传会话仍能取得新分片授权并返回 200；与项目非活动后禁用业务处理和本切片验收边界不一致。
- 四次探测只创建匿名小字节和唯一名称项目，结束时均按精确 UUID 清理；残留名称计数为 0。未使用真实资料或外部网络，未创建云资源。
- `git diff --check` 无输出；源码范围扫描未发现 AWS SDK、R2、浏览器文件读取或 ASR/OCR/术语实现。基础范围控制通过，但上述四类高价值恢复/并发边界未达到验收标准。

该结论只退回同一状态机根因，不要求推倒重写首轮迁移、Storage fake 或常规协议；也不解锁后续 UI 与云资源。

2026-08-12 开发对 `DEV-M2-03` Rev 2 完成实现与验证：

- 仓库边界验证通过。
- TypeScript 类型检查与代码规范检查通过。
- 本地 PostgreSQL 18.4 启动、数据库建立和迁移通过。
- 新迁移建立 `assets`、`upload_sessions`、`upload_parts` 和 `upload_commands`，上传会话、确认分片、幂等命令和最终素材绑定均由 PostgreSQL 持有。
- 单一 `UploadStorage` 接口隔离存储语义；内存 fake 只在本地开发与匿名自动化测试中保存小型合成字节，生产环境未提供真实适配器时明确拒绝启动。
- 创建会话绑定项目、服务端随机对象键、SRT/MP4 元数据、指纹、SHA-256、集中分片大小和过期时间；分片大小、单文件并行 3、浏览器并行 12、会话/授权时限和文件上限均集中配置。
- 六个协议 API 已实现：创建会话、读取状态、签发缺失分片授权、确认分片、幂等完成并校验对象、幂等取消。
- 上传专项 1 个测试文件、11 项测试全部通过：创建幂等与同键冲突、类型/大小限制、缺失分片清单、只补缺失、重复确认/完成/取消、指纹不符、授权与会话过期、临时故障恢复、对象不存在、大小不符和校验失败。
- 最终 `pnpm check` 退出码 0：仓库边界、TypeScript lint/typecheck、本地 PostgreSQL 18.4 迁移、6 个测试文件 35 项测试和前后端生产构建全部通过。
- `git diff --check` 通过；源码范围检查未发现 AWS SDK、R2、外部网络请求、浏览器文件读取、回收站、ASR/OCR 或术语实现。
- 本轮没有 UI 变更，没有真实文件直传或容量/网络实测；3000、3001、55432 端口均已释放。
- 共享契约、Fastify 后端和 React/Vite 前端构建通过。
- 后端新增回归逐项证明绝对路径、`..` 越界、非当前根目录和路径末段/文件名不一致均返回 `400 MATERIAL_MANIFEST_INVALID` 且不写入清单；同键语义等价但属性顺序不同的请求稳定重放首次结果。
- 前端回归证明刷新后的已确认详情固定显示同集三角色，缺少画面字绑定时显示“明确留空”；同名候选选项同时包含相对路径与大小，待分配文件显示路径、大小和问题原因，人工集数 1.5 与 101 均不能分配。
- 真实浏览器使用 4 个匿名合成文件验证同名 SRT 候选按完整相对路径区分、大小可见、1.5 集显示明确错误且分配禁用；选定候选后确认 v1，刷新仍按三角色回显画面字“明确留空”。
- 1440×900 电脑屏幕实测页面宽度与视口一致、可见一级标题为 1、留空回显存在；最终截图复核未发现视觉层级或溢出回归，浏览器控制台错误与警告为 0。
- `impeccable` 机械检测返回空结果；本轮仅精修既有 Operate 工作台信息完整性，没有改变视觉方向或窄屏支持范围。
- 浏览器匿名项目、临时夹具与本轮本地服务均已清理；3000、3001、55432 端口已释放。
- 规划本轮重新运行完整 `pnpm check`，退出码 0；仓库边界、类型与规范、本地 PostgreSQL 迁移、5 个测试文件 24 项测试和前后端构建通过。
- 规划另行运行素材专项测试，2 个测试文件、14 项测试逐项通过；非法路径测试同时断言未写入清单，语义等价幂等重放返回首次清单。
- 规划源码范围扫描未发现 AWS SDK、对象存储、文件内容读取、ASR/OCR 作业或回收 Worker 实现；唯一 `readFile` 命中是既有仓库测试读取 `package.json`。`git diff --check` 通过。

该结果证明内存 Storage fake 与完整分片协议地基可进入规划评审；不代表正式上传 UI、真实浏览器直传、R2、容量/网络吞吐、回收、识别或真实并发批次已经实现。

## 下一步

1. M2 项目中心、上传任务与项目回收站已关闭，不再重复返工。
2. M3 S1 术语确认与模板化 XLSX 已关闭；真实 AI 术语提取 API 后置。
3. M3 S2/S2.1 单剧与多剧 ASR fake、热词证据、公平派发和员工任务页已关闭；真实供应商仍需单独授权和小样本验收。
4. M3 S3 前置审改已关闭：后端、UI 和正式 React 均通过，最终完整 `pnpm check` 为 18 文件 157 项及全部构建。
5. M3 S4 画面字 OCR 已关闭。S5 字幕验收已启动：UI 与后端并行，前端等待双依赖；之后为 S6 单剧联调和 S7 交付产品库。真实 OCR/ASR、R2、托管数据库、服务器、域名、远程仓库、提交、推送或部署仍需另行授权。

## 已知限制

- 当前已实现项目中心、整剧素材配对、上传任务、项目回收站、术语确认与导出、单剧/多剧 ASR fake、员工中文识别任务页、正式前置审改工作台和零网络画面字 OCR 工作台；S3/S4 均已通过 UI 终验与完整质量门。真实 OCR 供应商与生产对象存储尚未接入；字幕验收和交付产品库尚未实现。
- 浏览器只在用户选择后读取本地文件字节用于分块摘要与上传，不把文件字节写入前端持久化；刷新或换设备后需重选同一指纹文件，再按服务端缺失分片续传。
- 正式 UI 支持范围只覆盖电脑屏幕，窄屏与移动端没有兼容承诺。
- 当前仍使用开发测试用 Storage/ASR fake；没有生产对象存储、真实 ASR/OCR 供应商、账号、部署或生产安全入口。fake 已验证状态与交互，不代表真实识别准确率、费用或公网容量。
- 后端“清单版本—集数—素材角色—Asset”仍是权威关联；前端已消费该契约，但多文件上传批次仍只是只读投影，不是新的后端业务状态。
- 本地 PostgreSQL Windows 二进制和数据目录位于纯 ASCII 临时路径，由项目脚本按固定版本管理；未创建托管数据库或其他云资源。
- 当前 `check:repo` 会拒绝任何 Git 远程；这是里程碑 1 的临时保护，不是长期策略。

## 基础设施故障记录

- 本轮复核确认：此前 `503` 来自公司网关 `https://apitokenzz.xyz/v1` 的 `responses` 路由，错误明确指出 `gpt-5.6-sol` 无可用上游（request id `req_7f92cd1d092ba0d4ef2e1ac0`），不是项目 API、数据库或业务代码错误；当前 Codex 配置主模型为 `gpt-5.6-sol`，但自动审查可能单独选择 Luna。该类故障登记为 `provider_blocked`，普通仓库编辑因此登记 `approval_route_blocked`；同一请求不超过一次受控重试，须修复网关模型映射或关闭普通编辑的自动审查路由后再恢复接力。
- 另有 `CreateProcessAsUserW failed: 5`，确认是 Windows 执行器启动异常，登记为 `executor_blocked`，与网关 503 和仓库权限分开处理；不要修改业务代码或重复堆派发。
- 早先自动审查失败的具体上游提示为 `gpt-5.6-sol` 暂无可用上游；这解释了为什么主会话选定 `gpt-5.6-sol` 仍会在自动审查阶段失败，二者是两条模型选择路径。
- 同一故障链历史记录还出现过 `gpt-5.6-sol` 无可用上游，说明公司网关的模型可用性与 Codex 自动审查选模并不一致；两者均按 `provider_blocked` 处理。
- 重启后的新鲜检查：默认 `exec_command` 仍指向不存在的 `C:\\Users\\ComradeGu\\AppData\\Local\\Programs\\PowerShell\\7\\pwsh.exe`，因此继续报 `CreateProcessAsUserW failed: 5`；改用 PATH 中实际存在的 Codex runtime PowerShell 后，Node `24.19.0`、pnpm `11.21.0`、Git 读取和项目仓库检查均正常。完整 `pnpm check` 的仓库验证、lint、TypeScript 均通过，测试阶段在 `db:setup` 启动 PostgreSQL 时因固定日志文件 `C:\\tmp\\qimao-terms-cloud-postgres-18.4\\postgres.log` 返回 `Permission denied` 而停止；这登记为 `local_runtime_blocked`，不是业务测试失败。
