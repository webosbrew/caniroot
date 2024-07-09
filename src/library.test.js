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
    assert.strictEqual(DeviceModelName.parse('ART90E6QA').class, 'ART');
    assert.strictEqual(DeviceModelName.parse('65NANO86VPA').series, 'NANO86');
    assert.strictEqual(DeviceModelName.parse('65NANO86VPA').class, 'NANO');
    assert.strictEqual(DeviceModelName.parse('OLED65A1PUA').series, 'OLEDA1');
    assert.strictEqual(DeviceModelName.parse('OLED65A1PUA').class, 'OLED');
    assert.strictEqual(DeviceModelName.parse('43LF6300-UA').series, 'LF63');
    assert.strictEqual(DeviceModelName.parse('43LF6300-UA').class, 'TV');
    assert.strictEqual(DeviceModelName.parse('OLED65W7V.AEE').series, 'OLEDW7');
    assert.strictEqual(DeviceModelName.parse('OLED65W7V.AEE').suffix, '.AEE');
    assert.strictEqual(DeviceModelName.parse('55SM8100PJB').tdd, 'PJB');
    assert.strictEqual(DeviceModelName.parse('55OLEDC3PJA.AJLG').suffix, '.AJLG');
    assert.strictEqual(DeviceModelName.parse('55OLEDC3PJA.AJLG').series, 'OLEDC3');
    assert.strictEqual(DeviceModelName.parse('105UC9.AHK').size, 105);
    assert.strictEqual(DeviceModelName.parse('42LX3QKNA').series, 'LX3Q');
    assert.strictEqual(DeviceModelName.parse('55LX1TPSA').series, 'LX1T');
  });

  it('should fail on non-LG TV models', () => {
    assert.strictEqual(DeviceModelName.parse('UA43AU7000KXXM'), undefined);
  });

  it('should find the model', {only: true}, () => {
    assert.strictEqual(DeviceModel.find('55SM8100PJB').broadcast, 'arib');
    assert.strictEqual(DeviceModel.find('SM8100PJB').machine, 'm16p3');
    assert.deepEqual(DeviceModel.find('43UN7340PVC').regions, ['AU', 'NZ']);
    assert.strictEqual(DeviceModel.find('43UJ750V').series, 'UJ75');
    assert.strictEqual(DeviceModel.find('55LB7200').series, 'LB72');
    assert.strictEqual(DeviceModel.find('55SK7900PLA').series, 'SK79');
    assert.strictEqual(DeviceModel.find('43UH668V-ZA').series, 'UH66');
    assert.strictEqual(DeviceModel.find('105UC9.AHK').series, 'UC9');
    assert.strictEqual(DeviceModel.find('UM7380PJA').model, 'UM7380PJE');
    assert.strictEqual(DeviceModel.find('UM7380PJ').model, 'UM7380PJE');
    assert.strictEqual(DeviceModel.find('OLED55B6D.AHK').model, 'OLEDB6D');
    assert.strictEqual(DeviceModel.find('55LX1TPSA').codename, 'ombre');
    assert.strictEqual(DeviceModel.find('UK6540PTA').codename, 'goldilocks');
  });

  it('should match QNED/NANO models accurately', () => {
    assert.strictEqual(DeviceModel.find('50NANO766QA').otaId, 'HE_DTV_W22P_AFADATAA');
    assert.ok(DeviceModel.find('NANO75SQA.ATR').regions.indexOf('IN') >= 0);
    assert.strictEqual(DeviceModel.find('NANO75SQA.ATR').model, 'NANO75SQA');

    assert.ok(!DeviceModel.find('QNED85'));
    assert.strictEqual(DeviceModel.find('QNED85UQA').codename, 'mullet');
    assert.ok(DeviceModel.find('QNED85UQA').variants.find((v) => v.codename === 'number1'));
  });

  it('should treat same model with different region as similar', () => {
    assert.ok(DeviceModelName.parse('NANO806PA')._similarModel('NANO809PA'));
    assert.ok(!DeviceModelName.parse('NANO916NA')._similarModel('NANO916PA'));

    assert.ok(DeviceModelName.parse('QNED90TAA')._similarModel('QNED90TJA'));
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

    assert.ok(DeviceModel.findAll('SM8100').length);
    assert.ok(DeviceModel.findAll('OLEDG3').length);
    assert.ok(DeviceModel.findAll('UK6540PTA').length);
  });

  it('should find by strict match', () => {
    // Newer model with last 3 digits should ignore the suffix
    assert.strictEqual(DeviceModel.find('UM7340PVA.ANR', true).model, 'UM7340PVA');
    assert.ok(DeviceModel.find('UM7340PVA', true));

    // Older models should match the suffix
    assert.strictEqual(DeviceModel.find('OLED55C7D.AEU', true).model, 'OLEDC7D');
    assert.strictEqual(DeviceModel.find('OLED55C7D', true), undefined);
  });

  it('should return record for known models', {only: true}, () => {
    assert.ok(DeviceModel.all);
  });
});
