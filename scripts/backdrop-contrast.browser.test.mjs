// Backdrop contrast (effects spec §4, §10.3; WCAG 1.4.3): the Bennu backdrop (measured once it has loaded and faded
// in) and the header's solar-system band are images, which the contrast guard cannot compose from colours, so this
// guard measures pixels. On every page, width and theme, at the top and again 1,400 px down (when the page is that long), it records the visible text in the
// header, main and footer, paints all text, borders and markers transparent, hides the moving FX layers (they are not
// ground), takes a screenshot and reads the luminance under each text box: the 90th percentile for light text, the
// 10th for dark text. Text under 4.5:1 (3:1 for 24 px, or 18.66 px bold) against that ground is a finding for WP2,
// whose backdrop it rests on. Text on faces measured elsewhere (buttons and the theme toggle: contrast.browser), on
// night plates and over figures is left out, as is text the floating header covers. Filters and the per-page report:
// scripts/lib/guard.mjs.
import { gotoGuardPage, runGuard } from './lib/guard.mjs';

const perPage = 6;

// Runs in the page: the visible text boxes in the viewport, with their colour and size.
function collect() {
  const header = document.querySelector('.site-header');
  const floating = header && getComputedStyle(header).position === 'sticky';
  const headerBottom = floating ? header.getBoundingClientRect().bottom : 0;
  const out = [];
  for (const el of document.querySelectorAll('.site-header *, main *, .site-footer *')) {
    if (![...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim())) continue;
    if (el.closest('svg, canvas, [hidden], .plate__media, .figure__media, .on-night, button, .button, .theme-toggle')) continue;
    const rect = el.getBoundingClientRect(), style = getComputedStyle(el);
    if (rect.width < 2 || rect.height < 2 || rect.bottom <= 0 || rect.top >= innerHeight || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
    if (floating && !header.contains(el) && rect.top < headerBottom) continue;
    const x = Math.max(0, rect.left), y = Math.max(0, rect.top);
    out.push({
      name: `${window.__guardName(el)} "${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 24)}"`,
      color: style.color, size: parseFloat(style.fontSize), weight: Number(style.fontWeight),
      x, y, w: Math.min(rect.right, innerWidth) - x, h: Math.min(rect.bottom, innerHeight) - y
    });
  }
  return out;
}

// Runs in the page on the text-free screenshot: the ratio of each text box against its worst ground.
async function measure({ png, texts }) {
  const image = new Image();
  image.src = `data:image/png;base64,${png}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0);
  const scale = image.width / innerWidth;
  const linear = value => { value /= 255; return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4; };
  const luminance = (r, g, b) => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  const parse = value => (value.match(/[\d.]+/g) || []).map(Number);
  return texts.map(text => {
    const data = context.getImageData(Math.round(text.x * scale), Math.round(text.y * scale), Math.max(1, Math.round(text.w * scale)), Math.max(1, Math.round(text.h * scale))).data;
    const ground = [];
    for (let index = 0; index < data.length; index += 4) ground.push(luminance(data[index], data[index + 1], data[index + 2]));
    ground.sort((a, b) => a - b);
    const [r, g, b] = parse(text.color);
    const ink = luminance(r, g, b);
    const worst = ink > 0.18 ? ground[Math.floor(ground.length * 0.9)] : ground[Math.floor(ground.length * 0.1)];
    const ratio = (Math.max(ink, worst) + 0.05) / (Math.min(ink, worst) + 0.05);
    const need = text.size >= 24 || (text.size >= 18.66 && text.weight >= 700) ? 3 : 4.5;
    return { name: text.name, ratio, need };
  });
}

// Text, the borders and status markers drawn inside a text box (a chip's border and square are not its ground) and
// the moving FX layers are hidden; what stays is the ground the text rests on.
const hideText = '*, *::before, *::after { color: transparent !important; text-shadow: none !important; caret-color: transparent !important; text-decoration-color: transparent !important; -webkit-text-stroke: 0 !important; border-color: transparent !important; outline-color: transparent !important } *::marker { color: transparent !important } .marker, .chip::before, .pathway-chip::before, .evidence-status__tag::before, .ambient-space-layer, .ui2046-layer { visibility: hidden !important }';

await runGuard('backdrop-contrast', async (page, { entry, base }) => {
  await gotoGuardPage(page, base, entry, { settle: 600 });
  // Bennu loads after the page has (html.backdrop-ready, observatory-interactions.js) and fades in over 600 ms: measure
  // over the backdrop at full strength, never mid-fade.
  await page.waitForFunction(() => document.documentElement.classList.contains('backdrop-ready'), null, { timeout: 8000 });
  await page.waitForTimeout(800);
  const findings = [];
  let smallest = Infinity;
  for (const y of [0, 1400]) {
    if (y) {
      const long = await page.evaluate(y => document.documentElement.scrollHeight >= y + innerHeight, y);
      if (!long) break;
      await page.evaluate(y => { document.documentElement.style.scrollBehavior = 'auto'; scrollTo(0, y); }, y);
      await page.waitForTimeout(200);
    }
    const texts = await page.evaluate(collect);
    const style = await page.addStyleTag({ content: hideText });
    await page.waitForTimeout(100);
    const png = (await page.screenshot({ type: 'png' })).toString('base64');
    await style.evaluate(node => node.remove());
    const results = await page.evaluate(measure, { png, texts });
    for (const result of results) {
      smallest = Math.min(smallest, result.ratio / result.need);
      if (result.ratio < result.need) findings.push({ owner: 'WP2', message: `${result.name} reads at ${result.ratio.toFixed(2)}:1 over the backdrop${y ? ` (scrolled ${y} px)` : ''}, needs ${result.need}:1` });
    }
  }
  return { findings: findings.slice(0, perPage), notes: Number.isFinite(smallest) ? [`smallest margin ${smallest.toFixed(2)} x the required ratio`] : [] };
}, { widths: [1440, 1024, 390] });
