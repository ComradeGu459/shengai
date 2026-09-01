# TERM-CURRENT-BASELINE-RESTORE-SERVER-60

## outcome

- `blocked`
- 结论：`transfer_preflight_failed`。
- 远端 deploy-owned transfer 创建命令首因失败，按规则未执行 SCP、transient、解包或 restore。

## evidence

- 已只读读取 CURRENT `v4-1498`、SERVER-38 与 SERVER-59 结果；确认本片只消费 SERVER-38 原始三件套，不改业务源码。
- 本地三件套、Bash 语法与 CR 门全部通过：
  - archive=`9,471,776` bytes / `020437197f6fef783fa04a1789ba727cf293a152d140b38630122a9677c3b925`
  - manifest=`3,000,555` bytes / `61372755bb1ac1a6bbe22aaf57ea98bd0a5afba78f44c4ff3b508dc615ec6f07`
  - audit=`1,190` bytes / `0f03a1de65ed6b93ae11a05c6abe95d60c8d2de4ea9e3830ef0c706663d5bcff`
  - restore runner：`D:\Git\bin\bash.exe --noprofile --norc -n`=`0`；CR byte=`0`。
- 已用 `apply_patch` 生成唯一物理 LF restore runner；未创建 helper、manifest 或第二 runner。
- 远端固定 transfer 创建命令返回 exit=`1`，安全错误为：`install: cannot create directory ‘/tmp’: Permission denied`。因此未创建 deploy-owned transfer，未执行 SCP。
- 服务器/外部写入计数：SCP=`0`、transient=`0`、migration=`0`、release rename=`0`、current/static=`0`、四 unit restart=`0`、DeepSeek=`0`、Tencent=`0`、COS=`0`、业务 API=`0`、Secret/DB/route/env=`0`。

## remaining_gap

- 缺失的 `/opt/qimao-terms-cloud/releases/term-provider-usage-20260830-r1` 未恢复；未进入 archive、manifest、五入口或 qimao 可读性门。
- 既有生产 `current` dangling symlink 未被本片修改；四 unit PID/NRestarts、health、route 与 static 前后一致性未进入本片 restore 后验收。
- 不在本片更换 SSH 身份、修复 `/tmp` 权限或重试 transfer 创建。

## next_owner

- `PLANNER`：审阅既有 alias 下 `/tmp` 创建权限首因，另签唯一身份/路径修正；本片不改权限、不碰 current 或运行服务。

## residual

- 本地 `C:\Users\ComradeGu\Documents\七猫兼职\term-current-baseline-restore-60-runner` 已精确删除并核对不存在。
- 远端未创建 transfer、stage、transient 或 release target；既有 dangling current 保留。
- SERVER-38 三件套及既有脏工作树均保留且未修改。

## requires_user

- `false`

## SERVER-61只读诊断

### artifact_written

- `artifact_written`
- 本节是 SERVER-61 唯一追加内容；本片严格只读。
- `requires_user=false`

### outcome

- `blocked`
- 结论：`transfer_parent_permission_denied`。
- 唯一可证伪首因：同一保存 alias 当前登录身份对 `/tmp` 不具备写入和目录穿越权限，无法创建 SERVER-60 固定 transfer 子目录。

### evidence

- SERVER-60 实际 SSH 可还原为以下完整边界：
  - executable=`C:\Windows\System32\OpenSSH\ssh.exe`
  - argv token 1=`-F`
  - argv token 2=`C:\Users\ComradeGu\Documents\七猫兼职\qimao-terms-cloud\deploy\ssh\qimao-test-server.conf`
  - argv token 3=`qimao-test-server`
  - argv token 4=`test ! -e /tmp/qimao-term-current-baseline-restore-60-transfer && install -d -m 0700 /tmp/qimao-term-current-baseline-restore-60-transfer`
  - 保存 config 的 alias=`qimao-test-server`，HostName=`103.36.63.67`，User=`qimao-deploy`，IdentityFile=`~/.ssh/qimao_test_server_20260820_ed25519`，并启用 `BatchMode/IdentitiesOnly/StrictHostKeyChecking`。
- 同一 alias 只读诊断结果，命令标准输出均按任务要求抑制，仅返回退出码：
  - `id -un`=`0`；`id -u`=`0`；`id -gn`=`0`
  - `stat -c '%U:%G:%a:%F' /tmp`=`0`
  - `namei -l /tmp`=`0`
  - `test -w /tmp`=`1`；`test -x /tmp`=`1`
