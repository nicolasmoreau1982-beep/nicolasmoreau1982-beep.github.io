# EcoSim 5.9 — Prototype d'API HTTP : inactif en production

## Périmètre

Ce prototype propose une API HTTP documentée en **OpenAPI 3.1.0**, mais **aucun webservice n'est activé sur GitHub Pages**. Les routes documentées sont théoriques et le serveur fourni est volontairement désactivé sauf activation locale manuelle.

Les paramètres de scénario (modifications budgétaires, hypothèses macro, moteurs publics, structure, fiscalité, sectoriel, calendrier) sont dérivés des catalogues réels de l'application et validés par le **moteur historique** via `scripts/core-harness-540.mjs`. Aucun calculateur macroéconomique parallèle n'est créé.

## Installer sans écraser la version actuelle

1. Copier ce dossier de correctif sur le disque.
2. À la racine de la copie locale du dépôt EcoSim, exécuter `python3 /chemin/du/patch/appliquer_api_590.py /chemin/vers/depot`.
3. Vérifier `node api-preview-59/test-api-590.mjs` et les tests habituels.
4. **Publier uniquement** les modifications statiques `dist/index.html`, `dist/api-experimentale-590.html` et `dist/api-spec/*` pour rendre la documentation visible. Les fichiers `api-preview-59/` restent des sources du dépôt, pas des services actifs. Ils sont destinés au prototype local uniquement.

Le script n'efface ni les contrôles existants ni les autres parties de l'IHM. Il refuse de remplacer un fichier ayant déjà un nom cible mais un contenu différent, sauf les métadonnées générées par le même prototype.

## Documentation

* `dist/api-experimentale-590.html` : présentation publique indiquant **API non active**.
* `dist/api-spec/openapi-590.json` : contrat OpenAPI (routes, schémas, erreurs, réponses).
* `dist/api-spec/scenario-590.schema.json` : référentiel des critères d'entrée généré depuis EcoSim.
* `examples/scenario-api-590.json` : exemple de requête HTTP.

Les consommateurs utilisent `POST /v1/simulations` avec un document JSON `{schemaVersion:"1.0",horizon:5,scenario:{...}}`. Le prototype accepte également les exports JSON du site `{metadata,scenario,projection}`. Réponse standardisée et déterministe `{status, schemaVersion,engineVersion,buildId,scenario,selectedYear,results:{baseline,scenario},limitations}` ; en erreur `{status:"error",error:{code,message}}`. Le schéma est généré à partir de tous les réglages supportés et sa conformité est vérifiée par les tests.

## Tester localement (facultatif, ne rien publier comme serveur)

```bash
node api-preview-59/generate.mjs
node api-preview-59/test-api-590.mjs
node api-preview-59/server.mjs --enable-local
```

Le serveur écoute **uniquement** sur `127.0.0.1` et choisit un port libre ; il ne démarre jamais sans `--enable-local`. Exemple de requête (adapter le port affiché) :

```bash
curl -s http://127.0.0.1:PORT/v1/simulations \
  -H 'Content-Type: application/json' \
  -d @examples/scenario-api-590.json > resultat.json
```

**Ne pas activer sur Internet en l'état** : pas d'authentification, pas de limitation de débit distribuée, pas d'audit sécurité, pas de SLA, aucun domaine API. GitHub Pages n'accepte pas les POST dynamiques. Si un jour une API publique est souhaitée, un hébergement d'exécution séparé et des protections adaptées seront requis.

## Garanties et limites

- Schémas et énumérations issus du même catalogue que l'IHM ; l'application des règles d'acceptation suit `applySerialized` et les garde-fous existants.
- Nouveau contexte moteur par appel : pas de fuite de scénario entre requêtes.
- Les exports JSON du simulateur sont acceptés sans dépendance au navigateur.
- Les nombres conservés par le moteur ne sont pas artificiellement arrondis par l'API.
- La compatibilité dépend du code historique ; le script échoue explicitement si le harnais ne sait plus initialiser le moteur.
- Aucun changement apporté à `app.js`, `data.js`, `fiscal.js`, `guardrails-510.js` ni aux goldens. Le résultat OpenFisca et les versions publiées restent indépendants de ce contrat expérimental.
