# Chaîne vidéo locale — état et preuve

Recette ciblée du 26 octobre 2026. Le choix retenu est la diffusion progressive de fichiers web sur stockage local persistant, avec lecture partielle HTTP et contrôle d’accès serveur. Aucun compte de stockage, CDN, transcodeur distant ni service payant n’a été ouvert ou utilisé. Cette vérification ne démontre pas l’exécution de Docker ou de Coolify ; voir [exploitation](EXPLOITATION.md) et [recette générale](RECETTE.md).

## Besoin observé et choix de diffusion

La vidéo non sensible du dépôt `public/hero.mp4` sert de source de recette. Son contenu n’a pas été modifié :

| Observation du fichier | Valeur |
| --- | --- |
| Poids | 7 040 524 octets, soit environ 6,71 Mio |
| Conteneur / codec vidéo | MP4, piste AVC/H.264 `avc1` |
| Dimensions / durée | 1920 × 1080, 15,44 secondes |
| Audio | Aucune piste audio dans ce fichier |
| Démarrage progressif | Bloc `moov` avant `mdat` (`fast start`) |
| Empreinte SHA-256 | `369f229262a6841f24bb87819b506bfe3d5d34bf0a8cb1a307090110d1cfaf03` |

Ce fichier court peut être lu sans charger un master de production. Son débit moyen calculé est d’environ 3,65 Mbit/s ; **ce n’est pas une mesure du débit disponible sur l’hôte**. Plusieurs lectures simultanées consomment la bande passante de cet hôte. La recette n’est pas un test de charge.

HLS n’est pas nécessaire pour démontrer la lecture, le déplacement dans ce fichier et les restrictions. Il devient un sujet distinct si MIS doit diffuser de longs films, plusieurs résolutions selon le réseau, de très gros fichiers ou un trafic dépassant la capacité mesurée de l’hôte. Aucun tel volume ni fournisseur n’est établi par le dépôt. Le choix local couvre les versions web dans les limites ci-dessous ; un master de montage volumineux ou dans un autre format exige une préparation/export ou une chaîne dédiée. Aucun transcodage ni génération automatique d’affiche n’est annoncé.

Le conteneur ne suffit pas à garantir la lecture d’un codec sur chaque navigateur. Le profil d’import public et client proposé est MP4 H.264, avec AAC si une piste audio existe ; WebM accepte les pistes VP8/VP9/AV1 et Opus/Vorbis. Le contrôle de conteneur refuse les structures tronquées, les dimensions excessives et les codecs hors profil. Il ne décode pas toutes les images et ne remplace pas une vérification de lecture ni un antivirus. [Formats et conteneurs documentés par MDN](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers).

## Parcours d’administration

1. Exporter une version web MP4 H.264, idéalement avec les métadonnées au début du fichier. Préparer une affiche image et, si disponibles, des sous-titres WebVTT. L’outil de montage reste responsable de l’encodage.
2. Dans `/medias`, importer la vidéo. L’import découpe le fichier en fragments de 4 Mio, vérifie leur empreinte et conserve un manifeste privé. En cas d’interruption, resélectionner **le même fichier** : seuls les fragments absents repartent. L’import confirmé reste restreint par défaut.
3. Importer l’affiche et le VTT. Ouvrir **Affiche, sous-titres et réglages avancés** sur la vidéo pour les associer. Le champ Affiche n’accepte que des images ; Sous-titres n’accepte que `text/vtt`. Renseigner la langue du VTT, la transcription éditoriale, les crédits et les droits. Pour un affichage public, rendre disponibles la vidéo **et** ses dépendances : une affiche ou un VTT restreint/expiré reste inaccessible au visiteur.
4. Placer le média dans un bloc éditorial ou une galerie, vérifier l’aperçu et publier la page. Le lecteur composé a des commandes natives, `preload="none"`, une affiche, le VTT avec sa langue et une transcription dépliable. Les cartes ne lancent pas une vidéo massive pour afficher une vignette. Le fond historique possède séparément son comportement automatique administrable.
5. Pour remplacer le film, importer une nouvelle entrée puis **Remplacer les références des brouillons**. Vérifier et publier les contenus affectés. L’ancien fichier et les références des versions/publications précédentes sont conservés. Les dépendances d’autres médias et modèles sont signalées dans les usages mais ne sont pas remplacées silencieusement.
6. Pour un livrable client, importer le fichier dans **Fichiers privés**, l’associer au projet, puis créer une **Version de livrable**. Le client attribué retrouve cette version dans `/espace-client`, peut lire, déplacer le lecteur, commenter à un instant précis et valider cette version. V2 exige une nouvelle entrée et ne réécrit pas l’acceptation de V1.

Les métadonnées de médiathèque, dont les droits et relations affiche/VTT, sont partagées par les contenus qui utilisent cette entrée. Elles prennent effet immédiatement ; elles ne constituent pas un brouillon de page. Pour conserver une ancienne association d’affiche ou de sous-titres avec un film historique, créer une nouvelle entrée vidéo et remplacer la référence en brouillon. Les octets des originaux sont immuables.

