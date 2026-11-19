# Intel 18A（RibbonFET + PowerVia）事实核查表

> **用途**：HKU MSc「MECH6045 Nanotechnology and Fundamental」课程项目 —— 中文教学型滚动网页（scroll website）的**唯一事实底稿**。
> **核对日期**：2026-11-19（所有"当前"表述均以此日为准）。
> **范围**：平面晶体管 → FinFET → 多鳍/14nm → TSMC N3 → Intel 18A/RibbonFET → PowerVia → 产品。
> **本文件只做事实记录，不含网页代码、不含设计稿。**

## 0. 使用说明与置信度约定

| 标签 | 含义 | 使用规则 |
|---|---|---|
| **[CONFIRMED]** | 来自 Intel / TSMC 官方页面、官方新闻稿、官方技术简报（technology brief），或可交叉验证的论文摘要 | 可直接写进网页正文 |
| **[LIKELY]** | 来自一线媒体（EE Times、SemiAccurate、TechPowerUp、DataCenterDynamics）或由官方数字**推算**得出 | 网页中建议加"据报道/约" |
| **[UNCERTAIN]** | 单一二手来源、单位可疑、或厂商未公开（如 ribbon 宽度具体 nm） | 网页中必须加"未公开/存疑"，**不得当作确定数字** |

**三条硬规则**
1. 厂商**未公开**的量（如 18A 的 ribbon 宽度 nm、backside overlay 规格），本表一律标注"未公开"，禁止用"业内推测值"冒充实测值。
2. 同一指标出现**两个官方口径**时（例如 18A 对 Intel 3 的能效提升先写 15%、后写 18%），两个都记录，并注明日期与出处，不做"取最新即唯一真相"的处理。
3. 所有"提升 X%"必须写清**基准（baseline）**与**条件（iso-power / iso-performance / 电压）**，否则该数字无意义。

### 0.1 十秒速览（可直接做网页首屏数字）

| 数字 | 含义 | 基准/条件 | 置信度 |
|---|---|---|---|
| **18%** | 性能提升 | vs Intel 3，iso-power（等功耗） | [CONFIRMED] |
| **38%** | 功耗下降 | vs Intel 3，iso-performance（等性能） | [CONFIRMED] |
| **30%（1.3×）** | 芯片密度提升 | vs Intel 3 | [CONFIRMED] |
| **~30%** | CPU 频率提升 | vs FinFET 设计，**Vcc ≈ 0.5 V** 低压段 | [CONFIRMED] |
| **~10×** | 最坏情况动态电压跌落（dynamic voltage droop）改善 | PowerVia vs 前段供电（FS-PDN） | [CONFIRMED] |
| **6–11%** | 块级面积压缩（block-level area compaction） | 已布线设计，取决于 power-grid 假设 | [CONFIRMED] |
| **44% / 42%** | 掩膜数 / 工艺步数减少 | 仅在最低两层信号布线层 | [CONFIRMED] |
| **4** | RibbonFET 堆叠 ribbon（nanosheet）数 | 18A 产品（Panther Lake 拆解） | [LIKELY] |
| **180 / 160 nm** | 标准单元库高度（HP / HD） | 18A | [CONFIRMED] |
| **60 / 34 / 8 nm** | 22nm Tri-Gate 的 fin pitch / fin 高 / fin 宽 | Intel 22nm | [LIKELY] |

---

## 1. 平面时代（Planar Era, 1960s–2000s）

### 1.1 关键时间线

| 年份 | 事件 | 说明 | 置信度 |
|---|---|---|---|
| 1947 | Bell Labs 点接触晶体管（point-contact transistor） | 晶体管的起点，**不是**平面工艺 | [CONFIRMED] |
| 1959 | Jean Hoerni（Fairchild）申请平面工艺（planar process）专利 | 用 SiO₂ 钝化并做扩散掩膜，把结"藏"在硅表面之下 | [CONFIRMED] |
| **1960** | Fairchild 用平面工艺做出硅平面晶体管并商用量产 | 平面晶体管（planar transistor）正式登场 | [CONFIRMED] |
| 1968 | Federico Faggin 在 Fairchild 发明 MOS **硅栅（silicon gate）** 工艺 | 自对准（self-aligned）栅极，取代金属栅 | [CONFIRMED] |
| 1971-11-15 | Intel 4004 发布 | 2,300 个晶体管，**10 µm** 硅栅 PMOS 工艺 | [CONFIRMED] |
| 2001–2002 | 0.13 µm 世代 | 平面体硅（bulk planar）在 90nm 之后遭遇严重短沟道效应 | [LIKELY] |

> **重要更正（教学点）**：任务书中"1960 Bell Labs 平面晶体管"的说法**不准确**。平面工艺（planar process）是 **Fairchild 的 Jean Hoerni** 在 1959 年提出、1960 年实现量产的；Bell Labs 的贡献是 1947 年的点接触晶体管与早期的硅晶体管研究。写网页时建议表述为"1960 年 Fairchild 将平面工艺用于量产"，避免把两件事混为一谈。
> 来源：<https://archive.computerhistory.org/resources/access/text/2013/04/102723429-05-01-acc.pdf>（CHM 口述史，明确 "In 1960, Jean Hoerni of Fairchild succeeded in developing the planar process on silicon"）；<https://computerhistory.org/profile/federico-faggin/>（"In 1968 ... he created MOS silicon gate technology"）；<https://download.intel.com/newsroom/2021/data-center/4004-infographic.pdf>（4004：2,300 transistors / 10 µm / 1971-11-15）。

### 1.2 栅长（gate length, L_g）缩放做了什么

| 阶段 | 典型 L_g | 电压 V_DD | 结果 | 置信度 |
|---|---|---|---|---|
| 1971（4004） | 10 µm | ~15 V（PMOS） | 2,300 晶体管/芯片 | [CONFIRMED]（L_g 与晶体管数）；V_DD 为时代典型值 [LIKELY] |
| 1980s | 1.5–3 µm | 5 V | NMOS/CMOS 主流化 | [LIKELY] |
| 1990s | 0.8 → 0.25 µm | 5 → 2.5 V | 等比例缩放（Dennard scaling）红利期 | [LIKELY] |
| 2000s | 0.13 → 0.065 µm | 1.5 → 1.2 V | Dennard scaling 失效，漏电成为主角 | [LIKELY] |

