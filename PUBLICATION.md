# Publication et exploitation d'EcoSim France

## Adresse et hébergement

Le nom retenu est **EcoSim France**. L'adresse publique du dépôt renommé est `https://nicolasmoreau1982-beep.github.io/`, publiée par GitHub Pages depuis `dist/` via `.github/workflows/static.yml`. L'ancienne adresse Sites n'est plus utilisée. Un domaine personnalisé réellement possédé par le projet implique généralement des frais annuels de registre ; « DNS gratuit » ne signifie pas « domaine gratuit ».

## Référencement

Le site contient des titres et descriptions descriptifs, des liens HTML, une liste visible des formations effectivement modélisées, des URL canoniques et un `sitemap.xml` portant sept pages publiques : accueil, audit, confidentialité et quatre guides thématiques. Les noms de partis sont placés dans le contenu utile : Google ignore la balise `meta keywords`. Les programmes sont traduits partiellement par EcoSim, et non repris comme chiffrages officiels.

L'objectif éditorial est d'aider à préparer la **présidentielle 2027** en comparant les conséquences budgétaires de choix politiques. À ce stade, les scénarios représentent des groupes et familles politiques, **pas les programmes individuels des candidats**. Ne pas référencer une fiche sous le nom d'un candidat avant d'avoir vérifié sa déclaration, daté et sourcé ses mesures, distingué les annonces des hypothèses EcoSim et signalé les mesures non représentables. La liste officielle des candidats relève du Conseil constitutionnel.

Le dépôt porte désormais le nom spécial `nicolasmoreau1982-beep.github.io` : le site est servi à la racine du domaine, où `dist/robots.txt` devient le véritable `/robots.txt`. Il autorise l'exploration et indique `/sitemap.xml`. Cela facilite la découverte des pages sans garantir leur indexation ni leur classement.

Après publication de cette version sur GitHub Pages, pour demander la découverte des pages :

1. Vérifier la propriété de préfixe d'URL `https://nicolasmoreau1982-beep.github.io/` dans Google Search Console. Le fichier `google3d20062100896a35.html` est présent à la racine de `dist/` ; contrôler qu'il est servi à la même adresse publique avant de cliquer « Valider ».
2. Ouvrir **Indexation → Sitemaps** dans Search Console, saisir `sitemap.xml` dans « Ajouter un sitemap », puis cliquer « Envoyer ». Vérifier que le sitemap est lu sans erreur et qu'il annonce les **sept** URL canoniques. La soumission ne vaut ni indexation ni classement.
3. Inspecter l'URL d'accueil et chacune des quatre nouvelles pages ; demander éventuellement leur indexation si elles sont accessibles mais non indexées, puis suivre le rapport de pages indexées. Recontrôler après les prochains déploiements.
4. Corriger les erreurs de rendu ou d'indexation constatées ; publier seulement des mises à jour réellement utiles.

Si l'adresse publique change, mettre à jour ensemble les URL canoniques des sept pages, `dist/sitemap.xml`, `dist/robots.txt`, les liens sociaux et ce guide avant le déploiement suivant.

L'ancienne adresse Pages sous `/EcoSimFrance/` n'est pas automatiquement redirigée après le renommage du dépôt. Les trois anciennes pages principales disposent donc d'une redirection HTML/JavaScript vers leurs nouvelles URL, avec conservation des fragments de scénario lorsque JavaScript est disponible. Ce n'est **pas** une redirection HTTP 301 : corriger les liens externes maîtrisés et surveiller les anciennes URL dans Search Console.

L'indexation et le classement ne sont pas garantis. La page principale est du contenu statique lisible sans attendre le calcul JavaScript.

Les quatre guides (`comprendre-budget-france.html`, `reforme-retraites.html`, `programmes-economiques-2027.html`, `reduire-deficit-public.html`) sont eux aussi lisibles sans JavaScript. Ils donnent une explication autonome, des sources primaires, les limites du modèle et un lien vers l'outil. Le cas « retraites » charge un réglage illustratif d'indexation ; ce n'est pas un programme de candidat. Mettre à jour les guides et leurs sources si les données ou le périmètre du moteur changent.

### Liens éditoriaux et retours indépendants

