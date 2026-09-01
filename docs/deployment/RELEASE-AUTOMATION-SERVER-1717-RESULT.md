artifact_written: true

# RELEASE-AUTOMATION-SERVER-1717

## outcome

```yaml
outcome: local_fixed_entry_ready
slice_outcome: passed
remote_actions: 0
deployments: 0
transfers: 0
secret_reads: 0
business_source_changes: 0
requires_user: false
next_owner: 规划（部署风险独立审核；审核通过后另签安装/使用切片）
```

1714 的 gated migration 路径与 1642 的无迁移路径已收敛为同一个固定 root runner。后续发布不再生成或复制按任务命名的 runner，只提交严格 JSON 声明、归档、SHA 清单和可选迁移 helper。本轮只写本地部署资产和本文档，没有连接服务器、传输文件、读取 Secret、重启服务、切换链接、执行迁移或修改业务源码。

## 唯一公开入口

固定安装位置与唯一执行形态为：

```text
/usr/local/sbin/qimao-application-release /var/tmp/qimao-application-release-inbound
```

公开入口只有上述一个。`application-release-declaration.mjs` 是 runner 的内部声明校验器，不是第二发布入口。`deploy/asr-srt-compare-1642/runner.sh`、`deploy/screen-text-partial-release-1714/runner.sh` 及其他历史任务 runner 只用于审计，不得被新发布复制、改参或直接重放。

固定入口使用全局 `/run/lock/qimao-application-release.lock`，因此同一主机最多一个应用发布。runner 本身和声明工具必须分别安装为 `root:root 0750` 的普通非链接文件；runner 拒绝从其他路径执行。每轮在任何候选副作用前再次执行已安装 runner 的 `/bin/bash -n`、声明工具的 Node syntax/self-test、声明/SHA 文件集门。

## 每轮唯一输入

固定 inbound 必须为 `qimao-deploy:qimao-deploy 0700`、非链接目录，且只允许以下普通单硬链接文件：

| migration mode | 精确文件集 |
| --- | --- |
| `none` | `application-release.declaration.json`、`<release.id>.tar.gz`、`SHA256SUMS` |
| `gated` | 上述三件 + `db-migration-gate.mjs` |

`SHA256SUMS` 必须以 LF、无 BOM、lowercase SHA-256、两个空格和安全 basename 编码，且文件集合与声明逐项相等；声明自身也必须在 SHA 清单中。固定 runner/校验器不进入每轮 inbound，也不能由发布批次覆盖。

声明模板为 `deploy/debian/application-release.declaration.example.json`，schema 固定为 `qimao.application-release/v1`：

- `release.id` 只接受安全 slug，并唯一派生 archive、`/opt/qimao-terms-cloud/releases/<id>` 与 `/srv/qimao-terms-cloud/frontend-<id>`；声明不能自定义候选根目录。
- `previousBackendTarget` 与 `previousStaticTarget` 是执行前必须逐字匹配的回滚基线；不得扫描目录猜旧版本。
- `runtime.preservedUnits` 冻结 ASR、screen-text 与 OpenVINO 的完整 `ActiveState/SubState/NRestarts/ExecMainStatus`，发布前后必须保持一致。
- `candidate.staticMarkers` 为 1–8 个受控无控制字符 marker；必须全部存在于候选员工静态资产。
- `candidate.unauthenticatedProbe` 只允许本机 `/api/` GET 路径；发布后固定要求 `401 + application/json + non-HTML`。
- `migration.mode=none` 走 1642 型无迁移路径；`migration.mode=gated` 还必须声明固定 helper 名和单一 schema 身份。
- 未知字段、路径穿越、绝对候选路径自定义、重复 marker、不安全 API 路径、额外 SHA 成员和多余 inbound 文件均在副作用前阻断。

gated migration 的声明差量只有：

```json
{
  "migration": {
    "mode": "gated",
    "helper": "db-migration-gate.mjs",
    "schema": "1754976034000_add_partial_screen_text_release"
  }
}
```

helper 合同固定：`--self-test` 必须只输出 `helper_self_test=passed`；`--before` 必须只输出 `db_gate=before passed pending=<schema>`；`--after` 必须只输出 `db_gate=after passed schema=<schema>`。退出 0 但输出身份不匹配同样失败，防止声明与 helper 冻结不同迁移。

## 单一路径机器门

