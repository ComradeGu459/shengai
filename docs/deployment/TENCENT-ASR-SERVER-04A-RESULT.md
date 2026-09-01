# TENCENT-ASR-SERVER-04A

outcome: blocked-clean

## evidence

### 计数与停止点

- 构建尝试：`2`（第一次失败于非空 deploy 目标；第二次成功生成临时候选）。
- 实际临时候选：`1`；冻结候选 SHA/archive：`0`。
- 服务器部署：`0`；release/current、provider.env、drop-in、daemon-reload、ASR 启动：均 `0`。
- 官方 WAV 下载：`0`；COS Put/Head/GET、Tencent provider 调用、业务 API/DB/control-plane 写入：均 `0`。
- Tencent `CreateRecTask`：`0`。

### 声明与本地门

- `worker-release.declaration.json` 已冻结 `User=qimao`、`Group=qimao`、`/usr/local/bin/node --preserve-symlinks-main`，以及 backend/object-storage/provider 三份 EnvironmentFile。
- `worker-release-preflight.mjs` 的 drop-in 生成与检查现为 `EnvironmentFile=` reset 后接精确三份路径；本地 self-test 新鲜通过 `19` 门。
- 第二次 deploy 执行前目标目录、stdout、stderr 均不存在；stdout/stderr 位于目标外兄弟路径。命令 exit=`0`，dedicated lockfile 校验 `169` 项，安装闭包 `170` 包，stderr=`0` bytes。
- 真实临时候选的五个编译入口独立 import 全部通过：storage、ASR runtime、ASR Worker、app、server 均 `exit=0`、stdout=`loaded`、stderr 为空。
- current standalone 首个失败：`exit=1`，错误类为数据库连接拒绝，安全错误码 `ECONNREFUSED`，目标为本地 `127.0.0.1:55432`；首个项目栈帧为 `system-control.budget.service` 的事务读取路径（`system-control.budget.service.js:68`）。未绕过该真实启动门，也未将静态 import 通过误报为 Worker 健康。

### 第一与第二次构建差异

- 第一次：目标目录预先被创建且捕获文件位于目标内，pnpm 返回 `ERR_PNPM_DEPLOY_DIR_NOT_EMPTY`，exit=`1`，实际候选=`0`。
- 第二次：目标在命令开始前不存在，捕获文件在目标外；deploy 成功，随后真实五入口通过，但 standalone 因本地数据库不可达失败。该失败不是服务器、腾讯、COS 或业务 API 事实。

## remaining_gap

- 未完成 Linux 临时目录的 archive SHA/链接边界/Node 五入口门及 systemd verify/effective merge 门。
- 未冻结可部署候选 SHA，未部署 immutable release，未安装 provider.env 或 canonical drop-in，未启动 ASR Worker。
- 未验证生产 API→Worker→COS signed GET→一次 CreateRecTask→同一 TaskId Describe→completed，也未取得 cue/quality/4060ms、日志、预算 estimate/non-zero actual 证据。
- 当前失败的唯一可复验缺口是本地 dedicated deploy 候选 standalone 所需的 PostgreSQL `127.0.0.1:55432` 不可达；本轮禁止为此启动或创建数据库，也禁止第三次构建。

## next_owner

规划：关闭本次 04A/04A-R1 构建切片，重新评估是否需要另发任务卡。若继续，必须先明确独立、可审计的 standalone 预检数据库事实，并重新签发新的构建授权；不得把本轮临时候选或失败门当作可部署身份。

## files

- `deploy/debian/worker-release.declaration.json`
- `deploy/debian/bin/worker-release-preflight.mjs`
- `docs/deployment/TENCENT-ASR-SERVER-04A-RESULT.md`

## residual

- 第二次临时 deploy 目录、preflight harness、archive（未创建）及 stdout/stderr 捕获文件均已按已解析的系统临时目录边界删除；残留核对为 `0`。
- 服务器无写入：无 candidate release、current 切换、provider.env、drop-in、服务状态变化、WAV、COS 对象、Tencent task 或 synthetic 数据。
- 未修改业务源码、package、lock；既有脏工作树保留。未连接服务器，未读取 Secret/WAV，未调用 Provider。

## requires_user

`false`：本轮未产生新增权限、Secret、付费调用或外部资源变更；后续是否重新规划必须由规划决定，且不能复用本轮第二次构建机会。
