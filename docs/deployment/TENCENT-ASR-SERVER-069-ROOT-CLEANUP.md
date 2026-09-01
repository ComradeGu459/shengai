# TENCENT-ASR-SERVER-069-ROOT-CLEANUP

```yaml
artifact_written: true
outcome: completed
remote_root: /tmp/qimao-asr-068-20260829-r1
remote_check: ssh_exit_0
root_state: absent
owner_group_mode: qimao-deploy:qimao-deploy:700
root_type: directory
top_level_count: 4
top_level_names_types: asr-isolated-synthetic-bootstrap.mjs:regular_file,asr-isolated-synthetic-business.mjs:regular_file,episode-001.mp4:regular_file,qimao-terms-cloud-asr-04b-candidate-20260828.tar.gz:regular_file
active_process_occupation: 0
proc_cwd_fd_occupying_processes: 0
proc_scan_error: 1
occupancy_verdict: zero_actual_references
root_owned_subitems: 0
content_binding: exact_four_regular_transferred_files
cleanup: deleted_and_absent
delete_attempted: true
network_actions: 1
tencent_writes: 0
residual: none
ssh_failure_shape: not_applicable_current_session_success
next_owner: PLANNING
requires_user: false
```

## evidence

- 使用项目 SSH config/alias，并从首次 SSH 起使用联网提权；仅核对 `/tmp/qimao-asr-068-20260829-r1`，未扫描其他 `/tmp`。
- SSH 返回 `exit=0`。root 存在且为目录，owner/group/mode 为 `qimao-deploy:qimao-deploy:700`。
- 顶层数量为 `4`，且仅为 068 计划传输的四个 regular 文件：两个正式 `.mjs`、`episode-001.mp4` 和冻结 archive；未读取文件内容。
- `root_owned_subitems=0`，四个 owner/mode/顶层文件事实与 069 首次核验一致。
- R1 不读取 cmdline，仅按 `/proc/[pid]/cwd` 与 `/proc/[pid]/fd/*` 的实际解析目标计数：指向该 root 的进程数为 `0`；`proc_scan_error=1` 按规划裁决视为 `/proc` 并发消失竞态，不推翻实际引用为零。
- 依据既有安全门，由 `qimao-deploy` 非 sudo 精确删除四个已核验传输件和该 root；随后仅复核该精确路径，返回 `root_state=absent`。
- 本轮没有 sudo、业务、precreate/full、DB、COS、Tencent、Secret 或媒体动作；腾讯写入为 `0`。

## cleanup / failure shape

- `cleanup=deleted_and_absent`，`delete_attempted=true`；远端 root 已精确删除并复核 absent，`residual=none`。
- 069 首次的命令行自匹配不再作为占用结论；R2 按规划裁决采用真实 cwd/fd 引用计数为零的结果。
- 当前 SSH 会话成功，不支持把本轮归因为短暂 SSH 中断。068 原始 runner 只留下 `finally.cleanup.root` 的 `CLEANUP_FAILED`，没有可用于区分短暂 SSH 中断与路径/权限问题的 stderr；本轮不作历史根因改判。

`next_owner=PLANNING`；`requires_user=false`。按停止条件不重试、不追查活跃进程命令、不扩大清理范围。
