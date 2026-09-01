# UPLOAD-COS-REAL-PAGE-ACCEPTANCE

日期：2026-08-26（Asia/Shanghai）  
切片：`UPLOAD-COS-TEST-10`  
浏览器：Codex 内置浏览器，单一 TEST session 标签

## 结果

`slice_outcome=failed`。本轮使用全新项目和全新上传命令意图；项目创建、manifest 保存和一次上传确认均完成，但两个物理文件都在创建 multipart 会话前失败。按门立即停止，未重试创建、未执行 PUT/ETag/complete。

## 业务身份与页面证据

- 项目名称：`Synthetic COS 20260826-test10-mt9zcjn2-65fgql2r`
- projectId：`c38f8e0b-f392-4394-9601-3da7ce7b084d`
- manifest：v1；1 集、2 个物理文件、3 个角色绑定；普通 MP4 同时绑定“中文识别视频”和“画面字视频”，页面标记“共享文件 · 上传一次”。
- 本地夹具：`C:\Users\ComradeGu\Documents\七猫兼职\_codex_tmp_test09-20260826-iab2-b50b43449a`；MP4 精确 16,778,240 bytes，SRT 70 bytes；仅合成数据。
- 页面在一次“确认并开始上传”后显示“已确认 2 个物理文件”；两行终态均为“失败”，详情均为“传输方式 尚未创建”“已确认分片 0 / —”。

## 创建失败证据

| 文件 | 页面请求标识（脱敏） | 稳定 provider code | 页面错误投影 |
| --- | --- | --- | --- |
| `episode-01-subtitles-20260826-iab2-b50b43449a.srt` | `52d337a7-ce77-4036-ad3a-37d3b6919818` | 页面未显示，不能推断 | `对象存储配置或请求未被接受，请联系管理员。` |
| `episode-01-video-20260826-iab2-b50b43449a.mp4` | `a94c6f1a-71d6-4416-89ff-61ffb531a555` | 页面未显示，不能推断 | `对象存储配置或请求未被接受，请联系管理员。` |

IAB 页面接口不提供 Network 状态、响应 JSON 或 commandId；本轮未读取 Secret、签名 URL、浏览器存储，也未连接服务器。故无法把上述请求标识冒充 commandId 或 provider code。需 SERVER 依据 projectId、文件身份和请求标识从候选日志/数据库映射实际稳定分类及 HTTP 状态。

## 未发生与残留

- 未发生：UploadSession、COS multipart、任何 COS PUT、ETag、part confirm、complete=202、Worker completed、Head、Asset 或绑定写入；未观察到 TUS/server_relay 回退。
- 写次数：项目创建 1 次；manifest 保存 1 次；上传分配确认 1 次；创建失败后无重发。
- 远端：synthetic 项目及 manifest 保留，供 SERVER 按 `projectId` 定点对账和清理；当前页面证据显示无上传会话/对象/Asset。
- 本机：合成夹具保留；未修改生产代码、未部署、未连接服务器；工作树只新增本报告。

## 交接

- `remaining_gap`：确认两个 create 请求的真实 HTTP 状态、稳定 provider code、commandId/UploadSession 是否确实为零，并完成远端精确清理。
- `next_owner=SERVER`
- `requires_user=false`

## TEST-12A 组合回执

日期：2026-08-26（Asia/Shanghai）  
浏览器：Codex 内置浏览器，同一 IAB 会话临时标签（tab `10`）；未使用外部浏览器。

### 结果

`outcome=blocked`。复用项目 `4e179c3b-d6c7-40f6-8552-e9d414cf7c32`，素材页只读枚举到 1 个 `input[type=file]`，属性为 `webkitdirectory=true`、`multiple=true`。按官方顺序仅点击该实际 input 一次；filechooser 等待超时，因未获得 chooser，未执行 `setFiles`。页面仍显示“尚未建立素材清单”，不再重试。

### 业务与残留

- 项目名称：`Synthetic COS 20260826-test12-mta2irua-mmq8wzi8`
- 叶目录目标（未成功传入）：`C:\Users\ComradeGu\Documents\七猫兼职\_codex_tmp_test09-20260826-iab2-b50b43449a\episode-01-20260826-iab2-b50b43449a`
- 未形成 manifest，未验证 1 集/2 物理文件/3 角色；未发生 manifest 保存、上传确认、create/authorize、COS PUT/ETag、complete、Worker、Asset 或 TUS/server_relay。
- provider code、requestId、commandId、UploadSession 均无可取证；未连接服务器、未读取 Secret、未部署。
- 远端项目保留供 SERVER 按 projectId 定点清理；本机 synthetic 夹具保留且未修改。
- `remaining_gap`：IAB filechooser 控制层在实际 input 上仍无法建立 chooser，无法进入公网上传产品门；需 PLANNING 裁决控制通道。产品门：未通过（未进入验证）。
- `next_owner=PLANNING`（SERVER 仅负责后续定点清理）
- `requires_user=false`

