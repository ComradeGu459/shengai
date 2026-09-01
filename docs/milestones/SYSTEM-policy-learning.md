# SYSTEM-07 策略与学习中心

状态：Wave A/B 已关闭；Wave C 首模块启动包待用户确认  
日期：2026-08-18  
职责：系统控制台策略与学习  
衔接：`INT-11`、`INT-14`、`INT-15`、`INT-17`

## 1. 目标与成功标准

管理员需要在不修改代码的情况下管理本地规则、AI 可选筛选、提示词、热词投影和风险词，并能从长期人工操作中形成可审查的优化候选。学习结果必须经过固定数据快照、离线评测和人工批准，不能直接覆盖生产规则或既有人工决定。

成功标准：

1. `/strategy` 在既有 `ControlShell` 内提供规则版本、操作事件、优化候选、评测与发布的统一入口；不把工程说明、供应商密钥或跨项目完整正文显示在页面。
2. PostgreSQL 保存不可变策略版本、运行输入快照、候选、评测结果、批准和审计；浏览器不是规则或学习状态的所有者。
3. 术语、前置审改、画面字和字幕验收的既有不可变事件通过服务端安全投影被发现，不复制成第二套“人工日志真相”。
4. 本地规则优先；AI 只处理歧义、风险命中或抽样，关闭、超时、限额耗尽或失败时回到人工队列，不阻断员工主链。
5. 单条事件、单次模型输出和单个采用率都不能直接发布；候选必须经过证据门、固定回归集、人工批准和可回滚发布。
6. 全部费用预算和页面主金额只使用人民币 CNY；未知或待对账不得显示为 0。

## 2. 推荐交付方式：一个模块、三波关闭

### Wave A：证据目录与版本库

- 服务端只读聚合既有人工事件的安全元数据：模块、项目、集数/轨道、动作类别、时间、来源版本、前后摘要和证据索引。
- 建立五类有严格载荷 schema 的不可变策略资产：`local_rule_pack`、`ai_filter_policy`、`prompt_template`、`hotword_projection`、`risk_lexicon`。
- 允许创建资产与新草稿版本、服务端检索/筛选/分页、版本差异和只读详情；不提供 active 发布，不影响员工任务。
- 页面先交付“总览 / 本地规则 / AI 筛选 / 提示词 / 热词与风险词 / 操作日志”六个可发现页签；候选与评测明确显示“后续波次”，不伪造数据或按钮。

### Wave B：优化运行、候选与离线评测

- 管理员按模块、项目范围、时间范围和最小证据量创建一次 `OptimizationRun`；固定事件游标/摘要、输入版本和 CNY 预算。
- 首期只接零网络确定性分析器，输出候选规则、风险词、提示词补丁或建议测试案例；真实 AI 分析器、网络和付费另行授权。
- 候选必须显示支持/反对证据数量、覆盖范围、未知项和潜在误报；管理员可合并、编辑、驳回或送入固定评测集。
- `EvaluationRun` 对比基线与候选的误报、漏报、人工处理量、耗时和 CNY 费用；失败或未知不改变任何生效版本。

### Wave C：人工批准、受控生效与回滚

- 先选择“前置审改本地规则”作为第一个真实消费模块；创建显式基线导入/确认命令后，才把当前代码规则转换为数据库权威版本。
- 同一切换任务内删除被替代的硬编码/default/static/nullable-version 路径；没有 active 版本时新筛选运行稳定阻断，不静默回退。
- 通过评测的版本可批准、小流量验证、发布和回滚；发布只影响新创建的运行，历史任务继续绑定旧版本。
- 术语提取、热词投影、画面字和风险审查随后逐模块接入；不得一次横切所有工作流。

推荐该顺序的原因：Wave A/B 可以在不破坏现有员工主链的前提下建立可信管理面；Wave C 再逐模块完成唯一状态源切换。一次性同时改四个业务模块看似更快，但会扩大迁移、回归和回滚范围，也最容易产生新旧规则双轨。

