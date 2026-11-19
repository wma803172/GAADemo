// Progress ranges match the geometry and camera movement in chapters/stage.js.
const device = (anchor, text, sub) => ({ model: 'device', anchor, text, sub });
const stack = (anchor, text, sub) => ({ model: 'stack', anchor, text, sub });

const nets = [
  ['#f4b25e', 'VDD 供电'],
  ['#69a7ff', 'VSS 回流'],
  ['#61ded1', '正面信号'],
];

export const CHAPTERS = [
  {
    id: 'hero', weight: 0.050, kicker: 'INTEL 18A', kickerCn: '晶体管的演进',
    title: '四层硅带，<br><em>两面布线。</em>',
    lead: 'Intel 18A 让四层硅带共用一个栅极，把电源线铺到芯片背面。',
    body: ['往下滚动，从最早的平面开关看起。'],
  },
  {
    id: 'planar', weight: 0.080, kicker: '1960', kickerCn: '平面 MOS 晶体管',
    title: '从上面，<br><em>管住一条路。</em>',
    lead: '两端是源极和漏极，中间能导电的区域叫沟道。给上面的栅极加电压，它就能隔着一层绝缘材料，控制沟道是否导通。',
    body: ['1960 年，贝尔实验室的 Atalla 和 Kahng 展示了早期 MOS 晶体管。后面的变形用同一视角比较几代设计。'],
    labels: [device('gate','栅极','控制开关'), device('source','源极','沟道的一端')],
  },
  {
    id: 'sce', weight: 0.075, kicker: '平面结构', kickerCn: '短沟道效应',
    title: '两端靠近，<br><em>关断变难。</em>',
    lead: '沟道越短，漏极的电场越容易影响源极一侧。即使让栅极关掉开关，仍可能有一小股漏电流。',
    body: ['下一代设计把硅立起来，让栅极从更多方向管住沟道。'],
    labels: [device('channel','沟道','源极与漏极之间')],
  },
  {
    id: 'finfet', weight: 0.085, kicker: '2011 · INTEL', kickerCn: '鳍式晶体管',
    title: '硅立起来，<br><em>栅围住三面。</em>',
    lead: '两端仍是源极和漏极。中间的硅竖成一道鳍，栅极跨过它，能同时控制鳍的顶面和两个侧壁。',
    body: ['鳍的底部仍连着基底。Intel 在 22 nm 工艺上采用了这种 Tri-Gate 结构。'],
    labels: [device('fin','硅鳍','竖起来的沟道')],
  },
  {
    id: 'multifin', weight: 0.085, kicker: '2014 · 多鳍 FINFET', kickerCn: '增加并行沟道',
    title: '一片鳍旁边，<br><em>再添几片。</em>',
    lead: '看两端之间。多条鳍并排，各自提供一条导电路径，仍由同一道栅极控制。',
    body: ['这里从两鳍过渡到四鳍。设计时，增加鳍数通常能让开关带动更大的负载，也会占用更多空间。'],
    labels: [device('fin','并排的硅鳍','每条都连接源极和漏极')],
  },
  {
    id: 'n3', weight: 0.085, kicker: '2022 · TSMC N3', kickerCn: '鳍数与面积',
    title: '鳍怎么排，<br><em>也要做取舍。</em>',
    lead: '台积电的 N3 仍采用鳍式结构。FINFLEX 提供 3–2、2–2 和 2–1 等鳍数组合，让不同单元在速度与面积之间取舍。',
    body: ['盯住两端之间的竖鳍。接下来对照 Intel 的另一种设计：把导电的硅做成横带，一层层叠起来。'],
    labels: [device('fin','栅下的鳍','底部连着基底')],
  },
  {
    id: 'gaa', weight: 0.085, kicker: 'INTEL 18A', kickerCn: 'RIBBONFET 环绕栅',
    title: '四条硅带，<br><em>一个栅极。</em>',
    lead: '看半透明栅极包住的那一段。导通时，亮点沿四条硅带连接两端。点一下关断，四条路一起停止显示流动。',
    body: ['以 Panther Lake 为例，四层硅带上下叠放，各自隔着薄绝缘层，被同一块金属栅环绕。栅极通过电场控制沟道。'],
    labels: [device('gate','共用栅极','半透明剖视')],
    gateControl: true,
  },
  {
    id: 'front', weight: 0.075, kicker: '正面互连', kickerCn: '传统供电',
    title: '电和信号，<br><em>曾走同一面。</em>',
    lead: '从晶体管往上看，是一层层金属线。靠外的粗线负责远距离分配，靠里的细线把连接分给一个个器件。',
    body: ['相邻层可以沿不同方向布线。线从上面跨过去时仍然绝缘，只有在接了竖直通孔的位置才会连通。'],
    legend: nets, labels: [stack('signals','正面互连','细线靠近器件')],
  },
  {
    id: 'split', weight: 0.075, kicker: '背面供电', kickerCn: '两种布局对照',
    title: '信号留在正面，<br><em>电从背面来。</em>',
    lead: '以器件层为界。上面留出空间走信号，下面铺开两张彼此绝缘的电网，分别承担供电和回流。',
    body: ['电源线可以更粗，电压沿途损失也能更小。Intel 在特定已布线设计中报告，最坏情况下的动态电压跌落约为传统正面供电的十分之一。'],
    legend: nets, labels: [stack('rail','背面电源线','通往局部供电接点')],
  },
  {
    id: 'powervia', weight: 0.062, kicker: 'POWERVIA', kickerCn: '从线网到器件',
    title: '沿一根金线，<br><em>找它的落点。</em>',
    lead: '背面电源由粗线分到细线，再经过预先埋在硅中的小通孔。青绿色的输入信号则沿正面布线去控制栅极。',
    body: ['制造时，正面器件和布线完成后，晶圆贴到支撑片上再翻面、磨薄，露出预埋的孔端，随后接上背面金属。'],
    legend: nets, labels: [stack('device','器件层','两侧布线在这里各接各的端点')],
  },
  {
    id: 'via', weight: 0.043, kicker: 'POWERVIA', kickerCn: '器件侧接剖视',
    title: '从侧面接电，<br><em>从上面接信号。</em>',
    lead: '看金色通孔顶端的小横接头。它接到一只晶体管的源极接点。青绿色信号线从上方接到栅极，蓝色回流支路连着相邻器件。',
    body: ['这里放大的是同一片线网。亮点标出各自的路线，埋在硅里的金属通孔始终在原位。'],
    legend: nets, labels: [stack('sideContact','侧接头','通向源极'), stack('sigGate','栅极接点','正面输入信号')],
  },
  {
    id: 'return', weight: 0.018, kicker: '互连全景', kickerCn: '拉回视角',
    title: '一处接点，<br><em>连着整片线网。</em>',
    lead: '刚才追过的金色支路又回到整片电网中。青绿色信号线和背面电网仍分居器件两侧。',
    legend: nets,
  },
  {
    id: 'macro', weight: 0.072, kicker: '尺度', kickerCn: '从器件到系统',
    title: '从一颗开关，<br><em>到一台电脑。</em>',
    lead: '许多晶体管组成电路，电路组成芯粒。芯粒装进封装，再装到主板上，就进入了我们能拿在手里的机器。',
  },
  {
    id: 'products', weight: 0.060, kicker: 'INTEL 18A', kickerCn: '从笔记本到服务器',
    title: '走进真实的<br><em>处理器。</em>',
    lead: 'Core Ultra 系列 3 的 Panther Lake 计算芯粒采用 Intel 18A。前面看到的环绕栅和背面供电，都用在这块芯粒里。',
    body: ['在服务器里，Clearwater Forest（Xeon 6+）也采用 18A，最高配置有 288 个能效核。同一封装里的其他芯粒可以采用不同工艺。'],
  },
  {
    id: 'outro', weight: 0.030, kicker: 'INTEL 18A', kickerCn: 'RIBBONFET + POWERVIA', title: '', outro: true,
  },
];

let progress = 0;
for (const chapter of CHAPTERS) {
  chapter.start = progress;
  progress += chapter.weight;
  chapter.end = progress;
}
CHAPTERS[CHAPTERS.length - 1].end = 1;

export function chapterAt(p) {
  const index = CHAPTERS.findIndex(chapter => p < chapter.end);
  const i = index === -1 ? CHAPTERS.length - 1 : Math.max(0, index);
  const chapter = CHAPTERS[i];
  return { index: i, chapter, u: (p - chapter.start) / (chapter.end - chapter.start) };
}
