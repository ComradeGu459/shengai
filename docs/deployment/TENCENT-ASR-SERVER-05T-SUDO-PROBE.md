# TENCENT-ASR-SERVER-05T-SUDO-PROBE

```yaml
artifact_written: true
outcome: passed
network_actions: 2
external_writes: 0
remote_test_commands: 2
conclusion: group_flag_not_cause
next_owner: PLANNING
requires_user: false
```

## evidence

仅使用项目 SSH config/alias，对同一固定 backend.env 目标执行了两次且仅两次 `test -r`：

| probe | command shape | exit | classification |
|---|---|---:|---|
| A | `sudo -n -u qimao -- test -r <fixed-target>` | 0 | `readable` |
| B | `sudo -n -u qimao -g qimao -- test -r <fixed-target>` | 0 | `readable` |

未读取文件内容、owner、mode、hash 或其他路径外信息；stderr 只用于本地脱敏分类，未保存或写入原文。未执行第三条远端命令，也未执行 install/rm/chown/chmod、媒体、Secret、DB、COS、Tencent 或 runner Execute。

## conclusion

`group_flag_not_cause`：不带显式组标志与显式 `qimao` 组标志均可读，因此本次 group flag 差异不能解释此前的 readability failure。

## remaining_gap / residual

本轮只证明该固定目标在 A/B 两种 sudo 参数下均可读；按停止条件不继续远端诊断。`residual=0`，`next_owner=PLANNING`，`requires_user=false`。
