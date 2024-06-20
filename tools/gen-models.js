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
import {machineOtaIdPrefix, minorMajor} from "../src/mappings.js";
import {DeviceModelName} from "../src/library.js";

/**
 * @type {Record<string, DeviceModel>}
 */
let output = {};

/**
 * @param model {string}
 * @param name {string}
 * @param region {string}
 * @returns {DeviceModel | undefined}
 */
export function parseDeviceModel(model, name, region) {
  const match = name.match([
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
          case 'HE_DTV':
            return 'ATAA';
          default:
            return '';
        }
      default:
        return '';
    }
  }

  let parsed = DeviceModelName.parse(model);

  if (!parsed) {
    return undefined;
  }

  return {
    series: parsed.series, region, broadcast, machine, codename,
    otaId: otaIdPrefix + otaBroadcast(match.groups.broadcast),
  }
}

for (const {region, model, epk} of dump) {
  const parsed = parseDeviceModel(model, epk, region);
  if (!parsed) {
    console.error(`Failed to parse EPK for model ${model}: ${epk}`);
    continue;
  }
  output[model] = parsed;
}

// language=JavaScript
const header = '/** @type {Record<string, DeviceModel>} */\nexport default ';
fs.writeFileSync("src/models.gen.js", header + JSON.stringify(output, null, 2));