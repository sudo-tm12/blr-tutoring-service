// ===== Minimal inline-SVG bar chart (no chart library — CLAUDE.md §11) =====
// values  → --sky bars (e.g. collected)
// values2 → --rust overlay bars (e.g. outstanding), optional
// Labels must be short; the chart is a summary, the table is the detail.

export function barChart(container, { labels, values, values2 = null, format = v => String(v), height = 220 }) {
  container.innerHTML = '';
  const n = labels.length;
  if (!n) {
    container.innerHTML = '<p class="empty">No data yet</p>';
    return;
  }
  const max = Math.max(1, ...values.map(Number), ...(values2 || []).map(Number));
  const padL = 52, padR = 8, padT = 10, padB = 26;
  const width = Math.max(container.clientWidth || 640, 320);
  const chartH = height - padT - padB;
  const slot = (width - padL - padR) / n;
  const barW = Math.min(34, slot * (values2 ? 0.30 : 0.45));

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%');
  svg.style.display = 'block';
  svg.setAttribute('role', 'img');

  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  };

  // Gridlines + scale labels (4 steps)
  for (let i = 0; i <= 4; i++) {
    const val = (max / 4) * i;
    const y = padT + chartH - (chartH * i) / 4;
    svg.appendChild(el('line', { x1: padL, y1: y, x2: width - padR, y2: y, stroke: 'var(--line-2)', 'stroke-width': 1 }));
    const t = el('text', { x: padL - 8, y: y + 4, 'text-anchor': 'end', 'font-size': 10, fill: 'var(--ink-soft)' });
    t.textContent = i === 0 ? '0' : format(Math.round(val));
    svg.appendChild(t);
  }

  labels.forEach((label, i) => {
    const cx = padL + slot * i + slot / 2;
    const baseY = padT + chartH;

    if (values2) {
      const v2 = Number(values2[i]) || 0;
      const h2 = (v2 / max) * chartH;
      const r2 = el('rect', { x: cx + barW / 2, y: baseY - h2, width: barW, height: h2, rx: 4, fill: 'var(--rust)' });
      r2.appendChild(el('title', {}));
      r2.firstChild.textContent = `${label}: ${format(v2)} outstanding`;
      svg.appendChild(r2);
    }
    const v1 = Number(values[i]) || 0;
    const h1 = (v1 / max) * chartH;
    const r1 = el('rect', { x: cx - barW / 2 - (values2 ? barW / 2 : 0), y: baseY - h1, width: barW, height: h1, rx: 4, fill: 'var(--sky)' });
    r1.appendChild(el('title', {}));
    r1.firstChild.textContent = `${label}: ${format(v1)}`;
    svg.appendChild(r1);

    const t = el('text', { x: cx, y: baseY + 16, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--ink-3)' });
    t.textContent = label;
    svg.appendChild(t);
  });

  container.appendChild(svg);

  if (values2) {
    const legend = document.createElement('div');
    legend.className = 'chart-legend';
    legend.innerHTML =
      '<span><i class="sw sw-sky"></i>Collected</span>' +
      '<span><i class="sw sw-rust"></i>Outstanding</span>';
    container.appendChild(legend);
  }
}
