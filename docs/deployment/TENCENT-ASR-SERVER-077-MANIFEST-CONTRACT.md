# TENCENT-ASR-SERVER-077-MANIFEST-CONTRACT

```yaml
artifact_written: true
outcome: completed
scope: business_harness_and_deployment_result_only
manifest_root_name: stable_single_root_name
relative_paths:
  - <rootName>/episode-001.srt
  - <rootName>/episode-001.mp4
last_modified_ms: 1
unchanged_fields: role_fileName_size_fingerprint_mediaType_expectedVersion
schema_relaxed: false
fallback_added: false
external_actions: 0
network_actions: 0
residual: none
next_owner: PLANNING
requires_user: false
```

## evidence

- manifest 使用单一稳定 `rootName` 常量；两个 binding 的 `relativePath` 均以同一 rootName 开始，末段分别保持 `episode-001.srt` 与 `episode-001.mp4`。
- 两个 binding 的 `lastModifiedMs` 均固定为合法正整数 `1`；role、fileName、size、fingerprint、mediaType 和 expectedVersion 未改变。
- self-test 新增 `manifest_contract`，断言 root 前缀、末段文件名以及 `lastModifiedMs >= 1`；未放宽 schema，也未增加 fallback。
- `node --check deploy/debian/bin/asr-isolated-synthetic-business.mjs`：exit `0`。
- `node deploy/debian/bin/asr-isolated-synthetic-business.mjs --self-test`：exit `0`，`outcome=passed`，包含 `manifest_contract`。
- 限定静态检查与 `git diff --check` 通过；本轮未连接服务器，未执行 archive、runner、DB、COS、Tencent 或其他外部动作。

## files / residual

- 修改：`deploy/debian/bin/asr-isolated-synthetic-business.mjs`。
- 新增：`docs/deployment/TENCENT-ASR-SERVER-077-MANIFEST-CONTRACT.md`。
- 无临时残留。

`next_owner=PLANNING`；`requires_user=false`。
