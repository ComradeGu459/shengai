# TERM-E2E-REBASE-SERVER-50

## 交付

- `artifact_written`
- outcome: `local_rebased_ready`
- scope: 仅本地机械装配与验证；未执行 build、deploy、SSH、SCP、服务器、Secret、Provider、COS、Tencent 或 E2E。
- requires_user: `false`

## 目录与冻结输入

- 新目录：`C:\Users\ComradeGu\Documents\七猫兼职\term-control-e2e-budgetfix-final`
- 46 基底目录 `C:\Users\ComradeGu\Documents\七猫兼职\term-control-e2e-final-prepared` 保持不变。
- 新归档：9,471,790 bytes，SHA-256 `169b62a48f14dec962fcc9041c518e5b2fb36b0aefef15cefb4ad141b025804e`。
- runner 仅将归档 basename、archive SHA 替换为新归档身份；无其他逻辑差量。
- `bytes-sha.json` 仅更新归档 basename/bytes/SHA，并将文本副本规范为 LF。
- 50R1 单点修正：清单中的 `runner.sh` 条目已校正为 `18,136` bytes、SHA-256 `73eb72bebf11289d34be2dbfcf63a923a911879fa5a3e3681d7b30d6a2ffa25e`。

## bytes/SHA 证据

| 文件 | bytes | SHA-256 | 与 46 |
|---|---:|---|---|
| `bootstrap.mjs` | 27,910 | `c75696ae484c23beb9fc955021e8de78126cd23fef6e3ca5da9ef90aedff51fb` | 相同 |
| `business.mjs` | 73,143 | `213a61f2493ff3a63026f73e7c5190e8a7960ad451fe8cba31567fac9845910e` | 相同 |
| `runner.sh` | 18,136 | `73eb72bebf11289d34be2dbfcf63a923a911879fa5a3e3681d7b30d6a2ffa25e` | 仅机械替换 |
| `media/episode-001.mp4` | 736,325 | `bceac576c7502dd93badf8e5f00a4fc1979013773c28c0d283e44476694d542d` | 相同 |
| `term-budget-capability-20260830-r1.tar.gz` | 9,471,790 | `169b62a48f14dec962fcc9041c518e5b2fb36b0aefef15cefb4ad141b025804e` | 新输入 |

附：新 `bytes-sha.json` 为 732 bytes，SHA-256 `2bdb6d10e49745af2fa6e2df6fe91c280557759a2af9341f95a043b7eb3777e2`。

## 验证证据

- 实际 `D:\Git\bin\bash.exe --noprofile --norc -n runner.sh`：通过。
- runner 内 4 段 `NODE` heredoc：逐段 `node --check` 通过。
- runner 内 1 段 `ROUTE` heredoc：Git Bash `bash -n` 通过。
- `bootstrap.mjs`、`business.mjs`：`node --check` 通过；既有 `--self-test` 均通过。
- 五个业务输入文件逐项核对：bootstrap、business、runner、media、new archive；前三项/媒体按合同保持或机械变化，归档身份与预期 bytes/SHA 一致。
- 新目录文本文件均 LF-only；候选目录仅保留目标输入及 `bytes-sha.json`，无临时 helper 或额外树。

## remaining_gap / next_owner

- remaining_gap: 尚未传输或执行真实 E2E；本片明确禁止远端动作。
- next_owner: 规划审核后 SERVER 执行 slice，消费该唯一目录，不再重建或转码。

## residual

- 新目录保留为下一片唯一执行输入；46 原目录保留且未修改。
- 仓库原有脏工作树保留；未修改业务源码、未提交、未推送。
