import { CHAPTERS } from './content.js';

export const COPY = {
  zh: {
    langTag: 'zh-CN', title: 'Intel 18A · 沟道与背面供电',
    description: '从平面晶体管到 Panther Lake 的四层硅带，再沿 PowerVia 找到芯片背面的供电网络。',
    brand: '硅基之旅', navigation: '跳到展示段落', evolution: '器件演变',
    gate: '环绕栅', power: '背面供电', language: '展示语言',
    scroll: '向下滚动', modelNote: '结构示意 · 非等比例', loading: '正在装载晶圆…',
    quality: '画质', qualities: ['高', '中', '低'], enterFull: '进入全屏', exitFull: '退出全屏',
    legend: '线网颜色', gateControl: '沟道导通', turnOff: '关断沟道', turnOn: '接通沟道',
    gateOn: '四层沟道导通', gateOff: '四层沟道已关断', chapter: '章节',
  },
  en: {
    langTag: 'en', title: 'Intel 18A · Channels and Backside Power',
    description: 'Explore the four stacked ribbons in a Panther Lake transistor and follow its PowerVia connection to the backside power grid.',
    brand: 'Silicon Atlas', navigation: 'Jump to a section', evolution: 'Device evolution',
    gate: 'Gate-all-around', power: 'Backside power', language: 'Display language',
    scroll: 'Scroll to explore', modelNote: 'Schematic · Not to scale', loading: 'Loading wafer…',
    quality: 'Graphics quality', qualities: ['High', 'Medium', 'Low'], enterFull: 'Enter full screen', exitFull: 'Exit full screen',
    legend: 'Wiring legend', gateControl: 'Channel conduction', turnOff: 'Switch off', turnOn: 'Switch on',
    gateOn: 'Four channels on', gateOff: 'Four channels off', chapter: 'Chapter',
  },
};

