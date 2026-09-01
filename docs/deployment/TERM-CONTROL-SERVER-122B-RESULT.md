# TERM-CONTROL-SERVER-122B 结果

## outcome

`blocked`。本轮在远端预检的 Node24 文件语法门停止，未进入候选解包、11-gate、provider、迁移、release、static 或 systemd 发布。

## candidate / local gates

- archive regular-file：通过；bytes=`9417436`
- archive SHA-256：通过；期望 `c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`
- manifest SHA-256：通过；期望 `48cc60997ee4d52ae700e2eab879ab31a6c07f421796a2565f8721d95feef961`
- manifest file count：`607`
- system-frontend static entries：`4`
- Secret schema 门：通过；仅在本机内存读取，未回显、未上传、未写入 provider.env
- 本机未复制旧 current/node_modules，未改 candidate、业务代码、lock 或 workspace

## remote phases

- staging create：通过；固定 `/tmp/term-control-server-122b-r1`
- explicit uploads：已传入 candidate archive、candidate manifest/SHA、文件化检查脚本和四个 drop-in；未进入部署目标路径
- script CR 门与 `bash -n`：未见失败输出
- Node24 `--check`：失败，exit=`1`；安全错误类=`MODULE_NOT_FOUND`
- 失败命令阶段：对 staging 中的临时 `manifest-check.mjs` 执行 Node24 语法检查时，以 `qimao` 身份访问尚未完成 qima 穿透权限装配的 staging，返回找不到模块
- archive SHA、tar member=`14842`、relative symlink=`476`、manifest 607 文件远端验证、11-gate import：未到达
- provider、migration、current/static switch、drop-in、systemd、health、protected API、admin deep-link：未到达

## unique first cause

本轮唯一首因是预检编排顺序错误：远端 staging 初始为 qimao-deploy 私有目录，Node24 语法检查却先以 qimao 运行；因此在候选验证前得到 `MODULE_NOT_FOUND`。这不是候选 SHA、业务源码或服务器依赖结论。按 122B 停止条件未重传、未修补、未继续执行。

## actions / production baseline

- SSH/SCP：仅用于本轮固定 staging 的创建、文件传输、预检命令、残留核对与删除
- provider.env：未安装或读取远端内容
- database migration/write：`0`
- release/current/static/unit/systemd：未修改
- DeepSeek、COS、Tencent：`0`
- 生产 current、生产 DB、控制面、公网路由：未修改

## cleanup / residual

- remote staging：已精确删除并复核 `absent`
- remote release/static/provider/drop-in：未产生
- local temporary work directory：已精确删除并复核 `absent`
- candidate trio：保留；未重建、未覆盖
- `cleanup_errors=0`

## remaining_gap / next_owner / requires_user

- remaining_gap：需要规划决定是否开启新的执行轮次；本轮不自动重试，不把编排门失败升级为候选或服务器缺陷
- next_owner：规划
- requires_user：`false`

### DIAG4 执行结果更正

以下更正覆盖本节中将 `extracted_*` 标签描述为“解包树 predicate”的表述：本轮脚本把 fixture 的 `new_dirs_cmd` / `new_files_cmd` 复用于 `extracted_dirs` / `extracted_files`，所以这两个标签实际再次针对 fixture，不构成解包树新 predicate 证据；不得据此宣称 archive 权限扫描已完成。

可确认的实际事实仍为：archive 身份校验、tar 解包、root 规范化权限均 exit `0`；fixture 的旧 `{}`+ 两门均 exit `1` / stderr `161` bytes；fixture 的新 `! -executable` / `! -readable` 两门均 exit `1` / stderr `89` bytes；qima 对 fixture 每个目录/文件单独执行 `test` 全真（false count 均为 `0`）。89-byte 错误与固定 fixture 顶层路径的 `Permission denied` 形态一致，但本轮未成功保留可绑定的 `stat` / `namei -l` 输出，不能把该形态进一步归因到具体目录元数据。

因此本轮唯一可交付的根因定位是：**既有 find 权限扫描门与 qima 逐路径权限真值不一致，且 DIAG4 harness 未完成 archive predicate 分支**。最小下一步不是部署修补，而是由规划在下一次独立诊断中修正命令变量绑定，并对实际解包 predicate 的首个 stderr 路径执行 stat/namei；在此之前不得把 R3 的 `QIMA_DIR_SCAN_FAILED` 归因为候选或生产权限。该修正未改仓库业务代码、候选或部署流程。

