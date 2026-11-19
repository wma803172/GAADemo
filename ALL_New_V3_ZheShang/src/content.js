/* ---------------------------------------------------------------------------
   content.js — 全站文案与章节表
   所有数字都来自 docs/research.md，没有一条是编的。
   结构：[0,1] 的 progress 被切成 13 段，每段一个"beat"。
   --------------------------------------------------------------------------- */

export const CHAPTERS = [
  {
    id: 'hero',
    weight: 0.050,
    rail: null,
    kicker: 'INTEL 18A',
    kickerCn: '硅基之旅',
    title: '开关越小，<br><em>世界越大</em>。',
    lead: '1960 年，一颗晶体管有 10 微米长。<br>2026 年，18A 把它压到几十纳米，<br>顺带把电从背后送了进来。',
    body: ['往下滚。看它怎么一路变形。'],
    facts: [],
    labels: [],
  },
  {
    id: 'planar',
    weight: 0.080,
    rail: { year: '1960', tag: 'PLANAR' },
    kicker: '1960',
    kickerCn: 'FAIRCHILD · 平面工艺',
    title: '先把结，<br><em>藏进平面</em>。',
    lead: '1959 年，Fairchild 的 Jean Hoerni 用一层二氧化硅把发射结盖到硅表面之下——平面工艺。第二年，它变成可以量产的晶体管。',
    body: [
      '栅极像一块压在沟道上的板子，只从上面控制电流；两边是源极和漏极。1971 年的 Intel 4004 就是这样：2300 个晶体管，栅长 10 微米。',
    ],
    facts: ['栅长 10 µm', '2300 个晶体管', 'SiO₂ 钝化'],
    labels: [
      { model: 'planar', anchor: 'gate', text: 'Gate', sub: '栅极' },
      { model: 'planar', anchor: 'source', text: 'Source', sub: '源极' },
      { model: 'planar', anchor: 'drain', text: 'Drain', sub: '漏极' },
      { model: 'planar', anchor: 'channel', text: 'Channel', sub: '沟道' },
    ],
  },
  {
    id: 'sce',
    weight: 0.075,
    rail: { year: '1990s', tag: 'SCALING' },
    kicker: '1990s–2000s',
    kickerCn: '缩放的尽头',
    title: '板子越短，<br><em>越关不住</em>。',
    lead: '缩小栅长，沟道变短、电阻变小、驱动电流变大——摩尔定律靠它跑了三十年。',
    body: [
      '可栅极和漏极贴得越近，漏极的电场就越容易越过栅极，把源端的势垒拉低（DIBL）。亚阈值摆幅从室温极限 60 mV/dec 一路退化，该断的电流断不干净。',
      '问题出在几何：栅极只盖住了沟道的一面。',
    ],
    facts: ['60 mV/dec 理论下限', 'DIBL', '一面栅控'],
    labels: [
      { model: 'planar', anchor: 'gate', text: 'Gate Length ↓', sub: '栅长缩短' },
      { model: 'planar', anchor: 'channel', text: 'Short-Channel Effects', sub: '短沟道效应区' },
    ],
  },
  {
    id: 'finfet',
    weight: 0.085,
    rail: { year: '2011', tag: 'FINFET' },
    kicker: '2011 · INTEL 22nm',
    kickerCn: 'TRI-GATE',
    title: '把沟道立起来，<br><em>包住三面</em>。',
    lead: '2011 年 5 月，Intel 公布 22nm Tri-Gate：沟道竖起来成为鳍片，栅极跨过去，同时贴住顶面和左右两个侧壁。',
    body: [
      '一条沟道的有效宽度从 W 变成 2H+W。22nm 的鳍高 34 nm、鳍宽 8 nm，一条鳍就相当于 76 nm 宽的平面沟道。官方说法：低电压下性能最高提升 37%，同性能功耗不到一半。',
    ],
    facts: ['60 nm fin pitch', '34 nm 鳍高', '三面栅控'],
    labels: [
      { model: 'finfet', anchor: 'gate', text: 'Gate', sub: '跨过鳍片' },
      { model: 'finfet', anchor: 'fin', text: 'Fin', sub: '鳍片' },
    ],
  },
  {
    id: 'multifin',
    weight: 0.085,
    rail: { year: '2014', tag: 'MULTI-FIN' },
    kicker: '2014 · INTEL 14nm',
    kickerCn: '第二代 TRI-GATE',
    title: '一个不够，<br><em>那就并排</em>。',
    lead: '一条鳍能给的电流有上限，而设计者只能按整数条鳍加电流——驱动能力是台阶式的，不能连续调。',
    body: [
      '于是同一道栅极下并排 2 条或 4 条：少鳍换密度（密度库），多鳍换驱动（性能库），同一代工艺里同时存在。',
      '14nm 把鳍做得更高更薄（42 nm），单条鳍电流变大，达到同样驱动需要的鳍数反而少了。',
    ],
    facts: ['42 nm fin pitch', '性能库 4 鳍', '密度库 2 鳍'],
    labels: [
      { model: 'multiDense', anchor: 'gate', text: '密度库', sub: '2 fins' },
      { model: 'multiPerf', anchor: 'gate', text: '性能库', sub: '4 fins' },
    ],
  },
  {
    id: 'n3',
    weight: 0.085,
    rail: { year: '2022', tag: 'N3' },
    kicker: '2022 · TSMC 3nm',
    kickerCn: 'FINFLEX',
    title: '形状越来越怪，<br><em>收益越来越薄</em>。',
    lead: '台积电 3nm 仍然是 FinFET，但鳍片的截面已经不再是方块——栅极裹住的那一段，被做成了带斜面的「钻石」。',
    body: [
      '为什么是菱形：同样一条鳍，菱形的四个面比矩形多出一圈有效宽度，栅极能抓住的面积更大；斜面还让电场分布更均匀。代价是形状由晶面决定，工艺窗口很窄。',
      '而且鳍不能再往上长：高宽比太大，清洗干燥时的表面张力就能把它拉倒；鳍太薄，截面变小，串联电阻又上来了。',
      'FINFLEX 用 3-2、2-2、2-1 三种鳍数配置在同一颗芯片里分配性能与密度——三面栅已经用到头了。',
    ],
    facts: ['菱形截面', '3-2 / 2-2 / 2-1', '仍是 FinFET'],
    labels: [
      { model: 'n3', anchor: 'sd', text: 'Gate', sub: '裹住菱形段' },
      { model: 'n3', anchor: 'fin', text: 'Diamond Section', sub: '菱形截面 · 更大有效宽度' },
    ],
  },
  {
    id: 'gaa',
    weight: 0.085,
    rail: { year: '2026', tag: 'RIBONFET' },
    kicker: '2026 · INTEL 18A',
    kickerCn: 'RIBBONFET · GAA',
    title: '四条带子，<br><em>四面全包</em>。',
    lead: 'RibbonFET 把沟道做成四条水平悬浮的硅带，栅极从上下左右四面全包。',
    body: [
      '同一块占地，栅极多控制了两个面——短沟道效应被压得更死。这才是「全环绕（gate-all-around）」的意义。',
      '硅带宽度可以按需选（18A 给出 W2、W3 两种）：宽一点驱动强，电容也大。这是 Intel 第一个 GAA 晶体管。',
    ],
    facts: ['4 条 ribbon', '四面栅控', '库高 180 / 160 nm'],
    labels: [
      { model: 'gaa', anchor: 'gate', text: 'Gate', sub: '四面全包' },
      { model: 'gaa', anchor: 'ribbon', text: 'Ribbon × 4', sub: '硅带' },
      { model: 'gaa', anchor: 'sd', text: 'Source / Drain', sub: '源 / 漏' },
    ],
  },
  {
    id: 'front',
    weight: 0.075,
    rail: { year: 'M1–M6', tag: 'INTERCONNECT' },
    kicker: '互连',
    kickerCn: '正面 · FRONT SIDE',
    title: '电和信号，<br><em>挤在同一面</em>。',
    lead: '晶体管之上是十几层金属。电源得从最上面那两层粗线出发，一层层往下穿过通孔，才能碰到源极。',
    body: [
      '信号线也在同一片空间里抢位置。越靠近器件，线越细、电阻越大——电压就在路上掉掉了（IR drop）。',
    ],
    facts: ['铜互连', 'IR Drop', '布线拥塞'],
    labels: [
      { model: 'stack', anchor: 'signals', text: 'Signal', sub: '信号线' },
      { model: 'stack', anchor: 'rail', text: 'Power Rail', sub: '电源线' },
    ],
  },
  {
    id: 'split',
    weight: 0.075,
    rail: { year: 'BS-PDN', tag: 'SPLIT' },
    kicker: '重新排布',
    kickerCn: '把电源分到背面',
    title: '让电源，<br><em>搬到背面去</em>。',
    lead: '把整个供电网络挪到硅片背面。正面剩下的空间全给信号：线可以更粗、间距可以更松。',
    body: [
      '背面粗线走最短路径直达器件，电阻和电感都小了。Intel 的数字：最坏情况动态电压跌落改善约 10 倍，已布线逻辑块面积压缩 6%–11%。',
    ],
    facts: ['10× droop', '6–11% 面积', '8–10% 布线收敛'],
    labels: [
      { model: 'stack', anchor: 'signals', text: 'Signal only', sub: '只剩信号' },
      { model: 'stack', anchor: 'rail', text: 'Backside Power', sub: '背面供电' },
    ],
  },
  {
    id: 'powervia',
    weight: 0.062,
    rail: { year: 'TSV', tag: 'POWERVIA' },
    kicker: 'POWERVIA',
    kickerCn: '背面供电',
    title: '打个孔，<br><em>从背后插进来</em>。',
    lead: '关键是一个叫 nano-TSV 的小孔。它在正面做完器件时就埋进硅里；整片键合到载片上、翻过来、磨薄，直到孔的尖端露出来。',
    body: [
      '背面金属接上去，电就从背后直接进到晶体管的源漏——每个标准单元都有一个这样的孔。',
      '代价是双面对准与晶圆减薄；省下的是正面的掩膜和工艺步数（在最低两层布线层上最多少 44% 掩膜、42% 步数）。',
    ],
    facts: ['nano-TSV', '键合 + 减薄', '双面对准'],
    labels: [
      { model: 'stack', anchor: 'device', text: 'RibbonFET', sub: '器件' },
    ],
  },
  {
    id: 'via',
    weight: 0.043,
    rail: { year: 'TSV', tag: 'CONTACT' },
    kicker: 'POWERVIA · 放大',
    kickerCn: '一个标准单元的正下方',
    title: '每一颗开关，<br><em>都有自己一个孔</em>。',
    lead: '把镜头推到器件正下方：一排发光的细柱，就是 nano-TSV。',
    body: [
      '正面堆信号，背面送电，中间只靠这几十纳米宽的柱子相连。距离短了，电阻和电感都小，电压才掉得少。',
    ],
    facts: ['每单元一个 TSV', '间距 = 标准单元', '电从背面来'],
    labels: [
      { model: 'stack', anchor: 'tsv', text: 'nano-TSV', sub: '硅通孔阵列' },
    ],
  },
  {
    id: 'return',
    weight: 0.018,
    rail: { year: 'DIE', tag: 'WHOLE' },
    kicker: '退回来',
    kickerCn: '上下合起来，才是一颗芯粒',
    title: '一个单元是这样，<br><em>一整颗呢</em>。',
    lead: '把这套结构重复几十亿次，才是芯片。',
    body: [],
    facts: [],
    labels: [],
  },
  {
    id: 'macro',
    weight: 0.072,
    rail: { year: '10⁹×', tag: 'SCALE' },
    kicker: '尺度',
    kickerCn: '一路拉远',
    title: '从一颗开关，<br><em>到一台电脑</em>。',
    lead: '一颗 RibbonFET 是纳米级的。把它放大十亿倍，你会看到一颗芯粒、一颗封装好的处理器、一块主板，和一台机器。',
    body: [],
    facts: [],
    labels: [],
  },
  {
    id: 'products',
    weight: 0.060,
    rail: { year: '2026', tag: 'PRODUCTS' },
    kicker: '2026 · 已经量产',
    kickerCn: '搭载 18A 的产品',
    title: '现在，它在<br><em>这些机器里</em>。',
    lead: 'Panther Lake（Core Ultra 系列 3）是第一个 18A 平台，2026 年 1 月发布，计算芯粒用 18A 制造。',
    body: [
      'Xeon 6+ 是第一个 18A 服务器 CPU：最多 288 个能效核、576 MB LLC、12 通道 DDR5-8000。',
      '同一套 RibbonFET + PowerVia，从一颗开关一直铺到整个机架。',
    ],
    facts: ['Core Ultra Series 3', 'Xeon 6+ · 288C', '18A · 量产'],
    labels: [],
  },
  {
    id: 'outro',
    weight: 0.030,
    rail: null,
    kicker: 'INTEL 18A',
    kickerCn: 'RIBONFET + POWERVIA',
    title: '',
    lead: '',
    body: [],
    facts: [],
    labels: [],
    outro: true,
  },
];

/* 把 weight 归一化成 [start, end] */
let acc = 0;
for (const ch of CHAPTERS) {
  ch.start = acc;
  acc += ch.weight;
  ch.end = acc;
}
CHAPTERS[CHAPTERS.length - 1].end = 1;

export function chapterAt(p) {
  const t = Math.min(Math.max(p, 0), 0.999999);
  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch = CHAPTERS[i];
    if (t >= ch.start && t < ch.end) {
      return { index: i, chapter: ch, u: (t - ch.start) / (ch.end - ch.start) };
    }
  }
  const i = CHAPTERS.length - 1;
  const ch = CHAPTERS[i];
  return { index: i, chapter: ch, u: 1 };
}
