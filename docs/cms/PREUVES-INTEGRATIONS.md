# Preuves des intégrations et de la mesure

Revue du **26 octobre 2026**, limitée au code présent, aux tests isolés exécutés et à la recette navigateur enregistrée. Aucun email réel, appel authentifié Google, changement DNS ou déploiement n’a été effectué. Les pages publiques de documentation des fournisseurs ont été consultées ; cela ne constitue pas un essai de leur service.

## Matrice fonction → code → environnement → preuve → dépendance

| Fonction | Code présent | Environnement réellement vérifié | Preuve du présent passage | Dépendance restante |
| --- | --- | --- | --- | --- |
| Notifications commerciales Resend | Transport HTTP, outbox transactionnelle, baux, reprise et déduplication ; capture par défaut | SQLite locale isolée, transport intercepté, fournisseur simulé | `cms-resend-transport` 4/4 ; `cms-operations` 15/15 | Domaine/expéditeur vérifiés, secrets serveur, activation explicite, worker et réception contrôlée chez Resend |
| Récupération de compte Resend | Adaptateur séparé ; boîte privée locale par défaut | Capture sur disque et transport intercepté | `auth-email` 1/1 | Activation indépendante et réception réelle à vérifier ; pas de file persistante de reprise pour ce transport synchrone |
| Search Console | Lecture seule, propriété configurée, synchronisation manuelle, observation datée, reprise | SQLite réelle, clé RSA éphémère, réponses Google simulées | `cms-search-console` 4/4 | Compte autorisé, propriété vérifiée, API et secrets ; synchronisation Google réelle non réalisée |
| Analytics publics | Consentement, collecte minimale, agrégats, arrêt/retrait ; désactivés par défaut | Runtime testé, SQLite réelle et navigateur réel sur base isolée | `cms-analytics` 6/6 + `cms-audience` 1/1 ; [preuve navigateur](preuves/consentement-navigateur.json) | Activation et revue de confidentialité de l’environnement cible ; aucune mesure de production annoncée |

Les nombres sont ceux rapportés par `node:test`, incluant les tests parents et leurs sous-tests. Ils ne constituent pas un nombre de parcours métier distincts ni un total de la suite globale.

## Resend : configuration, permissions, états et reprise

Sources : [transport et réception](../../src/cms/operations.ts), [politique de reprise](../../src/cms/notification-policy.ts), [collections](../../src/cms/operation-collections.ts), [authentification](../../src/cms/auth-email.ts).

`CMS_EMAIL_DELIVERY=enabled` active les notifications commerciales ; `CMS_AUTH_EMAIL_DELIVERY=enabled` active séparément les emails d’authentification. Tous deux nécessitent `RESEND_API_KEY` et `CONTACT_SENDER`. Les quatre flags de cette revue sont désactivés dans `.env.example` et absents de `.env.local`, ce qui laisse les branches réelles inactives par défaut. Les secrets ne sont ni reproduits ni considérés comme une preuve de connectivité.

Le formulaire publié fixe les destinataires internes, l’objet et l’éventuel accusé. Ses réglages privés ne sont pas exposés dans le schéma public. La réception conserve atomiquement le brief, son schéma, les notifications et l’événement serveur ; un échec d’écriture annule cette transaction. Une panne du transport après réception ne supprime pas le brief. Les rôles propriétaire, administrateur et commercial lisent la file et peuvent demander une reprise autorisée ; les visiteurs et clients ne lisent ni réponses ni destinataires.

La file expose `pending`, `processing`, `captured`, `sent`, `failed` et `cancelled`, la date de première tentative, le nombre de tentatives, le bail, la prochaine tentative, l’erreur, l’identifiant fournisseur et la date de traitement. **`sent` signifie que le fournisseur a accepté la requête, pas que le destinataire l’a reçue ou lue.** Aucun webhook de livraison/rebond n’est implémenté. La boîte d’authentification est distincte : capture privée dans `.data/mailbox` ou appel synchrone Resend ; son échec ne bénéficie pas de l’outbox commerciale.

Le worker traite au plus 25 notifications par passage, revendique un bail de 60 secondes et limite les tentatives automatiques à trois avec délai croissant. Il revérifie l’existence de la demande ou la validité du rappel avant envoi. Une notification terminée n’est pas rejouée ; une demande supprimée ou un rappel invalidé annule la notification encore en attente. Les tests couvrent aussi deux workers concurrents et le refus de remise à zéro de la fenêtre de déduplication.

