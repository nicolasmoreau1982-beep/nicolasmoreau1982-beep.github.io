import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import vm from 'node:vm';
import {simulateSmic,simulatePensionAllowance,pensionAllowance} from './model.mjs';
const currentSmicHourly=12.02;
const w=ratios=>ratios.map((ratio,i)=>({id:`${i}`,hourlyGross:currentSmicHourly*ratio,hoursPerYear:1607,weight:1}));
const r=simulateSmic({currentSmicHourly,risePercent:10,workers:w([1,1.05,1.2,1.5,2])});
assert.equal(r.totals.mandatoryAffected,2);assert.equal(r.totals.spilloverAffected,0);
for(const i of [2,3,4])assert.equal(r.rows[i].annualGrossDelta,0);
assert.ok(Math.abs(r.rows[0].hourlyAfter-1.1*currentSmicHourly)<1e-9);
assert.ok(Math.abs(r.rows[1].hourlyAfter-1.1*currentSmicHourly)<1e-9);
const s=simulateSmic({currentSmicHourly,risePercent:10,workers:w([1,1.05,1.2,1.5,2]),spilloverStrength:.35});
assert.equal(s.totals.mandatoryAffected,2);assert.equal(s.totals.spilloverAffected,3);
assert.ok(s.rows[2].indirectIncreaseHourly>s.rows[3].indirectIncreaseHourly);
assert.ok(s.rows[3].indirectIncreaseHourly>s.rows[4].indirectIncreaseHourly);
assert.equal(simulateSmic({currentSmicHourly,risePercent:10,workers:[{...w([1])[0],eligible:false}]}).totals.annualGrossPayDelta,0);
assert.throws(()=>simulateSmic({currentSmicHourly,risePercent:10,workers:w([1,1]),spilloverStrength:5}));
assert.throws(()=>simulateSmic({currentSmicHourly,risePercent:10,workers:[w([1])[0],w([1])[0]]}));
assert.equal(pensionAllowance([1000]),454);assert.equal(pensionAllowance([300]),300);
assert.equal(pensionAllowance([65000]),4439);assert.equal(pensionAllowance([10000,10000]),2000);
assert.equal(pensionAllowance([60000,60000]),4439);assert.equal(pensionAllowance([0,0]),0);
const dir=dirname(fileURLToPath(import.meta.url)),ctx={window:{}};vm.createContext(ctx);
vm.runInContext(readFileSync(resolve(dir,'../../dist/fiscal-individuel-570.js'),'utf8'),ctx);
const calculateIncomeTax=ctx.window.ECOSIM_FISCAL_INDIVIDUEL_570.calculate;
const households=[
 {id:'small',pensions:[15000],referenceTaxIncome:15000,netTaxableIncome:13500,householdType:'single',children:0,weight:1},
 {id:'large',pensions:[65000],referenceTaxIncome:70000,netTaxableIncome:60561,householdType:'single',children:0,weight:1},
 {id:'poor-pension-but-rich-household',pensions:[15000],referenceTaxIncome:90000,netTaxableIncome:95000,householdType:'couple',children:0,weight:1}
];
const opt=(reform)=>simulatePensionAllowance({households,reform,calculateIncomeTax});
const removal=opt({type:'remove_above_rfr',rfrThreshold:60000});
assert.equal(removal.rows[0].allowanceBefore,removal.rows[0].allowanceAfter);
assert.equal(removal.rows[1].allowanceAfter,0);
assert.equal(removal.rows[2].allowanceAfter,0);
assert.ok(removal.rows[1].taxAfter>removal.rows[1].taxBefore);
assert.ok(removal.rows[2].taxAfter>=removal.rows[2].taxBefore);
const phase=opt({type:'phase_out_above_rfr',rfrThreshold:60000,phaseOutWidth:20000});
assert.equal(phase.rows[1].selectedFraction,.5);assert.equal(phase.rows[0].selectedFraction,0);
const cap=opt({type:'cap_above_rfr',rfrThreshold:60000,newCap:3000});
assert.equal(cap.rows[1].allowanceAfter,3000);
assert.equal(cap.rows[2].allowanceAfter,1500);
assert.throws(()=>opt({type:'phase_out_above_rfr',rfrThreshold:60000,phaseOutWidth:0}));
assert.throws(()=>opt({type:'cap_above_rfr',rfrThreshold:60000,newCap:5000}));
console.log('Prototype 5.7.3 ciblage SMIC et abattement pensions : tests OK (non représentatif, sans couplage macro).');
