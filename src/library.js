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
   * @param props {Readonly<DeviceModelNameData>}
   */
  constructor(props) {
    Object.assign(this, props);
  }

  /**
   * @return {string}
   */
  get simple() {
    return this.name + (this.tdd || '');
  }

  /**
   * @param {string} model
   * @returns {DeviceModelName | undefined}
   */
  static parse(model) {
    const devicePatterns = [
      '(OLED(?<osize>\\d{2,3})?(?<oled>\\w{2}))',
      '(?<lsize>\\d{2,3})?(?<lx>LX\\w{2})',
      '((?<size>\\d{2,3})?(?<series>(?:ART|NANO|QNED)\\d{2}|[A-Z]{2}\\w{4}|UC\\w{1,2}))',
    ];
    const pattern = `^(?:${devicePatterns.join('|')})(?<tdd>\\w{1,4})?(?<suffix>[.-]\\w+)?$`;
    const match = model.match(pattern);
    if (!match) {
      return undefined;
    }
    const groups = match.groups;
    const name = groups.series || groups.lx || `OLED${groups.oled}`;
    let series = name;
    if (series.match(/[ELSU][C-T]\d{3}[0-9A-Z]/)) {
      series = series.substring(0, 4);
    }
    return new DeviceModelName({
      name, series,
      size: parseInt(groups.size || groups.lsize || groups.osize),
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
   * @param predicate {(variant: Readonly<DeviceModelVariantData>) => boolean}
   * @returns {DeviceModel|undefined}
   */
  variant(predicate) {
    // noinspection JSCheckFunctionSignatures
    if (predicate(this)) {
      return this;
    }
    const variant = this.variants.find(predicate);
    if (!variant) {
      return undefined;
    }
    // noinspection JSValidateTypes
    /** @type {DeviceModelData & {model:string}} */
    const base = {};
    for (let prop of Object.getOwnPropertyNames(this)) {
      if (prop !== 'variants') {
        base[prop] = this[prop];
      }
    }
    return new DeviceModel(Object.assign(base, variant));
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
      find = parsed.name;
      for (let [key, value] of Object.entries(models)) {
        if (value.name === find) {
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
      if (parsed.suffix && variant.suffix === parsed.suffix) {
        match = Object.assign({...match}, variant);
        delete match.variants;
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
   * @param {string} model
   * @returns {DeviceModel[]}
   */
  static findAll(model) {
    const parsed = DeviceModelName.parse(model);
    if (!parsed) {
      return [];
    }
    let find = parsed.simple;
    /** @type {DeviceModelData} */
    let match = models[find];
    if (match) {
      const exactModel = find + (match.suffix || '');
      return [new DeviceModel({model: exactModel, ...match})];
    }
    return Object.entries(models)
      .filter(([_, value]) => value.name === parsed.name)
      .map(([key, value]) => {
        const exactModel = key + (value.suffix || '');
        return new DeviceModel({model: exactModel, ...value});
      });
  }

  /**
   * @return {Readonly<Record<string, DeviceModelData>>}
   */
  static get all() {
    return models;
  }
}