La clé `Idempotency-Key` et le corps restent identiques lors d’une reprise. Resend annonce une rétention de **24 heures** ; le code bloque la reprise dès **23 heures** après la première tentative et impose une réconciliation opérateur en cas de résultat incertain. Il ne prétend pas garantir un envoi unique au-delà de cette fenêtre. [Documentation Resend sur l’idempotence](https://resend.com/docs/dashboard/emails/idempotency-keys).

Les tests de transport interceptent `fetch` : URL Resend fixe, authentification, destinataires synthétiques, contenu, clé stable, signal de délai, HTTP 503, réponse sans identifiant et erreur de délai sont contrôlés. Ils ne prouvent pas le réseau, les quotas réels, la délivrabilité ou la vérification du domaine. Le test worker de l’autre lot ajoute un arrêt brutal réel après acceptation simulée et une reprise sans seconde acceptation ; voir [preuves d’exploitation](PREUVES-EXPLOITATION.md).

Activation à effectuer par l’exploitant : vérifier le domaine dans Resend, configurer les enregistrements demandés et constater son état vérifié ; protéger la clé et l’expéditeur ; relire destinataires/accusés ; activer séparément les deux flags nécessaires ; vérifier worker et file ; obtenir l’autorisation d’un essai vers une boîte contrôlée, puis rapprocher identifiant fournisseur et réception. Aucun de ces actes externes n’a été réalisé ici. [Domaines vérifiés Resend](https://resend.com/docs/dashboard/domains/introduction).

## Search Console : lecture locale et synchronisation distinctes

Sources : [adaptateur](../../src/cms/search-console.ts), [API](../../src/app/api/search-console/route.ts), [panneau](../../src/components/cms/search-console-panel.tsx).

La lecture du panneau charge uniquement l’observation locale, avec contrôle propriétaire/admin/commercial et réponse `private, no-store`. La synchronisation exige propriétaire ou administrateur et origine autorisée. `CMS_SEARCH_CONSOLE=enabled`, l’origine HTTPS canonique, `GOOGLE_SEARCH_CONSOLE_PROPERTY`, `GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL` et `GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY` doivent être cohérents. La propriété choisie par configuration doit correspondre exactement à l’origine ou au domaine du site ; il n’existe pas de découverte interactive d’autres propriétés.

L’état « configurée » valide seulement ces paramètres. L’accès réel dépend encore du compte de service autorisé sur la propriété et de l’API active. Le JWT RSA est signé pour les points d’accès Google fixes avec le périmètre `webmasters.readonly`, sans délégation utilisateur. Les secrets et jetons ne sont pas écrits dans les observations. Le test vérifie la signature avec une clé éphémère, les permissions avant tout transport, le refus d’une autre propriété et l’absence d’URL sensible dans les fichiers persistés.

La période par défaut est de 28 jours, terminés depuis au moins trois jours ; le contrôle autorise 1–31 jours. Les jours sont ceux de `America/Los_Angeles`, les dates d’observation sont affichées en `Europe/Paris`. La requête vise des résultats Web finaux par page/appareil/date, sans mots-clés. Google précise que l’API ne retourne pas nécessairement toutes les lignes. [Contrat officiel Search Analytics](https://developers.google.com/webmaster-tools/v1/searchanalytics/query).

Les états `running/completed/failed`, dates de tentative/fin, offset et données partielles restent sous `.data/search-console`, sauvegardés. Une erreur HTTP ou un délai reste visible sans exposer le corps privé de l’erreur Google. Le bail expire après quatre minutes ; une reprise continue au lot enregistré. Une période terminée est renvoyée sans nouvel appel. Le test couvre panne après un premier lot, reprise à l’offset 1 000, concurrence et retrait des pages supprimées de l’affichage.

Limites de code explicites : synchronisation manuelle, aucun rafraîchissement automatique ni remplacement d’une période déjà terminée ; au plus 10 000 lignes reçues, avec avertissement ; seules les pages publiées de l’origine canonique sont retenues ; 50 lignes visibles dans le tableau. Une observation vide ne démontre pas l’absence de recherche Google. Le taux de clics affiché est **100 × somme des clics / somme des impressions des lignes conservées** ; sans impression il est « non calculable ». La position est affichée par ligne, sans moyenne globale arbitraire. Ces valeurs ne sont pas fusionnées avec la fréquentation navigateur.

## Analytics : consentement, périmètres et dénominateurs

Sources : [runtime](../../src/cms/analytics-events.ts), [instrumentation](../../src/components/cms/analytics.tsx), [collecte](../../src/app/api/events/route.ts), [agrégats](../../src/cms/audience-breakdown.ts), [pilotage](../../src/components/cms/operations-dashboard.tsx).

`CMS_BROWSER_ANALYTICS=enabled` est nécessaire côté rendu **et** collecte. Sans activation, le site ne monte pas le module et le point de collecte ne conserve pas d’événement navigateur. L’accord est uniquement en mémoire du chargement courant : aucun cookie, stockage durable, identifiant visiteur, file avant accord ou rattrapage des événements refusés. Le retrait annule les requêtes encore en attente et empêche les suivantes ; il ne peut pas effacer une requête déjà reçue par le serveur. Un rechargement remet le choix en attente.

La collecte requiert une origine autorisée, `consent:true`, un type connu et un identifiant propre à l’événement. Les références transmises doivent correspondre à du contenu publié. Les réponses de formulaire, identités, URL et paramètres libres sont refusés. Limites : 45 événements/minute côté runtime, 60 par clé d’abus/minute côté serveur, corps de 1 000 octets maximum. La déduplication serveur empêche de recompter un même identifiant ; elle ne détermine pas des visiteurs uniques. Les événements restent des mesures partielles, susceptibles d’être perdus ou bloqués ; ce ne sont pas des preuves comptables.

| Indicateur | Population / définition exacte | Taux ou limite |
| --- | --- | --- |
| Demandes reçues CRM | Briefs créés pendant la période UTC choisie | Comptage ; aucun dénominateur navigateur |
| Qualifiées / gagnées | Statut **actuel** des briefs créés pendant cette même période | Pas un historique des transitions de la période ; aucun taux automatique |
| `brief_received` | Transaction serveur confirmée, une fois par soumission dédupliquée, indépendamment du consentement facultatif | Séparé des événements navigateur ; jamais divisé par `form_start` ou `page_view` |
| Consultations | Événements `page_view` consentis par contenu et jour UTC | 50 contenus les plus consultés affichés ; pas de visiteurs uniques |
| Entrées / provenance | Première tentative de page mesurée après accord dans le chargement courant ; catégorie de provenance calculée localement | Origines comptées sur les **entrées** ; pas sur toutes les vues ni sur des sessions persistantes |
| Appareils | Catégorie de largeur de fenêtre pour chaque vue : mobile <768, tablette <1024, ordinateur sinon | Comptage sur les **consultations** ; pas une détection certaine du matériel |
| Lectures vidéo | Événement de démarrage manuel ou automatique du lecteur instrumenté, séparés | Un comptage par élément pendant l’écoute courante ; pas une preuve de durée vue |
| Progression vidéo | Positions atteintes 25/50/75/100 %, plusieurs jalons par lecture | Un déplacement peut franchir les jalons ; **aucune durée réellement regardée ni taux de complétion calculé** |
| Début / étapes du formulaire | Première interaction et validations d’étape consenties, dédupliquées dans le parcours courant | Pas de tunnel par personne ni de taux de conversion vers tous les briefs reçus |

Les vues françaises et anglaises partagent actuellement les mêmes identifiants de pages ; la mesure navigateur ne fournit pas de ventilation par langue. L’API ne transmet pas de domaine référent, de campagne ni de parcours individuel. L’écran explique les sources et affiche une indisponibilité lorsque la collecte est désactivée. Aucun taux ne mélange la population consentante avec tous les clients ou briefs.

### Observation navigateur isolée

La [preuve enregistrée](preuves/consentement-navigateur.json), datée `2026-10-26T21:00:41.211Z`, concerne uniquement `.data/tests/video-browser-N5e4Da/cms.db`. Avant choix et après refus, y compris une lecture vidéo, le compteur reste à zéro. Après accord : **11 événements**, soit 2 vues dont 1 entrée, 1 démarrage vidéo manuel, 4 jalons, 1 clic contact, 1 début de formulaire et les étapes 1 et 2. Après retrait puis navigation, le total reste à 11 ; la recette a également vérifié le retour à une demande d’accord au rechargement. Aucun brief n’a été envoyé dans ce parcours. Les données et l’activation sont confinées à cette fixture.

## Commandes exécutées et résultat

```powershell
npx tsx --test tests/cms-search-console.test.ts tests/auth-email.test.ts tests/cms-resend-transport.test.ts tests/cms-operations.test.ts
# 24 tests, 24 réussites, 0 échec
npx tsx --test tests/cms-analytics.test.ts tests/cms-audience.test.ts
# 7 tests, 7 réussites, 0 échec
npx eslint src/components/cms/operations-dashboard.tsx tests/cms-resend-transport.test.ts
# code de sortie 0
npx tsc --noEmit --pretty false
# code de sortie 0
```

Les tests ont utilisé des bases et destinataires synthétiques isolés, aucune clé de fournisseur réelle. Les sorties locales sont conservées dans `.data/integrations-test.log` et `.data/analytics-test.log`. Le seul changement de comportement produit de cette revue est le libellé explicite des jalons vidéo ; aucun calcul analytics n’a changé. Le nouveau test vérifie le vrai contrat du transport commercial intercepté, en complément des tests existants de l’outbox.
