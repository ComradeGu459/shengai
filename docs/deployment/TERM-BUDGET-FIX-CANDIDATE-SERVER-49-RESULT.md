# TERM-BUDGET-FIX-CANDIDATE-SERVER-49

## 交付

- `artifact_written`
- outcome: `local_candidate_ready`
- scope: 仅本地 prepare；未执行 SSH、SCP、服务器、Secret、Provider、COS、Tencent 或业务 API 动作。
- requires_user: `false`

## 候选三件套

保留于仓库外唯一目录：`C:\Users\ComradeGu\Documents\七猫兼职\term-budget-capability-20260830-r1`

| 文件 | bytes | SHA-256 |
|---|---:|---|
| `term-budget-capability-20260830-r1.tar.gz` | 9,471,790 | `169b62a48f14dec962fcc9041c518e5b2fb36b0aefef15cefb4ad141b025804e` |
| `term-budget-capability-20260830-r1.manifest.json` | 3,509,202 | `b7fc5b8d94704ced0c97cb1ff8c120878c183f0c9a252fae9b0c5dbfd8df967d` |
| `term-budget-capability-20260830-r1.sha256.audit` | 1,562 | `7d20bfa30303af3e5695d080577aae8c997363840c6f0f3acec971f95b8221ea` |

冻结基底：`term-provider-usage-20260830-r1.tar.gz`，9,471,776 bytes，SHA-256 `020437197f6fef783fa04a1789ba727cf293a152d140b38630122a9677c3b925`。

## 硬门证据

- Node `v24.19.0`、pnpm `11.21.0`；已使用官方 non-legacy `pnpm deploy --prod` 生成本轮候选所需 backend deploy 输出；纠正后的 TS 差量仅复用该输出与当前源码，不重跑 build/deploy。
- 归档成员共 `15,024`；regular members `12,350`。
- 输出与基底的 `name/type/linkname` 顺序完全相同。
- 内容 SHA/size 差量恰好 3 项，且仅为同一逻辑预算服务：
  - `backend/src/modules/system-control/system-control.budget.service.ts`：67,076 → 67,160 bytes；候选 SHA `2d6d0df1342bcb883313c8fb422e6818ff1b36d75eaee2013ad0f2db3083702c`。
  - `backend/dist/modules/system-control/system-control.budget.service.js`：64,385 → 64,469 bytes；候选 SHA `58d9c307b027c772b024e4873aafba2b6ce732e91c78b1658fb8ff311ab48c8a`。
  - `backend/dist/modules/system-control/system-control.budget.service.js.map`：44,650 bytes；候选 SHA `bc0c441b5fc3a5b09a3eefa5889d62c1a33a62efa30e7f26e667b1ea15ddc02e`。
- 其余 regular member 的内容、类型及链接均未变化；没有其他 executable/source member 差量。
- symlink 边界由基底派生并复核：`476` 个 symlink、`0` absolute、`0` escaped、`0` missing target；hardlink `0`。
- 五个真实编译入口均通过 `node --check` 与动态 import：storage、asr-runtime、asr-worker、app、server；完整路径和结果见 manifest 的 `fiveEntryImports`。
- JS `node --check`、JS map JSON 解析、候选目标 bytes/SHA 对齐均通过。

## remaining_gap / next_owner

- remaining_gap: 尚未发布到测试服务器；本片明确禁止远端动作。
- next_owner: 发布规划/SERVER slice，消费该三件套并按既有发布门执行；不得重建候选。

## residual

- 候选目录仅保留 archive、manifest、audit 三件套；本轮 helper 与 deploy 临时树已精确删除。
- 未删除或重置仓库原有脏工作树；未提交、未推送、未修改业务源码。

