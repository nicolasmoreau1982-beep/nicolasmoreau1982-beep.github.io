# EcoSim France — correction « droits et réutilisation »

Préparée le 11 octobre 2026 sur la base de l'archive locale de l'atelier 5.8.
**Livraison documentaire 5.7.2.5** ; moteur public 5.7.1, outillage 5.7.2, atelier 5.8.0 inchangés.

## Changements
- `LICENSE` : notice explicite de réserve de droits, **pas une licence open source**.
- Un seul fichier de référence : `LICENSE` à la racine du dépôt. La copie `dist/NOTICE-DROITS.txt` est supprimée pour éviter les divergences.
- `dist/informations-legales.html` : section `#reutilisation` conservée et complétée par un lien direct vers `https://github.com/nicolasmoreau1982-beep/nicolasmoreau1982-beep.github.io/blob/main/LICENSE`.
- Les pieds de page HTML affichent tous une mention discrète de droits et un lien vers les conditions ; les pages « Informations légales » et « À propos » fournissent les précisions utiles.
- En-têtes de trois modules **non gelés** : renvoi direct au fichier LICENSE de GitHub ; ne confèrent aucun droit nouveau.
- `scripts/test-droits-580.mjs` : vérifie les 29 pieds de page, le lien externe de référence et l’absence de notice dupliquée.
- `dist/release-status-572.json` : révision documentaire 5.7.2.5.

## Choix délibérés
- **Pas de CC BY-NC 4.0 par défaut** : un tel choix accorderait des droits de redistribution que le responsable du projet n'a pas explicitement souhaité donner. La notice peut évoluer après une décision explicite.
- **Pas d'en-tête ajouté à `app.js`, `data.js`, `fiscal.js` ni aux autres modules historiques gelés** : ces modules sont contrôlés par SHA-256 et doivent rester byte-for-byte identiques. Ils sont couverts par la notice générale ; retoucher leurs commentaires casserait un témoin scientifique.
- Pas d'affirmation de titularité exclusive sur tout le code généré avec IA, ni sur les données officielles, ni sur les œuvres de tiers.
- Réserves de droits : seules les parties protégeables dont les droits sont effectivement détenus peuvent être revendiquées. Le texte n'interdit ni les usages légalement permis ni l'usage normal du site.
- GitHub Issues demeure le seul canal de contact public. Ne pas publier d'identité personnelle par inadvertance.

## Vérifications et publication
Depuis la racine :

```bash
node scripts/test-droits-580.mjs
bash scripts/run-tests-510.sh
node scripts/test-source-inchangee-540.mjs
node scripts/test-golden-540.mjs
node scripts/stamp-build.mjs
node scripts/make-manifest-572.mjs
node scripts/test-release-572.mjs
(cd dist && sha256sum -c manifest-integrite-572.sha256)
```

Vérifier que `LICENSE` est bien présent sur la branche `main` du dépôt public après publication. Pour la livraison, utiliser un message de release `5.7.2.5` ou `Release v5.7.2.5` (le contrôle de cohérence est strict). Vérifier les fichiers du dépôt GitHub avant publication ; **cette archive ne modifie pas le site distant**.

## À vérifier par le responsable
1. Faire le point sur les éventuelles contributions humaines tierces et leurs autorisations.
2. Conserver des traces des choix humains de conception/édition pour documenter l'originalité ; les commits seuls prouvent une succession de contenus, pas leur auteur ou originalité.
3. Vérifier toute licence de données tierces et ses obligations d'attribution ; par exemple Insee Licence Ouverte 2.0.
4. En cas de litige réel, consulter un professionnel du droit : cette notice ne constitue pas une validation juridique.

## Sources
- Code de la propriété intellectuelle, art. L111-1, L122-5 : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042814694 ; https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006278912/
- CSPLA, rapport juillet 2026 : https://www.culture.gouv.fr/nous-connaitre/organisation-du-ministere/conseil-superieur-de-la-propriete-litteraire-et-artistique-cspla/travaux-et-publications-du-cspla/missions-du-cspla/rapport-de-mission-sur-le-statut-des-productions-de-l-intelligence-artificielle
- GitHub : https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository
- Insee : https://www.insee.fr/fr/information/2008466
