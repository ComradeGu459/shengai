# TENCENT-ASR-SERVER-103-FULL-SYNTHETIC

## outcome

blocked。唯一 full Execute 未开始；Preflight 在 archive SHA 门返回 `ARCHIVE_SHA_MISMATCH`。

## evidence

- RunId：`asr-103-20260829-r1`
- 使用路径：`C:\tmp\qimao-terms-cloud-asr-100-candidate-20260829.tar.gz`
- 期望 SHA：`d2cacb4f7f26152a63347de08b12c1f020e17113d3379be2f613a0575a6fa6a9`
- runner 结果：`outcome=blocked`、`code=ARCHIVE_SHA_MISMATCH`、`stage_code=ARCHIVE_SHA_MISMATCH`
- 计数：`network_actions=0`、`external_writes=0`；未执行 CreateRecTask、DescribeTaskStatus 或 full synthetic。

## cleanup

本轮未创建远端 root、隔离 DB、COS 对象或本机 media；无 runner cleanup 事件，无需清理。指定 candidate 按要求保留。

## residual

candidate 保留在指定本地路径；无本轮新增临时残留。生产 current、生产数据库、控制面与公网路由未触碰；未读取或输出 Secret、素材内容、TaskId 或对象键。

## remaining_gap

当前 runner 仍拒绝指定 candidate 的 SHA，full synthetic 未执行。需要规划确认 candidate SHA 门与 runner 冻结候选策略后再安排后续动作；本轮不重建、不重打包、不绕过 SHA 门。

## next_owner

PLANNING
