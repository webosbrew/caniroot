import {machineOtaIdPrefix, minorMajor, regionBroadcasts} from "./mappings.js";

/**
 * @param broadcast {string}
 * @param otaIdPrefix {string}
 * @param region {string}
 * @return {string|undefined}
 */
function inferBroadcast(broadcast, otaIdPrefix, region) {
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

export const epkNameRegex = new RegExp([
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