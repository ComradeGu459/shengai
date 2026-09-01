# 部署资料索引

最后更新：2026-09-01

本目录保留声明式发布规则、当前发布证据和历史 RESULT；不把 341 份历史文件批量改名、移动或删除。

## 当前发布

- 已部署基线、唯一待发布候选及其现有工件链接：[ACTIVE_RELEASE](../status/ACTIVE_RELEASE.md)
- 当前阻塞与唯一下一步：[CURRENT](../status/CURRENT.md)

## 稳定 Runbook

- [TERM-CONTROL-RELEASE-RUNBOOK](TERM-CONTROL-RELEASE-RUNBOOK.md)：固定发布入口与受控发布顺序。
- [TEST-SERVER-ONE-DAY-RUNBOOK](TEST-SERVER-ONE-DAY-RUNBOOK.md)：测试服务器一天运行与恢复边界。

Runbook 描述可复用方法，不证明某次发布完成；具体发布事实只看对应 declaration、SHA256SUMS 和 RESULT。

## 当前关键 RESULT

- [ASR 预算默认关闭上线](ASR-BUDGET-RELEASE-SERVER-1727-RESULT.md)
- [管理员摘要上线](ADMIN-SUMMARY-SERVER-1745-RESULT.md)
- [员工画面字审改候选冻结](SCREEN-TEXT-REVIEW-SERVER-1753-FREEZE-RESULT.md)
- [最近一次候选动作结果](SCREEN-TEXT-REVIEW-SERVER-1759-ACTION-RESULT.md)

## 历史 RESULT

其余 `*-RESULT.md`、`*-AUDIT*.md` 和 `*-PREP*.md` 均为只读历史证据：可用于根因复盘和回滚核对，但不参与当前调度，也不能替代 [CURRENT](../status/CURRENT.md)。
