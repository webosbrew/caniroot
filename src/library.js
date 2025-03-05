import exploits from "./exploits.gen.js";
import models from "./models.gen.js";

// noinspection JSUnusedGlobalSymbols
export const DeviceExploitType = {
  NVM: 'nvm',
  RootMyTV: 'rootmytv',
  crashd: 'crashd',
  WTA: 'wta',
  ASM: 'asm',
  DejaVuln: 'dejavuln',
  FaultManager: 'faultmanager',
  MVPD: 'mvpd',
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
   * @param {string} [codename]
   * @param {boolean} [exact]
   * @returns {DeviceExploitAvailabilities | undefined}
   */
  static byOTAID(otaId, codename, exact) {
    /**
     * @param {Record<string, DeviceExploitAvailabilities>} v
     * @return {DeviceExploitAvailabilitiesData | undefined}
     **/
    function findData(v) {
      return v && (codename ? v[codename] : v[Object.keys(v)[0]]);
    }

    /** @type {DeviceExploitAvailabilitiesData} */
    let match = findData(exploits[otaId]);
    let matchKey = otaId;
    if (!match && !exact) {
      // Find first match ignoring broadcast region
      const prefix = otaId.substring(0, 16);
      /** @type {[string, DeviceExploitAvailabilitiesData | Record<string, DeviceExploitAvailabilitiesData>]} */
      for (let [key, value] of Object.entries(exploits)) {
        if (!key.startsWith(prefix)) {
          continue;
        }
        match = findData(value);
        if (!match) {
          continue;
        }
        matchKey = key;
        break;
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
   * @return {string}
   */
  get sized() {
    if (this.class === 'OLED') {
      return `OLED${this.size}${this.simple.substring(4)}`
    }
    return `${this.size}${this.simple}`;
  }

  /**
   * @param {string} model
   * @returns {DeviceModelName | undefined}
   */
  static parse(model) {
    const devicePatterns = [
      /(OLED(?<osize>\d{2,3})?(?<oled>\w{2}))/,
      /(?<xsize>\d{2})?(?<xseries>LX\d\w)/,
      /((?<qsize>\d{2,3})?(?<qseries>(?<anq>ART|NANO|QNED)[0-9][0-9A-Z]|UC\w{1,2}))/,
      /(?<lsize>\d{2,3})?(?<lseries>[ELSUJ][A-Z][0-9][0-9A-Z]{3})/,
    ];
    const pattern = `^(?:${devicePatterns.map(p => p.source).join('|')})(?<tdd>\\w{1,4})?(?<suffix>[.-]\\w+)?$`;
    const match = model.match(pattern);
    if (!match) {
      return undefined;
    }
    const groups = match.groups;
    const modelClass = groups.anq || (groups.oled && 'OLED') || (groups.xseries && 'LX') || 'TV';
    const name = groups.xseries || groups.qseries || groups.lseries || (groups.oled && `OLED${groups.oled}`);
    const series = groups.lseries?.substring(0, 4) || name;
    return new DeviceModelName({
      name, class: modelClass, series,
      size: parseInt(groups.xsize || groups.qsize || groups.lsize || groups.osize),
      tdd: groups.tdd,
      suffix: groups.suffix
    });
  }

  /**
   * @param match {string}
   * @return {boolean}
   * @package
   */
  _similarModel(match) {
    if (!match.startsWith(this.name)) {
      return false;
    }
    if (this.class === 'QNED' || this.class === 'NANO') {
      if (this.tdd?.length !== 3) {
        return false;
      }
      // Check last 3 digits for QNED and NANO
      // For QNED, when the last 3 digit starts with 'T' it's a 2024 model
      if (this.class === 'QNED' && this.tdd[0] === 'T') {
        return match[this.name.length] === 'T';
      }
      // Otherwise, match the digit in the middle of last 3 digits
      return this.tdd[1] === match[this.name.length + 1];
    }
    return true;
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
    const variant = this.variants?.find(predicate);
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
      const matches = Object.entries(models)
        .filter(([k]) => parsed._similarModel(k))
        .sort(([k1], [k2]) => this._lenSuffixDiff(k1, find) - this._lenSuffixDiff(k2, find));
      if (matches.length > 0) {
        [matchKey, match] = matches[0];
      }
    }
    if (!match) {
      return undefined;
    }
    const coarse = new DeviceModel({model: matchKey, ...match});
    if (exact) {
      return coarse.variant((v) => {
        return parsed.tdd?.length >= 3 || v.suffix === parsed.suffix;
      });
    }
    return coarse;
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
      .filter(([key]) => parsed._similarModel(key))
      .sort(([k1], [k2]) => this._lenSuffixDiff(k1, find) - this._lenSuffixDiff(k2, find))
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

  /**
   * Get length of different suffixes between two strings
   * @param k {string}
   * @param f {string}
   * @return {number}
   * @private
   */
  static _lenSuffixDiff(k, f) {
    let i = 0, j = Math.min(k.length, f.length);
    for (; i < j; i++) {
      if (k[i] !== f[i]) {
        break;
      }
    }
    return Math.max(k.length, f.length) - i;
  }

}