## artifact

- artifact_written：本文件

---

# TERM-CONTROL-SERVER-122B-R4

## outcome

- `blocked`
- 唯一实际首因：远端 `archive_sha` 门 `exit=52`。远端 archive 的 bytes 门已通过，但远端 archive 与远端 `.sha256`/冻结 SHA 的一致性门失败；按停止条件在解包前停止。
- 本轮未进入 tar extract、权限清单、symlink、manifest、11-gate、provider、migration、release/static、systemd 或健康门。

## evidence

- 复用 candidate trio，未重建、未安装依赖、未复制旧 current/node_modules：
  - archive bytes=`9417436`，本地 SHA-256=`c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`
  - manifest SHA-256=`48cc60997ee4d52ae700e2eab879ab31a6c07f421796a2565f8721d95feef961`
  - manifest files=`607`
- 本地临时文件化 runner：LF/CR byte=`0`；Node manifest checker `node --check` 通过；PowerShell AST 通过；`test {} +` 与 `qima-find` 均为 `0`。远端 init 已执行 `bash -n`，并执行了远端 Node checker 语法门。
- 首个 staging probe：fixed staging absent；上传使用既有 SSH config/alias 与显式目标文件名。主脚本输出 `phase_start=archive_sha`、`phase_fail=archive_sha exit=52`，随后 `phase_start=rollback`、`phase_pass=rollback exit=0`。
- 本地只读复核固定 staging：`remote_staging_absent=True`。
- local temporary work：已删除；candidate trio：保留。

## deployment / external actions

- provider.env：未安装、未合并、未回显
- tar extract / qima extracted loop / 14842 members / 476 symlink / manifest 607 / 11-gate：未到达
- database migration：`0`
- release/current/static：未安装、未切换
- systemd daemon-reload、drop-in、服务启停：`0`
- DeepSeek、COS、Tencent：`0`
- 生产 current、DB、控制面、公网路由：未修改
- SSH/SCP 仅用于本轮固定 staging 的候选传输和清理；无第三方业务写入

## rollback / cleanup / residual

- rollback：脚本报告 `exit=0`；未产生生产发布对象，因此无 current/static/env/unit 恢复差量。
- remote fixed staging：清理后只读复核 `absent`
- remote release/static/provider/drop-in：未产生
- local temporary scripts/work directory：已删除
- cleanup_errors：`0`
- residual：`0`（本轮远端 staging 与本地临时物）；candidate trio 按要求保留

## remaining_gap / next_owner / requires_user

- remaining_gap：本地冻结 archive 与本地 `.sha256` 一致，但远端 archive SHA 门失败；本轮没有保留或回显远端实际 hash，避免扩大敏感/传输证据。需要规划决定是否另开只读传输诊断；不在本切片内重传或重试。
- next_owner：规划
- requires_user：`false`

## artifact

- `artifact_written：本文件`

## DIAG6 artifact_written

- outcome：`blocked`（诊断命令编排在进入 qima find/test 前失败；未部署）
- 首步事实：`outer_uid=0`。
- root 创建成功；`/tmp/term-control-server-122b-diag6`、`root`、`a`、`b` 均原样 `root:qima:750:directory`，`f1`/`f2` 均原样 `root:qima:640:regular empty file`；每级 `namei -l` 显示逐级 `root:qima` 可达。
- `id qima` 与 GNU find 4.9.0 已打印；但外层 `sudo -n bash -c '…'` 的内层引用在 qima 阶段被截断，远端返回 `unexpected EOF while looking for matching "`，所以本轮没有有效 find/test 结果。
- unique explanation：本轮首因是命令引用错误，不是 find 或权限门结论；不得将本轮结果用于裁决 R3。
- cleanup：固定目录随后以 root 精确删除并复核 `absent`；residual=`0`。
- 下一步：规划若仍需最后对照，应重新构造无嵌套引号截断的单一命令；本轮不重试、不部署。
- requires_user：`false`；next_owner：规划。

## DIAG5 极小只读对照

