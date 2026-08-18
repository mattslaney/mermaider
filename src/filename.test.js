import assert from 'node:assert/strict';
import test from 'node:test';
import { diagramFilename } from './filename.ts';

test('diagram names become safe download filenames', () => {
  assert.equal(diagramFilename('System overview'), 'System-overview');
  assert.equal(diagramFilename('API: client/server?'), 'API-clientserver');
  assert.equal(diagramFilename('...'), 'mermaid-diagram');
});
