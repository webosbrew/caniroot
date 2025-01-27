/**
 * @typedef {Object} ModelItem
 * @property {string} model
 * @property {string} unsized
 * @property {string} region
 * @property {string} [epk]
 * @property {string} [ota_id]
 */

/**
 * @type {ModelItem[]}
 */
import dump from "./data/model-epks.json" assert {type: "json"};
import fs from "node:fs";
import {machineOtaIdPrefix, minorMajor, regionBroadcasts, upgradedOtaIds} from "./mappings.js";
import {DeviceModelName} from "../src/library.js";
import {compact, concat, filter, groupBy, isEqual, sortBy, sortedUniq, uniq, uniqBy} from "lodash-es";

/**
 * @type {Record<string, DeviceModelData>}
 */
let output = {};

/**
 * @param broadcast {string}
 * @param otaIdPrefix {string}
 * @param region {string}
 * @return {string|undefined}
 */
export function inferBroadcast(broadcast, otaIdPrefix, region) {
  if (broadcast !== 'global') {
    return broadcast;
  }
  switch (otaIdPrefix.substring(0, 6)) {
    case 'HE_MNT':
      return 'global';
    case 'HE_DTV': {
      return regionBroadcasts[region];
    }
  }
}

/**
 * @param prefix {string}
 * @param broadcast {string}
 * @return {string | undefined}
 */
function inferOtaIdBroadcastSuffix(prefix, broadcast) {
  switch (broadcast) {
    case 'arib':
      return 'JAAA';
    case 'dvb':
      return 'ABAA';
    case 'atsc':
      return 'ATAA';
    case 'global':
      if (prefix.startsWith('HE_MNT_')) {
        return 'GLAA';
      } else if (prefix.startsWith('HE_DTV_')) {
        return 'ATAA';
      }
      break;
    default:
      break;
  }
  return undefined;
}

/**
 * @param machine {string}
 * @param predicate {({codename?: string, broascast?: string, otaId: string}) => boolean}
 * @returns {string|undefined}
 */
function findOtaIdPrefix(machine, predicate) {
  let otaIds = machineOtaIdPrefix[machine];
  if (!otaIds) {
    return undefined;
  }

  return otaIds.map(otaId => {
    if (typeof otaId === 'string') {
      return otaId;
    }
    if (predicate(otaId)) {
      return otaId.otaId;
    }
    return null;
  }).filter((x) => !!x)[0];
}

const epkNameRegex = new RegExp([
  /(?:lib32-)?starfish-(?<broadcast>\w+)-secured-(?<machine2>\w+)-/,
  /(?:\d+\.)?(?<minor>\w+)(?:\.(pine|(?<machine>(?!pine)\w+))|-(\d+))/
].map(r => r.source).join(''));

/**
 * @param model {DeviceModelName}
 * @param epk {string}
 * @param region {string}
 * @param [otaId] {string}
 * @returns {Omit<DeviceModelData, 'sizes'|'regions'|'variants'> | undefined}
 */
export function parseDeviceModel(model, epk, region, otaId) {
  const match = epk.match(epkNameRegex);
  if (!match) {
    console.error(`Unrecognized EPK file pattern: ${epk}`);
    return undefined;
  }
  const machine = [match.groups.machine, match.groups.machine2].filter(x => machineOtaIdPrefix[x])[0];
  if (!machine) {
    console.error(`Unrecognized machine for ${epk}: ${match.groups.machine} ${match.groups.machine2}`);
    return undefined;
  }
  const codename = minorMajor[match.groups.minor];
  if (!codename) {
    console.error(`Unrecognized codename for ${epk}: minor is ${match.groups.minor}`);
    return undefined;
  }

  const otaIdPrefix = findOtaIdPrefix(machine, x => x.codename === codename);
  if (!otaId) {
    if (!otaIdPrefix) {
      console.error(`No OTA ID prefix for ${machine} ${codename}`);
      return undefined;
    }
    const otaIdSuffix = inferOtaIdBroadcastSuffix(otaIdPrefix, match.groups.broadcast);
    if (!otaIdSuffix) {
      console.error(`No OTA ID suffix for ${epk}: otaIdPrefix=${otaIdPrefix} ${match.groups.broadcast}`);
      return undefined;
    }
    otaId = otaIdPrefix + otaIdSuffix;
  } else if (otaIdPrefix && !otaId.startsWith(otaIdPrefix)) {
    console.error(`Mismatched OTA ID prefix for ${epk}: ${otaId} vs ${otaIdPrefix}`);
    return undefined;
  }

  const broadcast = inferBroadcast(match.groups.broadcast, otaId, region);

  return {
    series: model.series,
    broadcast,
    machine,
    codename,
    otaId,
    suffix: model.tdd?.length > 3 ? undefined : model.suffix
  };
}

const knownRegions = Object.keys(regionBroadcasts);

