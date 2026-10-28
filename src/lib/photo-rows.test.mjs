import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { MAX_ROW_SCALE, WALL_BANDS, partitionRows, rowProperties } from './photo-rows.js';

const data = fs.readFileSync(new URL('../data/photography.ts', import.meta.url), 'utf8');
const photographs = vm.runInNewContext(`${data.replace(/export const/g, 'const')}\nphotographs`);
const ratios = photographs.map(photo => photo.ratio);

// The same greedy line breaking that plain CSS flex wrapping does.
function greedyRows(width, gap, target) {
  const rows = [[]]; let used = 0;
  ratios.forEach((ratio, index) => {
    const basis = ratio * target, row = rows.at(-1);
    if (row.length && used + gap + basis > width) { rows.push([index]); used = basis; } else { row.push(index); used += (row.length > 1 ? gap : 0) + basis; }
  });
  return rows;
}

function assertRowsFill(rows, width, gap, count) {
  assert.equal(rows[0].start, 0);
  assert.equal(rows.at(-1).end, count);
  rows.forEach((row, index) => {
    if (index) assert.equal(row.start, rows[index - 1].end, 'rows are contiguous and in reading order');
    assert.ok(row.end > row.start);
    const used = ratios.slice(row.start, row.end).reduce((sum, ratio) => sum + ratio * row.height, 0) + gap * (row.end - row.start - 1);
    assert.ok(Math.abs(used - width) < 1e-6, 'row fills the wall exactly');
  });
}

// Reads the custom properties of one inline style.
const parse = style => Object.fromEntries(style.split('; ').map(entry => entry.split(': ')).map(([name, value]) => [name, Number(value)]));

test('photograph ratios come from the stored dimensions', () => {
  for (const photo of photographs) assert.ok(Math.abs(photo.ratio - photo.width / photo.height) < 1e-4, `photo ${photo.number}`);
});

test('every row, the last included, fills the wall near the target height in each band', () => {
  for (const band of WALL_BANDS) {
    const target = band.rowShare * band.sampleWidth;
    const rows = partitionRows(ratios, band.sampleWidth - 1, band.gap, target, band.maxPerRow);
    assertRowsFill(rows, band.sampleWidth - 1, band.gap, ratios.length);
    for (const row of rows) {
      const scale = row.height / target;
      assert.ok(scale > 0.7 && scale < 1.4, `${band.name}: row ${row.start}-${row.end} is ${scale.toFixed(2)}x the target`);
    }
    assert.ok(rows.at(-1).height / target <= MAX_ROW_SCALE, `${band.name}: the last row is filled, not left open`);
  }
});

test('one partition holds across each band because the target row height scales with the wall', () => {
  let lower = 260;
  for (const band of WALL_BANDS) {
    const shape = width => partitionRows(ratios, width - 1, band.gap, band.rowShare * width, band.maxPerRow).map(row => row.end - row.start).join('');
    const sample = shape(band.sampleWidth);
    for (let width = lower; width <= band.maxWidth; width += 20) assert.equal(shape(width), sample, `${band.name} at ${width}px`);
    lower = band.maxWidth + 1;
  }
});

test('phones get one or two photographs per row, and only the panorama stands alone', () => {
  const narrow = WALL_BANDS.find(band => band.name === 'narrow');
  const rows = partitionRows(ratios, narrow.sampleWidth - 1, narrow.gap, narrow.rowShare * narrow.sampleWidth, narrow.maxPerRow);
  assert.ok(rows.every(row => row.end - row.start <= 2));
  assert.deepEqual(rows.filter(row => row.end - row.start === 1).map(row => photographs[row.start].wide), [true]);
});

test('the partition avoids the lone last photograph a greedy fill leaves', () => {
  // At 1024px (929px wall, 203px target) greedy rows end with one photograph, which would have to grow to
  // about 2.7x the target to fill the wall.
  const [width, gap, target] = [929, 16, 203];
  assert.equal(greedyRows(width, gap, target).at(-1).length, 1);
  const rows = partitionRows(ratios, width - 1, gap, target);
  assert.ok(rows.at(-1).end - rows.at(-1).start >= 2);
  assert.ok(rows.every(row => row.height / target < 1.25));
});

test('a row that cannot fill near the target is still returned, and its tiles keep the target height', () => {
  const rows = partitionRows([1.5], 1200, 16, 260);
  assert.deepEqual(rows.map(row => [row.start, row.end]), [[0, 1]]);
  assert.ok(rows[0].height / 260 > MAX_ROW_SCALE);
  assert.deepEqual(partitionRows([], 1200, 16, 260), []);
  // One photograph cannot fill any band near the target, so it stays at the target height without growing.
  for (const style of rowProperties([1.5])) {
    const properties = parse(style);
    for (const band of WALL_BANDS) {
      assert.equal(properties[`--photo-grow-${band.name}`], 0);
      assert.equal(properties[`--photo-sum-${band.name}`], undefined);
    }
  }
});

test('tile styles carry each row ratio sum and gap count, and the CSS row height fills every width', () => {
  const styles = rowProperties(ratios).map(parse);
  assert.equal(styles.length, ratios.length);
  let lower = 260;
  for (const band of WALL_BANDS) {
    styles.forEach((style, index) => assert.equal(style['--photo-ratio'], ratios[index]));
    // Consecutive tiles with the same sum and gap count form one row of gaps + 1 photographs.
    const rows = [];
    for (let index = 0; index < styles.length;) {
      const gaps = styles[index][`--photo-gaps-${band.name}`];
      const sum = styles[index][`--photo-sum-${band.name}`];
      const row = styles.slice(index, index + gaps + 1);
      assert.ok(row.every(style => style[`--photo-sum-${band.name}`] === sum && style[`--photo-gaps-${band.name}`] === gaps));
      assert.ok(Math.abs(row.reduce((total, style) => total + style['--photo-ratio'], 0) - sum) < 1e-9);
      rows.push({ sum, gaps, ratios: row.map(style => style['--photo-ratio']) });
      index += gaps + 1;
    }
    // observatory-experience.css: row height = (100cqw - 1px - gaps x gap) / sum; flex-grow closes the last pixel.
    for (let width = lower; width <= band.maxWidth; width += 37) {
      for (const gap of [10, 16]) {
        for (const row of rows) {
          const height = (width - 1 - row.gaps * gap) / row.sum;
          const used = row.ratios.reduce((total, ratio) => total + ratio * height, 0) + row.gaps * gap;
          assert.ok(width - used > 0.99 && width - used < 1.01);
        }
      }
    }
    lower = band.maxWidth + 1;
  }
});

test('observatory-experience.css repeats the wall bands as container queries', () => {
  const css = fs.readFileSync(new URL('../../public/assets/css/observatory-experience.css', import.meta.url), 'utf8');
  const [narrow, medium, wide] = WALL_BANDS;
  for (const band of [narrow, medium]) {
    const query = css.indexOf(`@container photo-wall (max-width: ${band.maxWidth}px)`);
    assert.ok(query > 0, `no container query for ${band.name}`);
    const rule = css.slice(query, css.indexOf('}', query));
    assert.ok(rule.includes(`--photo-target-h: ${Math.round(band.rowShare * 1000) / 10}cqw`) && rule.includes(`var(--photo-sum-${band.name})`), band.name);
  }
  assert.ok(css.includes(`--photo-target-h: ${Math.round(wide.rowShare * 1000) / 10}cqw`) && css.includes('var(--photo-sum-wide)'));
});
