# TERM-CONTROL-STAGING-DIFF-SERVER-13

## outcome

- `blocked`
- `artifact_written=true`
- 本片为只读证据复盘；未执行 SSH、SCP、构建、候选修改、服务器写入或外部调用。

## evidence

### SERVER-12 初始 staging

SERVER-12 的首个远端 staging 命令为：

```text
test ! -e /tmp/qimao-asr-term-control-release-e2e-12-r1 && install -d -o qimao-deploy -g qimao-deploy -m 0700 /tmp/qimao-asr-term-control-release-e2e-12-r1
```

因此，在后续 runner 开始前，staging 父目录为：

```text
owner/group=qimao-deploy:qimao-deploy
mode=0700
type=directory
```

该父目录在 qimao 门前没有被重新设置 owner/group/mode；这是由执行顺序可证实的 at-gate metadata。数值 UID/GID 没有被 SERVER-12 输出或保存，因此不能从本地上下文还原其数值。SCP 完成后、runner 规范化之前的四个输入的实际 metadata 也没有被单独记录，本报告不对该时点作额外断言。

### SERVER-12 runner 顺序与 qimao 门

runner 先创建嵌套目录：

```text
install -d -o root -g qimao -m 0750 "$STAGE/deploy/debian/bin" "$STAGE/backup" "$STAGE/runtime-env" "$STAGE/release"
```

随后对四个 qimao 门所需输入执行：

```text
chown root:qimao "$ARCHIVE" "$MANIFEST" "$STAGE/candidate.sha256.audit" "$STAGE/e2e.mjs" ...
chmod 0640 "$ARCHIVE" "$MANIFEST" "$STAGE/candidate.sha256.audit" "$STAGE/e2e.mjs" ...
```

随后才执行布局移动，然后以 qimao 检查：

```text
sudo -n -u qimao -- test -x "$STAGE"
sudo -n -u qimao -- test -r "$ARCHIVE"
sudo -n -u qimao -- test -r "$MANIFEST"
sudo -n -u qimao -- test -r "$STAGE/e2e.mjs"
```

在这些检查发生时，四个输入的命令定义 metadata 为：

```text
candidate.tar.gz              root:qima 0640
candidate.manifest.json       root:qima 0640
candidate.sha256.audit        root:qima 0640
e2e.mjs                       root:qima 0640
```

上述四项的用户名/组名与 mode 是由紧邻 qima 门之前的 `chown`/`chmod` 命令顺序确定的 at-gate 状态；逐项 `stat` 及数值 UID/GID 未被 SERVER-12 记录，故不作更强的“实测数值”主张。

父目录仍为 `qimao-deploy:qimao-deploy 0700`，所以 `test -x "$STAGE"` 失败；SERVER-12 记录的唯一阶段结果为 `phase_fail=staging_identity exit=31`、安全错误类 `qimao_readability`，随后 cleanup exit 0。未进入 provider、迁移、release/static、systemd、health/API/static 或 E2E。

### RELEASE-06 / Runbook Step2 对照

RELEASE-06 成功证据及现行 Runbook Step2 要求的顺序是：

```text
staging parent: root:qima 0750
ordinary input/runner files: root:qima 0640
then qima:qima parent traversal/readability checks
```

也就是说，父目录本身必须在 qima 门前完成 `root:qima 0750` 规范化；不能只规范化其子目录和文件。

## unique_cause

唯一可证伪首因是：SERVER-12 初始 staging 父目录以 `qimao-deploy:qimao-deploy 0700` 创建，但 runner 没有在 qima 检查前对 `$STAGE` 本身执行 `chown root:qima` 与 `chmod 0750`。文件级 `root:qima 0640` 已按 runner 顺序处理，失败发生在父目录 traversal 门，而不是四个输入文件的文件级可读性门。

## unique_correction

在任何 qima 检查前，对同一固定 `$STAGE` 先执行父目录规范化：

```text
chown root:qima "$STAGE"
chmod 0750 "$STAGE"
```

并保持其先于输入文件的 `chown root:qima` / `chmod 0640` 及全部 qima `test -x/-r`。等价的最小修正是将初始 `install -d` 直接改为 `root:qima 0750`；不得放宽为 0755/0644，不得引入 qima fallback 或第二身份。

## command_delta_vs_release_06

唯一命令差量：SERVER-12 缺少对 staging 父目录 `$STAGE` 的 `root:qima 0750` 设置；RELEASE-06/Runbook Step2 在文件与 qima 门之前包含该父目录规范化。其余四输入的文件权限目标及 qima 检查身份不构成差量。

## residual

```yaml
remote_staging: 0
local_temp: 0
external_writes: 0
candidate_trio_retained: 1
production_changed: false
```

## requires_user

false

## next_owner

PLANNING
