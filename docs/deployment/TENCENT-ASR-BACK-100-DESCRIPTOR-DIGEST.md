# TENCENT-ASR-BACK-100-DESCRIPTOR-DIGEST

outcome: artifact_written
evidence:
  - `AsrWorkerRepository` 现在从 `target_capabilities_snapshot.descriptorDigest` 构造 adapterDescriptor.configDigest，并独立保留 deployment `target_config_digest` 作为 claim.configDigest/结果身份。
  - descriptor digest 缺失或非 64 位小写十六进制时，在创建 attempt/外部执行前 fail-closed。
  - 新增纯单元回归，验证 descriptor digest 与 deployment config digest 可不同且不会混用。
validation:
  - `pnpm dlx vitest@4.1.10` 临时最小配置定向测试：1 file/2 tests passed。
  - `typescript@5.9.3 tsc -p backend/tsconfig.json --noEmit`：exit 0。
  - contracts build：exit 0；backend `tsconfig.build`：exit 0。
  - dist `node --check` 与限定 `git diff --check`：通过；临时配置已删除。
remaining_gap: 未访问服务器、COS、腾讯 API、Secret 或媒体；无业务阻塞。
next_owner: PLANNING
