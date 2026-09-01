# EMPLOYEE-FULL-FLOW-IAB-01

## outcome

`closed-observation-only`。2026-08-30 使用 Codex 内置浏览器和全新匿名一集合成素材检查员工页面；上传与术语通过，生产 ASR 接线不完整。该项目不再承担AI验收，不创建ASR/OCR批次、不触发付费Provider。

## passed evidence

- 项目：`IAB完整流程验收-20260830-01`，ID=`7df29118-056f-4709-a340-74f8c080268f`。
- 素材清单 V1：1 集、3 项角色绑定、2 个物理文件；同一 `1.mp4` 同时绑定中文识别视频与画面字视频，页面明确显示“共享文件 · 上传一次”。
- COS 页面上传：100%，2 个物理文件，待处理 0，失败 0，项目状态变为 ready。
- 术语：一次提取得到`顾清河/云岚城/星河门`三项，分别为人名/地名/组织名；3 项批量确认成功并创建不可变 TermVersion V1，页面无 console error/warn。

## blocking evidence

- 员工 ASR 页明确展示“模拟识别 / 零外部网络”，所有创建入口及最终确认文案均为模拟批次。
- SERVER-02后续只读审计证明OCR已有唯一active route、screen-text Worker与OpenVINO sidecar；ASR仍缺active `asr_api` target、effective budget pointer，canonical Worker为inactive。
- SERVER-54 是隔离数据库/临时运行环境的真实 DeepSeek→腾讯 ASR synthetic，结果已清理且明确“未修改生产 route/current”；不能替代员工生产入口验收。
- 画面字页已证明术语 V1 与 1/1 视频门禁满足，但在生产 Worker 接线未冻结前未创建批次，避免把独立引擎 synthetic 误报为员工站闭环。

## remaining gap / next owner

- SERVER：先只读核对现有 release、root-only env、active route/budget 与 unit；若现有代码已具备能力，直接复用既有控制面并启动 ASR/OCR Worker，不新建架构或重复 Provider 探针。若缺代码则明确阻断并交 BACK，禁止服务器现场补源码。
- FRONT：直接消费既有 `AsrBatchPreparation.provider/adapter/model`，删除硬编码“模拟识别/零外部网络”及错误确认文案；未知写结果仍只读同一批次。
- BACK：仅在 SERVER 证明现有 release 缺少必需生产能力时接手最小代码缺口；不得重做控制面、状态机或 Provider。
- TEST/PLANNING：不再用本匿名项目创建AI任务。最终验收只在用户主动对自己的真实项目/真实素材创建任务时进行，并从已有生产状态继续观察。

## residual

测试项目与匿名夹具只读保留；未访问用户真实素材，未创建 ASR/OCR 批次，未调用腾讯 ASR/OCR，未删除云端项目或对象。
