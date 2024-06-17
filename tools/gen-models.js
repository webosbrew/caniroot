/**
 * @typedef {Object} ModelItem
 * @property {string} model
 * @property {string} epk
 */

/**
 * @type {ModelItem[]}
 */
import dump from "./data/model-epks.json" assert {type: "json"};
import fs from "node:fs";
import {machineOtaIdPrefix, minorMajor} from "../src/mappings.js";

/**
 * @type {Record<string, DeviceModel>}
 */
let output = {};

/**
 * @param name {string}
 * @returns {DeviceModel | undefined}
 */
export function parseEpkName(name) {
  const match = name.match(/(?:lib32-)?starfish-(?<broadcast>\w+)-secured-(?<machine>\w+)-(?:\d+\.)?(?<minor>\w+)/);
  if (!match) {
    return undefined;
  }
  let otaIds = machineOtaIdPrefix[match.groups.machine];
  if (!otaIds) {
    return undefined;
  }

  /**
   * @type {string}
   */
  const otaIdPrefix = otaIds[0];

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

  return {
    broadcast: match.groups.broadcast,
    machine: match.groups.machine,
    codename: minorMajor[match.groups.minor],
    otaId: otaIdPrefix + otaBroadcast(match.groups.broadcast),
  }
}

for (const {model, epk} of dump) {
  const parsed = parseEpkName(epk);
  if (!parsed) {
    console.error(`Failed to parse EPK for model ${model}: ${epk}`);
    continue;
  }
  output[model] = parsed;
}

// language=JavaScript
const header = '/** @type {Record<string, DeviceModel>} */\nexport default ';
fs.writeFileSync("src/models.gen.js", header + JSON.stringify(output, null, 2));