- SERVER-60 首条命令的实际错误为 `install: cannot create directory ‘/tmp’: Permission denied`。目标 token 明确是 `/tmp/qimao-term-current-baseline-restore-60-transfer`，并未退化为 `/tmp`；argv 也未发生拆分。
- SERVER-59 成功的 direct-SCP 形状是固定子目录目标：`scp.exe -F <同一cfg> <三件套> <checker> <runner> qimao-test-server:/tmp/qimao-term-budget-fix-release-55-transfer/`，结果为 `exit=0`。该形状未要求当前身份先在 `/tmp` 根创建子目录；SERVER-59 未保存当时 `/tmp` stat，因此不能声称历史权限数值发生了何时变化，但当前权限阻断已由 `test -w/-x` 确认。
- `SCP=`0`、`transient=`0`、`restore=`0`、`sudo写入=`0`、`chmod/chown=`0`、`DB=`0`、`Provider/COS/Tencent/业务API=`0`；本片未创建、删除或修改任何资源。

### remaining_gap

- SERVER-60 的缺失 release target 尚未恢复；当前无法由 `qimao-deploy` 创建 `/tmp` 下新 transfer 子目录。
- 唯一正确命令形状应保持 SERVER-59 的 direct-SCP 固定子目录边界：
  `scp.exe -F <qimao-test-server.conf> <archive> <manifest> <audit> qimao-test-server:/tmp/qimao-term-current-baseline-restore-60-transfer/`
  前提是该精确子目录已由有权限的既定 owner 预先存在；本片不执行预创建或替代身份修复。

### next_owner

- `PLANNER`：基于当前 `/tmp` 权限首因安排唯一可授权的固定子目录前置条件；不得把目标改成 `/tmp` 根、拆分 argv 或在本片追加权限修复。

### residual

- 本片无远端写入；SERVER-60 既有 dangling current、缺失 release target 与既有生产服务状态均未修改。
- 未创建 transfer/stage/transient；未执行 SCP、restore、重启、DB 或外部调用。

### requires_user

- `false`

## SERVER-61-R1候选临时根只读核对

### artifact_written

- `artifact_written`
- 本节为 SERVER-61-R1 在 SERVER-60 报告中的唯一追加内容；严格只读。
- `requires_user=false`

### outcome

- `read_only_temp_root_diagnosis`
- 同一 `qimao-test-server` alias（配置用户 `qimao-deploy`）下，`/var/tmp` 同时满足标准临时根的目录、可写、可穿越门；`/tmp` 不满足可写和可穿越门。
- 唯一候选固定 transfer 绝对路径：`/var/tmp/qimao-term-current-baseline-restore-62-transfer`；本片未创建。
- 唯一可证伪首因：`/tmp` 当前为 `root:root`、`0700`，qimao-deploy 对其 `test -w` 与 `test -x` 均失败；这解释 SERVER-60 在 `/tmp` 根创建子目录时的权限错误。

### evidence

- 同一 alias 的只读 SSH 命令 exit=`0`；未读取目录内容，未执行创建、删除、SCP、transient、sudo 写入、权限修改、restore、重启、DB 或外部调用。
- `/var/tmp` 的完整 `stat` stdout：

  ```text
  VAR_TMP_STAT_BEGIN
  root:root:1777:directory
  VAR_TMP_STAT_END
  ```

- `/var/tmp` 的完整 `namei -l` stdout：

  ```text
  VAR_TMP_NAMEI_BEGIN
  f: /var/tmp
  drwxr-xr-x root root /
  drwxr-xr-x root root var
  drwxrwxrwt root root tmp
  VAR_TMP_NAMEI_END
  ```

- qimao-deploy 对 `/var/tmp` 的退出码：`test -w`=`0`；`test -x`=`0`。
- `/tmp` 的完整 `stat` stdout：

  ```text
  TMP_STAT_BEGIN
  root:root:700:directory
  TMP_STAT_END
  ```

- `/tmp` 的完整 `namei -l` stdout：

  ```text
  TMP_NAMEI_BEGIN
  f: /tmp
  drwxr-xr-x root root /
  drwx------ root root tmp
  TMP_NAMEI_END
  ```

- qimao-deploy 对 `/tmp` 的退出码：`test -w`=`1`；`test -x`=`1`。
- 本次调用事实：SCP=`0`、transient=`0`、restore=`0`、权限修改=`0`、DB=`0`、Provider/COS/Tencent/业务 API=`0`。

### remaining_gap

- SERVER-60 缺失 release target 仍未恢复；本片未创建候选 transfer 路径，也未执行恢复命令。
- 后续如获授权，只能使用上述 `/var/tmp` 固定绝对路径，并先由同一规划确认其父目录前置条件；本片不创建。

### next_owner

- `PLANNER`：基于已核实的 `/var/tmp` 可写/可穿越事实，安排下一片唯一固定 transfer 路径；不得使用当前不可写、不可穿越的 `/tmp` 根。

### residual

- 本片未创建、删除或修改任何远端资源；SERVER-60 的 dangling `current`、缺失 release target、生产服务及配置均保持原状。
- 未产生 transfer、stage、transient、restore、重启、数据库或外部 Provider 残留。

### requires_user

- `false`
