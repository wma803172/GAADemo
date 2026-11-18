/* Seven qualitative cross sections of a nanosheet device and its power network. */
(() => {
  "use strict";

  const names = [
    ["长出硅和硅锗层", "硅和硅锗在衬底上交替排列。蓝色的四层硅将成为沟道。"],
    ["刻出窄条，做好两端", "源极和漏极分别在条带两端，中央的临时栅极预留未来栅的位置。"],
    ["抽走硅锗", "去除临时栅和栅区的硅锗后，四条悬空硅带仍连接在两端。"],
    [
      "包上绝缘层和共同的栅",
      "沿源漏方向看栅中央的横截面。每条蓝色硅带都有薄绝缘层包围，外侧的金属在各层之间相连。",
    ],
    ["接上正面信号线", "正面输入信号线通过栅接点连接栅极。源极和漏极各有自己的接点。"],
    [
      "托住正面，翻转并减薄背面",
      "左图完成正面接线并贴上支撑片。右图翻转后支撑片朝下，原衬底从背面减薄，露出预先形成的局部通孔端部。",
    ],
    [
      "铺背面电源轨",
      "背面朝上。VDD 轨通过侧边通孔和本地接点通往 pMOS 源极，VSS 轨另接 nMOS 源极。正面输入信号控制两管的栅。",
    ],
  ];

  const blue = "#64d4ff",
    purple = "#c5a4f5",
    steel = "#c4dce7",
    mint = "#9fe6cd";
  const gold = "#ffce82",
    copper = "#efa274",
    gray = "#9eb7c5";
  const centers = [117, 147, 177, 207];
  const ids = new WeakMap();
  let nextId = 1;

  function rect(x, y, w, h, fill, stroke = "none", r = 0) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}"/>`;
  }
  function path(d, color, width = 1.4, extra = "") {
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
  }
  function text(x, y, str, fill = "#e5f2f4", anchor = "start", size = 19, weight = 560) {
    return `<text x="${x}" y="${y}" fill="${fill}" text-anchor="${anchor}" font-size="${size}" font-weight="${weight}">${str}</text>`;
  }
  // The leader ends on the part and begins directly below its label.
  function leader(x, y, str, color, bx, by, ax, ay, side = "start") {
    return (
      '<g class="fab-leader">' +
      text(x, y, str, color, side) +
      path(`M${x} ${y + 8} L${bx} ${by} L${ax} ${ay}`, color, 1.2) +
      `<circle cx="${ax}" cy="${ay}" r="2.7" fill="${color}" stroke="#122634"/></g>`
    );
  }
  function solid(x, y, w, h, dx, dy, front, top, edge) {
    return (
      `<path d="M${x} ${y}l${dx} ${dy}h${w}l${-dx} ${-dy}z" fill="${top}" stroke="${edge}" stroke-width=".75"/>
      <path d="M${x + w} ${y}l${dx} ${dy}v${h}l${-dx} ${-dy}z" fill="${front}" stroke="${edge}" stroke-width=".75"/>` +
      rect(x, y, w, h, front, edge)
    );
  }
  function defs(p) {
    const gradient = (name, a, b) =>
      `<linearGradient id="${p}-${name}" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
    return `<defs>
      ${gradient("si", "#76dfff", "#2c92c7")}${gradient("ge", "#a58ace", "#68548d")}
      ${gradient("metal", "#b0c8d3", "#617f93")}${gradient("contact", "#7898b0", "#35556e")}
      ${gradient("gold", "#ffdc9f", "#cf8d49")}${gradient("copper", "#ffd1ac", "#ba744d")}
      <pattern id="${p}-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="#8096a4" stroke-opacity=".10"/></pattern>
      <pattern id="${p}-hatch" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M-2 2L2 -2M0 8L8 0M6 10L10 6" stroke="#79a1b5" stroke-opacity=".24" stroke-width="1"/></pattern>
      <marker id="${p}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="m0 0 10 5-10 5z" fill="#c5dce1"/></marker>
    </defs>`;
  }
  const fill = (p, name) => `url(#${p}-${name})`;
  function base(p, x, y, w, h) {
    return solid(x, y, w, h, 19, -11, "#385064", "#536f81", "#718a9b") + rect(x, y, w, h, fill(p, "hatch"));
  }
  function layers(p, x, w, withGe, depth = 18) {
    return centers
      .map((y, index) => {
        const rise = -depth / 2;
        if (!withGe) return solid(x, y, w, 12, depth, rise, fill(p, "si"), "#9be7ff", "#77cfe9");
        // Flush layers share their interfaces. Only the uppermost top face is exposed.
        let out =
          index === 0
            ? `<path d="M${x} ${y}l${depth} ${rise}h${w}l${-depth} ${-rise}z" fill="#9be7ff"/>`
            : "";
        for (const [offset, h, mat, edge] of [
          [0, 13, "si", "#77cfe9"],
          [13, 17, "ge", "#9b81bd"],
        ]) {
          const top = y + offset;
          out += `<path d="M${x + w} ${top}l${depth} ${rise}v${h}l${-depth} ${-rise}z" fill="${fill(p, mat)}" stroke="${edge}" stroke-width=".75"/>`;
          out += rect(x, top, w, h, fill(p, mat), edge);
        }
        return out;
      })
      .reverse()
      .join("");
  }
  function anchor(p, x, y, w = 68, h = 122) {
    return solid(x, y, w, h, 17, -10, fill(p, "contact"), "#a4bbc7", "#7895a6");
  }
  function stack(p) {
    return (
      base(p, 118, 236, 366, 38) +
      layers(p, 142, 295, true, 48) +
      leader(47, 68, "硅衬底", gray, 107, 76, 139, 246) +
      leader(552, 110, "硅 · 留作沟道", blue, 527, 118, 430, 122) +
      leader(552, 190, "硅锗 · 稍后移除", purple, 520, 198, 430, 197)
    );
  }
  function bar(p, released) {
    const left = 175,
      right = 481;
    let out = base(p, 103, 242, 490, 23);
    out += layers(p, left, right - left, !released);
    out += anchor(p, 111, 109, 66, 127) + anchor(p, right, 109, 69, 127);
    if (!released) {
      // The bracket shows a dummy gate straddling the patterned fins.
      out += solid(286, 77, 89, 12, 27, -15, "#7a8a87", "#a6b8b0", "#a9bcb5");
      out +=
        rect(286, 89, 9, 143, "#708985", "#96ada5", 2) + rect(367, 89, 8, 140, "#708985", "#96ada5", 2);
      out += rect(295, 89, 72, 142, "#aabbb214", "none");
      out += leader(435, 52, "临时栅极", steel, 416, 60, 367, 74);
    } else {
      out += path("M304 137h67 M304 167h67 M304 197h67", "#abc9d4", 1, 'stroke-dasharray="3 6"');
      out += leader(423, 58, "带间留出空隙", mint, 399, 66, 366, 136);
    }
    return (
      out +
      leader(37, 293, "源极", steel, 83, 301, 140, 225) +
      leader(603, 293, "漏极", steel, 579, 301, 540, 224) +
      (!released ? "" : text(336, 282, "四条硅带，两端相连", blue, "middle", 17))
    );
  }
  function gateCut(p) {
    let out = solid(227, 66, 239, 208, 23, -13, fill(p, "metal"), "#d6e6ec", "#a7bfcb");
    [88, 132, 176, 220].forEach((y) => {
      out += rect(252, y, 188, 24, mint, "#e6fbef", 10);
      out += rect(257, y + 5, 178, 14, fill(p, "si"), "#81d5ee", 6);
    });
    out += leader(40, 100, "共用栅金属", steel, 154, 108, 231, 125);
    out += leader(530, 135, "薄绝缘层", mint, 496, 143, 436, 144);
    out += leader(530, 225, "硅沟道", blue, 499, 233, 425, 233);
    out += text(347, 309, "沿源极 → 漏极的方向看", gray, "middle", 16);
    return out;
  }
  function front(p) {
    let out = base(p, 103, 242, 489, 24) + layers(p, 175, 306, false);
    out += anchor(p, 111, 109, 66, 127) + anchor(p, 481, 109, 69, 127);
    out += solid(280, 113, 91, 118, 15, -9, fill(p, "metal"), "#c5dbe6", "#abc2cc");
    out += rect(316, 72, 22, 40, fill(p, "metal"), "#aacbd3", 2);
    out += rect(232, 61, 223, 12, "#84c7c2", "#b0e1d6", 2);
    out += rect(133, 85, 22, 22, fill(p, "contact"), "#aec3cb", 2);
    out += rect(503, 85, 22, 22, fill(p, "contact"), "#aec3cb", 2);
    return (
      out +
      leader(465, 40, "正面信号线", mint, 446, 48, 421, 65) +
      leader(41, 60, "源极接点", steel, 103, 68, 141, 91) +
      leader(580, 95, "漏极接点", steel, 554, 103, 518, 94) +
      leader(61, 290, "共用栅极", steel, 192, 298, 304, 209)
    );
  }
  function slice(x, y, w, h, face, outline) {
    return rect(x, y, w, h, face, outline, 2);
  }
  function flip(p) {
    const x = 54,
      w = 210,
      r = 455;
    let out = text(x, 77, "翻转前", steel, "start", 18) + text(r, 77, "翻转、减薄后", mint, "start", 18);
    out +=
      slice(x, 99, w, 29, "#5b7077", "#7c9194") + text(x + 105, 120, "支撑片", "#f0f5f2", "middle", 16);
    out +=
      slice(x, 130, w, 26, "#497976", "#8ac8bb") + text(x + 105, 149, "正面互连", "#e4fff3", "middle", 15);
    out += slice(x, 158, w, 18, "#607e98", "#a7c6d5");
    out += slice(x, 178, w, 83, "#385064", "#718a9b") + rect(x, 178, w, 83, fill(p, "hatch"));
    out += text(x + 105, 236, "原硅衬底", steel, "middle", 16);
    for (const dx of [37, 168]) out += rect(x + dx, 162, 6, 31, gold, "none", 2);
    out += path("M291 172 Q355 107 423 172", "#c5dce1", 2, `marker-end="url(#${p}-arrow)"`);
    out += text(359, 192, "翻面", steel, "middle", 17);
    out += path(`M${r} 155v-43h${w}v43`, gray, 1.4, 'stroke-dasharray="4 5"');
    out += text(r + w / 2, 139, "移除的硅", gray, "middle", 15);
    out += slice(r, 157, w, 27, "#385064", "#718a9b") + rect(r, 157, w, 27, fill(p, "hatch"));
    out += slice(r, 186, w, 18, "#607e98", "#a7c6d5");
    out +=
      slice(r, 206, w, 26, "#497976", "#8ac8bb") +
      text(r + w / 2, 225, "正面互连", "#e4fff3", "middle", 15);
    out +=
      slice(r, 234, w, 29, "#5b7077", "#7c9194") + text(r + w / 2, 255, "支撑片", "#f0f5f2", "middle", 16);
    for (const dx of [37, 168]) out += rect(r + dx, 157, 6, 43, gold, "none", 2);
    out += leader(357, 298, "露出的通孔端", gold, 452, 306, r + 39, 157);
    return out;
  }
  function power(p) {
    let out = slice(92, 123, 536, 46, "#344c5e", "#627d90") + rect(92, 123, 536, 46, fill(p, "hatch"));
    out +=
      slice(107, 80, 157, 18, fill(p, "gold"), gold) + slice(453, 80, 158, 18, fill(p, "copper"), copper);
    out +=
      text(184, 68, "VDD 电源轨", gold, "middle", 18) + text(533, 68, "VSS 回流轨", copper, "middle", 18);
    out +=
      rect(147, 98, 11, 127, fill(p, "gold"), gold, 2) +
      rect(568, 98, 11, 127, fill(p, "copper"), copper, 2);
    [
      [201, 335, 262],
      [366, 501, 434],
    ].forEach(([left, right, gx]) => {
      for (const y of [178, 189, 200, 211]) out += rect(left + 15, y, right - left - 14, 5, blue);
      out +=
        rect(left, 176, 22, 44, fill(p, "contact"), steel, 2) +
        rect(right, 176, 22, 44, fill(p, "contact"), steel, 2);
      out += rect(gx, 174, 25, 46, fill(p, "metal"), steel, 2);
      out += rect(gx + 10, 220, 5, 45, mint);
    });
    out +=
      rect(147, 220, 66, 8, fill(p, "gold"), gold, 2) + rect(511, 220, 68, 8, fill(p, "copper"), copper, 2);
    out += path("M346 220v22h30v-22", steel, 5);
    out += text(360, 258, "输出", steel, "middle", 13);
    out += path("M236 267h241", mint, 6);
    out += text(277, 160, "pMOS", steel, "middle", 15) + text(448, 160, "nMOS", steel, "middle", 15);
    out += leader(28, 274, "侧边通孔", gold, 102, 282, 152, 175);
    out += leader(565, 277, "本地接点", copper, 546, 285, 527, 224);
    out += text(359, 303, "正面输入信号", mint, "middle", 18);
    return out;
  }

  const stages = [stack, (p) => bar(p, false), (p) => bar(p, true), gateCut, front, flip, power];
  const views = [
    "材料剖面",
    "纵剖面 · 源极和漏极同框",
    "纵剖面 · 源极和漏极同框",
    "横剖面 · 正对四条硅带的端面",
    "纵剖面 · 源极和漏极同框",
    "晶圆剖面",
    "背面在上 · 正面在下",
  ];
  // Narrow screens reuse the same geometry, but lay the annotations out at a legible size.
  function tag(x, y, label, color, ax, ay, side = "start") {
    const joint = x + (side === "end" ? -8 : 8);
    return (
      path(`M${x} ${y + 4}H${joint}L${ax} ${ay}`, color, 1) +
      `<circle cx="${ax}" cy="${ay}" r="2" fill="${color}" stroke="#142a39"/>` +
      text(x, y, label, color, side, 16)
    );
  }
  function flippedOnPhone(p) {
    const left = 11,
      right = 209,
      w = 140;
    const band = (x, y, h, label, color, ink = "#e8f1f1") =>
      slice(x, y, w, h, color, "#839aa6") + text(x + w / 2, y + h / 2 + 5, label, ink, "middle", 15);
    let out =
      text(left, 28, "翻转前", steel, "start", 17) + text(right, 28, "翻转、减薄后", mint, "start", 17);
    out +=
      band(left, 47, 24, "支撑片", "#506571") +
      band(left, 73, 24, "正面互连", "#446f71") +
      slice(left, 99, w, 12, "#667f92", gray) +
      band(left, 113, 57, "原硅衬底", "#364d60");
    out +=
      path(`M${right} 80V47h${w}v33`, gray, 1.1, 'stroke-dasharray="3 4"') +
      text(right + w / 2, 68, "移除的硅", gray, "middle", 15) +
      slice(right, 82, w, 24, "#364d60", gray) +
      slice(right, 108, w, 12, "#667f92", gray) +
      band(right, 122, 23, "正面互连", "#446f71") +
      band(right, 147, 24, "支撑片", "#506571");
    for (const dx of [16, 123])
      out += rect(left + dx, 103, 4, 22, gold, "none", 1) + rect(right + dx, 82, 4, 35, gold, "none", 1);
    out +=
      path("M157 101q20 -27 46 0", steel, 1.5, `marker-end="url(#${p}-arrow)"`) +
      text(179, 125, "翻面", steel, "middle", 15);
    out += tag(158, 204, "露出的通孔端", gold, right + 18, 82, "end");
    return out;
  }
  function compactDrawing(p, index) {
    if (index === 5) return flippedOnPhone(p);
    const transform = [
      "translate(-38 -17) scale(.66)",
      "translate(-52 -5) scale(.67)",
      "translate(-52 -5) scale(.67)",
      "translate(-62 -15) scale(.73)",
      "translate(-52 9) scale(.67)",
      "",
      "translate(-46 -2) scale(.64)",
    ][index];
    let out =
      "<style>.fab-geometry text,.fab-geometry .fab-leader{display:none}</style>" +
      `<g class="fab-geometry" transform="${transform}">${stages[index](p)}</g>`;
    if (index === 0) {
      out += tag(303, 62, "硅", blue, 228, 64) + tag(303, 112, "硅锗", purple, 234, 113);
      out += tag(22, 201, "硅衬底", gray, 54, 150);
    } else if (index === 1 || index === 2) {
      out += tag(
        254,
        32,
        index === 1 ? "临时栅极" : "带间空隙",
        index === 1 ? steel : mint,
        index === 1 ? 166 : 188,
        index === 1 ? 44 : 87,
      );
      out += tag(24, 201, "源极", steel, 40, 138) + tag(334, 201, "漏极", steel, 306, 139, "end");
      if (index === 2) out += text(180, 186, "四条硅带", blue, "middle", 16);
    } else if (index === 3) {
      out +=
        tag(12, 65, "共用栅金属", steel, 111, 77) +
        tag(12, 115, "薄绝缘层", mint, 124, 91) +
        tag(12, 167, "硅沟道", blue, 134, 154);
      out += text(197, 211, "沿源极 → 漏极方向看", gray, "middle", 15);
    } else if (index === 4) {
      out +=
        tag(211, 36, "正面信号线", mint, 189, 54) +
        tag(9, 51, "源极接点", steel, 43, 71) +
        tag(350, 69, "漏极接点", steel, 293, 72, "end") +
        tag(120, 211, "共用栅极", steel, 155, 138);
    } else {
      out += text(71, 39, "VDD 电源", gold, "middle", 16) + text(292, 39, "VSS 回流", copper, "middle", 16);
      out += text(128, 97, "pMOS", steel, "middle", 15) + text(238, 97, "nMOS", steel, "middle", 15);
      out += tag(5, 179, "通孔", gold, 51, 112) + tag(355, 181, "本地接点", copper, 290, 140, "end");
      out +=
        text(209, 163, "输出", steel, "middle", 15) + text(181, 195, "正面输入信号", mint, "middle", 16);
    }
    return out;
  }
  const activeSteps = new WeakMap();
  const observer =
    typeof ResizeObserver === "function"
      ? new ResizeObserver((entries) => {
          for (const { target, contentRect } of entries) {
            const state = activeSteps.get(target);
            if (state && contentRect.width > 0 && state.compact !== contentRect.width < 535) {
              window.drawFabrication(target, state.index);
            }
          }
        })
      : null;
  window.drawFabrication = function drawFabrication(svg, step) {
    const index = Math.max(0, Math.min(6, Math.trunc(Number(step)) || 0));
    if (!ids.has(svg)) {
      ids.set(svg, `fab${nextId++}`);
      observer?.observe(svg);
    }
    const p = ids.get(svg);
    const width = svg.getBoundingClientRect().width;
    const compact = width > 0 && width < 535;
    activeSteps.set(svg, { index, compact });
    const [w, h] = compact ? [360, 220] : [720, 355];
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-labelledby", p + "-title " + p + "-desc");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.innerHTML =
      `<title id="${p}-title">${names[index][0]}</title><desc id="${p}-desc">${names[index][1]}</desc>` +
      defs(p) +
      rect(0, 0, w, h, "#142a39") +
      rect(0, 0, w, h, fill(p, "grid")) +
      '<g font-family="Microsoft YaHei, PingFang SC, system-ui, sans-serif">' +
      (compact
        ? compactDrawing(p, index)
        : text(24, 32, views[index], "#9eb7c5", "start", 15, 500) + stages[index](p)) +
      "</g>";
  };
})();
