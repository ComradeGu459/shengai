# TERM-CONTROL-SERVER-122A 结果

## outcome

`passed`。已按 03J 冻结路线生成唯一自包含 candidate，并完成本机与 Linux 隔离的 archive、链接边界和五入口验证；未部署。

## build / frozen payload

- Node=`v24.19.0`，pnpm=`11.21.0`。
- 唯一 official non-legacy 命令：`pnpm --offline --config.inject-workspace-packages=true --filter '@qimao-terms-cloud/backend' deploy --prod <target>`。
- deploy 闭包：`170` packages，`reused=170`，`downloaded=0`；未修改 package、lock、workspace 或业务源码。
- 121 冻结 payload：`607` 个 manifest 文件全部 bytes/SHA 匹配；源 archive bytes=`1352730`，SHA-256=`6d0e9221cfb07757cf9ea0b92a1b7e0aa1d0dfb777c47e5d164827faa027ed01`。
- 新 candidate archive bytes=`9417436`，SHA-256=`c039879c5ba5dc0f51eec5d0635a08601af92f7f3692e8cc72e0940a21d016d5`。
- 新 manifest SHA-256=`48cc60997ee4d52ae700e2eab879ab31a6c07f421796a2565f8721d95feef961`。
- 新 SHA 文件同时记录 archive 与 manifest 校验；三件产物均保留在仓库外固定交付路径。

## dependency / archive gates

- deploy 根依赖统计：`11584` regular files、`2139` directories、`476` source Junctions。
- 476 个 source Junction 均在 deploy 根内且目标存在；归档时转换为相对 POSIX symlink。
- archive members=`14842`，archive link entries=`476`。
- archive `external=0`、`absolute=0`、`missing=0`；tar listing/extract 成功。
- payload/static/deploy assets 使用 121 冻结业务字节；未使用 legacy deploy、递归解引用或第二候选。

## five-entry import

- 本机：storage、asr-runtime、asr-worker、app、server 五个真实编译入口均 `loaded`。
- Linux：既有 `worker-entry-import-probe.mjs` 的 11 gates 全部通过；五个入口均 regular-file/import `exit=0`，最终 `result=passed`。
- `probe-argv-identity` 通过；未改写 `process.argv[2]` 语义。

## linux temporary gate / cleanup

- archive identity、tar boundary、tar extract、link boundary、five-entry import：全部 `phase_pass`。
- Linux staging root 与临时 gate 脚本均已删除；两个精确路径 absent 复核通过，remote residual=`0`。
- 本地 build/deploy/payload/link experiment、构建器和 gate 脚本均已删除；local temporary residual=`0`。
- 唯一保留的新 archive、manifest、SHA 文件如下：
  - `C:\Users\ComradeGu\Documents\七猫兼职\term-control-server-122a-candidate-20260829-r1.tar.gz`
  - `C:\Users\ComradeGu\Documents\七猫兼职\term-control-server-122a-candidate-20260829-r1.manifest.json`
  - `C:\Users\ComradeGu\Documents\七猫兼职\term-control-server-122a-candidate-20260829-r1.sha256`

## external / production

- 未读取 Secret；未写 release、current、static、provider.env、DB 或 systemd。
- 未调用 DeepSeek、COS、Tencent；外部业务写入=`0`。
- 生产 current、DB、控制面、公网路由和既有服务未触碰。

## remaining_gap

本片仅形成并验证自包含 candidate，尚未执行生产路径部署或业务 synthetic；后续需由规划另行签发部署切片。

## next_owner / requires_user

- `next_owner=规划`
- `requires_user=false`
