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
import dump from "./data/model-epks.json" with {type: "json"};
/**
 * @type {DumpItem[]}
 */
import updates from "./data/fw-updates.json" with {type: "json"};
import fs from "node:fs";
import {machineOtaIdPrefix, regionBroadcasts, upgradedOtaIds} from "./mappings.js";
import {DeviceModelName} from "../src/library.js";
import {chain, concat, countBy, filter, groupBy, isEqual, size, sortBy, sortedUniq, uniqBy, without} from "lodash-es";
import {epkNameRegex, parseDeviceModel} from "./device-model.js";
import * as rfc6902 from "rfc6902";

/**
 * @type {Record<string, DeviceModelData>}
 */
let output = {};

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

/** @type {Record<string, DumpItem[]>} */
const updatesGrouped = groupBy(updates, item => {
  const otaId = upgradedOtaIds[item.ota_id] || item.ota_id;
  const codename = item.webos_codename.split('-', 1)[0];
  return `${otaId}-${codename}`;
});

/**
 * @param epk {string}
 * @return {string | undefined}
 */
function epkBroadcast(epk) {
  return epk.match(/(?:lib32-)?starfish-(?<broadcast>\w+)-secured-/)?.groups?.broadcast;
}

/**
 * @param item {GroupedModelItem}
 * @return {boolean}
 */
function isMismatch(item) {
  const broadcast = item.epk && epkBroadcast(item.epk);
  const regionBroadcast = regionBroadcasts[item.region];
  return !!broadcast && broadcast !== 'global' && regionBroadcast !== 'isdb' && regionBroadcast !== broadcast;
}

/**
 * @param model {DeviceModelName}
 * @param epk {string}
 * @param otaId {string}
 * @param items {GroupedModelItem[]}
 * @param getter {(item: GroupedModelItem) => any}
 */
function modelsProps(model, epk, otaId, items, getter) {
  /**
   * @param {GroupedModelItem} v
   * @return {boolean} */
  function sameVariation(v) {
    if (v.ota_id && v.ota_id !== otaId) {
      return false;
    } else if (v.epk && epk && epkBroadcast(v.epk) !== epkBroadcast(epk)) {
      return false;
    }
    return v.model.simple === model.simple;
  }

  return chain(items).groupBy(/** @param x {GroupedModelItem} */(x) => getter(x))
    .values()
    .map(/** @param g {GroupedModelItem[]} */(g) => {
      const filtered = g.filter(v => v.ota_id);
      if (filtered.length > 1) {
        return filtered;
      }
      return g;
    })
    .flatten()
    .map(/** @param x {GroupedModelItem} */(x) => sameVariation(x) && getter(x))
    .compact()
    .uniq()
    .sort()
    .value();
}

for (let [model, group] of Object.entries(dumpGrouped)) {
  group = group.filter(v => !isMismatch(v));
  // Sort by otaId, region, codename and size
  group = sortBy(group, v => {
    const groups = v.epk?.match(epkNameRegex)?.groups;
    let prefix = v.epk ? 'a' : 'z';
    let regionIdx = knownRegions.indexOf(v.region);
    prefix += regionIdx < 0 ? '_' : regionIdx.toString(36).padStart(2, '0');
    const minor = groups?.minor ?? 'zzzz';
    const otaIdPrefix = v.ota_id ?? (groups && [groups.machine, groups.machine2].map(x => machineOtaIdPrefix[x])?.find(v => v)?.[0]);
    return `${prefix}-${v.model.sized}-${minor}-${otaIdPrefix?.substring(7, 11) ?? 'ZZZZ'}`;
  });
  /** @type {GroupedModelItem[]} */
  const items = group;
  if (items.length === 0) {
    console.warn(`No valid firmware found for model ${model}`);
    continue;
  }
  /** @type {Record<string, number>} */
  const countByOtaId = countBy(group.filter(v => v.ota_id), v => v.ota_id.substring(0, 11));
  if (size(countByOtaId) > 1) {
    console.warn(`Multiple OTA IDs for model ${model}`, countByOtaId);
  }
  const {model: parsedName, epk, region, ota_id} = items[0];
  /** @type {DeviceModelData | undefined} */
  const base = epk && parseDeviceModel(parsedName, epk, region, ota_id);
  if (!base) {
    console.error(`Failed to parse EPK for model ${model}: ${epk}`);
    continue;
  }

  base.sizes = modelsProps(parsedName, epk, ota_id, items, x => x.model.size);
  base.regions = modelsProps(parsedName, epk, ota_id, items, x => x.region);
  /** @type {DeviceModelData[]} */
  let variants = filter(groupBy(items.slice(1).flatMap(({model, epk, region, ota_id}) => {
    /** @type {DeviceModelVariantData | undefined} */
    const variant = epk && parseDeviceModel(model, epk, region, ota_id);
    if (!variant) {
      return [];
    }
    variant.sizes = [model.size];
    variant.regions = [region];
    if (variant.codename && base.codename !== variant.codename) {
      const updates = updatesGrouped[`${base.otaId}-${variant.codename}`];
      if (updates) {
        // Sort ascending by firmware version
        updates.sort((a, b) => a.fw_version.localeCompare(b.fw_version, 'en'));
        variant.swMajor = updates[0].fw_version.substring(0, 2);
      }
    }
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
      if (['sizes', 'regions'].includes(key) && without(value, ...base[key]).length === 0) {
        delete first[key];
      }
    }
    if (ota_id && first.otaId && first.otaId.substring(0, 10) !== ota_id.substring(0, 10)) {
      // Definitely not right (model year mismatch)
      return false;
    }
    if (!first.sizes && !first.regions && first.otaId) {
      console.warn(`Suspicious variant for model ${model} (${region}, ${ota_id || 'No OTA ID'}), having different machine:`, first);
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

async function writeSummary() {
  const changes = rfc6902.createPatch((await import('../src/models.gen.js')).default, output);
  for (const change of changes) {
    const [model, ...rest] = change.path.split('/').slice(1);
    if (change.op === 'add' && rest.length === 0) {
      console.log(`- new model: ${model}`);
    } else if (change.op === 'add' && rest.length === 2 && rest[0] === 'variants') {
      /** @type {DeviceModelVariantData} */
      const value = change.value;
      if (!value.machine && value.codename) {
        console.log(`- major update: ${model} got ${value.codename}`);
      }
    }
  }
}

await writeSummary();

// language=JavaScript
const header = '/** @type {Record<string, DeviceModelData>} */\nexport default ';
fs.writeFileSync("src/models.gen.js", header + JSON.stringify(output, null, 2));