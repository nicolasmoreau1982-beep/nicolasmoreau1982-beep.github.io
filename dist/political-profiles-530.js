/* EcoSim 5.3 — correspondances doctrinales *éditoriales*, jamais des coefficients officiels.
   Les profils économiques sont des sensibilités techniques. Aucune formation ne « choisit »
   le multiplicateur qui la favorise, et aucun scénario sans correspondance claire n'est forcé. */
window.ECOSIM_POLITICAL_PROFILES_530 = (() => {
  const entries = {
    current: {
      technical: { model: null, reason: 'Témoin comptable : aucune doctrine politique.' },
      rn: { model: null, reason: 'Protection, souveraineté, fiscalité et intervention publique : aucun des neuf profils ne reproduit cet ensemble de positions.', url: 'https://rassemblementnational.fr/documents/202406-programme.pdf', source: 'RN, programme législatif 2024' },
      epr: { model: 'supply', reason: 'Lecture possible des mesures de compétitivité, d’innovation et de réformes de l’offre. Une doctrine ne démontre pas les multiplicateurs du profil.', url: 'https://parti-renaissance.fr/', source: 'Renaissance, propositions et orientations' },
      lfi: { model: 'keynesian', reason: 'Lecture possible de la relance par les salaires, la redistribution, les services publics et l’investissement. Le document du NFP ne chiffre pas les coefficients EcoSim.', url: 'https://lafranceinsoumise.fr/wp-content/uploads/2024/06/RECIT-MACRO-FRONT-POPULAIRE-VF.pdf', source: 'NFP, proposition macroéconomique, juin 2024' },
      soc: { model: 'keynesian', reason: 'Lecture possible de la demande et de l’investissement public dans la déclaration de groupe ; elle ne recouvre pas toute la social-démocratie.', url: 'https://parti-socialiste.fr/vie-parlementaire/notre-declaration-politique-17eme-legislature/', source: 'Groupe socialiste, déclaration politique du 22 juillet 2024' },
      dr: { model: 'supply', reason: 'Lecture possible de la baisse des prélèvements productifs et de la valorisation du travail. Le profil ne préjuge pas du succès de ces mesures.', url: 'https://republicains.fr/', source: 'Les Républicains, orientations publiées' },
      eco: { model: null, reason: 'La planification écologique et la transformation productive ne se réduisent ni au profil industriel ni au profil de transition contrainte, qui décrit un contexte.', url: 'https://lesecologistes.fr/posts/1Otm5ILXmpHTs3IQtYEcHC/le-programme-du-nouveau-front-populaire', source: 'Les Écologistes, programme NFP 2024' },
      dem: { model: null, reason: 'Groupe hétérogène : aucun profil macro-économique quantitatif unique n’a été documenté.', url: 'https://www.mouvementdemocrate.fr/', source: 'MoDem, orientations générales' },
      hor: { model: 'supply', reason: 'Lecture possible de la compétitivité, du travail et de la modernisation. Aucun coefficient du profil n’est endossé par Horizons.', url: 'https://horizonsleparti.fr/le-manifeste/', source: 'Horizons, manifeste' },
      liot: { model: null, reason: 'Groupe pluraliste : il serait trompeur de lui assigner une doctrine macroéconomique commune.', url: 'https://liot.assemblee-nationale.fr/', source: 'Assemblée nationale, groupe LIOT' },
      gdr: { model: null, reason: 'Groupe composite : demande, industrie et intervention publique ne correspondent pas à un seul profil EcoSim.', url: 'https://groupe-communiste.assemblee-nationale.fr/', source: 'Groupe GDR, publications' },
      udr: { model: null, reason: 'Groupe récent et positions économiques mêlées : rattachement quantitatif non justifié.', url: 'https://www2.assemblee-nationale.fr/instances/fiche/OMC_PO872880', source: 'Assemblée nationale, groupe UDR' }
    },
    historical: {
      rn20: { model: null, reason: 'Positions économiques changeantes entre 2007 et 2026 : aucune doctrine quantitative unique.', url: 'https://www.vie-publique.fr/discours/166209-programme-electoral-de-jean-marie-le-pen-president-du-front-national-et', source: 'Vie-publique, archives 2007' },
      centre20: { model: 'supply', reason: 'Lecture possible de la compétitivité et de l’innovation ; agrégation de familles historiques distinctes.', url: 'https://www.vie-publique.fr/discours/166035-declaration-de-m-francois-bayrou-president-de-ludf-et-candidat-lel', source: 'Vie-publique, archive centriste 2007' },
      radicalleft20: { model: 'keynesian', reason: 'Lecture possible de la relance redistributive ; les programmes de la période ne sont pas identiques.', url: 'https://programme.lafranceinsoumise.fr/category/programme/laec/', source: 'L’Avenir en commun, archives' },
      ps20: { model: null, reason: 'Sur vingt ans, les approches de la demande, de l’offre et de l’investissement ont varié : attribution unique écartée.', url: 'https://parti-socialiste.fr/vie-parlementaire/notre-declaration-politique-17eme-legislature/', source: 'PS, déclaration politique 2024 (période partielle)' },
      right20: { model: 'supply', reason: 'Lecture possible des réformes de l’offre et des prélèvements ; ne représente pas tous les courants UMP/LR.', url: 'https://republicains.fr/', source: 'Les Républicains, documents officiels' },
      greens20: { model: null, reason: 'La transformation écologique n’est pas un scénario macroéconomique unique ; les contraintes énergétiques dépendent du contexte.', url: 'https://lesecologistes.fr/posts/1Otm5ILXmpHTs3IQtYEcHC/le-programme-du-nouveau-front-populaire', source: 'Les Écologistes, programme NFP (période partielle)' },
      communist20: { model: null, reason: 'Politique salariale et stratégie industrielle ne se résument pas à un jeu unique de multiplicateurs.', url: 'https://groupe-communiste.assemblee-nationale.fr/', source: 'Groupe communiste, publications' }
    }
  };
  const get = (period, id) => Object.hasOwn(entries, period) && Object.hasOwn(entries[period], id)
    ? entries[period][id] : { model: null, reason: 'Aucune correspondance doctrinale documentée.' };
  const resolve = (period, id, comparisonMode, commonModel, models) => {
    if (comparisonMode !== 'doctrine') return commonModel;
    const mapped = get(period, id).model;
    return mapped && Object.hasOwn(models, mapped) ? mapped : 'consensus';
  };
  return Object.freeze({ entries, get, resolve });
})();
