function overlap(a, b, gap = 0) {
  const width = Math.min(a.right, b.right + gap) - Math.max(a.left, b.left - gap);
  const height = Math.min(a.bottom, b.bottom + gap) - Math.max(a.top, b.top - gap);
  return Math.max(0, width) * Math.max(0, height);
}

// Place the card independently of its dot. Four different parts of the planar
// device project very close together, especially when the viewer rotates it.
export function placeCard(pin, bounds, occupied, dots) {
  const { x, y, width, height } = pin;
  const nearSide = x > (bounds.left + bounds.right) / 2 ? -1 : 1;
  const offsets = [-0.85, 0.25, -1.85, 1.3, -2.95, 2.4];
  let best, lowest = Infinity;
  for (const side of [nearSide, -nearSide]) {
    for (const offset of offsets) {
      const left = Math.max(bounds.left, Math.min(bounds.right - width, side > 0 ? x + 30 : x - 30 - width));
      const top = Math.max(bounds.top, Math.min(bounds.bottom - height, y + offset * height));
      const rect = { left, top, right: left + width, bottom: top + height };
      const endX = side > 0 ? left : rect.right;
      const endY = Math.max(top + 8, Math.min(rect.bottom - 8, y));
      const dx = endX - x, dy = endY - y;
      const length = Math.hypot(dx, dy);
      let score = length + (side === nearSide ? 0 : 7) + Math.abs(offset + 0.85) * 4;
      if (pin.side === side && pin.offset === offset) score -= 6;
      for (const other of occupied) score += 30 * overlap(rect, other, 6);
      for (const dot of dots) score += 15 * overlap(rect, dot, 4);
      if (score < lowest) {
        lowest = score;
        best = { rect, dx, dy, length, offset, side };
      }
    }
  }
  return best;
}