WebVTT est un fichier texte UTF-8 de repères temporels associé à un élément `track`. L’import vérifie l’en-tête, la taille et l’absence d’octets nuls ; la justesse des repères, le contenu et l’adéquation linguistique restent à relire. [WebVTT dans MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API).

## Stockage, limites et exploitation

| Paramètre | Valeur par défaut / effet |
| --- | --- |
| `CMS_MEDIA_DIR` | `.data/media`, originaux publics/restreints et variantes d’images. Dans Compose, sous le volume persistant `.data`. |
| `CMS_PRIVATE_FILES_DIR` | `.cms/private`, fichiers clients ; volume `.cms` persistant. Jamais un répertoire statique du serveur web. |
| `MEDIA_MAX_BYTES` | 100 Mio, plafond global du corps d’upload et plafond média. Harmoniser la limite du proxy. |
| `CMS_PRIVATE_UPLOAD_MAX_BYTES` | 250 Mio, validation propre aux fichiers privés ; le plafond global de 100 Mio demeure effectif tant qu’il n’est pas ajusté. |
| `MEDIA_STORAGE_MAX_BYTES` | 10 Gio, quota total des médias, originaux et variantes conservés. |
| `CMS_PRIVATE_STORAGE_MAX_BYTES` | 10 Gio, quota total mesuré des fichiers privés. Une nouvelle écriture qui dépasse le quota est refusée ; les versions existantes restent intactes. |
| `MEDIA_IMPORT_ROOT` | `.data/media-imports`, fragments et manifestes privés, sous volume persistant. |
| `MEDIA_IMPORT_STORAGE_MAX_BYTES` | 2 Gio réservés aux imports en attente, avec prise en compte de l’assemblage. |
| `MEDIA_IMPORT_TTL_SECONDS` | 86 400 secondes par défaut ; date de reprise indiquée dans l’interface. |

Les imports reprenables restent bornés au minimum du plafond média et de 512 Mio. L’assemblage final charge le fichier en mémoire et l’examen vidéo parcourt des métadonnées bornées : augmenter la limite exige de vérifier RAM, temps de requête et concurrence. Il n’existe pas de file de transcodage vidéo cachée : l’import est persisté/reprenable, puis la validation et l’écriture ont lieu lors de la finalisation. Voir [imports reprenables](IMPORTS-REPRENABLES.md).

Le stockage requiert un disque local durable, un serveur d’écriture et le worker prévu par la configuration. Les quotas sont des limites applicatives, pas une réservation de capacité du disque. Sauvegardes, copies de restauration, fichiers historiques de `public/` et éventuelles autres applications consomment aussi le disque ; l’exploitant doit surveiller l’espace libre de l’hôte. Les sauvegardes prennent en compte les racines configurées sous le projet et refusent les racines externes sans procédure adaptée. Aucun stockage distant n’est implicitement couvert.

Une version précédente, un fichier privé ou un média public conservé n’est pas une archive froide avec cycle de vie automatique. L’effacement des archives reste une décision documentée après examen des obligations et usages. Le quota ne purge pas des fichiers pour dégager de l’espace.

## Lecture partielle et retrait d’accès

Les médias publics passent par `/api/media/file/<nom>` : Payload applique l’accès avant d’ouvrir le fichier, puis sert les requêtes `Range`. Les fichiers clients passent par `/api/client/files/<id>` : session, appartenance au projet, visibilité du document/livrable, expiration et révocation sont vérifiées à chaque requête. Le chemin natif `/api/private-files/file/<nom>` ne donne pas accès aux clients ; il reste réservé à l’équipe habilitée. Les fichiers restent physiquement dans le répertoire privé.

Un segment accepté répond `206` avec `Content-Range`, `Content-Length`, `Accept-Ranges: bytes` et les octets demandés ; une plage hors limites répond `416`. La route privée accepte aussi `HEAD` sans corps. Les réponses de fichiers utilisent `Cache-Control: private, no-store` et `nosniff`. Les liens temporaires vérifient leur jeton, la révocation, leur échéance, l’état du projet et les droits du fichier avant **chaque** segment. [Fonctionnement des requêtes partielles HTTP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Range_requests).

Restreindre un média ou dépasser sa date de droits retire sa diffusion publique sans attendre un worker. Une ancienne URL ne permet plus un nouveau téléchargement anonyme ou un nouveau segment autorisé. L’équipe conserve son accès de gestion prévu par les rôles ; un retrait de diffusion publique ne supprime pas l’original. Un projet archivé retire les accès clients et partages. Aucun nom physique de fichier privé ni clé de stockage n’est un jeton public.

