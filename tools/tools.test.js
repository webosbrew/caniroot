import {describe, it} from "node:test";
import updates from "./data/fw-updates.json" with {type: "json"};
import epks from "./data/model-epks.json" with {type: "json"};
import {minorMajor, regionBroadcasts} from "./mappings.js";
import assert from "node:assert";
import {parseDeviceModel} from "./device-model.js";
import models from "../src/models.gen.js";
import {DeviceModelName} from "../src/library.js";

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

  it('should infer the OTA ID for k26t firmware', {only: true}, () => {
    const model = DeviceModelName.parse('32LX6BEGA');
    const epk = 'starfish-global-secured-k26t-qianshan-3701-43.11.31_prodkey_usb_V3_SECURED.epk';
    assert.strictEqual(parseDeviceModel(model, epk, 'KR')?.otaId, 'HE_DTV_N26D_AFADATAA');
  });

  it('should infer the OTA ID for k25lpnlm firmware', {only: true}, () => {
    const model = DeviceModelName.parse('50NU700BPUA.ACC');
    const epk = 'lib32-starfish-global-secured-k25lpnlm-qausui-6212-43.02.86_prodkey_usb_V3_SECURED.epk';
    assert.strictEqual(parseDeviceModel(model, epk, 'CA')?.otaId, 'HE_DTV_W26N_AFADATAA');
  });
});
