# LOCAL-OCR-TEST-06A

日期：2026-08-28（Asia/Shanghai）  
角色：TEST  
outcome：blocked（Edge 文件选择权限）

## synthetic fixture

- run id：`localocr-20260828-030158-58e11ca7`
- 夹具目录（仓库外）：`C:\Users\ComradeGu\Documents\七猫兼职\_codex_tmp_localocr-20260828-030158-58e11ca7`
- MP4：1280×720、7.000 秒、23,635 bytes；画面为清晰大字 `LOCAL OCR TEST`。
- SRT：87 bytes、单条合法时间轴；未把字幕正文写入本报告。

## 页面行为与身份

1. 使用现有 Edge 登录态打开员工站，页面认证有效。
2. 仅提交一次项目创建；页面立即显示项目，`projectId=6ba2e19b-4935-470f-be63-39bfc60e8134`。
3. 素材页只读确认存在 1 个 `input[type=file]`，属性为 `accept=.srt,.mp4`、`multiple=true`、`webkitdirectory=true`。
4. 按 filechooser 规范尝试一次实际 input：等待 filechooser 后点击，3 秒内未触发 chooser。
5. 按页面可见“选择文件夹”入口再尝试一次；chooser 触发，但 `setFiles(叶目录)` 返回 `Not allowed`。未产生素材清单、manifest、UploadSession、COS 请求或业务批次。
6. 失败后只读确认页面仍为“尚未建立素材清单”；未继续点击、未重发项目创建、未进入画面字 batch。

## 业务身份

- projectId：`6ba2e19b-4935-470f-be63-39bfc60e8134`
- manifest：未创建
- batchId：未创建
- candidateId：未创建
- evidence endpoint：未产生
- UploadSession / Asset / COS object：未产生

## 结论与交接

- remaining_gap：Edge extension 未允许通过 file URL 设置本地目录；需在 Edge 扩展详情启用“Allow access to file URLs”。这是浏览器控制权限门，不是 OCR/Worker 产品失败。
- next_owner：PLANNING（协调权限恢复后由 TEST 重跑）；SERVER 需按上述 `projectId` 定点清理已创建的空项目。
- residual：本机夹具与本轮 Edge 临时标签在收尾时精确删除/关闭；远端空项目保留给 SERVER 清理。未创建 batch、候选或 COS 对象。
- requires_user：true（启用 Edge 扩展的 file URL 访问权限后再继续）。

## LOCAL-OCR-TEST-06L（2026-08-28）

角色：TEST  
outcome：blocked（指定批次未被页面投影，来源门禁阻断）

### 页面与刷新证据

- 仅使用现有 Edge Access 会话的自有临时标签打开：`/projects/ffbf5034-8fb5-4749-8c6d-d43c8b9caee8/screen-text`。
- 页面显示项目 `06K synthetic screen text`、术语版本 `V1 · 已固定`、画面字视频 `1 / 1 集就绪`。
- 当前批次稳定显示“尚未创建”，发布门禁为 `0 项待确认`，且“新建识别批次”禁用。
- 页面明确显示“来源门禁尚未满足 / 公司稿来源已经变化，请重新确认术语”。
- 刷新前后上述状态、数量和阻断文案一致；DOM 与 HTML 均未出现目标 `batchId=62e1018f-1e01-4763-9aef-3cb26ad990e6`。

### 目标身份与未完成门

- projectId：`ffbf5034-8fb5-4749-8c6d-d43c8b9caee8`
- batchId：`62e1018f-1e01-4763-9aef-3cb26ad990e6`（页面未投影）
- OCR candidate：0（未进入批次视图）
- PNG evidence：0 张可读；未请求 evidence endpoint
- 页面未显示 `review_pending`，因此无法证明 4 candidate 或 evidence `200 image/*`。

### 只读安全检查与交接

- console error/warn：0/0；可见页面无网络失败提示。
- 未点击确认、发布、重跑、删除或“处理上游门禁”；未修改数据、调用 AI 或访问其他项目。
- remaining_gap：规划需裁决为何已知 batch 身份未出现在指定项目页面（当前来源门禁把批次投影阻断）；不能据此判定 OCR 推理或 evidence 存储失败。
- next_owner：PLANNING（确定唯一数据/页面投影根因；必要时再交 TEST 复验）。
- residual：本轮临时标签已关闭；无业务写入或远端清理动作。
- requires_user：false。
