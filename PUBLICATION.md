# Publication et exploitation d'EcoSim France

## Adresse et hébergement

Le nom retenu est **EcoSim France**. Aucun domaine ni hébergeur public de production n'est défini dans ce dépôt. L'ancienne adresse Sites n'est plus utilisée : l'utilisateur a écarté cet hébergement. Le dossier `dist/` est statique et peut être servi par un hébergeur choisi ultérieurement. Un domaine personnalisé réellement possédé par le projet implique généralement des frais annuels de registre ; « DNS gratuit » ne signifie pas « domaine gratuit ».

## Référencement

Le site contient un titre descriptif, une description, des liens HTML et un `robots.txt`. Il ne publie plus d'adresse canonique ni de sitemap pointant vers l'ancien hébergeur. Une fois le domaine de production choisi et le site réellement ouvert :

1. créer un compte Google Search Console et vérifier l'adresse du site ;
2. générer un `sitemap.xml` avec les URL absolues du domaine retenu, l'ajouter au `robots.txt`, puis le soumettre ;
3. demander l'inspection de la page d'accueil, puis suivre les rapports d'indexation ;
4. publier une page de méthodologie et des mises à jour réellement utiles, obtenir des liens éditoriaux pertinents et corriger les erreurs d'indexation.

L'indexation et le classement ne sont pas garantis. La page principale est du contenu statique lisible sans attendre le calcul JavaScript.

Des outils proches existent déjà : France Budget (`https://francebudget.fr/`, réutilisation sur data.gouv.fr), Mon Budget pour la France (`https://monbudgetpourlafrance.fr/`) et LexImpact de l'Assemblée nationale (`https://socio-fiscal.leximpact.an.fr/accueil`). Notre différence doit être la traçabilité des hypothèses, la ventilation emploi public/missions, les horizons longs et les limites affichées, pas une revendication d'exactitude supérieure non démontrée.

## Audience et publicité

Au lancement, aucune mesure d'audience ni publicité n'est chargée. L'option simple pour un tableau de bord de visites est Cloudflare Web Analytics ; l'activation nécessite un compte et le snippet fourni par le tableau de bord. Google Analytics 4 est une autre option, plus riche mais qui nécessite une configuration de confidentialité et de consentement adaptée. Vérifier la configuration choisie à l'aide des critères de la CNIL avant de prétendre à une exemption de consentement.

Pour une publicité discrète, réserver au maximum un bloc clairement marqué « Publicité » après les résultats et loin des curseurs, boutons et exports ; pas d'interstitiel ni de publicité collante. Ne rien injecter avant l'ouverture d'un compte, la validation par la régie et la mise à jour de la page de confidentialité. L'admissibilité d'un futur domaine à AdSense devra être vérifiée auprès de la régie au moment de la demande.

La publicité ciblée et de nombreux traceurs publicitaires exigent un consentement préalable en France. Une information légale sur l'éditeur et l'hébergement doit être finalisée selon le statut du projet avant monétisation. Les chiffres sociaux et électoraux du simulateur restent expérimentaux et ne doivent pas être présentés comme un sondage.

## Sources de procédure

- Google Search Central : `https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap`
- Google Search Console : `https://search.google.com/search-console/about`
- Cloudflare Web Analytics : `https://developers.cloudflare.com/web-analytics/about/`
- Cloudflare Pages : `https://developers.cloudflare.com/pages/platform/limits/`
- AdSense : `https://support.google.com/adsense/answer/2784438`
- CNIL : `https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience`
