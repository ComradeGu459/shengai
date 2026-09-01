artifact_written: true

# SCREEN-TEXT-REVIEW-SERVER-1758-ACTION

## outcome

```yaml
outcome: blocked
slice_outcome: remote_preflight_lock_assertion_failed_before_transfer
release_id: screen-text-review-20260901-r1
target: qimao-test-server (103.36.63.67)
frozen_input: SCREEN-TEXT-REVIEW-SERVER-1753-FREEZE
remote_connections: 1
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

1758 使用 Windows OpenSSH 最小参数及 UTF-8 无 BOM、LF/CR=0 的原始 stdin 预检脚本连接成功。远端主体事实全部读取到预期值：主机 `RainYun-4be14I5A`、用户 `qimao-deploy`、Node `v24.19.0`、三指针、unit/PID 与五项页面 HTTP `200/200/200/200/200`。

脚本最后尝试以 `qimao-deploy` 直接重定向 `/run/lock/qimao-application-release.lock`，命中权限错误：`/bin/bash: line 75: /run/lock/qimao-application-release.lock: Permission denied`。该 lock 只读门因此未通过；未修正为 root flock 重试。

未执行 SCP、远端临时目录创建、fixed 原位安装、inbound 上传、固定入口调用、服务或数据库写操作；未修改 SSH 配置、key 或 known_hosts。按“一次新首因即停”规则停止。

## frozen input retained

1753 五件套完整保留且未消费：

- `deploy/debian/bin/qimao-application-release`：45743B，SHA256 `d86a8907a8d4e5e9add9737158f2a62d4d0fa7937e1f56ca59a112694e6a7911`
- `deploy/debian/bin/application-release-declaration.mjs`：26901B，SHA256 `a3748e2a5a861faa74c5adf0dad0a3dc5b5c65bc1270aa79ba83e749ae2bc3df`
- `deploy/screen-text-review-release-1753/application-release.declaration.json`：927B，SHA256 `ba64dddcf316c0e5a8d5374edbb9456376dae9778668d54721f274609eee3738`
- `work/screen-text-review-20260901-r1.tar.gz`：9328201B，SHA256 `c47c9fd3cb3c1e37e37e3f928689d2f377aa62951e099cfb927bf9b3ce9e5fbc`
- `deploy/screen-text-review-release-1753/SHA256SUMS`：207B，SHA256 `1969685d7695c44b0f0373c14352c1430684216b878e1b830b7bb3a80c4f447a`

## residual and remaining_gap

本轮服务器写入、上传、fixed 安装、固定入口执行、服务重启和数据库写入均为 0，residual=`0`。预检临时脚本已精确删除；需新动作任务使用 `sudo -n flock -n /run/lock/qimao-application-release.lock -c true` 等 root lock 检查后重新取得直接确认，禁止在本轮继续尝试。
