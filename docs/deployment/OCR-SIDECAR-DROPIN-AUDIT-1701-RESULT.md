# OCR-SIDECAR-DROPIN-AUDIT-1701 结果

- `artifact_written`: `true`
- `outcome`: `passed`（审计完成；1700 的发布结果仍为失败回滚）
- `target`: `103.36.63.67`
- `next_owner`: `规划`
- `requires_user`: `false`
- `remote_mutation`: `0`

## 唯一首因

1700 的 `DROPIN_INSTALL_FAILED` 首因精确锁定为 runner 第 **369 行**：

```text
[ "$(systemctl show "$unit" -p WorkingDirectory --value)" = "$new_runtime/node" ]
```

runner 使用的两个 drop-in basename 为 `contract-1694-r1.conf` 与 `geometry-1628-r3.conf`。服务器自带 `systemd.unit` man 明确说明不同名 drop-in 按文件名字典序应用；本轮隔离 `/tmp` 合并诊断实际得到顺序：

```text
contract-1694-r1.conf,geometry-1628-r3.conf
```

后加载的 geometry drop-in 将 `WorkingDirectory`、`ExecStart`、`ReadOnlyPaths` 覆盖回 old runtime，因此 369 的 new-runtime 期望不成立；370 也会随后不成立，但不是首个失败。1700 摘要没有逐谓词 stderr，本结论来自同名文件、systemd man 语义及实际合并结果，未猜测。

## runner 348–374 逐项复核

| 行 | 检查/命令 | 审计结果 |
| ---: | --- | --- |
| 348 | new drop-in 不存在 | pass；回滚后 absent |
| 349 | new temp 不存在 | pass；回滚后 absent |
| 350–356 | 生成同五行 source（含三条 Service 路径指令） | pass；隔离 `/tmp` 生成成功 |
| 357–360 | drop-in 目录存在性/必要时创建 | pass；old geometry drop-in 目录存在 |
| 361 | `install ... 0644` 到 temp | pass；隔离 `/tmp` install 成功 |
| 362–363 | 标记并 `mv -Tf` 原子落盘 | pass；隔离路径生成/安装流程完成 |
| 364 | `systemd-analyze verify` | pass；真实 unit exit `0`，隔离同构 unit exit `0`、输出行 `0` |
| 365 | `systemctl daemon-reload` | 1700 首失败前后缺少逐谓词 stderr；本轮未执行 |
| 366–368 | current、User、Group | 恢复快照 pass：old current、`qima:qima` |
| **369** | effective WorkingDirectory 应为 new | **首个失败；字典序后加载 geometry，effective 为 old** |
| 370 | effective ExecStart 应为 new | 同一覆盖原因会失败，非首因 |
| 371–372 | old/new DropInPaths | 恢复快照仅 old；本轮不伪造 new manager 状态 |
| 373 | EnvironmentFiles | 恢复快照为既有 env 路径，值未读取 |
| 374 | new drop-in owner/mode | 回滚后 new absent；隔离文件生成使用受控 mode |

官方/本机语义证据：服务器 `systemd 252 (Debian 12)`；`systemd-analyze --help` 显示 `verify FILE... Check unit files for correctness`；`systemd.unit(5)` 明确不同名 drop-in 按 lexicographic order 应用。

## 远端恢复快照

- `current`：`/opt/qimao-terms-cloud/releases/ocr-media-error-20260831-r1`。
- new runtime、runtime stage、1694 `/run`、1694 inbound、env 临时/restore 文件、contract drop-in/temp：全部 absent。
- env 仅核验 metadata：`root:qimao:640:818`；未读取或输出任何值/Secret。
- old geometry runtime：`root:root:755`；entry `root:root:644:1139`；sidecar `root:root:644:28940`。
- OpenVINO：`active/running/0/0`；screen：`inactive/dead/0/0`；ASR/backend：`active/running/0/0`。
- old geometry drop-in：`root:root:644:257`；WorkingDirectory、ExecStart、ReadOnlyPaths 三条各出现 `1` 次；当前 `DropInPaths` 仅 old geometry。
- `/tmp/qimao-screen-text-*` 计数 `0`；远端 `systemd-analyze verify qimao-local-ocr-openvino.service` exit `0`。

## 范围与残留

本轮只读审计及隔离 `/tmp` 解析；未执行 SSH/SCP 上传、安装 `/etc`、daemon-reload、systemd restart/start、API、Provider、Worker、队列、DB、COS、route 或 budget 写入。隔离目录已自动删除，无残留。

`remaining_gap`：1694 runner 的 drop-in basename 顺序导致 369/370 覆盖问题；本轮不修改、不重放发布。若继续，需规划另行冻结单点修正并重新跑完整前门。
