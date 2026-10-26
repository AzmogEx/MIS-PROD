# CMS MIS — cadrage du 25 octobre, finalisation du 26 octobre 2026

Dépôt confirmé : `AzmogEx/MIS-PROD`, commit initial `e366c51`, branche initiale `prod`, arbre initial propre. Travail local sur `codex/cms-administration`. Coolify (hébergement) et Resend (email) confirmés par MIS. Aucun déploiement, changement DNS ou message réel effectué.

## État initial et décisions

Next 16.2.4 / React 19.2.4 / TypeScript / Tailwind 4 / Motion / Lenis. Huit pages publiques, 404, sitemap, robots, icônes et contact. Aucun CMS, base, authentification, tests, CI ou analytics. L’ancien contact pouvait confirmer sans persistance et journalisait les données personnelles : remplacé par une réception transactionnelle et une file de notifications.

La structure publique et le dépôt concordent. Le canonique `mis-studio.fr` devient `mis-prod.fr`, conformément au site et à la mission. Les clients/témoignages hérités explicitement fictifs et chiffres sans source restent importés, avec avertissements de provenance ; aucune nouvelle référence inventée. Ils exigent une validation éditoriale avant mise en production.

Conserver les composants, animations et huit adresses historiques ; ajouter Payload, persistance, aperçu partagé et composition. SQLite avec migrations et volumes persistants, un serveur web et un worker sur le même hôte. Les données de recette et comptes aléatoires restent dans des bases isolées ; aucun compte dans la base préparée pour MIS.

## Matrice de couverture effective

L’inventaire fichier/champ initial est dans [INVENTAIRE-SOURCES.md](INVENTAIRE-SOURCES.md). Le tableau suivant précise les modèles effectivement retenus (les modèles envisagés dans l’inventaire ne désignent pas nécessairement des collections séparées).

| Éléments actuels / source | Modèle et écran | Droits | Publication / vérification |
|---|---|---|---|
| 8 routes et paragraphes légaux `src/app` initial | `pages`, `/admin/collections/pages`, `/atelier/:id` | propriétaire/admin/éditeur | Brouillon, historique, programmation ; tests core, publication, HTTP |
| Hero, manifeste, CTA, mentions de section | `site-content.hero/manifesto/cta`, globale + sélection visuelle | édition | Globale versionnée ; brouillon isolé et publication atelier |
| Univers, prestations, formules, options | `site-content.universes` et blocs `universe` | édition | Mise à jour de tous les emplacements ; univers dynamique testé |
| Tarifs mariage | `site-content.pricing` | édition | Native structurée, historique global ; source importée conservée |
| Réalisations / crédits / témoignages associés | `site-content.projects`, portfolios d’univers | édition | Données structurées communes aux rendus ; provenance non publique |
| Logos, clients, témoignages, chiffres | `site-content.clients/testimonials/stats` | édition | Alertes de justification dans `/controle` ; aucune invention |
| Menu ordinateur/mobile, footer, réseaux | `site-content.navigation/footer/site` | édition | FR/EN, liens réutilisés, repli explicite ; vérification mobile |
| Identité, logo, favicon, partage, coordonnées | `site-content.site/identity/appearance`, `navigation.logoImage` | édition | Sélecteur de médias publics ; SVG statiques/ICO contrôlés, brouillon global isolé ; icônes techniques du logiciel distinguées |
| 404, lecteurs, boutons et microtextes historiques | `site-content.notFound/ui/…` | édition | Globale versionnée ; extraction des sources et test projection publique |
| Contact, étapes, choix, obligations, conditions, messages | `forms`, native + traducteur EN | édition ; réponses commercial | Schéma publié figé dans chaque brief ; validation serveur et fichiers privés |
| Nouvelle composition | Blocs `editorial/columns/gallery/faq/steps/contact/shared` | édition | Ajout, déplacement, copie, masquage, modèle, aperçu aux trois formats |
| Styles et animations | Globale `appearance` + réglages locaux des blocs | édition | Héritage, remise à zéro, mobile/tablette, réduction des mouvements |
| Grilles historiques | Variante `original` / `uniform` et colonnes par largeur | édition | Rendu initial par défaut ; huit grilles régulières, 1–4 colonnes bureau/tablette, 1–2 mobile ; en-têtes et bandeaux conservés |
| SEO, adresses, hiérarchie, indexation | `pages.seo/path/parent`, `redirects` | édition | Sitemap publié, noindex aperçu, garde anti-boucle |
| Médias publics et originaux historiques | `media`, `/medias` ; sources `public/` conservées | édition, archivage selon rôle | Variantes, usages, remplacement de références en brouillon, imports reprenables ; pas de suppression d’originaux |
| Briefs et pipeline | `briefs/crm-statuses/tasks/notifications`, `/gestion` | propriétaire/admin/commercial | Réception et historique persistants, attribution, CSV protégé |
| Portfolios et espace client | `commercial-portfolios/projects/private-files/deliverables/video-comments/approvals` | équipe autorisée / client attribué | Versions immuables, accès et expiration vérifiés côté serveur |
| Sécurité et IA | `users`, `/securite`, `ai-settings`, `/assistance` | selon rôle ; configuration manager | MFA, sessions, quotas ; IA locale seulement, indisponibilité explicite |

## Décisions de finalisation et preuves

La limitation des colonnes historiques a été corrigée par une variante explicite, sans remplacer la composition initiale. Les dix migrations comprennent `20261026_010000_historical_grid_layout`, qui ajoute le seul champ `appearance_grid_layout` dans 83 tables de blocs, versions et modèles. Voir la [matrice exhaustive](MATRICE-ADMINISTRABILITE-ACTUELLE.md), la [recette responsive](preuves/grilles-navigateur.json) et l’[isolation brouillon/public vérifiée dans l’éditeur](preuves/grille-publication.json).

La chaîne vidéo retenue est **locale, persistante et progressive**, avec accès HTTP partiel, contrôles de droits, import reprenable, affiche, VTT et anciennes versions conservées. Le fichier web court du dépôt permet de démontrer ce parcours sans imposer HLS. Stockage distant, débit adaptatif, transcodage, génération d’affiche et montée en charge ne sont pas implémentés ni présentés comme de simples secrets à renseigner. Les volumes/lectures simultanées non établis demanderaient une décision et une chaîne adaptées. Voir [CHAINE-VIDEO.md](CHAINE-VIDEO.md) et la [preuve de lecture réelle](preuves/video-navigateur.json).

Le worker dispose d’un journal daté lié à la base et d’un bail ; les résultats incertains exigent réconciliation avant toute reprogrammation. Le propriétaire initial se crée exclusivement par CLI protégée ; propriétaire et administrateur lisent la file persistante. Les preuves de processus et de restauration locales ne certifient pas un conteneur : aucun moteur Docker disponible dans la recette, donc Docker/Compose/Coolify non exécutés. La préparation d’exploitation reste distincte de sa validation sur l’hôte cible.

Les **37 signalements hérités** et les décisions complémentaires de prix, droits, traductions et mentions légales sont regroupés dans [VALIDATION-EDITORIALE.md](VALIDATION-EDITORIALE.md). Aucune confirmation commerciale ou juridique n’a été inventée. Les réglages d’exploitation (stockage, fournisseurs, secrets, conservation) restent côté serveur ; une interaction métier nouvelle peut nécessiter du développement. Les résultats de réception et limites restantes sont suivis dans [RECETTE.md](RECETTE.md), sans assimiler préparation à fonctionnement vérifié.