## 3. 页面、入口与下游

- 入口：左侧一级导航“策略与学习”进入 `/strategy`；页内标签保持同一 URL 查询身份并支持直接链接。
- 返回：可跳转系统总览、引擎、预算、日志与变更审计；员工站不出现管理员入口。
- 下游：Wave A 只管理草稿和安全事件事实；Wave B 形成候选/评测；Wave C 的 active 指针才由新任务创建事务固定到 Job/Run。
- UI 复用既有 `ControlShell`、服务端表格、只读抽屉、`ErrorBlock`、分页、公共 Modal 与未知结果恢复原语；不另造第二套控制台壳层。

## 4. 唯一数据所有者与隐私

| 数据 | 权威所有者 | 策略中心行为 |
| --- | --- | --- |
| 术语/审改/画面字/字幕人工事件 | 既有领域事件表 | `UNION ALL` 安全投影；不复制正文事件表 |
| 策略资产和不可变版本 | system-control PostgreSQL | 严格区分五类载荷；只追加版本 |
| 优化运行、候选、评测和批准 | system-control PostgreSQL | 固定输入摘要、检查点、结果和审计 |
| active 版本 | 每个目标模块唯一指针 | 仅 Wave C 发布命令可移动；失败保持旧指针 |
| 原始视频/音频/完整字幕/完整提示词/完整热词 | 原业务存储或 Secret 边界 | 不进入普通学习日志和跨项目列表 |

安全事件列表只返回稳定事件引用、项目/集数/轨道、动作分类、版本 ID、时间、前后 digest、变更字段和证据计数。跨项目页面不返回 `before_state/after_state` 原文、字幕全文、对象键、供应商载荷、Secret 或模型隐藏推理。优化运行需要上下文时由后端在明确范围内最小读取并生成脱敏特征；普通日志不长期复制原文。

## 5. Wave A 正式契约草案

### 读取

- `GET /api/system-control/strategy/events?domain=&projectId=&action=&from=&to=&search=&sort=&limit=&offset=`
- `GET /api/system-control/strategy/events/:eventRefId`
- `GET /api/system-control/strategy/artifacts?kind=&status=&search=&sort=&limit=&offset=`
- `GET /api/system-control/strategy/artifacts/:artifactId`
- `GET /api/system-control/strategy/artifacts/:artifactId/versions?limit=&offset=`
- `GET /api/system-control/strategy/artifacts/:artifactId/versions/:versionId`

### 写入

- `POST /api/system-control/strategy/artifacts`
- `POST /api/system-control/strategy/artifacts/:artifactId/versions`

创建请求必须由客户端预生成稳定 `artifactId` / `versionId`，并携带 `Idempotency-Key`；后端按规范化请求摘要处理同键重放、同键异参、同 ID 异键和版本竞态。Wave A 没有异步写命令，也不提供 publish/rollback；连接测试、AI 调用和优化运行不应伪装成同步保存。

权限至少拆为 `system-control:strategy:read` 与 `system-control:strategy:write`。Wave B/C 再增加 `system-control:strategy:evaluate`、`system-control:strategy:approve`、`system-control:strategy:release`；匿名、员工 audience 或缺能力主体均为 403，同一 Fastify 实例逐请求隔离。Wave C 同一切换任务删除旧的无前缀 `strategy:evaluate` 能力字符串，不保留双权限别名。

## 6. 状态、失效与恢复

- Wave A 资产版本仅 `draft`；编辑不是覆盖，而是创建下一不可变版本。
- 查询身份变化清除失效选择、抽屉和普通当前页多选；迟到响应不得覆盖新查询。
- PostgreSQL 读取失败保留最近成功事实并标 stale，显示真实 requestId 和唯一重读；成功后聚焦页面或详情标题。
- 写入网络未知只按同一稳定资源 ID 查询；确定性 4xx 清除意图并刷新权威事实，下一次显式提交使用新 key/new body。
- 上游事件后续撤销/恢复仍是新的不可变事件；旧事件引用不删除，候选聚合必须识别撤销链，不能把被撤销修改当稳定偏好。
- Wave C 发布失败、未知或评测失败保持旧 active；回滚追加新命令和审计，不修改历史版本。

