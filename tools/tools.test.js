import {describe, it} from "node:test";
import updates from "./data/fw-updates.json" assert {type: "json"};
import epks from "./data/model-epks.json" assert {type: "json"};
import {minorMajor} from "../src/mappings.js";
import assert from "node:assert";
import {parseEpkName} from "./gen-models.js";

describe('mappings', () => {
  it('should map all minor releases', () => {
    for (/**@type {DumpItem}*/const value of updates) {
      if (!value.ota_id.startsWith('HE_DTV_')) {
        continue;
      }
      const [expected, minor] = value.webos_codename.split('-');
      const actual = minorMajor[minor];
      assert.equal(expected, actual,
        `Failed to map ${value.webos_codename}. ${expected} vs ${actual}`);
    }
  });

  it('should have no missing mappings', () => {
    for (/**@type {ModelItem}*/const value of epks) {
      const codename = parseEpkName(value.epk)?.codename;
      assert.ok(codename, `Failed to parse EPK for model ${value.model}: ${value.epk}`);
    }
  });
});