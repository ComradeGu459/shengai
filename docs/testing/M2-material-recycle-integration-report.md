# M2 素材配对与回收站集成验收报告

任务：`TEST-MATERIAL-RECYCLE-02 / Rev1`  
角色：`TEST`  
权限：`workspace-write-equivalent:managed-root/direct`（G4 精确探针通过）  
验收时间：2026-08-21

## 结论

`artifact_written`，但完整关闭门未通过，已按协议停止并交回 Owner/规划。当前证据计数：P0/P1/P2/P3 为 `0/0/1/0`；P2 为既有 `ProjectMaterials` 回归断言差异，未由 TEST 修复。

未修改生产实现、Owner 测试、CURRENT、开发日志、服务器或共享默认数据库；未读取真实 5.17GB 素材，未启动真实 ASR/OCR、Worker、上传或部署。

## Owner 专项门

- `tests/frontend/material-folder-flow.test.tsx`：7/7。
- `tests/frontend/UploadQueue.test.tsx`：14/14；两项合计 21/21。
- `tests/frontend/RecycleBin.test.tsx`：9/9。
- `tests/backend/recycle.test.ts`：11/11。
- 当前迁移在本轮精确隔离 PostgreSQL 空库从零执行 37/37。
- contracts build、backend typecheck/build、frontend typecheck/build、`check:repo` 和受影响路径 `git diff --check` 均退出 0。前端构建仅有既有 chunk-size 提示。

## 唯一完整关闭门

- 在专项全绿后仅执行一次：`DATABASE_URL=<本轮精确隔离库> pnpm check`。
- `check:repo`、四工作区 lint/typecheck 与 37/37 迁移通过；Vitest 结果为 52 files 中 50 通过、499 assertions 中 498 通过，命令退出码 1。
- 失败 1：`tests/frontend/ProjectMaterials.test.tsx` 的既有断言“完整配对 bindings 应为 4”，实际为 6；未修改 Owner 或生产实现。
- 失败 2：`tests/backend/system-control-runtime.test.ts` 的 `afterAll` 10 秒 hook 超时；未发现该文件业务断言失败，宿主清理 hook 阻断了关闭门。
- 因失败即停，完整命令未进入最终 build；不重试、不加 timeout、不叠加 fallback。两项均交回规划/Owner 归因。

## 集成与浏览器证据

- 匿名合成夹具覆盖 51 集、102 个物理文件、153 个角色槽；共享 MP4 只计一次物理文件。专项覆盖总系列分类/阻断、确认前零上传、三角色目录重算保留其他草稿、单槽/取消/不支持目录、根改名、重复、unknown GET、暂停/继续。
- 正式 `frontend/dist` 由一次性仓库外 harness 提供静态页面；所有非会话 API 原样代理到正式 Fastify，后端使用本轮精确隔离库。harness 未进入仓库，已在收尾删除。
- 1440×900：根页面 `clientWidth=scrollWidth=1440`，控制台 `error/warn=0/0`。
- 1024×768 展开/收起侧栏：根页面无横向溢出；回收站宽表只在自身容器横滚（实测 `754/980`），控制台 `error/warn=0/0`。
- 回收站真实页面显示 `recycled` 与 `purging` 两态；单项永久删除确认后进入 `purging`，动作变为不可恢复，清空入口在无 `recycled` 时禁用。
- 受控版本冲突返回 409，页面保留项目并显示脱敏 requestId；同一命令 unknown GET 返回安全 404，未发生二次 POST。
- 服务器启动器 `pnpm ... start` 首次触发已知宿主 `uv_os_get_passwd ENOMEM`；未修改代码，改用已通过 build 的 `backend/dist/server.js` 启动同一正式 Fastify。该宿主问题不计业务缺陷。

## 证据位置

截图仅保存在仓库外 Codex 可视化目录：

- `qimao-mr02-1440.png`
- `qimao-mr02-1024-expanded.png`
- `qimao-mr02-1024-collapsed.png`
- `qimao-mr02-recycle-1024.png`
- `qimao-mr02-recycle-1024-409.png`
- `qimao-mr02-recycle-1024-purging.png`

## Rev2 变化复验（TEST-MATERIAL-RECYCLE-02 Rev2）

- 前端最小变化矩阵首轮：`ProjectMaterials` 6/6、`material-folder-flow` 7/7、`RecycleBin` 9/9、`UploadQueue` 13/14；合计 35/36（4 个文件中 3 个通过）。
- 首个失败：`tests/frontend/UploadQueue.test.tsx:479` 的“102个文件先给出分配摘要，确认后最多并行准备2个文件”在 Vitest 15 秒测试超时。
- 遵循“任一失败即停”：未运行 backend recycle/runtime/operations，未创建隔离库，未运行 diff-check，未改生产/Owner/CURRENT/日志/服务器。
- Rev2 未关闭；Rev1 既有 P0/P1/P2/P3 `0/0/1/0` 保留，Rev2 timeout 尚未定级并交回 Owner/规划。
- Rev2 未启动服务、数据库或 harness，无新增临时残留。

## 清理

- 已停止本轮正式 Fastify、production preview、浏览器 harness，并关闭测试标签。
- 集成浏览器阶段和完整关闭门阶段使用的两枚精确隔离数据库均已 DROP 并核对无残留；共享 PostgreSQL 实例保持运行，服务器项目零写。
