# SYSTEM-04CNY · 全站人民币成本归一

状态：产品规则已由用户确认；生产实现待 SYSTEM-05 关闭后串行执行，避免与当前 `system-control` 后端和管理前端文件重叠。

## 1. 唯一产品口径

1. 员工站、管理员控制台、预算策略、限额、费用趋势、异常摘要和导出报表统一以人民币 `CNY` / `¥` 计算与展示。
2. 厂商返回的原始币种和原始金额只作为不可变审计事实保留，不作为预算比较、页面汇总或员工展示的金额单位。
3. 禁止把 USD 等外币数值直接改写币种标签。外币必须先由后端使用权威 `CostConversionSnapshot` 换算；浏览器不得自行取汇率、计算金额或决定预算放行。
4. 缺少有效换算快照、币种不受支持或结果未知时，付费调用在任何外部副作用前稳定阻断，并显示“待配置汇率 / 待对账”，不得补零。

## 2. 权威数据与精度

- Provider 报价保留 `originalCurrency / originalMaximumAmount / originalFinalAmount`。
- 每个付费 Attempt 在调用前固定 `conversionSnapshotId / rateDigest / effectiveAt`，再生成 `maximumAmountCny` 并完成预算预留；换算版本变化只影响新 Attempt。
- CNY 原生报价不需要外部汇率，按精确十进制原值进入预算；外币换算使用 PostgreSQL `numeric` 和十进制字符串，禁止 JavaScript 浮点作为金额权威。
- 预算安全门采用保守精度：预留和最终结算的 CNY 金额统一保留 6 位小数并向上取整；报表展示可格式化为 2 位小数，但不得反向写回账本。
- 原始金额、换算快照和 CNY 金额共同只追加保存，历史记录不因后续汇率变化重算。

## 3. 未来真实汇率授权门

- 当前只允许可注入的零网络换算 Provider 和匿名固定测试快照，不接真实汇率网络服务。
- 真实接入前另行确认汇率来源、更新频率、失效时限、节假日策略和费用；Secret、网络、付费、云资源和部署仍需单独授权。
- 汇率来源不可用时保留最后已冻结历史快照供历史审计，但不得用过期快照受理新付费调用。

## 4. 实施切片

1. `BACK-SYSTEM-04D`：共享契约、增量迁移、换算快照、CNY-only 新预算规则、调用前换算与账本；删除新写路径上的多币种预算分支，不增加 fallback。
2. `FRONT-SYSTEM-04E`：预算、总览、日志和费用详情只以人民币作为主金额；原币种仅在管理员审计详情按需展示。
3. `TEST-SYSTEM-04CNY`：精确隔离 PostgreSQL 验证 CNY 原生、外币换算、快照过期阻断、未知不补零、换版只影响新 Attempt、两站隔离和双视口。

本切片与 SYSTEM-05 均修改 `backend/src/modules/system-control/`、`packages/contracts/src/system-control*` 和 `system-frontend/`，因此必须串行：先关闭 SYSTEM-05，再执行人民币归一，最后才允许真实供应商小样本接入。
