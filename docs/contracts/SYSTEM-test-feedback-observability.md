# 测试反馈与错误观测中心

状态：用户已确认产品方向，供 UI、后端、前端与测试共同实现。  
范围：员工工作台与管理员系统控制台的人工反馈闭环、脱敏诊断关联和未来 Sentry 接入边界。  
非目标：测试任务清单、强制测试步骤、会话录像、自动截图、通用工单系统和本轮真实外部监控网络。

## 1. 用户、问题与成功标准

测试者在独立测试网站中自由操作，不需要学习缺陷术语或整理技术日志。任何“不对、难用、太慢、看不懂或有建议”的情况，都能从当前页面直接反馈；系统自动补齐安全上下文，管理员在独立控制台中完成确认、修复跟踪、复测与关闭。

首版成功必须同时满足：

- 员工站和控制台都能从当前页面打开低干扰的“反馈问题”入口，不覆盖核心编辑、播放器、弹窗或固定操作区。
- 提交者只需选择问题类型并写一句描述；截图为可选项，必须显式选择并再次确认。
- 服务端保存稳定反馈身份、创建者、站点、页面、版本、项目/任务安全身份、requestId、浏览器/视口与选定性能摘要；不得保存页面正文、字幕、视频帧、Secret 或请求/响应 body。
- 管理员可以服务端搜索、筛选、排序、分页、查看详情与不可变历史，并按 `新问题 → 已确认 → 修复中 → 等待复测 → 已关闭` 流转；关闭记录仍可查询并可显式重新打开。
- 网络结果未知时只查询同一反馈/事件身份；确定冲突清除旧意图并刷新权威事实。刷新、重启和换页后均从 PostgreSQL 恢复。
- 反馈记录长期保留且不因项目回收、日志轮转或关闭而删除；附件生命周期另由部署策略管理，但附件身份、摘要与历史关系不得消失。

## 2. 核心界面与流程

### 2.1 员工站与控制台反馈入口

- 两站复用同一语义但不复用导航：入口固定为低强调“反馈问题”，可在当前页面发现，不能伪装成业务主动作。
- 打开 Modal 后安全初始焦点落“返回页面”；问题类型为：`点了没反应 / 页面显示不对 / 数据或状态不对 / 使用起来太慢 / 不知道下一步做什么 / 功能建议`。
- 描述使用一个简短多行输入，不要求复现步骤、严重度、负责人或技术分类。
- “附加截图”由用户显式选择；选择后先展示缩略图、大小和“截图可能包含当前页面内容”的确认，未经确认不上传。
- 提交中 `aria-busy=true`，锁定重复提交、Escape、遮罩与背景写动作；成功聚焦反馈短号与“已收到反馈”，并允许返回原页面。失败保留输入并聚焦错误摘要。

### 2.2 管理员“测试与反馈”页面

- 独立 ControlShell 一级入口 `/feedback`，员工 AppShell 不出现管理列表。
- 顶部只显示服务端真实摘要：新问题、修复中、等待复测、最近关闭；未知不补零。
- 主表按关键字、来源站点、类型、状态、项目、时间服务端筛选与稳定分页；默认按需处理状态优先、更新时间倒序、稳定身份排序。
- 详情 Drawer 显示问题描述、安全上下文、关联 requestId/任务短身份、可选截图、状态与不可变事件历史；不显示字幕正文、视频、请求 body、SQL、对象键、Secret、供应商原始载荷或完整日志。
- 状态变更使用 ConfirmAction/Modal；每次产生新的不可变事件。关闭不删除，重新打开新增 `reopened` 事件并回到“新问题”。
- 只有明确管理员权限可以读取和流转全部反馈；普通员工只能创建并读取刚刚提交成功的单条确认结果，不提供跨项目反馈列表。

### 2.3 错误观测与日志关联

- Fastify 继续使用结构化日志和 requestId；反馈只保存可查询的 requestId 引用，不复制原始日志全文。
- 浏览器自动上下文仅允许：站点、路由模板、buildVersion、浏览器族/版本、viewport、时区、项目/任务稳定身份、最近安全 requestId、页面加载与最近操作耗时摘要。
- 禁止自动采集 DOM 文本、输入框、字幕、画面字、视频帧、文件名、对象键、Authorization/Cookie、Secret、提示词、热词和完整 URL 查询敏感值。
- 调试日志部署期默认轮转 14 天；反馈与事件历史长期保留。保留期是部署配置，不由浏览器决定。
- Sentry 在真实部署期作为外部错误观测适配器接入；账号、DSN、网络与数据处理条款未获授权前，本切片不发送任何外部遥测。接入后仍须服务端/SDK 双层 scrub，session replay 默认关闭。

## 3. 唯一数据所有者

| 数据 | 唯一所有者 | 浏览器只允许持有 |
| --- | --- | --- |
| FeedbackReport | PostgreSQL | 未提交类型、描述、截图选择与页面安全上下文 |
| FeedbackEvent | PostgreSQL 只追加事件 | 当前确认框与未提交备注 |
| ScreenshotAttachment | 对象存储；PostgreSQL 保存身份/摘要/大小/类型 | 本地预览，确认上传后释放 |
| 运行错误与日志 | 现有领域事件/结构化日志；未来 Sentry 只作观测副本 | requestId 和安全错误投影 |
| 修复状态 | FeedbackReport 当前状态 + FeedbackEvent 历史 | 筛选、选中行和 Drawer 开合 |