1. **固定入口与输入身份**：root、固定安装路径、root-owned runner/tool、固定工具、全局锁、inbound owner/mode/硬链接数、严格声明和闭合 SHA 集合全部通过后，runner 才接管 inbound。
2. **生产基线**：`current`/员工 static 必须逐字命中声明的旧目标；新 release/static、stage、next、runtime 必须 absent；backend 为 active/running 且退出 0；三个保留 unit 命中声明；health、员工根页与 ASR 深链均为 200。
3. **归档与候选**：archive 只允许 `backend/`、`static/` 两个顶层，无绝对、`..`、反斜杠或重复成员；成员类型只允许 regular/directory/symlink/hardlink，链接必须留在同一顶层且目标存在。release 保持 `backend/dist/...` 布局。五个真实 Node 入口通过 syntax 与 qimao 可读门，固定六项 import 通过，static index/assets 和全部声明 marker 通过。
4. **无迁移切换**：`none` 一次形成 final backend/static，再分别用 `.next + mv -Tf` 切换 current/static；只重启 backend。
5. **gated migration**：任何链接切换前以 systemd 原生 `EnvironmentFile`、qimao 身份运行 helper `--before`；只先切 current，旧 backend PID/状态保持；单次运行候选 `dist/database/migrate.js`，再以 helper `--after` 对账同一 schema；通过后才切 static 并只重启 backend。shell 不 source、eval 或输出环境值。
6. **发布后门**：backend 必须 `active/running/0/0` 且 PID 5 秒稳定；三个保留 unit 与旧状态逐字相等；health、未认证 API JSON 门、员工根页/深链通过。
7. **终态清理**：成功时删除 inbound、runtime、stage 与 next，保留新 immutable release/static；不删除旧回滚目标。

## 自动回滚与 unknown

- 任一受控门失败由同一 runner 处理；只有链接仍指向声明候选时才恢复声明旧目标，避免覆盖未知并发状态。
- 只有已尝试 backend restart 才重启恢复后的旧 backend 并等待 health；未重启前失败不会制造额外重启。
- runner 只删除五类精确派生对象：固定 runtime、当前 release/static stage、当前新 release/static；其他路径一律 `cleanup_refused`。
- `migration.mode=none` 的 DB 写固定为 0。gated migration 启动前 `schema_retained=unknown`，命令成功且身份输出对账后才改为声明 schema；后续失败恢复代码链接和 backend，但保留向后兼容 schema，不自动执行 down。
- rollback/cleanup 任一失败必须输出 `rollback_or_cleanup=failed`；不得自动重放、扫描 release 猜状态或现场补目录。
- runner 不启动/重启 ASR、screen-text、OpenVINO，不调用 Provider，不写 COS/route/budget，不发业务 POST。

## 一次性安装前门（本轮未执行）

安装属于另一个有平台执行门的服务器切片。审核者先在本地/审核 Linux 核对本文冻结身份，再只安装两个固定文件：

```text
bash -n deploy/debian/bin/qimao-application-release
node --check deploy/debian/bin/application-release-declaration.mjs
node deploy/debian/bin/application-release-declaration.mjs --self-test
install -D -o root -g root -m 0750 deploy/debian/bin/qimao-application-release /usr/local/sbin/qimao-application-release
install -D -o root -g root -m 0750 deploy/debian/bin/application-release-declaration.mjs /usr/local/libexec/qimao-application-release-declaration.mjs
```

安装后只读复核目标 bytes/SHA/owner/mode、再次运行 Bash/Node 门，并确认固定 inbound/runtime/lock 当前无活动；该切片不得顺带执行真实发布。后续真实发布由规划作为唯一执行桥消费已审核 payload，并在外部动作发生时接受平台一次强制确认。

## frozen local artifacts

| artifact | bytes | SHA-256 |
| --- | ---: | --- |
| `deploy/debian/bin/qimao-application-release` | 26,672 | `6b2097610b50dfbb4ad9dd26b95ba8d375ded4fc87c8994ba0aaa69da2ceabbb` |
| `deploy/debian/bin/application-release-declaration.mjs` | 11,469 | `4f064446c09ce40f4b27f980620377d25d813782d0ce237d72694c8a7ef3c3c3` |
| `deploy/debian/application-release.declaration.example.json` | 810 | `9acb2b3fc8dbc2ce85b5376125424aa1397d02ab21d60b52714668f932f1dfcd` |

## local evidence

- Node `v24.19.0`：声明工具 `node --check` exit `0`；`--self-test` 输出 `{"outcome":"passed","cases":10,"schema":"qimao.application-release/v1"}`；示例声明 `--validate` 输出 passed。
- Git Bash `5.2.37`：固定 runner `bash -n` exit `0`；非 root 实执行只输出 `ROOT_REQUIRED effects=0 inbound=retained` 并以 `64` 退出。
- 内嵌 Python archive gate 通过 compile；对 1714 冻结 archive 的本轮只读实审为 `14919` members、`11348` regular、`2190` directories、`476` symlinks、`905` hardlinks，链接闭包门通过。
- 三个部署资产均为 LF、CR bytes=`0`、UTF-8 BOM=`false`。
- 静态边界：无 SSH/SCP/服务器地址；无 `source`、`eval`、`set -a`/`set +a`；唯一服务写命令为 `systemctl restart qimao-backend.service` 的前向一次和必要回滚一次；无 service start、Provider/COS/route/budget 或业务写命令。