Une révocation ne rappelle pas des octets déjà téléchargés, les images déjà en mémoire du lecteur ni une copie locale faite par un destinataire. Le reverse proxy/CDN doit respecter `no-store` et ne pas exposer directement les volumes. Les fichiers statiques historiques sous `public/` sont un autre chemin public : leur copie en médiathèque ne les privatise pas rétroactivement. Une migration de leurs références et le traitement explicite de l’original restent nécessaires avant de prétendre retirer cette ancienne URL.

## Preuves exécutées

`npx tsx --test --test-force-exit tests/cms-video.test.ts` : **9 tests réussis**, avec le vrai MP4, une affiche PNG décodable, un VTT et une vraie base SQLite isolée. Couverture :

- Inspection du conteneur/codec/durée/dimensions et refus avant écriture des faux conteneurs, fichiers tronqués et codec MP4 non pris en charge.
- Deux fragments réels, interruption/reprise, finalisation répétée sans doublon ; lecture des dimensions dans SQLite et comparaison SHA-256 des octets depuis un **second processus Node**.
- Affiche et VTT liés, refus d’une image utilisée comme VTT ou l’inverse ; récupération du VTT et accès aux variantes de l’affiche.
- Segments publics début/milieu/suffixe comparés aux octets source, plage invalide, type MIME et cache ; usages de la dépendance VTT.
- Remplacement en brouillon sans modifier le public ni le fichier historique, tentative d’écrasement refusée, retrait effectif du média expiré.
- MP4 privé, sessions de deux clients, refus anonyme et interclient, refus du chemin natif, `HEAD`, segments/suffixes, plage invalide ; V1 acceptée inchangée après V2.
- Partage valide puis révoqué/expiré, fichier expiré, projet archivé : les nouveaux segments sont refusés. Quota privé sans écriture ni perte de versions.
- SVG statique importé via REST et ICO PNG par import reprenable, octets conservés ; SVG actif refusé avant écriture. Ces cas complètent la recette des formats administrables.

Suite de non-régression ciblée :

```powershell
npx tsx --test --test-force-exit tests/cms-video.test.ts tests/cms-client.test.ts tests/cms-transcription.test.ts tests/cms-media.test.ts tests/cms-media-import.test.ts
```

**44 tests réussis, aucun échec**, environ 23,9 s, après autorisation d’accès aux serveurs de test sur `127.0.0.1`. La première tentative sandbox avait échoué sur `EACCES` pour ces connexions locales ; ce résultat n’était pas un échec d’inférence auprès d’un fournisseur. Aucun appel externe n’a été effectué. Après le dernier ajout des filtres Affiche/VTT, la suite vidéo seule a été rejouée : 9/9. Lint ciblé réussi. Les contrôles globaux et la recette finale sont consignés par l’intégration générale.

### Parcours navigateur reproductible

`npx tsx scripts/cms-video-fixture.ts` crée **un nouveau** dossier `.data/tests/video-browser-*`, une base migrée sans schema push, des dossiers médias/privés/imports distincts, deux comptes aléatoires et `/recette-video`. Les identifiants sont écrits uniquement dans un fichier privé `credentials.json` ; ils ne sont pas affichés. `.data/video-qa-latest.json` donne les chemins et identifiants documentaires sans mot de passe. La collecte locale est activée uniquement dans cette fixture, avec consentement ; emails, Search Console et conservation restent désactivés.

Charger le fichier d’environnement indiqué par le dernier manifeste et démarrer le véritable site :

```powershell
node scripts/cms-video-server.mjs
```

Le chargement se fait dans le processus avant de lancer Next ; l’option CLI `--env-file` avait été recopiée dans `NODE_OPTIONS` par les workers Next et empêchait ce démarrage. Ouvrir `/recette-video` puis se connecter avec le compte client de la fixture pour le lecteur de V1. Le script prépare une recette d’application réelle ; son succès **ne prouve pas à lui seul** le fonctionnement de Docker ou les volumes après recréation d’un conteneur.

Constats navigateur réels sur cette fixture : lecture volontaire du MP4, durée 15,44 s, dimensions 1920 × 1080, `readyState=4`, déplacement à 12,6 s et VTT chargé (`readyState=2`, anglais, affiché). Après refus de la mesure : zéro événement ; après accord : une page vue, une lecture manuelle et les jalons 25/50/75/100. Les jalons indiquent une position atteinte, pas un temps de visionnage, notamment après un déplacement. Les contrôles privés/mobile et captures sont consignés avec la [recette générale](RECETTE.md).

Limites explicites : le MP4 H.264 ci-dessus est le fichier réel couvert ; la matrice de décodage WebM, les appareils Safari/iOS, les MP4 avec piste AAC et le trafic simultané ne sont pas vérifiés par ces tests serveur. FFmpeg/ffprobe ne sont pas installés dans le PATH de cette recette. Le contrôle utilise les structures du conteneur et le lecteur réel pour les preuves complémentaires, sans inventer de résultat de transcodage.