- artifact_written：本文件；本轮仅一个 SSH shell，未上传 archive、未生成远端脚本、未读 Secret、未触碰 DB/current/static/systemd/服务或外部系统。
- 固定路径：`/tmp/term-control-server-122b-diag5`；shell trap 已删除并打印 `residual=0`。
- `id qima`：`uid=103(qima) gid=111(qima) groups=111(qima)`；find 首行：`find (GNU findutils) 4.9.0`。
- 夹具创建的精确首因：SSH 身份为 `qimao-deploy`，执行 `install -d -o root -g qima -m 0750` 及两个 `install -o root -g qima -m 0640` 时均 `Operation not permitted`。实际目录为 `qimao-deploy:qimao-deploy:700`，文件为 `qimao-deploy:qimao-deploy:600`；每级 `stat`/`namei -l` 已原样打印并与此一致。
- qima 下三条 find（`-maxdepth 2 -printf`、目录 `! -executable`、文件 `! -readable`）均 exit `1`，stderr 为顶层 `root` 的 `Permission denied`；四条逐路径 `test -x/-r` 也均 exit `1`。这不是正确 `root:qima 0750/0640` 树上的 find 结论。
- unique explanation：本轮在 find 之前被 SSH 运行身份的 fixture ownership 边界阻断，未建立用户要求的 root:qima 可达树，因此不能裁决 find 是否能扫描“明确可达树”。
- next step：规划在新的只读诊断中以已授权 root/sudo 边界先成功创建同一规格夹具，再运行相同 find 与逐路径 test；本轮不重试、不部署。
- residual：`0`；requires_user：`false`。

## DIAG4 只读根因诊断

### outcome / scope

- outcome：`artifact_written`（诊断完成；未部署）
- 固定远端路径：`/tmp/term-control-server-122b-diag4`
- 仅复用冻结 122A-R1 archive；未读取 Secret，未修改 DB、current、static、provider、systemd、服务或生产控制面，未调用 COS/Tencent/DeepSeek
- 远端脚本先通过 `sudo -n bash -n`；诊断 finally 精确删除固定路径并回报 `residual=0`

### identity / find

- `id qima`：`uid=103(qima) gid=111(qima) groups=111(qima)`
- `type -P find`：`/usr/bin/find`
- `find --version`：GNU findutils `4.9.0`

### fixture evidence

夹具由 root 创建并设为两个 `root:qima`、`0750` 目录和两个 `root:qima`、`0640` 文件；qima 逐路径循环单独执行 `test -x` / `test -r`，结果为 `loop_dir_false=0`、`loop_file_false=0`。

记录的精确门及结果（脚本临时保存 command/stdout/stderr/exit 后按要求删除）：

```text
find -P '/tmp/term-control-server-122b-diag4/evidence/fixture-root/old' -mindepth 1 -type d -exec /usr/bin/test -x {} +  -> exit 1, stdout 0 bytes, stderr 161 bytes
find -P '/tmp/term-control-server-122b-diag4/evidence/fixture-root/old' -mindepth 1 -type f -exec /usr/bin/test -r {} +  -> exit 1, stdout 0 bytes, stderr 161 bytes
find -P '/tmp/term-control-server-122b-diag4/evidence/fixture-root/old' -mindepth 1 -type d ! -executable -print -quit -> exit 1, stdout 0 bytes, stderr 89 bytes
find -P '/tmp/term-control-server-122b-diag4/evidence/fixture-root/old' -mindepth 1 -type f ! -readable -print -quit -> exit 1, stdout 0 bytes, stderr 89 bytes
```

旧 `{}`+ 门的非零结果与批量传参一致；独立逐路径 test 全真，故不能把旧门结果解释为实际 qima 文件权限失败。新 `! -executable` / `! -readable` 两门也在无可疑路径 stdout 的情况下返回 exit 1；诊断脚本已先保存其 stdout/stderr，未将原始 stderr 写入结果文档。stderr 中没有被诊断脚本安全解析出的精确 staging 路径，因此没有可安全绑定的 `stat` / `namei -l` 目标；未猜测路径，也未读取归档 manifest 或进入 11-gate。

### archive / extracted permission evidence

- archive：regular-file，bytes=`9417436`，SHA-256=`c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`
- `tar -xzf ... -C ...`：exit `0`
- `find -P` 权限规范化（目录 `root:qima 0750`、普通文件 `root:qima 0640`，不跟随 symlink）：exit `0`
- 解包目录新 predicate：目录 exit `1` / stdout `0` / stderr `89` bytes；文件 exit `1` / stdout `0` / stderr `89` bytes
- 解包树逐路径 qima 循环：exit `0`；`dir_false=0`、`file_false=0`

