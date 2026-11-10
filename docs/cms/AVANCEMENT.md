# Point de reprise — préproduction Coolify, 10 novembre 2026

Reprise terminée sur la préproduction Coolify le 10 novembre. La révision `03929e686de373c1d6cf6c898276bcae9f932986` est déployée (job `ssxnffldmmxr33ihd2zfgjxj`) ; le web et le worker sont sains, et l’endpoint de santé répond `200`. Le correctif CRM est maintenant appliqué sur la cible.

Le manifeste Compose accepte l’absence du secret uniquement pendant le build ; `src/payload.config.ts` refuse toujours un secret runtime absent ou trop court. L’image Docker réelle a été construite et déployée par Coolify. Le 10 novembre, lint, TypeScript, parsing YAML et build Next.js local passent ; la suite CMS réussit **173/173**. La [CI 42797896291](https://github.com/AzmogEx/MIS-PROD/actions/runs/42797896291) a réussi toutes ses étapes sur la révision déployée.

Le retour technique antérieur a exposé les trois premiers mots de passe synthétiques. La rotation des trois comptes et la révocation des sessions sont confirmées ; le probe réussit la connexion propriétaire après renouvellement. Aucune valeur secrète n’est reproduite ici. Le site actif et son domaine n’ont pas été basculés.

La préproduction est déployée dans le projet Coolify `Adam`, environnement `mis-preproduction`, ressource `MIS-CMS-PREPRODUCTION`, sur la révision `03929e6`. Les [critères du jalon](PREPRODUCTION.md) et les [preuves cible](PREUVES-PREPRODUCTION.md) font foi pour l’état de la recette. Seule la validation métier de MIS reste ouverte.

[Ouvrir la préproduction](https://efm7nhvu1hgz97drwm99xgpg.149.202.88.162.sslip.io) · [Administration](https://efm7nhvu1hgz97drwm99xgpg.149.202.88.162.sslip.io/admin/login) · [Fiche de recette MIS](RECETTE-ADMINISTRATEUR.md).

## Validé sur l’hébergement cible

- Construction Docker réelle, Node 24.22.1, démarrage du web et du worker, deux volumes propres à l’application. Huit pages historiques importées ; les anciens répertoires QA locaux n’ont pas été transférés.
- Seize routes HTTPS contrôlées : pages publiques, santé, administration et refus des accès privés. Préproduction exclue de l’indexation, sitemap vide, certificat vérifié sans exception.
- Trois comptes synthétiques créés avec accord explicite, connexions propriétaire/client réussies. Le client membre voit son projet et sa sélection ; le client exclu voit zéro projet/sélection et reçoit une 404 sur le fichier privé.
- Brouillon B isolé de la version A publique, publication B visible après rechargement, dépublication 404, programmation réellement exécutée par le worker. Restauration de A en brouillon avec B toujours publique.
- Vidéo historique MP4 de 7 040 524 octets et 15,44 s : lecture publique, avance mobile à 390 pixels, repère privé à huit secondes, commentaire et acceptation de V1. Les lectures Range publiques et privées renvoient 206 avec exactement 1 024 octets ; le format MOV volontairement invalide est refusé en 400.
- Recréation des conteneurs le 10 novembre en conservant les volumes ; probe après démarrage : neuf pages, trois comptes, six versions, job terminé, commentaire, approbation et empreinte vidéo présents.
- Sauvegarde après rotation du 10 novembre `2026-11-10T10-56-22.581Z-ad61b49d` : 18 fichiers et neuf pages. La restauration distincte sans réseau de l’instantané précédent a passé les contrôles d’accès privé, empreintes média et santé HTTP 200.
- Brief synthétique reçu depuis le formulaire et visible dans le CRM ; rappel ID 1 lié au brief ID 1, échéance 10:00 Paris, créé sans email. Audience : zéro événement avant accord/après refus ; comptages exclusivement de recette.

## Validé seulement en local ou en CI

La [recette locale du CMS](RECETTE.md) reste applicable pour les fonctionnalités qui n’ont pas encore été rejouées sur la cible : grilles et identité en édition complète, imports reprenables, scénarios de concurrence et de reprise détaillés, restaurations applicatives locales, modèles IA. La base livrable locale `.data/cms-ready.db` garde sa référence historique : huit pages, neuf médias, dix migrations, zéro compte et zéro brief ; elle n’est pas la base de préproduction.

Les essais d’Ollama 0.40.6 et whisper.cpp b5454/tiny ont utilisé du texte synthétique et un extrait anglais public sur le poste local. Ils ne valident pas une installation sur l’hôte Coolify, le français, les longs contenus ni la charge. Aucun service IA permanent n’a été installé pour ces essais.

La suite locale la plus récente a réussi **173/173**, zéro échec/ignoré. La [CI Linux 42797896291](https://github.com/AzmogEx/MIS-PROD/actions/runs/42797896291) a réussi installation, migrations, seed, lint, TypeScript, tests et build de `03929e6`. Le défaut initial du test de publication Linux a été corrigé par l’isolation des lectures SQLite de contrôle. Les [correctifs et alertes npm restantes](DEPENDANCES-PREPRODUCTION.md) sont consignés.

## Encore ouvert dans le jalon cible

- La sauvegarde de l’état de recette est réalisée avec configuration runtime protégée sur l’hôte ; une copie hors hôte et une politique de rétention/responsable restent à décider.
- Recette métier de MIS : toutes les cases de la [fiche administrateur](RECETTE-ADMINISTRATEUR.md) restent à remplir.

## Prêt mais dépendant d’un accès ou d’une configuration

Resend et Search Console disposent d’adaptateurs, sans validation réelle de compte dans cette préproduction. Le dashboard expose les états désactivés ou de capture locale. Pour Resend, il reste à vérifier domaine, clé et expéditeur, puis un essai réel avec destinataire explicitement autorisé et réception confirmée. Pour Search Console, il faut la propriété exacte, un compte de service autorisé et sa clé protégée ; accès, récupération des données et affichage doivent être vérifiés séparément.

Ollama et Whisper restent à installer/configurer et à dimensionner dans leur environnement d’exécution cible. L’hôte observé dispose de RAM et d’espace disque ; ce relevé ne prouve pas que les modèles y fonctionnent. Aucun prestataire ni mécanisme d’IA externe n’a été ajouté ; le refus antérieur reste respecté.

## Décisions éditoriales et périmètre absent

Le [registre de 37 arbitrages](VALIDATION-EDITORIALE.md) présente emplacement, valeur actuelle, décision attendue et conséquence sur le lancement. Références commerciales, témoignages, chiffres, droits et données légales nécessitent une décision MIS avant leur rediffusion. Le déploiement et les essais ne valent pas approbation de ces contenus. La sélection privée synthétique reste vide pour ne pas inventer une autorisation de diffusion commerciale.

HLS, CDN, stockage objet, transcodage de masters, connecteurs de facturation/signature/agenda externe, webhook de livraison Resend, outbox des emails d’authentification et actualisation automatique des périodes Search Console terminées sont **non implémentés**. Leur ajout exige un besoin précis et une décision de périmètre.

## Reprise et mise en service

Terminer les critères ouverts de [PREPRODUCTION.md](PREPRODUCTION.md), remettre les accès renouvelés, faire la recette utilisateur et arbitrer le registre éditorial. La [procédure cible](PREUVES-PREPRODUCTION.md) décrit la bascule et le retour arrière coordonné code/base/fichiers/secrets. Le domaine actif n’a pas été basculé ; aucun DNS ni email réel n’a été modifié ou envoyé dans cette recette. Une autorisation explicite reste nécessaire pour ces actions précises.
