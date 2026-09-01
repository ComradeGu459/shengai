# TENCENT-ASR-SERVER-02J

## outcome

`blocked-clean`

唯一失败门：`metafile_non_builtin_external`。单文件 bundle 已按指定 esbuild 参数生成，但 metafile 仍包含未安装的第三方 external `encoding`、`supports-color`；因此不满足“仅 Node builtin external”，按任务卡立即停止，未进入任何自检或真实探针。

## evidence

- CURRENT：`v4-1233`；formal lease：`1`。
- 临时 entry 静态导入官方 `tencentcloud-sdk-nodejs-asr`、现有 `ProductionS3CompatibleUploadStorage`、`TencentOfficialAsrTransport` 与 `TencentAsrAdapter`；未修改业务源码。
- 使用现有 esbuild `0.28.2`，构建参数为 `bundle=true`、`platform=node`、`format=cjs`、`target=node20`；bundle 生成成功。
- Node builtin external 复核同时识别裸 builtin 名与 `node:` 前缀；第三方 external 唯一集合为 `encoding`、`supports-color`，metafile 门失败。
- 未运行本机假凭据 COS 签名自检，未运行官方 SDK Client 自检，未上传服务器或执行服务器自检；因此没有可报告的自检通过证据。
- 全程未读取或传输 SecretKey.csv，未下载官方 WAV，未访问 COS/ASR，未调用 `CreateRecTask` 或 `DescribeTaskStatus`，未改 DB、route、budget、release、unit、service 或业务代码。

## remaining_gap

当前 lockfile 未提供 metafile 所需的两个第三方可选依赖；本轮禁止安装、增加依赖、加入替代 shim 或切换第二打包路线，故无法继续到双自检及真实探针。

## next_owner

规划：裁决唯一允许的依赖闭包/打包方案，并确认是否仍满足“只允许 Node builtin external”与不改业务依赖的边界。

## files

- `docs/deployment/TENCENT-ASR-SERVER-02J-RESULT.md`

## residual

- 本轮 entry、bundle、metafile 与临时目录：均已删除并复核不存在。
- 远端临时目录：未创建。
- Secret、WAV、COS 对象：均未产生或接触。
- 仓库原有脏工作树：保留，未 reset、checkout、clean、stash、提交或推送。

## requires_user

`true`：需要规划确认下一轮唯一打包依赖方案；在此之前不应传输凭据或执行真实 ASR 探针。
