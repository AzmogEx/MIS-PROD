# Point de reprise — préproduction Coolify, 10 novembre 2026

Reprise après interruption : le site de préproduction répond toujours en HTTPS et son écran `/admin/login` est accessible. Le panneau Coolify demande une nouvelle connexion ; aucun déploiement n’a donc été lancé depuis le dernier relevé du 26 octobre. Le conteneur alors vérifié provenait de `fc2d715`. Le correctif CRM `b6a030c` est poussé sur `codex/cms-administration`, mais son déploiement a échoué avant construction, car Compose exigeait le secret d’exécution au moment où Coolify construit l’image.

Le correctif local remplace cette interpolation obligatoire par une valeur vide pour la phase de construction. `src/payload.config.ts` continue de refuser le démarrage si le vrai secret est absent ou fait moins de 32 caractères ; le Dockerfile emploie un substitut de build isolé. Le 10 novembre, lint, TypeScript et parsing YAML passent ; le build Next.js local réussit avec avertissements. La première exécution CMS dans le bac à sable Windows ne pouvait pas ouvrir son serveur local ni créer les liens physiques nécessaires ; la même suite, relancée avec les permissions de test adaptées, réussit **173/173**. Le test du rappel lié au brief passe aussi. Aucun moteur Docker n’est disponible localement : le build Docker et le redéploiement cible restent à vérifier.

