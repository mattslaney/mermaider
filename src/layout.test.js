import assert from 'node:assert/strict';
import test from 'node:test';
import { clampRatio, resolveLayout } from './layout.ts';

test('auto layout follows the longest viewport dimension', () => {
  assert.deepEqual(resolveLayout('auto', 1200, 800), { axis: 'horizontal', first: 'source' });
  assert.deepEqual(resolveLayout('auto', 600, 900), { axis: 'vertical', first: 'source' });
});

test('fixed layouts preserve their axis and pane order', () => {
  assert.deepEqual(resolveLayout('source-left', 600, 900), { axis: 'horizontal', first: 'source' });
  assert.deepEqual(resolveLayout('preview-top', 1200, 800), { axis: 'vertical', first: 'preview' });
  assert.deepEqual(resolveLayout('preview-left', 600, 900), { axis: 'horizontal', first: 'preview' });
  assert.deepEqual(resolveLayout('source-top', 1200, 800), { axis: 'vertical', first: 'source' });
});

test('split ratio keeps both panes usable', () => {
  assert.equal(clampRatio(0), 0.15);
  assert.equal(clampRatio(0.6), 0.6);
  assert.equal(clampRatio(1), 0.85);
});