### unique first cause / falsifiable evidence

唯一可由本轮证据锁定的根因位于 **qima 执行 `/usr/bin/find` 谓词/扫描门这一调用层**，不是候选 archive 的字节、解包权限或单路径读/执行权限：同一 qima、同一 `root:qima` 权限夹具下，两个批量 `{}`+ 门和两个新 predicate 门均非零，而独立逐路径 `test` 对全部夹具路径及解包树均为真。R3 的 `QIMA_DIR_SCAN_FAILED` 因此不能继续归因成“某个目录缺 qima x”；它是 find 扫描门未提供可用成功判据。

可证伪条件：在同一 fixed root 下，将新 predicate 的完整、脱敏 stderr 作为下一次本地/隔离诊断输入；若其仍为 exit `1` 而逐路径 test 仍全真，则该判定成立。最小修复是让 qima 权限门采用已验证的逐路径 shell 循环，每个路径单独执行一元 `test -x` / `test -r`，首个 false 即停止；不要再使用 `find -exec ... {} +`，也不要把 find 的非零扫描结果直接等价为权限缺失。

### cleanup / residual / handoff

- 远端固定诊断目录：已删除并由脚本回报 `residual=0`
- 本地临时脚本目录：待本节写入后精确删除并复核 absent
- candidate trio：保留，未覆盖、未重建
- 外部写入：`0`；Tencent/COS/DB：`0`
- residual：诊断临时物清零后为 `0`
- remaining_gap：若规划需要解释 89-byte stderr，应在下一次独立诊断中只对该固定 stderr 做脱敏分类；本轮不重放、不部署
- next_owner：规划
- requires_user：`false`

## artifact

- artifact_written：本文件

---

# TERM-CONTROL-SERVER-122B-R3 实际终态

## outcome

`blocked`。R3 已移除 `find -exec /usr/bin/test {} +` 批量门，改用 GNU `find -P` 的 `! -executable` / `! -readable` 扫描；唯一预检在目录扫描阶段停止。

## evidence

- 复用同一 122A-R1 candidate trio；未重建、未安装依赖、未复制旧 current/node_modules
- staging：`/tmp/term-control-server-122b-r3`；外层 `root:qima 0750`，文件 `root:qima 0640`；qima 外层逐级 `x/r` 通过
- root helper/runner `bash -n` 与 Node24 `--check`：通过
- archive：regular-file，bytes=`9417436`，SHA=`c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`
- manifest SHA=`48cc60997ee4d52ae700e2eab879ab31a6c07f421796a2565f8721d95feef961`；本机冻结文件数=`607`
- archive member count=`14842`：通过
- 解包后使用 `find -P` 规范化目录/普通文件权限，未跟随或改写 symlink 目标
- qima `find -P ... -type d ! -executable -print -quit` 扫描：返回非零扫描错误，精确码=`QIMA_DIR_SCAN_FAILED`，exit=`1`；未产生不合格路径项，因此无 path/stat/namei 可报告
- 文件可读性扫描、五入口读取、476 relative symlink boundary、manifest 607 远端哈希、11-gate import：未到达

## deployment / external actions

- provider.env、migration、release/current/static、drop-in、daemon-reload、四 unit 启停：`0`
- health、受保护 API、静态 hash/deep-link：未到达
- DeepSeek、COS、Tencent：`0`
- 生产 current、生产 DB、控制面、公网路由：未修改

## cleanup / residual

- remote R3 staging：已精确删除并复核 `absent`
- remote release/static/provider/drop-in：未产生
- local R3 temporary scripts/work directory：已精确删除并复核 `absent`
- candidate trio：保留，未覆盖
- cleanup_errors=`0`；residual=`0`

## remaining_gap / next_owner / requires_user

- remaining_gap：qima 的 GNU `find -P` 目录权限扫描返回扫描错误；按 R3 停止条件不再诊断或修补
- next_owner：规划
- requires_user：`false`

## artifact

- artifact_written：本文件

---

# TERM-CONTROL-SERVER-122B-R2 实际终态

## outcome

`blocked`。R2 在唯一完整候选预检的解包权限穿透门停止，未进入 symlink、manifest 远端全文件校验、11-gate import、provider、迁移或发布。

