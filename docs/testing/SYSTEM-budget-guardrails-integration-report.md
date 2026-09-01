# TEST-SYSTEM-04 Rev 1｜预算与限额独立纵向集成验收

## 结论

2026-08-17 在精确隔离 PostgreSQL、正式 Fastify 和 `system-frontend` production build 上完成预算护栏纵向验收。P0/P1/P2/P3 均为 0，未创建 QA-SYSTEM-04 返工包；生产 `frontend/`、`system-frontend/`、`backend/`、contracts、migrations、DESIGN 均未修改。

原始业务素材未读取或写入；所有适配器均为零网络 stub。脱敏证据见仓库外 `system-budget-04-integration/summary.json`。

## 环境与清理

- 独立数据库从零执行全部 30 个 migration；数据库时间通过 `CURRENT_TIMESTAMP` 读取。
- 正式 Fastify 运行于本轮临时端口 31950，正式前端静态 build 运行于 31951；两端均已停止。
- 测试前数据库事实为 16 个策略版本、1 个 active pointer；预留、命令、预算审计及 ASR/画面字作业在最终快照均为 0（专项测试各自完成清理）。
- 隔离数据库已 `DROP DATABASE ... WITH (FORCE)`，剩余同名数据库为 0；共享 PostgreSQL 55432 未停止。
- 临时 harness、日志和数据库脚本已删除；未触碰原始素材。

## 验收矩阵

| 领域 | 证据 | 结果 |
| --- | --- | --- |
| 权限与两站隔离 | 同一 Fastify 逐请求验证 anonymous/employee/no-capability 为 403；`budget:read` 仅读；`budget:write` 不能读；`budget:publish` 对未知资源仅到资源校验 404；owner 200。员工站源码与 build 扫描 `ControlShell`、`/api/system-control`、预算入口为 0。 | 通过 |
| 空库与唯一权威 | 30 migrations；预算策略/active pointer/命令/预留均由服务端和数据库事实提供；分页、总数、数据库时间响应存在。 | 通过 |
| 金额与状态 | `system-control-budget.test.ts` 10/10：CNY/USD 分币种、精确十进制、day/month、warning/hard、pending/unknown/reconciliation、missing rule/unmetered/not configured 均按矩阵处理，不补零、不换汇。 | 通过 |
| 原子预留/结算 | 同专项覆盖并发 hard-limit、等于上限允许、超限在 adapter 前拒绝、取消、unknown 保留占用、重复结算和幂等重放；无非法第二写。 | 通过 |
| 版本隔离 | V1/V2 预算快照固定到新旧 Job/Attempt；旧记录不改；runtime block 与 configuration hard block 分离。 | 通过 |
| 命令状态链 | draft→testing→impact_checked→approved→active/retired、rollback、active no-op/retired publish 409、稳定 command/idempotency 与未知重读均由专项 10/10 覆盖。 | 通过 |
| 真实业务链零网络 | ASR 13/13、画面字 14/14；同库并行首次出现 3 个超时/死锁，重建隔离库后串行全部复验通过，确认是测试夹具并行污染，不是产品缺陷。 | 通过 |
| 正式页面 | `/budgets` 1440×900、1024×768：根/正文横溢出均 0；1024 宽表容器 `overflow-x:auto`（980/861）；预算导航精确 1 个；控制台 error/warn=0/0；恢复后 reload 保持同样结果。 | 通过 |
| 构建与类型 | system-frontend Vite production build 27 modules；system-frontend typecheck；backend build；system-control 前端专项 39/39。 | 通过 |
| 断连/恢复 | 隔离库连接被终止并由正式池恢复；随后正式预算 API 返回 200、带 requestId，页面刷新恢复真实服务端事实；无 Secret/objectKey/连接串泄露。 | 通过 |

## 缺陷与后续

- P0：0；P1：0；P2：0；P3：0。
- QA-SYSTEM-04-*：无。
- 并行联跑的死锁/超时仅记录为测试夹具清理竞争，已在新建隔离库、单文件串行重跑中全部通过，不进入产品缺陷或返工流。

## 交接

本报告、脱敏证据、CURRENT 与开发日志先写回；TEST-SYSTEM-04 Rev 1 转 `review`，Current actor 转规划对话。正式交接仅唤醒规划固定任务，后续按“测试→规划→返工角色（若有）→规划→原测试复验→规划关闭”执行。
