/* Teaching geometry in arbitrary units. X follows the channels; Z runs from
   the backside towards the frontside. All drawing stays local to the canvas. */
(() => {
  "use strict";

  const TAU = 2 * Math.PI;
  const materials = {
    silicon: [
      [16, 33, 54],
      [49, 75, 101],
      [99, 128, 154],
    ],
    oxide: [
      [48, 66, 81],
      [107, 135, 149],
      [174, 197, 204],
    ],
    gate: [
      [62, 79, 99],
      [138, 160, 184],
      [227, 238, 247],
    ],
    contact: [
      [41, 56, 76],
      [106, 129, 150],
      [183, 200, 213],
    ],
    channel: [
      [12, 43, 96],
      [24, 112, 187],
      [106, 215, 253],
    ],
    liner: [
      [78, 118, 131],
      [158, 201, 204],
      [229, 249, 232],
    ],
    gold: [
      [110, 62, 26],
      [203, 147, 65],
      [255, 222, 145],
    ],
    copper: [
      [103, 53, 31],
      [184, 114, 66],
      [250, 194, 130],
    ],
    signal: [
      [41, 87, 99],
      [95, 154, 166],
      [180, 225, 225],
    ],
  };
  const length = (v) => Math.hypot(...v);
  const unit = (v) => {
    const d = length(v) || 1;
    return v.map((n) => n / d);
  };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const sub = (a, b) => a.map((n, i) => n - b[i]);
  const mix = (a, b, t) => a.map((n, i) => n + (b[i] - n) * t);
  const mean = (points) => points.reduce((p, v) => v.map((n, i) => p[i] + n / points.length), [0, 0, 0]);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rgb = (a) => "rgb(" + a.map((n) => Math.round(clamp(n, 0, 255))).join(",") + ")";
  function shade(material, intensity, delta = 0) {
    const p = materials[material];
    const t = clamp(intensity + delta, 0, 1);
    return rgb(t < 0.52 ? mix(p[0], p[1], t / 0.52) : mix(p[1], p[2], (t - 0.52) / 0.48));
  }
  function rounded(y, z, w, h, r) {
    const p = [],
      n = 4;
    r = Math.min(r, w / 2 - 0.0001, h / 2 - 0.0001);
    for (let side = 0; side < 4; side++) {
      const right = side === 0 || side === 3,
        top = side < 2;
      const cy = y + (right ? 1 : -1) * (w / 2 - r),
        cz = z + (top ? 1 : -1) * (h / 2 - r);
      for (let j = 0; j <= n; j++) {
        const a = ((side + j / n) * Math.PI) / 2;
        p.push([cy + r * Math.cos(a), cz + r * Math.sin(a)]);
      }
    }
    return p;
  }
  function shape(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
  }
  function stroke(ctx, points, color, width = 1) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  class Scene {
    constructor(ctx, w, h, opts) {
      this.ctx = ctx;
      this.w = w;
      this.h = h;
      this.opts = opts;
      this.objects = [];
      this.notes = [];
      const degrees = (opts.scene === 1 ? 68 : opts.scene === 2 ? 30 : 32) + opts.angle;
      const az = (degrees * Math.PI) / 180,
        el = ((opts.scene === 1 ? 13 : 22) * Math.PI) / 180;
      this.ca = Math.cos(az);
      this.sa = Math.sin(az);
      this.ce = Math.cos(el);
      this.se = Math.sin(el);
      this.view = [this.sa * this.ce, this.ca * this.ce, this.se];
      this.light = unit([-0.27, -0.48, 1]);
    }
    project(p) {
      const [x, y, z] = p;
      return [x * this.ca - y * this.sa, (x * this.sa + y * this.ca) * this.se - z * this.ce];
    }
    screen(p) {
      const a = this.project(p);
      return [this.ox + a[0] * this.s, this.oy + a[1] * this.s];
    }
    add(phase, center, faces, after, points = []) {
      this.objects.push({ phase, center, faces, after, points });
    }
    box(phase, x, y, z, X, Y, Z, mat, options = {}) {
      const corners = [
        [x, y, z],
        [X, y, z],
        [X, Y, z],
        [x, Y, z],
        [x, y, Z],
        [X, y, Z],
        [X, Y, Z],
        [x, Y, Z],
      ];
      const faces = [
        [
          [0, 3, 2, 1],
          [0, 0, -1],
        ],
        [
          [4, 5, 6, 7],
          [0, 0, 1],
        ],
        [
          [0, 1, 5, 4],
          [0, -1, 0],
        ],
        [
          [3, 7, 6, 2],
          [0, 1, 0],
        ],
        [
          [0, 4, 7, 3],
          [-1, 0, 0],
        ],
        [
          [1, 2, 6, 5],
          [1, 0, 0],
        ],
      ].map(([ids, normal]) => ({
        verts: ids.map((i) => corners[i]),
        normal,
        mat,
        finish: options.finish,
      }));
      this.add(phase, mean(corners), faces, options.after, corners);
    }
    profile(phase, x1, x2, yz, mat, after = null, ringEnds = true) {
      const near = yz.map(([y, z]) => [x1, y, z]),
        far = yz.map(([y, z]) => [x2, y, z]);
      const faces = [];
      for (let i = 0; i < yz.length; i++) {
        const j = (i + 1) % yz.length,
          dy = yz[j][0] - yz[i][0],
          dz = yz[j][1] - yz[i][1];
        if (Math.hypot(dy, dz) < 0.00001) continue;
        faces.push({
          verts: [near[i], near[j], far[j], far[i]],
          normal: unit([0, dz, -dy]),
          mat,
          smooth: true,
        });
      }
      faces.push({ verts: near, normal: [-1, 0, 0], mat, finish: ringEnds ? "cut" : null });
      faces.push({ verts: far, normal: [1, 0, 0], mat, finish: ringEnds ? "cut" : null });
      this.add(phase, mean([...near, ...far]), faces, after, [...near, ...far]);
    }
    post(phase, x, y, z, Z, r, mat, rTop = r) {
      const n = 14,
        b = [],
        t = [],
        faces = [];
      for (let i = 0; i < n; i++) {
        const a = (i * TAU) / n;
        b.push([x + r * Math.cos(a), y + r * Math.sin(a), z]);
        t.push([x + rTop * Math.cos(a), y + rTop * Math.sin(a), Z]);
      }
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n,
          a = ((i + 0.5) * TAU) / n;
        faces.push({
          verts: [b[i], b[j], t[j], t[i]],
          normal: unit([Math.cos(a), Math.sin(a), (r - rTop) / (Z - z)]),
          mat,
          smooth: true,
        });
      }
      faces.push({ verts: t, normal: [0, 0, 1], mat }, { verts: b, normal: [0, 0, -1], mat });
      this.add(phase, [x, y, (z + Z) / 2], faces, null, [...b, ...t]);
    }
    traces(phase, paths, color, width) {
      for (const path of paths)
        this.add(
          phase,
          mean(path),
          [],
          () =>
            stroke(
              this.ctx,
              path.map((v) => this.screen(v)),
              color,
              width,
            ),
          path,
        );
    }
    track(points, phase, offset, color) {
      if (!this.opts.active) return;
      const lengths = points.slice(1).map((p, i) => length(sub(p, points[i])));
      const total = lengths.reduce((a, b) => a + b, 0);
      const t = (this.opts.time * 0.39 + offset) % 1;
      let d = t * total,
        index = 0;
      while (index < lengths.length - 1 && d > lengths[index]) d -= lengths[index++];
      const v = mix(points[index], points[index + 1], d / lengths[index]);
      this.add(phase, v, [], () => {
        const [x, y] = this.screen(v),
          c = this.ctx,
          sz = clamp(this.s * 0.038, 1.35, 3.25);
        c.save();
        c.shadowColor = color;
        c.shadowBlur = sz * 3;
        c.fillStyle = color;
        c.beginPath();
        c.arc(x, y, sz, 0, TAU);
        c.fill();
        c.restore();
      });
    }
    face(f) {
      if (dot(f.normal, this.view) < 0.001) return;
      const p = f.verts.map((v) => this.screen(v)),
        c = this.ctx;
      const xs = p.map((v) => v[0]),
        ys = p.map((v) => v[1]);
      const loX = Math.min(...xs),
        hiX = Math.max(...xs),
        loY = Math.min(...ys),
        hiY = Math.max(...ys);
      const h = hiY - loY,
        w = hiX - loX;
      const illum = clamp(0.48 + 0.48 * dot(f.normal, this.light) + 0.1 * f.normal[0], 0.1, 0.97);
      shape(c, p);
      if (w + h > 7) {
        const g = c.createLinearGradient(loX, loY, hiX + 1, hiY + 0.5);
        const metal = ["gate", "contact", "gold", "copper"].includes(f.mat);
        g.addColorStop(0, shade(f.mat, illum, metal ? 0.15 : 0.1));
        g.addColorStop(0.29, shade(f.mat, illum, metal ? -0.026 : 0.04));
        g.addColorStop(0.55, shade(f.mat, illum, metal ? 0.08 : 0));
        g.addColorStop(1, shade(f.mat, illum, metal ? -0.17 : -0.11));
        c.fillStyle = g;
      } else c.fillStyle = shade(f.mat, illum);
      c.fill();
      c.strokeStyle = f.smooth ? c.fillStyle : "rgba(173,204,228,.28)";
      c.lineWidth = f.smooth ? 0.7 : 0.72;
      c.stroke();
      if (f.finish === "cut" && h > 15 && w > 12) {
        c.save();
        c.clip();
        c.lineWidth = 0.55;
        c.strokeStyle = "rgba(226,240,248,.13)";
        c.beginPath();
        for (let i = loX - h; i < hiX + h; i += 5) {
          c.moveTo(i, hiY);
          c.lineTo(i + h * 0.65, loY);
        }
        c.stroke();
        c.restore();
      }
    }
    fit() {
      const projected = this.objects.flatMap((o) => o.points).map((p) => this.project(p));
      const xs = projected.map((p) => p[0]),
        ys = projected.map((p) => p[1]);
      const minX = Math.min(...xs),
        maxX = Math.max(...xs),
        minY = Math.min(...ys),
        maxY = Math.max(...ys);
      const w = this.w,
        h = this.h,
        mobile = w < 480;
      const width = w * (mobile ? 0.88 : 0.77),
        top = mobile ? 45 : 50,
        bot = mobile ? 36 : 38;
      this.s = Math.min(width / (maxX - minX), (h - top - bot) / (maxY - minY));
      this.ox = w * 0.5 - ((minX + maxX) / 2) * this.s;
      this.oy = top + (h - top - bot) / 2 - ((minY + maxY) / 2) * this.s;
    }
    label(v, text, side, y, color) {
      this.notes.push({ v, text, side, y, color });
    }
    drawLabels() {
      if (!this.opts.labels) return;
      const { ctx: c, w, h } = this,
        small = w < 480;
      const size = small ? 10 : 12;
      c.font = "500 " + size + 'px "Microsoft YaHei UI","PingFang SC",system-ui,sans-serif';
      c.textBaseline = "middle";
      for (const n of this.notes) {
        const [ax, ay] = this.screen(n.v);
        const tw = c.measureText(n.text).width,
          margin = small ? 11 : 22;
        const left = n.side === "left",
          bx = left ? margin : w - margin - tw - 14,
          by = clamp(h * n.y, 49, h - 32);
        const ex = left ? bx + tw + 12 : bx + 1,
          elbow = left ? ex + 11 : ex - 11;
        stroke(
          c,
          [
            [ax, ay],
            [elbow, by],
            [ex, by],
          ],
          "rgba(164,190,212,.65)",
          0.85,
        );
        c.fillStyle = n.color;
        c.beginPath();
        c.arc(ax, ay, small ? 2.2 : 2.8, 0, TAU);
        c.fill();
        c.strokeStyle = "rgba(10,25,39,.7)";
        c.lineWidth = 1;
        c.stroke();
        c.fillStyle = "rgba(12,27,42,.9)";
        c.fillRect(bx, by - 10, tw + 13, 20);
        c.fillStyle = n.color;
        c.fillRect(bx + 1, by - 5, 2, 10);
        c.fillStyle = "#e1ecf2";
        c.fillText(n.text, bx + 7, by);
      }
    }
    paint() {
      this.fit();
      const c = this.ctx;
      const base = this.objects.flatMap((o) => o.points);
      const px = base.map((p) => this.screen(p));
      const xmin = Math.min(...px.map((p) => p[0])),
        xmax = Math.max(...px.map((p) => p[0]));
      const ymin = Math.min(...px.map((p) => p[1])),
        ymax = Math.max(...px.map((p) => p[1]));
      c.save();
      c.translate((xmin + xmax) * 0.5, ymax - 3);
      c.scale((xmax - xmin) * 0.48, (ymax - ymin) * 0.075);
      const sh = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      sh.addColorStop(0, "rgba(1,6,12,.56)");
      sh.addColorStop(1, "rgba(0,1,9,0)");
      c.fillStyle = sh;
      c.fillRect(-1, -1, 2, 2);
      c.restore();
      this.objects.sort((a, b) => a.phase - b.phase || dot(sub(a.center, b.center), this.view));
      for (const o of this.objects) {
        for (const f of o.faces) this.face(f);
        if (o.after) o.after();
      }
      this.drawLabels();
    }
  }
  function skin(s, phase, x, y, z, X, Y, Z) {
    s.box(phase, x, y, z, X, Y, Z, "silicon");
    const paths = [];
    const sy = s.view[1] >= 0 ? Y + 0.001 : y - 0.001,
      sx = s.view[0] >= 0 ? X + 0.001 : x - 0.001;
    for (let i = 1; i < 4; i++) {
      const sz = z + ((Z - z) * i) / 5;
      paths.push(
        [
          [x, sy, sz],
          [X, sy, sz],
        ],
        [
          [sx, y, sz],
          [sx, Y, sz],
        ],
      );
    }
    s.traces(phase + 0.1, paths, "rgba(148,181,208,.33)", 0.65);
  }
  function backRails(s, e, full = false) {
    const z = -0.49 - e;
    for (let i = 0; i < 2; i++) {
      const y = i === 0 ? -0.98 : 0.98,
        m = i === 0 ? "gold" : "copper",
        xPad = i === 0 ? -0.92 : 1.08;
      s.post(0, xPad, y, z - 0.29, z - 0.07, 0.28, m, 0.32);
      s.box(1, -3.04, y - 0.31, z - 0.11, 3.04, y + 0.31, z + 0.05, m);
      const paths = [];
      for (const d of [-0.23, -0.15, 0.15, 0.23])
        paths.push([
          [-2.98, y + d, z + 0.052],
          [2.98, y + d, z + 0.052],
        ]);
      s.traces(1.1, paths, "rgba(255,236,188,.44)", 0.63);
      // The device view cuts away the neighboring pMOS cell.
      if (!full && i === 0) continue;
      const vx = i === 0 ? 2.45 : -2.45,
        top = full ? 0.94 : 1.73;
      s.box(2, vx - 0.28, y - 0.225, z + 0.05, vx + 0.28, y + 0.225, z + 0.12, m);
      s.post(3, vx, y, z + 0.12, -0.16, 0.12, m, 0.115);
      const surface = full ? 0.08 : 0.185;
      s.post(5, vx, y, surface, top, 0.115, m, 0.105);
      s.post(5.05, vx, y, top - 0.055, top + 0.025, 0.169, m);
      if (full) {
        const xEnd = i === 0 ? 1.48 : -1.48;
        s.box(
          8,
          Math.min(xEnd, vx) - 0.11,
          y - 0.13,
          top + 0.025,
          Math.max(xEnd, vx) + 0.11,
          y + 0.13,
          top + 0.125,
          m,
        );
        const powerPath = [
          [xPad, y, z + 0.07],
          [vx, y, z + 0.07],
          [vx, y, top + 0.14],
          [xEnd, y, top + 0.14],
        ];
        // The two rails belong to different devices. Dots trace delivery and return.
        const p = i === 0 ? powerPath : powerPath.reverse();
        for (let k = 0; k < 3; k++) s.track(p, 9, k / 3, i === 0 ? "#ffe0a0" : "#ffd3a5");
      }
    }
  }
  function sideOfGate(s, x1, x2, y, z, width, height, centers, rw, rh) {
    const end = s.view[0] > 0 ? x2 : x1;
    const outer = rounded(y, z, width, height, Math.min(0.14, height * 0.085));
    s.profile(6, x1, x2, outer, "gate", () => {
      const c = s.ctx;
      if (Math.abs(s.view[0]) < 0.015) return;
      for (const cz of centers) {
        const plate = (w, h, r, fill, outline) => {
          const pts = rounded(y, cz, w, h, r).map(([py, pz]) => s.screen([end, py, pz]));
          shape(c, pts);
          c.fillStyle = fill;
          c.fill();
          c.strokeStyle = outline;
          c.lineWidth = 0.8;
          c.stroke();
        };
        plate(rw + 0.092, rh + 0.082, rh * 0.49 + 0.034, "#c8e4dd", "#e3f4e7");
        plate(rw, rh, rh * 0.46, s.opts.active ? "#58c8fa" : "#2876af", "#95e3ff");
        if (s.opts.scene === 1) {
          const sign = s.view[0] >= 0 ? 1 : -1;
          const p1 = [end + 0.004 * sign, y - rw * 0.36, cz + rh * 0.18],
            p2 = [end + 0.004 * sign, y + rw * 0.38, cz + rh * 0.18];
          stroke(c, [s.screen(p1), s.screen(p2)], "rgba(174,236,255,.75)", 1);
          if (s.opts.active) {
            const pts = rounded(y, cz, rw + 0.19, rh + 0.17, rh * 0.48 + 0.09).map(([py, pz]) =>
              s.screen([end, py, pz]),
            );
            shape(c, pts);
            c.strokeStyle = "rgba(232,250,224," + (0.22 + 0.17 * Math.sin(s.opts.time * 2)) + ")";
            c.lineWidth = 1.3;
            c.stroke();
          }
        }
      }
    });
  }
  function sourceDrain(s, x1, x2, y, z, width, height, terminal = "") {
    const yz = [
      [y + width * 0.36, z + height],
      [y - width * 0.34, z + height],
      [y - width * 0.5, z + height * 0.81],
      [y - width * 0.46, z + height * 0.18],
      [y - width * 0.28, z],
      [y + width * 0.27, z],
      [y + width * 0.49, z + height * 0.17],
      [y + width * 0.5, z + height * 0.79],
    ];
    s.profile(6, x1, x2, yz, "contact");
    const thinX = (x2 - x1) * 0.13;
    const top = z + height + 0.065;
    s.box(6.2, x1 + thinX, y - width * 0.27, z + height - 0.005, x2 - thinX, y + width * 0.27, top, "gate");
    if (terminal && s.opts.labels) {
      const p = [(x1 + x2) * 0.5, y - 0.095, top + 0.002];
      s.add(7.05, p, [], () => {
        const c = s.ctx,
          [u, v] = s.screen(p);
        c.save();
        c.font = "bold " + clamp(s.s * 0.16, 7, 13) + "px ui-monospace,monospace";
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillStyle = "#223648";
        c.fillText(terminal, u, v);
        c.restore();
      });
    }
  }
  function ribbon(s, x1, x2, y, z, rw, rh, phase) {
    s.profile(phase, x1, x2, rounded(y, z, rw, rh, rh * 0.46), "channel", null, false);
  }
  function overview(s) {
    const e = s.opts.explode * 0.65;
    backRails(s, e);
    skin(s, 4, -3.05, -1.39, -0.18, 3.05, 1.38, 0.075);
    s.box(4.2, -2.95, -1.31, 0.075, 2.95, 1.29, 0.145, "oxide");
    s.box(4.3, -2.91, -1.28, 0.145, 2.91, 1.26, 0.185, "silicon");
    const centers = [0.51, 0.87, 1.23, 1.59];
    const x1 = -0.52,
      x2 = 0.18,
      rw = 1.12,
      rh = 0.168;
    for (const z of centers) {
      ribbon(s, -1.91, x1, 0, z, rw, rh, 6);
      ribbon(s, x2, 1.91, 0, z, rw, rh, 6);
    }
    sideOfGate(s, x1, x2, 0, 1.03, 1.69, 1.83, centers, rw, rh);
    sourceDrain(s, -2.49, -1.89, 0, 0.215, 1.43, 1.53, "S");
    sourceDrain(s, 1.89, 2.49, 0, 0.215, 1.43, 1.53, "D");
    s.box(7, -2.51, 0.02, 1.767, -2.3, 1.105, 1.85, "copper");
    s.box(7, -0.36, -1.13, 1.91, -0.04, -0.56, 2.016, "signal");
    if (s.opts.active) {
      for (let i = 0; i < 4; i++) {
        const z = centers[i] + 0.065;
        for (const [a, b] of [
          [-1.88, x1],
          [x2, 1.88],
        ]) {
          const path = [
            [a, 0.36, z],
            [b, 0.36, z],
          ];
          const inFront = (a + b) * s.view[0] >= 0;
          s.track(path, inFront ? 6.11 : 5.99, i * 0.23, "#c9f7ff");
        }
      }
    }
    s.label([-0.13, 0.17, 1.94], "共用栅极", "left", 0.21, "#ccdbe6");
    s.label([1.04, 0.5, 1.61], "硅纳米带 ×4", "right", 0.3, "#66d8ff");
    s.label([-0.94, 1.26, -0.49 - e], "背面电源轨", "left", 0.8, "#f2bd71");
  }
  function gateSection(s) {
    const e = s.opts.explode * 0.45,
      y = 0,
      centers = [0.56, 1.06, 1.56, 2.06].map((z, i) => z + (i - 1.5) * e * 0.6),
      rw = 2.04,
      rh = 0.226;
    const start = -0.86,
      end = 0.36;
    for (const z of centers) ribbon(s, -2.26 - e, start, y, z, rw, rh, 5);
    sideOfGate(s, start, end, y, 1.31, 2.92, 2.61 + e * 1.8, centers, rw, rh);
    s.label([-0.36, 0.67, 2.615 + e * 0.9], "共用金属栅", "left", 0.22, "#ccdbe6");
    const cap = s.view[0] >= 0 ? end : start;
    s.label([cap, -0.73, centers[3] + rh / 2 + 0.035], "栅介质", "right", 0.28, "#d1efde");
    s.label([cap, 0.44, centers[0]], "硅纳米带 ×4", "right", 0.78, "#66d8ff");
  }
  function powerSection(s) {
    const e = 0.3 + s.opts.explode * 0.9;
    backRails(s, e, true);
    skin(s, 4, -2.76, -1.65, -0.2, 2.76, 1.65, 0.01);
    s.box(4.2, -2.72, -1.62, 0.01, 2.72, 1.62, 0.08, "oxide");
    const ys = [-0.98, 0.98];
    for (const y of ys) {
      const centers = [0.22, 0.38, 0.54, 0.7],
        gx1 = -0.25,
        gx2 = 0.2,
        rw = 0.59,
        rh = 0.08;
      for (const z of centers) {
        ribbon(s, -1.27, gx1, y, z, rw, rh, 6);
        ribbon(s, gx2, 1.27, y, z, rw, rh, 6);
      }
      sideOfGate(s, gx1, gx2, y, 0.48, 0.9, 0.79, centers, rw, rh);
      sourceDrain(s, -1.7, -1.26, y, 0.09, 0.82, 0.83);
      sourceDrain(s, 1.26, 1.7, y, 0.09, 0.82, 0.83);
    }
    s.box(7, -0.13, -1.03, 0.88, 0.09, 1.5, 1.0, "signal");
    s.label([-2.21, 0.98, 1.065], "局部供电接点", "left", 0.25, "#f1c391");
    s.label([2.45, -0.98, -0.26 - e * 0.33], "纳米硅通孔", "right", 0.52, "#f4c073");
    s.label([-1.35, 1.27, -0.49 - e], "VSS 回流轨", "left", 0.8, "#e5a16d");
    s.label([1.22, -1.26, -0.49 - e], "VDD 供电轨", "right", 0.84, "#f5ca82");
  }
  window.render18A = function render18A(canvas, state = {}) {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width,
      h = rect.height;
    if (w < 2 || h < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cw = Math.round(w * dpr),
      ch = Math.round(h * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    const c = canvas.getContext("2d");
    if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.lineJoin = "round";
    c.lineCap = "round";
    const opts = { scene: 0, angle: 0, explode: 0, time: 0, active: true, labels: true, ...state };
    const scene = new Scene(c, w, h, opts);
    (opts.scene === 1 ? gateSection : opts.scene === 2 ? powerSection : overview)(scene);
    scene.paint();
  };
})();
