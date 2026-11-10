# Exécution sur Coolify — preuves et reprise

Relevé des essais Coolify du 26 octobre au 10 novembre 2026. Les heures techniques sont en UTC ; le 10 novembre, Paris est à UTC+1. Le [tableau des critères](PREPRODUCTION.md) porte l’état du jalon. Aucune conclusion de ce document ne remplit la validation métier de MIS.

Mise à jour du 10 novembre 2026 : Coolify 4.7.3 a déployé la révision `03929e686de373c1d6cf6c898276bcae9f932986` (job `ssxnffldmmxr33ihd2zfgjxj`, 10:22:31–10:24:48 UTC). Les conteneurs web/worker sont sains, les volumes persistants ont été conservés et le healthcheck HTTPS répond `200`. La CI `42797896291` a réussi. La restauration isolée, distincte et sans réseau, a passé le probe d’accès privé et un healthcheck `200`. MIS a renouvelé les trois accès synthétiques et révoqué leurs sessions ; le probe final confirme la nouvelle connexion propriétaire. La sauvegarde finale après rotation est `2026-11-10T10-56-22.581Z-ad61b49d`.

## Construction et accès

La ressource `MIS-CMS-PREPRODUCTION`, environnement `mis-preproduction` du projet `Adam`, exécute le Compose dans deux conteneurs :

| Élément | Observation cible |
| --- | --- |
| Révision initiale | `fc2d71580ecec241777c686ef97bb28e15c0073f` |
| Déploiement Coolify | `wfjkzzfarbc8wun31h7ejo7f`, début 22:10:02, terminé 22:11:39 |
| Moteur | Docker 29.5.3, BuildKit/Buildx détectés ; image Node 24.22.1 |
| Web | `web-7uacb4fl5dvn0okdefmxaimf-20261026T221008`, état sain |
| Worker | `worker-7uacb4fl5dvn0okdefmxaimf-20261026T221008`, état sain, passage environ toutes les 63 secondes observé |
| HTTPS | Certificat accepté sans exception ; [rapport de 16 routes](preuves/preproduction-http.json), relevé à 22:12:15 |
| Ressources de l’hôte | 31 Gio de RAM, environ 23 Gio disponibles ; partition de 878 Gio, environ 794 Gio libres lors du relevé |

Déploiement courant du 10 novembre : SHA source confirmé `03929e686de373c1d6cf6c898276bcae9f932986`, branche `codex/cms-administration`, job Coolify `ssxnffldmmxr33ihd2zfgjxj`. Noms des conteneurs sains : `web-7uacb4fl5dvn0okdefmxaimf-20261110T102238` et `worker-7uacb4fl5dvn0okdefmxaimf-20261110T102238`. Les deux utilisent les volumes `7uacb4fl5dvn0okdefmxaimf_cms-data` et `7uacb4fl5dvn0okdefmxaimf_cms-private`. L’étiquette visible de l’image Docker reste `305010c` ; le journal de déploiement Coolify est la preuve du SHA source actuel.

Les huit pages historiques ont été importées dans une base cible neuve. Les médias locaux des anciennes fixtures n’ont pas été déployés ; les nombres de fichiers diffèrent donc de la base livrable locale. Deux volumes propres à la nouvelle application couvrent `/app/.data` et `/app/.cms`.

La connexion propriétaire et le dashboard sont accessibles :

![Dashboard du CMS en préproduction](captures/preproduction-dashboard.png)

## Données synthétiques et parcours exécutés

Le script `scripts/cms-target-acceptance.ts` est réservé à une origine HTTPS différente de `mis-prod.fr`, avec environnement `preproduction` et deux circuits email désactivés. Son bootstrap refuse une base ayant déjà des comptes. Les identifiants restent dans `/app/.cms/preproduction-access.json`, en mode `600`, hors du stockage HTTP.

| Objet | Identifiant / contenu |
| --- | --- |
| Page de recette | ID 9, `/recette-mis`, titre `RECETTE-MIS Préproduction` |
| Comptes | Un propriétaire de recette, un client membre et un client exclu ; trois comptes au total |
| Projet / livrable / fichier privé | IDs 1 / 1 / 1, V1, client membre uniquement |
| Média public | ID 1, copie technique de `public/hero.mp4`, 7 040 524 octets, 15,44 s |
| Empreinte du média | `369f229262a6841f24bb87819b506bfe3d5d34bf0a8cb1a307090110d1cfaf03` |
| Sélection privée | ID 1, réservée au client membre, sans média commercial : droits à décider par MIS |

Le parcours de publication a produit les observations suivantes, via le navigateur de préproduction et les processus CMS exécutés sur l’hôte :

1. La version A était publique. Le brouillon B n’a pas remplacé le rendu visiteur après rechargement.
2. La publication de B a changé le rendu visiteur sans redémarrer le serveur.
3. La dépublication a produit la page 404.
4. Le job `schedulePublish` ID 1 a été mis en file avec une échéance ; la boucle worker existante l’a exécuté. Le probe de 22:26:49 rapporte `jobCompleted: true`, et B est redevenue visible. Aucun lancement manuel du job n’a servi à cette preuve.
5. La restauration de la publication ID 9 a rétabli A en brouillon. Le probe de 22:27:08 rapporte A en brouillon, B publique et six versions.

