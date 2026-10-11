# EcoSim France — Mention de droits visible dans les pages (5.7.2.5)

**Objectif :** rendre les conditions de réutilisation visibles aux visiteurs, y compris sur une copie HTML enregistrée depuis le navigateur, sans rendre opaques les scripts ni changer les résultats du simulateur.

## Modifications

- Une mention concise, en **HTML statique**, est ajoutée au pied de page des **29 pages publiques disposant d'un footer** (les anciennes pages de redirection ne sont pas concernées) : « © 2026 EcoSim France — droits réservés sur les contributions originales protégeables. Conditions de réutilisation ».
- Le lien « Conditions de réutilisation » conduit à `informations-legales.html#reutilisation`.
- Cette section expose consultation normale, usage pédagogique, réutilisation substantielle, exceptions légales, données publiques, contributions IA et droits de tiers.
- **Un seul fichier de référence** : le `LICENSE` placé à la racine du dépôt GitHub. Lien HTML : https://github.com/nicolasmoreau1982-beep/nicolasmoreau1982-beep.github.io/blob/main/LICENSE
- L'ancienne copie publique `dist/NOTICE-DROITS.txt` est retirée. Les références des trois modules JS préalablement modifiés pointent vers le `LICENSE` de GitHub.
- `scripts/test-droits-580.mjs` vérifie la présence de la mention dans les 29 pieds de page, le lien vers le fichier unique, et l'absence de copie de la notice.

## Versions et périmètre

- Livraison corrective : **5.7.2.5**
- Moteur / résultats publics : **5.7.1** (sans modification)
- Contrôle technique OpenFisca : **5.7.2** (sans exécution réelle supplémentaire)
- Atelier SMIC / pensions : **5.8.0** (calculs inchangés)

## Vérifications effectuées

- `node scripts/test-droits-580.mjs` : OK.
- `bash scripts/run-tests-510.sh` : OK.
- `node scripts/test-release-572.mjs` : OK.
- `sha256sum -c dist/manifest-integrite-572.sha256` (à exécuter depuis `dist`) : OK.
- Les 9 modules gelés par `test-source-inchangee-540.mjs` sont inchangés.
- Vérification visuelle dans Chromium : **non confirmée** dans cet environnement (navigation locale bloquée par la politique d'exécution). Le HTML est vérifié statiquement.

## Publication

Depuis la racine du dépôt, intégrer le contenu de cette archive en conservant `LICENSE` **à la racine**, non dans `dist/`. La branche de publication utilisée par le workflow est `main`. Publier ensuite avec un titre de commit **`5.7.2.5`** ou **`Release v5.7.2.5`** si c'est un commit de livraison. Les tests de livraison rejettent les étiquettes de version incohérentes.

**Important :** le lien GitHub vers `LICENSE` ne devient valide que si ce fichier est bien présent sur la branche `main` publique. Cette archive ne modifie pas le dépôt ni le site déployé.

La mention est une information sur des droits potentiels existants ; elle ne crée aucun droit sur les éléments non protégeables ni sur les composants tiers.
