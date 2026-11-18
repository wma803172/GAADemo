(() => {
  "use strict";

  const sections = Array.from(document.querySelectorAll(".moment"));
  const nav = Array.from(document.querySelectorAll(".mast nav a"));
  const stage = document.querySelector(".cinema");
  const model = document.querySelector("#scene");
  const hero = document.querySelector(".hero-object");
  const wafer = document.querySelector(".wafer-object");
  const name = document.querySelector("#figure-name");
  const keys = document.querySelector("#keys");
  const meter = document.querySelector(".progress-track i");
  const pinLayer = document.querySelector("#diagram-pins");
  const pinNodes = Array.from({ length: 2 }, () => {
    const pin = document.createElement("div");
    pin.className = "pin";
    pin.hidden = true;
    const line = document.createElement("i"),
      dot = document.createElement("i"),
      label = document.createElement("span");
    line.className = "pin-line";
    dot.className = "pin-point";
    label.className = "pin-text";
    pin.append(line, dot, label);
    pinLayer.append(pin);
    return { pin, line, label, width: 0, height: 0 };
  });
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const portrait = matchMedia("(max-width:700px), (max-width:950px) and (orientation:portrait)");
  const colors = {
    silicon: "#ffa74c",
    gate: "#d1d9df",
    insulator: "#a3ece0",
    germanium: "#a292bc",
    carrier: "#9fa7c7",
    signal: "#48d9c2",
    supply: "#ffba65",
    ground: "#909bfb",
  };
  const labels = [
    {
      at: 0,
      name: "器件剖面",
      keys: [
        ["silicon", "硅带"],
        ["gate", "金属栅"],
      ],
    },
    {
      at: 0.68,
      name: "源极 → 漏极",
      keys: [
        ["silicon", "硅带"],
        ["gate", "共用栅"],
      ],
    },
    {
      at: 1.64,
      name: "栅中央横截面",
      keys: [
        ["silicon", "硅"],
        ["insulator", "绝缘层"],
        ["gate", "金属栅"],
      ],
    },
    {
      at: 2.54,
      name: "硅与硅锗叠层",
      keys: [
        ["silicon", "硅"],
        ["germanium", "硅锗"],
      ],
    },
    {
      at: 2.91,
      name: "释放沟道",
      keys: [
        ["silicon", "硅"],
        ["germanium", "硅锗"],
      ],
    },
    {
      at: 3.13,
      name: "形成环绕栅",
      keys: [
        ["insulator", "绝缘层"],
        ["gate", "金属栅"],
      ],
    },
    {
      at: 3.48,
      name: "器件侧预制通孔",
      keys: [
        ["supply", "供电通孔"],
        ["signal", "正面信号"],
      ],
    },
    {
      at: 3.75,
      name: "支撑、翻面与减薄",
      keys: [
        ["carrier", "支撑晶圆"],
        ["supply", "通孔"],
      ],
    },
    {
      at: 4.56,
      name: "背面电网展开",
      keys: [
        ["supply", "供电 VDD"],
        ["ground", "回流 VSS"],
        ["signal", "信号"],
      ],
    },
    {
      at: 5.58,
      name: "器件侧接入",
      keys: [
        ["supply", "供电支路"],
        ["ground", "回流支路"],
        ["signal", "栅信号"],
      ],
    },
    { at: 6.79, name: "晶圆表面示意", keys: [] },
  ];
  const stillPoints = [0, 1, 2, 2.78, 3.03, 3.34, 3.57, 3.82, 4.17, 4.46, 5.14, 6.22, 7];
  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  function blend(start, end, value) {
    const t = clamp((value - start) / (end - start));
    return t * t * (3 - 2 * t);
  }
  let stops = [],
    figureWidth = 0,
    figureHeight = 0;
  let lastLabel,
    lastPart,
    frame = 0,
    lastTick = 0,
    scrollProgress = 0,
    visual = 0;
  let fitted = false,
    needsMeasure = true,
    forceRedraw = true;
  const engine = window.AtlasScene;
  let gateOpen = true;
  const gateControls = [];
  function updateGate(nextState, source) {
    gateOpen = nextState;
    engine.setGateOpen(nextState);
    for (const control of gateControls) {
      control.readout.setAttribute("aria-live", control === source ? "polite" : "off");
      control.button.dataset.open = String(nextState);
      control.action.textContent = nextState ? "关上开关" : "打开开关";
      control.readout.textContent = nextState ? "四条路都在导电" : "已关断，只剩微小漏电";
    }
    queue();
  }
  if (engine?.setGateOpen) {
    for (const host of document.querySelectorAll("[data-gate-controls]")) {
      host.append(document.querySelector("#gate-control").content.cloneNode(true));
      const button = host.querySelector("button");
      const readout = host.querySelector(".gate-readout");
      readout.id = host.closest("section").id + "-gate-state";
      button.setAttribute("aria-describedby", readout.id);
      button.dataset.open = "true";
      const control = { button, readout, action: button.querySelector("span") };
      gateControls.push(control);
      button.addEventListener("click", () => updateGate(!gateOpen, control));
    }
  }
  function measure() {
    const y = window.scrollY;
    stops = sections.map((section) => section.getBoundingClientRect().top + y);
    figureWidth = model.clientWidth;
    figureHeight = model.clientHeight;
    for (const node of pinNodes) node.width = 0;
    needsMeasure = false;
    forceRedraw = true;
  }
  function progress(y) {
    let i = 0;
    while (i < stops.length - 2 && y >= stops[i + 1]) i++;
    return i + clamp((y - stops[i]) / Math.max(1, stops[i + 1] - stops[i]));
  }
  function setKey(label) {
    if (lastLabel === label) return;
    lastLabel = label;
    name.textContent = label.name;
    stage.querySelector(".scale-note").hidden = label.keys.length === 0;
    keys.replaceChildren(
      ...label.keys.map(([material, text]) => {
        const item = document.createElement("span");
        const swatch = document.createElement("i");
        swatch.style.setProperty("--swatch", colors[material]);
        item.append(swatch, text);
        return item;
      }),
    );
  }
  function showPins(p) {
    const pins = fitted ? (engine.getPins?.() ?? []) : [];
    for (const [i, node] of pinNodes.entries()) {
      const data = pins[i];
      const use = data && data.x >= 0 && data.x <= 1 && data.y >= 0 && data.y <= 1;
      node.pin.hidden = !use;
      if (!use) continue;
      if (node.label.textContent !== data.label || !node.width) {
        node.label.textContent = data.label;
        node.width = node.label.offsetWidth;
        node.height = node.label.offsetHeight;
      }
      const network = data.label === "背面电网",
        signal = data.label === "正面信号";
      const metal = data.label === "共用金属栅";
      node.pin.dataset.material = signal ? "signal" : metal ? "gate" : "supply";
      const sign = network || data.label === "本地接点" || data.label === "硅带沟道" ? 1 : -1;
      const x = data.x * figureWidth,
        y = data.y * figureHeight;
      const reach = clamp(figureWidth * 0.075, 22, 65);
      const labelX = clamp(x + sign * reach - (sign < 0 ? node.width : 0), 4, figureWidth - node.width - 4);
      const rise = clamp(figureHeight * 0.06, 17, 44);
      const labelY = clamp(
        y + (network || metal || data.label === "供电通孔" ? -rise - node.height : rise),
        4,
        figureHeight - node.height - 4,
      );
      const dx = labelX + (sign < 0 ? node.width : 0) - x,
        dy = labelY + node.height / 2 - y;
      node.pin.style.transform = "translate(" + x + "px," + y + "px)";
      node.label.style.transform = "translate(" + (labelX - x) + "px," + (labelY - y) + "px)";
      node.line.style.width = Math.hypot(dx, dy) + "px";
      node.line.style.transform = "rotate(" + Math.atan2(dy, dx) + "rad)";
    }
  }
  function chapterNotes(p) {
    const active = Math.round(p);
    const part = sections[active].dataset.part;
    if (part !== lastPart) {
      lastPart = part;
      nav.forEach((link) => {
        if (link.hash === "#" + part) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }
    // The text follows the native document. Fade it out when it approaches
    // the fixed model on a phone, so neither can obscure the other.
    sections.forEach((section, i) => {
      const d = p - i;
      const note = section.firstElementChild;
      const opacity = motion.matches
        ? 1
        : portrait.matches
          ? 1 - blend(0.28, 0.54, d)
          : 1 - blend(0.29, 0.68, Math.abs(d));
      const travel = (stops[i + 1] ?? stops[i]) - stops[i];
      const hold = motion.matches ? 0 : clamp(d, 0, portrait.matches ? 0.26 : 0.11) * travel;
      note.style.transform = hold > 0 ? "translateY(" + hold.toFixed(1) + "px)" : "";
      note.style.opacity = opacity;
    });
  }
  function paint(time) {
    frame = 0;
    if (document.hidden) return;
    if (needsMeasure || !stops.length) measure();
    scrollProgress = progress(window.scrollY);
    const elapsed = clamp(time - lastTick, 1, 60);
    const difference = scrollProgress - visual;
    visual =
      motion.matches || Math.abs(difference) > 1.05 || Math.abs(difference) < 0.001
        ? scrollProgress
        : visual + difference * (1 - Math.exp(-elapsed / 38));
    lastTick = time;
    const p = visual;
    const target = motion.matches
      ? stillPoints.reduce((best, point) => (Math.abs(point - p) < Math.abs(best - p) ? point : best))
      : p;
    if (!fitted && engine) fitted = engine.mount(model);
    const imageAlpha = fitted ? 1 - blend(0.01, 0.59, target) : 1;
    const waferAlpha = blend(6.53, 6.98, target);
    const modelAlpha = (1 - imageAlpha) * (1 - waferAlpha);
    hero.style.opacity = imageAlpha;
    if (!motion.matches && imageAlpha > 0)
      hero.style.transform = "translateY(" + -3 * p + "%) scale(" + (1 + 0.065 * p) + ")";
    else hero.style.removeProperty("transform");
    wafer.style.opacity = waferAlpha;
    wafer.style.transform = motion.matches ? "" : "scale(" + (1.065 - 0.065 * waferAlpha) + ")";
    stage.style.setProperty("--model-opacity", modelAlpha);
    stage.style.setProperty(
      "--warm",
      (blend(3.65, 4.98, target) * (1 - blend(6.52, 6.99, target)) * 0.94).toFixed(3),
    );
    setKey(labels.findLast((label) => target >= label.at) || labels[0]);
    meter.style.transform = "scaleX(" + p / 7 + ")";
    chapterNotes(scrollProgress);
    if (fitted && (modelAlpha > 0.005 || forceRedraw)) engine.draw(target);
    showPins(target);
    forceRedraw = false;
    if (Math.abs(scrollProgress - visual) > 0.001) queue();
  }
  function queue() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(paint);
  }
  function resized() {
    needsMeasure = true;
    queue();
  }
  // Native anchors also work with touch, keyboard, history and JavaScript off.
  // Let the browser own the scroll position; only the camera lags a few ms.
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", resized, { passive: true });
  window.addEventListener("pageshow", resized);
  motion.addEventListener("change", resized);
  portrait.addEventListener("change", resized);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else resized();
  });
  new ResizeObserver(resized).observe(document.querySelector(".story"));
  document.fonts?.ready.then(resized);
  resized();
})();
