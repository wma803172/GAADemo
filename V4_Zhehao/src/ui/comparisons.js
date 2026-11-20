// Offline teaching figures adapted from the companion site's cross-sections and CMOS diagram.
const markup = `
  <div class="lab-inner">
    <header class="lab-intro" id="wafer-overview">
      <h2>从晶圆到电路</h2>
      <p>在栅极中央切一刀，比较两种沟道结构。再接上两个晶体管，看一个逻辑电路怎样工作。</p>
      <figure class="lab-wafer">
        <img src="./assets/wafer-field.webp" width="1760" height="801" loading="lazy"
             alt="一片绘有重复芯粒图案的晶圆，表面随光线呈现彩色纹理">
        <figcaption>晶圆全景示意。片上的矩形是芯粒，每颗芯粒内包含大量晶体管。</figcaption>
      </figure>
    </header>

    <section id="gate-compare" class="lab-row" aria-labelledby="lab-gate-title" tabindex="-1">
      <div class="lab-copy">
        <h3 id="lab-gate-title">从截面看栅极</h3>
        <p>在源极与漏极中间横切。FinFET 的鳍底连着衬底，栅极覆盖顶部和两侧。RibbonFET 的每条硅带四周都有栅介质，外侧金属连成一个共用栅极。</p>
        <div class="lab-control" role="group" aria-label="选择栅极截面">
          <button type="button" data-lab-view="both" aria-pressed="true">并排对比</button>
          <button type="button" data-lab-view="fin" aria-pressed="false">FinFET</button>
          <button type="button" data-lab-view="ribbon" aria-pressed="false">RibbonFET</button>
        </div>
        <div class="lab-width-controls">
          <h4>改变硅带宽度</h4>
          <div class="lab-control" role="group" aria-label="选择硅带宽度">
            <button type="button" data-lab-width="narrow" aria-pressed="true">较窄硅带</button>
            <button type="button" data-lab-width="wide" aria-pressed="false">较宽硅带</button>
          </div>
          <p class="lab-state" data-lab-width-result aria-live="polite">四层保持不变。较窄的硅带通常有较小的栅电容。</p>
        </div>
      </div>
      <figure class="lab-figure lab-pair" data-view="both" data-width="narrow">
        <div class="lab-cross" data-lab-device="fin">
          <h4>FinFET</h4>
          <svg viewBox="0 0 190 145" role="img" aria-label="栅金属和绝缘介质贴着硅鳍上方和左右两侧，硅鳍底部连着衬底。">
            <path d="M67 124V40Q67 30 77 30H113Q123 30 123 40V124" fill="none" stroke="#a9bcca" stroke-width="19" stroke-linejoin="round"/>
            <path d="M77 124V44Q77 40 81 40H109Q113 40 113 44V124" fill="none" stroke="#99ece0" stroke-width="6" stroke-linejoin="round"/>
            <path d="M15 131H79V46Q79 43 83 43H107Q111 43 111 46V131H175V140H15Z" fill="#ffaf65"/>
            <path d="M21 123h42m64 0h42" stroke="#627784" stroke-width="4"/>
          </svg>
          <span>顶部和两侧</span>
        </div>
        <div class="lab-cross" data-lab-device="ribbon">
          <h4>RibbonFET</h4>
          <svg viewBox="0 0 190 145" role="img" aria-label="四层硅带四周都有绝缘介质，所有硅带共用一个金属栅。">
            <rect x="21" y="12" width="148" height="121" rx="8" fill="#a9bcca"/>
            <g class="lab-sheets" fill="#ffaf65" stroke="#99ece0" stroke-width="3">
              <rect x="43" y="25" width="104" height="11" rx="4"/>
              <rect x="43" y="53" width="104" height="11" rx="4"/>
              <rect x="43" y="81" width="104" height="11" rx="4"/>
              <rect x="43" y="109" width="104" height="11" rx="4"/>
            </g>
          </svg>
          <span>每条硅带的四周</span>
        </div>
        <figcaption class="lab-legend"><span>硅</span><span>栅介质</span><span>栅金属</span></figcaption>
      </figure>
    </section>

    <section id="logic" class="lab-row" aria-labelledby="lab-logic-title" tabindex="-1">
      <div class="lab-copy">
        <h3 id="lab-logic-title">用两个开关反相</h3>
        <p>同一个输入控制上方的 pMOS 和下方的 nMOS。在两个稳定状态中，每次只有一条支路导通，输出接到高电位 VDD 或低电位 VSS。</p>
        <div class="lab-control" role="group" aria-label="切换反相器输入">
          <button type="button" data-lab-input="0" aria-pressed="true">输入 0</button>
          <button type="button" data-lab-input="1" aria-pressed="false">输入 1</button>
        </div>
      </div>
      <figure class="lab-figure lab-circuit" data-level="0">
        <svg viewBox="0 0 340 172" role="img" aria-label="CMOS 反相器电路示意，pMOS 在上，nMOS 在下，两个开关之间的接点连接输出。">
          <text x="166" y="14" class="lab-vdd">VDD · 高电位</text>
          <text x="166" y="165" class="lab-vss">VSS · 低电位</text>
          <g fill="none" stroke-width="2.7" stroke-linecap="round">
            <path class="lab-upper" d="M155 20h22m-11 0v30m0 22v14h58"/>
            <path class="lab-lower" d="M166 86v17m0 22v24m-11 0h22"/>
            <path d="M37 86h48V60h57m-57 26v28h57" stroke="#70d6cf" stroke-width="1.8"/>
            <path class="lab-upper lab-switch-p" d="M166 72V50"/>
            <path class="lab-lower lab-switch-n" d="M166 125V103"/>
            <path class="lab-output" d="M166 86h58"/>
          </g>
          <g fill="#c8d8e5">
            <circle cx="166" cy="50" r="3"/><circle cx="166" cy="72" r="3"/>
            <circle cx="166" cy="103" r="3"/><circle cx="166" cy="125" r="3"/><circle cx="166" cy="86" r="4"/>
          </g>
          <text x="4" y="90" class="lab-signal">输入</text><text x="177" y="62">pMOS</text>
          <text x="177" y="117">nMOS</text><text x="231" y="90" class="lab-output-text">输出 1</text>
        </svg>
        <figcaption class="lab-result" aria-live="polite">输入 0 → pMOS 导通，nMOS 截止 → 输出 1</figcaption>
      </figure>
    </section>

    <section id="measurements" class="lab-row" aria-labelledby="lab-metrics-title" tabindex="-1">
      <div class="lab-copy">
        <h3 id="lab-metrics-title">Intel 18A 与 Intel 3 的实测差异</h3>
        <p>用两代工艺分别实现同一种标准 Arm 核心子电路。在功耗相同时比较频率，在频率相同时比较功耗。两列各回答一个问题。</p>
      </div>
      <div class="lab-table-wrap">
        <table>
          <caption>标准 Arm 核心子电路 · Intel 18A 相对 Intel 3</caption>
          <thead><tr><th scope="col">Intel 3 参照工作点</th><th scope="col">同功耗下的频率</th><th scope="col">同频率下的功耗</th></tr></thead>
          <tbody>
            <tr><th scope="row">0.75 V</th><td>约 +18%</td><td>约 −38%</td></tr>
            <tr><th scope="row">1.10 V</th><td>约 +25%</td><td>约 −36%</td></tr>
          </tbody>
        </table>
        <p>这些测量对应表中的子电路和工作点。整颗处理器的性能还受架构、缓存和散热影响。</p>
        <a href="https://dev.vlsisymposium.org/wp-content/uploads/09_EN_Technical-Tip-Sheet-VLSI-2025_EN_250522.pdf#page=1" target="_blank" rel="noopener">查看 VLSI 2025 论文 T1-1 的原始图 (a) ↗</a>
      </div>
    </section>
  </div>`;