## evidence

- 仅复用 122A-R1 candidate trio；未重建、未安装依赖、未复制旧 current/node_modules
- 远端固定 staging `/tmp/term-control-server-122b-r2`：外层目录 `root:qima 0750`；archive/manifest/SHA/文件化脚本与 drop-in 为 `root:qima 0640`
- qima 对外层 staging 逐级 `x`、文件 `r`：通过
- 远端 root helper/runner `bash -n`、Node24 `--check`：通过
- archive regular-file、bytes=`9417436`、SHA=`c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`：通过
- manifest SHA=`48cc60997ee4d52ae700e2eab879ab31a6c07f421796a2565f8721d95feef961`：通过；本机冻结文件数=`607`
- archive member count=`14842`：通过
- 解包后使用 `find -P` 分别设置目录/普通文件权限，不跟随或改写 symlink 目标；随后 qima 递归目录 `x` 验证失败
- 精确首因：`tar_extract` / `QIMA_DIR_TRAVERSE_FAILED` / exit=`1`
- 476 relative symlink、external/absolute/missing、607 文件远端哈希和 11-gate：未到达

## deployment / external actions

- provider.env、migration、release/current/static、drop-in、daemon-reload、四 unit 启停：`0`
- health、鉴权 JSON、静态 hash/deep-link：未到达
- DeepSeek、COS、Tencent：`0`
- 生产 current、生产 DB、控制面、公网路由：未修改

## cleanup / residual

- remote R2 staging：已精确删除并复核 `absent`
- remote release/static/provider/drop-in：未产生
- local R2 temporary scripts/work directory：已精确删除并复核 `absent`
- candidate trio：保留，未覆盖
- cleanup_errors=`0`；residual=`0`

## remaining_gap / next_owner / requires_user

- remaining_gap：即使按 `find -P` 重新装配，qima 仍无法递归穿透解包树；按 R2 停止条件不再现场修补
- next_owner：规划
- requires_user：`false`

## artifact

- artifact_written：本文件

---

# TERM-CONTROL-SERVER-122B-R1 实际终态

## outcome

`blocked`。R1 唯一远端候选预检在解包后的 qimao 目录穿透门停止，未进入 symlink、manifest 全文件校验、11-gate import、provider、迁移或发布。

## candidate / remote preflight

- 仅复用 122A-R1 candidate trio；未重建、未复制旧 current/node_modules
- archive：regular-file，bytes=`9417436`，SHA-256=`c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`
- manifest：SHA-256=`48cc60997ee4d52ae700e2eab879ab31a6c07f421796a2565f8721d95feef961`
- manifest 冻结文件数：`607`（本机已核对）
- remote staging：`/tmp/term-control-server-122b-r1`
- staging 权限：`root:qima`、目录 `0750`；archive/manifest/SHA/脚本/drop-in 文件 `0640`；qima 对 staging 逐级 `x` 与文件 `r` 门通过
- 远端 `bash -n`：root helper、runner 均通过；Node24 `--check` 通过
- archive member count：`14842`，通过
- tar extract：开始执行，随后 qima 逐级目录穿透失败
- symlink count/boundary：未到达；manifest 607 文件远端哈希：未到达；11-gate import：未到达

## unique first cause

精确首因：`tar_extract` 阶段的 `QIMA_DIR_TRAVERSE_FAILED`，exit=`1`。候选解包后，root 规范化权限已执行，但以 qima 递归验证解包目录的 `x` 权限未通过。按 R1 停止条件未现场修补、不重传、不继续部署；本结果不把该门升级为候选业务源码或生产依赖结论。

## deployment / external actions

- provider.env：未安装、未读取远端内容
- database migration：`0`
- release/current/static：未安装或切换
- systemd daemon-reload、drop-in、服务启停：`0`
- health、受保护 API 鉴权 JSON、静态 hash/deep-link：未到达
- DeepSeek、COS、Tencent：`0`
- 生产 current、生产 DB、控制面、公网路由：未修改

## cleanup / residual

- remote staging：已精确删除并复核 `absent`
- remote release/static/provider/drop-in：未产生
- local temporary scripts/work directory：已精确删除并复核 `absent`
- candidate trio：保留，未覆盖
- cleanup_errors：`0`
- residual：`0`（本轮 staging 与本地临时物）

