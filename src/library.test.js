import {describe, it} from 'node:test';
import {DeviceExploitAvailabilities, DeviceModel, DeviceModelName} from "./library.js";
import * as assert from "node:assert";

describe('DeviceExploitAvailabilities', {only: true}, () => {
  it('should find for a valid OTA ID', () => {
    assert.ok(DeviceExploitAvailabilities.byOTAID('HE_DTV_W20L_AFAAJAAA'));
    assert.ok(DeviceExploitAvailabilities.byOTAID('HE_DTV_W12L_AFAAJAAA') === undefined);
  });

  it('should find same machine with different broadcast region', () => {
    assert.ok(DeviceExploitAvailabilities.byOTAID('HE_DTV_W22H_AFADJAAA', true) === undefined);
    assert.ok(DeviceExploitAvailabilities.byOTAID('HE_DTV_W22H_AFADJAAA', false));
  });
});

describe('DeviceModel', {only: true}, () => {
  it('should parse LG TV models', () => {
    assert.strictEqual(DeviceModelName.parse('ART90E6QA').series, 'ART90');
    assert.strictEqual(DeviceModelName.parse('65NANO86VPA').series, 'NANO86');
    assert.strictEqual(DeviceModelName.parse('OLED65A1PUA').series, 'OLEDA1');
    assert.strictEqual(DeviceModelName.parse('43LF6300-UA').series, 'LF6300');
    assert.strictEqual(DeviceModelName.parse('OLED65W7V-T').series, 'OLEDW7');
    assert.strictEqual(DeviceModelName.parse('OLED65W7V-T').suffix, '-T');
    assert.strictEqual(DeviceModelName.parse('55SM8100PJB').tdd, 'PJB');
    assert.strictEqual(DeviceModelName.parse('55OLEDC3PJA.AJLG').suffix, '.AJLG');
    assert.strictEqual(DeviceModelName.parse('55OLEDC3PJA.AJLG').series, 'OLEDC3');
    assert.strictEqual(DeviceModelName.parse('105UC9.AHK').size, 105);
  });

  it('should fail on non-LG TV models', () => {
    assert.strictEqual(DeviceModelName.parse('UA43AU7000KXXM'), undefined);
  });

  it('should find the model', {only: true}, () => {
    assert.strictEqual(DeviceModel.find('55SM8100PJB').broadcast, 'arib');
    assert.strictEqual(DeviceModel.find('SM8100PJB').machine, 'm16p3');
    assert.strictEqual(DeviceModel.find('43UN7340PVC').region, 'NZ');
    assert.strictEqual(DeviceModel.find('50NANO766QA').otaId, 'HE_DTV_W22P_AFADATAA');
    assert.strictEqual(DeviceModel.find('43UJ750V').series, 'UJ750V');
    assert.strictEqual(DeviceModel.find('55LB7200').series, 'LB7200');
    assert.strictEqual(DeviceModel.find('55SK7900PLA').series, 'SK7900');
    assert.strictEqual(DeviceModel.find('43UH668V-ZA').series, 'UH668V');
    assert.strictEqual(DeviceModel.find('105UC9.AHK').series, 'UC9');
    assert.strictEqual(DeviceModel.find('NANO75SQA.ATRG').region, 'IN');
    assert.strictEqual(DeviceModel.find('NANO75SQA.ATRG').model, 'NANO75SQA.ATRG');
    assert.ok(DeviceModel.find('UC9700'));
    assert.ok(DeviceModel.find('SM8100'));
  });

  it('should return record for known models', {only: true}, () => {
    assert.ok(DeviceModel.all);
  });
});
