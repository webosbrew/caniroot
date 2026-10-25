import {describe, it} from "node:test";
import updates from "./data/fw-updates.json" with {type: "json"};
import epks from "./data/model-epks.json" with {type: "json"};
import {minorMajor, regionBroadcasts} from "./mappings.js";
import assert from "node:assert";
import {parseDeviceModel} from "./device-model.js";
import models from "../src/models.gen.js";

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
    for (/**@type {ModelItem}*/const {model, epk, region} of epks) {
      assert.ok(regionBroadcasts[region], `Missing broadcast mapping for region ${region}`);
      if (!epk?.includes("starfish")) {
        continue;
      }
      const codename = parseDeviceModel(model, epk, region)?.codename;
      assert.ok(codename, `Failed to parse EPK for model ${model}: ${epk}`);
    }
  });

  it('should give every generated model a broadcast and map its regions', {only: true}, () => {
    for (const [model, data] of Object.entries(models)) {
      assert.ok(data.broadcast, `Missing broadcast for model ${model}`);
      for (const region of data.regions) {
        assert.ok(regionBroadcasts[region], `Missing broadcast mapping for region ${region}`);
      }
      for (const variant of data.variants || []) {
        for (const region of variant.regions || []) {
          assert.ok(regionBroadcasts[region], `Missing broadcast mapping for region ${region}`);
        }
      }
    }
  });

});
