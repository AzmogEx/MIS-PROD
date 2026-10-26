# MIS Production — site et administration

Site Next.js conservé, avec Payload CMS, éditeur visuel, médiathèque, briefs/CRM, espace client et authentification. Les huit URL historiques restent disponibles. Aucun déploiement effectué.

## Démarrage local

Node **24.22.1**, version fixée dans `.nvmrc`, Docker et la CI (compatibilités dans `package.json#engines`). La recette locale a utilisé Node 26.4.0 sous Windows. Puis :

```sh
npm ci
npm run cms:setup
npm run cms:migrate
npm run cms:seed
npm run cms:import-media
npm run dev -- --hostname 127.0.0.1
```

cms:setup crée un secret aléatoire dans .env.local uniquement si ce fichier n’existe pas. Aucun compte n’est créé. Fournir CMS_OWNER_EMAIL et CMS_OWNER_PASSWORD (14 caractères minimum) dans l’environnement protégé, puis exécuter npm run cms:owner. Ne pas conserver ces identifiants dans Git ou une commande partagée. La création publique du premier compte est interdite.

Ouvrir /admin. Raccourcis selon les droits : /atelier/1, /medias, /gestion, /controle, /securite, /espace-client, /assistance.

La base préparée `.data/cms-ready.db` utilise les migrations. Les données et comptes de recette sont isolés dans `.data/tests/`, `.data/qa-browser.db` et `.data/qa-browser-v2.db` ; ce dernier fichier porte la recette navigateur finale. Voir l’inventaire de livraison dans la recette.

## Vérifications

```sh
npm run lint
npm run typecheck
npm run test:cms
npm run build
npm run cms:backup
```

Le build emploie Webpack : la compilation Turbopack était bloquée sur cet hôte Windows. Les polices existantes sont locales. Les tests de fournisseurs utilisent des services locaux de test, jamais de destinataire réel.

Dernière suite globale : **143/143 tests réussis**. Sauvegarde du 25 octobre 2026 à 19:41:47 UTC : **34 fichiers, 8 pages**, restauration isolée et empreintes vérifiées. Les preuves et limites figurent dans [la recette](docs/cms/RECETTE.md).

## Exploitation

SQLite nécessite un disque persistant et un déploiement mono-hôte. .data/, .cms/ et les secrets ne sont pas commités. En production : CMS_SCHEMA_PUSH=false, migrations versionnées, worker supervisé et sauvegarde hors machine. Ne pas utiliser schema push sur une base réelle.

Les emails de brief, la mesure d’audience et l’IA sont désactivés sans configuration. La récupération de compte écrit dans une boîte de test locale tant que CMS_AUTH_EMAIL_DELIVERY n’est pas activé. Coolify et Resend sont les fournisseurs confirmés par MIS : configuration et adaptateurs livrés, flags d’envoi désactivés. Docker est absent de l’hôte de recette ; aucune image Docker construite, aucun déploiement ni email réel. cms:retention affiche la politique de conservation avant toute application explicite.

Search Console et whisper.cpp disposent d’adaptateurs réels testés avec des services locaux de test. La propriété Google reste à connecter ; les serveurs et modèles locaux Ollama/Whisper restent à installer et leur qualité à vérifier. Aucun résultat de modèle réel n’est présenté comme validé.

## Documentation

- [Cadrage et couverture](docs/cms/CADRAGE.md)
- [Architecture](docs/cms/ARCHITECTURE.md)
- [Avancement et limites](docs/cms/AVANCEMENT.md)
- [Recette et preuves](docs/cms/RECETTE.md)
- [Guide de l’équipe](docs/cms/GUIDE-ADMIN.md)
- [Installation et exploitation](docs/cms/EXPLOITATION.md)
