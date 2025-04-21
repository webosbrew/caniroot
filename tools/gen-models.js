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
import {regionBroadcasts, upgradedOtaIds} from "./mappings.js";
import {DeviceModelName} from "../src/library.js";
import {chain, concat, filter, groupBy, isEqual, sortBy, sortedUniq, uniqBy, without} from "lodash-es";
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
  group = sortBy(group, v => {
    let prefix = v.epk ? 'a' : 'z';
    prefix += v.ota_id ? 'a' : 'z';
    let region = knownRegions.indexOf(v.region);
    prefix += region < 0 ? '_' : region.toString(36);
    const groups = v.epk?.match(epkNameRegex)?.groups;
    const minor = groups?.minor;
    return `${prefix}-${minor}-${v.model.sized}`;
  });
  /** @type {GroupedModelItem[]} */
  const items = group;
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
        console.log(`- model ${model} got major firmware update: ${value.codename}`);
      }
    }
  }
}

await writeSummary();

// language=JavaScript
const header = '/** @type {Record<string, DeviceModelData>} */\nexport default ';
fs.writeFileSync("src/models.gen.js", header + JSON.stringify(output, null, 2));