**机制（为什么缩放曾经"免费"）**：L_g 缩短 → 沟道电阻下降 → 驱动电流上升；同时按常数电场缩放（constant-field scaling）同步降低 V_DD 与氧化层厚度（EOT），单位面积功耗密度基本不变。这一套在 ~90nm 之后崩掉，因为 V_DD 无法继续降（阈值电压 V_t 不能再低，否则关态漏电爆炸），而 EOT 已接近隧穿极限。

### 1.3 短沟道效应（short-channel effects, SCE）的四个机制

| 效应 | 英文 | 物理机制 | 电路后果 | 置信度 |
|---|---|---|---|---|
| **DIBL** | Drain-Induced Barrier Lowering | 漏极电压透过耗尽区"拉低"源端势垒，栅极失去对沟道的独占控制 | V_t 随 V_D 升高而下降；关态漏电随 V_D 指数上升；输出电阻变差 | [CONFIRMED]（教科书机制） |
| **V_t 滚降** | V_t roll-off | 短沟道下源/漏耗尽区占据沟道大部分，有效沟道长度变短 | 同一工艺内不同 L_g 的器件 V_t 不一致，设计窗口收窄 | [CONFIRMED] |
| **亚阈值摆幅退化** | Subthreshold Swing (SS) degradation | 栅极对表面势的控制力被源漏边缘场"分流" | SS 从理想 60 mV/dec 变大 → 同样 V_t 下关态漏电高一个数量级 | [CONFIRMED] |
| **栅极漏电 / GIDL** | Gate leakage / Gate-Induced Drain Leakage | 薄栅氧直接隧穿；漏极与栅极重叠区在强场下带间隧穿 | 静态功耗（standby power）失控 | [CONFIRMED] |

**必须记住的两个"硬数字"**

| 数字 | 含义 | 置信度 |
|---|---|---|
| **60 mV/dec** | 室温（300 K）下 MOSFET 亚阈值摆幅的**理论下限**：SS_min = (kT/q)·ln10 ≈ 59.6 mV/dec | [CONFIRMED]（物理常数，非厂商数据） |
| **~10 µm → ~0.13 µm** | 1971–2001 三十年间商用 CPU 的 L_g 缩小约 **77×** | [CONFIRMED]（由 10 µm 与 0.13 µm 两个端点推算） |

> **诚实的空白**：Intel/TSMC 从不公开某一代平面工艺"SS 退化了多少 mV/dec"的曲线。网页若需要具体 SS 数值，建议只讲 60 mV/dec 极限 + 定性机制，**不要**编造"SS 从 60 恶化到 120 mV/dec"这类具体曲线数字。
> 来源（本节）：<https://archive.computerhistory.org/resources/access/text/2013/04/102723429-05-01-acc.pdf>；<https://computerhistory.org/profile/federico-faggin/>；<https://download.intel.com/newsroom/2021/data-center/4004-infographic.pdf>；Intel 22nm 官方稿（见 §2）。

---

## 2. FinFET 的引入：Intel 22nm Tri-Gate（2011–2012）

### 2.1 关键事实

| 项目 | 内容 | 置信度 |
|---|---|---|
| 发布时间 | **2011-05-04**，Intel 新闻稿《Intel Reinvents Transistors Using New 3-D Structure》 | [CONFIRMED] |
| 结构名 | **Tri-Gate**（Intel 对 FinFET 的叫法） | [CONFIRMED] |
| 首次公开 | Intel 称该 3-D 结构"first disclosed by Intel in 2002" | [CONFIRMED]（官方原话） |
| 栅极包裹面数 | **3 面**（fin 的顶面 + 左右两个侧壁）；底部是体硅，**不**被栅极包裹 | [CONFIRMED] |
| 首个量产产品 | **Ivy Bridge**（第三代 Core，22nm） | [CONFIRMED] |
| 产品上市 | **2012-04-23** | [CONFIRMED] |
| 官方性能说法 | "up to **37 percent** performance increase at low voltage versus Intel's 32nm planar transistors"；等性能下功耗"**less than half**" | [CONFIRMED]（官方原话） |

> 官方原文（建议网页直接引用英文 + 中译）：
> "The 22nm 3-D Tri-Gate transistors provide up to 37 percent performance increase at low voltage versus Intel's 32nm planar transistors. ... the new transistors consume less than half the power when at the same performance as 2-D planar transistors on 32nm."
> 来源：<https://www.eejournal.com/industry_news/20110509-01/>（Intel 2011-05-04 新闻稿全文转载）；上市日期：<https://www.engineering.com/intel-ivy-bridge-22nm-microprocessors-hit-the-market/>

### 2.2 22nm 的公开尺寸（这是全篇最"硬"的一组几何数字）

| 参数 | 数值 | 说明 | 置信度 |
|---|---|---|---|
| Fin pitch（鳍间距） | **60 nm** | Intel 在 22nm SoC（P1271）工艺说明中给出 | [LIKELY]（SemiAccurate 引 Intel 图） |
| Fin height（鳍高） | **34 nm** | 不含栅极；加栅极后约 +5–8 nm | [LIKELY] |
| Fin width（鳍宽） | **8 nm** | 取鳍侧壁中部（sloped sidewall 中点），不含栅介质 | [LIKELY] |
| Gate pitch（CPP） | **≈90 nm** | 由 14nm 的 70 nm = 0.78× 反推 | [LIKELY]（推算值） |
| SRAM 位单元 | **0.092 µm²** | 22nm 6T SRAM | [LIKELY]（由 EE Times 文中换算基数得出） |

**教学要点：Tri-Gate 的"有效宽度"公式**
单位 fin 的有效沟道宽度（per-fin effective width）近似为

    W_eff,fin ≈ 2·H_fin + W_fin   （三面导电；底面不计）

22nm 代入：2×34 + 8 = **76 nm/fin**（推算值，[LIKELY]）。这就是"一个 fin 相当于一条 76nm 宽的平面沟道"的由来，也是后面"多鳍（multi-fin）"要解决的问题。

> 来源：<https://www.semiaccurate.com/2013/05/10/intel-talks-about-their-22nm-p1271-soc-process-for-silvermont/>（60 nm pitch / 34 nm 高 / 8 nm 宽，均引 Intel 幻灯片）；<https://www.eetimes.com/intel-vs-intel/>（22nm→14nm 几何对比的基数）

