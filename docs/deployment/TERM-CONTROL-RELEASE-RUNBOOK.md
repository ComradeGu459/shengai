# 术语控制面唯一发布 Runbook

状态：`completed / passed`
冻结日期：2026-08-29
适用候选：`term-control-server-122a-20260829-r1`
执行权限：用户已授权规划对原目标内、可回滚且不扩大风险边界的修正自动续推；规划已审核并签发修正版的一次正式 SERVER lease。

首次执行结果：`TERM-CONTROL-RELEASE-01-RESULT.md`。唯一首因为 runner 调用了未列入传输输入的 `db-baseline.mjs`；生产写入、迁移、服务变更与外部调用均为 0，staging 已清理。修正版删除该额外 helper，并把数据库事实收敛到现有事务迁移入口。

第二次执行结果：`TERM-CONTROL-RELEASE-02-RESULT.md`。本机身份/语法门在 SSH 前停止，唯一首因为 `Assert-NoCr` 错误扫描二进制 archive；archive bytes/SHA 未变，远端与生产动作均为 0。后续 CR/LF 门只适用于生成的文本脚本，不扫描任何 payload。

第三次执行结果：`TERM-CONTROL-RELEASE-03-RESULT.md`。唯一 SCP 成功，远端 runner 在生产 Step 0 前以 `PROVIDER_INPUT_INVALID` 停止；唯一首因为 PowerShell `WriteLine` 写出 CRLF，远端 Bash `read` 只去掉 LF 后残留 CR。后续 provider stdin 固定为 UTF-8 无 BOM 原始 byte[] + 单个 LF，并直接写 `StandardInput.BaseStream`，不再经过平台文本换行。

第四次执行结果：`TERM-CONTROL-RELEASE-04-RESULT.md`。raw-LF 与 Step 0/1 通过，Step 2 以遗留 `qima` 身份读取 `root:qima` staging 失败；生产写入仍为 0。随后 `TERM-CONTROL-IDENTITY-AUDIT-05-RESULT.md` 用一次只读 SSH 证明四个目标 unit 和当前 release 唯一使用 `qimao:qimao`/`root:qimao`，而 `qima` 对同一范围全部不可达。发布身份因此冻结为 `qimao:qimao`，不得双轨兼容。

最终执行结果：`TERM-CONTROL-RELEASE-06-RESULT.md`。同一冻结候选以 canonical `qimao:qimao`、raw-LF provider stdin、一次 SCP 和一次 runner 完成迁移、原子 release/static、四 unit 与 health/API/static；四 unit 均 active/running、`NRestarts=0`，staging 清零。发布阶段未创建 engine/route/run，也未调用 DeepSeek/COS/Tencent；真实业务验收属于后续独立 TEST 切片。

## 1. 结论与非目标

当前没有证据表明术语控制面业务代码失败。122A-R1 已用 pnpm 11.21.0 官方 non-legacy `deploy` 生成自包含闭包，并通过本机与 Linux 五入口、11-gate、归档链接边界和 607 项 payload 身份门。122B 至 R6 均在 provider、迁移、release、static、systemd 和外部调用之前停止；失败集中在发布脚本的编码、参数、身份、验证器和诊断 harness。

本文只收敛现有候选的唯一发布顺序，不重构业务、不创建新平台、不重建候选、不调用 DeepSeek/腾讯/COS、不创建 engine、route、run 或其他业务事实。真实供应商 synthetic 必须等部署通过后另行进行一次。

## 2. 失败分层复盘