Le client membre a déposé un commentaire à 8 secondes et accepté V1 via les boutons du portail. Le repère `00:08` a déplacé le lecteur privé à 8 secondes. Le client exclu voit zéro projet ; l’URL directe du fichier retourne « Fichier indisponible ». Une sélection privée vide est préparée pour le parcours utilisateur ; aucun droit commercial n’a été déclaré validé.

![Commentaire et validation de V1](captures/preproduction-client-v1.png)

La vidéo publique a réellement démarré en HTTPS. À 390 pixels de large, l’avance a atteint environ 9,77 secondes sur 15,44 secondes avec `readyState=4`. Le contrôle HTTPS du script opérateur `c6e3898b96ac2828da76db07e8a3382cb61256ef`, exécuté à **22:34:42 UTC**, confirme : fragments public et privé en **206**, exactement **1 024 octets** chacun, fichier privé refusé en **404** au client exclu, fichier MOV volontairement invalide refusé en **400**. Le client membre obtient un projet et une sélection ; le client exclu zéro projet et zéro sélection. Cet essai concerne le MP4 représentatif de 7 Mo ; il ne démontre pas le traitement de masters longs ni une charge simultanée importante.

![Lecture et avance à 390 pixels](captures/preproduction-video-mobile.png)

Un brief `RECETTE-MIS` a été soumis depuis le formulaire public avec une adresse `example.test`. Le dossier a été retrouvé et qualifié dans le CRM. Après déploiement du correctif CRM, un rappel synthétique ID 1 lié au brief ID 1 a été créé puis relu sur la cible : échéance `2026-11-11T09:00:00.000Z` (10:00 à Paris), sans email. Le probe du 10 novembre confirme un brief, un rappel, un commentaire et une acceptation. Aucun email réel n’a été envoyé.

## Audience

La collecte navigateur est activée sur cette seule préproduction. Le choix de consentement indique sa durée jusqu’au rechargement de l’onglet. Une lecture SQL indépendante en lecture seule a constaté zéro événement avant accord puis après refus. Après accord et lecture de la page synthétique, les agrégats étaient :

| Source | Événement | Clé de contenu | Nombre |
| --- | --- | --- | --- |
| Navigateur consenti | `page_view` | `page-9` | 2 |
| Navigateur consenti | `video_play_manual` | `page-9` | 1 |
| Navigateur consenti | `video_progress` | `page-9` | 2 |
| Serveur | `brief_received` | `form-1` | 1 |

Les coordonnées du brief restent dans le CRM ; elles ne figurent pas dans ces événements d’audience. Après retrait de l’accord, la navigation suivante n’a ajouté aucun événement : le total est resté à six. Les compteurs de cet environnement sont des données de recette, pas l’audience réelle du site actif.

## Persistance et sauvegardes

Les deux conteneurs ont été redémarrés avec `docker restart`, sans retirer leurs volumes. Le probe du 26 octobre à **22:28:21 UTC** confirme : connexion propriétaire réussie, neuf pages, trois utilisateurs, six versions de la page, A en brouillon/B publique, job terminé, accès privé réservé au membre et empreinte du média conservée.

| Sauvegarde cible | Périmètre observé | Vérification |
| --- | --- | --- |
| `2026-10-26T22-21-34.907Z-4170785d` | Huit pages, seize fichiers ; état initial sans comptes | Terminée à 22:21:35 ; copie SQLite, intégrité et SHA-256 des fichiers/configurations vérifiés |
| `2026-10-26T22-28-21.870Z-a096e862` | Neuf pages, dix-huit fichiers ; comptes et vidéo synthétiques, historiques public/brouillon | Terminée à 22:28:22 ; mêmes contrôles réussis |
| `2026-10-26T22-38-49.822Z-acf141ef` | Neuf pages, dix-huit fichiers ; brief, commentaires, acceptation V1 et sélection privée synthétiques | Terminée à 22:38:50 ; vérifications intégrité/empreintes réussies ; aucune tâche CRM encore créée |
| `2026-11-10T10-30-38.601Z-678560b3` | Neuf pages, dix-huit fichiers ; brief, rappel ID 1, commentaire, acceptation, médias et fichiers privés | Terminée à 10:30:38 ; restauration applicative distincte, probe ACL/empreintes et santé HTTP 200 réussis |
| `2026-11-10T10-56-22.581Z-ad61b49d` | Neuf pages, dix-huit fichiers ; état de recette après rotation des trois comptes | Terminée à 10:56:22 ; sauvegarde finale vérifiée, propriétaire reconnecté après rotation |

Les archives sont dans `/app/.data/backups/<identifiant>`. La commande réalise aussi une copie de vérification dans `/app/.data/restore-checks/<identifiant>`. Le 10 novembre, les conteneurs de la ressource ont été recréés avec conservation des volumes. La sauvegarde récente a ensuite été copiée dans des répertoires protégés distincts sur l’hôte et ouverte par un conteneur utilisant la même image, `--network none` et des montages séparés. `cms-target-acceptance.ts probe` a retrouvé le propriétaire, neuf pages, trois utilisateurs, le brief, le rappel, le commentaire et l’acceptation ; l’ACL membre seul et les empreintes vidéo concordent. `/api/health` local répond `200`.