## remaining_gap / next_owner / requires_user

- remaining_gap：qima 解包目录逐级 `x` 门失败；本轮不继续诊断或部署
- next_owner：规划
- requires_user：`false`

## artifact

- artifact_written：本文件

---

## TERM-CONTROL-SERVER-122B-TRANSFER-DIAG

- artifact_written：`true`；本轮仅做传输证据核对，未解包、未部署、未读取 Secret、未触碰 DB/current/static/systemd/服务或外部系统。
- local：固定 archive bytes=`9417436`，SHA-256=`c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`。
- remote：`stat` bytes=`9417436`，`sha256sum` SHA-256=`c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`；一致=`true`。
- 唯一归因：远端 `awk` 首 token 为 `UTF-8 BOM + c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`，导致 R4 的严格字符串比较失败；payload 传输本身未损坏。
- cleanup：固定 `/tmp/term-control-server-122b-transfer-diag` 删除成功，复核 `absent`；residual=`0`；requires_user=`false`。

---

## TERM-CONTROL-SERVER-122B-R5

- artifact_written：`true`；outcome=`blocked`。
- archive SHA BOM 修正门通过：bytes=`9417436`，实际 SHA 与冻结 literal 均为 `c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`。
- 已通过：tar extract、root:qima 权限规范化；唯一首因是 `qima_extracted_loop` exit=`60`。按停止条件未继续 symlink/manifest/11-gate 或部署。
- provider/migration/release/current/static/systemd/health/鉴权/静态及 DeepSeek/COS/Tencent：`0`；生产基线未修改。
- rollback：`exit=0`；固定 `/tmp/term-control-server-122b-r5` 已复核 absent；local temporary work 已删除；residual=`0`；candidate trio 保留。
- remaining_gap：qima 逐路径权限门失败，未保留其内部输出；next_owner=`规划`；requires_user=`false`。

---

## TERM-CONTROL-SERVER-122B-R6

### outcome

`blocked`；`artifact_written=true`。本轮复用 122A-R1 三件套，唯一远端发布在 `archive_members_links` 门停止，已按脚本执行 rollback 与固定 staging 清理；未继续部署或重试。

### candidate / local gates

- archive：固定三件套未重建或覆盖；本机 bytes=`9417436`，SHA-256=`c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`
- manifest：SHA-256=`48cc60997ee4d52ae700e2eab879ab31a6c07f421796a2565f8721d95feef961`，冻结文件数=`607`
- 本机 PowerShell AST、Node `--check`、临时脚本 CR byte 门均通过；Secret 仅在本机内存派生，未回显

### remote phases / unique first cause

- 已通过：SSH alias 前置 staging absent、input prepare、显式三件套/检查器/runner 传输、staging `root:qima 0750` 与输入/runner/checker `root:qima 0640`、archive SHA、tar extract、权限规范化、qima 清单可读、qima 逐路径目录 `x`/文件 `r`
- 唯一首因：`phase_fail=archive_members_links exit=66`
- 该门失败前未持久化或输出成员/链接计数；清理前安全输出为 `safe_stdout=none`、`safe_stderr=none`，因此不对 `members/links/external/absolute/missing` 的具体子项作猜测
- 未到达：manifest 607 远端校验、11-gate import、provider.env、迁移、release/current/static、drop-in、systemd、health、鉴权 API、管理员静态门

### deployment / external actions

- SSH/SCP 仅用于本轮固定传输与脚本执行；DeepSeek、COS、Tencent、CreateRecTask：`0`
- provider.env 安装、migration、release/static 切换、drop-in、daemon-reload、服务启停：`0`
- 生产 current、生产 DB、控制面、公网路由：未修改；未创建业务事实

### cleanup / residual

- rollback：exit=`0`；固定远端 `/tmp/term-control-server-122b-r6` 清理后复核 `absent`，input cleanup=`passed`
- 本地 R6 临时 work：已精确删除并复核 `absent`
- candidate trio：保留且未覆盖；`cleanup_errors=0`；本轮 residual=`0`

### remaining_gap / next_owner / requires_user

- remaining_gap：需由规划审查 `archive_members_links` 的失败子门；本轮没有可证伪的成员/链接计数，不现场补丁、不重跑
- next_owner：`规划`
- requires_user：`false`

### artifact

- artifact_written：本文件
