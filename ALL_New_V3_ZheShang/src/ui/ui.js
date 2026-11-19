import * as THREE from 'three';
import { CHAPTERS, chapterAt } from '../content.js';

export function buildStory(root) {
  return CHAPTERS.map((chapter, index) => {
    const section = document.createElement('section');
    section.dataset.chapter = chapter.id;
    section.className = 'beat' + (chapter.outro ? ' beat-outro' : '');
    if (chapter.outro) {
      section.innerHTML = '<div class="outro-card"><div class="outro-logo"><img src="./assets/intel-wordmark.png" alt="Intel"></div><p class="outro-line">RibbonFET &nbsp;+&nbsp; PowerVia</p></div>';
    } else {
      const tag = index === 0 ? 'h1' : 'h2';
      const body = (chapter.body || []).map(line => '<p data-rv>' + line + '</p>').join('');
      const legend = chapter.legend ? '<ul class="net-legend" aria-label="线网颜色">' +
        chapter.legend.map(([color, name]) => '<li style="--net-color:' + color + '">' + name + '</li>').join('') + '</ul>' : '';
      const controls = chapter.gateControl ? '<div class="gate-control"><button id="gate-switch" type="button" aria-pressed="true" aria-label="沟道导通"><span class="switch-track" aria-hidden="true"><i></i></span><span class="gate-action">关断沟道</span></button><span id="gate-state" role="status">四层沟道导通</span></div>' : '';
      section.innerHTML = '<p class="kicker"><b>' + chapter.kicker + '</b><span class="rule"></span><span>' + chapter.kickerCn + '</span></p>' +
        '<' + tag + ' data-rv>' + chapter.title + '</' + tag + '>' +
        '<p class="lead" data-rv>' + chapter.lead + '</p>' + body + controls + legend;
    }
    root.appendChild(section);
    return section;
  });
}

export function renderStory(beats, p) {
  const { index } = chapterAt(p);
  beats.forEach((b, i) => {
    const active = i === index;
    b.classList.toggle('is-live', active);
    b.classList.toggle('is-in', active);
    b.inert = !active;
  });
}

export class Labels {
  constructor(host, camera, models) {
    this.host = host;
    this.camera = camera;
    this.models = models;
    this.point = new THREE.Vector3();
    this.active = [];
  }
  setChapter(chapter) {
    this.host.replaceChildren();
    this.active = (chapter.labels || []).map((label, i) => {
      const el = document.createElement('div');
      el.className = 'pin';
      el.innerHTML = '<span class="pin-dot"></span><span class="pin-line"></span><span class="pin-card"><b>' + label.text + '</b><i>' + label.sub + '</i></span>';
      this.host.appendChild(el);
      return { el, label, i };
    });
  }
  render() {
    const w = window.innerWidth, h = window.innerHeight;
    for (const { el, label, i } of this.active) {
      const model = this.models[label.model];
      const anchor = model?.anchors[label.anchor];
      if (!anchor || !model.root.visible) { el.hidden = true; continue; }
      anchor.getWorldPosition(this.point).project(this.camera);
      const x = (this.point.x + 1) * w / 2;
      const y = (1 - this.point.y) * h / 2;
      el.hidden = Math.abs(this.point.z) > 1 || x < 15 || x > w - 15 || y < 55 || y > h - 20;
      if (el.hidden) continue;
      el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      // Keep both physical endpoints visible even when they project close together.
      el.classList.toggle('flip', (i === 0 && this.active.length > 1) || x > w * 0.83);
      el.classList.toggle('lower', i === 0 && this.active.length > 1);
    }
  }
}
