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
    assert.strictEqual(DeviceModel.find('UM7380PJA').model, 'UM7380PJE.AJL');
    assert.strictEqual(DeviceModel.find('UM7380PJ').model, 'UM7380PJE.AJL');
    assert.strictEqual(DeviceModel.find('QNED85UQA').codename, 'mullet');
    assert.strictEqual(DeviceModel.find('QNED85').codename, 'mullet');
    assert.ok(DeviceModel.find('QNED85UQA').variants.find((v) => v.codename === 'number1'));
  });

  it('should find a variant', () => {
    const c2 = DeviceModel.find('OLEDC2PUA');
    assert.ok(c2);
    assert.ok(c2.variant((v) => v.codename === 'mullet'));
    assert.ok(c2.variant((v) => v.codename === 'number1'));
  });

  it('should find by series', () => {
    assert.ok(DeviceModel.find('UC9700'));
    assert.ok(DeviceModel.find('SM8100'));

    assert.ok(DeviceModel.findAll('SM8100').length > 1);
    assert.ok(DeviceModel.findAll('OLEDG3').length > 1);
  });

  it('should find by strict match', () => {
    assert.strictEqual(DeviceModel.find('UM7340PVA.ANR', true).model, 'UM7340PVA.ANR');
    assert.strictEqual(DeviceModel.find('UM7340PVA.ATR', true), undefined);
    assert.strictEqual(DeviceModel.find('UM7340PVA', true), undefined);
  });

  it('should return record for known models', {only: true}, () => {
    assert.ok(DeviceModel.all);
  });
});
