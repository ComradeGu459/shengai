# 独立系统控制台

管理员站使用独立 Vite/React 工作区，不注册进员工 `frontend/`。ControlShell 现提供系统总览、引擎/API、路由调度、变更审计四个入口；Wave C 三页只消费正式 system-control API，不创建浏览器默认 active 或匿名样例。

- `/`：系统总览（`GET /api/system-control/overview`）
- `/engines`：EngineDeployment、不可变版本、连接测试与脱敏 Secret 摘要
- `/routing`：三池路由草稿、测试/影响检查/批准状态
- `/changes`：状态链、发布/回滚与稳定命令未知结果恢复

```powershell
pnpm --filter @qimao-terms-cloud/system-frontend dev
```

开发端口为 `3010`，`/api` 代理到本地后端 `3001`。正式构建使用 `pnpm --filter @qimao-terms-cloud/system-frontend build`。
