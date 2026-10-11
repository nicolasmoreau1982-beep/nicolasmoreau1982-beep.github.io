/* EcoSim France 5.5 — moteur témoin par cohortes. Aucune dépendance au coeur macro.
 * Méthode : risques concurrents mensuels ; paramètres exclusivement « avant réforme ».
 * Les observations après réforme sont gardées dans un fichier distinct. */
(function(root){
  'use strict';
  const KEYS=['fullTime','partTime','unemployed','inactive','retired'];
  const PRE_REFORM={
    men:{fullTime:.24,partTime:.04,unemployed:.04,inactive:.11,retired:.57},
    women:{fullTime:.23,partTime:.16,unemployed:.04,inactive:.16,retired:.40}
  };
  // Transitions annuelles « avant réforme », tableau Insee, figure 4, emploi regroupé.
  // Seules les destinations NON RETRAITE servent à redistribuer les non-retraités.
  const BEFORE_TRANSITIONS={
    employed:{employed:.818,unemployed:.012,inactive:.024,retired:.145},
    unemployed:{employed:.310,unemployed:.451,inactive:.042,retired:.197},
    inactive:{employed:.011,unemployed:.020,inactive:.527,retired:.442}
  };
  const ageTable={1952:729,1953:734,1954:739};
  function legalAgeMonths(year,month=1,mode='reform'){
    if(!Number.isInteger(year)||!Number.isInteger(month)||month<1||month>12)throw Error('Année/mois de naissance invalides');
    if(mode==='baseline')return 720;
    if(mode==='reform2010'){
      if(year<1951||year===1951&&month<=6)return 720;
      if(year===1951)return 724;
      if(year>=1956)return 744;
      return {1952:728,1953:732,1954:736,1955:740}[year];
    }
    if(mode!=='reform')throw Error('Mode de réforme inconnu');
    if(year<1951||year===1951&&month<=6)return 720;
    if(year===1951)return 724;
    if(year>=1955)return 744;
    return ageTable[year];
  }
  function initial(sex){
    if(!(sex in PRE_REFORM))throw Error('Sexe non documenté');
    const b=PRE_REFORM[sex];
    // On part à 60 ans juste avant liquidation : pas de retraité initial.
    // Les proportions non retraitées sont tirées de l'estimation avant réforme.
    const denom=b.fullTime+b.partTime+b.unemployed+b.inactive;
    return {fullTime:b.fullTime/denom,partTime:b.partTime/denom,unemployed:b.unemployed/denom,inactive:b.inactive/denom,retired:0};
  }
  function checkState(s){
    if(KEYS.some(k=>!Number.isFinite(s[k])||s[k]<-1e-10||s[k]>1+1e-10))throw Error('Parts invalides');
    if(Math.abs(KEYS.reduce((v,k)=>v+s[k],0)-1)>1e-9)throw Error('Conservation des cohortes rompue');
  }
  function monthlyTransition(s,sex,eligible){
    const next={fullTime:0,partTime:0,unemployed:0,inactive:0,retired:s.retired};
    const b=PRE_REFORM[sex];
    // Hazard conditionnel calibré UNIQUEMENT sur la retraite AVANT réforme
    // à l'issue de 12 mois. Pas d'information postérieure utilisée.
    const hazard=eligible?1-Math.pow(1-b.retired,1/12):0;
    for(const origin of KEYS){
      if(origin==='retired')continue;
      const count=s[origin];
      const remaining=count*(1-hazard);
      next.retired+=count*hazard;
      const group=(origin==='fullTime'||origin==='partTime')?'employed':origin;
      const line=BEFORE_TRANSITIONS[group];
      const n=1-line.retired;
      // Passage mensuel conventionnel : flux conditionnels annuels / 12.
      const destinations=group==='employed'?['unemployed','inactive']
        :group==='unemployed'?['employed','inactive']:['employed','unemployed'];
      let leaving=0;
      for(const dest of destinations){
        const qty=remaining*line[dest]/n/12;
        leaving+=qty;
        if(dest==='employed'){
          const ratio=b.fullTime/(b.fullTime+b.partTime);
          next.fullTime+=qty*ratio;next.partTime+=qty*(1-ratio);
        }else next[dest]+=qty;
      }
      next[origin]+=remaining-leaving;
    }
    // Arrondis de la source séparés de la précision interne.
    checkState(next);
    return next;
  }
  function run({birthYear,birthMonth=1,sex='men',mode='reform',months=24}={}){
    if(!Number.isInteger(months)||months<1||months>120)throw Error('Durée invalide');
    const legal=legalAgeMonths(birthYear,birthMonth,mode);
    const history=[];
    let state=initial(sex);
    for(let elapsed=0;elapsed<months;elapsed++){
      const age=720+elapsed;
      state=monthlyTransition(state,sex,age>=legal);
      history.push({ageMonths:age+1,...state});
    }
    return {birthYear,birthMonth,sex,mode,legalAgeMonths:legal,history};
  }
  function compare({birthYear,birthMonth=1,sex,months=12}={}){
    const before=run({birthYear,birthMonth,sex,mode:'baseline',months});
    const after=run({birthYear,birthMonth,sex,mode:'reform',months});
    const p=before.history.at(-1),q=after.history.at(-1);
    const changes=Object.fromEntries(KEYS.map(k=>[k,q[k]-p[k]]));
    return {birthYear,birthMonth,sex,months,before:p,after:q,changes,
      // Unité strictement par 100000 cas hypothétiques, coûts conventionnels.
      // Ne pas additionner au moteur macro (risque de double comptage).
      budgetIllustration:budget(before.history,after.history)};
  }
  function budget(before,after,opts={}){
    const size=opts.cohortSize??100000;
    const pension=opts.pensionMonthlyEur??1600;
    const unemployment=opts.unemploymentMonthlyEur??1000;
    const wage=opts.wageMonthlyEur??2200;
    const contributionRate=opts.contributionRate??.25;
    for(const v of [size,pension,unemployment,wage,contributionRate]){
      if(!Number.isFinite(v)||v<0)throw Error('Hypothèse budgétaire invalide');
    }
    if(contributionRate>1||before.length!==after.length)throw Error('Hypothèse budgétaire incohérente');
    let pensionSaved=0,unemploymentExtra=0,contributionsExtra=0;
    for(let i=0;i<before.length;i++){
      pensionSaved+=(before[i].retired-after[i].retired)*size*pension;
      unemploymentExtra+=(after[i].unemployed-before[i].unemployed)*size*unemployment;
      const jobs=s=>(s.fullTime+s.partTime*.5);
      contributionsExtra+=(jobs(after[i])-jobs(before[i]))*size*wage*contributionRate;
    }
    return {cohortSize:size,months:before.length,pensionSavedEur:pensionSaved,
      unemploymentExtraEur:unemploymentExtra,contributionsExtraEur:contributionsExtra,
      illustrativeNetEur:pensionSaved-unemploymentExtra+contributionsExtra,
      caveat:'Unités hypothétiques, sans coûts de santé/inactivité ni carrière; non intégrable aux APU sans double comptage.'};
  }
  root.EcoSimCohort550=Object.freeze({KEYS,PRE_REFORM,BEFORE_TRANSITIONS,legalAgeMonths,run,compare,budget,checkState});
})(typeof globalThis==='object'?globalThis:this);
