# TENCENT-ASR-SERVER-05N-ROOT-RECONCILE

```yaml
artifact_written: true
conclusion: local_tcp_connect_permission_denied
scope: strict-read-only
network_actions: 1
external_writes: 0
next_owner: PLANNING
requires_user: false
```

## 固定范围

本轮只使用项目 SSH config 与 alias：

```text
ssh -F deploy/ssh/qimao-test-server.conf qimao-test-server id -un
```

未使用 `-i`、`user@host`、其他身份或任何部署/业务命令。固定目标 root 为：

```text
/tmp/qimao-asr-05l-20260829-r1
```

## 证据

身份探针仅执行一次：

```yaml
stdout: ""
exit_code: 255
stderr_redacted: "ssh: connect to host [server] port 22: Permission denied"
```

stdout 未精确返回 `qimao-deploy`，因此本轮立即停止，未执行 root `test`，也未执行 `stat`。

## 结论

`local_tcp_connect_permission_denied`

远端 root 的存在性、owner、mode、类型均未作结论；不能归类为 `root_absent`、`root_preexisting(owner/mode)` 或 `permission_read_failed`。

## 残留与下一步

- 本轮外部写入：0。
- 未执行 mkdir、rm、chown、chmod、sudo、scp、ffmpeg、Secret、DB、COS、Tencent 或 Execute。
- 未产生本机临时文件或媒体。
- `/tmp/qimao-asr-05l-20260829-r1` 未被本轮读取，状态保持 unknown。

`remaining_gap=本地 TCP connect permission denied 发生在 SSH 认证前，需后续规划决定是否重新安排只读核查。`

`next_owner=PLANNING`，`requires_user=false`。
