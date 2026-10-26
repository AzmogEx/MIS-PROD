# Matrice d’administrabilité actuelle

État du code vérifié le 26 octobre 2026. L’[inventaire initial](INVENTAIRE-SOURCES.md) décrit les sources avant migration ; cette matrice décrit les chemins d’édition effectivement raccordés, y compris les écrans et messages ajoutés. Elle ne certifie ni les affirmations commerciales importées ni une traduction non relue.

**Site** désigne `/admin/globals/site-content`, également accessible dans l’éditeur visuel. Les chemins ci-dessous sont ceux du contenu décodé ; les groupes racine sont stockés en tableaux d’une ligne pour la compatibilité SQLite. L’équipe utilise des champs visuels, sans saisir cet encodage. **Pages** désigne `/admin/collections/pages`, **Formulaires** `/admin/collections/forms`. Propriétaire, administrateur et éditeur peuvent éditer le site ; les droits de gestion de comptes, de paramètres et de relation client restent distincts.

## Site public et formulaires

| Élément réellement rendu | Source éditable actuelle | Raccordement / gouvernance |
| --- | --- | --- |
| Identité, coordonnées, réseaux, URL canonique, marque et données du studio | Site `site`, `identity` | Fournisseur serveur, metadata et liens ; sélecteur de médias publics pour favicon, raccourci, icône Apple et image de partage. |
| Couleurs, polices, espacements, animations | Site `appearance` | Contrôles bornés ; variables CSS, préférences de réduction des mouvements conservées. |
| Logo, menu bureau/mobile, CTA, libellés de navigation accessibles | Site `navigation` | `Navbar`, liens ordonnés et menu mobile ; `logoImage` dispose du sélecteur de médiathèque, le nom de marque reste éditable. |
| Pied de page, colonnes, liens légaux, copyright, réseaux | Site `footer` et coordonnées `site` | `Footer` ; année calculée, contenu et intitulés éditables. |
| Introduction, titres/emphases, CTA, showreel, microtextes, média de fond | Site `hero`, `site.hero` | Composants d’origine conservés ; réglages poster/autoplay/timecode. |
| Manifeste, lettrine, piliers, titres et textes | Site `manifesto` | Données fournies à `ManifestoSection`. |
| Chiffres, unités, arrondis, sources et statut de vérification | Site `stats` | Valeurs éditoriales, séparées des statistiques observées. |
| Cartes univers, pages univers, formules, galeries | Site `universesSection`, `universes`, `universeTemplate` + Pages | Listes structurées ; nouvel univers et page/bloc associés, navigation à renseigner explicitement. |
| Réalisations, filtres/rattachements, sélection, médias, alt, titres et CTA | Site `projects`, `portfolioSection` | Projet réutilisé dans les sections du site ; `verified/source` visibles à l’équipe. |
| Clients publics, témoignages, citations, titres de confiance | Site `clients`, `testimonials`, `clientsSection` | Contenu éditorial distinct des contacts CRM privés. |
| Prix, formules, inclusions, options, devise, période, labels et notes | Site `pricing` | Aucun paiement déduit ; tarifs importés à valider. Les titres « Trois/Quatre » sont du texte éditable, pas un compteur automatique. |
| Invitation au brief et délai annoncé | Site `cta` | Texte partagé par les composants historiques ; affirmation de délai à valider. |
| Composition des pages, ordre, suppression/masquage, ancres | Pages `layout` | Éditeur visuel, brouillon, aperçu, versions, publication ; style local borné par bloc. |
| Colonnes et variantes des grilles historiques | Pages `layout[].appearance.gridLayout`, `columns`, `tabletColumns`, `mobileColumns` | Composition d’origine par défaut ; variante régulière explicite sur huit grilles, détaillée ci-dessous. |
| Nouveaux blocs éditorial/colonnes/galerie/FAQ/étapes | Pages `layout` | Champs titre, texte, image, légende, question/réponse et boutons ; aucun HTML/JS libre. |
| Sections réutilisables et modèles | `shared-sections`, `section-templates` | Une section synchronisée conserve une référence ; une copie devient indépendante. |
| Mentions légales, confidentialité, CGV | Pages, bloc `legal` | Paragraphes et titres localisés, coordonnées interpolées, date affichée saisie explicitement. |
| 404 et liens de retour/univers | Site `notFound`, `universes` | Route système lit le contenu publié ; univers listés depuis le contenu. |
| SEO page, description, image de partage, indexation | Pages `seo`, Site `site/identity` | Sitemap dérivé des pages publiées ; aperçu et interfaces privées exclus. |
| Fermer, lecture/aperçu, téléchargement, légal, confidentialité, formulaire absent | Site `ui` | Lightbox et renderer ; absence de formulaire affichée via `ui.formUnavailable`, sans erreur API brute. |
| Consentement analytics, accepter/refuser, statut, retrait, réglages | Site `ui.analytics*`, `ui.privacyLabel` | Tous les textes publics du consentement utilisent le contenu localisé ; l’activation technique reste une variable d’exploitation. |
| Questions, étapes, choix, aide, placeholders, champs conditionnels, obligations | Formulaires `steps`, `fields` | Schéma validé aussi côté serveur ; toute réception conserve son instantané. |
| Boutons, attente, confirmation, signature, erreurs réseau/validation/quota/indisponibilité, confidentialité | Formulaires `texts` | Rendus par `DynamicContactForm`, serveur et client partagent les messages de validation. |
| Erreurs de format/bornes/email/date/nombre/choix/pièce jointe | Formulaires `translations.fr.values[ui.*]` | Onglet visuel « Microtextes français » ; remplace les valeurs par défaut `formUI`. Variables `{{count}}` préservées. |
| Pièce jointe : aide, attente, succès, nom, reprise, suppression, format, taille, fréquence | Même onglet, clés `ui.upload*` | Les statuts HTTP d’upload sont traduits en messages éditables ; les diagnostics serveur bruts ne sont pas affichés dans ce parcours. |
| Demande trop grande, origine refusée, conflit, erreurs serveur | `ui.requestTooLarge`, `ui.originRefused`, `ui.submissionConflict`, `texts.*` | Correspondance explicite des statuts 413/403/409/429/503/422 dans le formulaire ; diagnostics HTTP techniques conservés pour exploitation. |
| Traduction anglaise du formulaire, messages compris | Formulaires `translations.en` | Écran visuel, relecture complète requise, empreinte de la source ; changement français rend la relecture obsolète et rétablit le français publié. |
| Notifications de réception | Formulaires `notification` | Destinataires, objet, accusé et corps paramétrables ; envoi séparément activé et suivi dans l’outbox. |