Après vérification de l'indexation, proposer les pages pertinentes à des lecteurs susceptibles de les évaluer : associations d'éducation civique, enseignants, chercheurs en finances publiques, journalistes spécialisés ou communautés de données publiques. Choisir une page adaptée à chaque interlocuteur et expliquer ce qu'elle apporte. Ne pas acheter de liens, automatiser des inscriptions d'annuaire ni présenter EcoSim comme une prévision officiellement validée.

Message court à personnaliser, à envoyer **manuellement** seulement si le contexte s'y prête : « Bonjour, j'ai publié EcoSim France, un simulateur ouvert des finances publiques. Cette page explique [sujet] avec ses sources et les limites du calcul : [URL]. Un retour critique sur la méthode ou les données serait précieux ; aucune citation n'est attendue. » Garder une trace des remarques et corriger publiquement les erreurs signalées. Aucun contact externe n'est effectué par le dépôt.

Des outils proches existent déjà : France Budget (`https://francebudget.fr/`, réutilisation sur data.gouv.fr), Mon Budget pour la France (`https://monbudgetpourlafrance.fr/`) et LexImpact de l'Assemblée nationale (`https://socio-fiscal.leximpact.an.fr/accueil`). Notre différence doit être la traçabilité des hypothèses, la ventilation emploi public/missions, les horizons longs et les limites affichées, pas une revendication d'exactitude supérieure non démontrée.

## Audience et publicité

Le code du site GoatCounter **`nicolasmoreau1982-beep`** est renseigné dans `dist/analytics.js`. Une fois déployé, le script `https://gc.zgo.at/count.js` enverra les visites du domaine public vers `https://nicolasmoreau1982-beep.goatcounter.com/count`. Le total réel sera affiché discrètement en pied de page si le compteur public est autorisé ; sinon il restera masqué. Aucune publicité n'est chargée.

Pour finaliser et vérifier le compteur :

1. vérifier les réglages de confidentialité et la conformité de la configuration aux critères de la CNIL ; l'absence de cookies ne suffit pas, à elle seule, à garantir une exemption de consentement ;
2. dans les réglages du site GoatCounter, activer « Allow adding visitor counts on your website », désactivé par défaut ;
3. déployer le site, puis ouvrir la page publique et vérifier une requête vers `gc.zgo.at/count.js`, une requête de comptage vers `nicolasmoreau1982-beep.goatcounter.com/count` et, si le compteur public est autorisé, l'affichage du total dans le pied de page. Le tableau de bord GoatCounter donne les visites par page et les référents ; le compteur public affiche un total agrégé, potentiellement mis en cache jusqu'à quatre heures.

Le code ne charge l'outil que sur le domaine public exact, pas en prévisualisation locale. Il n'envoie ni le fragment contenant le scénario partagé ni les paramètres d'URL ; les référents entrants sont réduits à leur domaine. Si le compteur public ou le réseau échoue, il reste masqué, sans chiffre inventé. La page `confidentialite.html` décrit le service et affiche son état de configuration. Vérifier aussi les mentions de confidentialité, la durée de conservation et les obligations d'information applicables au projet. Pour désactiver immédiatement la mesure dans une prochaine publication, remettre `GOATCOUNTER_SITE` à une chaîne vide.

Pour une publicité discrète, réserver au maximum un bloc clairement marqué « Publicité » après les résultats et loin des curseurs, boutons et exports ; pas d'interstitiel ni de publicité collante. Ne rien injecter avant l'ouverture d'un compte, la validation par la régie et la mise à jour de la page de confidentialité. L'admissibilité d'un futur domaine à AdSense devra être vérifiée auprès de la régie au moment de la demande.

La publicité ciblée et de nombreux traceurs publicitaires exigent un consentement préalable en France. Une information légale sur l'éditeur et l'hébergement doit être finalisée selon le statut du projet avant monétisation. Les chiffres sociaux et électoraux du simulateur restent expérimentaux et ne doivent pas être présentés comme un sondage.

## Sources de procédure

- Google Search Central : `https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap`
- Google Search Console : `https://search.google.com/search-console/about`
- Cloudflare Web Analytics : `https://developers.cloudflare.com/web-analytics/about/`
- GoatCounter, compteur public et JSON : `https://www.goatcounter.com/help/visitor-counter`
- GoatCounter, données et confidentialité : `https://www.goatcounter.com/help/privacy`
- Cloudflare Pages : `https://developers.cloudflare.com/pages/platform/limits/`
- AdSense : `https://support.google.com/adsense/answer/2784438`
- CNIL : `https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience`