## 7. 迁移、旧路径与隔离测试

- Wave A 允许新增策略资产、不可变版本和幂等命令表；空库全部迁移后这些业务表必须为 0，不创建默认规则、示例资产或 active 指针。
- 现有代码内确定性规则在 Wave A/B 仍是当前唯一生产来源；管理页必须显示“尚未纳管”，不得冒充已生效。Wave C 切换后，同一任务删除相应旧规则选择路径，不保留 fallback/compat/legacy。
- 正式前端启用 `/strategy` 时删除当前 disabled 导航分支；没有匿名静态数据、浏览器本地规则或隐藏 owner header。
- 后端测试使用精确隔离数据库、同一数据库时间基准和明确清理；事件投影测试从正式领域写命令形成真实事件，不直接手写第二套“学习事件”。
- 最低跨模块回归：人工修改 → 正式领域事件 → 策略安全列表/详情；撤销事件不被聚合为稳定候选；读取前后领域事件与业务数据零写副作用。

## 8. 计划任务与文件所有权

按以下顺序派发：

1. `UI-SYSTEM-07 Rev1`：冻结 `/strategy` 全模块信息架构，并完成 Wave A 正式页面状态与 Wave B/C 可见但禁用的诚实边界；只改 `DESIGN.md`、`docs/ui/` 和仓库外原型/证据。
2. `BACK-SYSTEM-07A Rev1`：实现安全事件投影、五类策略资产、不可变草稿版本、权限和幂等；允许改 contracts、system-control 后端、必要迁移和后端测试。
3. `FRONT-SYSTEM-07A Rev1`：等待 UI 与 BACK A 通过后实现正式 `/strategy` Wave A；只改 `system-frontend/` 和对应测试。
4. `TEST-SYSTEM-07A Rev1`：正式 React + Fastify + 精确隔离 PostgreSQL 纵向验收并运行本波唯一完整质量门。
5. Wave B/C 各自重新执行 v4.9 启动预检；不得用本稿自动推导真实 AI、付费、Secret、训练或生产切换授权。

UI 与 BACK A 文件不重叠，现可受控并行；前端与测试严格后置。

## 9. 本轮非目标与用户评审点

- 不接 DeepSeek/OpenAI/其他真实 AI，不读取真实 Secret，不产生付费调用，不部署云资源。
- 不启动模型训练/微调，不收集训练音视频，不实现浏览器聊天智能体或自动改代码。
- 不把风险词命中等同自动删除；风险词只形成非阻断提示或人工复核事实。
- 不在 Wave A 改变任何员工工作流、现有规则、ASR/OCR/术语结果或交付产品。
- 用户已确认“Wave A 先建立证据与版本库，Wave B 做候选/评测，Wave C 才逐模块生效”的推荐顺序。Wave A/B 已关闭；Wave C 首模块仍须按下述启动包完成用户评审后才解锁生产实现。

## 10. Wave C 首模块启动包：前置审改本地规则（待用户确认）

### 10.1 单一范围与用户路径

- 本切片只接入 `pre_review + local_rule_pack`，不同时切换术语、热词投影、画面字、风险词、提示词或真实 AI。
- 管理员从 `/strategy` 的“本地规则”进入“前置审改规则”，依次查看当前代码基线、确认导入、离线影子验证、人工批准、发布或回滚；员工站不出现规则切换入口。
- 发布只影响之后新建的前置审改会话；历史会话继续固定原版本并保持只读证据。发布前若仍有未完成且未绑定策略版本的旧会话，影响检查必须硬阻断，避免同一可写会话跨两套规则。
- 首版“小流量验证”采用固定数据快照上的零网络影子评测，不引入百分比路由、真实员工流量或第二 active 指针；真实灰度流量等出现明确生产需要时另立切片。

### 10.2 运行时规则必须严格字段化

