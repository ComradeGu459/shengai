# TERM-RELEASE-DELETION-AUDIT-SERVER-72

artifact_written: true
outcome: passed
requires_user: false

## 结论

目标 `/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1` 在审计结束时实际存在，未发现本时间窗内对该精确路径的删除。此前“目标消失”是权限假阴性，不是已证实的删除事件：

- root `stat`：`directory|root:qimao|750`，mtime=`2026-08-30 06:12:32.704825972 +0800`，ctime=`2026-08-30 06:12:32.776825972 +0800`。
- root `test -e`：exit=0；qimao-deploy `test -e`：exit=1。
- `namei -l` 显示 `releases` 为 `qimao:qimao 0750`，qimao-deploy 不能穿越；target 本身为 `root:qimao 0750`。
- target ctime 早于审计窗口，未见被删除后重建的时间证据。

因此唯一可证伪的“消失”来源是 SERVER-71 使用非 root 身份检查 root-owned `releases` 路径造成的不可见假阴性；没有可归因的 release 删除源。

## 审计范围与目录元数据

- 服务器本地时区：`Asia/Shanghai`（CST，`+0800`）。
- 时间窗：`2026-08-30 14:50:00–15:35:00`（服务器本地时间）。
- releases 父目录：`/opt/qimao-terms-cloud/releases`，`qimao:qimao 0750`，mtime/ctime 均为 `2026-08-30 15:10:25.483561049 +0800`。
- 一级子项只读取 name/type/mtime/ctime，共 39 项；未递归、未读取文件内容。相关项中，目标是普通 directory，元数据如上；未出现同名 target 的第二项。
- 当前链接：`/opt/qimao-terms-cloud/current` readlink 与 root realpath 均为目标路径，exit=0。
- static 链接：`/srv/qimao-terms-cloud/system-frontend` readlink 与 realpath 均为 `/srv/qimao-terms-cloud/system-frontend-term-provider-usage-20260830-r1`，exit=0。

## 运行服务基线

- health：HTTP 200。
- 四个生产 unit 均为 `ActiveState=active|SubState=running|NRestarts=0|ExecMainStatus=0`，cwd 均为目标 release：
  - `qimao-backend.service`，MainPID=630909
  - `qimao-worker@term-extraction.worker.entry.js.service`，MainPID=630921
  - `qimao-worker@system-control.secret-validation.worker.entry.js.service`，MainPID=631057
  - `qimao-worker@system-control.connection-test.worker.entry.js.service`，MainPID=631069
- 当前仍运行的 `rm`、`find`、cleanup 进程：0。

## systemd、timer、cron、tmpfiles

- loaded qimao/release/cleanup 相关项中有既有 `qimao-project-cleanup-worker.service`、runtime snapshot、upload 等服务；没有 65/67/70/71 对应的恢复/审计/发布 transient unit 处于 loaded/running。
- 相关 timer 只有既有 `qimao-runtime-snapshot.timer` 与 `qimao-htpdate-trial.timer`；没有 release 删除 timer。
- root 与 qimao-deploy 的 `crontab -l` 均 exit=1，未发现匹配 qimao/release/cleanup 或精确 releases 路径的 cron 规则。
- `systemd-tmpfiles --cat-config` 未发现精确 `/opt/qimao-terms-cloud/releases` 规则；唯一关键词命中是 `/etc/tmpfiles.d/screen-cleanup.conf` 的 `/run/screen` 规则，与 release 无关。

## 窗口日志与 65/67/69/70/71 对账

过滤条件仅保留精确 release 路径、相关 runner unit、`rm/find/mv/cleanup` 标签的安全行；未输出 Secret、env、载荷或对象信息。

- `14:51:26.045715`：`rm -rf` 只清理 `/var/tmp/qimao-term-current-baseline-audit-66-transfer`。
- `14:54:00.465258`：以 root 运行 67 checker，对目标做只读 manifest/archive 审计；不是删除。
- `14:55:42.297414`：`rm -rf` 只清理 `/var/tmp/qimao-term-current-baseline-audit-67-transfer`。
- `15:08:35.162697`：唯一匹配的发布 transient 启动为 `qimao-term-budget-fix-release-69.service`，参数含 `--collect --wait --pipe`。
- `15:08:35.197425`：69 unit started；`15:10:25.512006` 主进程以 `status=1/FAILURE` 退出，随后 systemd 标记 `exit-code`。
- 15:10 后的 journal 记录是 69 unit 的只读 `systemctl show`、status/文件存在性核对；没有 65/67/70/71 runner unit 的启动、collect 或删除记录。
- 窗口内没有匹配 `rm/find/mv` 删除精确 target 的安全日志行；没有可证明的延迟 trap/background 删除。

## 仓库部署脚本规则

对 `deploy` 下已部署脚本的只读搜索未发现删除精确 `/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1` 或 releases 根的规则：

- `qimao-project-cleanup-worker.service` 仅从 `/opt/qimao-terms-cloud/current/...` 启动 cleanup worker，不删除 release。
- `asr-isolated-synthetic-bootstrap.mjs` 的 cleanup 只删除调用方自有的临时 root，不触碰 release 根。
- `Invoke-TencentAsrSynthetic.ps1` 的 cleanup 只处理其声明的 database/remote root/COS/media 所有权，不包含 release target 删除。
- Nginx 使用规范 static 链接 `/srv/qimao-terms-cloud/system-frontend`，不提供 release 删除路径。

## residual / remaining_gap / next_owner

- residual：目标 release、current/static 链接、四 unit 与 health 均保持原状；无本片创建物或运行中的清理进程。
- remaining_gap：没有“删除事件”可供进一步归因；现有 journal 未提供任意 root-side `rm` 的完整系统调用审计。若未来再次出现真正缺失，应在事件发生前后立即以 root 记录精确 target 的 lstat、parent ctime 与 audit/journal 事件；本片未新增 audit 规则或观察 helper。
- next_owner：PLANNER；修正 SERVER-71 的身份检查解释，不把权限假阴性当成删除事实；若继续发布，应复用现存 target 并重新执行正式前门核对。