---

## 3. 多鳍（Multi-Fin）与 Intel 14nm

### 3.1 关键事实

| 项目 | 内容 | 置信度 |
|---|---|---|
| 工艺 | Intel **14nm**，官方称"**2nd generation Tri-gate (FinFET)** transistors" | [CONFIRMED]（Intel 2014-08-11 材料原话） |
| 量产状态 | 2014-08-11 官方："now qualified and in volume production" | [CONFIRMED] |
| 首发产品 | **Broadwell**（首款产品为 Core M，2014-09-05 于 IFA 发布） | [CONFIRMED] |
| 官方设计要点 | "**Taller and Thinner Fins** for Increased Drive Current and Performance"；"**Reduced Number of Fins** for Improved Density" | [CONFIRMED]（Intel 原话，直接回答"为什么多鳍/少鳍"） |

### 3.2 22nm vs 14nm 几何对比

| 参数 | 22nm | 14nm | 变化 | 置信度 |
|---|---|---|---|---|
| Fin pitch | 60 nm | **42 nm** | 0.70× | [LIKELY]（Intel 数据，EE Times 引） |
| Gate pitch (CPP) | ≈90 nm | **70 nm** | 0.78× | [LIKELY] |
| Interconnect pitch | — | **52 nm** | — | [LIKELY] |
| Fin height | 34 nm | **42 nm** | 更高（+24%） | [LIKELY] |
| Fin width | 8 nm | 更薄（官方称 thinner，未给具体值） | — | [UNCERTAIN]（14nm fin 宽未公开确切值） |
| 6T SRAM 位单元 | 0.092 µm² | **0.0588 µm²** | 0.64× | [LIKELY] |

### 3.3 为什么要"多鳍"：驱动电流是**量化**的

| 概念 | 公式/关系 | 教学解释 | 置信度 |
|---|---|---|---|
| 单鳍驱动电流 | I_d,fin ∝ W_eff,fin ≈ 2H+W | 一个 fin 能给的电流有上限（14nm 约 ~92 nm 等效宽度，按 2×42+8 推算） | [LIKELY]（推算） |
| 多鳍并联 | I_d = n × I_d,fin | 设计者只能以"整数个 fin"为单位调驱动能力 → 参数是**台阶式（quantized）**，不能连续调 | [CONFIRMED]（SemiAccurate 明确描述 "step changes ... in a quantized way"） |
| 代价 | 面积 ∝ n × fin pitch；栅电容 ∝ n | 加 fin 提升驱动，同时增加栅电容与面积 → 这就是"性能库 vs 密度库"的根源 | [LIKELY] |
| 14nm 的解法 | 鳍更高更薄 → 单鳍电流更大 → 达到同一驱动所需 fin 数减少 | 官方原话"Reduced Number of Fins for Improved Density" | [CONFIRMED] |

### 3.4 "密度库 vs 性能库"（density vs performance library）

| 概念 | 含义 | 在 14nm/22nm 的体现 | 在 18A 的体现 | 置信度 |
|---|---|---|---|---|
| 高性能库（HP） | 单元高、fin 多、驱动强、面积大 | Intel 22nm/14nm 的 HP 标准单元 | **180 nm cell height**（HP 库） | [CONFIRMED]（18A 数值来自 Intel 技术简报/Nature） |
| 高密度库（HD） | 单元矮、fin 少、面积小、频率略低 | 移动端/SoC 用 | **160 nm cell height**（HD 库） | [CONFIRMED] |

> 来源：Intel 14nm 官方材料 <https://download.intel.com/newsroom/kits/14nm/pdfs/Intel_14nm_New_uArch.pdf>；几何数字 <https://www.eetimes.com/intel-vs-intel/>（原表：42nm fin pitch, 0.70×; 70nm gate pitch, 0.78×; 52nm interconnect pitch; 42nm high fins, up from 34nm）；量产与 Broadwell 首发 <https://www.eweek.com/pc-hardware/intel-launches-core-m-broadwell-for-two-in-one-systems/>（2014-09-05）。

---

## 4. TSMC N3（3nm）与 FINFLEX：FinFET 的"最后一舞"

### 4.1 关键事实

| 项目 | 内容 | 置信度 |
|---|---|---|
| 节点 | TSMC **N3**（3nm 级），**仍是 FinFET**，不是 GAA | [CONFIRMED] |
| 量产时间 | 2022 年下半年；**2022-12-29** 于南科 Fab 18 举行"3nm 量产暨扩厂典礼" | [CONFIRMED] |
| 官方说法 | "TSMC's industry-leading N3 technology, **set to enter volume production later in 2022**" | [CONFIRMED]（2022-06-16 新闻稿原话） |
| 下一代 | **N2 才换 nanosheet（GAA）**，2025 年投产 | [CONFIRMED] |
| 独门设计 | **FINFLEX™**：同一颗芯片内混用不同 fin 数的标准单元 | [CONFIRMED] |

### 4.2 FINFLEX 的三种配置（官方定义，逐字对应）

| 配置 | 官方定位（原文） | 中文 | 适用 | 置信度 |
|---|---|---|---|---|
| **3-2** | "a 3-2 fin configuration for **ultra performance**" | 3 鳍 + 2 鳍 | CPU 大核、高频逻辑 | [CONFIRMED] |
| **2-2** | "a 2-2 fin configuration providing a balance ... for **Efficient Performance**" | 2 鳍 + 2 鳍 | 平衡型 | [CONFIRMED] |
| **2-1** | "a 2-1 fin configuration for **best power efficiency and transistor density**" | 2 鳍 + 1 鳍 | 低功耗、密度优先 | [CONFIRMED] |

> 官方原文："The TSMC FINFLEX™ innovation offers choices of different standard cells with a 3-2 fin configuration for ultra performance, a 2-1 fin configuration for best power efficiency and transistor density, and a 2-2 fin configuration providing a balance between the two for Efficient Performance."
> 来源：<https://pr.tsmc.com/english/news/2939>（2022-06-16）；量产典礼 <https://pr.tsmc.com/schinese/news/2986>（2022-12-29）。

### 4.3 "复杂形状"到底是什么：merged epitaxial source/drain

