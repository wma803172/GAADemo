(() => {
  "use strict";
  const crossSection = document.querySelector(".gate-pair");
  const circuit = document.querySelector(".logic-diagram");
  const result = document.getElementById("logic-result");
  for (const group of document.querySelectorAll(".design-choice")) {
    group.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button || !group.contains(button)) return;
      for (const choice of group.querySelectorAll("button")) {
        choice.setAttribute("aria-pressed", String(choice === button));
      }
      if (button.dataset.width) {
        crossSection.dataset.geometry = button.dataset.width;
      } else {
        circuit.dataset.level = button.dataset.input;
        result.textContent =
          button.dataset.input === "1" ? "输入 1 → 下方导通 → 输出 0" : "输入 0 → 上方导通 → 输出 1";
      }
    });
  }
})();
