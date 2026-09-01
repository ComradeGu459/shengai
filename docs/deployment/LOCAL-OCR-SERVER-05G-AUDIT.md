# LOCAL-OCR-SERVER-05G-AUDIT

```yaml
outcome: blocked_readonly_evidence_insufficient
requires_user: false
next_owner: BACK
files:
  - docs/deployment/LOCAL-OCR-SERVER-05G-AUDIT.md
residual: 0
```

## 唯一登记请求的精确字段

上一回合 Edge 表单捕获的登记字段为：

```yaml
capability: screen_text
executionKind: self_hosted_worker
adapterKey: screen_text_openvino_ppocrv6_small
```

服务器 `backend.log` 的指定窗口（UTC `2026-08-27T17:10:00Z`–`17:20:00Z`，即北京时间 `2026-08-28 01:10`–`01:20`）实际记录了 3 次同一路径请求，因此不能把它们伪称为单次：

| time (UTC) | method | path | status | responseTimeMs | requestId |
| --- | --- | --- | ---: | ---: | --- |
| 2026-08-27T17:10:03.122Z | POST | `/api/system-control/engines` | 422 | 27.423522 | `b0665d0a-09bb-4aa1-9bcd-ec53528c8a05` |
| 2026-08-27T17:11:12.487Z | POST | `/api/system-control/engines` | 422 | 5.225622 | `216d8a4c-bdcd-412f-8633-267d20cb0802` |
| 2026-08-27T17:11:14.399Z | POST | `/api/system-control/engines` | 422 | 5.011590 | `1b2f9fb1-a6ab-46f6-a19d-72b3cef05875` |

同一回合更早的首次拒绝还记录为 `2026-08-27T16:58:42.225Z`、requestId `9f0e5647-481e-4a18-b35d-cedccf42d298`、同路径 POST、HTTP 422、55.684628ms；它不属于上面的 10 分钟窗口。

HTTP 响应的精确稳定字段由归档编译代码和当前路由映射核对得到（日志只保留 incoming/completed，不保留响应体）：

```yaml
error.code: SYSTEM_CONTROL_ENGINE_ADAPTER_NOT_REGISTERED
error.message: "画面字适配器不是 Wave A 允许的零网络 probe：screen_text_openvino_ppocrv6_small"
error.action: review_engine_request
error.retryable: false
```

Edge 首次可见错误与上述 message 一致；未创建 deployment、version 或 testRunId。未发送新的控制面请求。

## 归档编译证据

- archive：`C:\Users\ComradeGu\Documents\七猫兼职\local-ocr-05g-r1-20260828010403.tar.gz`
- archive SHA-256：`277a4778e0cef6fff279977ac36c435fa36f713c6b0f7fc6773bfce3f930b58e`
- manifest SHA-256：`2b5c68ec3b7eefb60be23ebb9da7fbb99b1a66e0903536bc9af65693bb6ccd5a`
- `payload/backend/dist/modules/system-control/system-control.engine-registry.js` SHA-256：`95785dcd739721d50272ae6dcbb761f821d16584ab8c59e60f059da88d367e7b`，实际字节与 manifest 匹配；包含 `screen_text_openvino_ppocrv6_small` 与 `screen_text_onnxruntime_ppocrv6_small`。
- `payload/backend/dist/workers/system-control.connection-test.worker.entry.js` SHA-256：`ee0a3ff5e24e2e32e81e58b5b2a35494db4eb2c1c0fa2787c2ec1d28f2467901`，实际字节与 manifest 匹配；包含 `createLocalOcrAdapterRegistryFromEnv` 与 `runRegisteredProbe`。

## 候选运行时加载证据

```yaml
runtime_loaded_candidate: unknown
```

只读证据：

- 当前（回滚后）`current` 指向 `/opt/qimao-terms-cloud/releases/20260827-local-ocr-05d-backend-r1`；backend 当前 cwd 也是该旧 release。
- 当前 ExecStart 仍是 `/opt/qimao-terms-cloud/current/backend/dist/server.js`，无法从现存 PID 反推出历史候选模块。
- 候选请求窗口的 journald 中，候选 release 路径标记数为 0，`local-ocr-runtime`/`system-control.engine-registry`/connection-test 模块标记数为 0；没有保留候选期 PID 或模块清单。

## 归因裁决与最小下一步

- 请求字段错误：否。字段形状与 capability/executionKind/adapterKey 均为受控值，且返回的是业务 422 `ADAPTER_NOT_REGISTERED`，不是 schema 400。
- 流量仍命中旧 runtime：无法证明。
- 候选 runtime 装配错误：无法证明。
- 最窄结论：`evidence_insufficient`（候选历史加载身份缺失）。
- 唯一 next_owner：`BACK`。最小修复/验证是为 backend 启动时输出不含 Secret 的 registry key/digest 指纹，并在同一候选 PID 上以只读方式核对；在该证据补齐前不得再次登记或创建 test。

本轮仅写入本审计文件；未连接 COS、读取 Secret、访问真实素材/业务数据库、创建 deployment/test/route 或修改服务器。