Le retour technique antérieur a exposé les trois premiers mots de passe synthétiques. Ils doivent être renouvelés et leurs sessions révoquées avant toute remise ; cette opération et la restauration dans un conteneur distinct ne sont pas encore vérifiées. Aucune valeur secrète n’est reproduite ici. Pour achever le déploiement, MIS doit reprendre la session sur [Coolify](https://panel.cleanows.fr) ; l’accès déjà ouvert demande une reconnexion. Le site actif et son domaine n’ont pas été basculés.

La préproduction est réellement déployée dans le projet Coolify `Adam`, environnement `mis-preproduction`, ressource `MIS-CMS-PREPRODUCTION`. L’image initiale provient de `fc2d715` ; la branche `codex/cms-administration` a été publiée avec l’autorisation de MIS. Les scripts opérateurs ont ensuite évolué séparément, jusqu’à `c6e3898` pour les contrôles HTTPS. Les [critères du jalon](PREPRODUCTION.md) et les [preuves cible](PREUVES-PREPRODUCTION.md) font foi pour l’état de la recette en cours. La reprise du 10 novembre a confirmé l’écran d’administration HTTPS ; le panneau Coolify demande une reconnexion, le dernier build a échoué avant construction et la rotation des accès synthétiques reste à faire.

[Ouvrir la préproduction](https://efm7nhvu1hgz97drwm99xgpg.149.202.88.162.sslip.io) · [Administration](https://efm7nhvu1hgz97drwm99xgpg.149.202.88.162.sslip.io/admin/login) · [Fiche de recette MIS](RECETTE-ADMINISTRATEUR.md).

## Validé sur l’hébergement cible

- Construction Docker réelle, Node 24.22.1, démarrage du web et du worker, deux volumes propres à l’application. Huit pages historiques importées ; les anciens répertoires QA locaux n’ont pas été transférés.
- Seize routes HTTPS contrôlées : pages publiques, santé, administration et refus des accès privés. Préproduction exclue de l’indexation, sitemap vide, certificat vérifié sans exception.
- Trois comptes synthétiques créés avec accord explicite, connexions propriétaire/client réussies. Le client membre voit son projet et sa sélection ; le client exclu voit zéro projet/sélection et reçoit une 404 sur le fichier privé.
- Brouillon B isolé de la version A publique, publication B visible après rechargement, dépublication 404, programmation réellement exécutée par le worker. Restauration de A en brouillon avec B toujours publique.
- Vidéo historique MP4 de 7 040 524 octets et 15,44 s : lecture publique, avance mobile à 390 pixels, repère privé à huit secondes, commentaire et acceptation de V1. Les lectures Range publiques et privées renvoient 206 avec exactement 1 024 octets ; le format MOV volontairement invalide est refusé en 400.
- Redémarrage des deux conteneurs sans perte : neuf pages, trois comptes, six versions, brouillon/public distincts, accès membre et empreinte du média conservés au contrôle de 22:28:21 UTC.
- Sauvegarde cible de 22:28:22 UTC, `2026-10-26T22-28-21.870Z-a096e862` : 18 fichiers, neuf pages, intégrité SQLite et empreintes de la copie vérifiées. Cette archive précède les derniers essais CRM et client ; la sauvegarde finale reste à produire.
- Brief synthétique reçu depuis le formulaire et visible dans le CRM. Audience : zéro événement avant accord/après refus ; quatre événements navigateur pour `page-9` et un événement serveur de réception du brief. Ces comptages sont exclusivement de recette.

## Validé seulement en local ou en CI

La [recette locale du CMS](RECETTE.md) reste applicable pour les fonctionnalités qui n’ont pas encore été rejouées sur la cible : grilles et identité en édition complète, imports reprenables, scénarios de concurrence et de reprise détaillés, restaurations applicatives locales, modèles IA. La base livrable locale `.data/cms-ready.db` garde sa référence historique : huit pages, neuf médias, dix migrations, zéro compte et zéro brief ; elle n’est pas la base de préproduction.

Les essais d’Ollama 0.40.6 et whisper.cpp b5454/tiny ont utilisé du texte synthétique et un extrait anglais public sur le poste local. Ils ne valident pas une installation sur l’hôte Coolify, le français, les longs contenus ni la charge. Aucun service IA permanent n’a été installé pour ces essais.

La suite locale après correction des dépendances a réussi **172/172**, zéro échec/ignoré. La [CI Linux 40409723519](https://github.com/AzmogEx/MIS-PROD/actions/runs/40409723519) a réussi installation, migrations, seed, lint, TypeScript, tests et build de `fc2d715`. Le défaut initial du test de publication Linux a été corrigé par l’isolation des lectures SQLite de contrôle. Les [correctifs et alertes npm restantes](DEPENDANCES-PREPRODUCTION.md) sont consignés.

## Encore ouvert dans le jalon cible

- Recréation des conteneurs en conservant les volumes et restauration applicative dans un ensemble distinct sur l’hôte : à terminer ; le redémarrage et la copie de vérification ne les remplacent pas.
- Changement de statut du brief, rappel CRM et retrait du consentement : essais cible à finaliser.
- Remise des accès : les trois premiers mots de passe synthétiques ont été affichés dans un retour technique. Leur renouvellement et la révocation des sessions sont requis avant remise. Aucune valeur n’est incluse dans Git ou ces documents.
- Nouvelle sauvegarde de l’état final, configuration protégée associée, copie hors de l’hôte et responsable/rétention de sauvegarde à arrêter.
- Recette métier de MIS : toutes les cases de la [fiche administrateur](RECETTE-ADMINISTRATEUR.md) restent à remplir.

## Prêt mais dépendant d’un accès ou d’une configuration

Resend et Search Console disposent d’adaptateurs, sans validation réelle de compte dans cette préproduction. Le dashboard expose les états désactivés ou de capture locale. Pour Resend, il reste à vérifier domaine, clé et expéditeur, puis un essai réel avec destinataire explicitement autorisé et réception confirmée. Pour Search Console, il faut la propriété exacte, un compte de service autorisé et sa clé protégée ; accès, récupération des données et affichage doivent être vérifiés séparément.

Ollama et Whisper restent à installer/configurer et à dimensionner dans leur environnement d’exécution cible. L’hôte observé dispose de RAM et d’espace disque ; ce relevé ne prouve pas que les modèles y fonctionnent. Aucun prestataire ni mécanisme d’IA externe n’a été ajouté ; le refus antérieur reste respecté.

## Décisions éditoriales et périmètre absent

Le [registre de 37 arbitrages](VALIDATION-EDITORIALE.md) présente emplacement, valeur actuelle, décision attendue et conséquence sur le lancement. Références commerciales, témoignages, chiffres, droits et données légales nécessitent une décision MIS avant leur rediffusion. Le déploiement et les essais ne valent pas approbation de ces contenus. La sélection privée synthétique reste vide pour ne pas inventer une autorisation de diffusion commerciale.

HLS, CDN, stockage objet, transcodage de masters, connecteurs de facturation/signature/agenda externe, webhook de livraison Resend, outbox des emails d’authentification et actualisation automatique des périodes Search Console terminées sont **non implémentés**. Leur ajout exige un besoin précis et une décision de périmètre.

## Reprise et mise en service

Terminer les critères ouverts de [PREPRODUCTION.md](PREPRODUCTION.md), remettre les accès renouvelés, faire la recette utilisateur et arbitrer le registre éditorial. La [procédure cible](PREUVES-PREPRODUCTION.md) décrit la bascule et le retour arrière coordonné code/base/fichiers/secrets. Le domaine actif n’a pas été basculé ; aucun DNS ni email réel n’a été modifié ou envoyé dans cette recette. Une autorisation explicite reste nécessaire pour ces actions précises.
