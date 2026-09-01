# TENCENT-ASR-SERVER-03C 结果

## outcome

`blocked`

部署候选和 Tencent 控制面曾完成受控创建并通过静态/零网络连接门，但唯一 synthetic 在固定 WAV 读取门无进展后被停止；未发生业务创建、COS 写入或 Tencent `CreateRecTask`。随后已完整回滚到 06K，未保留活动 ASR 配置。

## evidence

### 1. 前置与候选

- 回滚前 current 为 `20260828-tencent-asr-03c-r3`；回滚后精确恢复为 `20260828-local-ocr-06k-r1`，保留 05G-R4 作为既有历史回滚点。
- 当前树 production deploy 仅执行一次。最终物理化候选归档 SHA-256=`8c4e0f3fec55e30ad74caefef1ccd8ce7ac77e2a6f04440433a321efb48e786f`；远端候选 release wrapper 为 85,634 个文件、228,295,982 bytes、symlink=0，权限为 root:qimao/0550。Node=`v24.19.0`，Tencent SDK=`4.1.298`。
- 13 项加载门全部通过：Tencent SDK、AWS S3/presigner、Tus 运行依赖、compiled ASR runtime、Tencent adapter、S3 storage、ASR Worker 和 backend 入口均可解析/导入。前期 r1–r5 的远端导入缺依赖尝试均已删除，未作为活动 release 保留。
- ASR env 曾以 root-only 受保护文件加载，区域为 `ap-shanghai`、签名 TTL=600 秒，并显式设置 `QIMAO_TENCENT_ASR_PRICE_CNY_PER_HOUR=1.75`；Secret 值未写入本结果、仓库或日志。价格依据为[腾讯云普通录音文件识别计费说明](https://cloud.tencent.com/document/product/1093/35686)。

### 2. 控制面与运行门

- 唯一 deployment=`33ff4677-8ece-475a-beeb-ee750f550661`，version=`585c969e-ce61-4fff-ac1f-86416c650064`；adapter 为 `tencent_cloud_recorded_v1`。
- 唯一 connection test=`eb906581-37b2-4987-a35d-de0bd23bcde8`，结果为 `succeeded`、attemptCount=1。使用同一运行时 registry 做零网络 config/registry probe，未调用 Tencent provider。
- 唯一 budget policy=`b6031a67-253d-450b-a0aa-4cf3581f6b44` 曾发布为 active；规则仅覆盖 `asr_api`、CNY、month，warningLimit=`8.75`、hardLimit=`17.50`。
- 唯一路由=`ac4018b7-d895-4382-a2e6-5b663f6f05fb` 曾发布为 active，ASR target 数量=1，未新建 OCR target、Provider、CORS 或公网边界。
- 切换期间 backend、ASR Worker、system-control Worker、screen-text Worker、upload completion Worker、project cleanup Worker、OpenVINO 均通过 active 门；backend/ASR Worker 的 NRestarts 均为 0。

### 3. synthetic 门与停止事实

- 固定官方 WAV 只尝试读取一次；远端 HTTPS read 启动后超过受控等待窗口无进度，未生成可用 WAV 文件，按停止条件终止精确执行进程。
- 停止时已确认：`server-03c-synthetic` project=0；COS object=0；Tencent `CreateRecTask`=0；TaskId=0；业务 job/attempt/candidate/log/budget=0。未重试固定下载、未重建 synthetic、未重发任何未知写命令。
- 本机已知固定 WAV 位置均不存在；未使用真实用户素材。

### 4. 回滚与最终状态

- active ASR route pointer=0；active budget pointer=0；deployment status=`disabled`；route 最新状态=`retired`；budget 最新状态=`retired`。
- ASR Worker unit、backend ASR drop-in、ASR env、03C r2/r3 release、r6 远端临时树均已删除；远端 synthetic/control helper 与 WAV 临时件均 absent。
- 回滚后 backend health=`200`、NRestarts=0、current=`20260828-local-ocr-06k-r1`；backend、system-control、screen-text、upload、project-cleanup、OpenVINO 均 active，未改变 OCR/upload/Nginx/公网边界。
- 本轮本地 staging、physical tree、archive-check、tar-test、r1–r6 archive 和临时脚本均已按 junction-aware 精确清理；`qimao-asr-03c*` 本地残留=0。

## remaining_gap

唯一未完成项是“固定 synthetic WAV → 业务 Worker → COS 短签名 → 恰好一次 CreateRecTask → Describe 同一 TaskId → completed → cue/质量/日志/预算金额”的真实闭环。失败发生在固定 WAV 可读性门，未进入业务写入，因此没有可供查询的 Tencent task 身份或 COS 对象。当前生产 `AsrService` 的公开创建入口仍受 production fake-disabled 门约束，本轮未改业务代码，也未宣称公开 API 已完成真实 ASR 闭环。

## next_owner

`规划/BACK`：提供同一 SHA 的可访问固定 WAV（或冻结一次新的受控输入来源），并先决定真实闭环是否必须经过生产公开 API；如需解除 production fake-disabled，应另发 BACK 范围任务。`SERVER` 在此条件前保持 blocked，不再盲目重试 ASR。

## files

- [TENCENT-ASR-SERVER-03C-RESULT.md](C:/Users/ComradeGu/Documents/七猫兼职/qimao-terms-cloud/docs/deployment/TENCENT-ASR-SERVER-03C-RESULT.md)
- 本轮未修改 BACK/FRONT/UI/TEST 业务源码、migration、route/provider 源码或公网配置；仓库其他脏改动均保留未动。

## residual

- 活动配置残留：0（无 active Tencent route、budget、unit、env 或 release）。
- synthetic DB/COS/Tencent task 残留：0；本机/远端本轮临时件：0。
- deployment/version、budget policy、route 及审计状态行作为不可变控制面历史仍保留，但已分别为 disabled/retired，不是活动配置，也不是 synthetic 业务残留。

## requires_user

需要规划提供可在受控边界内读取的同一固定 WAV，或批准一张新的明确执行卡；不得要求本任务盲重跑。若闭环必须使用公开业务 API，还需要 BACK 先处理 production fake-disabled 的授权/实现问题。
