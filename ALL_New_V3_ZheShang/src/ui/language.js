import { CHAPTERS } from '../content.js';

// The contributor's Chinese chapter table owns the order, timing and anchor
// geometry. These translations supply only what a visitor reads.
const english = {
  hero: {
    kickerCn: 'A silicon journey',
    title: 'Smaller switches.<br><em>A bigger world.</em>',
    lead: 'In 1960, a transistor was 10 micrometers long.<br>By 2026, Intel 18A had shrunk that to tens of nanometers and brought power in from the back.',
    body: ['Scroll to see how the switch changes shape.'],
  },
  planar: {
    kickerCn: 'Fairchild · Planar process',
    title: 'Bury the junction<br><em>below the surface.</em>',
    lead: 'In 1959, Jean Hoerni at Fairchild covered the emitter junction beneath the silicon surface with silicon dioxide. This was the planar process. A year later it yielded a transistor ready for mass production.',
    body: ['The gate sits like a plate over the channel, controlling current from above. Source and drain lie to either side. The 1971 Intel 4004 used this layout with 2,300 transistors and a gate length of 10 micrometers.'],
    facts: ['10 µm gate length', '2,300 transistors', 'SiO₂ passivation'],
    labels: [['Gate', 'Gate electrode'], ['Source', 'Source terminal'], ['Drain', 'Drain terminal'], ['Channel', 'Conducting channel']],
  },
  sce: {
    kickerCn: 'The limits of scaling',
    title: 'A shorter gate<br><em>struggles to shut.</em>',
    lead: 'A shorter gate means a shorter channel, lower resistance and more drive current. This sustained Moore’s law for thirty years.',
    body: ['As the drain gets closer to the gate, its electric field reaches farther under the gate and lowers the barrier at the source. This is drain-induced barrier lowering (DIBL). The subthreshold swing worsens from its room-temperature limit of 60 mV/dec, so some current still flows when the switch is off.',
      'The geometry is the problem. The gate covers only one side of the channel.'],
    facts: ['60 mV/dec theoretical limit', 'DIBL', 'Single-sided gate'],
    labels: [['Gate Length ↓', 'The gate gets shorter'], ['Short-Channel Effects', 'Affected channel region']],
  },
  finfet: {
    title: 'Stand the channel up.<br><em>Wrap three sides.</em>',
    lead: 'In May 2011, Intel announced its 22 nm Tri-Gate transistor. The channel stands upright as a fin. The gate straddles its top and both sidewalls.',
    body: ['The effective channel width goes from W to 2H+W. At 22 nm, a fin 34 nm tall and 8 nm wide provides the width of a 76 nm planar channel. Intel reported up to 37% higher performance at low voltage and less than half the power at equal performance.'],
    facts: ['60 nm fin pitch', '34 nm fin height', 'Three-sided gate'],
    labels: [['Gate', 'Straddles the fin'], ['Fin', 'Silicon fin']],
  },
  multifin: {
    kickerCn: 'Second-generation Tri-Gate',
    title: 'Need more current?<br><em>Add another fin.</em>',
    lead: 'One fin can carry only so much current. Designers add whole fins, so drive strength increases in steps.',
    body: ['Two or four fins sit side by side under one gate. Fewer fins favor density in a dense cell library. More fins favor drive strength in a performance library. Both coexist on the same process.',
      'At 14 nm the fins became taller and thinner (42 nm). Each fin could carry more current, so fewer were needed for the same drive strength.'],
    facts: ['42 nm fin pitch', 'Performance library · 4 fins', 'Density library · 2 fins'],
    labels: [['Density library', '2 fins'], ['Performance library', '4 fins']],
  },
  n3: {
    title: 'Stranger shapes.<br><em>Smaller gains.</em>',
    lead: 'TSMC’s 3 nm process still uses FinFETs. The fin section wrapped by the gate now has sloping facets that form a diamond cross-section.',
    body: ['Compared with a rectangular fin, the four diamond faces provide more effective width for the gate to control. The slopes also distribute the electric field more evenly. The crystal planes determine the shape, leaving a narrow process window.',
      'Fins can grow only so tall. At high aspect ratios, surface tension during cleaning and drying can pull a fin over. Thinner fins also have less cross-sectional area and higher series resistance.',
      'FINFLEX offers 3-2, 2-2 and 2-1 fin configurations to balance performance and density on one chip. The three-sided gate has reached its limits.'],
    facts: ['Diamond cross-section', '3-2 / 2-2 / 2-1', 'Still a FinFET'],
    labels: [['Gate', 'Wraps the diamond section'], ['Diamond Section', 'Greater effective width']],
  },
  gaa: {
    title: 'Four ribbons.<br><em>All sides wrapped.</em>',
    lead: 'RibbonFET suspends four horizontal silicon ribbons. The gate wraps each one above, below and on both sides.',
    body: ['In the same footprint, the gate gains control over two more faces and suppresses short-channel effects more strongly. This is what gate-all-around means.',
      'Designers can choose the ribbon width. Intel 18A offers W2 and W3. Wider ribbons provide more drive current and more capacitance. This is Intel’s first GAA transistor.'],
    facts: ['4 ribbons', 'Four-sided gate control', '180 / 160 nm cell heights'],
    labels: [['Gate', 'Wraps all four sides'], ['Ribbon × 4', 'Silicon ribbons'], ['Source / Drain', 'Source and drain terminals']],
  },
  front: {
    kicker: 'Interconnect', kickerCn: 'Front side',
    title: 'Power and signals<br><em>share one side.</em>',
    lead: 'More than ten metal layers sit above the transistors. Power starts in thick wires on the top two layers, then passes down through vias from layer to layer to reach the source.',
    body: ['Signal wires compete for the same space. Closer to the devices, wires get thinner and resistance rises, so voltage drops along the route (IR drop).'],
    facts: ['Copper interconnect', 'IR drop', 'Routing congestion'],
    labels: [['Signal', 'Signal wiring'], ['Power Rail', 'Power wiring']],
  },
  split: {
    kicker: 'Rerouting', kickerCn: 'Separate the power network',
    title: 'Move power<br><em>to the back.</em>',
    lead: 'Move the entire power network to the back of the silicon. Signal wires get the space freed up on the front, allowing wider wires and more room between them.',
    body: ['Thick backside wires take a shorter route to the devices, reducing resistance and inductance. Intel reported about a tenfold reduction in worst-case dynamic voltage droop and a 6%–11% reduction in routed logic-block area.'],
    facts: ['10× droop reduction', '6–11% less area', '8–10% better routing closure'],
    labels: [['Signal only', 'Frontside signals'], ['Backside Power', 'Backside power delivery']],
  },
  powervia: {
    kickerCn: 'Backside power delivery',
    title: 'Make a via.<br><em>Connect from below.</em>',
    lead: 'The key is a tiny hole called a nano-TSV. It is embedded in the silicon when frontside device fabrication finishes. The wafer is bonded to a carrier, flipped and thinned until the tip of the via is exposed.',
    body: ['Once backside metal connects to the via, power comes in from the back to the transistor’s source/drain. Each standard cell has such a via.',
      'The trade-offs are two-sided alignment and wafer thinning. The lowest two frontside wiring layers can use up to 44% fewer masks and 42% fewer process steps.'],
    facts: ['nano-TSV', 'Bonding + thinning', 'Two-sided alignment'],
    labels: [['RibbonFET', 'Transistor device']],
  },
  via: {
    kicker: 'PowerVia · Close-up', kickerCn: 'Beneath one standard cell',
    title: 'Each switch<br><em>has its own via.</em>',
    lead: 'Move in just below the device. Each slender, glowing column in this row is a nano-TSV.',
    body: ['Signal layers stack up on the front. Power arrives from the back. Between them are columns just tens of nanometers wide. The shorter path has less resistance and inductance, so less voltage is lost.'],
    facts: ['One TSV per cell', 'Standard-cell spacing', 'Power from the back'],
    labels: [['nano-TSV', 'Through-silicon via array']],
  },
  return: {
    kicker: 'Pull back', kickerCn: 'Both sides make one die',
    title: 'That was one cell.<br><em>What about a die?</em>',
    lead: 'Repeat this structure billions of times to make a chip.',
  },
  macro: {
    kicker: 'Scale', kickerCn: 'Zooming out',
    title: 'From one switch<br><em>to a computer.</em>',
    lead: 'A RibbonFET is nanometers in size. At a scale a billion times larger, you pass from a die to a packaged processor, a motherboard and a whole machine.',
  },
  products: {
    kicker: '2026 · In volume production', kickerCn: 'Products built on 18A',
    title: 'Now inside<br><em>these machines.</em>',
    lead: 'Panther Lake (Core Ultra Series 3) is the first 18A platform. It launched in January 2026 with a compute tile made on Intel 18A.',
    body: ['Xeon 6+ is the first 18A server CPU. It offers up to 288 Efficient-cores, 576 MB of last-level cache and 12 channels of DDR5-8000.',
      'The same RibbonFET and PowerVia technologies run from a single switch all the way to a rack.'],
    facts: ['Core Ultra Series 3', 'Xeon 6+ · 288C', '18A · Volume production'],
  },
  outro: {},
};

