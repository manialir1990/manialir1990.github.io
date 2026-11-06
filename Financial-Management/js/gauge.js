/* ==========================================================================
   gauge.js — نمودار عقربه‌ای نسبت درآمد به بدهی (۰ قرمز … ۲ سبز)
   عقربه از پایین‌ترین مقدار شروع می‌کند و در مدت ۲ ثانیه روی مقدار ماه آینده می‌ایستد.
   ========================================================================== */

import { svgEl, prefersReducedMotion } from './dom.js';
import { CONFIG } from './config.js';
import { formatRatio, toFa } from './digits.js';

const CX = 160;
const CY = 160;
const R = 118;
const START = -90;   /* درجه: افقی چپ */
const END = 90;      /* درجه: افقی راست */

const SEGMENTS = [
  { from: 0, to: 0.5, color: 'var(--gauge-1)' },
  { from: 0.5, to: 1, color: 'var(--gauge-2)' },
  { from: 1, to: 1.5, color: 'var(--gauge-3)' },
  { from: 1.5, to: 2, color: 'var(--gauge-4)' },
];

function valueToAngle(v) {
  const t = (v - CONFIG.GAUGE_MIN) / (CONFIG.GAUGE_MAX - CONFIG.GAUGE_MIN);
  return START + t * (END - START);
}

function point(angleDeg, radius) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

function arcPath(a0, a1, radius) {
  const p0 = point(a0, radius);
  const p1 = point(a1, radius);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
}

const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createGauge(container) {
  const svg = svgEl('svg', {
    viewBox: '0 0 320 196',
    class: 'gauge__svg',
    role: 'img',
    'aria-label': 'نمودار عقربه‌ای نسبت درآمد به بدهی',
  });

  const defs = svgEl('defs');
  const glow = svgEl('filter', { id: 'gauge-glow', x: '-30%', y: '-30%', width: '160%', height: '160%' });
  glow.append(svgEl('feGaussianBlur', { stdDeviation: '4', result: 'blur' }));
  const merge = svgEl('feMerge');
  merge.append(svgEl('feMergeNode', { in: 'blur' }), svgEl('feMergeNode', { in: 'SourceGraphic' }));
  glow.append(merge);
  defs.append(glow);
  svg.append(defs);

  svg.append(svgEl('path', {
    d: arcPath(START, END, R),
    class: 'gauge__track',
    fill: 'none',
    'stroke-width': 26,
    'stroke-linecap': 'round',
  }));

  const gap = 1.2;
  SEGMENTS.forEach((seg, index) => {
    const a0 = valueToAngle(seg.from) + (index === 0 ? 3 : gap);
    const a1 = valueToAngle(seg.to) - (index === SEGMENTS.length - 1 ? 3 : gap);
    svg.append(svgEl('path', {
      d: arcPath(a0, a1, R),
      fill: 'none',
      stroke: seg.color,
      'stroke-width': 18,
      'stroke-linecap': 'butt',
      class: 'gauge__segment',
      filter: 'url(#gauge-glow)',
    }));
  });

  const ticks = [0, 0.5, 1, 1.5, 2];
  ticks.forEach((v) => {
    const angle = valueToAngle(v);
    const inner = point(angle, R - 24);
    const outer = point(angle, R - 32);
    svg.append(svgEl('line', {
      x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, class: 'gauge__tick', 'stroke-width': 2,
    }));
    const label = point(angle, R - 46);
    const text = svgEl('text', {
      x: label.x, y: label.y + 4, class: 'gauge__tick-label', 'text-anchor': 'middle',
    });
    text.textContent = toFa(v).replace('.', '٫');
    svg.append(text);
  });

  /* عقربه: به‌سمت بالا ترسیم می‌شود و با rotate حول مرکز می‌چرخد */
  const needle = svgEl('g', { class: 'gauge__needle' });
  needle.append(
    svgEl('polygon', { points: `${CX - 5},${CY} ${CX + 5},${CY} ${CX},${CY - R + 14}`, class: 'gauge__needle-body' }),
    svgEl('circle', { cx: CX, cy: CY, r: 12, class: 'gauge__hub' }),
    svgEl('circle', { cx: CX, cy: CY, r: 5, class: 'gauge__hub-core' }),
  );
  svg.append(needle);

  container.append(svg);

  let rafId = 0;
  let currentAngle = START;

  function setAngle(angle) {
    currentAngle = angle;
    needle.setAttribute('transform', `rotate(${angle.toFixed(2)} ${CX} ${CY})`);
  }

  setAngle(START);

  /* مقدار را در طول مدت انیمیشن به‌صورت زنده برمی‌گرداند (برای شمارنده‌ی عددی) */
  function animateTo(value, { duration = CONFIG.GAUGE_DURATION_MS, onFrame = () => {}, onDone = () => {} } = {}) {
    cancelAnimationFrame(rafId);
    const target = valueToAngle(value);
    if (prefersReducedMotion()) {
      setAngle(target);
      onFrame(value);
      onDone();
      return;
    }
    setAngle(START);
    onFrame(CONFIG.GAUGE_MIN);
    const t0 = performance.now();
    const step = (t) => {
      const progress = Math.min(1, (t - t0) / duration);
      const eased = easeInOut(progress);
      setAngle(START + (target - START) * eased);
      onFrame(CONFIG.GAUGE_MIN + (value - CONFIG.GAUGE_MIN) * eased);
      if (progress < 1) rafId = requestAnimationFrame(step);
      else onDone();
    };
    rafId = requestAnimationFrame(step);
  }

  function reset() {
    cancelAnimationFrame(rafId);
    setAngle(START);
  }

  return { animateTo, reset, get angle() { return currentAngle; }, formatRatio };
}