| 已发生事实 | 直接原因 | 分层裁决 | 本 Runbook 的处置 |
| --- | --- | --- | --- |
| 121 首次 Linux 脚本报 `$'\r'` | Windows CRLF 进入 Bash | 纯发布编排 | 只允许一个文件化 LF runner；本机 CR byte=0、远端 `bash -n` 后才执行 |
| 121 报告曾怀疑 `process.argv[2]` | Node 24 同构探针证明 stdin 模式参数确在 `[2]` | 错误归因，不是故障 | 不再改 argv 语义；禁止 stdin Node 片段，检查器使用文件和命名参数 |
| R4 本机 helper 首轮未执行 | PowerShell 参数名 `$Args` 与自动变量冲突 | 纯发布编排 | runner 不使用 PowerShell 自动变量名；参数在本机先做 AST/实际值输出 |
| 121-R1 找不到 `candidate.tar.gz` | SCP 保留长 basename，而远端脚本读取固定短名 | 纯发布编排 | SCP 目标显式写为固定远端文件名；传后同时核对 basename、bytes、SHA |
| 121-R2 隔离 import 缺 AWS 包 | 旧候选不含依赖闭包，预检却假设自包含 | 候选打包合同缺口，不是业务代码 | 旧 121 候选永久废弃 |
| 121-R3/R4 拼旧 `node_modules` | 把旧 release 闭包与新代码混合，app 最终不能加载 | 发布方案错误；不可复现，不是业务缺陷证据 | 永久禁止复制或拼接旧 current/node_modules |
| 122A scoped filter 被拆错 | 嵌套 PowerShell 未把 scoped package 当作单一 argv | 纯本机构建编排 | 唯一命令固定引用 `@qimao-terms-cloud/backend`；当前候选不再重建 |
| 122B 初次 Node check 找不到 staging 文件 | deploy 私有 staging 尚未完成 owner/mode 装配就切服务身份 | 纯发布编排 | 任何非 deploy 身份访问前先一次性规范化 staging 父目录和输入文件 |
| R1/R2 `find -exec test ... {} +` 失败 | `{}` `+` 一次传入多个路径，而 `test -x/-r` 是单路径一元判断 | 权限验证器错误 | 永久删除该门 |
| R3 qima-find 返回 1 | 扫描 stderr 未结构化保留，结果不能绑定具体路径 | 诊断证据缺口 | 永久删除 qima-find predicate 门 |
| DIAG4 | archive predicate 变量复用了 fixture 命令；标签失真 | 诊断 harness 错误 | 不复用该分支；只保留其独立逐路径真值 `dir_false=0/file_false=0` |
| DIAG5 | 无特权 `qimao-deploy` 试图创建 `root:qima` 夹具 | 诊断 harness 身份错误 | 不再建立权限夹具 |
| DIAG6 | 多层 shell 引号截断 | 诊断 harness 引号错误 | 禁止嵌套 inline shell；只执行单一文件化 runner |
| R4 archive SHA 比较失败 | `.sha256` 首 token 含 UTF-8 BOM；直接传输 bytes/SHA 实际一致 | 发布元数据解析错误 | `.sha256` 只作审计附件；runner 直接比较冻结 literal，不解析该文件 |
| R5 逐路径门退出 60 | 只规范化解包树和清单，遗漏 SCP 外层 staging 的 0700 父目录 | 纯发布顺序/身份错误 | staging 父目录先设为已冻结 owner/group/mode，再做任何子路径检查 |
| R6 `archive_members_links` 退出 66 | `realpath "$link/../$target"` 会先跟随 link，再处理 `..`，偏离 `dirname(link)+target` | 归档验证器错误 | 不再远端重复扫描相同 archive；冻结 SHA 直接复用 122A 已通过的链接证据 |
| RELEASE-02 `CR_BYTE_PRESENT` | 文本 LF 断言误扫二进制 `.tar.gz`，把合法 payload 字节当作脚本换行错误 | 本地发布验证器范围错误 | CR/LF 只扫描生成的 `.ps1/.sh/.mjs`；archive、manifest、SHA 附件和其他 payload 仅做 bytes/SHA |
| RELEASE-03 `PROVIDER_INPUT_INVALID` | PowerShell `WriteLine` 默认 CRLF；Bash `read` 去 LF 后保留 CR | 本地到远端 stdin 编码边界错误 | 用 UTF-8 无 BOM编码生成 raw byte[]，末尾只加 `0A`，经 `StandardInput.BaseStream` 写入并关闭；禁止文本换行 API |
| RELEASE-04 `QIMAO_STAGE_READ_FAILED` | runner 误沿用遗留 `qima:qima`，而四个目标 unit 与生产路径实际为 `qimao:qimao`/`root:qimao` | 发布身份代际漂移 | bootstrap=`qimao-deploy`；business=`qimao:qimao`；staging/release=`root:qimao 0750/0640`；遗留 qima 禁止参与或 fallback |

唯一候选问题是旧 121 包缺少自包含依赖闭包；它已被 122A-R1 替代。122A-R1 之后没有业务代码或依赖闭包失败证据。

## 3. 冻结输入与可复用证据

### 3.1 本地三件套

| 文件 | bytes | SHA-256 | 用途 |
| --- | ---: | --- | --- |
| `C:\Users\ComradeGu\Documents\七猫兼职\term-control-server-122a-candidate-20260829-r1.tar.gz` | 9,417,436 | `c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5` | 唯一发布 payload |
| `C:\Users\ComradeGu\Documents\七猫兼职\term-control-server-122a-candidate-20260829-r1.manifest.json` | 115,768 | `48cc60997ee4d52ae700e2eab879ab31a6c07f421796a2565f8721d95feef961` | 607 项来源清单 |
| `C:\Users\ComradeGu\Documents\七猫兼职\term-control-server-122a-candidate-20260829-r1.sha256` | 251 | `e5d778dcf37f4ec73256c1b17267c69176685029bd69c34a6ca9a20575124843` | 只读审计附件；前三字节为 `EF BB BF`，不得作为 runner 信任输入 |

