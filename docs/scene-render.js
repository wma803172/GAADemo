/* Local, scroll-scrubbed cutaway. Coordinates follow the unflipped wafer:
   x = source-to-drain, y = frontside, z = width of each silicon sheet. */
(() => {
  "use strict";
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const mix = (a, b, t) => a + (b - a) * t;
  function ease(a, b, x) {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  }
  const interval = (a, b, c, d, x) => ease(a, b, x) * (1 - ease(c, d, x));
  const PI = Math.PI;
  const color = {
    channel: [0.99, 0.44, 0.105],
    channelOff: [0.71, 0.32, 0.115],
    channelFlow: [1.0, 0.97, 0.72],
    alloy: [0.64, 0.71, 0.76],
    terminal: [0.38, 0.44, 0.5],
    liner: [0.62, 0.96, 0.93],
    substrate: [0.105, 0.135, 0.18],
    oxide: [0.17, 0.22, 0.263],
    dielectric: [0.29, 0.37, 0.42],
    siliconGe: [0.51, 0.41, 0.64],
    supply: [1.0, 0.57, 0.21],
    ground: [0.36, 0.47, 1.0],
    signal: [0.13, 0.81, 0.76],
    carrier: [0.29, 0.34, 0.43],
    goldLight: [1, 0.8, 0.43],
    blueLight: [0.6, 0.8, 1],
  };
  const stride = 12;
  const objects = new Float32Array(550 * stride);
  let count = 0;
  function part(x, y, z, w, h, d, rgb, radius = 0.03, emission = 0, metal = 0.82) {
    if (Math.min(w, h, d) < 0.0006) return;
    const i = count++ * stride;
    objects[i] = x;
    objects[i + 1] = y;
    objects[i + 2] = z;
    objects[i + 3] = w / 2;
    objects[i + 4] = h / 2;
    objects[i + 5] = d / 2;
    objects[i + 6] = rgb[0];
    objects[i + 7] = rgb[1];
    objects[i + 8] = rgb[2];
    objects[i + 9] = Math.min(radius, w * 0.475, h * 0.475, d * 0.475);
    objects[i + 10] = emission;
    objects[i + 11] = metal;
  }
  const ribbonY = [0.49, 0.91, 1.33, 1.75];
  const cameraStops = [
    // progress, yaw, pitch, frame width, frame height, centre y, centre x
    [0, 0.57, 0.36, 8.9, 5.9, 0.74, 0],
    [0.65, 0.48, 0.28, 6.8, 4.65, 1.01, 0],
    [1, 0.43, 0.245, 6.02, 3.98, 1.1, 0],
    [1.35, 0.56, 0.22, 5.6, 3.72, 1.12, 0],
    [1.92, 1.47, 0.072, 3.72, 3.12, 1.14, 0],
    [2.28, 1.52, 0.05, 3.45, 2.91, 1.14, 0],
    [2.74, 0.55, 0.24, 5.25, 3.47, 1.1, 0],
    [3.04, 0.4, 0.23, 4.5, 3.15, 1.07, 0],
    [3.32, 0.5, 0.24, 5.1, 3.6, 1.1, 0],
    [3.6, 0.48, 0.33, 7.55, 5.66, 0.76, 0],
    [3.96, 0.4, 0.32, 8.5, 6.1, 0.42, 0],
    [4.38, 0.47, 0.35, 8.52, 6.48, 0.47, 0],
    [4.77, 0.55, 0.31, 8.25, 5.75, 0.42, 0],
    [5.16, 0.57, 0.31, 8.9, 6.7, -0.17, 0],
    [5.48, 0.61, 0.33, 8.74, 6.92, -0.22, 0],
    [5.84, 0.51, 0.2, 5.2, 4.02, 0.06, -1.5],
    [6.1, 0.48, 0.18, 3.92, 3.39, 0.24, -1.89],
    [6.41, 0.45, 0.15, 3.82, 3.36, 0.25, -1.89],
    [7, 0.66, 0.34, 8.7, 5.7, 0.0, 0],
  ];
  function camera(p) {
    const i = cameraStops.findIndex((row) => row[0] >= p);
    const b = cameraStops[i < 0 ? cameraStops.length - 1 : i],
      a = cameraStops[Math.max(0, i - 1)];
    if (a === b) return a.slice(1);
    const t = ease(a[0], b[0], p);
    return a.slice(1).map((v, j) => mix(v, b[j + 1], t));
  }
  const cellEnds = [-2.22, 2.22];
  let gateOpen = true;
  // This schematic holds a source–drain bias fixed. Tracers show conduction
  // within the silicon; their speed and number do not represent measurements.
  function gateFocus(p) {
    return interval(0.72, 0.86, 2.35, 2.49, p);
  }
  function geometry(p, now) {
    count = 0;
    const focus = interval(0.18, 0.92, 3.23, 3.66, p);
    const section = interval(1.24, 1.9, 2.31, 2.71, p);
    const fab = interval(2.49, 2.64, 3.22, 3.36, p);
    const removeGe = ease(2.87, 3.1, p);
    const gate = 1 - interval(2.38, 2.49, 3.22, 3.36, p);
    const liner = 1 - interval(2.39, 2.51, 3.12, 3.22, p);
    const externals = 1 - focus;
    // Pull back from the process detail to show the neighbouring device before
    // local vias, frontside interconnects and the bonded carrier are formed.
    const second = ease(3.36, 3.49, p);
    const vddScale = mix(1, 0.52, second),
      vddOrigin = -1.39 * second;
    const vssScale = 0.52 * second,
      vssOrigin = 1.53;
    const za = 0.49 * second,
      zb = -0.59;
    const expand = interval(4.43, 5.11, 6.52, 7.15, p);
    const signalRise = 0.5 * expand;
    const signalBase = 0.12 + 2.3 * vddScale + signalRise;
    const overview = 1 - ease(0.12, 0.71, p);
    const frontWiring = overview + ease(3.6, 3.7, p);
    const carrier = ease(3.7, 3.8, p);
    const backside = overview + ease(4.36, 4.57, p);
    const interlevelVias = overview + ease(4.57, 4.69, p);
    const outsideRails = overview + ease(4.69, 4.91, p);
    const trace = ease(5.59, 6.02, p) * (1 - 0.71 * ease(6.53, 7, p));
    const pulse = 0.5 + 0.5 * Math.sin(now * 1.7);
    const gateLight = interval(1.52, 1.88, 2.25, 2.51, p);
    const switching = gateFocus(p);
    const channelTint = color.channel.map((v, i) => mix(v, color.channelOff[i], gateOpen ? 0 : switching));
    const device = (origin, scale, zOrigin, network, right, appear, first) => {
      if (scale < 0.001) return;
      const box = (x, y, z, w, h, d, col, r = 0.035, e = 0, m = 0.84) =>
        part(
          origin + x * scale,
          0.12 + y * scale,
          zOrigin + z * scale,
          w * scale,
          h * scale,
          d * scale,
          col,
          r * scale,
          e,
          m,
        );
      // A section through the gate removes the near terminal and terminates
      // the ribbons at the slice plane so the insulator and metal stay visible.
      // The long exposed bridges are a longitudinal cutaway. In the process
      // close-up the S/D recess removes the stack outside the gate/spacers.
      // S/D epitaxy then abuts the remaining Si ends before channel release.
      const recess = first ? interval(2.69, 2.78, 3.32, 3.47, p) : 0;
      const sheetEnd = mix(2.07, 0.6, recess);
      const cut = mix(sheetEnd, 0.445, first ? section : 0);
      const start = mix(-sheetEnd, -0.56, first ? section : 0);
      const extraWidth = first ? 0.69 * interval(2.43, 2.6, 2.64, 2.72, p) : 0;
      for (const y of ribbonY) {
        box(
          (cut + start) * 0.5,
          y,
          0,
          cut - start,
          0.146,
          1.2 + extraWidth,
          channelTint,
          0.066,
          0.06 + 0.16 * gateLight,
          0.6,
        );
        if (liner > 0.002) {
          // Coat the sheet in place when the released trench is clear.
          box(
            0,
            y,
            0,
            0.853,
            0.146 + 0.075 * liner,
            1.2 + 0.095 * liner,
            color.liner,
            0.078,
            0.06 + 0.18 * gateLight,
            0.39,
          );
        }
        if (first && gateOpen && switching > 0) {
          // Run the side markers along each exposed sheet. The common gate
          // hides the middle of the path rather than allowing tracers across it.
          const side = switching * (1 - section);
          if (side > 0.025) {
            for (let k = 0; k < 4; k++) {
              const phase = (0.085 + now * 0.29 + k / 4) % 1;
              const x = mix(start + 0.1, cut - 0.1, phase);
              const edgeFade = ease(0.475, 0.61, Math.abs(x)) * side;
              box(
                x,
                y,
                0.607,
                0.19 * edgeFade,
                0.082 * edgeFade,
                0.048 * edgeFade,
                color.channelFlow,
                0.024,
                1,
                0.2,
              );
            }
          }
          // Looking end-on, carriers would travel into/out of the screen.
          // Mark each exposed cut face without inventing sideways flow.
          const face = section * switching;
          if (face > 0.05) {
            const glow = face * (0.92 + 0.08 * Math.cos(now * 4));
            box(
              cut + 0.009,
              y,
              -0.04,
              0.033 * face,
              0.081 * glow,
              0.23 * glow,
              color.channelFlow,
              0.015,
              1.1,
              0.2,
            );
          }
        }
      }
      // Continuous metal at both edges and in all three inter-sheet gaps,
      // plus the outermost top and bottom. The dielectric surrounds each sheet.
      const gh = 0.225;
      for (const y of [0.293, 0.7, 1.12, 1.54, 1.947]) {
        box(0, y, 0, 0.801, gh * gate, 1.615, color.alloy, 0.037, 0, 0.91);
      }
      for (const side of [-1, 1]) {
        box(0, 1.12, side * 0.721, 0.804, 1.855, 0.172 * gate, color.alloy, 0.035, 0, 0.91);
        // Fill the four rounded corners of each coated sheet. Flat webs alone
        // would leave a triangular void between the curved oxide and the metal.
        for (const y of ribbonY)
          for (const vertical of [-1, 1]) {
            box(
              0,
              y + vertical * 0.092,
              side * 0.637,
              0.801,
              0.048 * gate,
              0.074 * gate,
              color.alloy,
              0.009,
              0,
              0.91,
            );
          }
      }
      if (first && section > 0.005 && gate > 0.005) {
        // A polished cut has one continuous metal face around all four holes.
        // Cover the modelling seams between the common metal walls and webs.
        for (const y of [0.293, 0.7, 1.12, 1.54, 1.947])
          box(0.403, y, 0, 0.012, 0.222 * section, 1.594, color.alloy, 0.001, 0, 0.91);
        for (const z of [-0.721, 0.721])
          box(0.403, 1.12, z, 0.012, 1.855, 0.166 * section, color.alloy, 0.001, 0, 0.91);
      }
      if (first && fab > 0.001) {
        const pocket = ease(2.76, 2.8, p);
        const innerEdge = 0.416;
        const geHalf = mix(sheetEnd, innerEdge, pocket);
        // Outside the gate the stack has already been recessed and bounded by
        // inner spacers. Only the material remaining inside this window is
        // selectively etched from its accessible sidewalls.
        for (const y of [0.28, 0.7, 1.12, 1.54]) {
          box(
            0,
            y,
            0,
            2 * geHalf,
            0.274 * fab,
            (1.2 + extraWidth) * fab * (1 - removeGe),
            color.siliconGe,
            0.018,
            0,
            0.48,
          );
        }
        // Wafer below the as-grown stack supports its basal sacrificial layer.
        // Once recessed and anchored the cutaway omits this lower support.
        const pedestal = interval(2.48, 2.64, 2.85, 2.94, p);
        box(0, 0.03, 0, 4.35 * pedestal, 0.226 * pedestal, 1.38 + extraWidth, color.substrate, 0.035);
      }
      // These insulating plugs remain between gate and S/D in the finished
      // device. The end-on cut removes the pieces in front of the slice.
      const spacer = first ? (1 - interval(2.42, 2.64, 2.8, 2.84, p)) * (1 - section) : 1;
      for (const side of [-1, 1]) {
        for (const y of [0.28, 0.7, 1.12, 1.54]) {
          box(
            side * 0.506,
            y,
            0,
            0.18 * spacer,
            0.272 * spacer,
            1.2 * spacer,
            color.dielectric,
            0.017,
            0,
            0.38,
          );
        }
      }
      const anchored = first ? 1 - interval(2.46, 2.64, 2.83, 2.87, p) : 1;
      const ends = (1 - 0.9999 * section) * appear * anchored;
      const contact = (first ? 1 - interval(2.43, 2.63, 3.36, 3.49, p) : ease(3.36, 3.49, p)) * ends;
      for (const end of cellEnds) {
        const inner = mix(1.98, 0.585, recess),
          outer = 2.46;
        box(
          (Math.sign(end) * (inner + outer)) / 2,
          1.12,
          0,
          (outer - inner) * ends,
          1.89 * ends,
          1.49 * ends,
          color.terminal,
          0.1,
          0,
          0.82,
        );
        box(end, 2.07, 0, 0.41 * contact, 0.09 * contact, 0.83 * contact, color.alloy, 0.023);
      }
      const gx = origin,
        gz = zOrigin;
      const gateY = 0.12 + 2.024 * scale;
      const localTop = 0.12 + 2.26 * scale;
      const enabled = frontWiring * appear;
      if (enabled > 0.001) {
        const y1 = 0.12 + 2.32 * scale + signalRise;
        part(
          gx,
          (y1 + gateY) / 2,
          gz,
          0.15 * scale * enabled,
          y1 - gateY,
          0.22 * scale * enabled,
          color.alloy,
          0.033,
        );
        part(
          gx,
          y1,
          gz - 0.45 * scale,
          0.23 * scale * enabled,
          0.1 * scale * enabled,
          0.9 * scale,
          color.signal,
          0.025,
          0.19,
        );
        part(
          gx + 0.42 * scale,
          y1,
          gz - 0.89 * scale,
          0.99 * scale,
          0.1 * scale * enabled,
          0.2 * scale * enabled,
          color.signal,
          0.021,
          0.18,
        );
      }
      const sx = origin + (right ? 2.22 : -2.22) * scale,
        vz = zOrigin - 0.95 * scale;
      const via = (overview + ease(3.49, 3.6, p)) * appear;
      const localContact = (overview + ease(3.42, 3.49, p)) * appear;
      if (localContact > 0.0005) {
        // The nTSV meets the source/drain *contact* from the side.
        // Its device-side portion exists before bonding and backside reveal.
        const bottom = mix(localTop, -0.22, via);
        part(
          sx,
          (localTop + bottom) / 2,
          vz,
          0.17 * scale * via,
          localTop - bottom,
          0.17 * scale * via,
          network,
          0.08 * scale,
          0.045 + trace * 0.32,
        );
        part(
          sx,
          localTop,
          zOrigin - 0.46 * scale,
          0.33 * scale * localContact,
          0.105 * scale * localContact,
          0.99 * scale * localContact,
          network,
          0.035 * scale,
          0.12 + trace * 0.32,
        );
        const h = localTop - (0.12 + 2.085 * scale);
        part(
          sx,
          localTop - h * 0.5,
          zOrigin,
          0.29 * scale * localContact,
          h * localContact,
          0.43 * scale,
          network,
          0.04 * scale,
          0.08,
        );
        part(sx, bottom + 0.02, vz, 0.27 * scale * via, 0.07 * via, 0.25 * scale * via, network, 0.027);
      }
      return { x: sx, z: vz, endZ: zOrigin, top: localTop };
    };
    const va = device(vddOrigin, vddScale, za, color.supply, false, 1, true);
    const vb = device(vssOrigin, vssScale, zb, color.ground, true, second, false);

    // The original substrate thins from the backside, stopping just before
    // the preformed via ends. The bonded frontside support remains present.
    const original = interval(3.32, 3.52, 4.1, 4.36, p);
    const baseH = (0.18 + 1.28 * original) * externals;
    const cutaway = ease(4.54, 5.01, p) * (1 - 0.47 * ease(6.61, 7, p));
    const baseZ = 1.18 * cutaway;
    part(
      0,
      0.05 - baseH / 2,
      baseZ,
      6.49 * externals,
      baseH,
      (3.64 - baseZ * 2) * externals,
      color.substrate,
      0.065,
      0,
      0.55,
    );
    part(
      0,
      0.063,
      baseZ,
      6.48 * externals,
      0.042 * externals,
      (3.63 - baseZ * 2) * externals,
      color.oxide,
      0.019,
    );
    if (externals > 0.01) {
      for (let k = 0; k < 33; k++) {
        if (k % 6 === 3) continue;
        const x = -3.02 + k * 0.185;
        part(
          x,
          -0.026,
          1.823 * externals,
          0.067 * externals,
          0.035 * externals,
          0.012,
          color.dielectric,
          0.003,
        );
      }
    }
    const capY = signalBase + 0.32;
    const carrierH = 0.2 * carrier;
    part(0, capY + carrierH / 2, 0, 6.48 * carrier, carrierH, 3.65 * carrier, color.carrier, 0.045, 0, 0.83);
    part(
      0,
      capY - 0.019,
      0,
      6.4 * carrier,
      0.041 * carrier,
      3.58 * carrier,
      color.dielectric,
      0.012,
      0,
      0.55,
    );
    // Pattern the frontside signal plane. Isolated traces remain separated.
    const fine = frontWiring;
    for (let row = 0; row < 8; row++) {
      const z = (row < 4 ? -1 : 1) * (1.05 + (row % 4) * 0.18);
      const stagger = (row % 2) * 0.3;
      for (let n = 0; n < 3; n++) {
        const x = -2.47 + n * 2.06 + stagger;
        const h = 0.048 * fine;
        part(
          x,
          signalBase + 0.07,
          z,
          1.38 * fine,
          h,
          0.068 * fine,
          row % 3 === 1 ? color.signal : color.terminal,
          0.018,
          0.1,
        );
        part(
          x + 0.66 * fine,
          signalBase + 0.07,
          z + 0.055,
          0.065 * fine,
          h,
          0.15 * fine,
          color.terminal,
          0.013,
        );
      }
    }
    let anchors = [];
    if (p >= 1.72 && p <= 2.36) {
      const cut = mix(2.07, 0.445, section);
      anchors = [
        ["共用金属栅", [0.404, 1.66, 0.735]],
        ["硅带沟道", [cut, 1.03, -0.34]],
      ];
    } else if (p >= 2.845 && p < 3.09) {
      anchors = [["内间隔层", [0.506, 1.24, 0.59]]];
      if (p < 3.045) anchors.push(["硅锗夹层", [0, 0.82, 0.6 * (1 - removeGe)]]);
    } else if (p >= 3.82 && p < 4.37) {
      anchors = [
        ["支撑晶圆", [2.5, capY + carrierH, -1.2]],
        p < 4.33 ? ["原硅衬底", [-2.15, 0.05 - baseH, -1.2]] : ["露出的孔端", [va.x, -0.22, va.z]],
      ];
    }
    if (backside > 0.0005) {
      const upper = -0.31 - 0.72 * expand,
        lower = upper - 0.23 - 0.63 * expand;
      const upperH = 0.134 * backside,
        lowerH = 0.157 * outsideRails;
      const railZ = [-1.47, -0.49, 0.49, 1.47];
      const inactive = (rgb, level) => rgb.map((ch, i) => mix(ch, [0.23, 0.27, 0.31][i], trace * level));
      const groundTint = inactive(color.ground, 0.8);
      for (let j = 0; j < 4; j++) {
        const c = j === 0 ? color.supply : j === 2 ? inactive(color.supply, 0.87) : groundTint;
        const z = railZ[j];
        part(
          0,
          lower,
          z,
          6.6 * outsideRails,
          lowerH,
          0.4 * outsideRails,
          c,
          0.043,
          0.04 + (j === 0 ? trace * 0.23 : 0),
        );
        for (const side of [-1, 1])
          part(
            0,
            lower - lowerH * 0.5,
            z + side * 0.138 * outsideRails,
            6.43 * outsideRails,
            0.009 * outsideRails,
            0.016 * outsideRails,
            c,
            0.004,
            0.12,
          );
        for (const k of [-1, 1]) {
          const ex = k * 2.56 + (j % 2) * 0.15;
          part(
            ex,
            lower - 0.115,
            z,
            0.31 * outsideRails,
            0.115 * outsideRails,
            0.29 * outsideRails,
            c,
            0.04,
            0.03,
          );
        }
      }
      const rails = [
        [va.x, 0],
        [-1.19, 1],
        [-0.38, 0],
        [0.48, 1],
        [1.22, 0],
        [vb ? vb.x : 2.61, 1],
      ];
      for (const [x, pol] of rails) {
        const c = pol ? groundTint : x === va.x ? color.supply : inactive(color.supply, 0.87);
        part(
          x,
          upper,
          0,
          0.25 * backside,
          upperH,
          3.62 * backside,
          c,
          0.037,
          0.04 + (!pol ? trace * 0.07 : 0),
        );
        for (let j = pol; j < 4; j += 2) {
          const span = upper - lower;
          part(
            x,
            upper - (span * interlevelVias) / 2,
            railZ[j],
            0.15 * interlevelVias,
            span * interlevelVias,
            0.15 * interlevelVias,
            c,
            0.05,
            0.05,
          );
        }
      }
      for (const [via, c] of [
        [va, color.supply],
        [vb, groundTint],
      ]) {
        if (!via) continue;
        const h = -0.22 - upper;
        part(via.x, upper + h / 2, via.z, 0.14 * backside, h, 0.14 * backside, c, 0.067, 0.1 + trace * 0.32);
        part(via.x, upper + 0.035, via.z, 0.3 * backside, 0.115 * backside, 0.3 * backside, c, 0.03, 0.1);
      }
      if (p >= 4.8 && p <= 5.65) {
        anchors = [
          ["背面电网", [-2.66, lower, railZ[0]]],
          ["正面信号", [vddOrigin + 0.35 * vddScale, signalBase, za - 0.89 * vddScale]],
        ];
      } else if (p >= 5.72 && p <= 6.53) {
        anchors = [
          ["供电通孔", [va.x, 0.34, va.z]],
          ["本地接点", [va.x, va.top, va.endZ - 0.11]],
        ];
      }
      // Bright markers explicitly follow a continuous, single-polarity route
      // across two backside layers, up the side via, onto the device contact.
      if (trace > 0.005) {
        const route = [
          [-3.29, lower, railZ[0]],
          [va.x, lower, railZ[0]],
          [va.x, upper, railZ[0]],
          [va.x, upper, va.z],
          [va.x, va.top, va.z],
          [va.x, va.top, va.endZ],
        ];
        const lengths = route.slice(1).map((b, i) => Math.hypot(...b.map((v, j) => v - route[i][j])));
        const total = lengths.reduce((a, b) => a + b, 0);
        let reveal = total * ease(5.59, 6.09, p);
        const offsets = [
          [0, -0.083, 0],
          [0.078, 0, 0],
          [0, -0.072, 0],
          [0.043, 0, 0],
          [0, 0.028, 0],
        ];
        for (let k = 0; k < lengths.length && reveal > 0.001; k++) {
          const a = route[k],
            b = route[k + 1],
            f = Math.min(1, reveal / lengths[k]),
            off = offsets[k];
          const head = a.map((v, j) => mix(v, b[j], f)),
            mid = a.map((v, j) => (v + head[j]) * 0.5 + off[j]);
          const dimensions = a.map((v, j) => Math.abs(v - head[j]) + 0.038);
          part(...mid, ...dimensions, color.goldLight, 0.016, 0.69, 0.5);
          reveal -= lengths[k];
        }
        for (let n = 0; n < 3; n++) {
          let t = ((now * 0.18 + n / 3 + p * 0.12) % 1) * total,
            k = 0;
          while (k < lengths.length - 1 && t > lengths[k]) t -= lengths[k++];
          const a = route[k],
            b = route[k + 1],
            f = t / lengths[k];
          const xyz = a.map((v, j) => mix(v, b[j], f));
          part(
            ...xyz,
            0.235 * trace,
            0.227 * trace,
            0.235 * trace,
            color.goldLight,
            0.105,
            1.2 + 0.2 * pulse,
            0.28,
          );
        }
      }
    }
    return { roll: PI * ease(3.8, 4.1, p), cam: camera(p), anchors };
  }

  function bevelMesh() {
    const vertices = [];
    const grid = [
      [-1, -1],
      [-1, -0.42],
      [-1, 0],
      [1, 0],
      [1, 0.42],
      [1, 1],
    ];
    for (let axis = 0; axis < 3; axis++) {
      const u = (axis + 1) % 3,
        v = (axis + 2) % 3;
      for (const sign of [-1, 1]) {
        function vertex(i, j) {
          const n = [0, 0, 0],
            a = [0, 0, 0];
          a[axis] = sign;
          n[axis] = sign;
          a[u] = grid[i][0];
          n[u] = grid[i][1];
          a[v] = grid[j][0];
          n[v] = grid[j][1];
          const l = Math.hypot(...n);
          vertices.push(...a, ...n.map((k) => k / l));
        }
        for (let j = 0; j < grid.length - 1; j++)
          for (let i = 0; i < grid.length - 1; i++) {
            const vs = [
              [i, j],
              [i + 1, j],
              [i + 1, j + 1],
              [i, j],
              [i + 1, j + 1],
              [i, j + 1],
            ];
            if (sign < 0) vs.reverse();
            for (const q of vs) vertex(...q);
          }
      }
    }
    return new Float32Array(vertices);
  }
  const vertexSource = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 anchor;
    layout(location=1) in vec3 curveNormal;
    layout(location=2) in vec3 centre;
    layout(location=3) in vec3 halfSize;
    layout(location=4) in vec3 tint;
    layout(location=5) in vec3 surface;
    uniform vec3 eyeDir, rightDir, upDir, centreOfFrame;
    uniform vec2 scale, roll;
    out vec3 nrm;
    out vec3 position;
    flat out vec3 material;
    flat out vec3 finish;
    vec3 rotateObject(vec3 p) {
      return vec3(p.x,p.y*roll.x-p.z*roll.y,p.y*roll.y+p.z*roll.x);
    }
    void main() {
      vec3 p=centre + anchor*(halfSize-vec3(surface.x)) + curveNormal*surface.x;
      position=rotateObject(p-centreOfFrame);
      nrm=rotateObject(curveNormal);
      material=tint; finish=surface;
      gl_Position=vec4(dot(position,rightDir)*scale.x,dot(position,upDir)*scale.y,
                       -dot(position,eyeDir)*.045,1.);
    }`;
  const fragmentSource = `#version 300 es
    precision highp float;
    in vec3 nrm,position;
    flat in vec3 material,finish;
    uniform vec3 eyeDir;
    out vec4 target;
    float strip(vec3 reflection,vec3 direction,vec3 up,float w,float h,float softness) {
      vec3 forward=normalize(direction),side=normalize(cross(forward,up));
      vec3 top=cross(side,forward);
      float front=dot(reflection,forward);
      vec2 xy=abs(vec2(dot(reflection,side),dot(reflection,top)))/max(.02,front);
      return (1.-smoothstep(w,w+softness,xy.x))*(1.-smoothstep(h,h+softness,xy.y))*smoothstep(.0,.2,front);
    }
    void main() {
      vec3 n=normalize(nrm);
      vec3 v=normalize(eyeDir-position*.033);
      vec3 r=reflect(-v,n);
      float facing=clamp(dot(n,v),0.,1.);
      float metal=finish.z;
      float sky=clamp(n.y*.5+.5,0.,1.);
      float ld=dot(n,normalize(vec3(-.50,.82,.62)));
      float rim=pow(1.-facing,3.6);
      float amberSoft=strip(r,vec3(-2.95,3.95,5.75)-position*.81,vec3(0,1,0),.82,.48,.40);
      float topSoft=strip(r,vec3(.91,4.91,-2.45)-position*.64,vec3(0,1,0),.65,.31,.27);
      float blueSoft=strip(r,vec3(4.66,1.14,-.97)-position*.76,vec3(0,1,0),.23,.92,.25);
      float sideSoft=strip(r,vec3(-4.83,-.35,.72)-position*.51,vec3(0,1,0),.36,.23,.13);
      vec3 studio = amberSoft*vec3(1.10,.99,.86) + topSoft*vec3(1.05,1.10,1.18)
                  + blueSoft*vec3(.67,.81,1.06) + sideSoft*vec3(.80,.75,.71);
      vec3 diffuse = material*(.24+.32*sky+.33*max(ld,0.)+.13*max(0.,dot(n,vec3(.7,-.1,.7))));
      vec3 reflected=mix(vec3(1.),sqrt(material),metal*.94);
      float brushedCoord=dot(position,vec3(63.,.72,52.));
      float brush=sin(brushedCoord)*(.5+.5*cos(brushedCoord*.339))*exp(-fwidth(brushedCoord)*.75);
      float sweep=exp(-pow((dot(position,vec3(.35,.25,.68))+.68)*1.00,2.));
      vec3 rgb=diffuse*(1.+brush*.035)+(reflected*(studio*.69+rim*.145))*(.77+.23*sweep)+material*finish.y*.60;
      rgb=rgb/(vec3(.80)+rgb*.32);
      target=vec4(rgb,1.);
    }`;

  function gpuRenderer(canvas, gl) {
    const makeShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const program = gl.createProgram();
    const vert = makeShader(gl.VERTEX_SHADER, vertexSource),
      frag = makeShader(gl.FRAGMENT_SHADER, fragmentSource);
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const uniforms = {};
    for (const name of ["eyeDir", "rightDir", "upDir", "centreOfFrame", "scale", "roll"])
      uniforms[name] = gl.getUniformLocation(program, name);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const mesh = bevelMesh();
    const shape = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shape);
    gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
    for (let i = 0; i < 2; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 24, i * 12);
    }
    const data = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, data);
    gl.bufferData(gl.ARRAY_BUFFER, objects.byteLength, gl.DYNAMIC_DRAW);
    for (let i = 0; i < 4; i++) {
      gl.enableVertexAttribArray(2 + i);
      gl.vertexAttribPointer(2 + i, 3, gl.FLOAT, false, stride * 4, i * 12);
      gl.vertexAttribDivisor(2 + i, 1);
    }
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);
    return function (frame) {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(program);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, data);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, objects, 0, count * stride);
      gl.uniform3fv(uniforms.eyeDir, frame.eye);
      gl.uniform3fv(uniforms.rightDir, frame.right);
      gl.uniform3fv(uniforms.upDir, frame.up);
      gl.uniform3fv(uniforms.centreOfFrame, frame.centre);
      gl.uniform2f(uniforms.roll, frame.cos, frame.sin);
      gl.uniform2f(uniforms.scale, (2 * frame.zoom) / canvas.width, (2 * frame.zoom) / canvas.height);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, mesh.length / 6, count);
    };
  }
  function painter(canvas, ctx) {
    const faces = [
      [0, 1, 3, 2],
      [4, 6, 7, 5],
      [0, 4, 5, 1],
      [2, 3, 7, 6],
      [0, 2, 6, 4],
      [1, 5, 7, 3],
    ];
    return function (frame) {
      const { eye, up, right, centre, cos, sin, zoom } = frame;
      const w = canvas.width,
        h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      function project(x, y, z) {
        x -= centre[0];
        y -= centre[1];
        const Y = y * cos - z * sin,
          Z = y * sin + z * cos;
        return [
          w * 0.5 + zoom * (x * right[0] + Z * right[2]),
          h * 0.5 - zoom * (x * up[0] + Y * up[1] + Z * up[2]),
          x * eye[0] + Y * eye[1] + Z * eye[2],
        ];
      }
      const surfaces = [];
      for (let n = 0; n < count; n++) {
        const i = n * stride;
        const x = objects[i],
          y = objects[i + 1],
          z = objects[i + 2],
          sx = objects[i + 3],
          sy = objects[i + 4],
          sz = objects[i + 5];
        const pts = [];
        for (let a = 0; a < 8; a++)
          pts.push(project(x + (a & 1 ? sx : -sx), y + (a & 2 ? sy : -sy), z + (a & 4 ? sz : -sz)));
        const shown = faces
          .map((ids, j) => [ids.reduce((v, n) => v + pts[n][2], 0) / 4, j])
          .sort((a, b) => a[0] - b[0])
          .slice(-3);
        for (const [depth, j] of shown)
          surfaces.push([depth, i, j, faces[j].map((idx) => pts[idx]), sx + sy + sz]);
      }
      surfaces.sort((a, b) => a[0] - b[0]);
      for (const [, i, j, points, extent] of surfaces) {
        const low = Math.min(...points.map((pt) => pt[1])),
          high = Math.max(...points.map((pt) => pt[1]));
        const gradient = ctx.createLinearGradient(0, low, 0, Math.max(high, low + 0.2));
        const intensity = [0.72, 0.96, 0.6, 1.04, 0.76, 0.84][j] + objects[i + 10] * 0.38;
        const asRGB = (f) =>
          "rgb(" + [6, 7, 8].map((k) => Math.min(255, Math.round(objects[i + k] * 255 * f))).join(",") + ")";
        gradient.addColorStop(0, asRGB(intensity * 1.24));
        gradient.addColorStop(0.44, asRGB(intensity));
        gradient.addColorStop(1, asRGB(intensity * 0.8));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let k = 1; k < 4; k++) ctx.lineTo(points[k][0], points[k][1]);
        ctx.closePath();
        ctx.fill();
        if (high - low > 4 && extent > 1) {
          ctx.lineWidth = 0.65;
          ctx.strokeStyle = "rgba(189,213,233,.24)";
          ctx.stroke();
        }
      }
    };
  }

  let surface,
    drawFrame,
    fallbackSurface,
    resizeObserver,
    progress = 0,
    lastStamp = 0,
    raf = 0,
    pins = [];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  function moving() {
    return (
      !document.hidden &&
      !reduce.matches &&
      ((gateOpen && gateFocus(progress) > 0) || (progress > 5.6 && progress < 6.84))
    );
  }
  function setGateOpen(active) {
    if (gateOpen === Boolean(active)) return;
    gateOpen = Boolean(active);
    if (gateFocus(progress) > 0 && !document.hidden) draw(progress);
  }
  function draw(value) {
    progress = clamp(Number(value) || 0, 0, 7);
    if (!surface || !drawFrame || document.hidden) return;
    const size = surface.getBoundingClientRect();
    if (size.width < 1 || size.height < 1) return;
    const ratio = Math.min(devicePixelRatio || 1, 1.65, 1450 / size.width);
    const w = Math.round(size.width * ratio),
      h = Math.round(size.height * ratio);
    if (surface.width !== w || surface.height !== h) {
      surface.width = w;
      surface.height = h;
    }
    const time = reduce.matches ? 0 : performance.now() / 1000;
    const { cam, roll, anchors } = geometry(progress, time);
    const [yaw, pitch, frameW, frameH, cy, cx] = cam;
    const ay = Math.cos(yaw),
      by = Math.sin(yaw),
      ap = Math.cos(pitch),
      bp = Math.sin(pitch);
    const cs = Math.cos(roll),
      sn = Math.sin(roll),
      zoom = Math.min(w / frameW, h / frameH);
    pins = anchors.map(([label, point]) => {
      const x = point[0] - cx,
        dy = point[1] - cy,
        z = point[2],
        Y = dy * cs - z * sn,
        Z = dy * sn + z * cs;
      return {
        label,
        x: 0.5 + ((x * ay - Z * by) * zoom) / w,
        y: 0.5 - ((-x * by * bp + Y * ap - Z * ay * bp) * zoom) / h,
      };
    });
    drawFrame({
      eye: [by * ap, bp, ay * ap],
      right: [ay, 0, -by],
      up: [-by * bp, ap, -ay * bp],
      centre: [cx, cy, 0],
      cos: cs,
      sin: sn,
      zoom,
    });
    lastStamp = performance.now();
    if (moving() && !raf) raf = requestAnimationFrame(idle);
  }
  function idle(t) {
    raf = 0;
    if (!surface || !moving()) return;
    const box = surface.getBoundingClientRect();
    if (box.bottom <= 0 || box.top >= innerHeight) return;
    if (t - lastStamp > 36) draw(progress);
    if (!raf) raf = requestAnimationFrame(idle);
  }
  function refreshMotion() {
    cancelAnimationFrame(raf);
    raf = 0;
    if (!document.hidden) draw(progress);
  }
  document.addEventListener("visibilitychange", refreshMotion);
  reduce.addEventListener("change", refreshMotion);
  function installFallback(canvas) {
    let ctx = canvas.getContext("2d");
    if (ctx) {
      surface = canvas;
      drawFrame = painter(canvas, ctx);
      return true;
    }
    // A canvas with a lost GL context cannot be rebound to Canvas2D.
    // Overlay a transparent replacement, keeping the caller's DOM node alive.
    fallbackSurface = document.createElement("canvas");
    fallbackSurface.setAttribute("aria-hidden", "true");
    fallbackSurface.style.cssText = "pointer-events:none;position:absolute;inset:0;width:100%;height:100%;";
    canvas.after(fallbackSurface);
    const syncOpacity = () => {
      fallbackSurface.style.opacity = getComputedStyle(canvas).opacity;
    };
    new MutationObserver(syncOpacity).observe(canvas, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    syncOpacity();
    ctx = fallbackSurface.getContext("2d");
    if (!ctx) return false;
    surface = fallbackSurface;
    drawFrame = painter(surface, ctx);
    return true;
  }
  function mount(canvas) {
    if (!canvas) return false;
    surface = canvas;
    resizeObserver?.disconnect();
    cancelAnimationFrame(raf);
    raf = 0;
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      depth: true,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    if (gl) {
      try {
        drawFrame = gpuRenderer(canvas, gl);
      } catch {
        if (!installFallback(canvas)) return false;
      }
      canvas.addEventListener(
        "webglcontextlost",
        (event) => {
          event.preventDefault();
          if (installFallback(canvas)) {
            resizeObserver.observe(surface);
            draw(progress);
          }
        },
        { once: true },
      );
    } else if (!installFallback(canvas)) return false;
    resizeObserver = new ResizeObserver(() => draw(progress));
    resizeObserver.observe(surface);
    draw(progress);
    return true;
  }
  window.AtlasScene = Object.freeze({ mount, draw, setGateOpen, getPins: () => pins });
})();
