# Correctifs de dépendances avant préproduction

L’installation Linux de la première révision a signalé des alertes npm. Le contrôle `npm audit --omit=dev --json` a ensuite confirmé des dépendances affectées réellement présentes dans l’arbre : 1 alerte critique, 6 élevées, 6 modérées et 1 faible. Ce comptage agrège aussi les dépendances parentes d’un même avis ; il ne représente pas autant de vulnérabilités indépendantes ni une preuve d’exploitation du site.

| Dépendance | Avant | Version retenue | Motif |
| --- | --- | --- | --- |
| Sharp direct | 0.34.5 | 0.35.5 | Correctifs des bibliothèques de traitement d’image ; même version que celle déjà utilisée par Next |
| DOMPurify via Monaco | 3.4.15 | 3.4.17, override ciblé | Correctif des avis critiques de sanitisation ; la dépendance était figée transitivement |
| Happy DOM via Lexical headless | 20.14.6 | 21.0.4, override de cette dépendance | Correctif de l’import alias permettant une exécution dans l’hôte |
| js-yaml | 4.1.1 | 4.3.2 | Correctifs de consommation CPU sur entrées YAML ; branche majeure 4 conservée |
| source-map-js | 1.2.1 | 1.2.2 | Correction d’un déni de service sur source maps indexées |
| baseline-browser-mapping | ancienne version affectée | Version compatible ≥2.11.0 dans le lockfile | Correction de la terminaison de processus sur entrée invalide |

Sources vérifiées : [DOMPurify](https://github.com/advisories/GHSA-mrv2-3pqr-j5jr), [Happy DOM](https://github.com/advisories/GHSA-834v-8h66-3h79), [Sharp](https://github.com/advisories/GHSA-wq5f-xc86-pv6w), [JS-YAML](https://github.com/advisories/GHSA-2883-xcg3-v3hh), [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q). Les versions et intégrités installées sont figées dans `package-lock.json`. Aucun `npm audit fix --force` ni rétrogradation de Payload n’a été appliqué.

## Résultat observé

Après correction : **zéro alerte critique, zéro élevée et zéro faible**, **cinq alertes modérées** restantes dans la chaîne Drizzle / ancien esbuild (`@esbuild-kit/core-utils`, `@esbuild-kit/esm-loader`, `drizzle-kit`, `esbuild` et son parent `@payloadcms/db-sqlite`). L’avis sous-jacent [esbuild](https://github.com/advisories/GHSA-67mh-4wv8-2f99) concerne son serveur de développement. Le Compose n’expose aucun serveur esbuild ; il lance Next en production et les scripts CLI de migration. Ces alertes restent consignées et ne sont pas déclarées supprimées. Ce contrôle ne constitue pas un audit de sécurité complet.

La suite locale avec ces dépendances a réussi **172/172**, zéro échec/ignoré, 90,7 secondes, journal `.data/preproduction-dependencies-tests.log`. Les contrôles de types, le build et la CI Linux de la révision finale sont à rapprocher de [PREPRODUCTION.md](PREPRODUCTION.md).
