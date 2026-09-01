# TEST-S6-01 Rev 1 首批三集全链质量验收报告

日期：2026-08-16  
测试角色：全链测试与质量验收对话  
项目别名：`S6-三集联调`  
样本范围：1、14、26 集（原始素材仅做只读存在性/元数据核对）

## 结论

- 本轮没有发现 P0/P1/P2 业务缺陷，也没有发现数据破坏、重复付费或安全问题。
- 生产源码、迁移、共享契约和原始素材均未修改。
- 零网络 Adapter、隔离 PostgreSQL、正式 Fastify API、正式 React 页面均完成了本轮可执行范围内的验证；模块专项隔离重跑全部通过。
- 共享数据库一次性并发收集 26 个后端套件时出现 9 项清理/死锁污染失败；同一套件逐个使用全新隔离数据库重跑后 109/109 通过，故归类为测试夹具隔离问题，不归因于产品缺陷。

## 执行与证据

### 后端与跨模块合同

| 套件 | 结果 |
| --- | ---: |
| projects | 5/5 |
| materials | 9/9 |
| material-assets | 5/5 |
| uploads | 17/17 |
| terms | 11/11 |
| asr | 12/12 |
| pre-review | 7/7 |
| screen-text | 13/13 |
| subtitle-acceptance | 15/15 |
| deliveries | 8/8 |
| recycle | 7/7 |
| **合计（逐套件隔离重跑）** | **109/109** |

覆盖了项目、三角色素材清单/Asset、分片上传、术语版本、ASR、画面字、前置审改、字幕验收、交付产品和回收恢复的正式 API、PostgreSQL、Worker 与零网络 Adapter 交接。交付产品链验证了 `preparing → ready`、稳定 `deliveryId` 恢复、下载摘要/大小校验和明确空画面字轨。

### 前端与浏览器

- Frontend 专项：22 suites / 114 tests，114/114 通过。
- 正式 React + Fastify + PostgreSQL 本地链：API 使用 Vite 代理端口 `3001`，前端端口 `43152`；健康状态为“本地服务正常”。
- 以匿名别名创建项目并刷新恢复；未上传原始文件，仅保留素材待确认状态。
- `1440×900` 与 `1024×768`：根页面 `scrollWidth === viewportWidth`，无横向溢出；页面角色告警为空。
- 浏览器控制台：`error=0, warn=0`。
- 脱敏截图：
  - `C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a0065d-ce1c-7f11-94d8-56b91f062cf8\s6-projects-live-1440.png`
  - `C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a0065d-ce1c-7f11-94d8-56b91f062cf8\s6-projects-live-1024.png`
  - `C:\Users\ComradeGu\.codex\visualizations\2026\08\15\01a0065d-ce1c-7f11-94d8-56b91f062cf8\s6-materials-live-1440.png`

### 仓库检查

- `pnpm run check:repo`：通过。
- `pnpm run lint`：通过。
- `pnpm run typecheck`：通过。
- `pnpm run build`：通过；前端 175 modules 构建完成，仅有既有 chunk size 非阻断提示。
- 规划在 FIFO 144 已完成一次完整 `pnpm check`（24 files / 233 tests）并通过；本轮未再次调用会触碰默认数据库的 `pnpm test`，以保持 S6 隔离边界。

## 隔离、清理与限制

- 本轮隔离数据库：`qimao_test_s6_01_20260816_a7f3`，从空库应用全部迁移；清理前存在计数 1，删除后计数 0。
- 本轮启动并已停止：PostgreSQL `127.0.0.1:55432`、API `3001`、前端 `43152`；未停止其他任务端口。
- 逐套件临时数据库均使用 `qimao_test_s6_01_20260816_*` 前缀并在每次重跑后删除；仓库外 JSON 运行报告已按精确路径清理。
- 未导入原始视频/字幕正文，未生成包含真实台词、视频帧或业务名称的仓库文件；匿名页面仅创建了测试项目记录并已随隔离库删除。
- 真实供应商、密钥、付费、云资源、部署和 Git 提交/推送均未接触。

## 交接

报告写入后，`TEST-S6-01 Rev 1` 转为 `review / Current actor=规划对话`；正式结果只交规划总线。后续若规划归因出返工项，按“测试 → 规划 → 返工角色 → 规划 → 原测试任务复验 → 规划关闭”回流。
