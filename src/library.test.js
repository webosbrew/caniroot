import {describe, it} from 'node:test';
import {DeviceExploitAvailabilities, DeviceModel} from "./library.js";
import * as assert from "node:assert";

describe('DeviceExploitAvailabilities', () => {
  it('should find for a valid OTA ID', () => {
    assert.ok(DeviceExploitAvailabilities.byOTAID('HE_DTV_W20L_AFAAJAAA'));
    assert.ok(DeviceExploitAvailabilities.byOTAID('HE_DTV_W12L_AFAAJAAA') === undefined);
  });

  it('should find same machine with different broadcast region', () => {
    assert.ok(DeviceExploitAvailabilities.byOTAID('HE_DTV_W22H_AFADJAAA', true) === undefined);
    assert.ok(DeviceExploitAvailabilities.byOTAID('HE_DTV_W22H_AFADJAAA', false));
  });
});

describe('DeviceModel', () => {
  it('should remove the size from the model name', () => {
    assert.strictEqual(DeviceModel.modelNameSimplified('65NANO86VPA'), 'NANO86VPA');
    assert.strictEqual(DeviceModel.modelNameSimplified('OLED65A1PUA'), 'OLEDA1PUA');
    assert.strictEqual(DeviceModel.modelNameSimplified('43LF6300-UA'), 'LF6300-UA');
    assert.strictEqual(DeviceModel.modelNameSimplified('OLED65W7V-T'), 'OLEDW7V-T');
    assert.strictEqual(DeviceModel.modelNameSimplified('55SM8100PJB'), 'SM8100PJB');
  });

  it('should find the model', () => {
    assert.strictEqual(DeviceModel.findModel('55SM8100PJB').broadcast, 'arib');
    assert.strictEqual(DeviceModel.findModel('SM8100PJB').machine, 'm16p3');
    assert.strictEqual(DeviceModel.findModel('43UN7340PVC').region, 'NZ');
    assert.strictEqual(DeviceModel.findModel('50NANO766QA').otaId, 'HE_DTV_W22P_AFADATAA');
    assert.ok(DeviceModel.findModel('43UJ750V'));
    assert.ok(DeviceModel.findModel('55LB7200'));
    assert.ok(DeviceModel.findModel('55SK7900PLA'));
    assert.ok(DeviceModel.findModel('43UH668V-ZA'));
    assert.ok(DeviceModel.findModel('105UC9.AHK'));
    assert.ok(DeviceModel.findModel('UC9700'));
    // Needs region
    assert.ok(!DeviceModel.findModel('SM8100'));
  });
});