现有通用 `local_rule_pack.rules[{pattern,replacement,action}]` 只适合作为候选/草稿资料，不能直接执行为前置审改生产规则。Wave C 新增带判别字段的 `pre_review_local_rule_pack_v1` 严格载荷，首版只允许：

| 字段 | 基线值 | 说明 |
| --- | ---: | --- |
| `alignmentNearbyGapMs` | `350` | 无时间重叠时允许建立关系的最大中心点间隔 |
| `alignmentSimilarityThreshold` | `0.750000` | 无重叠关系的最低文本相似度，按精确十进制保存 |
| `maxCharacters` | `28` | 去空白后的单条最长字符数 |
| `forbidSentencePunctuation` | `true` | 保留现有中英文句末标点门禁 |
| `forbidMarkup` | `true` | 保留 HTML/ASS 格式字符门禁 |
| `forbidBrackets` | `true` | 保留括号门禁 |
| `requireSpeakerDashForMultipleLines` | `true` | 多人同轴每行必须以半角 `-` 开头 |

`one_to_one`、ASR 质量通过、无阻断格式问题、无术语冲突等安全条件首版是只读不变量，不做可关闭开关。任意正则、脚本、公式、代码片段和浏览器本地规则不得进入运行时载荷。以后确需增加规则类型时，逐项增加有界字段及独立回归，不开放任意执行能力。

### 10.3 权威数据与状态

- 规则内容继续由不可变 `strategy_artifact_versions` 拥有；Wave C 只新增运行审批/影响检查/发布命令/唯一 active pointer，不复制第二份规则正文。
- 基线来源是服务端只读 `pre_review_local_rule_pack_v1` 清单及其 digest。显式“确认导入基线”命令创建一个 `local_rule_pack` artifact/version 和基线确认事实；迁移不得自动创建 artifact、version 或 active 指针。
- 导入后的默认规则必须作为 `origin=system_baseline` 的受保护不可变版本长期保存在 PostgreSQL 历史中，完整保存结构化规则载荷、内容摘要、导入时间、确认人和历次发布/回滚事件；不得覆盖、删除或只留下 digest。
- 管理员可以在历史中选择该基线或任一先前已批准版本执行“恢复到此版本”。恢复仍创建新的 `releaseCommandId` 和审计事件，只移动 active pointer，不复制、改写或复活旧记录；恢复后也只影响新建会话。
- 普通候选版本必须绑定 `evaluationRunId + candidateDigest + contentDigest`，只有评测成功且影子影响检查通过后才能人工批准。基线版本走一次性显式确认路径，不伪造 EvaluationRun。
- 发布/回滚只移动 `pre_review` 的 PostgreSQL 唯一 active pointer；失败、未知和确定性冲突均保持旧 active 不变。回滚只追加新命令与审计，不能改写历史版本。
- 新建前置审改会话在同一事务内读取 active pointer，固定 `strategyVersionId + contentDigest`；无 active 时在写入会话、episode、item 或命令前稳定 `409`，不得回退代码默认值。
- Wave C 生效前的未绑定会话只能作为历史只读证据；影响检查必须确认没有仍可写的未绑定会话，才允许首次发布。

### 10.4 正式 API 与异步身份

读取：

- `GET /api/system-control/strategy/runtime-targets/pre_review`
- `GET /api/system-control/strategy/runtime-targets/pre_review/baseline-preview`
- `GET /api/system-control/strategy/runtime-targets/pre_review/impact-runs/:impactRunId`
- `GET /api/system-control/strategy/runtime-targets/pre_review/release-commands/:releaseCommandId`
- `GET /api/system-control/strategy/runtime-targets/pre_review/history?limit=&offset=`

写入：

- `POST /api/system-control/strategy/runtime-targets/pre_review/baseline-imports`
- `POST /api/system-control/strategy/runtime-targets/pre_review/impact-runs`
- `POST /api/system-control/strategy/runtime-targets/pre_review/approvals`
- `POST /api/system-control/strategy/runtime-targets/pre_review/releases`

