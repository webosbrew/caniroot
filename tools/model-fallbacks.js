import {regionBroadcasts} from './mappings.js';
import {parseDeviceModel} from './device-model.js';

// Reviewed exceptions cross series/suffix boundaries that fuzzy matching forbids.
// Pin a directly linked reference EPK and OTA ID; fail if it disappears or changes.
const reviewedFallbacks = {
  // UA74006LB also corroborates the k25lp mapping for this DVB family.
  UA73006LA: {
    reference: '43UA75006LA.AEU', region: 'DE', broadcast: 'dvb',
    regions: ['AT', 'BE', 'CZ', 'DE', 'ES', 'FR', 'HU', 'IT', 'NL', 'PT', 'SE', 'UK'],
    epk: 'lib32-starfish-global-secured-k25lp-panna-35-33.11.10_prodkey_usb_V3_SECURED.epk',
    otaId: 'HE_DTV_W25P_AFADATAA',
  },
  UA7700PUB: {
    reference: '43UA7000PUB.ACC', region: 'CA', broadcast: 'atsc',
    regions: ['CA', 'US'],
    epk: 'lib32-starfish-global-secured-k25lp-papikonda-3001-33.31.61_prodkey_usb_V3_SECURED.epk',
    otaId: 'HE_DTV_W25P_AFADATAA',
  },
  // Mexico is deliberately excluded: its broadcast system is ATSC, not ISDB.
  UA7300PSB: {
    reference: '43UA7500PSA.AWR', region: 'BR', broadcast: 'isdb',
    regions: ['CL', 'CO', 'PE'],
    epk: 'lib32-starfish-global-secured-k25lp-paparoa-5504-33.22.69_prodkey_usb_V3_SECURED.epk',
    otaId: 'HE_DTV_W25P_AFADATAA',
  },
};

function applyReviewedFallback(grouped, family, targets, rule) {
  const reference = Object.values(grouped).flat().find(item =>
    !item.inferred_from && !item.inferredFrom &&
    `${item.model.sized}${item.model.suffix || ''}` === rule.reference &&
    item.region === rule.region && item.epk === rule.epk && item.ota_id === rule.otaId);
  if (!reference) throw new Error(`Fallback reference firmware is not linked: ${rule.reference}/${rule.region}`);
  const parsed = parseDeviceModel(reference.model, reference.epk, reference.region, reference.ota_id);
  if (!parsed || parsed.broadcast !== rule.broadcast ||
      rule.regions.some(region => regionBroadcasts[region] !== rule.broadcast)) {
    throw new Error(`Incompatible reviewed fallback for ${family}`);
  }
  return targets.filter(item => rule.regions.includes(item.region)).map(item => ({
    ...item, epk: rule.epk, ota_id: rule.otaId,
    inferredFrom: [`${rule.reference}/${rule.region}`],
  }));
}

function bucket(item) {
  const {model, region} = item;
  const broadcast = regionBroadcasts[region];
  if (!model.size || !broadcast) return undefined;
  return [model.class, model.series, model.size, model.tdd, broadcast,
    model.simple.replace(/\d/g, '#')].join('|');
}

function neighboring(a, b) {
  if (a.length !== b.length) return false;
  let changes = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue;
    if (!/\d/.test(a[i]) || !/\d/.test(b[i])) return false;
    changes++;
  }
  return changes === 1;
}

/**
 * Resolve entirely unlinked families using reviewed exceptions, then one-digit
 * neighbors with matching size, series, technical suffix and broadcast. Every
 * eligible neighbor must agree on machine/OTA/codename; inferred rows never
 * become donors. Provenance records an inference, not an observed target OTA ID.
 * @param {Record<string, Array<object>>} grouped Parsed model dump by simple name.
 * @returns {Record<string, Array<object>>}
 */
export function inferModelFallbacks(grouped) {
  const donors = new Map();
  for (const group of Object.values(grouped)) {
    for (const item of group) {
      if (!item.epk || item.inferred_from || item.inferredFrom) continue;
      const key = bucket(item);
      if (!key) continue;
      if (!donors.has(key)) donors.set(key, []);
      donors.get(key).push(item);
    }
  }
  const result = {...grouped};
  const parsedDonors = new WeakMap();
  for (const [family, group] of Object.entries(grouped)) {
    // Direct and reviewed mappings always take precedence.
    if (group.some(item => item.epk || item.ota_id)) continue;
    if (Object.hasOwn(reviewedFallbacks, family)) {
      result[family] = applyReviewedFallback(grouped, family, group, reviewedFallbacks[family]);
      continue;
    }
    const inferred = [];
    for (const target of group) {
      const candidates = (donors.get(bucket(target)) || [])
        .filter(item => neighboring(target.model.simple, item.model.simple))
        .map(item => {
          if (!parsedDonors.has(item)) {
            const parsed = parseDeviceModel(item.model, item.epk, item.region, item.ota_id);
            // Unparseable references block inference rather than hiding disagreement.
            const identity = parsed && parsed.broadcast === regionBroadcasts[item.region]
              ? JSON.stringify([parsed.machine, parsed.otaId, parsed.codename, parsed.broadcast])
              : undefined;
            parsedDonors.set(item, {item, identity, parsed});
          }
          return parsedDonors.get(item);
        });
      if (!candidates.length || candidates.some(c => !c.identity)) continue;
      if (new Set(candidates.map(c => c.identity)).size !== 1) continue;
      const references = [...new Set(candidates.map(({item}) =>
        `${item.model.sized}${item.model.suffix || ''}/${item.region}`))].sort();
      // Identity includes the major codename; one representative EPK is enough.
      candidates.sort((a, b) => a.item.epk.localeCompare(b.item.epk, 'en'));
      const {item, parsed} = candidates[0];
      inferred.push({...target, epk: item.epk, ota_id: parsed.otaId, inferredFrom: references});
    }
    // Do not let unresolved sizes/regions inherit an inferred mapping elsewhere.
    if (inferred.length) result[family] = inferred;
  }
  return result;
}
