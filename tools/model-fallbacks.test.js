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

describe('reviewed model fallbacks', {only: true}, () => {
  const fixtures = [
    ['43UA73006LA.AEU', 'UK', '43UA75006LA.AEU', 'DE', 'panna-35-33.11.10'],
    ['43UA7700PUB.AUS', 'US', '43UA7000PUB.ACC', 'CA', 'papikonda-3001-33.31.61'],
    ['43UA7300PSB.AWH', 'PE', '43UA7500PSA.AWR', 'BR', 'paparoa-5504-33.22.69'],
  ];
  function reference(fixture) {
    return row(fixture[2], fixture[3], true, {
      epk: `lib32-starfish-global-secured-k25lp-${fixture[4]}_prodkey_usb_V3_SECURED.epk`,
      ota_id: 'HE_DTV_W25P_AFADATAA',
    });
  }

  test('preserves all three exceptions and records source provenance', () => {
    for (const fixture of fixtures) {
      const target = row(fixture[0], fixture[1]);
      const donor = reference(fixture);
      const result = infer([target, donor])[target.model.simple];
      assert.equal(result.length, 1);
      assert.equal(result[0].ota_id, donor.ota_id);
      assert.equal(result[0].epk, donor.epk);
      assert.deepEqual(result[0].inferredFrom, [`${fixture[2]}/${fixture[3]}`]);
    }
  });

  test('keeps Mexico outside the reviewed ISDB fallback', () => {
    const fixture = fixtures[2];
    const result = infer([row(fixture[0], 'PE'), row(fixture[0], 'MX'), reference(fixture)]);
    assert.deepEqual(result.UA7300PSB.map(r => r.region), ['PE']);
  });

  test('requires the exact directly linked reference', () => {
    const fixture = fixtures[0];
    const target = row(fixture[0], fixture[1]);
    for (const patch of [{epk: epk}, {ota_id: 'OTHER'}, {inferredFrom: ['source']}]) {
      assert.throws(() => infer([target, {...reference(fixture), ...patch}]),
        /Fallback reference firmware is not linked/);
    }
  });

  test('a direct target mapping supersedes the reviewed exception', () => {
    const fixture = fixtures[0];
    const direct = row(fixture[0], fixture[1], true);
    assert.equal(infer([direct])[direct.model.simple][0], direct);
  });

  test('reviewed mappings cannot become automatic donors', () => {
    const fixture = fixtures[0];
    const result = infer([row(fixture[0], fixture[1]), reference(fixture), row('43UA73003LA.AEU', 'UK')]);
    assert.equal(result.UA73003LA[0].epk, null);
  });
});
