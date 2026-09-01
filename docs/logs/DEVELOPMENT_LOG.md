# 开发日志（实时短页）

> 当前仅保留治理恢复后的活跃事实。此前完整历史已原样归档至
> `docs/logs/archive/DEVELOPMENT_LOG-through-v4.898-2026-08-21.md`。
> 归档 SHA-256：`27FF3AEA6DF51AA6F1994468EF9F43F1598EE34FC8994E7E4949D59715681257`。
> 历史归档只读，不再作为任务派发、权限或当前运行态的依据。
> 2026-08-22 至 2026-08-28 的聚合记录已原样归档至 docs/logs/archive/DEVELOPMENT_LOG-2026-08-22-through-2026-08-28.md。

## 2026-09-01｜权威状态与协作规则收口

- 完整保留 `CURRENT v4-1761` 到状态归档后，将 CURRENT 收成仅含当前目标、唯一阻塞/下一 Owner、生产基线、当前发布入口、最多五条验收证据和六角色状态的短页；新增 ACTIVE_RELEASE 与部署 INDEX，只链接现有 declaration、SHA256SUMS、归档和 RESULT，不复制哈希或改动历史部署文件。README 已同步真实生产阶段、员工/管理员双前端、六角色与实际本地入口；AGENTS/WORKFLOW 删除重复状态机和强制状态词，改为一次切片授权、风险相称验证、外部 unknown 对账、物理任务按里程碑换代及单次结构化终态。业务代码、服务器、数据库、Secret、Provider、构建与发布动作均为0，1753冻结候选身份保持不变。

## 2026-09-01｜持续调度机制修复与 OCR 管理页镜像验收

