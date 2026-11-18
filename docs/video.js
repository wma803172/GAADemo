(() => {
  "use strict";
  const clips = window.videoScenes,
    get = (id) => document.getElementById(id);
  const list = get("clip-list"),
    canvas = get("mini"),
    schema = get("mini-step"),
    still = get("still"),
    player = get("movie");
  const mode = window.videoReviewMode;
  const showImages = mode === "private" || mode === "offline";
  const videoUrl = "https://www.bilibili.com/video/BV1MzUaBoE6k/";
  let current = 0;
  function model() {
    const clip = clips[current],
      isProcess = clip.step !== undefined;
    canvas.hidden = isProcess;
    schema.toggleAttribute("hidden", !isProcess);
    if (isProcess) window.drawFabrication(schema, clip.step);
    else
      window.render18A(canvas, {
        scene: clip.scene,
        angle: 0,
        explode: 0.19,
        time: 2.6,
        active: true,
        labels: true,
      });
  }
  function select(index) {
    current = index;
    const clip = clips[index];
    [...list.children].forEach((button, i) => button.setAttribute("aria-pressed", String(i === index)));
    const anchor = videoUrl + "?t=" + Math.floor(clip.time);
    get("frame-link").href = anchor;
    get("frame-link").ariaLabel = "查看原视频 " + clip.stamp;
    get("frame-link").target = "_blank";
    get("frame-link").rel = "noopener";
    still.hidden = !showImages;
    get("on-platform").hidden = showImages;
    if (showImages) {
      still.src = "stills/" + clip.file;
      still.alt = clip.alt;
    }
    get("frame-time").textContent = clip.stamp;
    get("visual-evidence").textContent = clip.alt;
    get("comparison-name").textContent = clip.model;
    const isProcess = clip.step !== undefined;
    get("model-link").href = isProcess
      ? "learn.html?step=" + (clip.step + 1) + "#process"
      : "index.html?scene=" + clip.scene + "#lab";
    get("audio-range").textContent = "口述区间 " + clip.range;
    get("clip-title").textContent = clip.title;
    get("clip-explain").textContent = clip.note;
    get("jump").href = videoUrl + "?t=" + Math.floor(clip.from);
    if (mode === "offline" && !player.paused) {
      player.pause();
      player.currentTime = clip.from;
    }
    model();
  }
  clips.forEach((clip, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = clip.stamp.slice(0, 5) + " · " + clip.short;
    button.addEventListener("click", () => select(i));
    list.append(button);
  });
  if (mode === "offline") {
    get("offline-player").hidden = false;
    get("subtitles").src = "media/subtitles.vtt";
    player.src = "media/BV1MzUaBoE6k.mp4";
    get("local-seek").addEventListener("click", () => {
      player.currentTime = clips[current].from;
      player.play().catch(() => {});
    });
  }
  new ResizeObserver(() => {
    if (!canvas.hidden) model();
  }).observe(canvas.parentElement);
  const requested = Number(new URLSearchParams(location.search).get("frame"));
  select(Number.isInteger(requested) && requested >= 1 && requested <= clips.length ? requested - 1 : 0);
})();
