# Guide de l’équipe MIS

## Connexion

Le responsable technique initialise le propriétaire depuis le serveur (guide d’exploitation). Utilisez /admin, ou /connexion avec double authentification. /securite permet TOTP, codes de récupération et révocation des sessions. Un propriétaire est seul habilité à nommer ou modifier un propriétaire ; le dernier ne peut être supprimé.

| Rôle | Usage |
|---|---|
| Propriétaire | Configuration, équipe, contenus, commerce et clients |
| Administrateur | Exploitation et équipe, sauf prise de contrôle d’un propriétaire |
| Éditeur | Pages, médias, formulaires et aperçu ; pas d’export CRM |
| Commercial | Demandes, documents et projets clients |
| Intervenant limité / client | Projets attribués, commentaires et téléchargements autorisés |

## Modifier une page

1. Ouvrir Site et contenus → Pages → la page → Ouvrir l’éditeur visuel.
2. Sélectionner une section dans l’arbre ou l’aperçu ; modifier ses réglages à droite.
3. Attendre « Brouillon enregistré ». Le public conserve sa version précédente.
4. Contrôler ordinateur/tablette/mobile puis Publier. Une erreur conserve le travail à l’écran ; un conflit demande une réconciliation après rechargement.

Ajouter, monter/descendre, dupliquer, masquer et retirer modifient la composition. Enregistrer comme modèle crée une copie indépendante, disponible via Charger mes modèles. Colonnes, galerie, FAQ et étapes ont aussi leurs listes dans l’éditeur natif de page. Aucun HTML/CSS à saisir.

Pour une grille historique, **Composition d’origine** conserve son rendu initial. Choisir **Grille régulière — colonnes réglables** active les colonnes sur les piliers du manifeste, chiffres, cartes univers, réalisations secondaires, témoignages, tarifs/options et galerie d’univers. Régler 1–4 colonnes ordinateur/tablette et 1–2 mobile ; contrôler les trois aperçus. Les en-têtes, la réalisation mise en avant, le bandeau clients et les lignes de prestations gardent leur composition. L’espacement vertical reste indépendant. Les listes structurées permettent de réordonner les éléments et changer leurs visuels. La [recette navigateur](preuves/grilles-navigateur.json) couvre 1440, 820 et 390 px sans débordement ; la [publication depuis l’éditeur](preuves/grille-publication.json) vérifie que le public conserve quatre colonnes pendant le brouillon, puis en affiche trois après publication.

Tous les textes, images et listes ouvre les données partagées : identité, menus/footer, icônes, 404, univers, réalisations, références et tarifs. Chaque groupe contient une ligne à ouvrir. Apparence globale propose couleurs, polices, espacement et animations. La publication de ces valeurs affecte tous leurs emplacements. Conserver les justificatifs : les chiffres et références historiques ne sont pas automatiquement vérifiés.

Pour le logo et les icônes du site, importer un fichier dans `/medias`, vérifier crédits/droits puis autoriser sa diffusion publique. Dans Navigation → Logo ou Identité → Favicon/icône, cliquer **Choisir dans la médiathèque** : l’adresse est remplie sans la deviner. Le choix reste en brouillon jusqu’à publication. SVG statiques et ICO validés sont acceptés ; les SVG actifs ou utilisant des ressources externes sont refusés. Un export SVG incompatible peut être remplacé par un PNG/WebP. L’icône Apple propose PNG/JPEG et l’image de partage PNG/JPEG/WebP. Le mot-symbole du footer est un texte éditable ; les icônes de boutons et la marque de l’administration restent des ressources du logiciel.

## Nouvelle page / nouvel univers

Créer une page avec une adresse unique /nouvelle-page, ses blocs et son SEO. Pour un univers, créer aussi sa fiche dans la liste Univers et reprendre son identifiant dans le bloc Page univers. Ajouter les liens aux menus/footer. La route fonctionne sans changement de code. Une page publiée renommée crée une redirection ; les boucles sont refusées.

## Versions et publication

L’éditeur publie page et contenus globaux atomiquement. Chaque publication de page, y compris depuis l’administration native ou la programmation, conserve une publication cohérente avec les contenus globaux et sections synchronisées alors publiés. Les sections synchronisées se publient séparément et affectent toutes les pages qui les utilisent. Publier une page ne publie pas les autres brouillons de sections.

Versions permet comparaison et restauration documentaire. Publications cohérentes restaure la composition, les contenus globaux et les sections historiques en brouillon, dans la langue de la publication ; lire la portée affichée. Titre, URL et SEO sont dans les versions de page. Avant de republier une restauration utilisant des sections synchronisées, relire et publier leurs brouillons séparément : cela affecte aussi les autres pages qui les référencent. L’aperçu peut donc montrer un brouillon de section différent de sa version publique. Les médias anciens sont conservés. La programmation native nécessite un worker actif : une date enregistrée ne prouve pas son exécution. La corbeille retire le contenu sans effacement immédiat.

## Médias

/medias : recherche, collections, tags, filtres, import multiple, usages et actions groupées. Renseigner descriptions, crédits et restrictions. Images : original et variantes web. Un changement d’octets, crop ou point focal crée une nouvelle entrée afin de conserver les versions.

Remplacer dans les brouillons modifie les références de travail, en français et anglais, sans toucher au public ni aux historiques. Relire et publier les contenus concernés. Une modification concurrente est refusée. Restriction ou expiration bloque les fichiers CMS et leurs variantes, avec revalidation des droits à chaque téléchargement.

Les originaux historiques de public/ restent publics : restreindre leur copie CMS ne retire pas l’ancienne URL. Documents et masters clients vont dans Fichiers privés, associés au projet. Ne jamais placer un fichier privé dans public/.