## TEST-12 组合回执

日期：2026-08-26（Asia/Shanghai）  
浏览器：Codex 内置浏览器单一标签（tab `9`），未使用外部浏览器。

### 结果

`outcome=blocked`。本轮按要求创建了新的 synthetic 项目；项目素材页原生目录 chooser 仅调用一次并提交叶目录路径，但 filechooser 等待超时，页面仍为“尚未建立素材清单”。根据停止门未再次选择、未保存 manifest、未确认上传。

### 页面与业务身份

- 项目名称：`Synthetic COS 20260826-test12-mta2irua-mmq8wzi8`
- `projectId`：`4e179c3b-d6c7-40f6-8552-e9d414cf7c32`
- 页面：`https://milaidi.online/projects/4e179c3b-d6c7-40f6-8552-e9d414cf7c32/materials`
- 项目中心显示项目列表由 4 部增至 5 部并出现该项目；创建按钮仅点击一次。IAB 未暴露 HTTP 状态或 requestId，不能将页面可见成功冒充为 201 网络证据。
- chooser 目标（仅一次）：`C:\Users\ComradeGu\Documents\七猫兼职\_codex_tmp_test09-20260826-iab2-b50b43449a\episode-01-20260826-iab2-b50b43449a`
- 既有合成夹具保持不变：70-byte SRT；16,778,240-byte MP4。未读取或上传文件内容。

### 未发生与残留

- 未形成 manifest，故未验证 1 集/2 物理文件/3 角色、共享 MP4 或 SRT 独立绑定。
- 未发生上传确认、create/authorize、COS PUT/ETag、part confirm、complete=202、Worker、Head、Asset 或 TUS/server_relay。
- 无 provider code、requestId、commandId 或 UploadSession 可取证；未连接服务器、未读取 Secret、未部署。
- synthetic 项目保留供 SERVER 按 `projectId` 定点清理；本机夹具保留且未修改；未覆盖 TEST-10 事实。
- `remaining_gap`：IAB 原生目录 filechooser 在本轮未完成，无法取得公网大视频可用性或 provider 结论；需后续规划裁决浏览器控制层。
- `next_owner=SERVER`
- `requires_user=false`

## TEST-12B 组合回执

日期：2026-08-26（Asia/Shanghai）  
浏览器：Codex 内置浏览器，同一 IAB 会话临时标签（tab `11`）；未使用外部浏览器。

### 结果与页面证据

`outcome=passed`（页面层上传流程）。复用项目 `4e179c3b-d6c7-40f6-8552-e9d414cf7c32`，新叶目录选择成功，manifest 保存一次；上传页对 SRT、MP4 各绑定一次，上传确认只点击一次。

- manifest：v1；页面显示 1 集、2 个物理文件、3 个角色槽；普通 MP4 同时为 `中文识别视频` 与 `画面字视频`，标记“共享文件·上传一次”。
- 总体状态：项目状态 `ready`；整批 `100%`（16.0 MB / 16.0 MB），失败 `0`，物理文件 `2`；两个行项目均“已完成 / 服务端已确认 100%”。
- SRT：传输方式 `multipart`，已确认分片 `1 / 1`，缺失分片“无”，最近错误“无”。
- MP4：传输方式 `multipart`，已确认分片 `2 / 2`，缺失分片“无”，最近错误“无”；文件大小页面显示 `16.0 MB`（夹具精确 16,778,240 bytes）。
- 页面未出现 TUS、server_relay、回退或重复上传提示；无重试操作。

### 证据边界与产品门

IAB 页面只暴露上述 multipart 分片计数和完成状态，不提供 HTTP/ETag、authorize/part-confirm/complete 请求明细、UploadSession/object key、Worker 终态或 Asset ID。因此本轮不能把页面完成状态冒充为直接观察到的两次 COS PUT/ETag、`complete=202` 或 2 Asset/3 角色数据库证据；需 SERVER 依据本项目身份做只读对账。

- `product_gate`：页面上传成功门通过；“公网大视频可用”完整证据门尚未闭合（等待 SERVER 验证 PUT/ETag、202、Worker、Head、2 Asset/3 绑定）。
- `remaining_gap`：补齐同一 projectId 下 UploadSession/object/part/ETag/complete/Worker/Asset 的服务端或 COS 对账，并确认无隐藏重复写。
- `next_owner=SERVER`
- `requires_user=false`

