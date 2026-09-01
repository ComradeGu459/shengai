# TENCENT-ASR-SERVER-05J-SSH-IDENTITY

```yaml
artifact_written: true
outcome: passed
task: TENCENT-ASR-SERVER-05J-SSH-IDENTITY
current: v4-1313
role: SERVER
host: 103.36.63.67
remote_attempts: 1
remote_command: id -un
stdout: qimao-deploy
exit_code: 0
next_owner: SERVER
requires_user: false
```

## Evidence

按固定身份执行一次只读 SSH 命令，显式使用：

```text
-i C:\Users\ComradeGu\.ssh\qimao_test_server_20260820_ed25519
-o BatchMode=yes
-o IdentitiesOnly=yes
-o StrictHostKeyChecking=yes
```

远端命令与结果：

```text
id -un
stdout: qimao-deploy
exit_code: 0
```

stdout 与预期身份精确一致。stderr 无内容；未输出凭据或其他敏感信息。

## Scope / residual

- 未生成媒体，未上传或解包候选；
- 未执行 sudo、Secret、DB、COS、Tencent、业务或 synthetic 动作；
- 未修改业务代码、候选或生产配置；
- 本轮无临时文件和远端资源残留。

`remaining_gap`: SSH 身份已证明可登录；05H synthetic 尚未重跑，仍需按既有 lease 与单次外部创建规则由 SERVER 执行。
