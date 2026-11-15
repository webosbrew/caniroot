import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import {DeviceModelName} from '../src/library.js';
import {inferModelFallbacks} from './model-fallbacks.js';

const epk = 'starfish-dvb-secured-m3r-grampians-29-05.40.97_prodkey_usb_V3_SECURED.epk';
function row(name, region = 'UK', linked = false, extra = {}) {
  return {model: DeviceModelName.parse(name), region,
    epk: linked ? epk : null, ota_id: linked ? 'HE_DTV_W19R_AFAAABAA' : null, ...extra};
}
function infer(rows) {
  return inferModelFallbacks(Object.groupBy(rows, r => r.model.simple));
}

describe('automatic model fallbacks', {only: true}, () => {
test('infers LM637BPLA from agreeing neighbors and preserves provenance', () => {
  const result = infer([
    row('32LM637BPLA.AEK'), row('32LM630BPLA.AEK', 'UK', true),
    row('32LM635BPLA.AEU', 'DE', true),
  ]).LM637BPLA;
  assert.equal(result[0].ota_id, 'HE_DTV_W19R_AFAAABAA');
  assert.deepEqual(result[0].inferredFrom, ['32LM630BPLA.AEK/UK', '32LM635BPLA.AEU/DE']);
});

test('rejects conflicting OTA IDs, machines and major codenames', () => {
  for (const extra of [
    {ota_id: 'HE_DTV_W19R_AFAAATAA'},
    {epk: epk.replace('-m3r-', '-m3-'), ota_id: null},
    {epk: epk.replace('-grampians-', '-jasper-')},
  ]) {
    const result = infer([row('32LM637BPLA'), row('32LM630BPLA', 'UK', true),
      row('32LM635BPLA', 'UK', true, extra)]);
    assert.equal(result.LM637BPLA[0].epk, null);
  }
});

test('preserves size, series, technical suffix and broadcast', () => {
  for (const donor of [row('43LM630BPLA', 'UK', true), row('32LK630BPLA', 'UK', true),
    row('32LM630BPLB', 'UK', true), row('32LM630BPLA', 'US', true),
    row('32LM6300PLA', 'UK', true)]) {
    assert.equal(infer([row('32LM637BPLA'), donor]).LM637BPLA[0].epk, null);
  }
});

test('does not replace direct mappings or chain inferred references', () => {
  const direct = row('32LM637BPLA', 'UK', true);
  assert.equal(infer([direct, row('32LM630BPLA', 'UK', true)]).LM637BPLA[0], direct);
  for (const marker of [{inferredFrom: ['source']}, {inferred_from: 'source'}]) {
    assert.equal(infer([row('32LM637BPLA'), row('32LM630BPLA', 'UK', true, marker)])
      .LM637BPLA[0].epk, null);
  }
});

test('does not attach unresolved sizes or unknown regions to an inferred family', () => {
  const result = infer([row('32LM637BPLA'), row('43LM637BPLA'),
    row('32LM637BPLA', 'XX'), row('32LM630BPLA', 'UK', true)]).LM637BPLA;
  assert.equal(result.length, 1);
  assert.equal(result[0].model.size, 32);
  assert.equal(result[0].region, 'UK');
});

test('unparseable neighboring firmware blocks inference', () => {
  assert.equal(infer([row('32LM637BPLA'), row('32LM630BPLA', 'UK', true),
    row('32LM635BPLA', 'UK', true, {epk: 'unknown'})]).LM637BPLA[0].epk, null);
});

});