Les groupes de contenu du site et les champs localisés des pages suivent les états de traduction et la publication. Une traduction absente ou obsolète n’est pas inventée : le rendu applique le repli prévu. Les clés techniques, ancres structurantes, identifiants de champ et conditions ne sont pas traduits comme du texte.

## Huit pages historiques, nouvelles pages et grilles

| Pages | Contenu et composition éditables | Limite de présentation explicite |
| --- | --- | --- |
| `/` | Ordre/ajout/masquage des blocs ; introduction, manifeste, chiffres, univers, réalisations, clients et CTA dans Site ; ancres et style local dans Pages. | Les textes partagés se modifient dans Site et affectent leurs autres usages lors de publication. |
| `/institutions`, `/entreprises`, `/particuliers` | Entrée correspondante de Site `universes` : intro, prestations, formules, galerie, alt et appels à l’action ; bloc univers et sections additionnelles dans Pages. | Les lignes de prestations/formules conservent leur présentation en lignes ; la galerie dispose du mode régulier. |
| `/contact` | Bloc éditorial et sélection de formulaire dans Pages ; questions, conditions et microtextes dans Formulaires. | La structure des champs et conditions reste validée côté serveur ; le CMS ne permet pas du script libre. |
| `/mentions-legales`, `/confidentialite`, `/cgv` | Titres, paragraphes, listes et date dans le bloc légal ; coordonnées interpolées depuis Site. | Les règles et informations légales nécessitent une validation métier distincte du raccordement technique. |
| Nouvelles pages | Même composition de blocs, styles bornés, modèles, sections synchronisées, SEO et cycle brouillon/publication. | Une nouvelle page ne crée pas automatiquement un lien de menu ; l’équipe choisit sa navigation. |

La limitation observée était réelle : les colonnes de l’éditeur n’agissaient auparavant que sur les blocs simples. La variante `uniform` les applique maintenant aux **huit conteneurs** suivants : piliers du manifeste, chiffres, cartes univers, réalisations secondaires, témoignages, formules tarifaires, options tarifaires et galerie d’univers. `original` conserve les classes et le responsive historiques. Une réalisation mise en avant, les en-têtes, le bandeau de logos clients et les lignes de prestations ne deviennent pas une grille régulière.

