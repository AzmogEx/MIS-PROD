# Préproduction MIS — critères fermés de réception

État de la recette cible au 26 octobre 2026, après les observations de 22:34 UTC (23:34 à Paris). La préproduction est déployée sur Coolify ; les contrôles ci-dessous distinguent les essais exécutés des étapes encore ouvertes. La validation métier de MIS reste à renseigner dans la [fiche administrateur](RECETTE-ADMINISTRATEUR.md).

**Reprise du 10 novembre 2026 :** l’URL HTTPS répond toujours et `/admin/login` s’affiche. Le panneau Coolify exige une reconnexion, donc la révision corrigée n’a pas été redéployée. Le dernier déploiement confirmé reste l’image initiale `fc2d715`; la tentative suivante sur `b6a030c` s’est arrêtée avant le build, car l’interpolation Compose exigeait `PAYLOAD_SECRET` trop tôt. Le correctif Compose passe le parsing YAML, les contrôles de code et le build Next.js local ; un build Docker et un redéploiement sur Coolify restent à confirmer. Ne pas confondre les preuves datées ci-dessous avec une vérification de l’état récent du conteneur.

## Cible et révisions

- [Préproduction HTTPS](https://efm7nhvu1hgz97drwm99xgpg.149.202.88.162.sslip.io) · [Administration](https://efm7nhvu1hgz97drwm99xgpg.149.202.88.162.sslip.io/admin/login).
- Coolify 4.5.0, projet `Adam`, environnement `mis-preproduction` (`waooyvgj5fnwauuebg2kra7y`), ressource `MIS-CMS-PREPRODUCTION` (`7uacb4fl5dvn0okdefmxaimf`).
- Image initiale construite depuis la révision immuable `fc2d71580ecec241777c686ef97bb28e15c0073f`, branche `codex/cms-administration`, fichier `/compose.coolify.yaml`, Node 24.22.1. Le déploiement `wfjkzzfarbc8wun31h7ejo7f` a terminé le 26 octobre à 22:11:39 UTC.
- Le script opérateur de recette a ensuite été versionné jusqu’à `c6e3898b96ac2828da76db07e8a3382cb61256ef` et copié dans le conteneur web pour les essais. Ce fait ne change pas la révision de construction de l’image initiale.
- Volumes propres à cette ressource : `7uacb4fl5dvn0okdefmxaimf_cms-data` vers `/app/.data` et `7uacb4fl5dvn0okdefmxaimf_cms-private` vers `/app/.cms`.
- Le site actif `https://mis-prod.fr` reste porté par la ressource `MIS-PROD`, branche `prod`, ancienne URL Git `AzmogEx/Mzn` redirigeant vers `AzmogEx/MIS-PROD`. Les données de recette n’ont pas été montées dans cette ressource.

Les autorisations de publication de la branche et de création des trois comptes synthétiques de préproduction ont été obtenues. Une bascule du domaine actif et un essai d’email réel restent des actions distinctes exigeant leur autorisation précise.

## Critères du jalon

| ID | Critère | Contexte | État / preuve |
| --- | --- | --- | --- |
| PP-01 | Révision immuable, image construite et web/worker démarrés | Préproduction Coolify | **Image initiale validée seulement.** Deux conteneurs sains observés le 26 octobre. Le déploiement de `b6a030c` a échoué avant construction ; correctif Compose en attente de build et redéploiement. |
| PP-02 | Migrations, import rejouable, propriétaire provisionné sans secret publié | Préproduction Coolify | **Partiel.** Huit pages historiques, propriétaire et deux clients synthétiques créés. Les premiers mots de passe ont été exposés dans un retour technique ; renouvellement et révocation des sessions obligatoires avant remise. |
| PP-03 | Volumes distincts, persistance après redémarrage puis recréation | Préproduction Coolify | **Redémarrage validé.** Neuf pages, trois comptes, six versions et empreinte vidéo conservés. **Recréation non encore validée.** |
| PP-04 | HTTPS, santé, public/admin/aperçu et refus privés | Préproduction Coolify | **Contrôles exécutés.** [Seize routes HTTPS](preuves/preproduction-http.json), connexion propriétaire, éditeur et client autorisé ; autre client sans projet et fichier privé refusé. |
| PP-05 | Brouillon, publication/dépublication, programmation et cache visiteur | Préproduction Coolify | **Validé.** Public A pendant brouillon B, publication B visible, dépublication 404, job 1 terminé par le worker, restauration A en brouillon avec B publique. |
| PP-06 | Vidéo représentative, avance, restrictions et mobile | Préproduction Coolify | **Validé sur le fichier représentatif.** MP4 de 7 040 524 octets, 15,44 s ; lecture publique, avance mobile à 9,77 s, repère privé à 8 s. HTTP Range public/privé 206, fragments de 1 024 octets ; accès exclu 404, format MOV invalide 400. |
| PP-07 | Sauvegarde restaurée dans un ensemble distinct, accès privés revérifiés | Hébergement cible | **Sauvegarde vérifiée, restauration distincte non exécutée.** Archive du 26 octobre à 22:38:50 UTC : 18 fichiers et neuf pages, avec brief, commentaires et acceptation synthétiques. Aucune copie hors hôte vérifiée. |
| PP-08 | Consentement et agrégats avec données de test identifiées | Préproduction Coolify | **Parcours testé sur la cible.** Zéro événement avant accord et après refus ; après retrait, aucun nouvel événement lors de la navigation. Agrégats finaux de recette : deux `page_view`, un `video_play_manual`, deux `video_progress`, un `brief_received`. |
| PP-09 | États Resend/Search Console/IA et ressources cibles documentés | Hébergement cible | **États observés.** Emails en capture locale ; Search Console et IA désactivés. Aucun envoi réel, accès Google ou modèle IA exécuté sur cet hôte. [Dépendances](PREUVES-PREPRODUCTION.md). |
| PP-10 | Accès utilisable et fiche de recette remise | Navigateur MIS | **En attente.** La fiche est prête et les connexions ont été testées le 26 octobre ; remplacer les identifiants exposés et révoquer leurs sessions avant remise. Toutes les validations métier restent vierges. |
| PP-11 | 37 arbitrages avec conséquence de lancement | Revue MIS | **Préparé, décisions attendues.** [Registre éditorial](VALIDATION-EDITORIALE.md) : aucune approbation déduite des essais techniques. |
| PP-12 | Bascule, rollback, sauvegarde et indisponibilité explicités | Préparation | **Procédure préparée.** Voir [procédure cible](PREUVES-PREPRODUCTION.md) et [exploitation](EXPLOITATION.md). Aucune bascule du site actif ni durée de bascule de production mesurée. |

## Configuration de recette

`CMS_DEPLOYMENT_ENVIRONMENT=preproduction` est présent au build et au runtime. L’application produit des métadonnées non indexables, un `robots.txt` interdisant tout crawl et un sitemap vide. Le proxy HTTPS renvoie effectivement `X-Robots-Tag: noindex, nofollow` ; le code ajoute aussi `noarchive`, absent de l’en-tête final observé derrière le proxy. Ce réglage d’indexation ne protège pas une URL publique : les zones privées exigent leur authentification.

Les notifications et emails d’authentification sont désactivés pour les envois réels. Search Console et la conservation automatique sont désactivés. L’audience est activée uniquement pour la recette et exige un accord explicite du navigateur. Ses données synthétiques ne représentent pas l’audience de `mis-prod.fr`.

`CMS_IMAGE_NAME` et `CMS_IMAGE_TAG` distinguent l’image de recette d’une future image de production. Les secrets, bases, sauvegardes et fichiers d’accès privés sont exclus de Git. La portée de `PAYLOAD_SECRET` a été réglée sur l’exécution seule dans Coolify ; son application à une nouvelle construction doit être confirmée lors de la recréation.

## Vérifications de code et limites

La première CI Linux (`40406729967`) a révélé un conflit entre lectures `node:sqlite` et libSQL dans le processus du test de publication. Les lectures SQL de vérification sont désormais exécutées dans un processus séparé, en lecture seule. Les CI suivantes `40408530777` et [40409723519](https://github.com/AzmogEx/MIS-PROD/actions/runs/40409723519) ont réussi ; cette dernière couvre installation, migrations, seed, lint, TypeScript, tests et build de `fc2d715` sur Node 24.22.1. La suite locale du 10 novembre a réussi **173/173** hors bac à sable Windows ; lint, TypeScript et build Next.js passent aussi. La CI de la nouvelle révision doit encore être observée après publication du correctif Compose.

Les essais antérieurs d’Ollama, Whisper, grilles, identité, imports reprenables et restauration applicative restent des preuves locales lorsqu’aucune exécution cible n’est mentionnée ci-dessus. HLS, CDN, stockage objet, transcodage, connecteurs de facturation/signature/agenda externe, webhook de livraison Resend et outbox des emails d’authentification ne sont pas implémentés. Le refus d’IA externe reste respecté. Les [correctifs de dépendances et cinq alertes modérées restantes](DEPENDANCES-PREPRODUCTION.md) sont documentés séparément.