所有写请求由客户端预生成稳定 `baselineImportId`、`impactRunId`、`approvalId` 或 `releaseCommandId`，携带 `Idempotency-Key`，后端保存规范化请求摘要。响应未知只 GET 同一身份，禁止自动重发写命令；确定性冲突清意图并刷新权威事实。发布请求明确 `action=publish|rollback`、目标版本、期望旧 active、影响检查身份和内容摘要。

权限最少拆分为 `system-control:strategy:read`、`system-control:strategy:write`、`system-control:strategy:evaluate`、`system-control:strategy:approve`、`system-control:strategy:release`；同一 Fastify 实例逐请求校验 system-control audience，员工 audience 与缺能力主体均拒绝。

### 10.5 切换时必须删除的旧路径

同一消费者切换任务必须完成以下清理，静态扫描为零后才允许关闭：

- 删除 `pre-review.domain.ts` 中作为运行时默认来源的 `PRE_EDIT_ALGORITHM_VERSION`、`PRE_EDIT_FORMAT_POLICY_VERSION` 及 350ms、0.75、28 字等直接选择路径；纯函数改为显式接收已验证规则包，不提供默认参数。
- 删除会话创建时从代码常量填充 `algorithm_version/format_policy_version` 的路径；显示字段改由绑定版本派生，权威身份是 `strategyVersionId + contentDigest`。
- 删除任意 `default/static/bootstrap/nullable strategy version` 运行回退、旧测试常量和浏览器规则副本；保留的只读基线清单只能用于显式导入预览和灾难恢复核对，导入后的受保护数据库版本才是可发布、可回滚的历史事实，运行时不得直接读取代码清单。
- 不保留“新策略失败后继续旧硬编码”的 compat/legacy 分支；无 active 的唯一行为是零副作用阻断。

### 10.6 迁移、隔离与关闭证据

- 增量迁移只建审批、影响检查、发布命令、active pointer、审计和会话策略绑定结构；从空库执行全部迁移后这些业务表行数必须为 0。
- 会话绑定必须由新会话创建事务写入且数据库可验证；不得用 nullable 字段表达新会话的可选版本。历史未绑定会话只允许只读，首次发布前验证不存在仍可写的未绑定会话。
- 后端测试使用精确隔离 PostgreSQL、单一数据库时间基准和零网络确定性影子评测；结束后 baseline/version/pointer/command/session 夹具与隔离库残留为 0。
- 必须有同输入金丝雀回归，证明“代码基线”与“显式导入的 v1 规则包”在对齐分组、格式问题、系统决定和门禁结果上完全一致。
- 必须证明系统基线版本无法更新/删除、刷新后仍可发现，且管理员从较新版本手动恢复到基线后，新会话固定基线 ID，旧会话和所有历史发布记录字节级不变。
- 跨模块关闭证据至少覆盖：无 active 零副作用阻断；基线导入幂等；评测/影响/批准；发布只影响新会话；旧会话不变；回滚后新会话固定前一版本；同键重放、异参冲突、并发命令、进程重启和 unknown GET 恢复。
- UI 继续复用 `ControlShell`、服务端表格、公共 Modal/Drawer、`ErrorBlock` 与 async recovery；1440/1024 根无横溢，宽表仅容器内滚，发布/回滚 pending、失败、unknown、成功焦点闭环必须有正式 React 证据。

### 10.7 解锁顺序与非目标

用户确认本启动包后，按 `UI-SYSTEM-07C → BACK-SYSTEM-07C → FRONT-SYSTEM-07C → TEST-SYSTEM-07C` 串行依赖推进；UI 可先冻结页面，但后端实现和共享契约只有规划复核 UI/契约映射后解锁。首模块关闭前不并行接入第二业务模块。

本切片不接真实 AI、真实网络、Secret、付费、云资源或自动发布；不开放任意正则/脚本；不训练模型；不把策略中心变成员工日志全文库；不修改历史人工决定；不实现真实百分比流量灰度。
