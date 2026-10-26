# Point de reprise — 26 octobre 2026

Finalisation ciblée locale achevée. Branche `codex/cms-administration` conservée, modifications locales non commitées et aucun push. La [recette actuelle](RECETTE.md) remplace le [bilan archivé du 25 octobre](RECETTE-20261025.md). Coolify et Resend restent les seuls services confirmés par MIS.

## Changements depuis le bilan précédent

- Grilles historiques : mode original préservé et mode régulier effectif, colonnes bureau/tablette/mobile. Dixième migration : 83 colonnes ajoutées, snapshot 288 tables cohérent. Test navigateur 1440/820/390 px et publication de 4 vers 3 colonnes dans une fixture.
- Identité : logo/favicon sélectionnables depuis les médias publics autorisés, SVG statiques et ICO vérifiés ; brouillon isolé du public. Les icônes techniques restent dans les ressources du code.
- Vidéo : validation du conteneur et du codec avant écriture, fichiers privés inclus ; quota privé global, stockage paramétrable, affiche et VTT filtrés. Vrai MP4 15,44 s : reprise en fragments, persistance entre processus, lecture/avance publique et privée, commentaire et acceptation V1 au clic, mobile vérifié.
- Worker : observation datée, bail unique, diagnostic de file et accès lecture propriétaire/admin. Reprise après kill et transport email dédupliqué testés. La revue indépendante a trouvé un cas de journal perdu : la réconciliation lit désormais directement les jobs incomplets en base, sans rejouer une publication incertaine.
- Propriétaire initial : CLI sécurisé et concurrence réellement testés. Sauvegarde : base/configuration/fichiers vérifiés, refus des racines dangereuses ; restauration applicative indépendante ajoutée.
- Resend/Search Console : contrats de transport, permissions, erreurs et dénominateurs revérifiés. Aucune connexion réelle. Audience activée uniquement en recette : zéro événement avant/refus, onze après accord et parcours, aucun ajout après retrait.
- Ollama 0.40.6 et whisper.cpp b5454/tiny réellement exécutés localement sur texte synthétique/extrait public. Une demande et une réservation persistantes par moteur malgré répétition ; aucune publication automatique.
- [Registre éditorial](VALIDATION-EDITORIALE.md) : 37 signalements avec identifiants stables, valeurs actuelles, motifs et décisions attendues ; relectures distinctes des tarifs, droits médias et traductions. Aucune validation inventée.

## Preuves finales

**172 tests réussis sur 172**, zéro échec ou ignoré, 91,4 secondes. Lint, TypeScript et build de production réussis. Serveur de production local réellement lancé : neuf routes publiques 200, aperçu/globale protégés, atelier redirigé, 404/sitemap/robots vérifiés. Voir [recette et matrice](RECETTE.md), [exploitation](PREUVES-EXPLOITATION.md), [intégrations](PREUVES-INTEGRATIONS.md), [Ollama](IA-LOCALE-RECETTE.md) et [Whisper](TRANSCRIPTION-LOCALE.md).

Base livrable `.data/cms-ready.db` : **8 pages, 9 médias, 10 migrations, 0 compte, 0 brief**, intégrité `ok`. Les bases `.data/tests/*`, `.data/qa-browser*.db` et leurs comptes aléatoires restent des recettes privées exclues de Git, à ne pas déployer. Les flags des services restent désactivés sur la base livrable.

Sauvegarde actuelle : **26/10/2026 21:15:57 UTC**, identifiant `2026-10-26T21-15-56.872Z-2b0224e7`, **34 fichiers et 8 pages** ; intégrité SQLite, SHA-256 de la base/configuration/fichiers restaurés vérifiés. Distinctement, une fixture représentative de **18 fichiers** a été restaurée puis rouverte dans un nouveau processus : 8 pages, 3 comptes synthétiques, 1 brief, 1 tâche, deux versions, brouillon/public distincts et accès privé réservé au client membre.

## Ce qui reste réellement non vérifié ou incomplet

**Environnement bloquant exact :** Docker, Podman, nerdctl et ctr absents de Windows et de la distribution WSL observée ; pas de socket Docker, service ou hôte distant configuré. Aucune image Docker construite, aucun Compose/Coolify exécuté, aucune recréation de conteneurs ni validation des volumes/HTTPS. Node cible 24.22.1 ; le poste de recette utilise 26.4.0. Aucun moteur n’a été installé pour contourner cette absence.

**Connexions à vérifier :** Resend (domaine, expéditeur, clés, livraison réelle), Search Console (propriété/compte autorisé), IA locale dans l’environnement cible. Le modèle Whisper n’a été qualifié que sur un extrait anglais public ; conversion FFmpeg, français, longs contenus et charge restent à éprouver. Les services IA temporaires de recette ont été arrêtés après validation ; aucun service permanent n’a été installé.

**Fonctions non implémentées, explicitement hors du périmètre local borné :** HLS/CDN/stockage objet/transcodage de masters ; connecteurs de facturation, signature et agenda externe sans service identifié ; webhook de livraison Resend ; outbox des emails d’authentification ; actualisation automatique des périodes Search Console terminées. Aucun état « connecté » ne masque ces limites.

**Décisions MIS :** références, témoignages, chiffres, tarifs, droits, mentions et traductions du registre ; politique de conservation ; responsable et objectifs de sauvegarde ; essai email réel puis ouverture de production. Les copies historiques déjà publiques ne deviennent pas privées par import dans la médiathèque, et les fichiers déjà téléchargés ne peuvent pas être rappelés.

Le refus antérieur de la revue automatique concernant l’adaptateur IA externe reste respecté : risque de transfert de contenus privés, aucun adaptateur ajouté ni transfert effectué. Aucun déploiement, achat, DNS ou email réel réalisé.

## Prochaine action

Faire une seule revue MIS du registre éditorial, puis configurer un environnement Coolify de recette avec une révision/tag revu et immuable, volumes, secrets, premier propriétaire et HTTPS. Exécuter la procédure [EXPLOITATION.md](EXPLOITATION.md), dont redémarrage/recréation et restauration sur cible, avant toute ouverture. Les changements locaux doivent être revus et versionnés ; ne pas déployer les bases QA. Prévoir arrêt des écritures et du worker pendant migration, indisponibilité à mesurer et rollback coordonné code/base/médias/secrets.