- FRONT 1732 回合运行约13分钟后空完成，但 `enginesPage.tsx` 与 `system-control-plane.test.tsx` 在同一时段形成了与任务卡一致的 OCR 抽帧参数实现。规划未重派，而是按文件事实镜像审核：专项43/43、管理员站typecheck和production build均通过，确认默认/上下限/不可变新版本与并发单一来源。根因不再归咎于领域Owner：普通规划turn结束后不会被子任务完成自动唤醒，旧流程把状态文件和任务消息误当调度器。当前已建立产品active `/goal`；协议改为goal内持续等待/审核/派发，定时外部观察才使用heartbeat。
- 1734 发布前发现fixed v2.1无法表达“backend+管理员站切换、员工站保持指针”；外部副作用0。平台拒绝以内容相同的新员工目录替代原指针后，SERVER只在本地新增严格`employeeStatic:preserve`：v1/旧v2默认replace不变，preserve归档禁止`static/`，员工stage/next/link与rollback均保持原目标。validator 36 cases、runner 19 cases、Bash/Node语法、真实symlink fixture和规划独立复核通过；新fixed尚未安装。
- 1736 已把上述fixed与OCR运行参数候选收成唯一六文件发布集合：archive仅含backend+管理员静态，员工静态成员0，6037000由单一migration gate约束；规划独立核对bytes/SHA、声明、validator与helper。runner的plain Git-Bash复核曾因Windows符号链接语义产生假失败，按冻结时同一`MSYS=winsymlinks:sys`重跑19 cases通过，并明确目标Debian仍须在任何切换前执行原生自测。服务器连接、上传、安装、迁移、重启、数据库与Provider动作均为0。
- 1737 经动作任务内一次确认后发布通过：六项一次SCP、fixed唯一swap、fixed entry唯一调用、6037000 gated migration与backend一次restart完成；员工指针和ASR/OpenVINO PID不变，screen保持inactive，HTTP/403/JSON、迁移after gate和零残留均通过，真实OCR/Provider/COS为0。管理员真实页面随后读到OpenVINO v1和新字段边界，已把未激活候选`1200ms/480帧`填写到“新增版本”表单；最终创建写入按浏览器动作时确认规则暂停，尚未提交、未切路由、未建OCR任务。
- 用户确认后，生产管理员页只提交一次并创建OpenVINO v2；页面回读`1200ms/480帧`、新摘要和旧v1。1739使用`BEGIN READ ONLY`独立确认v2精确runtime_config/digest、v1 immutable trigger与active route仍锁v1，且v2创建后batch/attempt均为0；OCR管理员安全可调参数产品门关闭。随后启动管理员首页去专业化切片：真实页面暴露的主要问题是45个待审核被显示为运行、历史预算阻断/过期租约把整体标为失败，以及资源池、配置版本等技术词压过当前下一步。
- 管理员首页状态源与四问投影候选完成：24小时历史失败继续作为处理统计保留，但不再决定当前健康状态；45个`review_pending`不再记作运行，历史`localPolicyBlocked`和已终结租约不再产生当前异常，真实当前失败/过期执行租约/待对账仍维持失败或降级。首页只展示后端权威状态、解释、唯一下一步、24h处理量和最多3条当前原因，技术详情留在既有导航。BACK/FRONT均出现空终态但有精确文件动作，规划没有重派，而是镜像审核并新运行后端7/7、前端12/12、两端typecheck、前端production build和Impeccable detector（0项），均通过；进入定向联合验收。
- TEST 1743 及其最小通道探针均空终态且无文件/工具事实，按硬规则记为`invalid-empty-handoff`，不伪装为active或passed。规划直接使用已冻结口径联合新运行后端与前端2文件19/19并通过，target diff-check通过；因此只替代无效交接，不重做业务实现，候选进入固定发布入口。
- SERVER 1744 冻结唯一管理员摘要发布三件套，本地测试/typecheck/build、portable闭包、validator36、runner19与archive门均通过；远端只读脚本因依赖`systemctl --value`输出顺序产生假失败后按硬停止返回，生产写0。规划核对三项bytes/SHA并签发只消费原冻结物的1745动作；平台仍要求在SERVER任务直接确认，已导航用户一次，未代转批准、未重复上传。
- 用户在SERVER动作任务直接确认后，1745一次上传并调用既有fixed一次发布成功：backend+管理员站切换，员工指针与ASR/OpenVINO/screen状态保持，backend只重启一次，数据库/route/budget/engine/Provider/COS/真实任务写0、残留0。内置浏览器真实首页复核显示唯一当前状态与动作、24h `1项目/51集·运行0·等待3`、最多3条当前原因，技术资源池/版本/requestId不再占据首屏；页面failed来自当前OCR失败/待对账事实，说明新摘要没有掩盖真实问题。本轮OCR v2创建和管理员首页真实化两个产品门关闭。
- 后续按已确认顺序转入画面字员工工作台候选审改重构：不重做OCR调参、管理员摘要、控制面或状态机，也不启动真实OCR；先由UI/BACK并行收敛已有四态候选、revision/决定事件、截图/时间轴证据、保留/忽略（明确不纳入且可恢复）与发布门禁的差量，再交FRONT实现三栏与证据预览。
- UI 1747 形成员工画面字审改最小冻结；BACK 1747 复用既有四态/事件，仅增加未拆分左右父候选的服务端决定门，非法保留/编辑422且零副作用，避免审改完成后才在发布门失败。规划镜像新运行screen-text 28/28、backend typecheck和diff-check均通过；无迁移、公共合同、控制面或真实OCR动作，转FRONT实现选择/证据联动与高频交互。
- FRONT 1748 已按冻结完成员工候选审改差量，目标文件与行为测试可见，但固定任务通道持续active且没有可见回传，按`observer_degraded`由规划镜像接管而非重派实现。新运行ScreenTextWorkspace 15/15、frontend typecheck、production build、target diff-check通过，Impeccable detector为0；候选进入TEST独立验收，仍不切OCR路由、不启动Worker或真实OCR任务。
- TEST 1749 再次空completed且无消息/工具/文件事实，按硬规则记为`invalid-empty-handoff`与`orchestration_gap`，不把空结束当passed。规划同口径联合新运行screen-text后端+前端2文件44/44并通过，target diff-check通过；结合前序同文件状态的两端typecheck、frontend production build与界面扫描，候选发布门关闭并转SERVER只做本地冻结。
- SERVER 1750 在本地冻结前发现fixed v2.1只能保留员工站、不能保留管理员站，按首因停止；declaration/archive/SHA未生成，服务器及数据库写0。规划对照1735 employee preserve与当前validator/runner后，选择补齐对称`systemStatic.mode=preserve`且保留旧v1/v2默认replace，不退回无管理员事实声明的schema v1，也不以口头约束绕门。
- SERVER 1751 已完成同一fixed入口的system-static preserve对称合同；规划独立复核最终validator `26901B/A3748E2A…BC3DF`、runner `45743B/D86A8907…A7911`，node/bash语法、validator 46 cases、runner 28 cases与diff-check均通过。管理员preserve全程只guard原symlink，不建stage/.next/new、不切换；旧v1/v2及employee replace/preserve兼容，服务器动作0。
- SERVER 1752 的typecheck/build通过，首次portable命令因漏传既有Runbook的`--config.inject-workspace-packages=true`被pnpm 11在物化前拒绝；stage已精确清理，候选五件套与服务器动作均为0。规划结合03J/122A成功记录及pnpm官方deploy合同，冻结唯一修正为命令行临时启用injected、offline、non-legacy；不改workspace配置、不走legacy，也不重复已通过构建。
- SERVER 1753 按该唯一官方路线形成portable 170/170并冻结五件套；规划独立复核五项bytes/SHA、actual declaration validate/emit、SHA files=2及archive仅`backend+static`均通过，system old/next锁定现有管理员target、migration none。候选进入一次受控fixed安装/发布，不再build/deploy/archive或生成Rn包。
- SERVER 1754 在远端只读身份检查后因PowerShell双引号提前展开远端`$()`而停止；无SCP、远端目录/fixed/inbound/入口调用/重启/数据库写，残留0，五件套未消费。规划不改候选，直接复用1737已成功的无插值stdin边界：UTF-8无BOM/LF原始脚本字节交给远端`bash -s`，避免跨shell插值后再执行唯一动作。
- SERVER 1755 的无插值stdin文本与bash语法门已通过，但Git Bash SSH未继承Windows OpenSSH的known_hosts，严格host-key门在远端执行前停止；服务器写与残留仍为0。规划保留严格校验，改为Windows OpenSSH并显式固定项目config、绝对key/known_hosts、BatchMode/IdentitiesOnly，不读取/修改host key、不接受新key、不改候选。
- SERVER 1756 因把OpenSSH `-o`和值合成单个ArgumentList token而在stdin前退出，服务器动作仍为0。规划撤销多余覆盖，回到1754已实证成功的Windows `ssh.exe -F <project-config> qimao-test-server`；config自身保持key、严格host-key、BatchMode和IdentitiesOnly，1757只把已过门raw stdin接到该最小逐token命令，SCP亦同。
- SERVER 1757 已通过最小Windows OpenSSH+raw stdin读取当前三指针、unit与五项页面200，但手写preflight误用`127.0.0.1:8081/overview`要求403而停止，远端写仍为0。规划按单一事实源删除该重复断言：fixed从declaration emit读取`/api/system-control/overview`并在backend 3001执行403/json/nonhtml与回滚；preflight只保留不重复的主体基线。
- SERVER 1758 的主体基线再次通过，最后因普通qimao-deploy直接重定向root-owned `/run/lock`失败而停，上传/安装/入口/服务/DB写仍为0。规划固定为root权限下`flock -n <固定锁> -c true`做锁可用性门，不删除或改写锁；发布入口仍自行获取同一锁并在并发时安全停止。
- SERVER 1759 在进程启动前被平台安全审批拒绝，泛化“允许”未被识别为本次SCP、root fixed安装、backend切换/重启和失败回滚的精确授权；服务器写0、残留0、五件套未消费。总控已停止显示active，等待用户在SERVER固定任务对这一组具体副作用直接确认一次，确认前禁止重发。
- 随后连续三个goal回合复核均未出现该精确授权或外部状态变化，SERVER保持idle；1761按硬规则将目标正式标为blocked，避免继续空转或重复提醒。1753五件套仍是唯一冻结输入；用户在SERVER固定任务直接确认后可原身份恢复，不重冻、不重测、不重传。