| 结构 | 英文 | 为什么长这样 | 置信度 |
|---|---|---|---|
| 合并外延源漏 | **merged epitaxial S/D**（diamond / octahedral faceted epi） | 相邻 fin 的源/漏用**一次外延**连成一体，形成菱形/八面体facets；目的是降低源漏电阻（R_sd）并把应力（strain）传给沟道 | [LIKELY]（业界通用结构，Intel/TSMC 论文均描述；具体 facet 角度厂商未逐一公开） |
| 为什么需要合并 | 3nm 世代 fin pitch 已很小，单 fin 接触面积不足 | 合并后接触面积↑ → 接触电阻↓；但也带来**寄生电容↑**与**桥接短路风险** | [LIKELY] |
| 形状为何是"钻石/八面体" | 外延沿 Si 特定晶面生长速率不同（{111} 面最慢） | 自然形成带斜面的多面体；后续靠工艺窗口控制 | [LIKELY] |

### 4.4 为什么 fin 的高/宽不能无限优化（三条硬约束）

| 约束 | 物理原因 | 后果 | 置信度 |
|---|---|---|---|
| **机械稳定性** | fin 高宽比（aspect ratio）过大 → 在刻蚀、清洗、干燥（表面张力）时**倒伏/粘连** | 限制 H_fin/W_fin，一般控制在 ~5–10 以内 | [LIKELY]（业界经验规则，非单一厂商公开值） |
| **寄生电容** | 栅极对 fin 侧壁的耦合电容 ∝ H_fin；fin 越高，C_g 越大 | 频率收益被电容吃掉；动态功耗上升 | [CONFIRMED]（器件物理） |
| **电阻** | fin 越薄，截面越小 → 鳍内串联电阻↑；接触面积↓ → 接触电阻↑ | 驱动电流收益被 R 吃掉；需要 merged epi 补偿 | [CONFIRMED]（器件物理） |

> **诚实的空白**：TSMC 从未公开 N3 的 fin height / fin width 具体 nm 值（只公开 fin 数配置与密度/性能倍数）。网页若出现"N3 fin 高 xx nm"，基本可判定为估算或传闻，应标 [UNCERTAIN]。
> 来源：<https://pr.tsmc.com/english/news/2939>；<https://pr.tsmc.com/schinese/news/2986>。

---

## 5. Intel 18A 与 RibbonFET

### 5.1 命名与时间线

| 时间 | 事件 | 置信度 |
|---|---|---|
| 2021-07-26 | "Intel Accelerated" 活动：发布 **RibbonFET** 与 **PowerVia**，公布 20A / 18A 路线，进入"angstrom era" | [CONFIRMED] |
| 2024–2025 | 18A 在 Oregon 进入早期生产（early production），随后转往 Arizona Fab 52  ramp | [LIKELY]（Intel 2025-10 表述："began early production at the company's Oregon location and is now ramping toward high-volume production in Arizona"） |
| 2025-10-09 | Intel 首次公开 Panther Lake 架构；Arizona **Fab 52** 全面运转 | [CONFIRMED] |
| 2026-01-05 | Core Ultra Series 3（Panther Lake）发布 —— 首个 18A 平台 | [CONFIRMED] |
| 2026-06-01 | Xeon 6+（Clearwater Forest）发布 —— 首个 18A 服务器 CPU | [CONFIRMED] |
| 2026 | 18A-P / 18A-PT 作为衍生产能扩展（官方页面已列出） | [CONFIRMED]（官方页面存在） |

> 来源：<https://www.intc.com/news-events/press-releases/detail/1486/intel-accelerates-process-and-packaging-innovations>（2021-07-26，RibbonFET/PowerVia 首次发布）；<https://www.intel.com/content/www/us/en/foundry/process/18a.html>

### 5.2 RibbonFET 的结构（"是什么"）

| 项目 | 内容 | 置信度 |
|---|---|---|
| 定义 | Intel 的 **GAA（gate-all-around）** 晶体管；沟道是一条条**水平悬浮的 ribbon（nanosheet）** | [CONFIRMED]（官方："RibbonFET is Intel Foundry's gate-all-around transistor architecture, in which the channel is fully surrounded by the gate"） |
| 栅极包裹 | **四面全包**（top / bottom / 左右 sidewall）—— 这是与 FinFET 三面的本质区别 | [CONFIRMED] |
| Ribbon 数量 | **4 条**堆叠（4 stacked ribbons） | [LIKELY]（SemiAnalysis 对 Panther Lake 的拆解；Intel 官方只说"stacked ribbon channels"，未在网页写数字） |
| 对比 | 同期 Samsung SF2 的 MBCFET 拆解为 **3 条** | [UNCERTAIN]（单一拆解来源，仅作对照，不建议写进网页正文） |
| Ribbon 宽度选项 | 官方以代号给出：18A 有 **W2、W3**；18A-P 增加 **W1（低功耗）、W1.5（低功耗）、W3P（HP dual-contact）** | [CONFIRMED]（Intel 18A technology brief, Table 1） |
| 具体宽度 nm | **未公开**（Intel 只给代号，不给 nm） | [UNCERTAIN] —— 网页**不得**写"ribbon 宽 20nm"之类 |
| 库高度 | **180 nm（HP）/ 160 nm（HD）** | [CONFIRMED]（Intel brief + Nature Electronics 摘要） |
| V_t 选项 | 18A：**4 对** logic V_t；18A-P：**5+ 对**（新增 ULVt 与 LVt 之间的档位），ULVt 再低 **10 mV** | [CONFIRMED]（Intel brief） |

> 官方原文："RibbonFET is Intel Foundry's gate-all-around transistor architecture, in which the channel is fully surrounded by the gate to enable precise electrostatic control. This structure improves control of short-channel effects and supports continued transistor scaling beyond FinFET, while enabling flexible optimization through varying ribbon widths and multiple threshold voltage options."
> 来源：<https://www.intel.com/content/www/us/en/foundry/process/18a.html>；宽度代号与库高：<https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2025-03/foundry-18a-platform-brief.pdf>

### 5.3 官方 PPA 表述（**逐字**记录，注意口径差异）

**A. 官方 18A 产品页（2026 年版，当前口径）**

> "Delivers **up to 18% higher performance at iso power, 38% lower power at iso performance, and 30% chip density improvement versus Intel 3**."
> "Enables stronger voltage-to-frequency scaling, with production silicon demonstrating **approximately 30% higher CPU frequency at ~0.5 V** versus FinFET designs."
> "PowerVia reduces **worst-case dynamic voltage droop by as much as 10x** while enabling **up to 11% block-level area compaction** in routed designs."