La sauvegarde finale couvre la base après rotation. Le fichier privé contenant les nouveaux accès est exclu de l’archive et reste dans `/app/.cms/preproduction-access.json`, à consulter uniquement via l’accès privé Coolify. L’environnement injecte ses secrets au runtime ; aucun `.env.local` n’était présent dans le conteneur. Une copie runtime protégée a été utilisée pour démarrer le conteneur de restauration antérieur à la rotation ; aucun secret n’est consigné ici. Il faut encore organiser une copie hors hôte et définir la rétention/responsabilité de sauvegarde. La restauration prouve le retour des données et fichiers synthétiques, pas le MFA ni un exercice complet de reprise de production.

## Services externes et capacités absentes

| État | Élément | Dépendance précise |
| --- | --- | --- |
| Prêt, configuration/essai réel manquant | Resend | `RESEND_API_KEY`, `CONTACT_SENDER`, domaine expéditeur vérifié ; autorisation d’un essai et de son destinataire, puis confirmation de réception |
| Prêt, accès réel manquant | Search Console | `CMS_SEARCH_CONSOLE`, propriété exacte, compte de service autorisé et clé protégée ; accès, récupération puis affichage à contrôler séparément |
| Validé seulement en local | Ollama et Whisper | Installation et modèles sur l’environnement d’exécution cible ; réseau et ressources à qualifier. La RAM disponible ne prouve pas l’installation ni les performances |
| Décision éditoriale attendue | 37 éléments | [Registre](VALIDATION-EDITORIALE.md) : références, droits, chiffres, témoignages et données légales ; pas de validation déduite du déploiement |
| Non implémenté | HLS, CDN, stockage objet, transcodage | À envisager selon une limite observée ou un besoin validé |
| Non implémenté | Facturation, signature, agenda externe | Aucun service ni intégration ajouté à ce jalon |

Le dashboard cible affiche Resend en mode test, récupération de compte en boîte locale, Search Console désactivée et assistance IA désactivée. Aucun transfert vers une IA externe n’a été réalisé. Les refus d’accès privés et l’absence d’indexation n’attestent pas un audit de sécurité exhaustif.

## Remise des accès

Les trois premiers mots de passe synthétiques ont été affichés accidentellement dans un retour technique de la conversation. Le 10 novembre, MIS a exécuté `rotate-access` depuis le terminal Coolify ; le script a confirmé le renouvellement des trois comptes et la révocation des sessions. Le probe suivant a confirmé la nouvelle connexion propriétaire. Les nouveaux accès sont dans `/app/.cms/preproduction-access.json` ; les consulter uniquement depuis les fichiers privés Coolify. Ne pas copier les mots de passe dans la conversation.

L’accès à cette fiche et aux comptes ne constitue pas une validation métier. Le propriétaire de recette doit être préservé lors du nettoyage ; les comptes clients, objets et liens synthétiques suivent le périmètre explicite de la [fiche administrateur](RECETTE-ADMINISTRATEUR.md).

## Bascule et retour arrière préparés

1. Terminer les critères techniques ouverts, renouveler les accès, faire la recette MIS et arbitrer les éléments éditoriaux nécessaires à leur rediffusion. Fixer la révision exacte, le responsable de bascule, la fenêtre et les critères de retour arrière.
2. Préparer une ressource de production avec ses propres volumes et secrets, l’origine `https://mis-prod.fr` au build/runtime, `CMS_DEPLOYMENT_ENVIRONMENT=production` et les seules intégrations explicitement activées. Importer le contenu validé ; exclure les comptes et objets de recette. Ne pas réutiliser la base de préproduction telle quelle.
3. Conserver l’ancienne ressource et relever sa révision/configuration/domaine. Avant migration d’une base existante, suspendre les écritures et le worker, puis sauvegarder ensemble base, médias, fichiers privés et configuration protégée. Vérifier la restauration et conserver une copie hors du serveur selon la politique approuvée.
4. Après autorisation explicite de la bascule de `mis-prod.fr`, affecter le domaine à la ressource de production prévue. Toute modification DNS éventuelle exige sa propre action autorisée. Vérifier TLS, huit chemins historiques, administration, formulaire, fichiers privés et worker avant de rouvrir les écritures.
5. Si les critères échouent, suspendre les écritures de la nouvelle ressource. Réaffecter le domaine à l’ancienne ressource conservée ; pour un retour sur une installation CMS ayant migré, restaurer un ensemble cohérent code/base/fichiers/secrets dans des volumes distincts, vérifier, puis réouvrir. Un simple retour d’image ne suffit pas après une migration incompatible.

Aucune durée d’indisponibilité de production n’a été mesurée : la construction initiale de recette a pris environ 1 min 37, mais ne mesure pas une bascule ni une restauration. Les seuils, objectifs de sauvegarde et responsables restent à décider avec MIS.