const english = {
  hero: {
    kickerCn: 'Transistor architecture',
    title: 'Four ribbons.<br><em>Two sides.</em>',
    lead: 'On Panther Lake’s 18A compute tile, one gate controls four stacked silicon ribbons. Power comes in from the back of the chip.',
    body: ['Scroll down to start with an early planar transistor.'],
  },
  planar: {
    kickerCn: 'Planar MOS transistor',
    title: 'One gate,<br><em>above the silicon.</em>',
    lead: 'The source and drain sit at opposite ends of the channel. A thin insulating film separates the gate from the silicon. Voltage on the gate controls current along the channel.',
    body: ['In 1960, Atalla and Kahng demonstrated an early MOS transistor at Bell Labs. Follow the same two ends as the channel changes shape.'],
    labels: {gate: ['Gate', 'Controls the channel'], source: ['Source', 'One end of the channel']},
  },
  sce: {
    kicker: 'PLANAR MOS', kickerCn: 'Short-channel effects',
    title: 'Short channels<br><em>can leak.</em>',
    lead: 'As the source and drain get closer, the drain’s electric field reaches further toward the source. Some current can slip through even with the gate off.',
    body: ['Raising the silicon into a fin gives the gate access from more sides.'],
    labels: {channel: ['Channel', 'Between source and drain']},
  },
  finfet: {
    kickerCn: 'Tri-Gate transistor',
    title: 'A fin rises.<br><em>The gate wraps.</em>',
    lead: 'The source and drain stay at the ends. The silicon between them rises into a fin. The gate arches over its top and down both sides.',
    body: ['The base of the fin remains attached to the substrate. Intel introduced this Tri-Gate geometry in its 22 nm process.'],
    labels: {fin: ['Silicon fin', 'The upright channel']},
  },
  multifin: {
    kicker: 'MULTI-FIN FINFET', kickerCn: 'Parallel channels',
    title: 'More fins,<br><em>side by side.</em>',
    lead: 'Several fins can connect the same source and drain. Each adds a parallel path for current, all controlled by one gate.',
    body: ['Compare a two-fin design with a four-fin design. More fins usually let a switch drive a larger load, at the cost of more area.'],
    labels: {fin: ['Parallel fins', 'Each links source and drain']},
  },
  n3: {
    kickerCn: 'Fin count and cell area',
    title: 'How many fins<br><em>fit the job?</em>',
    lead: 'TSMC’s N3 FINFLEX options include 3–2, 2–2 and 2–1. The numbers count fins for the two transistor types in a cell, letting designers trade off performance and area.',
    body: ['The model shows one transistor. Compare its upright fins with Intel’s stacked horizontal ribbons in the next view.'],
    labels: {fin: ['Fin beneath the gate', 'Joined to the substrate']},
  },
  gaa: {
    kickerCn: 'RibbonFET · Gate-all-around',
    title: 'Four ribbons.<br><em>One gate.</em>',
    lead: 'When the switch is on, lights trace four paths between source and drain. Switch it off and the lights disappear. A real transistor can still pass a tiny leakage current.',
    body: ['Look through this Panther Lake cutaway. The same metal gate wraps around each ribbon. Its electric field controls the channel across a thin insulating layer.'],
    labels: {gate: ['Common gate', 'Transparent cutaway']},
  },
  front: {
    kicker: 'INTERCONNECT', kickerCn: 'Frontside power',
    title: 'Power and signals<br><em>share a side.</em>',
    lead: 'Metal layers sit above the transistors. Wide upper wires span long distances. Finer wires close to the devices make local connections.',
    body: ['Wires on adjoining layers can cross while remaining insulated. They connect only where a vertical via joins them.'],
    labels: {signals: ['Frontside wiring', 'Fine wires near the devices']},
  },
  split: {
    kicker: 'BACKSIDE POWER', kickerCn: 'Two layouts',
    title: 'Signals above.<br><em>Power below.</em>',
    lead: 'Use the devices as the dividing line. Signals run along the front. Two separate grids on the back distribute power and carry the return.',
    body: ['Wider wires can reduce voltage loss. In Intel’s CPU core comparison, peak dynamic voltage droop on 18A with backside power was about one tenth of that on Intel 3 with frontside power.'],
    labels: {rail: ['Backside power rail', 'Feeds a local contact']},
  },
  powervia: {
    kickerCn: 'From grid to device',
    title: 'Follow one<br><em>gold line.</em>',
    lead: 'On the back, a wide rail feeds narrower lines and then a tiny via embedded in the silicon. On the front, the teal input wire leads to the gate.',
    body: ['After frontside fabrication and wiring, the wafer is bonded to a carrier, flipped and thinned. This exposes the buried via ends for connection to backside metal.'],
    labels: {device: ['Device layer', 'Front and back reach separate contacts']},
  },
  via: {
    kickerCn: 'The local contact',
    title: 'Where the<br><em>power lands.</em>',
    lead: 'In this example, the gold via feeds one transistor’s source through a side contact. Its gate receives the teal frontside signal. The blue return connects to a neighboring device.',
    body: ['This is a close-up of the same grid. The moving lights trace the routes through metal already in place.'],
    labels: {sideContact: ['Side contact', 'To the source'], sigGate: ['Gate contact', 'Frontside input']},
  },
  return: {
    kicker: 'INTERCONNECT', kickerCn: 'The full stack',
    title: 'One contact<br><em>in a wider grid.</em>',
    lead: 'As the view pulls back, the gold branch rejoins the grid. Teal signal wiring and the backside power network remain on opposite sides of the devices.',
  },
  macro: {
    kicker: 'SCALE', kickerCn: 'Device to system',
    title: 'From one switch<br><em>to a computer.</em>',
    lead: 'Transistors form circuits. Circuits fill a die. Dies go into a package, and the package mounts on a board inside a computer.',
  },
  products: {
    kickerCn: 'Laptops and servers',
    title: 'Inside real<br><em>processors.</em>',
    lead: 'The Panther Lake compute tile in Intel Core Ultra Series 3 uses Intel 18A. It brings these ribbon channels and backside power connections into a laptop processor.',
    body: ['Clearwater Forest, the Xeon 6+ server family, also uses 18A and offers up to 288 Efficient-cores. Other dies in a package can use different processes.'],
  },
  outro: { kickerCn: 'RIBBONFET + POWERVIA', title: '' },
};

const netNames = ['VDD supply', 'VSS return', 'Frontside signal'];
const enChapters = CHAPTERS.map(chapter => {
  const { labels, ...translated } = english[chapter.id];
  return {
    ...chapter, ...translated,
    labels: chapter.labels?.map(label => {
      const [text, sub] = labels[label.anchor];
      return { ...label, text, sub };
    }),
    legend: chapter.legend?.map(([color], i) => [color, netNames[i]]),
  };
});

export function chaptersFor(language) {
  return language === 'en' ? enChapters : CHAPTERS;
}

const languageKey = 'intel-18a-exhibit-language';
export function initialLanguage() {
  try { return localStorage.getItem(languageKey) === 'en' ? 'en' : 'zh'; }
  catch { return 'zh'; }
}

export function rememberLanguage(language) {
  try { localStorage.setItem(languageKey, language); }
  catch { /* In private contexts the current tab still switches languages. */ }
}

export function localizeChrome(language) {
  const copy = COPY[language];
  document.documentElement.lang = copy.langTag;
  document.title = copy.title;
  document.querySelector('meta[name="description"]').content = copy.description;
  for (const el of document.querySelectorAll('[data-copy]')) el.textContent = copy[el.dataset.copy];
  for (const el of document.querySelectorAll('[data-label]')) el.setAttribute('aria-label', copy[el.dataset.label]);
  for (const el of document.querySelectorAll('[data-lang]')) el.setAttribute('aria-pressed', String(el.dataset.lang === language));
}