本轮规划已重新读取上述三件套并复算 bytes/SHA，结果与表格一致。

### 3.2 候选合同

- Node=`24.19.0`，pnpm=`11.21.0`。
- 构建合同：`pnpm --offline --config.inject-workspace-packages=true --filter '@qimao-terms-cloud/backend' deploy --prod <target>`；禁止 `--legacy`。
- 闭包：170 包，`reused=170/downloaded=0`；archive members=14,842，relative symlinks=476，external/absolute/missing=0；manifest files=607。
- 官方依据：[pnpm deploy](https://pnpm.io/cli/deploy) 明确目标目录应包含隔离 `node_modules` 并可直接复制到服务器运行；legacy 路线存在已公开的闭包/外链问题：[pnpm#9550](https://github.com/pnpm/pnpm/issues/9550)、[pnpm#13618](https://github.com/pnpm/pnpm/issues/13618)。
- 仓库证据：`TENCENT-ASR-RUNTIME-AUDIT-03J-RESULT.md` 已证明“内部 Junction → 相对 POSIX symlink tar”可移植；`LOCAL-OCR-SERVER-05G-R5B-RESULT.md` 已证明 `/usr/local/bin/node --preserve-symlinks-main`、原子 drop-in、稳定 PID/NRestarts 门可用；`BACKEND-LINUX-RUNTIME.md` 与 `FRONTEND-STATIC-DELIVERY.md` 已冻结 current/static 软链接原子切换与回滚方式。

### 3.3 唯一远端身份

- SSH 只使用既有保存 alias 和 `qimao-deploy`；不在 runner 中拼主机、密钥或密码。
- canonical business identity 唯一为 `qimao:qimao`：四个目标 unit 的 effective User/Group、仓库 backend/worker unit、当前 release 与 05D/05R 成功证据完全一致。遗留 `qima:qima` 不得用于任何读取门、迁移、Worker、release owner 或 fallback。
- 固定 staging：`/tmp/qimao-term-control-release-final`。
- 固定 backend release：`/opt/qimao-terms-cloud/releases/20260829-term-control-122a-r1`。
- 固定管理员静态目标：`/srv/qimao-terms-cloud/system-frontend-20260829-term-control-122a-r1`。
- 四个目标 unit：`qimao-backend.service`、`qimao-worker@term-extraction.worker.entry.js.service`、`qimao-worker@system-control.secret-validation.worker.entry.js.service`、`qimao-worker@system-control.connection-test.worker.entry.js.service`。
- upload-completion、screen-text、project-cleanup、ASR/OCR 和员工站均不属于本次变更；只允许终态只读核对，不重启、不重装。

## 4. 执行预算

整次发布只允许一次本地冻结输入核对、一次显式 SCP 批次、一次远端 root runner。正常路径最多五个服务器写入阶段：

1. 临时 staging 创建与输入传输；
2. root-only `provider.env` 原子安装；
3. 一次数据库迁移；
4. immutable backend release、管理员静态目录和两个 current 软链接原子切换；
5. 四份现有 unit 的精确 drop-in、一次 daemon-reload 和一次启动/重启。

失败时只额外允许一次回滚/精确清理阶段。禁止第二 runner、第二 staging、第二 archive、第二候选、并行路线或现场补丁。

## 5. 唯一执行顺序

### Step 0：只读运行基线冻结

- 输入：current/backend/static symlink、四 unit 的 `User/Group/EnvironmentFiles/ExecStart/ActiveState/UnitFileState/NRestarts`、既有 provider.env 是否存在及其 metadata。
- 成功证据：所有事实写入一个脱敏 baseline；不读取 env 内容。候选目标路径和 staging 均 absent；Node 精确为 `/usr/local/bin/node v24.19.0`。
- 失败唯一动作：停止并回规划；服务器写入=0。
- 禁止：修用户/组、chmod、改 sudoers、改 unit、重启或为通过门创建新身份。

### Step 1：本地候选与 runner 门

- 输入：3.1 的三件套；一个由 SERVER 文件化生成的 LF runner；现有 `worker-entry-import-probe.mjs`。
- 成功证据：archive/manifest/sha 附件只核对 bytes/SHA；CR/LF 扫描仅覆盖本轮生成的 `.ps1/.sh/.mjs` 文本脚本且 CR byte=0；provider stdin 本机 byte[] 门证明 UTF-8 无 BOM、末字节=`0A`、全体不含 `0D`；PowerShell AST/Bash syntax/Node checker syntax 全部通过；SCP 三个目标 basename 已固定。
- 失败唯一动作：删除本轮本地临时 runner，返回规划；不得重建 archive。
- 禁止：对 archive、manifest、SHA 附件或任何二进制 payload 运行文本 CR/LF 断言；`pnpm install/deploy`、复制旧 node_modules、stdin Node、inline 多层 shell、`$Args` 参数名。

### Step 2：传输身份门

- 输入：固定 staging 和显式远端名 `candidate.tar.gz`、`candidate.manifest.json`、`candidate.sha256.audit`、`release-runner.sh`。
- 成功证据：传输后由 root 将 staging 父目录规范为 `root:qimao 0750`，输入/runner 规范为 `root:qimao 0640` 且非 world-writable；canonical `qimao:qimao` 对父链可穿越、对输入可读；随后实际 archive basename、bytes=9,417,436、SHA=`c039…d016d5`，manifest bytes=115,768、SHA=`48cc…ef961`。
- 失败唯一动作：只删除固定 staging并复核 absent；返回 `phase/exit/实际 basename/bytes/SHA/安全 stderr`。
- 禁止：读取 `.sha256` 首 token、模糊 glob、让服务身份在父目录规范化前访问文件。

### Step 3：解包、身份与真实入口门

- 输入：已验证 archive；Step 0 冻结的四 unit `User=qimao/Group=qimao`；122A 已通过的 11-gate probe。
- 成功证据：tar 解包成功；候选树固定为 `root:qimao`、目录 0750、普通文件 0640；canonical `qimao:qimao` 能穿透候选并读取五个真实编译入口，完整 11-gate 全部 `exit=0/loaded`；管理员静态 4 项与 manifest bytes/SHA 一致。
- 复用证据：相同 archive SHA 已在 122A Linux 门证明 14,842 members、476 relative symlinks、external/absolute/missing=0，故本次不再运行 `archive_members_links` 全量扫描。
- 失败唯一动作：只删除固定 staging并复核 absent，带回失败的 unit 身份、入口、exit 和安全 stderr；不得改权限再试。
- 禁止：调用遗留 `qima`、增加 qima/qimao fallback、放宽为 0755/0644；`find -exec test {} +`、qima-find predicate、全树逐路径清单、链接 `realpath` harness、旧依赖 overlay。

### Step 4：Secret 写入边界

- 输入：用户已授权的本地 Secret 来源；BACK-120 的 `QIMAO_TERM_PROVIDER_SECRETS_B64` 严格 schema；既有 provider.env baseline。
- 传输边界：本地只在内存构造 `QIMAO_TERM_PROVIDER_SECRETS_B64=<base64>`，用 `UTF8Encoding(false)` 生成 raw byte[]，仅追加一个 `0A`，断言末字节=`10` 且不含 `13` 后直接写入 SSH 进程的 `StandardInput.BaseStream` 并关闭。不得使用 `WriteLine`、默认 `NewLine`、管道字符串或命令参数。
- 成功证据：Secret 只在本地内存派生并经 stdin 进入 root 临时文件；远端以 `root:root 0600` 原子安装 `/etc/qimao-terms-cloud/provider.env`；只记录 metadata、文件 SHA 和已配置候选数量，不记录值、Base64、SecretId 或请求载荷；四 drop-in 只引用该 EnvironmentFile。
- 失败唯一动作：恢复旧 provider.env 或删除本轮新文件，删除临时文件，停止并回规划。
- 禁止：SCP 明文 env、命令行参数携带值、`echo`/日志/报告输出、服务用户直接读取文件、调用 Provider。

### Step 5：数据库迁移

- 输入：候选自己的 `backend/dist/database/migrate.js` 和 migrations；受保护 `backend.env`。该现有入口已固定 `checkOrder=true`、`singleTransaction=true`，不再引入 DB baseline helper 或第二查询脚本。
- 成功证据：迁移入口只运行一次且 exit=0；node-pg-migrate 输出只包含冻结候选中的待执行项，至少覆盖已审核的术语增量迁移 `1754976029000`、`1754976030000`、`1754976031000`、`1754976032000`；没有 bootstrap/default 业务数据。
- 失败唯一动作：不切 current/static、不启动新 unit；由 `singleTransaction=true` 保持本次迁移原子回滚，恢复 provider.env并返回精确失败 migration。不得自动执行 down。
- 禁止：`db:setup`、bootstrap/default 数据、第二次 migrate、drop/truncate、隔离库替代生产迁移。

### Step 6：immutable release 与管理员静态原子切换

- 输入：已通过 Step 3 的解包树；冻结 release/static 目标；Step 0 保存的旧 current/static target。
- 成功证据：新 release/static 均为全新目录且内容身份与候选一致；先生成 `current.next`/`system-frontend.next`，再分别 `mv -Tf` 原子替换；切换后两个 symlink 精确指向冻结新目标，旧目标保留可回滚。
- 失败唯一动作：把两个 symlink 都恢复到 baseline，删除仅本轮创建且未被引用的新目录，恢复 provider.env，停止。
- 禁止：覆盖旧 release、原地覆盖静态文件、修改员工站、删除历史 release、半切换后继续。

### Step 7：四 unit 一次启动

- 输入：四份文件化 drop-in；`/usr/local/bin/node --preserve-symlinks-main`；provider EnvironmentFile；baseline active/enabled 状态。
- 成功证据：drop-in 以 root 所有、受控 mode 原子安装，`systemd-analyze verify` 和 effective `ExecStart/EnvironmentFiles` 精确匹配；只执行一次 daemon-reload；backend restart，一次启动 term/secret/connection 三 Worker；30 秒窗口内四 unit active/running、MainPID 稳定、`NRestarts` 增量=0、ExecMainStatus=0。
- 失败唯一动作：停止新 Worker，恢复四 drop-in、旧 current/static/provider.env 和 baseline active/enabled 状态，daemon-reload 一次并核对旧 backend 恢复。
- 禁止：改基础 unit 模板、改变 Restart 策略、reset-failed 掩盖计数、逐个修 Node 路径后重试。

### Step 8：health、API 与静态回归

- 输入：新 current/static 与四 unit。
- 成功证据：本机 `/health`=200 且 `status=ok`；未认证员工 API 保持 401 JSON；受保护管理员 API 保持基线鉴权状态且不是 HTML 假 200；管理员 `/engines` 深链和根页面 200，4 个静态条目 hash/MIME 正确；旧 upload/OCR/ASR Worker 状态与 baseline 相同。
- 失败唯一动作：执行 Step 7 的同一回滚，保留安全 requestId/status/content-type 和 unit 日志窗口，停止。
- 禁止：创建 engine/route/run、调用 DeepSeek/COS/Tencent、浏览器重复 POST、用 mock 或静态 200 代替 API。

### Step 9：终态与清理

- 成功：只删除固定 staging、临时 runner 和传输副本；保留新 release/static、provider.env、四 drop-in、已应用迁移和旧回滚目标。交付 `outcome/evidence/remaining_gap/next_owner/files/residual/requires_user`。
- 失败：完成唯一回滚后删除固定 staging和本轮未引用目录；报告旧 current/static/provider/unit 状态、迁移事实和 residual。不得在同一任务继续下一轮。

## 6. 硬停止条件

1. Step 0–3 任一发布前门再失败一次，即判定 `release_preflight_failed`：当前 SERVER 尝试必须停止，不得在同一回合修改 runner 后重放或新增诊断 harness；只回规划，给出失败阶段、命令标签、exit、stdout/stderr、实际值和 residual。规划完成根因复盘后，只有原范围内的唯一修正才可另签下一切片。
2. Step 4–8 任一生产写入后失败，只允许同一 runner 的既定回滚和清理；回滚完成即结束任务，不现场修补。
3. 候选 archive/manifest 身份变化、待迁移集合不符、实际 unit 身份无法读取候选、或旧回滚目标缺失，均视为输入失效；必须重新规划，不能自动选择替代路径。
4. unknown 外部写结果仍遵循项目总规则，只查询同一稳定身份；本发布本身不包含任何外部业务写命令。

## 7. 解冻后的最小任务卡

规划按用户持续主管授权只向现有固定 SERVER 发送一张任务卡：消费本文修正后的冻结三件套和五个写入阶段，执行一次；Step 0 不再创建或调用 `db-baseline.mjs`，数据库事实只由 Step 5 的现有事务迁移入口给出。任一门失败仍按第6节停止并回规划。SERVER 不修改业务源码，只允许固定 staging、release/static、provider.env、四 drop-in、迁移与既定回滚/清理路径。

本修正版已解冻；除本次正式 lease 外不得产生第二个并行 SERVER 动作。
