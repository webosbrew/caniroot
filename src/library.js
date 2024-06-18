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
      .replace(/^((OLED)\d{2}|\d{2})([A-Z0-9-]+)(\.[A-Z0-9]+)?$/i, (_match, _g1, g2, g3) => (g2 || '') + g3)
      .toUpperCase();
  }

  static findModel(model) {
    return models[this.modelNameSimplified(model)];
  }
}