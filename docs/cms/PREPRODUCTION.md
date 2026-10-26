# Préproduction MIS — critères fermés de réception

Point ouvert le 26 octobre 2026. L’utilisateur confirme que le site est déjà hébergé sur Coolify et autorise les modifications nécessaires sur `https://mis-prod.fr`. La recette invasive (création de données, interruption et recréation) doit être réalisée sur des données isolées, conformément aux consignes jointes. Les emails réels exigent toujours un essai et son destinataire explicitement autorisés.

## Cible identifiée

- Coolify 4.5.0 accessible avec une session utilisateur existante sur `panel.cleanows.fr`.
- Projet `Adam`, environnement actif `production`, ressource `MIS-PROD` : branche `prod`, ancienne URL Git `AzmogEx/Mzn`. GitHub confirme qu’elle redirige vers le même dépôt `AzmogEx/MIS-PROD` (identifiant 1128288774).
- Site actif : HTTPS accessible ; Nixpacks, état « Running (no healthcheck) » et aucun stockage persistant configuré dans cette ressource lors de l’observation initiale. Ces constats ne valident pas le CMS sur cette ressource.
- Nouvel environnement de recette : `mis-preproduction`, identifiant `waooyvgj5fnwauuebg2kra7y`, dans le projet existant. Ressource MIS-CMS-PREPRODUCTION créée, identifiant 7uacb4fl5dvn0okdefmxaimf. Aucun partage de base/volumes/comptes avec le site actif prévu.
- Source de la recette : branche `codex/cms-administration`, révision 305010ca3679ecea829034e2baf52633d1f536b3 publiée avec autorisation explicite ; les bases locales QA et secrets sont exclus du dépôt.

## Critères du jalon

| ID | Critère | Contexte attendu | État / preuve |
| --- | --- | --- | --- |
| PP-01 | Révision immuable, image construite et web/worker réellement démarrés | Préproduction Coolify | En préparation |
| PP-02 | Dix migrations, import rejouable, propriétaire provisionné sans secret publié | Préproduction Coolify | À exécuter |
| PP-03 | Volumes distincts, persistance après redémarrage puis recréation | Préproduction Coolify | À exécuter |
| PP-04 | HTTPS, santé, accès public/admin/aperçu et refus privés | Préproduction Coolify | À exécuter |
| PP-05 | Brouillon, publication/dépublication, programmation et cache visiteur | Préproduction Coolify | À exécuter |
| PP-06 | Vidéo représentative, avance, restrictions et mobile | Préproduction Coolify | À exécuter ; MP4 local déjà validé séparément |
| PP-07 | Sauvegarde restaurée dans un ensemble distinct et accès privés revérifiés | Hébergement cible | À exécuter ; restauration locale déjà validée séparément |
| PP-08 | Consentement et agrégats avec données de test identifiées | Préproduction Coolify | À exécuter |
| PP-09 | États réels Resend/Search Console/IA et ressources cibles documentés | Hébergement cible | À inspecter ; aucun email réel autorisé |
| PP-10 | Accès utilisable et fiche de recette remise | Navigateur de l’administrateur | [Fiche prête](RECETTE-ADMINISTRATEUR.md), accès à provisionner |
| PP-11 | 37 arbitrages présentés avec conséquence de lancement | Revue MIS | [Registre](VALIDATION-EDITORIALE.md), aucune décision inventée |
| PP-12 | Bascule et rollback examinables, sauvegarde et indisponibilité précisées | Préparation | Procédure existante [EXPLOITATION.md](EXPLOITATION.md), cible à compléter |

## Ajustements nécessaires à la préproduction

`CMS_DEPLOYMENT_ENVIRONMENT=preproduction` est fourni au build et au runtime : en-tête `X-Robots-Tag: noindex, nofollow, noarchive`, robots interdisant tout crawl, sitemap vide et métadonnées non indexables. Cela évite d’indexer les données de recette ; ce réglage ne remplace pas l’authentification des zones privées.

`CMS_IMAGE_NAME` et `CMS_IMAGE_TAG` permettent de nommer l’image de recette indépendamment d’une future image de production sur le même hôte. Utiliser des volumes propres à la nouvelle ressource. Laisser emails, Search Console et conservation désactivés ; ne jamais réutiliser les identifiants des bases locales.

## Limites à conserver

Les 172 tests, modèles IA et restaurations précédents sont des preuves locales. HLS/CDN/transcodage, facturation/signature/agenda externe, webhook de livraison Resend et outbox des emails d’authentification ne sont pas implémentés. Aucun contournement du refus d’IA externe. La validation de l’utilisateur dans la fiche reste distincte des essais techniques.

## Premier contrôle Linux de la révision publiée

GitHub Actions 40406729967 (Ubuntu 24.04.5, Node24.22.1) a exécuté installation, migrations, seed, lint et TypeScript. La suite a rencontré SQLITE_IOERR_SHORT_READ après ouverture/fermeture de node:sqlite et libSQL dans le même processus du test de publication. Les lectures SQL brutes de ce test sont désormais faites en processus séparé, en lecture seule ; la couverture de corbeille et de concurrence est conservée. Le contrôle corrigé sera relancé avant validation. Sur Windows, un processus worker a aussi quitté avec 0xC0000005 après son rapport terminé ; le contrôle worker isolé suivant a réussi5/5. Ce résultat intermédiaire ne remplace pas le précédent bilan172/172.
