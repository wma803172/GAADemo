(() => {
  "use strict";
  const byId = (id) => document.getElementById(id);
  const canvas = byId("model");
  const timeline = byId("timeline");
  const explode = byId("explode");
  const activity = byId("activity");
  const play = byId("play");
  const buttons = [...document.querySelectorAll("[data-scene]")];
  const scenes = [
    {
      name: "器件结构总览",
      detail: "先看蓝色硅带的两端。它们共用源极和漏极，中段受同一个栅极控制；下方金属承担供电。",
      alt: "四条硅纳米带横跨源极和漏极，由一个共用栅极环绕。",
    },
    {
      name: "全环绕栅剖面",
      detail: "视线顺着源漏方向看进去：四块蓝色截面是四条沟道。每条沟道与周围的栅金属之间都隔着绝缘层。",
      alt: "沿源漏方向的剖面展示四个硅带截面、每条带表面的栅介质及带与带之间连通的栅极金属。",
    },
    {
      name: "背面供电路径",
      detail:
        "沿背面金属轨向上追踪。纳米通孔在器件旁接入本地电源接点，VDD 与 VSS 分开布置；栅极信号走正面。",
      alt: "从背面供电网络沿纳米通孔到本地源漏供电接点。电源与地分开，正面互连向栅极传递控制信号。",
    },
  ];
  const notes = [
    [
      "先看蓝色硅带的两端。它们共用源极和漏极，中段受同一个栅极控制；下方金属承担供电。",
      "横着看，沟道都从源极通向漏极；竖着看，四条硅带一层层排开，使一处占地容纳多条电流路径。",
    ],
    [
      scenes[1].detail,
      "在这个 nMOS 示意中，升高栅压使沟道导通。栅极通过电场起作用，点亮的四个截面表示并联导电。",
    ],
    [
      scenes[2].detail,
      "背面网格承担长距离供电，正面留下更多信号布线空间。高亮路线表示电网连接关系，路径长度与亮度均为示意。",
    ],
  ];
  const duration = 36;
  let scene = 0,
    position = 0,
    angle = 0,
    playing = false,
    active = true,
    phase = 0,
    frame = 0,
    lastStamp;
  let captionKey = "";
  const format = (n) => "00:" + String(Math.floor(n + 0.00001)).padStart(2, "0");
  function paint() {
    if (window.render18A)
      window.render18A(canvas, {
        scene,
        angle,
        explode: Number(explode.value) / 100,
        time: phase,
        active,
        labels: byId("labels").checked,
      });
  }
  function controls() {
    byId("clock").textContent = format(position) + " / 00:36";
    timeline.value = position;
    timeline.style.setProperty("--fill", (position / duration) * 100 + "%");
    byId("play-symbol").textContent = playing ? "Ⅱ" : "▶";
    byId("play-text").textContent = playing ? "暂停" : position >= duration ? "重新播放" : "播放演示";
    play.setAttribute("aria-label", playing ? "暂停分步演示" : "播放分步演示");
    activity.hidden = scene === 0;
    activity.textContent =
      scene === 1 ? (active ? "沟道导通" : "沟道关断") : active ? "路径高亮已开" : "路径高亮已关";
    activity.setAttribute("aria-pressed", String(active));
    activity.title = scene === 1 ? "切换沟道导通或关断" : "切换供电路径高亮";
    const index = position - scene * 12 >= 6 ? 1 : 0;
    const key = [scene, index, active].join("/");
    if (captionKey !== key) {
      captionKey = key;
      byId("caption").textContent =
        scene === 1 && !active
          ? "降低栅压后，四条沟道的导电能力一起减弱。关断态仍有漏电，图中暗色只表示相对变化。"
          : notes[scene][index];
    }
  }
  function showScene(n) {
    scene = n;
    buttons.forEach((button, i) => {
      button.classList.toggle("selected", i === n);
      button.setAttribute("aria-pressed", String(i === n));
    });
    const number = "0" + (n + 1);
    byId("figure-code").textContent = "FIG. " + number;
    byId("scene-count").textContent = number + " / 03";
    byId("figure-name").textContent = scenes[n].name;
    const evidence = [
      { frame: 3, stamp: "05:26" },
      { frame: 2, stamp: "02:46" },
      { frame: 5, stamp: "08:32" },
    ][n];
    const referenceLink = byId("scene-evidence");
    referenceLink.href = "video.html?frame=" + evidence.frame + "#comparison";
    referenceLink.textContent = "原片对照 " + evidence.stamp + " ↗";
    canvas.setAttribute("aria-label", scenes[n].alt);
  }
  function setTime(value, followDemo) {
    position = Math.max(0, Math.min(duration, value));
    const n = Math.min(2, Math.floor(position / 12));
    if (n !== scene) {
      showScene(n);
      angle = 0;
    }
    if (followDemo) {
      active = scene !== 1 || position >= 18;
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const part = (position - scene * 12) / 12;
        const arc = Math.sin(Math.PI * part);
        angle = arc * [19, 11, -13][scene];
        explode.value = Math.round(arc * [20, 38, 78][scene]);
        syncSeparation();
      }
    }
    controls();
  }
  function pause() {
    playing = false;
    cancelAnimationFrame(frame);
    lastStamp = undefined;
    controls();
  }
  function tick(stamp) {
    if (!playing) return;
    const delta = lastStamp === undefined ? 0 : Math.max(0, (stamp - lastStamp) / 1000);
    lastStamp = stamp;
    phase += delta;
    setTime(position + delta, true);
    paint();
    if (position >= duration) pause();
    else frame = requestAnimationFrame(tick);
  }
  play.addEventListener("click", () => {
    if (playing) return pause();
    if (position >= duration) {
      phase = 0;
      setTime(0, true);
    }
    playing = true;
    lastStamp = undefined;
    controls();
    frame = requestAnimationFrame(tick);
  });
  timeline.addEventListener("input", () => {
    const value = Number(timeline.value);
    pause();
    phase = value;
    setTime(value, true);
    paint();
  });
  buttons.forEach((button, i) =>
    button.addEventListener("click", () => {
      pause();
      angle = 0;
      active = true;
      phase = i * 12;
      setTime(i * 12, false);
      paint();
    }),
  );
  function syncSeparation() {
    byId("separation").value = explode.value + "%";
    explode.style.setProperty("--fill", explode.value + "%");
  }
  function updateExplode() {
    syncSeparation();
    paint();
  }
  explode.addEventListener("input", () => {
    if (playing) pause();
    updateExplode();
  });
  byId("labels").addEventListener("change", paint);
  activity.addEventListener("click", () => {
    pause();
    active = !active;
    controls();
    paint();
  });
  byId("reset").addEventListener("click", () => {
    pause();
    angle = 0;
    active = true;
    phase = scene * 12;
    byId("labels").checked = true;
    explode.value = 0;
    setTime(scene * 12, false);
    updateExplode();
  });
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    if (!e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
    if (playing) pause();
    drag = { x: e.clientX, origin: angle };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag || !canvas.hasPointerCapture(e.pointerId)) return;
    angle = (drag.origin + (e.clientX - drag.x) * 0.42) % 360;
    paint();
  });
  canvas.addEventListener("lostpointercapture", () => {
    drag = null;
  });
  canvas.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home"].includes(e.key)) return;
    e.preventDefault();
    if (playing) pause();
    angle = e.key === "Home" ? 0 : (angle + (e.key === "ArrowLeft" ? -8 : 8)) % 360;
    paint();
  });
  const viewport = byId("viewport"),
    expand = byId("fullscreen");
  function fullState() {
    const on = !!document.fullscreenElement || viewport.classList.contains("expanded");
    expand.setAttribute("aria-label", on ? "退出全屏" : "全屏查看模型");
    expand.title = expand.getAttribute("aria-label");
    requestAnimationFrame(paint);
  }
  expand.addEventListener("click", async () => {
    if (viewport.classList.contains("expanded")) viewport.classList.remove("expanded");
    else if (document.fullscreenElement) await document.exitFullscreen();
    else if (viewport.requestFullscreen) {
      try {
        await viewport.requestFullscreen();
      } catch {
        viewport.classList.add("expanded");
      }
    } else viewport.classList.add("expanded");
    fullState();
  });
  document.addEventListener("fullscreenchange", fullState);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && viewport.classList.contains("expanded")) {
      viewport.classList.remove("expanded");
      fullState();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && playing) pause();
  });
  new ResizeObserver(paint).observe(canvas);
  const links = [...document.querySelectorAll(".mast nav a")];
  function navActive() {
    const current =
      ["lab", "research", "sources"]
        .filter((id) => byId(id).getBoundingClientRect().top < innerHeight * 0.48)
        .pop() || "lab";
    for (const link of links) link.classList.toggle("nav-current", link.hash === "#" + current);
  }
  addEventListener("scroll", navActive, { passive: true });
  const initialScene = Number(new URLSearchParams(location.search).get("scene"));
  showScene(0);
  setTime(
    Number.isInteger(initialScene) && initialScene >= 0 && initialScene <= 2 ? initialScene * 12 : 0,
    false,
  );
  updateExplode();
  navActive();
})();
