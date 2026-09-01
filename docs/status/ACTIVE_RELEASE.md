# 当前发布索引

最后更新：2026-09-01

## 已部署生产基线

- backend / 管理员站：`admin-summary-20260901-r1`；[declaration](../../deploy/admin-summary-release-1744/application-release.declaration.json)、[SHA256SUMS](../../deploy/admin-summary-release-1744/SHA256SUMS)、[RESULT](../deployment/ADMIN-SUMMARY-SERVER-1745-RESULT.md)。
- 员工站：`frontend-asr-budget-default-off-20260901-r1`；[declaration](../../deploy/asr-budget-default-off-release-1726/application-release.declaration.json)、[SHA256SUMS](../../deploy/asr-budget-default-off-release-1726/SHA256SUMS)、[RESULT](../deployment/ASR-BUDGET-RELEASE-SERVER-1727-RESULT.md)。1725 输入已被 1726 取代，不形成第二个当前候选。

## 唯一待发布候选

- release：`screen-text-review-20260901-r1`，状态：冻结完成、尚未部署。
- provenance：候选来自当前未提交工作树的冻结快照，不能由单一 commit 重现；发布闭集仅以现有 [declaration](../../deploy/screen-text-review-release-1753/application-release.declaration.json)、[SHA256SUMS](../../deploy/screen-text-review-release-1753/SHA256SUMS) 和 [freeze RESULT](../deployment/SCREEN-TEXT-REVIEW-SERVER-1753-FREEZE-RESULT.md) 为准，其他脏改不属于该候选。
- [最近一次动作结果](../deployment/SCREEN-TEXT-REVIEW-SERVER-1759-ACTION-RESULT.md)

当前阻塞和唯一下一步只看 [CURRENT.md](CURRENT.md)；本页不替代声明、校验文件或发布结果。
