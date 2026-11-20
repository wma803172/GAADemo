// The eight stops describe a typical replacement-gate nanosheet flow.
// The process geometry is driven by the same zero-based step and fraction.
const steps = [
  {
    name: '生长硅与硅锗叠层',
    english: 'Epitaxy',
    description: '镜头从晶圆落到一个器件区。硅与硅锗交替外延生长，四层硅由下至上叠起。',
    detail: '记住四层米色硅的位置。它们的高度，已经决定了成品中四条沟道的高度。',
    materials: ['silicon', 'sige'],
  },
  {
    name: '刻出窄鳍',
    english: 'Fin patterning',
    description: '光刻图形限定窄鳍的宽度。刻去两侧的叠层，填入浅沟槽隔离介质，再回蚀使鳍的上部露出。',
    detail: '斜看鳍的侧面，还能辨认出四层硅。下方的隔离介质把这个有源区与相邻器件隔开。',
    materials: ['silicon', 'sige', 'isolation'],
  },
  {
    name: '定位假栅',
    english: 'Dummy gate',
    description: '临时栅横跨窄鳍，介质在栅的两边形成外侧墙。下方的叠层仍然完整贯通。',
    detail: '切到沿源漏的纵剖。两道侧墙之间，正是之后移除假栅、形成金属栅的位置。',
    materials: ['dummy', 'outer-spacer', 'silicon'],
  },
  {
    name: '制作内侧间隔层',
    english: 'Inner spacer',
    description: '先刻开假栅两侧的源漏区。再从露出的端面向内回蚀一小段硅锗，在小凹口里填入绝缘材料。',
    detail: '留意每层端部的小塞子。它们将隔开金属栅和源漏，中间的紫灰色硅锗此时仍然保留。',
    materials: ['sige', 'inner-spacer', 'silicon'],
  },
  {
    name: '生长源极和漏极',
    english: 'Source / drain epitaxy',
    description: '在两端外延生长掺杂半导体，使各层硅分别连到同一对源漏。填入层间介质并抛光，露出假栅顶部。',
    detail: '沿源漏方向看，两端的半导体已经接住四层硅。下一步只需要从栅区释放中段。',
    materials: ['epi', 'silicon', 'ild'],
  },
  {
    name: '释放四条沟道',
    english: 'Channel release',
    description: '打开假栅留下的栅槽，选择性刻掉栅区剩余的牺牲硅锗。四条硅带留在原位，片间空隙逐一显露。',
    detail: '拖动本步进度，观察栅槽中的紫灰色材料。硅带的两端一直连着源漏，中段才会悬起。',
    materials: ['sige', 'silicon', 'epi'],
  },
  {
    name: '形成环绕栅',
    english: 'Replacement metal gate',
    description: '在硅带表面形成界面层与高介电常数栅介质。功函数金属沿着薄膜包覆，随后填充栅金属。',
    detail: '从栅中央横剖，逐层看进去。每条硅带各有一圈绝缘介质，四层沟道外的金属连成一个共用栅。',
    materials: ['silicon', 'dielectric', 'metal'],
  },
  {
    name: '接出器件端子',
    english: 'Local contacts',
    description: '形成局部金属接触后，栅极、源极和漏极各有一条对外连接的通路。',
    detail: '选中一个端子，查看它连到哪里。接下来，沿栅极的信号接点进入 M6 的正面互连。',
    materials: ['contact', 'metal', 'epi'],
  },
];

const materials = {
  silicon: '硅 · Si', sige: '硅锗 · SiGe', isolation: '浅沟槽隔离',
  dummy: '假栅', 'outer-spacer': '外侧墙', 'inner-spacer': '内侧间隔层',
  epi: '源漏外延', ild: '层间介质',
  dielectric: '栅介质', metal: '栅金属', contact: '局部接触',
};

const terminals = {
  source: '源极接点通向一端的源区，四条硅带都与它相接。',
  gate: '栅极接点通向共用金属栅，电场隔着薄介质控制四条沟道。',
  drain: '漏极接点通向另一端的漏区，汇接四条沟道。',
};

