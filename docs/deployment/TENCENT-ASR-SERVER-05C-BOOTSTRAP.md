# TENCENT-ASR-SERVER-05C-BOOTSTRAP

```yaml
outcome: passed
scope: local-only
lease: 0
server_actions: 0
secret_actions: 0
media_actions: 0
cos_actions: 0
tencent_actions: 0
database_actions: 0
next_owner: PLANNING
requires_user: false
```

## 本轮结论

已在本地最小修正正式 bootstrap。prepare 现在由 bootstrap 自己生成并执行唯一 canonical ownership plan，不再假定调用端预装的 owner/mode：

- staging root：`qimao-deploy:qimao`、`0750`；
- candidate archive：`qimao-deploy:qimao`、`0640`，保证 qimao-deploy 能执行 SHA；
- release tree：必须由 `--release` 显式提供且位于 staging root 内；目录递归固定为 `qimao-deploy:qimao`、`0750`，普通文件递归固定为 `qimao-deploy:qimao`、`0640`；
- media：`qimao-deploy:qimao`、`0640`，保证摘要阶段可读且 prepare 完成后 qimao 可读；
- business harness：`qimao-deploy:qimao`、`0640`，保证 qimao 身份可执行业务 harness；
- env 目录与 provider target 继续由既有 `sudo -n install` 计划安装为 `root:qimao`、`0750/0640`。

prepare 同时固定检查冻结入口 `backend/dist/workers/asr.worker.entry.js` 为 release 树内的普通文件，并在 ownership 递归处理后通过 `sudo -n -u qimao test -r`。入口由 `resolveReleaseEntry(release)` 先以 `posix.join(release, FROZEN_RELEASE_ENTRY)` 形成绝对路径，再交给 `assertWithin`；本地自测精确得到 `/tmp/qimao-asr-05a-self-test/release/backend/dist/workers/asr.worker.entry.js`。因此 05B 中“media 已为 `root:qimao 0640`，但先由 qimao-deploy 读取”、temp root 为 `qimao-deploy:qimao-deploy`，以及 release 树为 `qimao-deploy:qimao-deploy` 的组合不再作为调用端前提；bootstrap 在 digest 前正规化为上述计划。没有连接服务器，没有读取 Secret 或媒体，也没有运行 DB/COS/Tencent。

## 代码与阶段码证据

修改范围严格为：

- `deploy/debian/bin/asr-isolated-synthetic-bootstrap.mjs`
- `docs/deployment/TENCENT-ASR-SERVER-05C-BOOTSTRAP.md`

bootstrap 的 `runCommand(stage, command, args, options)` 接收稳定阶段标签；失败只抛出阶段码，不包含 stderr、命令输出、Secret 或环境值。已声明的关键映射包括：

```text
mediaDigest       -> MEDIA_DIGEST_FAILED
providerInstall   -> PROVIDER_INSTALL_FAILED
qimaoReadability  -> QIMAO_READABILITY_FAILED
databaseCreate    -> DATABASE_CREATE_FAILED
ownershipRelease  -> OWNERSHIP_RELEASE_FAILED
```

同时保留了 identity、archive digest、ownership、database drop、cleanup 等稳定门码。ownership plan 是纯函数，忽略旧调用端的 owner 猜测并返回固定 canonical 计划。

## 本地验证

运行命令：

```text
node --check deploy/debian/bin/asr-isolated-synthetic-bootstrap.mjs
node deploy/debian/bin/asr-isolated-synthetic-bootstrap.mjs --self-test
```

结果：

```text
node --check: exit 0
self-test: exit 0
{"component":"bootstrap","outcome":"passed","cases":["happy","ownership_plan","release_required","release_within_root","stage_code_mapping","command_dispatch","wrong_extension","wrong_identity","media_sha_mismatch","cleanup_order"],"createRecTaskMaximum":1,"providerReadRole":"qimao"}
```

self-test 覆盖：

- happy lifecycle 与 provider/qimao/external policy；
- canonical ownership plan，以及旧 05B owner 参数被正规化；
- `--release` 缺失和越界被拒绝，冻结入口固定为 release 内路径；
- `resolveReleaseEntry` 的 join 顺序回归：release 入口得到精确绝对路径，不再把相对入口按进程 cwd 解析；
- release 目录/普通文件递归 ownership 命令使用 `find -xdev -exec` 参数数组，无 shell；
- 阶段码映射与未知阶段拒绝；
- `--prepare`、`--drop-db`、`--cleanup` 不落入 self-test，缺参返回 `ARGUMENT_MISSING`；
- 错误 `.mjs` 扩展名、错误身份、媒体 SHA 不符；
- 固定 cleanup 顺序。

## diff-check / residual / remaining_gap

- 两个目标文件均无尾随空白；限定状态仅显示本轮两个目标文件为新增/变更候选。
- 未改 business、业务源码、合同、测试、candidate 或其他部署流程。
- local-only 临时目录：`0`；服务器、Secret、media、COS、Tencent、DB 残留：`0`。
- remaining_gap：未做真实 Unix 写入或远端验证，符合本轮 `lease=0` 与 local-only 停止边界；后续 SERVER 轮次必须提供已解包且位于 staging root 内的 `--release`，并复用本 bootstrap 的 ownership plan，不由调用端预装或猜测 owner/mode。
