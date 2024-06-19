import exploits from "./exploits.gen.js";
import models from "./models.gen.js";

export class DeviceExploitAvailabilities {

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
    return match;
  }
}

export class DeviceModel {
  /**
   * @param {string} model
   * @returns {string}
   */
  static modelNameSimplified(model) {
    return model
      .replace(/^((OLED)\d{2,3}|\d{2,3})([A-Z0-9-]+)(\.[A-Z0-9]+)?$/i, "$2$3")
      .toUpperCase();
  }

  /**
   * @param {string} model
   * @param {boolean} [exact]
   * @returns {DeviceModel | undefined}
   */
  static findModel(model, exact) {
    const find = this.modelNameSimplified(model);
    let match = models[find];
    if (!match && !exact) {
      // Find first match ignoring model suffix (.ABC)
      const prefix = find.replace(/[.-]\w+$/, "");
      for (let [key, value] of Object.entries(models)) {
        if (value.series === prefix || key.replace(/[.-]\w+$/, "") === prefix) {
          match = value;
          break;
        }
      }
    }
    return match;
  }
}