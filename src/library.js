import exploits from "./exploits.gen.js";
import models from "./models.gen.js";

export class DeviceExploitAvailabilities {

  /**
   * @param {string} otaId
   * @returns {DeviceExploitAvailabilities | undefined}
   */
  static byOTAID(otaId) {
    return exploits[otaId];
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