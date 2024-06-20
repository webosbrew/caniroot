import exploits from "./exploits.gen.js";
import models from "./models.gen.js";

export class DeviceExploitAvailabilities {
  /**
   * @param props {Readonly<DeviceExploitAvailabilities>}
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
    let match = exploits[otaId];
    if (!match && !exact) {
      // Find first match ignoring broadcast region
      const prefix = otaId.substring(0, 16);
      for (let [key, value] of Object.entries(exploits)) {
        if (key.startsWith(prefix)) {
          match = value;
          break;
        }
      }
    }
    return match && new DeviceExploitAvailabilities(match);
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
   * @param {string} model
   * @returns {DeviceModelName | undefined}
   */
  static parse(model) {
    const devicePatterns = [
      '(OLED(?<osize>\\d{2,3})?(?<oled>\\w{2}))',
      '((?<size>\\d{2,3})?(?<series>(?:ART|NANO|QNED)\d{2}|[A-Z]{2}\\w{4}|UC\\w{1,2}))',
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
   * @param props {Readonly<DeviceModel>}
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
    let find = parsed.series + (parsed.tdd || "") + (parsed.suffix || "");
    let match = models[find];
    if (!match && !exact) {
      // Find first match ignoring model suffix (.ABC)
      find = parsed.series + (parsed.tdd || "");
      for (let [key, value] of Object.entries(models)) {
        if (value.series === find || key.replace(/[.-]\w+$/, "") === find) {
          match = value;
          break;
        }
      }
    }
    return match && new DeviceModel(match);
  }

  /**
   *
   * @return {Readonly<Record<string, Readonly<DeviceModel>>>}
   */
  static get all() {
    return models;
  }
}