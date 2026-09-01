# 当前项目活跃快照

最后更新：2026-08-21
同步协议：`v6.0`
同步版本：`v4-897`
最近写入：规划对话

历史快照：`docs/status/archive/CURRENT-v4.569-through-v4.896.md`

## 1. 当前用户目标

优先把 `milaidi.online` 员工工作台和 `milaidi.top` 管理后台做成可真实测试的网站。当前最近阻塞是员工素材页选择系列文件夹后缺少可见分配和上传进度；先完成该修复、独立验收和服务器新 release，再继续真实 ASR/OCR 接入。

模型与推理强度由用户在 Codex 界面手动固定；所有任务禁止修改。账号/模型变化只触发权限与消息通道重新握手，不重置业务状态。

## 2. 当前任务总线

| 任务 | 状态 | Owner / Reviewer | 当前停点 | 下一门 |
| --- | --- | --- | --- | --- |
| `FRONT-MATERIAL-FOLDER-01 Rev1` | `in_progress` | FRONT / TEST | 可写 successor 已完成四阶段、暂停继续、mixed-root 与 unknown GET 主体；正在补回归和最终验证 | `artifact_written` 交规划 |
| `BACK-MATERIAL-FOLDER-01 Rev1` | `artifact_written` | BACK / TEST | 已新增 create-upload 命令同身份 GET；build/check 通过，数据库专项未运行 | TEST 隔离 PostgreSQL 复验 |
| `UI-MATERIAL-FOLDER-01 Rev1` | `artifact_written` | UI / TEST | 验收已写入既有 `docs/ui/M2-material-pairing-acceptance.md` | 作为 FRONT/TEST 冻结输入 |
| `TEST-MATERIAL-FOLDER-01 Rev1` | `waiting` | TEST / 规划 | 可写 TEST successor 已预检，等待 FRONT 冻结 | 目录、51集102文件、暂停继续、unknown、A/B隔离 |
| `TEST-SERVER-PUBLIC-MVP` | `blocked` | SERVER / TEST | 服务器保持现有在线版本；不部署在途代码 | 前述切片通过后生成不可变 release 并公网 smoke |

接力顺序：

```text
FRONT artifact_written
-> 规划 planning_received
-> TEST reviewer_started
-> TEST artifact_written
-> 规划关闭素材修复
-> SERVER 新 release / 公网 smoke
```

## 3. 活动 execution leases

### FRONT 可写执行

- `handoff_token=FRONT-MATERIAL-FOLDER-01-RESUME-V4.895`
- `authority_generation=2`
- `repo_root=C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud`
- `permission_profile=workspace-write/:workspace`
- `ordinary_writes=direct`
- executor：内部可写 FRONT successor；可见 v6 successor 已 permission_ok，当前保持 observer，避免重叠
- `allowed_paths`：
  - `frontend/src/features/uploads/UploadQueue.tsx`
  - `frontend/src/features/uploads/UploadQueue.module.css`
  - `frontend/src/features/uploads/model.ts`
  - `frontend/src/features/uploads/sha256.ts`
  - `frontend/src/features/uploads/file-selection.ts`
  - `frontend/src/features/uploads/api.ts`
  - `tests/frontend/UploadQueue.test.tsx`
- 停点：焦点定向已通过；补命令 GET、mixed-root、项目切换迟到隔离和最终验证。

### TEST 可写执行

- `handoff_token=TEST-MATERIAL-FOLDER-01-RESUME-V4.895`
- `authority_generation=2`
- `permission_profile=workspace-write/:workspace`
- `ordinary_writes=direct`
- executor：内部可写 TEST successor；可见 v6 successor 已 permission_ok，等待精确启动
- `allowed_paths`：
  - `tests/frontend/material-folder-flow.test.tsx`
  - `tests/backend/upload-command-recovery.test.ts`
- 停点：等待 FRONT `artifact_written`；不得抢改生产文件或 `UploadQueue.test.tsx`。

BACK 与 UI 当前只有已形成的 artifact，无活动写租约。SERVER 无精确执行租约，不得部署在途代码。

## 4. 任务对话注册表

| 角色 | 旧固定任务 | v6 可见 successor | 当前身份 |
| --- | --- | --- | --- |
| BACK | `01a00445-1878-7072-bfd3-f44de3504a3f` | `01a022c8-f80e-7572-b6d1-b51837ff1bc9` | 两者当前均为只读 observer；BACK artifact 已形成 |
| FRONT | `01a00445-1c71-72d3-9171-33ad2c36e941` | `01a022c8-ffcc-7383-9347-53f3610f2555` | 两者当前均为只读 observer；内部可写执行者持有 lease |
| UI | `01a012fb-e9f3-7801-a660-b22518eeea0c` | `01a022c9-09f2-7d12-bc27-2e7e8d439289` | 两者当前均为只读 observer；UI artifact 已形成 |
| TEST | `01a0065d-ce1c-7f11-94d8-56b91f062cf8` | `01a022c9-1474-7200-90d0-3669b62a7872` | 两者当前均为只读 observer；内部 TEST 等待 FRONT |
| SERVER | `01a01d0c-3f0f-7f73-801e-d3298d631428` | `01a022c9-19e7-7d00-b111-19f810ccee1d` | 两者当前均为只读 observer；无部署 lease |

十个可见角色任务均已在 `authority_generation=2` 形成新 turn。v6 广播时发现五个新 successor 曾被系统归档，现已全部恢复并重新送达；它们的新鲜权限探针仍为 `read-only`。消息通道已打通，但可见任务不因此自动获得写权限；当前 FRONT/TEST 写入只由根任务下已登记的内部执行者按精确 lease 完成。

## 5. 已冻结的相邻事实

- 员工站内账号密码会话已随 `20260821-employee-session-v4896` 部署，并通过 HTTPS 登录、session、projects/tasks、logout 和 Fastify 重启后会话保持；旧 Nginx Basic 仅为未引用的受保护回滚资产。当前尚未部署的是本轮素材文件夹修复。
- 管理员站继续使用 Cloudflare Access 邮箱身份；员工 Cookie 不得获得 system-control 能力。
- BACK 上传命令恢复接口为 `GET /api/projects/:projectId/uploads/commands/:commandId`，其中 `commandId` 是创建 POST 的 `Idempotency-Key`。
- 真实 ASR/OCR、Secret、供应商网络和付费尚未接入；当前 deterministic fake/zero-network 只证明流程，不证明真实识别质量。
- 测试服务器、DNS、Tunnel 和现有公网回退状态以 `docs/deployment/TEST-SERVER-COLLABORATION.md` 与 `docs/testing/TEST-SERVER-ISSUES.md` 为准。

## 6. 当前阻塞与停止边界

- FRONT 未 `artifact_written` 前，TEST 不写正式专项，SERVER 不部署。
- 跨项目/越权、重复 POST/Asset、真实路径或正文/Secret 泄露、浏览器假成功为立即停止项。
- 未经用户新授权，不购买、不提交、不推送、不接真实付费供应商、不执行破坏性数据库或服务器动作。
- `CURRENT` 只保留本页活跃事实；后续每次关闭任务都从本页移除并写入开发日志/归档，不再把旧 FIFO 追加回来。
