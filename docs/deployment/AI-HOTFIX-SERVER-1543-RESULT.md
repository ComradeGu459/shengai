# AI-HOTFIX-SERVER-1543

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## evidence

- 1541 三件套完整复用且未重建：archive=`10267996` / `80bee3c1fd49515ea8cc10c34140ab39412c8cda311e9f28f6fb5f4cbfdccb8f`；manifest=`5783` / `c84c26ac2fdd8cf770621acc72e7d805a08070b6566fcf40c48b821d70743a1b`；audit=`3393` / `d7a400fd1e323bd9890561530b4c574a8555f0d7c503869391c6cb3a9c9fcd1d`。
- 仅修 runner 的旧 release 分支：当 `OLD_RELEASE` 已存在时，验证 directory、`root:qimao:750`、current realpath、五入口 Node `--check` 与 qimao 可读；只有不存在时才保留旧冻结 archive 恢复分支。修改后的 runner=`9887` bytes / `a9011257eb2f642b72a99216f1f7ad2e6513f2cbfea07ac61b9647d59ffe2ac4`，Git Bash `--noprofile --norc -n` exit=`0`，CR=`0`。
- 1541 root runner 首门已返回 `OLD_TARGET_PRESENT`，之后 root 只读确认旧 release 实际存在且 current realpath 可解析；因此 1543 的修正是可验证的权限/前门差量，但需要重新传输修正版 runner 才能执行。
- 1541 已消耗唯一 SCP 且 runner 已清理 transfer。按本片“一次 SCP”边界，不执行第二 SCP、第二 root runner、发布、切换或重启。
- 服务器当前只读状态：旧 current release=`/opt/qimao-terms-cloud/releases/term-budget-capability-20260830-r1` 且可解析；员工 static 仍为 `frontend-employee-upload-background-20260830-r1`；backend/ASR/screen-text 保持 `active/running`、`NRestarts=0`，health=`200`。

## external_counts

```yaml
1543_transfer_dir_create: 0
1543_scp: 0
1543_root_runner: 0
1543_current_static_switch: 0
1543_backend_restart: 0
1543_asr_worker_restart: 0
1543_screen_text_restart: 0
1543_provider_calls: 0
1543_cos_calls: 0
1543_database_writes: 0
1543_route_writes: 0
1543_budget_writes: 0
inherited_1541_scp: 1
inherited_1541_root_runner: 1
inherited_1541_runner_exit: 1
```

## rollback

1543 未触发回滚；1541 runner 在任何链接切换或服务重启前已停止并清理 transfer/stage。现有旧 release/current、员工 static、服务与 health 未被本片改变。

## remaining_gap

修正版 runner 未能在本片传输，1541 的旧 runner 前门假设仍未在服务器执行验证。不能违反一次 SCP 边界现场重传或启动第二 runner。

## next_owner

`PLANNER`：审核修正后的 runner 与既有 root 基线，另行安排唯一传输/发布切片。

## residual

- 服务器 transfer、1541 stage、1541 new release/static 均 absent；生产旧 release/current 与员工 static 保留。
- 本地 1541 archive/manifest/audit 三件套不变；物理 runner 保留为本片唯一修正后的版本。