| 指标 | 数值 | 基准 | 条件 | 置信度 |
|---|---|---|---|---|
| 性能 | **+18%** | Intel 3 | iso-power | [CONFIRMED] |
| 功耗 | **−38%** | Intel 3 | iso-performance | [CONFIRMED] |
| 密度 | **+30%**（=1.3×） | Intel 3 | 芯片级 | [CONFIRMED] |
| 低压频率 | **+~30%** | FinFET 设计 | Vcc ≈ 0.5 V | [CONFIRMED] |
| 电压跌落 | **~10×** 改善 | FS-PDN（前段供电） | 最坏情况动态 droop | [CONFIRMED] |
| 面积 | **6–11%** 压缩 | 前段供电设计 | 已布线块级 | [CONFIRMED] |

**B. 2025-10-09 新闻稿（发布时的口径 —— 与 A 不同！）**

> "Intel 18A is the first 2-nanometer class node developed and manufactured in the United States, delivering **up to 15% better performance per watt and 30% improved chip density** compared to Intel 3."

| 指标 | 数值 | 日期 | 说明 | 置信度 |
|---|---|---|---|---|
| 性能/瓦 | **up to 15%** | 2025-10-09 | 与产品页的 18% 并存，**不要**只取一个 | [CONFIRMED] |
| 密度 | **30%** | 2025-10-09 | 与产品页一致 | [CONFIRMED] |

**C. VLSI 2025 论文（Fischer et al., T1-1）—— 学术口径，给出了电压条件**

> 论文摘要："An advanced Intel 18A technology featuring RibbonFET and PowerVia provides **over 30% density scaling** and **a full node of performance improvement** compared to Intel 3."
> Nature Electronics 研究亮点转述："... a frequency improvement of **18%** and a power decrease of **38%** at an iso-power of **0.75 V** (and **25% and 36%**, respectively, at **1.1 V**). ... a **30%** improvement in density scaling, with a bitcell area of **0.021** for high-density cells and **0.023** for high-current cells."

| 指标 | @0.75 V | @1.1 V | 置信度 |
|---|---|---|---|
| 频率提升 | **18%** | **25%** | [CONFIRMED]（Nature 转述论文） |
| 功耗下降 | **38%** | **36%** | [CONFIRMED] |
| 密度 | **30%** | — | [CONFIRMED] |

> ⚠️ **口径警示（网页必须写清）**：18%/38% 这组数字**对应 0.75 V 等功耗点**；在 1.1 V 下是 25%/36%。很多二手报道把 18%/38% 说成"无条件"指标，是不准确的。
> ⚠️ **单位疑点**：Nature 摘要写 "bitcell area of 0.021 **mm²**"，但 SRAM 位单元不可能有 0.021 mm² 这么大（那是一个大芯片的面积），应为 **0.021 µm²**（HD）与 **0.023 µm²**（HC）。引用时建议写 "0.021/0.023 µm²（原文单位印作 mm²，显系笔误）"，并标 [LIKELY]。
> 来源：<https://www.intel.com/content/www/us/en/foundry/process/18a.html>；<https://www.intel.com/content/www/us/en/newsroom/news/client-computing/intel-unveils-panther-lake-architecture-first-ai-pc-platform-built-on-18a.html>；<https://www.nature.com/articles/s41928-025-01425-y>；论文条目 <https://www.mendeley.com/catalogue/c48bc50b-f2f6-3018-a28b-e7e34a4e2d86/>

### 5.4 18A 的其它官方数字（可放心使用）

| 项目 | 数值 | 说明 | 置信度 |
|---|---|---|---|
| Omni MIM 电容密度 | **397 fF/µm²** | 片上去耦电容，业界已公布最高值（Intel 自称） | [CONFIRMED]（Intel brief） |
| 18A-P 相对 18A | **+9%** 性能（iso-power）或 **−18%** 功耗（iso-perf）；密度持平 | 设计规则兼容 | [CONFIRMED] |
| 18A-P 频率 | **+~12%**（iso-leakage，front-end） | — | [CONFIRMED] |
| 18A-P Power Boost（W3P） | **>10%** 频率提升（matched capacitance） | dual-contact 器件 | [CONFIRMED] |
| 18A-P 热阻 | **20–40%** 改善；键合栈热导 **~50%** 提升；ΔT 最多 **−40%**（@1500 W/cm²） | — | [CONFIRMED] |
| 18A-PT（base die） | 密度 **20–25%**↑、功耗 **25–35%**↓、die-to-die 带宽密度 **~9×**（vs Intel 3-T） | 面向 3DIC/HBM base die | [CONFIRMED] |

---

## 6. PowerVia：背面供电（Backside Power Delivery）

### 6.1 它到底改了什么

| 项目 | 传统（FS-PDN，前段供电） | PowerVia（BS-PDN，背面供电） | 置信度 |
|---|---|---|---|
| 电源网络位置 | 与信号线共用正面金属层 | 主要供电网络、粗间距电源金属和凸块置于背面 | [CONFIRMED] |
| 连接方式 | 正面金属 → via → 器件 | 各标准单元内嵌有 nano-TSV，连通背面电源金属与本地源漏触点；通孔数目取决于布局 | [CONFIRMED]（Intel 技术简报图 2；Panther Lake 实物剖面） |
| 正面金属用途 | 电源 + 信号混排，拥塞 | 释放走线空间给信号，部分层可放宽金属间距 | [CONFIRMED] |
| 粗间距金属/凸块 | 在正面 | 移到背面 | [CONFIRMED] |

### 6.2 制造流程（关键工艺步骤）

| 步骤 | 内容 | 置信度 |
|---|---|---|
| 1 | 正面完成器件 + nano-TSV（**从正面形成**，vias 向下延伸到硅中） | [LIKELY]（SemiAnalysis 拆解描述："forms nano-TSVs from the front"） |
| 2 | 完成正面信号布线（BEOL） | [CONFIRMED] |
| 3 | **将正面键合到载片（carrier wafer / carrier glass）** | [CONFIRMED]（Intel 论文与教程均描述 carrier bond） |
| 4 | **翻转并减薄（flip & thin）** 硅片，直到露出 nano-TSV 尖端 | [CONFIRMED] |
| 5 | 在背面做背面金属层（backside power metal）与凸块 | [CONFIRMED] |
| 6 | 背面光刻必须与正面图形**对准（two-sided alignment / overlay）** | [CONFIRMED]（工艺必然要求）；具体 overlay 规格 **未公开** [UNCERTAIN] |

