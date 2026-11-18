(() => {
  "use strict";
  const parts = [...document.querySelectorAll("[data-step]")];
  const list = document.getElementById("step-list");
  const picture = document.getElementById("fabrication-figure");
  let current = 0;
  function selectStep(n) {
    current = Math.max(0, Math.min(n, parts.length - 1));
    parts.forEach((part, i) => {
      part.hidden = i !== current;
      if (i === current) list.children[i].setAttribute("aria-current", "step");
      else list.children[i].removeAttribute("aria-current");
    });
    document.getElementById("step-count").textContent = String(current + 1).padStart(2, "0") + " / 07";
    document.getElementById("view-caption").textContent = parts[current].dataset.step;
    document.getElementById("previous").disabled = current === 0;
    document.getElementById("next").disabled = current === parts.length - 1;
    window.drawFabrication(picture, current);
  }
  if (window.drawFabrication) {
    parts.forEach((part, i) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(i + 1);
      button.setAttribute("aria-label", "第" + (i + 1) + "步，" + part.dataset.step);
      button.addEventListener("click", () => selectStep(i));
      list.append(button);
    });
    document.getElementById("previous").addEventListener("click", () => selectStep(current - 1));
    document.getElementById("next").addEventListener("click", () => selectStep(current + 1));
    document.querySelector(".steps-controls").hidden = false;
    const requested = Number(new URLSearchParams(location.search).get("step"));
    selectStep(Number.isInteger(requested) && requested > 0 ? requested - 1 : 0);
  }
  const switches = [...document.querySelectorAll("[data-bit]")];
  switches.forEach((button) =>
    button.addEventListener("click", () => {
      const bit = button.dataset.bit;
      for (const option of switches) option.setAttribute("aria-pressed", String(option === button));
      document.getElementById("logic-lines").dataset.input = bit;
      document.getElementById("p-state").textContent = bit === "0" ? "导通" : "关断";
      document.getElementById("n-state").textContent = bit === "0" ? "关断" : "导通";
      document.getElementById("logic-result").textContent = bit === "0" ? "1" : "0";
      document.getElementById("logic-explain").textContent =
        bit === "0"
          ? "输入为 0 时，上方开关给输出端的小电容充电，把电压拉高，所以读到 1。"
          : "输入为 1 时，下方开关给输出端的小电容提供放电路径，把电压拉低，所以读到 0。";
    }),
  );
})();
