/**
 * @typedef {Object} ModelItem
 * @property {string} model
 * @property {string} region
 * @property {string} epk
 * @property {string} [ota_id]
 */

/**
 * @type {ModelItem[]}
 */
import dump from "./data/model-epks.json" assert {type: "json"};
import fs from "node:fs";
import {machineOtaIdPrefix, minorMajor, otaIdUpgrades, regionBroadcasts} from "./mappings.js";
import {DeviceModelName} from "../src/library.js";

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
 * @param model {DeviceModelName}
 * @param epk {string}
 * @param region {string}
 * @param [otaId] {string}
 * @returns {DeviceModelData | undefined}
 */
export function parseDeviceModel(model, epk, region, otaId) {
  const match = epk.match([
    /(?:lib32-)?starfish-(?<broadcast>\w+)-secured-(?<machine2>\w+)-/,
    /(?:\d+\.)?(?<minor>\w+)(?:\.(?<machine>\w+)|-(\d+))/
  ].map(r => r.source).join(''));
  if (!match) {
    return undefined;
  }
  const machine = match.groups.machine || match.groups.machine2;
  const codename = minorMajor[match.groups.minor];

  if (!otaId) {
    let otaIds = machineOtaIdPrefix[machine];
    if (!otaIds) {
      return undefined;
    }

    const otaIdPrefix = otaIds.map(otaId => {
      if (typeof otaId === 'string') {
        return otaId;
      }
      if (otaId.codename === codename) {
        return otaId.otaId;
      }
      return null;
    }).filter((x) => !!x)[0];

    if (!otaIdPrefix) {
      return undefined;
    }
    const otaIdSuffix = inferOtaIdBroadcastSuffix(otaIdPrefix, match.groups.broadcast);
    if (!otaIdSuffix) {
      return undefined;
    }
    otaId = otaIdPrefix + otaIdSuffix;
  }

  const broadcast = inferBroadcast(match.groups.broadcast, otaId, region);

  return {
    series: model.series, region, broadcast, machine, codename, otaId,
    suffix: model.suffix, variants: [],
  }
}

for (const {region, model, epk, ota_id} of dump) {
  const parsedName = DeviceModelName.parse(model);
  if (!parsedName) {
    console.error(`Failed to parse model name: ${model}`);
    continue;
  }

  const parsedModel = parseDeviceModel(parsedName, epk, region, ota_id);
  if (!parsedModel) {
    console.error(`Failed to parse EPK for model ${model}: ${epk}`);
    continue;
  }
  if (output[parsedName.simple]) {
    const variants = output[parsedName.simple].variants;
    if (parsedName.suffix !== output[parsedName.simple].suffix &&
      !variants.find(x => x.suffix === parsedName.suffix)) {
      delete parsedModel.variants;
      for (const [k, v] of Object.entries(output[parsedName.simple])) {
        if (parsedModel[k] === v) {
          delete parsedModel[k];
        }
      }
      variants.push(parsedModel);
    }
    variants.sort((a, b) => {
      const sa = a.suffix;
      const sb = b.suffix;
      if (!sa) {
        return sb ? -1 : 0;
      } else if (!sb) {
        return 1;
      }
      return sa.localeCompare(sb);
    });
    continue;
  } else if (otaIdUpgrades[parsedModel.otaId]) {
    parsedModel.variants.push(otaIdUpgrades[parsedModel.otaId]);
  }
  output[parsedName.simple] = parsedModel;
}

// language=JavaScript
const header = '/** @type {Record<string, DeviceModelData>} */\nexport default ';
fs.writeFileSync("src/models.gen.js", header + JSON.stringify(output, null, 2));