Intel 的结构图标出了正面互连、器件和背面互连三个区域。Panther Lake 实物剖面进一步显示，窄通孔沿本地源漏触点侧边延伸，晶圆减薄后，其另一端接到背面金属。[Intel 18A 技术简报，图 2](https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2026-06/foundry-18a-technology-brief.pdf) · [Panther Lake 实物拆解](https://newsletter.semianalysis.com/p/intel-panther-lake-teardown)

### 6.3 收益（官方数字，按时间分层）

| 指标 | 数值 | 时间/出处 | 置信度 |
|---|---|---|---|
| 平台电压跌落改善 | **>30%** | 2023-06-05 PowerVia 测试芯片新闻稿 | [CONFIRMED] |
| 频率收益 | **6%** | 同上（Blue Sky Creek 测试芯片） | [CONFIRMED] |
| 单元利用率 | **>90%** | 同上 | [CONFIRMED] |
| 最坏情况动态 droop | **~10×** 改善 | 2025/2026 产品页与技术简报 | [CONFIRMED] |
| 峰值 droop 下 Fmax | **5–6%** 改善 | 18A technology brief, Fig.9 | [CONFIRMED] |
| 块级面积压缩 | **6–11%** | 18A brief | [CONFIRMED] |
| 布线收敛（routing closure） | **8–10%** 改善 | 18A brief | [CONFIRMED] |
| 掩膜数减少 | **up to 44%** | 仅在最低两层信号布线层 | [CONFIRMED] |
| 工艺步数减少 | **up to 42%** | 同上 | [CONFIRMED] |

> ⚠️ **两个"30%"不要混淆**：
> - **>30%** = 2023 年测试芯片的**平台电压跌落（platform voltage droop）改善**；
> - **~10×** = 2026 年产品页的**最坏情况动态 droop** 改善。
> 两者是不同测试条件、不同表述，网页写"电压跌落改善 >30%"没错（有 2023 官方稿），但**更准确**的当前口径是"最坏情况 droop 改善约 10 倍"。

### 6.4 工艺与物理约束（教学重点）

| 约束 | 内容 | 数值/说明 | 置信度 |
|---|---|---|---|
| **双面对准** | 背面图形必须对正面器件对准；对准误差直接变成 nano-TSV 与器件接触的套刻误差 | 具体 overlay 预算 Intel **未公开** | [CONFIRMED]（要求存在）/[UNCERTAIN]（数值） |
| **晶圆减薄** | 键合到载片后必须把硅减薄到能露出 nano-TSV 尖端 | 减薄均匀性（TTV）是良率关键；业界报告量级 **~3 µm TTV** | [LIKELY]（Chip Scale Review 综述，非 Intel 专属值） |
| **热** | 背面原本是主要散热路径，加了背面金属与键合层后热阻变化复杂 | 18A-P 通过键合层工程把**键合栈热导提升 ~50%**，整体热阻改善 **20–40%** | [CONFIRMED]（Intel brief） |
| **机械** | 减薄后的薄片必须靠载片支撑，否则翘曲/碎片 | 载片键合 + 临时键合胶（TBDB）流程 | [LIKELY] |
| **成本** | 增加背面金属层 → 成本上升；靠减少正面掩膜/步数抵消 | −44% 掩膜 / −42% 步数（局部） | [CONFIRMED] |

> **诚实的空白**：Intel 从未公开 nano-TSV 的直径、深宽比、pitch 具体数值，也未公开背面光刻的 overlay 规格。网页如需要"nano-TSV 直径 xx nm"，只能标 [UNCERTAIN] 或干脆不写。
> 来源：<https://download.intel.com/newsroom/archive/2025/en-us-2023-06-05-powervia-test-shows-industryleading-performance.pdf>（>30% droop / 6% freq / >90% utilization）；<https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2025-03/foundry-18a-platform-brief.pdf>（10× / 6–11% / 8–10% / 44% / 42%）

---

## 7. 产品：谁真的用了 18A

### 7.1 Panther Lake（Core Ultra Series 3）—— 首个 18A 客户端平台

| 项目 | 内容 | 置信度 |
|---|---|---|
| 代号 / 品牌 | Panther Lake / **Intel Core Ultra Series 3** | [CONFIRMED] |
| 发布 | **2026-01-05**（CES 2026，Las Vegas） | [CONFIRMED] |
| 上市 | 预购 2026-01-06；全球开卖 **2026-01-27** | [CONFIRMED] |
| 首个 18A 产品 | 是（"first compute platform built on Intel 18A"） | [CONFIRMED] |
| 使用 18A 的 tile | **Compute tile（计算芯粒）**：CPU 核、NPU、媒体引擎、内存控制器 | [CONFIRMED]（Intel 官方口径） |
| 其它 tile | GPU tile：**Intel 3 或 TSMC N3E（按 SKU 不同）**；SoC/平台控制器 tile：**TSMC N6** | [LIKELY]（TechPowerUp / TrendForce，Intel 未在新闻稿逐 tile 说明） |
| 顶级 SKU | **Core Ultra X9 388H**（新设 X9 / X7 档） | [CONFIRMED] |
| 规格（顶级 SKU） | 最多 **16** 个 CPU 核；**12** 个 Xe3 GPU 核；**50 TOPS** NPU | [CONFIRMED]（官方新闻稿原句："up to 16 CPU cores, 12 Xe-cores and 50 NPU TOPS"） |
| 官方性能说法 | 多线程 **+60%**（vs Lunar Lake，25W）；游戏 **+77%**；续航 **27 小时**（Netflix 流媒体） | [CONFIRMED]（官方，含基准测试条件） |
| 采用机型 | **200+** 款设计 | [CONFIRMED] |

> ⚠️ 规格表述要小心：官方原句是 "The top SKUs feature up to 16 CPU cores, 12 Xe-cores and 50 NPU TOPS"。其中 "12 Xe-cores" 是 GPU 核，不是 CPU 核；不要写成"16 核 + 12 核 CPU"。
> 来源：<https://newsroom.intel.com/client-computing/ces-2026-intel-core-ultra-series-3-debut-first-built-on-intel-18a>；架构细节 <https://www.intel.com/content/www/us/en/newsroom/news/client-computing/intel-unveils-panther-lake-architecture-first-ai-pc-platform-built-on-18a.html>；tile 制程 <https://www.techpowerup.com/review/intel-panther-lake-technical-deep-dive/3.html>

### 7.2 Xeon 6+（Clearwater Forest）—— 首个 18A 服务器 CPU

| 项目 | 内容 | 置信度 |
|---|---|---|
| 代号 / 品牌 | Clearwater Forest / **Intel Xeon 6+** | [CONFIRMED] |
| 定位 | E-core（能效核）服务器处理器，面向 agentic AI / 云原生 | [CONFIRMED] |
| 发布 | **2026-06-01**（Computex 2026，台北） | [CONFIRMED] |
| 核心数 | 最多 **288** 个 E-core（Darkmont） | [CONFIRMED] |
| 封装 | **12 个 18A compute tile**（每个 24 核）+ **3 个 Intel 3 base tile** + **2 个 Intel 7 I/O tile**；Foveros Direct 3D + EMIB | [LIKELY]（多家媒体一致，Intel 未在新闻稿给全 tile 清单） |
| 内存 | **12** 通道 DDR5-**8000** MT/s | [CONFIRMED] |
| PCIe / CXL | **96** lane PCIe / **64** lane CXL | [CONFIRMED] |
| LLC | **576 MB** | [CONFIRMED] |
| 插槽 / TDP | 1–2 socket；单 CPU 最高 **450 W** | [CONFIRMED] |
| 官方客户案例 | Ericsson：同核数 **+30%** 性能、**+60%** 性能/瓦、机架功耗 **−38%** | [CONFIRMED]（Intel 声称，实测部署） |

> 来源：<https://www.datacenterdynamics.com/en/news/intel-launches-xeon-6-cpu-pitches-it-for-agentic-ai-boom/>（2026-06-01 发布、288 核、450W、12 通道 DDR5-8000、576MB）；tile 构成 <https://www.tweaktown.com/news/111983/intel-officially-launches-xeon-6-plus-clearwater-forest-cpus-up-to-288-cores-built-on-intel-18a/index.html>

### 7.3 时间线（产品视角）

| 日期 | 事件 | 置信度 |
|---|---|---|
| 2025-10-09 | Panther Lake 架构公开；Xeon 6+ 预览；Fab 52 全面运转 | [CONFIRMED] |
| 2026-01-05 | Core Ultra Series 3 发布（首个 18A 产品） | [CONFIRMED] |
| 2026-01-27 | 首批 18A 笔记本全球上市 | [CONFIRMED] |
| 2026-06-01 | Xeon 6+（Clearwater Forest）发布 | [CONFIRMED] |
| 2026 下半年 | 18A 在 Fab 52 进入**高量产（HVM）** | [CONFIRMED]（Intel 2025-10 表述："set to reach high-volume production using Intel 18A later this year"） |

### 7.4 确认 vs 传闻（写网页时必须区分）

| 说法 | 状态 | 依据 | 置信度 |
|---|---|---|---|
| Panther Lake 的 compute tile 用 18A | **确认** | Intel 官方 | [CONFIRMED] |
| Panther Lake 的 GPU tile 用 18A | **错误/过时** | 后续资料显示为 Intel 3 或 TSMC N3E | [CONFIRMED]（否定） |
| Panther Lake 的 SoC tile 用 TSMC N6 | **据报道** | TrendForce / TechPowerUp | [LIKELY] |
| 18A 用 4 条 ribbon | **拆解证据** | SemiAnalysis 对 Panther Lake 的 TEM 拆解 | [LIKELY] |
| 18A ribbon 宽度 = 20 nm 之类 | **无官方依据** | Intel 只给 W1/W2/W3 代号 | [UNCERTAIN] |
| 18A 密度"接近 TSMC N3E、落后 N2" | **第三方分析** | SemiAnalysis 拆解结论 | [UNCERTAIN]（分析观点，非事实） |
| 18A 良率具体百分比 | **未公开** | 任何"良率 65%/70%"均为传闻 | [UNCERTAIN] |
| Xeon 6+ 的 12 个 compute tile 构成 | **媒体一致，官方未逐项确认** | TweakTown / Wccftech | [LIKELY] |

---

## 8. 术语表（Glossary）

| 术语 | 英文 | 定义 | 单位/典型值 | 为什么重要 |
|---|---|---|---|---|
| **栅长** | Gate length, L_g | 栅极在源漏方向上覆盖沟道的长度；决定沟道控制力与短沟道效应强弱 | nm | 缩放的核心变量；L_g 越短，SCE 越严重 |
| **栅极间距** | Gate pitch / CPP（contacted poly pitch） | 相邻两条栅极中心线的距离 = L_g + 接触/隔离宽度 | nm（22nm≈90，14nm=70） | 决定标准单元宽度与密度 |
| **鳍间距** | Fin pitch | 相邻两条 fin 中心线的距离 | nm（22nm=60，14nm=42） | 决定 fin 密度；与 W_eff/面积直接相关 |
| **有效沟道宽度** | W_eff | 一个器件实际参与导电的沟道宽度；三栅 ≈ 2H+W，GAA ≈ 2(W_ribbon+H_ribbon)×n | nm | 决定驱动电流 I_d ∝ W_eff/L_g |
| **DIBL** | Drain-Induced Barrier Lowering | 漏压升高导致源端势垒下降、V_t 下降的效应 | mV/V | 关态漏电与输出电阻的杀手 |
| **亚阈值摆幅** | Subthreshold Swing, SS | 使漏电流变化一个数量级所需的栅压变化 | mV/dec；室温下限 **60** | 衡量栅控能力的"体温计" |
| **EOT** | Equivalent Oxide Thickness | 把高 K 栅介质折算成 SiO₂ 的等效厚度 | nm | 决定栅电容与短沟道控制；已接近隧穿极限 |
| **nano-TSV** | nano-scale Through-Silicon Via | 穿过减薄后的硅层，把背面电源接到器件旁本地触点的纳米级通孔 | 本动画为示意比例 | PowerVia 通过标准单元中的 nano-TSV 分配电力，具体数量随布局而定 |
| **BEOL** | Back End Of Line | 晶体管之后的金属互连层（M1 以上） | 层数 | 信号与电源走线所在；PowerVia 把电源移出 BEOL |
| **MOL** | Middle Of Line | 晶体管与 BEOL 之间的接触层（源漏接触、栅接触） | — | 接触电阻的主要来源；18A-P 在此处做低阻接触 |
| **PowerVia** | PowerVia | Intel 的背面供电（backside power delivery）实现 | — | 同时解决 IR drop 与布线拥塞 |

---

## 9. 主要来源清单（按可信度排序）

**一手（厂商）**
1. Intel 18A 官方产品页 —— <https://www.intel.com/content/www/us/en/foundry/process/18a.html>
2. Intel 18A Process Node Family Technology Brief（PDF，2026-06 版）—— <https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2025-03/foundry-18a-platform-brief.pdf>
3. Intel 新闻稿：Panther Lake 架构（2025-10-09）—— <https://www.intel.com/content/www/us/en/newsroom/news/client-computing/intel-unveils-panther-lake-architecture-first-ai-pc-platform-built-on-18a.html>
4. Intel 新闻稿：CES 2026 Core Ultra Series 3（2026-01-05）—— <https://newsroom.intel.com/client-computing/ces-2026-intel-core-ultra-series-3-debut-first-built-on-intel-18a>
5. Intel 新闻稿：PowerVia 测试芯片（2023-06-05）—— <https://download.intel.com/newsroom/archive/2025/en-us-2023-06-05-powervia-test-shows-industryleading-performance.pdf>
6. Intel 新闻稿：22nm Tri-Gate（2011-05-04，全文转载）—— <https://www.eejournal.com/industry_news/20110509-01/>
7. Intel 14nm 官方材料（2014-08-11）—— <https://download.intel.com/newsroom/kits/14nm/pdfs/Intel_14nm_New_uArch.pdf>
8. Intel Accelerated（2021-07-26，RibbonFET/PowerVia 首发）—— <https://www.intc.com/news-events/press-releases/detail/1486/intel-accelerates-process-and-packaging-innovations>
9. TSMC 新闻稿：FINFLEX / N3 / N2（2022-06-16）—— <https://pr.tsmc.com/english/news/2939>
10. TSMC 新闻稿：3nm 量产典礼（2022-12-29）—— <https://pr.tsmc.com/schinese/news/2986>

**学术**
11. K. Fischer et al., "Intel 18A Platform Technology Featuring RibbonFET (GAA) and PowerVia for Advanced High-Performance Computing," VLSI Symposium 2025 (T1-1). 摘要见 <https://www.mendeley.com/catalogue/c48bc50b-f2f6-3018-a28b-e7e34a4e2d86/>
12. Nature Electronics 研究亮点（对上述论文的转述，含 0.75V/1.1V 条件）—— <https://www.nature.com/articles/s41928-025-01425-y>
13. E. Karl et al., "Backside Power: Enabling Energy-Efficient Performance on Advanced Node Designs," VLSI 2026.
14. M. Shamanna et al., "CPU Cores in GAA with Backside Power: Silicon-Validated Design Insights," VLSI 2026.
15. A. Bowonder et al., "Intel 18A-P CMOS Technology Enhancement...," VLSI 2026.

**产业媒体（用于几何数字与二手确认）**
16. SemiAccurate：22nm SoC 工艺尺寸（60nm pitch / 34nm 高 / 8nm 宽）—— <https://www.semiaccurate.com/2013/05/10/intel-talks-about-their-22nm-p1271-soc-process-for-silvermont/>
17. EE Times《Intel vs. Intel》：14nm 尺寸对比（42/70/52nm，42nm 高鳍）—— <https://www.eetimes.com/intel-vs-intel/>
18. DataCenterDynamics：Xeon 6+ 发布（2026-06-01）—— <https://www.datacenterdynamics.com/en/news/intel-launches-xeon-6-cpu-pitches-it-for-agentic-ai-boom/>
19. TechPowerUp：Panther Lake 技术深度解析（tile 制程）—— <https://www.techpowerup.com/review/intel-panther-lake-technical-deep-dive/3.html>
20. Chip Scale Review（2024-07/08）：BS-PDN 与减薄 TTV 综述 —— <https://chipscalereview.com/wp-content/uploads/2024/08/Chip-Scale-Review_July-August_2024-digital.pdf>
21. Computer History Museum：平面工艺（Hoerni, 1960）—— <https://archive.computerhistory.org/resources/access/text/2013/04/102723429-05-01-acc.pdf>
22. Computer History Museum：Faggin 与硅栅工艺（1968）—— <https://computerhistory.org/profile/federico-faggin/>
23. Intel 4004 五十周年信息图（2,300 晶体管 / 10 µm / 1971-11-15）—— <https://download.intel.com/newsroom/2021/data-center/4004-infographic.pdf>

---

## 10. 未决问题与"禁止编造"清单

| 问题 | 现状 | 网页处理建议 |
|---|---|---|
| 18A ribbon 宽度的具体 nm | Intel 只给 W1/W2/W3/W3P 代号 | 写"多种 ribbon 宽度（代号 W1–W3P）"，**不写 nm** |
| 18A 的 CPP / MMP（栅极/金属间距） | 官方未在公开网页给出 | 不写；若必须写，标 [UNCERTAIN] 并注明"业界估算" |
| nano-TSV 直径 / pitch | 未公开 | 不写具体值 |
| 背面光刻 overlay 预算 | 未公开 | 只讲"需要双面对准"这一定性要求 |
| 18A 良率 | 未公开 | 不写百分比 |
| Panther Lake GPU tile 制程 | Intel 未在新闻稿逐 tile 说明；媒体称按 SKU 分 Intel 3 / TSMC N3E | 写"据报道/按 SKU 不同" |
| 18A 与 TSMC N2 的密度对比 | 仅第三方分析（SemiAnalysis） | 标 [UNCERTAIN]，注明是分析观点 |
| Nature 摘要的 bitcell 单位（mm² vs µm²） | 明显笔误 | 引用时写 µm² 并加注 |

---

*文件结束。全文所有数字均可追溯到 §9 的条目；标注 [LIKELY]/[UNCERTAIN] 者不得在网页中当作确定事实使用。*
