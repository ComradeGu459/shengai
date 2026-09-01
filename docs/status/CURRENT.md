# 当前项目活跃快照

最后更新：2026-09-01
目标状态：`objective_status=blocked`
下一责任：`next_owner=USER`
正式 execution lease：`0`

## 当前目标

- 把已通过本地验收的员工画面字候选审改能力发布到现有生产环境，再做一次真实员工页面只读验收。
- 不重做 OCR 引擎、管理员调参、ASR、上传、控制面或业务状态机。
- OCR v2（`1200ms/480帧`）已创建但未切换 active route；本目标不启动 OCR Worker 或新识别任务。

## 唯一阻塞与下一步

- `screen-text-review-20260901-r1` 候选已冻结但尚未部署；最近一次动作在进程启动前被平台外部写入确认门拒绝，服务器写入与残留均为 0。
- 唯一恢复动作：用户在“测试服务器｜长期固定”任务中直接确认消费 [ACTIVE_RELEASE](ACTIVE_RELEASE.md) 索引的冻结输入并执行一次可回滚发布；SERVER 随后按原身份继续，不重冻、不重测、不重传。
- 该确认到达前不得重发、另建候选、修改服务器或把本地测试描述为生产通过。

## 生产基线

- 上传：私有腾讯 COS multipart 与后台恢复已上线；当前项目 102/102 个物理文件、5.17 GB、上传失败 0。
- 术语/热词：confirmed TermVersion 可锁定到 ASR；无 confirmed 版本时允许无热词运行并明确标记。
- ASR：Worker active；预算默认只统计/提醒，只有管理员显式启用才阻断。
- OCR：OpenVINO active；screen-text Worker 当前停止，队列无 queued/running；结果为 45 review_pending、5 failed、1 reconciliation_required。
- 后续流程：前置审改、字幕验收来源与不可变 Release 已上线，但当前真实项目最终人工验收仍未完成。
- 当前生产 release：backend `admin-summary-20260901-r1`；管理员站 `system-frontend-admin-summary-20260901-r1`；员工站 `frontend-asr-budget-default-off-20260901-r1`。

## 当前发布与证据

- 当前/待发布入口统一见 [ACTIVE_RELEASE.md](ACTIVE_RELEASE.md)；压缩前快照见 [CURRENT-v4-1761-2026-09-01.md](archive/CURRENT-v4-1761-2026-09-01.md)。
- 生产管理员摘要发布通过，且未重启 ASR/OpenVINO、未启动 screen Worker。
- 员工画面字候选后端与前端联合专项、两端 typecheck、员工站 production build 与目标 diff-check 已通过。
- 待发布候选的声明、SHA 闭集、归档边界、portable backend、validator 与 runner 本地门已通过。
- 最近一次动作结果只证明平台确认缺失和外部写入为 0，不证明候选已部署或真实员工流程已通过。

## 固定角色

| 角色 | 当前状态 | 下一职责 |
| --- | --- | --- |
| 规划 | active | 维护本页、审核发布结果与最终验收 |
| BACK | idle | 候选后端已验收，禁止无任务继续修改 |
| FRONT | idle | 候选前端已验收，禁止无任务继续修改 |
| UI | idle | 交互基线已冻结 |
| TEST | idle | 发布后按需做真实员工页验收 |
| SERVER | blocked | 等待动作任务内一次精确外部写入确认 |
