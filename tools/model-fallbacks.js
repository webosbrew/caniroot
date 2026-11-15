import {regionBroadcasts} from './mappings.js';
import {parseDeviceModel} from './device-model.js';

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
 * Infer only entirely unlinked families from direct, one-digit neighbors.
 * Every eligible reference must agree; inferred rows never become donors.
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
