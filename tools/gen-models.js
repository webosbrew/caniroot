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
import {machineOtaIdPrefix, minorMajor, otaIdUpgrades, regionBroadcasts} from "./mappings.js";
import {DeviceModelName} from "../src/library.js";
import {groupBy, sortBy, uniq, uniqBy} from "lodash-es";

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
 * @param predicate {({codename: string, otaId: string}) => boolean}
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

/**
 * @param model {DeviceModelName}
 * @param epk {string}
 * @param region {string}
 * @param [otaId] {string}
 * @returns {DeviceModelData | undefined}
 */
export function parseDeviceModel(model, epk, region, otaId) {
  const match = epk.match([
    /(?:lib32-)?starfish-(?<broadcast>\w+)-secured-(?<machine2>\w+)-/,
    /(?:\d+\.)?(?<minor>\w+)(?:\.(pine|(?<machine>(?!pine)\w+))|-(\d+))/
  ].map(r => r.source).join(''));
  if (!match) {
    return undefined;
  }
  const machine = [match.groups.machine, match.groups.machine2].filter(x => machineOtaIdPrefix[x])[0];
  if (!machine) {
    return undefined;
  }
  const codename = minorMajor[match.groups.minor];

  const otaIdPrefix = findOtaIdPrefix(machine, x => x.codename === codename);
  if (!otaId) {
    if (!otaIdPrefix) {
      return undefined;
    }
    const otaIdSuffix = inferOtaIdBroadcastSuffix(otaIdPrefix, match.groups.broadcast);
    if (!otaIdSuffix) {
      return undefined;
    }
    otaId = otaIdPrefix + otaIdSuffix;
  } else if (otaIdPrefix && !otaId.startsWith(otaIdPrefix)) {
    return undefined;
  }

  const broadcast = inferBroadcast(match.groups.broadcast, otaId, region);

  return {
    series: model.series, region, broadcast, machine, codename, otaId,
    suffix: model.suffix, variants: [],
  }
}

const knownRegions = Object.keys(regionBroadcasts);

/** @type {Record<string, (Omit<ModelItem, 'model'> & {model: DeviceModelName})[]>} */
const dumpGrouped = groupBy(dump.map(item => {
  let modelRaw = item.model;
  if (item.region === 'KR' && modelRaw.match(/-N[A-Z]$/)) {
    // -N? models seems to be duplicates of the same model, so we can ignore them
    modelRaw = modelRaw.replace(/-N[A-Z]$/, '');
  }
  const model = DeviceModelName.parse(modelRaw);
  if (!model) {
    console.error(`Failed to parse model name: ${modelRaw}`);
    return null;
  }
  return {...item, model};
}).filter(v => v), (item) => item.model.simple);

for (let [model, items] of Object.entries(dumpGrouped)) {
  const sizes = uniq(items.map(x => x.model.size)).sort();
  items = sortBy(items, v => {
    let prefix = v.epk ? 'a' : 'z';
    let region = knownRegions.indexOf(v.region);
    prefix += region < 0 ? '_' : region.toString(36);
    return `${prefix}-${v.model.codename}-${v.model.simple}`;
  });
  const {model: parsedName, epk, region, ota_id} = items[0];
  const parsedModel = epk && parseDeviceModel(parsedName, epk, region, ota_id);
  if (!parsedModel) {
    console.error(`Failed to parse EPK for model ${model}: ${epk}`);
    continue;
  }
  parsedModel.sizes = sizes;
  /** @type {DeviceModelData[]} */
  const variants = items.slice(1).flatMap(({model, epk, region, ota_id}) => {
    const variant = epk && parseDeviceModel(model, epk, region, ota_id);
    if (!variant) {
      return region !== parsedModel.region ? [{region}] : [];
    }
    delete variant.variants;
    const results = [variant];
    if (otaIdUpgrades[variant.otaId]) {
      results.push({...variant, ...otaIdUpgrades[variant.otaId]});
    }
    return results;
  }).filter(variant => {
    for (const [k, v] of Object.entries(variant)) {
      if (parsedModel[k] === v) {
        delete variant[k];
      }
    }
    return Object.keys(variant).length > 0;
  });
  if (otaIdUpgrades[parsedModel.otaId]) {
    variants.splice(0, 0, otaIdUpgrades[parsedModel.otaId]);
  }
  parsedModel.variants = uniqBy(variants, v => JSON.stringify(v));
  output[parsedName.simple] = parsedModel;
}

// language=JavaScript
const header = '/** @type {Record<string, DeviceModelData>} */\nexport default ';
fs.writeFileSync("src/models.gen.js", header + JSON.stringify(output, null, 2));