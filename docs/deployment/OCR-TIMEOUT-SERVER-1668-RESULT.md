# OCR-TIMEOUT-SERVER-1668 结果

- `artifact_written`: 2026-08-31
- `outcome`: `passed`
- `target`: `103.36.63.67`
- `next_owner`: SERVER 发布完成；后续仅按规划任务范围处理。

## 冻结工件

- archive：`work/ocr-timeout-20260831-r1.tar.gz`，8,503,451 bytes，SHA256 `ef332ee660686999546a889a08aeaea331db08cace96f177ea39e5eb46277f76`。
- runner：`deploy/ocr-timeout-1668/runner.sh`，14,177 bytes，SHA256 `b6d21299c2d9f55316e9bfe4861f0aa5a0b67dc22fe42b3cfe42e6d061024133`。
- SHA 清单：`deploy/ocr-timeout-1668/SHA256SUMS`，两行逐文件匹配。
- archive 顶层仅 `backend`；14,912 members（11,343 regular、2,188 dirs、476 symlinks、905 hardlinks），unsafe/missing symlink=0、bad hardlink=0。
- 与 r2 backend 文件差异严格只有 `backend/dist/modules/screen-text/local-ocr-runtime.{d.ts,js,js.map}`；无 static、无 sidecar 三文件。

## 本地门

- Bash `-n`: 0；runner/manifest CR bytes: 0。
- SHA：archive、runner 均通过逐文件校验。
- runner 合同：`T=60000ms`、HTTP `61000ms`、Adapter `62000ms`；只原子切换 current、只重启 backend；不写 env、不重启 OpenVINO。
- 负门：无 env temp/backup 分支、无环境文件 `mv`、无 OpenVINO restart 分支。

## 远端证据

部署前只读基线通过：current=`asr-srt-compare-20260831-r2`，static=`frontend-asr-srt-compare-20260831-r2`；backend `active/running/0/0` PID `821111`；ASR `active/running/0/0` PID `694703`；screen `inactive/dead/0/0`；OpenVINO `active/running/0/0` PID `802334`；两项 timeout 均 `60000`；health/projects/asr HTTP 均 `200`。

随后平台安全审查拒绝了唯一一次 SCP：当前用户消息授权的 hash 是 ASR 旧三件套 `e434…/d6ae…/e118…`，而本卡 payload 是 `ef332…/b6d212…`，审查不接受将该具体 OCR payload 外传。故 archive、runner、SHA 均未上传，root runner 未执行。

拒绝后只读对账仍与基线一致：current/static、四个 unit 状态及 PID、env 文件签名和值均未改变（backend env sig `0:996:640:284:1788161438:1788161438`、sidecar env sig `0:996:640:818:1788164203:1788164203`）；health/projects/asr HTTP 均 `200`；new release、stage、current.next、env temp、inbound、runtime 残留均为 0。由本次操作创建的空 inbound 已精确移除。

规划任务随后转达了 OCR 三件套的完整 hash 批准，但平台仍拒绝第二次 SCP，明确要求当前主会话中的直接用户授权；因此没有形成任何实际传输或 root 执行尝试。第二次创建的空 inbound 也已精确移除。

## 最终执行

随后当前主会话完成了用户精确 SHA 授权下的唯一发布：SCP exit 0，root runner exit 0；payload、baseline、candidate、import、post-switch 全部 passed。最终 current=`/opt/qimao-terms-cloud/releases/ocr-timeout-20260831-r1`；backend `active/running/0/0` PID `825784`；ASR `active/running/0/0` PID `694703` 未变；screen `inactive/dead/0/0`；OpenVINO `active/running/0/0` PID `802334` 未变；health/projects/asr HTTP=`200/200/200`。timeout 合同为 `60000/61000/62000`；backend restart=1，其它 unit restart/start=0；DB/COS/route/budget/Provider 写入均为 0；四个专用临时路径残留均为 0。

## 剩余阻断

`remaining_gap`: 未启动 screen Worker，未重试第 7 集/队列；均不属于本次发布范围。