const markup = `
  <div class="fab-top">
    <button type="button" data-command="close" class="fab-back">← 返回 2026</button>
    <details class="fab-sources">
      <summary>工艺依据</summary>
      <div class="fab-source-notes">
        <p>本演示按公开的堆叠硅纳米片后栅工艺制作。四带成品参照 Intel 18A 结构。层厚、配色和透明剖面经过简化，方便观察。</p>
        <a href="https://iedm24.mapyourshow.com/mys_shared/iedm24/handouts/_SC1-2_Chao.pdf#page=12" target="_blank" rel="noopener">IEDM · RibbonFET 工艺顺序，第 12 页 ↗</a>
        <a href="https://www.imec-int.com/en/articles/entering-nanosheet-transistor-era-0" target="_blank" rel="noopener">imec · 内侧间隔层与沟道释放 ↗</a>
        <a href="https://www.intel.com/content/dam/www/central-libraries/us/en/documents/2026-06/foundry-18a-technology-brief.pdf#page=2" target="_blank" rel="noopener">Intel · RibbonFET 与 PowerVia，图 1、2 ↗</a>
      </div>
    </details>
  </div>
  <div class="fab-viewport" role="img" aria-label="GAA 制程三维模型" aria-describedby="fab-description fab-detail"></div>
  <div class="fab-copy">
    <div class="fab-copy-inner">
      <p class="fab-kicker"><b data-step-number></b><span aria-hidden="true"></span><i lang="en" data-english></i></p>
      <h2 id="fab-title" tabindex="-1"></h2>
      <p id="fab-description"></p>
      <p id="fab-detail"></p>
      <ul class="fab-legend" aria-label="本步材料图例"></ul>
      <div class="fab-terminals" role="group" aria-label="选择器件端子" hidden>
        <button type="button" aria-pressed="false" data-terminal="source">源极 S</button>
        <button type="button" aria-pressed="false" data-terminal="gate">栅极 G</button>
        <button type="button" aria-pressed="false" data-terminal="drain">漏极 D</button>
      </div>
    </div>
  </div>
  <div class="fab-views" role="group" aria-label="观察视角">
    <button type="button" data-view="overview" title="从立体角度观察器件" aria-pressed="false">立体</button>
    <button type="button" data-view="longitudinal" title="沿源极至漏极方向剖开器件" aria-pressed="false">沿源漏纵剖</button>
    <button type="button" data-view="cross" title="垂直于电流方向，切过栅中央" aria-pressed="false">栅中央横剖</button>
    <button type="button" data-command="resetView" class="fab-reset" aria-label="回到本步推荐视角" title="回到本步推荐视角">↺ 推荐视角</button>
  </div>
  <nav class="fab-controls" aria-label="工艺步骤与回放">
    <div class="fab-scrub" hidden>
      <label for="fab-scrub">本步进度</label>
      <input type="range" id="fab-scrub" min="0" max="100" step="1" value="0">
      <output for="fab-scrub" aria-live="off">0%</output>
    </div>
    <div class="fab-track" aria-hidden="true">${steps.map(() => '<span></span>').join('')}</div>
    <div class="fab-buttons">
      <button type="button" data-command="previous">上一步</button>
      <button type="button" data-command="togglePlayback">暂停</button>
      <button type="button" data-command="replay">重看</button>
      <button type="button" data-command="next" class="fab-next">下一步 →</button>
    </div>
  </nav>
  <div class="fab-announcement" role="status" aria-live="polite" aria-atomic="true"></div>`;

