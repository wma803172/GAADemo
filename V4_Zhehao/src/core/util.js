/* ---------------------------------------------------------------------------
   util.js — 纯函数工具箱
   全站只有一条真理：progress p ∈ [0,1]。任何画面都是 p 的函数。
   这里不存任何状态。
   --------------------------------------------------------------------------- */

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : (v - a) / (b - a));
export const sat = (v) => clamp(v, 0, 1);

/** 0..1 之间的线性映射，超出即夹住 */
export const range = (p, a, b) => sat(invLerp(a, b, p));

/** 带 smoothstep 的 range：进出都软 */
export const srange = (p, a, b) => {
  const t = range(p, a, b);
  return t * t * (3 - 2 * t);
};

/** 梯形窗口：a→b 淡入，c→d 淡出 */
export const win = (p, a, b, c, d) => Math.min(srange(p, a, b), 1 - srange(p, c, d));

export const ease = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outBack: (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

/** 弹一下：先过冲再回落，用于"长出来"的结构 */
export const overshoot = (t, amount = 1.06) => {
  const s = ease.out(t);
  return s * (1 + Math.sin(s * Math.PI) * (amount - 1));
};

/** 稳定伪随机（同 seed 同结果，不会每帧乱跳） */
export function rand(seed) {
  let x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** 生成一维噪声（值噪声，用于轻微抖动 / 手绘感） */
export function noise1(x) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(rand(i), rand(i + 1), u);
}

/** 数字格式化：1234 -> 1,234 */
export const fmt = (n) => n.toLocaleString('en-US');

/** 把 0..1 映射到数组索引区间 */
export function segment(p, stops) {
  for (let i = 0; i < stops.length - 1; i++) {
    if (p <= stops[i + 1]) {
      const local = sat(invLerp(stops[i], stops[i + 1], p));
      return { i, local, global: p };
    }
  }
  return { i: stops.length - 2, local: 1, global: p };
}

/** 两点之间插值（向量数组通用） */
export function mixArr(a, b, t) {
  return a.map((v, i) => lerp(v, b[i], t));
}
