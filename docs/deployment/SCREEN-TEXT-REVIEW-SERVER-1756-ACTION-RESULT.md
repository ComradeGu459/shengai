artifact_written: true

# SCREEN-TEXT-REVIEW-SERVER-1756-ACTION

## outcome

```yaml
outcome: blocked
slice_outcome: remote_preflight_process_start_failed
release_id: screen-text-review-20260901-r1
target: qimao-test-server (103.36.63.67)
frozen_input: SCREEN-TEXT-REVIEW-SERVER-1753-FREEZE
remote_connections: 0
remote_transfers: 0
fixed_entry_installations: 0
fixed_entry_executions: 0
database_writes: 0
service_restarts: 0
residual: 0
next_owner: 规划
requires_user: true
```

## first failure

按 1756 要求，已准备 UTF-8 无 BOM、LF/CR=0 且 `bash -n` 通过的原始 stdin 只读基线脚本，并使用 Windows OpenSSH、显式 key/known_hosts、`StrictHostKeyChecking=yes` 调用 `/bin/bash -s --`。但 `System.Diagnostics.ProcessStartInfo.ArgumentList` 传递 `-o UserKnownHostsFile=...` 时，OpenSSH 解析为 `no argument after keyword "userknownhostsfile"` 并以 255 退出；SSH 未接收脚本 stdin，随后本地管道写入得到“管道已结束”。

未执行远端脚本、未连接完成远端会话、未上传、未创建远端目录、未安装 fixed、未创建 inbound、未调用固定入口，也未执行服务或数据库写操作。按“一次新首因即停”规则停止；未修改 key、known_hosts 或 StrictHostKeyChecking。

## frozen input retained

1753 五件套完整保留且未消费：

- `deploy/debian/bin/qimao-application-release`：45743B，SHA256 `d86a8907a8d4e5e9add9737158f2a62d4d0fa7937e1f56ca59a112694e6a7911`
- `deploy/debian/bin/application-release-declaration.mjs`：26901B，SHA256 `a3748e2a5a861faa74c5adf0dad0a3dc5b5c65bc1270aa79ba83e749ae2bc3df`
- `deploy/screen-text-review-release-1753/application-release.declaration.json`：927B，SHA256 `ba64dddcf316c0e5a8d5374edbb9456376dae9778668d54721f274609eee3738`
- `work/screen-text-review-20260901-r1.tar.gz`：9328201B，SHA256 `c47c9fd3cb3c1e37e37e3f928689d2f377aa62951e099cfb927bf9b3ce9e5fbc`
- `deploy/screen-text-review-release-1753/SHA256SUMS`：207B，SHA256 `1969685d7695c44b0f0373c14352c1430684216b878e1b830b7bb3a80c4f447a`

## residual and remaining_gap

本轮服务器连接完成、写入、上传、fixed 安装、固定入口执行、服务重启和数据库写入均为 0，residual=`0`。临时预检脚本已精确删除；需由新的动作任务修正 Windows OpenSSH 参数边界后重新取得直接确认，禁止在本轮继续尝试。
