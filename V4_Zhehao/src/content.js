/* ---------------------------------------------------------------------------
   content.js — 全站文案与章节表
   15 章共用一条滚动进度。模型、标注与文案使用相同的章节区间。
   --------------------------------------------------------------------------- */

export const CHAPTERS = [
  {
    id: 'hero',
    weight: 0.050,
    rail: null,
    kicker: 'INTEL 18A',
    kickerCn: '硅基之旅',
    title: '开关越小，<br><em>世界越大</em>。',
    lead: '沿着几代晶体管看栅极怎样环绕硅带，再翻到芯片背面，追踪电源怎样接到器件。',
    body: ['图中的结构采用示意比例。栅极和沟道的相对位置、各条线路接到哪里，是观察的重点。'],
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
    rail: { year: '2026', tag: 'RIBBONFET' },
    kicker: '2026 · INTEL 18A',
    kickerCn: 'RIBBONFET · GAA',
    title: '四条路，<br><em>上下叠放。</em>',
    lead: '四条硅带上下堆叠，各自连接两端的源极和漏极。它们共用一个栅极。切换开关，观察四条沟道里的亮点怎样一起响应。',
    body: [
      '同一个栅极绕到每条硅带的上、下和两侧，隔着薄绝缘层，用电场控制中间那段沟道。导通时，亮点沿硅带穿过栅区。关断时，亮点消失。实际器件关断后仍可能有微小漏电。',
    ],
    facts: ['四条并联沟道', '一个共用栅极', '示意比例'],
    labels: [
      { model: 'gaa', anchor: 'gate', text: 'Gate', sub: '四条硅带共用的栅极' },
      { model: 'gaa', anchor: 'ribbon', text: 'Ribbon × 4', sub: '硅带' },
      { model: 'gaa', anchor: 'sd', text: 'Source / Drain', sub: '源 / 漏' },
    ],
  },
  {
    id: 'front',
    weight: 0.075,
    rail: { year: 'M1–M6', tag: 'INTERCONNECT' },
    kicker: '互连',
    kickerCn: '传统正面供电 · FRONT SIDE',
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
    lead: '以器件层为界，供电主干改走背面。金色是 VDD 供电网，蓝色是 VSS 回流网，两张网各接各的支路。青色的栅极控制信号走正面。',
    body: [
      '电流经过有电阻的导线会损失一部分电压。背面可以铺设较宽的电源线，减轻供电压降，也给正面信号布线留出空间。',
    ],
    facts: ['金色 · 供电', '蓝色 · 回流', '青色 · 栅极信号'],
    labels: [
      { model: 'stack', anchor: 'signals', text: 'Signal', sub: '正面栅极信号' },
      { model: 'stack', anchor: 'rail', text: 'VDD', sub: '金色供电网' },
      { model: 'stack', anchor: 'returnRail', text: 'VSS', sub: '蓝色回流网' },
    ],
  },
  {
    id: 'powervia',
    weight: 0.062,
    rail: { year: 'TSV', tag: 'POWERVIA' },
    kicker: 'POWERVIA',
    kickerCn: '背面供电',
    title: '翻过晶圆，<br><em>看背面的电网。</em>',
    lead: '器件和正面布线完成后，把晶圆正面贴到支撑片上，翻面、磨薄衬底，直到预埋通孔的端部露出，再接上背面金属网。',
    body: [
      '跟着一条金色支路，从分配电流的金属线找到垂直通孔。它是穿过硅片的导电连接。蓝色金属线组成独立的回流网。',
    ],
    facts: ['晶圆翻面', '减薄露出孔端', '背面电网'],
    labels: [
      { model: 'stack', anchor: 'rail', text: 'VDD', sub: '金色供电网' },
      { model: 'stack', anchor: 'returnRail', text: 'VSS', sub: '蓝色回流网' },
    ],
  },
  {
    id: 'via',
    weight: 0.043,
    rail: { year: 'TSV', tag: 'CONTACT' },
    kicker: 'POWERVIA · 放大',
    kickerCn: '器件旁的本地接点',
    title: '穿过硅片，<br><em>从侧边接入。</em>',
    lead: '沿金色支路走过竖直的纳米通孔，再转向侧面的短接头。电源就在这里接到器件的一端。青色信号线从正面接入栅极，控制源极与漏极之间的沟道。',
    body: [
      '同一逻辑单元还需要蓝色回流支路。画面用颜色区分各条路径，放大接点便于看清连接关系。',
    ],
    facts: ['背面电网', '纳米通孔', '侧面本地接点'],
    labels: [
      { model: 'stack', anchor: 'tsv', text: 'nano-TSV', sub: '穿过硅片的通孔' },
      { model: 'stack', anchor: 'sideContact', text: '本地接点', sub: '从侧边接入器件' },
      { model: 'stack', anchor: 'sigGate', text: '栅极接点', sub: '接收正面信号' },
    ],
  },
  {
    id: 'return',
    weight: 0.018,
    rail: { year: 'DIE', tag: 'WHOLE' },
    kicker: '退回来',
    kickerCn: '上下合起来，才是一颗芯粒',
    title: '一个单元是这样，<br><em>一整颗呢</em>。',
    lead: '拉远看，刚才追过的通孔只是背面电网上的一处连接。整片电网把电流分配给许多逻辑单元，正面线路则在这些单元之间传送信号。',
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
    lead: '许多晶体管组成电路，电路构成芯粒。芯粒装入封装，处理器再装上主板。镜头逐级拉远，从纳米级器件走到一台电脑。',
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