Les colonnes autorisées sont 1–4 sur ordinateur, 1–4 sur tablette (601–1100 px ; héritage ordinateur si absent) et 1–2 sur mobile (jusqu’à 600 px). Le mode régulier retire le défilement horizontal des cartes univers et remplace la galerie en colonnes par une grille. Les espacements verticaux hérités/compacts/normaux/généreux restent indépendants ; les espacements entre cartes gardent les valeurs du composant. L’ordre, les visuels et les textes proviennent des listes structurées de Site ; la visibilité concerne le bloc. Il n’existe pas de réglage libre du CSS ou de disposition arbitraire de chaque carte.

La migration `20261026_010000_historical_grid_layout` ajoute uniquement `appearance_grid_layout`, avec défaut `original`, dans **83 tables** de blocs publiés, versions, sections partagées et modèles. Le snapshot final contient 288 tables. Le test réel vérifie les colonnes du snapshot, leurs types, leur nullabilité et les index, ainsi que l’import rejouable sans `schema push`.

## SVG/ICO et remplacement de l’identité

| Ressource / usage | Classement et opération disponible | Contrôle / limite |
| --- | --- | --- |
| `public/favicon.svg`, `public/favicon.ico` | Valeurs historiques de l’identité éditoriale. Remplaçables via Site `identity.favicon` / `shortcutIcon`, avec choix d’un média. | Les fichiers historiques restent en place ; changer la référence publiée suffit à changer l’icône du site. Archiver une copie CMS ne supprime pas le fichier sous `public/`. |
| Logo de navigation | Site `navigation.logoImage`, texte et libellé accessibles associés. Sélecteur natif dans l’administration et dans l’éditeur visuel lorsqu’il affiche ce contenu. | Le pied de page emploie une marque textuelle éditable dans `footer` ; il n’existe pas de téléversement distinct imposé pour ce mot-symbole. |
| SVG/ICO éditoriaux importés | Import standard ou reprenable, métadonnées, crédits, droits, usages, archivage et remplacement par un nouveau fichier. | SVG statique à sous-ensemble strict ; aucun script, style embarqué, ressource externe ou animation. ICO PNG ou DIB non compressé validés. Pas de recadrage ni redimensionnement SVG/ICO dans l’interface. |
| Icône Apple et partage social | Champs `identity.appleIcon` / `shareImage` avec sélection de médias adaptés. | Apple : PNG/JPEG ; partage : PNG/JPEG/WebP. Les routes système de repli restent du code d’application. |
| `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | Ressources techniques du squelette, sans référence trouvée dans `src` lors de cette revue. | Elles ne sont pas présentées comme des contenus éditoriaux et ne sont pas supprimées. |
| Icônes d’interface et marque de l’administration (`MISLogo`, `MISIcon`) | Code de l’interface privée. | Leur évolution suit une version du logiciel ; pas de champ éditorial annoncé. |

Parcours : importer dans `/medias`, renseigner les droits et autoriser explicitement la diffusion publique, puis ouvrir le sélecteur dans le champ d’identité et choisir le fichier. L’adresse est remplie automatiquement. Les fichiers restreints ou aux droits expirés ne sont pas proposés ; la sélection ne publie rien. Les originaux restent immuables et les anciennes références restent utilisables par leurs versions. Limites de validation : SVG 256 Kio, profondeur 40, 5 000 éléments et dimensions 4 096 px ; ICO 4 Mio, 32 images de 256 px au maximum. Un export SVG hors sous-ensemble doit être adapté ou exporté en PNG, sans assouplissement automatique de sécurité.

Preuves du 26 octobre : `tests/cms-historical-grid.test.ts` **6/6** (rendu des huit grilles, sections imbriquées, SQLite migrée, brouillon/public/restauration, modèles et identité) ; `tests/cms-migration.test.ts` **2/2** (migration, snapshot, réexécution, protection d’une base de développement) ; `tests/cms-icons.test.ts` **3/3** (fichiers historiques, SVG actifs, conteneurs ICO invalides). Les **9/9** tests `cms-video` incluent le téléversement multipart SVG réel et la finalisation ICO fragmentée : empreintes source conservées, SVG servi avec CSP restrictive et `nosniff`, SVG actif refusé. La recette navigateur réelle de `/recette-grilles` complète ces tests : [1440, 820 et 390 px sans débordement](preuves/grilles-navigateur.json), puis [édition de quatre à trois colonnes, public inchangé avant publication et modifié après](preuves/grille-publication.json). Les captures et le périmètre isolé restent consignés dans `RECETTE.md`.

## Médias, relation client et interfaces privées

| Élément | Édition et contrôle effectifs | Limite / responsabilité |
| --- | --- | --- |
| Fichiers, dossiers/collections, tags, alt, crédits, droits, visibilité, langue, transcription, VTT et poster | `/medias` et collection `media` | Signatures, taille/quota, originaux immuables, usages et historique ; source restreinte par défaut. |
| Point focal, cadre, nouvelle version | Dialogue d’import/remplacement `/medias` | Point focal initial ; recadrage crée un dérivé et conserve la source intégrale. Voir [imports reprenables](IMPORTS-REPRENABLES.md). |
| Remplacement et reprise d’import | `/medias`, `/api/media-tools`, `/api/media-imports` | Références de brouillons dans toutes les langues ; aucune publication automatique ni destruction d’anciens fichiers. |
| Projet client, titre, présentation, échéance, montant convenu, membres | `projects` | Propriétaire/admin/commercial ; données privées. |
| Documents privés, livrables, version, note, visibilité, expiration | `private-files`, `deliverables` | Versions immuables, projet et autorisations vérifiés ; pas d’import automatique dans les médias publics. |
| Commentaires, repères vidéo, validations et décisions | `video-comments`, `approvals` | Saisis par le client autorisé ou l’équipe ; l’historique conserve auteur et version. |
| Partages temporaires, portfolio commercial | `file-shares`, `commercial-portfolios` | Expiration/révocation, sélection autorisée ; pas de lien public permanent déduit. |
| Demandes, statuts, notes, responsable, calendrier et rappels | `briefs`, `crm-statuses`, `tasks`, tableau `/admin` | Droits commerciaux, instantanés des réponses et journaux de notification ; mesures basées sur données observées. |
| Suggestions éditoriales IA et transcription | `/assistance`, `ai-settings`, `ai-requests` | Activées localement seulement, quota commun, demandeur/gestionnaire ; résultats à relire, jamais publiés automatiquement. Voir [transcription locale](TRANSCRIPTION-LOCALE.md). |
| Libellés d’interface privée : connexion, MFA, sessions, espace client, médiathèque, éditeur, tableaux et assistance | Composants `src/components/cms/*` | **Code d’application en français, non modifiable dans le CMS.** Contenus métier des fiches éditables, mais intitulés de boutons/diagnostics et metadata des écrans privés gouvernés par version du logiciel. |
| Validateurs admin, erreurs API brutes, états techniques, règles de droits, paramètres d’exploitation | Code serveur et variables documentées | **Non éditorial.** Modification revue/testée puis déployée ; aucune promesse que toute chaîne technique est un champ CMS. |

## Écarts et validation éditoriale restant à assumer

1. Les noms/citations explicitement fictifs dans la source, références clients, chiffres, durées, tarifs et mentions réglementaires ne deviennent pas fiables par l’import. Les champs de provenance et de vérification ne constituent pas une preuve ; MIS doit remplacer ou confirmer les éléments avant diffusion réelle.
2. Les copies importées de fichiers déjà présents sous `public/` ne remplacent pas automatiquement ces chemins historiques. Archiver/restreindre la copie CMS ne révoque pas le fichier statique d’origine ; migrer explicitement les références puis traiter les anciens fichiers après examen des usages, sans effacement automatique.
3. Les interfaces privées et les réponses HTTP techniques restent des chaînes du logiciel. Si leur édition éditoriale par l’équipe devient une exigence, il faut un dictionnaire privé dédié, une gouvernance des messages de sécurité et une migration explicite. Le présent livrable ne les présente pas comme administrables.
4. Les nombres intégrés aux textes (« trois univers », « quatre manières », période tarifaire, délais) sont modifiables mais ne sont pas recalculés lors d’un ajout ou retrait. La relecture éditoriale doit vérifier leur cohérence avec les listes.
5. La matrice constate le raccordement dans le code. Les preuves de publication/restauration, droits, formulaires et médias sont les tests isolés ; la recette visuelle du public et de l’éditeur est distincte et doit conserver ses captures et résultats.
