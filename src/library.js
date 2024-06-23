import exploits from "./exploits.gen.js";
import models from "./models.gen.js";

export const DeviceExploitType = {
  NVM: 'nvm',
  RootMyTV: 'rootmytv',
  crashd: 'crashd',
  WTA: 'wta',
  ASM: 'asm',
  DejaVuln: 'dejavuln',
};

export class DeviceExploitAvailabilities {
  /**
   * @param props {Readonly<DeviceExploitAvailabilitiesData & {otaId:string}>}
   */
  constructor(props) {
    Object.assign(this, props);
  }

  /**
   * @param {string} otaId
   * @param {boolean} [exact]
   * @returns {DeviceExploitAvailabilities | undefined}
   */
  static byOTAID(otaId, exact) {
    /** @type {DeviceExploitAvailabilitiesData} */
    let match = exploits[otaId];
    let matchKey = otaId;
    if (!match && !exact) {
      // Find first match ignoring broadcast region
      const prefix = otaId.substring(0, 16);
      for (let [key, value] of Object.entries(exploits)) {
        if (key.startsWith(prefix)) {
          match = value;
          matchKey = key;
          break;
        }
      }
    }
    return match && new DeviceExploitAvailabilities({otaId: matchKey, ...match});
  }
}

export class DeviceModelName {
  /**
   * @param props {Readonly<DeviceModelName>}
   */
  constructor(props) {
    Object.assign(this, props);
  }

  /**
   * @return {string}
   */
  get simple() {
    return this.series + (this.tdd || this.suffix || '');
  }

  /**
   * @param {string} model
   * @returns {DeviceModelName | undefined}
   */
  static parse(model) {
    const devicePatterns = [
      '(OLED(?<osize>\\d{2,3})?(?<oled>\\w{2}))',
      '((?<size>\\d{2,3})?(?<series>(?:ART|NANO|QNED)\\d{2}|[A-Z]{2}\\w{4}|UC\\w{1,2}))',
    ];
    const pattern = `^(?:${devicePatterns.join('|')})(?<tdd>\\w{1,4})?(?<suffix>[.-]\\w+)?$`;
    const match = model.match(pattern);
    if (!match) {
      return undefined;
    }
    const groups = match.groups;
    return new DeviceModelName({
      series: groups.series || `OLED${groups.oled}`,
      size: parseInt(groups.size || groups.osize),
      tdd: groups.tdd,
      suffix: groups.suffix
    });
  }
}

export class DeviceModel {
  /**
   * @param props {DeviceModelData & {model: string}}
   */
  constructor(props) {
    Object.assign(this, props);
  }

  /**
   * @param {string} model
   * @param {boolean} [exact]
   * @returns {DeviceModel | undefined}
   */
  static find(model, exact) {
    const parsed = DeviceModelName.parse(model);
    if (!parsed) {
      return undefined;
    }
    let find = parsed.simple;
    /** @type {DeviceModelData} */
    let match = models[find];
    let matchKey = find;
    if (!match && !exact) {
      // Find first match ignoring model suffix (.ABC)
      find = parsed.series;
      for (let [key, value] of Object.entries(models)) {
        if (value.series === find) {
          match = value;
          matchKey = key;
          break;
        }
      }
    }
    if (!match) {
      return undefined;
    }
    for (const variant of match.variants) {
      if (variant.suffix === parsed.suffix) {
        match = Object.assign({...match}, variant);
        break;
      }
    }
    if (exact && match.suffix !== parsed.suffix) {
      return undefined;
    }
    const exactModel = matchKey + (match.suffix || '');
    return new DeviceModel({model: exactModel, ...match});
  }

  /**
   * @return {Readonly<Record<string, DeviceModelData>>}
   */
  static get all() {
    return models;
  }
}