不建立通用 Issue Worker、反馈队列或第二日志数据库。反馈状态不驱动业务任务状态，业务任务也不能自动关闭反馈。

## 4. 数据与共享契约

### 4.1 FeedbackReport

- `feedbackId`：客户端预生成 UUID，创建与未知恢复的稳定资源身份。
- `kind`：`no_response | display_incorrect | state_incorrect | slow | unclear_next_step | suggestion`。
- `status`：`new | confirmed | fixing | retest | closed`。
- `description`：1–1000 字；后端只保存用户显式输入。
- `surface`：`employee | system_control`；由已验证 audience 与服务端路由共同确定，不信任浏览器伪造。
- `subject`、`projectId?`、`taskType?`、`resourceId?`、`routeTemplate`、`buildVersion`、`requestIds[]`、`browserSummary`、`viewport`、`timezone`、`performanceSummary?`。
- `screenshotAttachmentId?`：仅指向已校验且属于该反馈的显式附件。
- `createdAt`、`updatedAt`、`revision`。

### 4.2 FeedbackEvent

- `feedbackEventId`、`feedbackId`、`action`、`fromStatus`、`toStatus`、`note?`、`actorSubject`、`requestId`、`createdAt`。
- `action` 只允许 `created | confirmed | fixing_started | retest_requested | closed | reopened`。
- 事件不可更新、不可删除；当前状态只能由事务追加合法事件后派生。

### 4.3 ScreenshotAttachment

- 只允许 PNG/JPEG/WebP，首版单张，大小上限由共享契约固定。
- 上传前必须取得短时授权；完成命令核对 feedbackId、摘要、大小、类型和对象归属。
- 响应和日志不得返回 objectKey、内部地址或签名凭据。

## 5. API、权限与异步恢复

建议正式 API：

- `POST /api/feedback-reports`：创建，body 含稳定 `feedbackId`，使用 `Idempotency-Key`。
- `GET /api/feedback-reports/:feedbackId`：同一身份恢复与提交成功确认。
- `POST /api/feedback-reports/:feedbackId/screenshot-authorizations` 与完成确认：显式附件链。
- `GET /api/system-control/feedback-reports`：管理员服务端查询、筛选、排序、分页与真实 total。
- `GET /api/system-control/feedback-reports/:feedbackId`：详情与有界/分页历史。
- `POST /api/system-control/feedback-reports/:feedbackId/events`：稳定 `feedbackEventId` + `Idempotency-Key` 的状态事件。

权限边界：

- 员工站：经验证 `employee` audience + `feedback:create`，只创建；项目/任务身份必须属于当前主体可访问范围。
- 控制台自身反馈创建：经验证 `system-control` audience + `feedback:create`。
- 管理读取：`system-control:feedback:read`。
- 管理流转：`system-control:feedback:write`。
- 匿名、错误 audience、缺能力、跨项目、未知附件或伪造 surface 一律拒绝。

所有创建/流转使用稳定资源 ID + 稳定事件 ID + `Idempotency-Key` + 规范化请求摘要。同键同请求只返回原事实；同键异参、同 ID 异键、版本冲突稳定 409 且零副作用。网络未知只 GET 同一 `feedbackId` 或 `feedbackEventId` 结果，不自动重发 POST。

## 6. 入口、响应式与公共原语

- 员工反馈 Modal 复用现有 AppShell Dialog/ConfirmAction 焦点边界；管理员列表复用 ControlShell、ErrorBlock、DataTable、Drawer、Modal 与 CommandRecovery。
- 1440 与 1024 均不得产生根横向溢出；控制台宽表只在自身容器滚动。1024 侧栏展开覆盖正文，不改变工作区起点和宽度。
- 反馈入口不得覆盖视频播放控件、字幕编辑器保存区、全局通知、Modal 或 Drawer；UI 设计需在现有固定区域中证明安全位置。
- loading、empty、initial error、stale、再次失败、恢复成功、mutation pending、409 冲突和 unknown 同身份恢复均需正式状态。

## 7. 迁移、隔离测试与旧路径

- 空库迁移只创建结构、索引、约束和事件保护；业务初始行必须为 0。
- 后端专项使用从零迁移的精确隔离 PostgreSQL；统一数据库时间创建夹具，结束精确 DROP。
- 对象存储首轮只使用现有注入式内存 fake；真实 COS、Sentry、域名和部署另走用户授权门。
- 当前没有旧反馈中心可兼容；禁止新增 `/issues`、`/tickets`、浏览器 localStorage 工单、通用任务中心反馈行或员工管理列表等平行路径。

## 8. 验收里程碑

1. UI：员工/控制台入口、提交 Modal、管理员列表/详情/状态流转及完整状态矩阵冻结。
2. 后端：共享契约、迁移、逐请求权限、创建/附件/列表/详情/只追加事件与恢复链。
3. 前端：两站正式接入，同一反馈语义、不同权限/导航，自动安全上下文与显式截图确认。
4. TEST：正式两站 + Fastify + 从零隔离 PostgreSQL + 对象存储 fake 的纵向矩阵，证明脱敏、项目隔离、历史、刷新恢复和零旧路径。
5. 部署期：用户批准服务器、对象存储和 Sentry 账号后，再接真实 COS/DSN、HTTPS、日志轮转与告警；不回改反馈业务状态。