## 2026-09-01｜OCR 运行参数后端冻结

- `OCR-RUNTIME-CONFIG-BACK-1728` 通过：OpenVINO 抽帧间隔与每集最大帧数进入不可变批次/Attempt 快照及 digest，Worker/extractor 按快照执行；并发仍只由既有 route 容量控制。冻结范围为 `frameIntervalMs=250..10000`（默认1000）、`maxFramesPerEpisode=1..600`（默认600）。contracts/backend typecheck、4个专项文件62项和本地 PostgreSQL 迁移事实均通过；未执行真实 OCR、素材、Secret 或部署。规划侧因超长线程结果截断延迟接收，复核完整回合后已收口为 `observer_degraded` 并衔接 FRONT。

## 2026-09-01｜协作通道误中断复盘与规则收缩

- `OCR-RUNTIME-CONFIG-BACK-1728` 实际已出现收件、代码搜索和数据流审计；规划仅依据 `wait_threads latestAssistantMessage=null` 误判空转，在未先读取最新完整回合时归档并中断了真实工作。新BACK随后确认共享树已有1728实现/专项测试，6037000也已在本地库登记，证明线程观测并不完整；现有候选归入1728待验收，未发生服务器部署、真实OCR或外部动作。事件定性为 `orchestration_gap`，不记作BACK或OCR失败。
- AGENTS只保留三条不可跳过原则，WORKFLOW收敛为一个六步恢复检查表：任何ACK/中断/归档/换代前必须`read_thread(includeOutputs=true)`并核对文件、命令和外部事实；归档/恢复明确属于会中断turn的协调动作；有任一真实动作只记`observer_degraded`并继续复用原任务。
- 平台授权规则按真实行为修正：若外部传输必须在动作任务内由用户确认，规划只导航一次，禁止跨任务代转或重复尝试。CURRENT删除1712～1726过程叙述，只保留生产事实、当前协作事件、唯一推进顺序和固定角色。

## 2026-09-01｜声明式三站发布与 ASR 预算默认关闭上线

- 固定发布入口扩展为 v2：同一声明可原子切换 backend、员工站和管理员站，并共用候选门、健康门、自动回滚和精确清理；v1 保持兼容。portable backend 改用 pnpm 11 injected workspace 模式，拒绝指向工作区源码的 junction。
- 1725 首次唯一调用成功应用 6036000，但因管理员未认证探针硬编码 401、真实合同为 403 JSON 非 HTML而在后置门停止；三个指针自动回滚、清理通过，ASR/OpenVINO PID 不变。1726 将期望状态纳入严格声明合同并保持 v1/旧 v2 默认兼容。
- 1727 以 `migration.mode=none` 唯一发布通过：三应用指针切换到 `asr-budget-default-off-20260901-r1`，backend 仅重启一次，ASR/OpenVINO 未重启、screen Worker 保持停止；五项 HTTP 200、403 探针、零残留，数据库/Provider/COS/route/budget 写均为 0。ASR 预算现为默认只统计和提醒，只有管理员显式启用才阻断。
