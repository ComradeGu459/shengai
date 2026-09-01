# TENCENT-ASR-SERVER-03F 结果

## outcome

`blocked`

固定 WAV 与候选加载门通过，但 backend 切换健康门失败；已精确回滚到 06K 并清理本轮配置/候选/临时件。未创建 03F Tencent deployment、budget、route 或 synthetic 业务身份。

## evidence

### 固定输入

- 唯一官方 master WAV GET 已执行一次，30 秒门通过。
- 文件为 129998 bytes，SHA-256=`07805781706572202743fa5466187edb6b5410e0678ec162b7ae05f4ae271826`，容器为 RIFF/WAVE。
- 未换源、未重复下载、未使用真实用户素材。

### 候选与加载

- 当前树 production deploy 执行一次，staging 为 12,117 文件、44,018,243 bytes、487 个 Junction。
- 按 03C 已证实依赖装配生成实体候选：89,986 文件、249,791,638 bytes、links=0；实体化耗时约 158 秒，未超过 8 分钟/2 GiB 资源门。
- 本机 8 项关键包 resolve、ASR runtime/adapter、S3 storage、ASR Worker、backend import 全部通过；使用 Node 24.19.0，Tencent SDK 4.1.298。
- 唯一 archive 为 48,546,326 bytes，SHA-256=`95b1312fc7cb11b20b927483bf6a47dbeeddd95dca0a97aa0dcd90819e88607b`。服务器解包为 89,986 文件、249,791,638 bytes、links=0；`/usr/local/bin/node` 的同一 8 项 resolve/5 项 compiled import 全部通过。

### Secret 与部署门

- `SecretKey.csv` 只在受保护临时传输链读取；远端 CSV 已删除。ASR env 曾以 root:qimao/640 安装，region=`ap-shanghai`、签名 TTL=600、price=`1.75`；Secret 值未进入仓库、结果或日志。价格依据为[腾讯云普通录音文件识别计费说明](https://cloud.tencent.com/document/product/1093/35686)。
- 唯一 03F release 安装后，原子切换 current 并重启 backend；backend 在健康窗口内未监听 3001。既有 error log 报告 ESM `ERR_MODULE_NOT_FOUND`：`typebox` 从 `@fastify/type-provider-typebox` 加载失败。未据此猜测或继续改包。
- 同一回滚脚本恢复 current=06K；随后移除本轮 ASR unit、backend drop-in、ASR env、release 与远端临时目录，并恢复原 backend unit。最终 backend active/running、health=200、NRestarts=0；screen-text、upload completion、project cleanup、OpenVINO 均 active。

### 最终状态与无业务写入

- current=`20260828-local-ocr-06k-r1`；03C 历史 deployment 仍为 disabled，旧 route/budget 状态仍为 retired。
- active ASR route pointer=0；active budget pointer=0；`tencent_cloud_recorded_v1` 历史 deployment count=1（仅 03C disabled 历史）。
- `server-03f-synthetic` project=0；未调用 production public API、COS、Tencent `CreateRecTask`/Describe，也没有 TaskId、业务 job/attempt/candidate/log/budget 或付费金额产生。
- 本轮不重复 02L provider 探针，不改 frontend/OCR/upload/Nginx/公网边界，不改业务源码或 migration。

## remaining_gap

唯一剩余阻塞是服务器 release 的 ESM 依赖加载身份/布局问题：远端静态文件与临时 Node import 门通过，但 backend 以 systemd 运行时仍报告 `typebox` 缺失，故无法安全启动 03F，也未能进入真实 ASR synthetic 闭环。根因尚未进一步猜测或修补。

## next_owner

`规划/SERVER`：先审计 systemd 运行时与发布树的 ESM package-resolution 差异，形成唯一修正方案；必要时再由 BACK 审核打包合同。修正前不得重跑 deployment、公开 API 或 ASR。

## files

- [TENCENT-ASR-SERVER-03F-RESULT.md](C:/Users/ComradeGu/Documents/七猫兼职/qimao-terms-cloud/docs/deployment/TENCENT-ASR-SERVER-03F-RESULT.md)
- 本轮未修改 BACK/FRONT/UI/TEST 业务源码、migration、route/provider 源码或公网配置；其他脏工作树改动均保留。

## residual

- 服务器 active Tencent route/budget/unit/env/release：0。
- synthetic DB/COS/Tencent task 残留：0；本机/远端本轮临时件：0。
- 仅保留 03C disabled/retired 控制面历史记录与 06K 原有运行状态。

## requires_user

需要规划重新签发新的修正任务卡后才能继续；本轮不盲目重试，不创建第二个 release、控制面或 ASR 任务。
