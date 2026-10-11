import {simulateSmic,simulatePensionAllowance} from './model.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const dir=dirname(fileURLToPath(import.meta.url));
const ctx={window:{}};vm.createContext(ctx);
vm.runInContext(readFileSync(resolve(dir,'../../dist/fiscal-individuel-570.js'),'utf8'),ctx);
const tax=ctx.window.ECOSIM_FISCAL_INDIVIDUEL_570.calculate;
const employees=[1,1.05,1.2,1.5,2,3].map((ratio,i)=>({id:`S${i+1}`,hourlyGross:12.02*ratio,hoursPerYear:1607,weight:1}));
const pensionHouseholds=[
 {id:'petite-pension',pensions:[15000],netTaxableIncome:13500,referenceTaxIncome:14000,householdType:'single',children:0,weight:1},
 {id:'pension-moyenne',pensions:[30000],netTaxableIncome:27000,referenceTaxIncome:28500,householdType:'single',children:0,weight:1},
 {id:'forte-pension',pensions:[65000],netTaxableIncome:60561,referenceTaxIncome:70000,householdType:'single',children:0,weight:1},
 {id:'couple-mixte',pensions:[18000],netTaxableIncome:85000,referenceTaxIncome:90000,householdType:'couple',children:0,weight:1}
];
const report={
 status:'DEMONSTRATION_NON_REPRESENTATIVE',
 smicLegal:simulateSmic({currentSmicHourly:12.02,risePercent:10,workers:employees}),
 smicWithAssumedSpillover:simulateSmic({currentSmicHourly:12.02,risePercent:10,workers:employees,spilloverStrength:.35,spilloverDecay:.5}),
 pensionTargeted:simulatePensionAllowance({households:pensionHouseholds,reform:{type:'phase_out_above_rfr',rfrThreshold:55000,phaseOutWidth:25000},calculateIncomeTax:tax}),
 pensionCapProposal:simulatePensionAllowance({households:pensionHouseholds,reform:{type:'cap_above_rfr',rfrThreshold:55000,newCap:3000},calculateIncomeTax:tax})
};
console.log(JSON.stringify(report,null,2));
