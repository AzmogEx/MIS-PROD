# Architecture

## Décision

Payload 3.92.0 (MIT) s'intègre dans l'application Next existante : collections, contrôles d'accès, versions, brouillons, autosave, médias, interface française et tâches persistantes. Next est mis à jour vers 16.4.3 : le peer exact de `@payloadcms/next@3.92.0` exige >=16.3.3. React 19.2.4 est compatible. Node installé : 26.4.0.

Directus 12.5.1 a été comparé : service séparé, API, live preview ; licence actuelle MSCL-1.0-GPL et conditions de gratuité à vérifier pour MIS. Cette complexité et ce coût ne sont pas nécessaires ici. Payload conserve le socle et évite une réécriture du site.

Sources vérifiées le 25/10/2026 : [package exact Payload](https://raw.githubusercontent.com/payloadcms/payload/v3.92.0/packages/next/package.json), [licence](https://github.com/payloadcms/payload/blob/main/LICENSE.md), [versions](https://payloadcms.com/docs/versions/overview), [accès](https://payloadcms.com/docs/access-control/overview), [aperçu](https://payloadcms.com/docs/live-preview/overview), [tarifs Directus](https://directus.com/pricing), [licence Directus](https://github.com/directus/directus/blob/main/license).

Le Visual Editor Enterprise de Payload n'est pas présenté comme inclus. Le projet fournit son pont de sélection et son rendu partagé. Gestion de contenu, composition, aperçu et sélection au clic sont des couches distinctes.

## Données et flux implémentés

- `pages` : chemins, SEO, hiérarchie, blocs, brouillons, versions et programmation.
- `site-content` : identité, navigation, microtextes et contenus existants structurés ; version publique isolée du brouillon.
- Sections synchronisées et modèles : références vivantes / copies indépendantes explicitement distinguées.
- Médias publics hors `public/`, transformations d'images ; fichiers clients séparés soumis aux droits du projet.
- Formulaires versionnés → brief durable avec schéma figé → notification persistante. La réception ne dépend jamais de l'email.
- Projets → livrables immuables → commentaires et validations attachés à une version.
- Journal, tâches, état fournisseur et statistiques reposent sur les données réellement persistées.

Local : SQLite et volumes sous `.data/`, jamais commités. Un seul schéma CMS partagé par serveur et scripts. Les API utilisateur appliquent `overrideAccess:false` ; les traitements système justifiés et l'import ont des accès explicites. Aucun fallback silencieux en cas de panne de base.

## Implémentation et garanties effectives

`(site)` conserve les routes publiques ; `(payload)` héberge admin/API ; `(studio)` contient atelier, aperçu, médias, gestion et diagnostics ; `(portal)` les comptes, MFA, clients et assistance. Tous les aperçus passent par une session autorisée et sont noindex. Le pont postMessage vérifie origine et iframe émettrice ; le public et l’aperçu utilisent PageRenderer.

Les contenus historiques sont structurés dans une globale versionnée. Les groupes sont des tableaux d’une ligne : cela évite la limite d’arguments SQLite sur les jointures JSON localisées. `toPayloadContent/fromPayloadContent` fournissent le même objet au site. La projection publique retire les justificatifs internes. Les types texte natifs et listes restent modifiables sans HTML/CSS.

Le même `PageRenderer` transmet aux composants historiques un mode de grille `original` ou `uniform`. Le défaut ne change pas leurs dispositions ; la variante régulière applique les colonnes bureau/tablette/mobile à huit conteneurs répétitifs, tout en conservant les en-têtes, bandeaux et lignes de prestations. Le schéma comporte dix migrations : la dernière, `20261026_010000_historical_grid_layout`, ajoute `appearance_grid_layout` avec défaut `original` dans 83 tables de blocs publiés, versions, sections synchronisées et modèles. Le snapshot et les migrations sont comparés sur une base isolée. Les [preuves navigateur](preuves/grilles-navigateur.json) et de [publication depuis l’atelier](preuves/grille-publication.json) complètent cette vérification.

Les transactions SQLite sont sérialisées par client Payload (`transaction-queue.ts`) et emploient BEGIN IMMEDIATE, WAL et un délai d’attente. Cette protection évite des rollbacks croisés observés avec libSQL. Les requêtes imbriquées conservent req.transactionID ; web et worker partagent le fichier avec verrou SQLite. Cette architecture exige un disque local persistant et une réplique de chaque service ; elle n’est pas conçue pour plusieurs hôtes ou un volume réseau.

Publication visuelle : contrôle optimiste des versions page/globale, écriture en transaction, capture des dépendances publiées. Le hook de page couvre aussi la publication native et programmée. Les sections synchronisées se publient explicitement ; les autres brouillons ne sont jamais publiés par ricochet. Restauration de l’instantané en brouillon ; versions de page pour titre/adresse/SEO. Les fichiers historiques restent nécessaires à ces restaurations.

Formulaires : schéma publié, validation serveur, upload privé signé lié à la soumission, transaction brief+notifications+événement serveur. La file d’envoi garde ses tentatives/baux et sa clé d’idempotence ; après23h d’incertitude, reprise bloquée pour réconciliation chez Resend plutôt que risquer un doublon après expiration de sa fenêtre fournisseur. Les anciens schémas restent joints aux réponses.

Médias : variantes Sharp, originaux immuables, références détectées sur public/brouillons/versions/publications, remplacement créant des brouillons. Imports en fragments durables avec empreinte complète, réservation de quota, reprise et expiration. Fichiers privés et livrables utilisent un stockage distinct, des contrôles à chaque lecture et aucune optimisation publique Next.

Les champs de logo/favicon/icônes/partage proposent un sélecteur de médias publics aux droits valides, sans ajout de champ de relation ni URL à deviner. Les SVG sont limités à un sous-ensemble statique validé et servis avec CSP restrictive ; les ICO vérifient répertoire et images PNG/DIB. Ces formats conservent leurs octets et n’offrent pas de recadrage. Les ressources techniques et l’identité privée de l’administration restent dans le code. Une modification de référence globale suit le brouillon ; les métadonnées et droits d’une entrée média prennent effet immédiatement sur ses usages, ce qui impose une nouvelle entrée pour préserver une association historique.

Vidéo : stockage local persistant et streaming progressif HTTP, contrôle de conteneur/codec, Range/HEAD et autorisations à chaque lecture. Le profil web accepte MP4 H.264/AAC et WebM VP8/VP9/AV1 avec Opus/Vorbis ; la preuve navigateur réelle porte sur le MP4 H.264 du dépôt, sans piste audio. Affiche et VTT sont des médias associés et contrôlés séparément. Aucun transcodage, HLS, CDN ou stockage distant n’est implicitement activé. Cette chaîne couvre les fichiers web dans les quotas documentés, pas une promesse de diffusion de masters ou de charge élevée. Voir [chaîne vidéo](CHAINE-VIDEO.md) et [preuve publique/privée](preuves/video-navigateur.json).

Authentification : sessions Payload, rôles contrôlés côté serveur, bootstrap propriétaire uniquement CLI, TOTP chiffré, anti-rejeu, récupération à usage unique et révocation. Resend pour récupération activable indépendamment de la file commerciale ; capture privée locale par défaut.

Mesure : collecte interne consentie et désactivée par défaut ; identifiants techniques de contenus publiés, aucune identité de visiteur ni URL brute. Origines catégorisées dans le navigateur ; première page mesurée depuis chargement définie comme entrée, sans prétendre mesurer des visiteurs uniques. CRM séparé. Conservation configurable, aperçu et archivage privé avant toute application autorisée.

Exploitation : Dockerfile Node 24.22.1, Compose Coolify avec volumes `.data` et `.cms`, web après migrations/import et worker après santé web. Test de santé observe la base. CI lint/typecheck/tests/build préparée ; son exécution distante n’a pas été observée. Sauvegarde SQLite cohérente, fichiers et configuration ; copie restaurée isolée contrôlée par intégrité et SHA256. Une maintenance sans écritures reste nécessaire pour assurer la cohérence inter-fichiers.

Le worker exécute des passages bornés avec bail en base, signal de vie daté par empreinte de base et file observée. Son journal distingue absence, péremption, phase trop longue et échec ; les erreurs de tâches restent visibles même quand le processus fonctionne. Une tâche interrompue à résultat incertain ne doit pas être republiée automatiquement. Les managers lisent la file native sans modifier librement ses champs d’exécution. Le bootstrap CLI du premier propriétaire est contrôlé dans la transaction de création et testé avec deux processus concurrents. Les racines de sauvegarde extérieures ou englobant leurs propres archives sont refusées ; un instantané base cohérent ne remplace pas l’arrêt des écritures pendant les copies de fichiers.

Aucun moteur Docker n’étant disponible dans l’environnement de recette, l’image, Compose, les volumes après recréation et Coolify restent **non exécutés**, malgré les processus et restaurations applicatives locaux. Les comptes, fichiers et données de recette restent isolés de la base livrable. Le [registre des 37 éléments hérités](VALIDATION-EDITORIALE.md) conserve les décisions métier ouvertes ; les [preuves d’intégrations](PREUVES-INTEGRATIONS.md) distinguent adaptateurs testés et fournisseurs non raccordés.

Les données structurées publiques décrivent uniquement l’organisation et la page, sans fabriquer des notes ou avis : [Organization](https://schema.org/Organization), [WebPage](https://schema.org/WebPage). Les dépendances externes restent facultatives ; leur absence ne remplace jamais une erreur de stockage par un faux succès.