/** @typedef {Omit<ModelItem, 'model'> & {model: DeviceModelName}} GroupedModelItem */

/** @type {Record<string, GroupedModelItem[]>} */
const dumpGrouped = groupBy(dump.map(item => {
  let modelRaw = item.model;
  if (item.region === 'KR' && modelRaw.match(/-N[A-Z]$/)) {
    // -N? models seems to be duplicates of the same model, so we can ignore them
    modelRaw = modelRaw.replace(/-N[A-Z]$/, '');
  }
  const ota_id = upgradedOtaIds[item.ota_id] || item.ota_id;
  const model = DeviceModelName.parse(modelRaw);
  if (!model) {
    console.error(`Failed to parse model name: ${modelRaw}`);
    return null;
  }
  return {...item, ota_id, model};
}).filter(v => v), (item) => item.model.simple);

/**
 * @param item {GroupedModelItem}
 * @return {boolean}
 */
function isMismatch(item) {
  const broadcast = item.epk?.match(/(?:lib32-)?starfish-(?<broadcast>\w+)-secured-/)?.groups?.broadcast;
  if (broadcast && broadcast !== 'global' && regionBroadcasts[item.region] !== broadcast) {
    return true;
  }
  return false;
}

for (let [model, items] of Object.entries(dumpGrouped)) {
  items = sortBy(items.filter(v => !isMismatch(v)), v => {
    let prefix = v.epk ? 'a' : 'z';
    prefix += v.ota_id ? 'a' : 'z';
    let region = knownRegions.indexOf(v.region);
    prefix += region < 0 ? '_' : region.toString(36);
    const groups = v.epk?.match(epkNameRegex)?.groups;
    const minor = groups?.minor;
    return `${prefix}-${minor}-${v.model.sized}`;
  });
  if (items.length === 0) {
    console.warn(`No valid firmware found for model ${model}`);
    continue;
  }
  let preferredIndex = 0;
  for (const [_, sub] of Object.entries(groupBy(items, (v) => `${v.model.sized}-${v.region}`))) {
    const rank = Object.entries(groupBy(sub.filter(v => v.ota_id && !v.ota_id.endsWith('PU')), 'ota_id'))
      .sort(([_ak, a], [_bk, b]) => b.length - a.length);
    if (rank.length > 1) {
      console.warn(`Multiple OTA IDs for model ${sub[0].model.sized} (${sub[0].region}): ${rank.map(([k, v]) => `${k}=${v.length}`).join(", ")}`);
      preferredIndex = items.indexOf(rank[0][1][0]);
      if (preferredIndex < 0) {
        preferredIndex = 0;
      }
    }
  }
  const {model: parsedName, epk, region, ota_id} = items[preferredIndex];
  /** @type {DeviceModelData | undefined} */
  const base = epk && parseDeviceModel(parsedName, epk, region, ota_id);
  if (!base) {
    console.error(`Failed to parse EPK for model ${model}: ${epk}`);
    continue;
  }

  /**
   * @param {ModelItem} v
   * @return {boolean} */
  function sameVariation(v) {
    if (v.ota_id && v.ota_id !== ota_id) {
      return false;
    }
    return v.model.simple === parsedName.simple;
  }

  base.sizes = uniq(compact(items.map(x => sameVariation(x) && x.model.size))).sort();
  base.regions = uniq(compact(items.map(x => sameVariation(x) && x.region))).sort();
  /** @type {DeviceModelData[]} */
  let variants = filter(groupBy(items.slice(1).flatMap(({model, epk, region, ota_id}) => {
    const variant = epk && parseDeviceModel(model, epk, region, ota_id);
    if (!variant) {
      return [];
    }
    variant.sizes = [model.size];
    variant.regions = [region];
    return [variant];
  }), (item) => item.otaId + item.codename), (variants, otaId) => {
    if (otaId === ota_id) {
      return false;
    }
    /** @type {DeviceModelVariantData} */
    const first = variants[0];
    for (const variant of variants.splice(1, variants.length)) {
      first.sizes = sortedUniq(concat(first.sizes, variant.sizes).sort());
      first.regions = sortedUniq(concat(first.regions, variant.regions).sort());
    }
    for (const [key, value] of Object.entries(first)) {
      if (isEqual(value, base[key])) {
        delete first[key];
      }
    }
    return first.otaId || first.codename;
  }).map(group => group[0]);
  variants = uniqBy(variants, v => Object.entries(v)
    .sort(([a], [b]) => a.localeCompare(b)).map(([_, v]) => v).join("-"));
  if (variants.length) {
    base.variants = variants;
  }
  output[parsedName.simple] = base;
}

// language=JavaScript
const header = '/** @type {Record<string, DeviceModelData>} */\nexport default ';
fs.writeFileSync("src/models.gen.js", header + JSON.stringify(output, null, 2));