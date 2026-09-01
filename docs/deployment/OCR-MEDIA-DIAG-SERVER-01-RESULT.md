# OCR-MEDIA-DIAG-SERVER-01

## artifact

```yaml
artifact_written: true
outcome: blocked
requires_user: false
```

## evidence

- 目标 batch：`c82ea8b2-ff3a-4c3b-be2a-fedcab47ce25`；仅选择该 batch 按 episode 顺序的第一条 `failed` job，未输出 job、asset、对象键、文件名或素材内容。
- 计数（同一只读诊断查询、停止 Worker 前）：`queued=13`、`running=1`、`failed=37`。
- presigned GET：同一失败 job 的权威 Asset 身份生成一次短时 GET；HTTP status=`200`；Content-Length=`156739874`；实际流式接收长度=`156739874`；与数据库声明长度匹配=`true`。URL、Secret、对象键和响应正文均未落盘或输出。
- frame-extractor：未真正启动。诊断进程使用 backend/object-storage 环境后，缺少 `QIMAO_SCREEN_TEXT_FRAME_EXTRACTOR_BIN`，因此无法构造既有 extractor 子进程；记录的安全分类为 `EXTRACTOR_ENV_NOT_AVAILABLE`，没有素材帧结果，也没有 OCR 调用。
- 临时目录：因 extractor 环境门在创建前失败，未创建媒体临时目录；本地诊断脚本已精确删除。未产生帧、manifest 或媒体残留。
- 止损：按补充指令仅执行 `systemctl stop qimao-worker@screen-text.worker.entry.js.service` 一次；命令 exit=`0`。随后只读确认 `ActiveState=inactive`、`SubState=dead`、`MainPID=0`、`NRestarts=0`、`ExecMainStatus=0`。
- 本片没有重试/重建 batch，没有数据库写入，没有 backend/ASR/OCR provider 调用，没有 COS 写入，没有服务重启；两个 malformed read-only shell quoting 尝试未执行 SQL（随后未再扩大查询路线）。

## root_cause

`DIAG_HARNESS_ENV_INCOMPLETE`：presigned GET 与对象长度合同通过；抽帧阶段不是媒体内容失败，而是一次性诊断进程没有继承 canonical screen-text Worker 所需的 frame-extractor 环境变量，故不能声称已完成抽帧或归因于素材。

## next_action

`PLANNER`：先只读恢复 canonical Worker 的完整 EnvironmentFile/既有 extractor 路径事实；在下一片以同一失败 job、同一对象身份、一个临时目录和一次 extractor 为边界完成抽帧门。Worker 保持停止，只有 extractor 配置可读、媒体长度/SHA 门和停止条件均明确后，才恢复运行。

## residual

- 生产 screen-text Worker 当前为 `inactive/dead`，停止是本片唯一服务状态变更；batch 仍保留其已有 `13 queued + 1 running + 37 failed` 观测事实，本片未修改任何 batch/job/attempt。
- Backend、ASR Worker、OpenVINO sidecar 未由本片操作；其当前运行事实未在本片重新探测。
- 服务器无本片媒体临时目录、帧文件或抽帧 manifest 残留；无 Provider/COS/业务 API 写入。

