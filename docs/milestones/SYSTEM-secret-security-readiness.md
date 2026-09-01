# SYSTEM-05 · 密钥与安全引用及真实供应商接入准备

状态：规划冻结；用户已授权本地零网络开发与自动统筹，但真实 Secret、外部网络、付费调用、Cloudflare 和部署仍须另行授权。

## 1. 目标与成功标准

本切片在既有 ControlShell、SYSTEM-03 引擎版本和 SYSTEM-04 预算安全门之上，贯通：

`服务器发现 Secret 候选 → 登记稳定引用 → 不可变引用版本 → 零网络可用性验证 → 引擎版本绑定 → 轮换/撤销保护 → 审计与访问入口就绪状态`

成功必须同时满足：

1. 浏览器、管理 API、PostgreSQL、日志和审计都不接收、不保存、不返回明文 API Key、Token、连接串或环境变量值。
2. `SecretReference` 是稳定公开身份；`SecretReferenceVersion` 是不可变绑定。内部 Vault/环境/平台句柄只由后端注入的 Secret Provider 持有，外部只见 UUID、业务别名、脱敏摘要和状态。
3. 新建或替换引擎 Secret 时只能选择服务端已发现且 capability/provider/environment 匹配、验证通过的引用版本；不能输入任意 `referenceId`、URL、Header 或脚本。
4. 轮换创建新引用版本，不改写旧引擎版本和历史 Attempt；要使用新 Secret 必须创建新的 EngineDeploymentVersion，再经既有测试、路由影响检查和发布链生效。
5. 撤销前必须检查当前 active 路由和非终态任务；被引用时稳定阻断。撤销不删除历史，unknown 只查询同一命令身份。
6. `/security` 同时展示员工站/控制台 Access 边界的只读就绪状态；本切片只消费可注入摘要，未配置时诚实显示“未配置”，不伪造 Cloudflare 健康。
7. 精确权限、两站隔离、1440/1024、加载/空/失败/stale/未知、键盘与高风险确认均通过；员工站源码和构建中管理入口/API 命中为零。

## 2. 唯一数据所有权

### 2.1 Secret Provider 与 PostgreSQL

- Secret 值及内部版本句柄的唯一所有者是未来部署环境的 Secret Provider（例如 Cloudflare/Docker/操作系统 Secret Store）；PostgreSQL 不保存 Secret 值。
- PostgreSQL 只保存稳定引用身份、不可变版本、公开别名、适用环境/capability/provider、内部句柄摘要、验证状态、轮换关系、命令和只追加审计。
- 本地开发只提供零网络、匿名、不可导出值的 Provider fake；它证明接口和状态机，不冒充真实 Secret 已接入。
- 服务端发现结果有界分页；浏览器不能提交任意内部句柄。候选失效、Provider 不可用或结果未知时不自动换绑。

### 2.2 状态与版本

- 引用状态：`available / validation_failed / unknown / rotation_due / revoked`；无任何引用时页面使用空状态，不创建 bootstrap 数据。
- 验证运行：`queued / running / succeeded / failed / unknown`，使用稳定 `validationRunId`、Job/Attempt、租约和 GET 恢复；首版仅零网络检查引用存在、能力匹配和脱敏元数据一致性。
- 轮换使用稳定 `rotationCommandId` 与 `Idempotency-Key`；新版本成功后旧版本保留，不自动改变任何 EngineDeploymentVersion。
- 撤销使用稳定 `revokeCommandId`；只有无 active 路由引用、无非终态任务使用时才成功。成功后新引擎版本不得再绑定该引用版本。

### 2.3 与 SYSTEM-03/04 的衔接