function markChoice(button) {
  for (const sibling of button.parentElement.querySelectorAll('button')) {
    sibling.setAttribute('aria-pressed', String(sibling === button));
  }
}

export function mountComparisons(beats, host) {
  host.classList.add('lab-experiments');
  host.setAttribute('aria-label', '器件与电路实验');
  host.innerHTML = markup;

  for (const [chapter, target, label] of [
    ['gaa', 'gate-compare', '对比栅极截面'],
    ['products', 'measurements', '查看性能实测'],
  ]) {
    const source = beats.find(beat => beat.dataset.chapter === chapter);
    const link = document.createElement('a');
    link.href = '#' + target;
    link.className = 'lab-entry';
    link.textContent = label + ' ↓';
    source.appendChild(link);
  }

  const pair = host.querySelector('.lab-pair');
  const circuit = host.querySelector('.lab-circuit');
  host.addEventListener('click', event => {
    const button = event.target.closest('.lab-control button');
    if (!button) return;
    markChoice(button);
    const { labView, labWidth, labInput } = button.dataset;
    if (labView) {
      pair.dataset.view = labView;
      for (const device of pair.querySelectorAll('[data-lab-device]')) {
        device.hidden = labView !== 'both' && labView !== device.dataset.labDevice;
      }
      host.querySelector('.lab-width-controls').hidden = labView === 'fin';
    } else if (labWidth) {
      pair.dataset.width = labWidth;
      host.querySelector('[data-lab-width-result]').textContent = labWidth === 'wide'
        ? '仍是四层。较宽的硅带通常能提供更大的驱动电流，栅极充放电的电容也会增大。'
        : '四层保持不变。较窄的硅带通常有较小的栅电容。';
    } else if (labInput !== undefined) {
      const high = labInput === '1';
      circuit.dataset.level = labInput;
      circuit.querySelector('.lab-output-text').textContent = high ? '输出 0' : '输出 1';
      circuit.querySelector('.lab-result').textContent = high
        ? '输入 1 → pMOS 截止，nMOS 导通 → 输出 0'
        : '输入 0 → pMOS 导通，nMOS 截止 → 输出 1';
    }
  });
}