Pour la vidéo, fournir une version web MP4 H.264 (AAC si audio), une affiche image et, si disponibles, des sous-titres VTT avec leur langue. L’import reprend en resélectionnant le même fichier ; sa visibilité initiale est restreinte. Associer affiche/VTT dans les réglages avancés et vérifier les droits de chaque dépendance. La diffusion locale progressive permet lecture et déplacement sans HLS ; aucun transcodage ni affiche automatique n’est annoncé. Voir le [parcours vidéo et ses limites](CHAINE-VIDEO.md) et la [preuve navigateur publique/privée](preuves/video-navigateur.json).

Les métadonnées d’une entrée média sont partagées et prennent effet immédiatement, notamment visibilité, droits, affiche et VTT. Pour conserver une ancienne association pendant une modification éditoriale, créer une nouvelle entrée et remplacer ses références en brouillon. Les octets originaux et les versions précédentes restent conservés.

## Briefs, CRM, calendrier

Formulaires : modifier étapes, questions, champs, options, conditions, obligations et messages puis publier. Une condition porte sur un champ antérieur sans condition. Chaque réponse conserve le schéma lors de sa réception. Destinataires internes et modèle d’accusé sont configurables.

/gestion : colonnes commerciales, recherche, filtres, dossier, statut, responsable, budget, notes, prochaine action et export CSV autorisé. Les transitions de statut sont contrôlées ; l’export neutralise les formules de tableur. Le calendrier conserve rappels/échéances et retire des urgences les actions terminées.

Une demande est enregistrée avant confirmation. Un échec d’email ne la perd pas. Les notifications affichent état/erreur et peuvent reprendre sans créer une nouvelle demande. Aucun email ne quitte le poste tant que l’envoi réel n’est pas configuré et autorisé.

## Mesure et contrôles

Chaque indicateur indique période, source et définition. Demande reçue = transaction serveur validée ; vente = statut commercial renseigné. La mesure navigateur commence seulement après activation et consentement, sans historique inventé ni visiteurs uniques annoncés. Refuser ou retirer le consentement arrête les événements.

Dans Statistiques, Search Console affiche son état de configuration et la dernière observation. Une fois le compte Google autorisé et configuré par l’exploitant, un propriétaire ou administrateur choisit les dates puis **Synchroniser** ou **Reprendre la synchronisation** ; un commercial dispose de la lecture. Les résultats sont limités aux pages publiées reconnues, avec une période en heure du Pacifique et un délai de trois jours. Une période terminée est conservée sans nouvel appel ; un échec peut reprendre. « Configuré » ne signifie pas « synchronisé ». Aucun compte Google réel n’a été connecté pendant la recette. Voir [procédure et limites](INTEGRATIONS.md#search-console--connexion-préparée-non-vérifiée-chez-google).

/controle affiche liens/ancres, pages orphelines, médias manquants/expirés, formulaires absents, mentions légales et preuves à vérifier, avec liens de correction. Les états d’intégrations et de sauvegarde proviennent d’observations datées. Ce contrôle n’est pas une certification juridique ou d’accessibilité.

Le worker affiche un signal daté lié à la base utilisée. « En marche » ne signifie pas que chaque traitement ou fournisseur a réussi. Propriétaire et administrateur peuvent lire la file **Exploitation → Traitements persistants** ; une publication interrompue à résultat incertain doit être rapprochée du contenu et de son historique avant une nouvelle programmation. Ne pas effacer son état pour forcer un rejeu. Une date programmée seule n’atteste pas l’exécution ; le responsable technique vérifie le service et ses baux selon le [guide d’exploitation](EXPLOITATION.md). Docker et Coolify n’ont pas été exécutés pendant cette recette, faute de moteur Docker disponible.

La revue métier est regroupée dans [VALIDATION-EDITORIALE.md](VALIDATION-EDITORIALE.md) : **37 signalements hérités**, avec identifiants et décisions attendues, auxquels s’ajoutent les contrôles de tarifs, droits, traductions et mentions légales. Un signalement ne prouve pas une erreur ; confirmer avec justificatif, corriger ou décider du retrait. Aucune validation n’est précochée pour réduire le nombre d’alertes.

## Clients, traductions et IA

Créer un projet, attribuer ses membres, importer ses fichiers privés puis ses versions de livrables. /espace-client montre uniquement les projets attribués. Commentaires vidéo et validations restent associés à une version/date ; V2 ne réécrit pas la validation de V1. Les liens temporaires ont échéance et révocation. Les portfolios restreints contrôlent destinataires et droits médias.

Sélectionner la langue dans l’administration, l’atelier ou l’aperçu. Le français est source/repli. Les textes, menus et métadonnées suivent la langue ; la structure des pages reste commune. Marquer une traduction relue ; modifier la source la rend obsolète. Une page anglaise non relue reste non indexable ; son sitemap exige aussi les données globales relues.

Dans un formulaire, ouvrir Traductions puis charger les textes actuels. Traduire les libellés, aides, choix, messages de confirmation et microtextes, puis cocher la relecture complète et publier. Les clés de questions et les valeurs techniques des choix restent stables. L’anglais n’est affiché que si tous les textes requis ont été relus pour la source actuelle ; sinon le formulaire revient explicitement au français. Une modification de la source française rend cette relecture obsolète. Les demandes déjà reçues conservent leurs textes et leur schéma.

/assistance prépare des suggestions avec le modèle local configuré, selon quotas, et permet une transcription si le serveur Whisper local est configuré. Choisir uniquement un fichier proposé auquel vous avez accès, puis relire le résultat. Aucune publication, réponse client ou ajout de sous-titres n’est automatique. Sans fournisseur compatible, l’état indisponible est expliqué.
