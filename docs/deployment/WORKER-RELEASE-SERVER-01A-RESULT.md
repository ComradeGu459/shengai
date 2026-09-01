# WORKER-RELEASE-SERVER-01A

outcome: artifact_written

## evidence

- 已只读审核现有 `deploy/debian/systemd/qimao-worker@.service`、backend/upload service 模板及 `docs/deployment/BACKEND-LINUX-RUNTIME.md`。未发现第二套统一 Worker 发布生成器；本次新增一个声明文件和一个预检入口。
- 声明固定了五个 portable artifact 真实入口：storage、ASR runtime、ASR Worker、app、server；standalone Worker 为 `backend/dist/workers/asr.worker.entry.js`。
- ASR fixture 只声明三类 EnvironmentFile：backend、object-storage、provider；不包含环境值、Secret、WAV 或真实主机探测。
- canonical drop-in 声明为 `qimao-worker@asr.worker.entry.js.service.d/override.conf`，effective ExecStart 由 reset 行加上 `/usr/local/bin/node --preserve-symlinks-main .../current/backend/dist/workers/asr.worker.entry.js` 组成。
- `--self-test` 离线通过 18 个门：5 个 regular portable entry、current symlink/junction、5 个独立 import、standalone direct-run、canonical drop-in 目录、3 个 EnvironmentFile 声明/effective ExecStart；另验证缺 drop-in、缺 provider 声明、入口静默时均以失败退出。
- 逐门记录均捕获 `exit/stdout/stderr`；正向门为 exit=0，import 输出 `loaded`，standalone 输出 `worker-ready`，stderr 为空。
- `node --check`、声明 JSON 解析、drop-in 渲染逐字 diff 通过；渲染临时文件已删除，确认不存在。
- 未连接服务器、未开网络、未读取 Secret/WAV、未调用 Provider、未启动 ASR/术语热词，未修改业务代码、package 或 lock。

## remaining_gap

- 本轮只完成发布声明与本地同构预检；没有执行 systemd、真实 release、服务器文件或真实环境文件核验。未来正式部署任务仍需在授权范围内复核实际主机的 drop-in 装载和 systemd effective ExecStart。
- Windows 本地 self-test 用 junction 表示 `current` 的目录链接；Linux 目标机的真实 symlink/systemd 语义仍需部署时验证。

## next_owner

SERVER：后续正式部署任务在取得明确 lease 后，使用该声明和预检器生成/核对唯一 Worker drop-in；不得另建发布流程。

## files

- `deploy/debian/worker-release.declaration.json`
- `deploy/debian/bin/worker-release-preflight.mjs`
- `docs/deployment/WORKER-RELEASE-SERVER-01A-RESULT.md`

## residual

- 本地仓库原有脏工作树保持不变；本轮只新增上述 `deploy/` 与 `docs/deployment/` 文件。
- self-test 和 drop-in 渲染产生的临时目录/文件均已清理；未产生服务器、Provider、COS、数据库或控制面残留。

## requires_user

none
