# TEST-SYSTEM-05 Rev 1｜密钥与安全引用纵向集成验收

## 结论

2026-08-17 完成 SYSTEM-05 关闭验收。固定测试任务因本轮 `read-only` 无法写回，由规划对话在已确认的 `workspace-write` 环境接管同一验收范围；未建立第二实现或降低验收门。

正式 `system-frontend`、Fastify、项目 PostgreSQL、零网络 Secret Provider 与完整仓库质量门均通过。P0/P1/P2/P3 均为 0，无 `QA-SYSTEM-05-*` 返工包。真实 Secret、Vault、供应商网络、付费调用、云资源和部署未接入。

## 验收矩阵

| 领域 | 证据 | 结果 |
| --- | --- | --- |
| 权限与两站隔离 | 后端专项覆盖逐请求能力门；员工站 `frontend/src` 与入口静态扫描 `ControlShell`、`/api/system-control`、密钥入口为 0。 | 通过 |
| Secret 权威边界 | 浏览器只消费服务端候选、稳定引用和不可变版本；无明文 Secret、任意引用 ID、URL/Header 输入、第二状态源或兼容写路径。 | 通过 |
| 验证与绑定 | 零网络验证的 queued/running/failed/unknown/succeeded、未验证不可绑定、同能力同提供方引擎版本绑定、90 天轮换提示均由服务端事实驱动。 | 通过 |
| 轮换与撤销 | 轮换只新增不可变版本且不自动换绑；撤销在事务内重验 active 路由和非终态 Attempt，竞态阻断时命令/状态/审计零副作用。 | 通过 |
| 异步恢复 | create/rotate/revoke/validate 使用稳定身份；unknown 只读取同一命令或运行，确定失败保留 requestId 和唯一恢复，不自动重发写命令。 | 通过 |
| 正式 HTTP | 正式 Fastify 读取 security、references、discovery 和 overview 均为 200；受控 Provider 拒绝登记稳定返回 422 与真实 Fastify requestId，弹窗保留且唯一恢复获焦。 | 通过 |
| 正式页面 | 1440 根 `1440/1440`；1024 根 `1024/1024`、侧栏 72、正文 952；覆盖展开不挤主区，候选宽表只在自身容器横滚；控制台 error/warn=`0/0`。 | 通过 |
| 数据库与迁移 | Secret 专项 6/6；撤销竞态用例从零执行全部 31 个迁移并删除隔离库。主库迁移检查为 `No migrations to run!`。 | 通过 |
| 完整质量门 | `pnpm check`：仓库规则、四工作区 lint/typecheck、32 个测试文件 **313/313**、contracts/backend/frontend/system-frontend build 全部通过；管理站生产构建 30 modules。 | 通过 |

## 环境故障与修正

- 沙箱服务账户首次在 `tsx` 启动前触发 `uv_os_get_passwd ENOMEM`；改用正常 Windows 用户上下文后迁移正常，未修改生产代码。
- 完整套件首次仅隔离撤销测试因从零执行 31 个迁移耗时 5.24 秒越过默认 5 秒；该测试改为明确 15 秒上限，未加重试、sleep、fallback 或业务分支。定向 6/6 与最终完整 313/313 均通过。

## 证据与边界

- 仓库外正式页面证据：`C:\Users\ComradeGu\.codex\visualizations\2026\08\12\019ff4f8-4a77-7870-8edf-6350490b316c\ui-system-05-formal\`。
- 本轮不验证真实 Secret 值、真实供应商连接、外部汇率、付费副作用或生产 Access；这些仍是独立授权门。
- 浏览器、临时 Fastify/Vite 服务已关闭；项目本地 PostgreSQL 在关闭写回后停止。
