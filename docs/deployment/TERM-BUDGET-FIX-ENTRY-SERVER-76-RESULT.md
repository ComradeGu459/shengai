# TERM-BUDGET-FIX-ENTRY-SERVER-76

artifact_written: true
outcome: passed
requires_user: false

## evidence

75 runner 的 STAGE 创建与入口读取命令原样为：

```sh
install -d -o root -g root -m 0700 "$STAGE"
chown -R root:qimao "$STAGE"
find "$STAGE" -type d -exec chmod 0750 {} +
find "$STAGE" -type f -exec chmod 0640 {} +
sudo -n -u qimao -- test -r "$STAGE/$entry"
```

本片一次隔离诊断实际记录：

- qimao uid/gid=`999/996`。
- 初始 STAGE：`/var/tmp/qimao-term-budget-fix-entry-76-stage|root:root|700|directory|4096`；namei 祖先 `/var/tmp` 为 `root:root 1777`，STAGE 为 `root:root 0700`。
- 规范化 STAGE：`/var/tmp/qimao-term-budget-fix-entry-76-stage|root:qimao|750|directory|4096`；namei 显示 STAGE 为 `drwxr-x--- root qimao`，祖先均可穿越。
- 第一入口 `backend/dist/modules/storage/s3-compatible-storage.js`：`root:qimao|640|regular file|37276`；namei 的 backend/dist/modules/storage 祖先均为 `root:qimao 0750`；`sudo -n -u qimao -- test -r` exit=`0`。
- 75 实际检查的第二入口为 `backend/dist/asr/tencent-asr-runtime.js`；`stat` 返回 `No such file or directory`，namei 在 `asr` 目录处断开，`qimao test -r` exit=`1`。
- 同一冻结 archive 的真实路径为 `backend/dist/modules/asr/tencent-asr-runtime.js`；manifest `fiveEntryImports` 也记录该完整路径，归档 `tar -tzf` 同样列出该路径。

因此，STAGE 根 `root:root 0750` 并非首因：第一个入口已证明 qimao 可穿越并读取。75 的 `entry_read` 是 runner 五入口列表第二项少了 `modules/` 导致的路径编排错误。

## root_cause

75 runner 将 manifest/archive 中的 `backend/dist/modules/asr/tencent-asr-runtime.js` 错写为 `backend/dist/asr/tencent-asr-runtime.js`，把“路径不存在”归类为 `entry_read`。候选 archive、解包、owner/group/mode 与 STAGE 祖先权限均无差量证据。

## minimal_fix

仅将 runner 五入口列表第二项改为 `backend/dist/modules/asr/tencent-asr-runtime.js`；这是引用既有 manifest/archive 路径的文字修正，不改变候选内容、bytes、SHA、owner、mode 或发布合同。

## residual

本片 SCP=1、root transient=1；仅执行隔离解包诊断，未发布、未切换 current/static、未重启 unit、未迁移、未访问 Secret、未调用 DeepSeek/Tencent/COS/业务 API。诊断 transient 已结束且 `LoadState=not-found`，固定 transfer/stage 均清理完毕；生产状态未触碰。