## remaining_gap

- 固定入口尚未安装到测试服务器，也未在 Debian root/qimao、真实 systemd/tar/curl 环境执行 fixture；本轮不能把本地 syntax/self-test 写成远端运行通过。
- 本轮没有形成下一业务 release payload，也没有上传或发布。后续先由规划做部署风险独立审核，再另签“只安装固定入口”或“消费已安装入口”的精确切片，二者不得在未审核时合并。

## residual

本轮没有服务器、传输、Secret、数据库、服务、链接、Provider、COS、route、budget 或业务源码副作用。工作区只新增固定 runner、声明工具、示例声明和本结果文档，并更新 `deploy/README.md` 入口索引；既有脏树与历史 runner 原样保留，未 reset、checkout、clean、stash、提交或推送。

## 1718 固定入口安装与独立验收

```yaml
outcome: installed_and_read_only_verified
slice_outcome: passed
review: SERVER independent read-only
release_execution: 0
service_restarts: 0
secret_reads: 0
current_or_static_switches: 0
requires_user: false
next_owner: 规划
```

1718 已由规划按唯一执行桥完成两个固定文件的原子安装；SERVER 随后只通过既有 SSH/root 只读通道独立验收，没有调用 `qimao-application-release`、没有创建发布 inbound、没有执行迁移或读取任何环境文件。

### installed identity

| target | bytes | SHA-256 | identity |
| --- | ---: | --- | --- |
| `/usr/local/sbin/qimao-application-release` | 26,671 | `96730a2c14951968afedfbc83aa14f570076c96d8a6b45f9ed9a259c1d8e3ee9` | regular file、links=`1`、`root:root 0750` |
| `/usr/local/libexec/qimao-application-release-declaration.mjs` | 11,469 | `4f064446c09ce40f4b27f980620377d25d813782d0ce237d72694c8a7ef3c3c3` | regular file、links=`1`、`root:root 0750` |

远端 runner bytes/SHA 与本地 1717 冻结身份逐字一致，`/bin/bash -n` 通过；validator bytes/SHA 同样逐字一致，Node `--check` 通过，`--self-test` 精确输出 `{"outcome":"passed","cases":10,"schema":"qimao.application-release/v1"}`。

### zero-effect evidence

- 安装 staging `/var/tmp/qimao-application-release-install-1718` absent。
- 发布路径 `/var/tmp/qimao-application-release-inbound`、`/run/qimao-application-release`、`/run/lock/qimao-application-release.lock`、两个 `.next` 链接全部 absent。
- current 仍为 `/opt/qimao-terms-cloud/releases/screen-text-partial-release-20260901-r1`；员工 static 仍为 `/srv/qimao-terms-cloud/frontend-screen-text-partial-release-20260901-r1`。
- backend=`active/running/0/0`、PID=`866078`；ASR=`active/running/0/0`、PID=`694703`；screen-text=`inactive/dead/0/0`、PID=`0`；OpenVINO=`active/running/0/0`、PID=`842128`。
- 上述四个 PID、状态与 SERVER 保存的 1718 安装前基线逐字一致，故 `service_restarts=0`；current/static 与发布临时路径同样未变，故 `release_execution=0`。

1717 中“固定入口尚未安装”的 `remaining_gap` 是当时本地候选的历史状态，现已由 1718 关闭。真实业务 release payload 仍需另行冻结、审核并由规划通过这一固定入口执行；本验收不构成任何应用发布。

## 1722-R1 Debian `runuser` 路径修正

1722 首次真实消费固定入口时在任何候选副作用前以 `FIXED_TOOL_MISSING` 停止；Debian 的固定 `runuser` 路径为 `/usr/sbin/runuser`，而 1717 源码错误写成 `/usr/bin/runuser`。R1 只修正这一处绝对路径，没有修改声明校验器、1721 候选四件套、业务源码或其他 runner 行为。

修正后的本地固定 runner 身份为 26,672 bytes / `6b2097610b50dfbb4ad9dd26b95ba8d375ded4fc87c8994ba0aaa69da2ceabbb`。上方 1718 installed identity 保留当时真实远端验收身份 `96730a2c...d8e3ee9`，不得改写为新身份；R1 未执行 SSH/SCP、安装或发布，因此新本地身份尚未安装，后续必须由规划在独立平台执行门中原子更新并复核后才能重放应用发布。
