# TENCENT-ASR-SERVER-05G-ENV-TARGET

```yaml
artifact_written: true
outcome: passed
scope: local-only
current: v4-1310
lease: 0
server_actions: 0
secret_actions: 0
media_actions: 0
database_actions: 0
cos_actions: 0
tencent_actions: 0
business_actions: 0
next_owner: SERVER
requires_user: false
```

## 本轮结论

已在本地完成 isolated bootstrap 的 env target 最小修正，未连接服务器，未读取 Secret 或媒体，未执行 DB、COS、Tencent 或业务动作。

- `prepare` 现在把 `--env-dir` 作为必填参数；它必须解析为 staging root 内、且不等于 root 的具体目录。
- 删除 isolated prepare 对生产默认 env/provider 路径的回退，不再使用生产路径作为隐式目标。
- provider target 唯一由 `posix.join(posix.resolve(envDir), 'provider.env')` 派生。
- 显式传入 `--provider-target` 一律以 `PROVIDER_TARGET_FORBIDDEN` 拒绝，消除调用端第二状态；05F 形态省略该参数。
- provider 安装、database.env 安装和 qimao 可读性门均沿用同一 canonical `envDir`，provider 返回只含 target、stat、sha256，database.env 返回只含 target、stat，不回显文件值。

## 本地证据

运行：

```text
node --check deploy/debian/bin/asr-isolated-synthetic-bootstrap.mjs
node deploy/debian/bin/asr-isolated-synthetic-bootstrap.mjs --self-test
```

结果：

```text
node --check: exit 0
self-test: exit 0
{"component":"bootstrap","outcome":"passed","cases":["happy","database_url_generation","ownership_plan","release_required","release_within_root","stage_code_mapping","command_dispatch","prepare_env_dir_required","env_dir_within_root","provider_target_derivation","legacy_provider_target_rejected","05f_prepare_without_provider_target","wrong_extension","wrong_identity","media_sha_mismatch","cleanup_order"],"createRecTaskMaximum":1,"providerReadRole":"qimao"}
```

self-test 纯参数门覆盖：

- 缺失 `--env-dir` 返回 `ARGUMENT_MISSING`；
- root 外 env-dir 返回 `PATH_OUTSIDE_ROOT`；
- canonical env-dir 为 `/tmp/qimao-asr-05a-self-test/env` 时，provider target 精确为 `/tmp/qimao-asr-05a-self-test/env/provider.env`；
- legacy `--provider-target`（不匹配和匹配派生值两种情况）均返回 `PROVIDER_TARGET_FORBIDDEN`；
- 05F prepare 参数计划在省略 `--provider-target` 时通过 command/required-argument 门；
- 原 ownership、database URL、正式 `.mjs`、稳定阶段码、命令分派、媒体 SHA、cleanup 顺序门保持通过。

## 文件、扫描与残留

本轮仅涉及：

- `deploy/debian/bin/asr-isolated-synthetic-bootstrap.mjs`
- `docs/deployment/TENCENT-ASR-SERVER-05G-ENV-TARGET.md`

限定检查结果：

- 敏感值扫描：0 命中；
- 生产默认 env/provider target 扫描：0 命中；
- `git diff --check`：无输出；
- 本轮临时文件/目录残留：0；
- 未改 business、业务源码、合同、测试、candidate 或其他部署流程。

## remaining_gap

本轮按 `lease=0` 和 `local-only` 边界未做远端验证。下一 Owner 为 `SERVER`；后续调用必须显式传入 root 内 `--env-dir`，并省略 `--provider-target`。
