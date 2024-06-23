/**
 * @typedef {Object} ModelItem
 * @property {string} model
 * @property {string} region
 * @property {string} epk
 */

/**
 * @type {ModelItem[]}
 */
import dump from "./data/model-epks.json" assert {type: "json"};
import fs from "node:fs";
import {machineOtaIdPrefix, minorMajor, otaIdUpgrades} from "./mappings.js";
import {DeviceModelName} from "../src/library.js";

/**
 * @type {Record<string, DeviceModelData>}
 */
let output = {};

/**
 * @param model {DeviceModelName}
 * @param epk {string}
 * @param region {string}
 * @returns {DeviceModelData | undefined}
 */
export function parseDeviceModel(model, epk, region) {
  const match = epk.match([
    /(?:lib32-)?starfish-(?<broadcast>\w+)-secured-(?<machine2>\w+)-/,
    /(?:\d+\.)?(?<minor>\w+)(?:\.(?<machine>\w+)|-(\d+))/
  ].map(r => r.source).join(''));
  if (!match) {
    return undefined;
  }
  const machine = match.groups.machine || match.groups.machine2;
  let otaIds = machineOtaIdPrefix[machine];
  if (!otaIds) {
    return undefined;
  }

  const broadcast = match.groups.broadcast;
  const codename = minorMajor[match.groups.minor];
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

  function otaBroadcast(broadcast) {
    switch (broadcast) {
      case 'arib':
        return 'JAAA';
      case 'dvb':
        return 'ABAA';
      case 'atsc':
        return 'ATAA';
      case 'global':
        switch (otaIdPrefix.substring(0, 6)) {
          case 'HE_MNT':
            return 'GLAA';
          case 'HE_DTV': {
            switch (region) {
              case 'DE':
              case 'IN':
              case 'HK':
              case 'NZ':
              case 'UK':
                return 'ABAA';
              case 'CA':
                return 'ATAA';
              case 'JP':
                return 'JAAA';
            }
          }
        }
        break;
      default:
        return undefined;
    }
  }

  const otaIdSuffix = otaBroadcast(broadcast);
  if (!otaIdSuffix) {
    return undefined;
  }
  return {
    series: model.series, region, broadcast, machine, codename,
    otaId: otaIdPrefix + otaBroadcast(match.groups.broadcast),
    suffix: model.suffix, variants: [],
  }
}

for (const {region, model, epk} of dump) {
  const parsedName = DeviceModelName.parse(model);
  if (!parsedName) {
    console.error(`Failed to parse model name: ${model}`);
    continue;
  }

  const parsedModel = parseDeviceModel(parsedName, epk, region);
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