- SYSTEM-03 的 `engine_deployment_versions.secret_reference_id` 收敛为不可变 `SecretReferenceVersion` 身份；不再保存或接受浏览器提供的内部 Provider 句柄。
- 已存在的无 Secret 零网络版本保持合法。需要 Secret 的真实 provider descriptor 在缺少可用引用版本时稳定阻断连接测试和路由发布。
- SYSTEM-04 继续在任何真实付费副作用前预留预算；Secret 可用不等于允许付费，预算允许也不等于 Secret 可用。
- 新任务仍只读取已发布路由固定的 EngineDeploymentVersion；Secret 轮换不改写运行中或历史任务。

## 3. 页面与交互

沿用唯一 `ControlShell`，正式入口为 `/security`，不在员工 AppShell 增加入口：

1. 顶部只显示环境、Access 就绪摘要、Secret Provider 状态和最后刷新；不显示工程说明卡或内部 provider 名。
2. 主表支持服务端搜索、状态/capability/provider 筛选、更新时间排序和稳定分页；列包含业务别名、用途、状态、当前版本、绑定部署数、最后验证和轮换提示。
3. 详情抽屉展示不可变版本、脱敏摘要、使用位置、验证历史和审计；内部句柄、值、请求头、连接串始终不可见。
4. “登记引用”只能从服务端发现候选中选择；没有候选时显示“请先在服务器 Secret Store 配置”，不提供明文输入框。
5. 验证、轮换、撤销均使用既有异步恢复原语；撤销属于高风险操作，必须展示 active 路由、非终态任务和受影响部署，安全初始焦点、双向闭环、pending 锁定、失败/unknown 唯一恢复齐全。
6. 1440 保持详细表与侧栏；1024 侧栏覆盖展开不挤主区，宽表只在自身容器横滚，不删关键字段。

## 4. 切片与依赖

### UI-SYSTEM-05

在既有 ControlShell 冻结 `/security` 的信息结构、状态矩阵、1440/1024、登记/验证/轮换/撤销交互和 Access 未配置状态。不得渲染明文 Secret 输入、复制/下载、任意引用文本框、真实供应商成功或匿名生产数据。

### BACK-SYSTEM-05A

交付共享契约、必要增量迁移、SecretReference/不可变版本/验证运行/命令/审计、可注入 Provider 与 Access 摘要。默认 Provider 不发现任何引用并拒绝写入；零网络 fake 仅用于测试。将 SYSTEM-03 引擎绑定收敛到引用版本身份，删除浏览器任意引用和旧内部句柄路径，不增加兼容分支。

### FRONT-SYSTEM-05B

依赖 UI 与后端规划验收。只消费正式 API，实现 `/security`、服务端查询、详情/历史、异步恢复、高风险撤销、两站隔离和双视口；不在浏览器缓存 Secret 事实或推算可用性。

### TEST-SYSTEM-05

使用精确隔离 PostgreSQL、正式 Fastify/system-frontend build 与零网络 Provider 验证权限、发现/登记、版本不可变、验证、轮换、撤销保护、引擎绑定、进程重启恢复、员工站隔离和响应式。完整 `pnpm check` 只在 UI/集成通过后运行一次。

## 5. 非目标与授权门

- 不录入、读取、复制、导出或轮换真实 Secret 值；不接真实 Vault、Cloudflare、供应商 SDK/网络、付费调用或云资源。
- 不做应用内账号、邮箱成员管理、裸 SSH、任意命令、服务器删除或防火墙配置。
- 不实现提示词/热词/风险词学习、日志质量详情或服务器遥测；这些仍为后续独立切片。
- 真实供应商接入前必须由用户另行确认厂商、Secret 落点、预算上限、1–3 集获准样本、测试环境和是否允许付费网络请求。

## 6. 验收与关闭门

- 职责矩阵：`系统控制台密钥与安全引用`。
- 核心衔接：`INT-11/13/15/16`；INT-16 专门约束 Secret Provider → 引擎版本。
- 每个业务状态只有一个 PostgreSQL/Provider 权威来源；不得保留浏览器任意引用、旧 resolver 旁路、fallback、legacy 或第二状态源。
- UI 只做一次完整矩阵；微返工只复验变化场景。最终由独立测试与完整 `pnpm check` 关闭。