const englishChapters = CHAPTERS.map(chapter => {
  const { labels, ...words } = english[chapter.id];
  return {
    ...chapter, ...words,
    labels: chapter.labels.map((label, i) => ({ ...label, text: labels[i][0], sub: labels[i][1] })),
  };
});

export const languages = {
  zh: {
    lang: 'zh-CN', chapters: CHAPTERS,
    title: 'Intel 18A · 从一颗开关到一台电脑',
    description: '沿着晶体管七十年的变形记，从平面到 FinFET，从 3nm 到 RibbonFET，再翻到芯片背面看 PowerVia 供电。',
    brand: '硅基之旅', switcher: '展示语言', scroll: '向下滚动', loading: '正在装载晶圆…',
    scale: '非等比例', quality: '画质', levels: ['高', '中', '低'], full: '全屏', exitFull: '退出全屏',
    flow: {
      legend: '沟道光纹', group: '光纹显示方式', current: '常规电流', electrons: '电子',
      currentDirection: '漏极 D → 源极 S', electronsDirection: '源极 S → 漏极 D',
      bias: 'nMOS 示意 · 漏极电压高于源极', history: '1971 年的 Intel 4004 采用 pMOS。',
    },
  },
  en: {
    lang: 'en', chapters: englishChapters,
    title: 'Intel 18A · From One Switch to a Computer',
    description: 'Follow seventy years of transistor design, from planar devices and FinFETs to 3 nm and RibbonFET. Turn the chip over to see how PowerVia delivers power.',
    brand: 'A silicon journey', switcher: 'Display language', scroll: 'Scroll down', loading: 'Loading the wafer…',
    scale: 'Not to scale', quality: 'Graphics quality', levels: ['High', 'Medium', 'Low'], full: 'Full screen', exitFull: 'Exit full screen',
    flow: {
      legend: 'Channel traces', group: 'What the traces show', current: 'Conventional current', electrons: 'Electrons',
      currentDirection: 'Drain D → Source S', electronsDirection: 'Source S → Drain D',
      bias: 'nMOS example · Drain voltage is higher than source voltage.', history: 'The 1971 Intel 4004 used pMOS.',
    },
  },
};

const storageKey = 'gaa-exhibit-v3-language';

export function readLanguage() {
  try { return localStorage.getItem(storageKey) === 'en' ? 'en' : 'zh'; }
  catch { return 'zh'; }
}

export function saveLanguage(language) {
  try { localStorage.setItem(storageKey, language); }
  catch { /* Storage may be unavailable in an ephemeral browser session. */ }
}