### 文件与残留

- 本轮实际仓库改动仅本报告；未修改生产代码、未连接服务器、未读取 Secret、未部署。
- synthetic 项目、UploadSession/COS object/Asset（如已存在）均保留，交 SERVER 按 `projectId` 定点复核和清理；本机合成夹具保留且未修改。

## UPLOAD-COS-PROD-02-TEST 发布后冒烟

日期：2026-08-26（Asia/Shanghai）  
浏览器：Codex 内置浏览器单一标签（tab `12`）；未使用外部浏览器或原生选择器。

### 结果与证据

`outcome=passed`（页面冒烟层）。使用新建 synthetic 项目，创建项目、manifest 保存、上传分配确认均各一次。

- 项目名称：`Synthetic COS 20260826-prod02-mta49qb8-ijscpreo`
- `projectId`：`173f7784-0936-44a3-a8ae-5007b893390a`
- 夹具目录：`C:\Users\ComradeGu\Documents\七猫兼职\_codex_tmp_test09-20260826-iab2-b50b43449a`
- 夹具：70-byte SRT + 16,778,240-byte MP4（>16 MiB），仅匿名 synthetic 数据。
- manifest：1 集、2 个物理文件、3 个角色；MP4 同时绑定 `asr_video`/`screen_video`，页面显示“共享文件·上传一次”；SRT 独立。
- 页面终态：项目状态 `ready`；整批 `100%`（16.0 MB / 16.0 MB），失败 `0`，物理文件 `2`；SRT 与 MP4 均“已完成 / 服务端已确认 100%”。
- 展开详情：SRT 传输方式 `multipart`、已确认分片 `1 / 1`；MP4 `multipart`、已确认分片 `2 / 2`；两者缺失分片均“无”、最近错误均“无”。
- 未出现 TUS/server_relay、回退或重试；页面只显示上述分片计数，不显示完整请求链或签名信息。

### 产品门、缺口与残留

- `product_gate`：发布后页面 multipart 冒烟门通过（100%/0 失败/服务端确认）；“公网大视频可用”完整门仍需 SERVER 以同一 `projectId` 对账 authorize、两次 COS PUT/ETag、part confirm、`complete=202`、Worker、Head 及 2 Asset/3 角色。
- `remaining_gap`：IAB 不暴露 HTTP 状态、ETag、UploadSession/object identity 或 Asset ID，不能将页面完成状态冒充为这些网络/数据库证据。
- `next_owner=SERVER`
- `requires_user=false`
- 文件：本轮仅更新本报告；未修改生产代码、未部署、未连接服务器、未读取 Secret。
- 残留：synthetic 项目及其 UploadSession/COS object/Asset（如存在）保留，交 SERVER 按 `projectId` 定点复核与清理；本机夹具保留且未修改。

## 正式发布终态

日期：2026-08-26（Asia/Shanghai）  
范围：PROD-01 no-op promotion、PROD-02 页面冒烟、PROD-03 服务端/COS 对账、PROD-04 清理。

### 终态结论

`outcome=passed`。同一不可变候选的正式公网大视频产品门关闭为通过：PROD-01 no-op promotion 已通过；PROD-02 页面达到 100%/0 失败；PROD-03 对账得到 2 UploadSession、3 个 ETag、2 个 completion jobs、2 个 Asset、3 个角色绑定且无重复写；此前候选已有双 Head=200 且长度匹配明细。

首次清理脚本因把字符串 `"404"` 与数字 `404` 比较而误报 partial，但该输出属于证据输出差口而非产品失败；远端复核最终确认残留为 0。PROD-04 已精确删除本机 synthetic 夹具并确认 IAB 标签残留为 0。

### 文件、行为、验证与残留

- `files`：仅追加本报告；未修改生产代码、测试代码或其他文档。
- `behavior`：正式候选公网 multipart 上传链可用；页面、COS/DB 对账与清理均达到发布门。
- `verification`：本报告限定 `git diff --check` 通过；PROD-01/02/03/04 事实均来自本轮已登记的发布、页面、服务端/COS 对账与清理结果。
- `residual`：远端项目、UploadSession、对象、Asset 及本机夹具/标签均为 0。
- `remaining_gap`：无产品缺口；仅保留脚本输出类型比较的记录性说明，不影响发布结论。
- `next_owner=SERVER`
- `requires_user=false`
