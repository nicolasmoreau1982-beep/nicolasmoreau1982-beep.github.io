# EcoSim France

EcoSim France est un simulateur interactif, pluraliste et transparent des finances publiques françaises. Il couvre l’ensemble des administrations publiques : État, organismes divers d’administration centrale, collectivités territoriales et administrations de sécurité sociale.

## Lancer localement

Le projet est volontairement sans étape de compilation ni dépendance JavaScript.

```bash
python3 -m http.server 4173 --directory dist
```

Puis ouvrir `http://localhost:4173`.

## Données

- Total des dépenses, recettes et détail par nature : comptes des administrations publiques 2025, Insee, base 2020.
- PIB et croissance 2025 : comptes de la Nation, Insee.
- Dette fin 2025 : dette de Maastricht, Insee.
- Détail fonctionnel des dépenses : COFOG Eurostat 2024, recalé proportionnellement sur le total Insee 2025.
- Ancrage 2026–2028 : projections macroéconomiques de la Banque de France de septembre 2026.
- Trajectoire européenne : procédure concernant les déficits excessifs et recommandation du Conseil.

Toutes les sources cliquables, leurs dates et le statut des valeurs sont visibles dans l’application.

## Moteur

Le moteur est semi-structurel et déterministe. Il combine :

- multiplicateurs différenciés par instrument ;
- montée en charge et persistance ;
- effets d’offre retardés ;
- rétroaction du PIB sur les recettes ;
- réponse du chômage à l’écart d’activité ;
- stabilisateurs automatiques ;
- stock de dette, charge d’intérêts et prime de risque ;
- scénarios institutionnels européens.

Cinq paramétrages économiques sont proposés : consensus empirique, lecture keynésienne, politique de l’offre, lecture libérale et réindustrialisation ciblée. Ils utilisent la même comptabilité et ne diffèrent que par des paramètres affichés et documentés.

## Structure

```text
dist/
  index.html   interface et documentation intégrée
  styles.css   design adaptatif et thème sombre
  data.js      données, sources, paramètres et préréglages
  app.js       moteur de projection et interactions
.openai/
  hosting.json configuration de déploiement Sites
```

## Limites

Ce simulateur produit des scénarios de sensibilité, pas des prévisions. Les fourchettes ne sont pas des intervalles de confiance statistiques. Les réactions de la BCE, des marchés, des partenaires commerciaux, des ménages et des entreprises ne peuvent pas être anticipées avec précision, particulièrement à dix ans ou en cas de rupture institutionnelle.