export function buildFabricationPanel(host, actions) {
  const element = document.createElement('section');
  element.className = 'fab-panel';
  element.hidden = true;
  element.setAttribute('aria-label', 'RibbonFET 制造过程');
  element.innerHTML = markup;
  host.appendChild(element);

  const find = selector => element.querySelector(selector);
  const viewport = find('.fab-viewport');
  const copy = find('.fab-copy');
  const heading = find('#fab-title');
  const number = find('[data-step-number]');
  const english = find('[data-english]');
  const description = find('#fab-description');
  const detail = find('#fab-detail');
  const legend = find('.fab-legend');
  const terminalGroup = find('.fab-terminals');
  const terminalButtons = [...element.querySelectorAll('[data-terminal]')];
  const viewButtons = [...element.querySelectorAll('[data-view]')];
  const dots = [...element.querySelector('.fab-track').children];
  const scrub = find('.fab-scrub');
  const range = find('#fab-scrub');
  const output = find('output');
  const previous = find('[data-command="previous"]');
  const next = find('.fab-next');
  const play = find('[data-command="togglePlayback"]');
  const notice = find('.fab-announcement');
  const sources = find('.fab-sources');

  let lastStep = -1;
  let lastView = '';
  let lastTerminal;
  let lastPercent = -1;
  let lastPlayLabel = '';
  let contactsComplete = false;

  element.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled || element.inert) return;
    if (button.dataset.view) actions.setView(button.dataset.view);
    else if (button.dataset.terminal) actions.selectTerminal(button.dataset.terminal);
    else if (button.dataset.command) actions[button.dataset.command]();
  });
  range.addEventListener('input', () => actions.scrub(Number(range.value) / 100));

  function render(state) {
    const {step, fraction, view, terminal, playing, leaving} = state;
    const data = steps[step];
    const last = step === steps.length - 1;
    const stepChanged = step !== lastStep;
    const finishedContacts = last && fraction >= 0.99;
    if (stepChanged) {
      lastStep = step;
      number.textContent = '工艺 ' + String(step + 1).padStart(2, '0') + ' / 08';
      english.textContent = data.english;
      heading.textContent = data.name;
      legend.innerHTML = data.materials.map(key =>
        `<li><i class="fab-mat-${key}" aria-hidden="true"></i>${materials[key]}</li>`).join('');
      dots.forEach((dot, i) => { dot.className = i < step ? 'past' : i === step ? 'now' : ''; });
      scrub.hidden = step !== 5 && step !== 6;
      terminalGroup.hidden = !last;
      previous.disabled = step === 0;
      next.textContent = last ? '继续看 M6 →' : '下一步 →';
      next.dataset.command = last ? 'continueToM6' : 'next';
      copy.scrollTop = 0;
      notice.textContent = '第 ' + (step + 1) + ' 步，共八步。' + data.name + '。';
    }
    if (stepChanged || contactsComplete !== finishedContacts) {
      contactsComplete = finishedContacts;
      description.textContent = finishedContacts
        ? '晶体管做好了。现在，电和信号怎样到达它？点选模型或下方端子，查看它连接的结构。'
        : data.description;
    }
    if (stepChanged || terminal !== lastTerminal) {
      lastTerminal = terminal;
      detail.textContent = last && terminals[terminal] ? terminals[terminal] : data.detail;
      terminalButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.terminal === terminal)));
    }
    if (stepChanged || view !== lastView) {
      lastView = view;
      viewButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === view)));
      const viewName = viewButtons.find(button => button.dataset.view === view)?.textContent ?? '立体';
      viewport.setAttribute('aria-label', 'GAA 制程三维模型，' + data.name + '，' + viewName);
    }

    const percent = Math.round(fraction * 100);
    if (percent !== lastPercent || stepChanged) {
      lastPercent = percent;
      if (!scrub.hidden) {
        range.value = String(percent);
        range.setAttribute('aria-valuetext', percent + '%');
        output.textContent = percent + '%';
      }
      dots[step].style.setProperty('--motion', percent + '%');
    }
    const complete = !playing && fraction >= 1;
    const playLabel = playing ? '暂停' : complete ? '已播完' : '继续';
    if (playLabel !== lastPlayLabel) {
      lastPlayLabel = playLabel;
      play.textContent = playLabel;
      play.disabled = complete;
      play.setAttribute('aria-label', playing ? '暂停本步动画' : complete ? '本步已播完' : '继续本步动画');
    }
    if (element.inert !== Boolean(leaving)) element.inert = Boolean(leaving);
  }

  return {
    element,
    render,
    show() {
      element.hidden = false;
      element.inert = false;
      lastStep = -1;
    },
    hide() {
      element.hidden = true;
      element.inert = true;
      sources.open = false;
    },
    focusStep() { heading.focus({preventScroll: true}); },
    viewportRect() { return viewport.getBoundingClientRect(); },
  };
}
