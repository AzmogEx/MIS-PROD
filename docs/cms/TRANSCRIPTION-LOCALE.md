# Transcription locale, suggestion à relire

L’écran `/assistance` propose les fichiers audio/vidéo déjà présents dans la médiathèque ou les fichiers privés auxquels le compte a accès. La transcription reste dans `ai-requests`, visible du demandeur et des administrateurs. Elle ne modifie ni le fichier, ni le champ transcription du média, ni les sous-titres, ni une page publiée. L’équipe peut relire la suggestion avant de l’utiliser.

## Contrat du fournisseur

L’adaptateur appelle uniquement `POST /inference` d’un serveur **whisper.cpp déjà installé et lancé par l’exploitant** sur `127.0.0.1` ou `::1`. L’interface officielle utilise un fichier multipart et `response_format=json` ; l’option serveur `--convert` permet d’utiliser une conversion FFmpeg locale. Ces éléments ont été vérifiés dans le [README officiel](https://github.com/ggml-org/whisper.cpp/tree/master/examples/server) et les paramètres `language`, `duration` et la réponse `text` dans le [code du serveur](https://github.com/ggml-org/whisper.cpp/blob/master/examples/server/server.cpp).

Le CMS n’installe aucun modèle, n’appelle pas `/load` et n’envoie pas de données à un fournisseur distant. Le modèle chargé reste celui du serveur : `WHISPER_MODEL` est son identifiant déclaré par l’exploitant, pas une sélection distante ni une attestation automatique du modèle réellement chargé.

## Paramètres

| Paramètre | Par défaut | Effet |
| --- | --- | --- |
| `WHISPER_BASE_URL` | vide | URL racine locale, par exemple `http://127.0.0.1:8080`. Noms DNS, authentification dans l’URL, chemins et redirections refusés. |
| `WHISPER_MODEL` | vide | Identifiant du modèle déjà chargé, par exemple `ggml-small.bin`. |
| `WHISPER_CONVERT_ENABLED` | `false` | `true` uniquement si l’exploitant a configuré le serveur avec conversion locale ; autorise MP3, MP4 et WebM. |
| `WHISPER_MAX_AUDIO_BYTES` | 25 Mio | Taille physique maximale, plafond absolu 100 Mio. |
| `WHISPER_MAX_AUDIO_SECONDS` | 900 | Limite demandée à l’inférence, plafond une heure. |
| `WHISPER_TIMEOUT_MS` | 180 000 | Délai HTTP, plafond 300 000 ms. |

Activer également l’assistance dans `/admin/globals/ai-settings`. Les quotas quotidiens et mensuels sont **communs à Ollama et Whisper** et réservés avant chaque appel. Aucun coût externe n’est calculé. La transcription peut fonctionner sans modèle Ollama configuré.

Sans conversion, utiliser un WAV PCM 16 bits à 16 kHz, mono ou stéréo, enregistré dans les fichiers privés. L’en-tête, la cohérence du format et la durée sont vérifiés. Pour MP3/MP4/WebM, l’extension de sortie envoyée au serveur est fixe, la signature est vérifiée et la durée de traitement est bornée par le paramètre d’inférence. La durée complète du conteneur n’est pas sondée dans le CMS : l’interface annonce explicitement un traitement des premières minutes. Le décodage/conversion peut nécessiter de lire le conteneur complet ; son coût dépend donc aussi de la limite d’octets et du serveur local.

Exploiter whisper.cpp avec un compte non privilégié et un répertoire temporaire isolé, comme recommandé par son projet. La configuration du modèle, FFmpeg si nécessaire, la capacité mémoire et le cloisonnement du processus relèvent de l’hôte. Dans un conteneur, `127.0.0.1` désigne ce même conteneur : un nom de service Docker ou une IP distante ne sera pas accepté par cet adaptateur.

## Accès et reprise

L’API `/api/client/transcription` exige une session d’équipe et contrôle l’origine des mutations. Les clients et intervenants limités sont refusés. Les médias suivent leurs droits de lecture et échéances ; les fichiers privés exigent les droits de leur collection et du projet, ne doivent être ni révoqués, ni expirés, ni rattachés à un projet archivé. Les fichiers ne sont jamais copiés dans le stockage public. Les noms et chemins fournis par le navigateur ne sont pas utilisés : seule une référence de collection et d’identifiant est acceptée.

Chaque demande associe son identifiant, la source, son empreinte SHA-256 et sa langue. Une nouvelle tentative avec le même identifiant retrouve la même demande ; un doublon concurrent ne déclenche pas une deuxième inférence. Une interruption après réservation reste en attente ou en échec ; elle n’est jamais relancée automatiquement. Consulter les dernières suggestions avant de créer une nouvelle demande, qui consommera une nouvelle réservation. Un échec du fournisseur conserve la réservation consommée ; un quota déjà atteint ne consomme pas de nouvelle place.

## Recette et limite de preuve

`tests/cms-transcription.test.ts` utilise une base SQLite isolée, des fichiers physiques et un serveur HTTP de recette sur `127.0.0.1`. Les huit résultats de test couvrent le contrat multipart, les droits réels, les fichiers privés/publics, l’immutabilité, les signatures et limites, les redirections refusées, l’idempotence concurrente et les quotas partagés. Le test nécessite l’autorisation de connexion à la boucle locale dans les environnements sandboxés.

Ce serveur de test renvoie un texte déterministe et valide les protections. Une recette distincte a ensuite utilisé **le véritable modèle `ggml-tiny.bin` et whisper.cpp b5454**, localement sous Windows : l’extrait public JFK de 11 secondes a été transcrit par l’API du CMS. La [preuve datée](preuves/transcription-locale.json) conserve les sources, empreintes, durée et texte réellement retourné. Elle démontre aussi le refus anonyme/client, la conservation du fichier, une seule demande et une seule réservation après répétition, puis la lecture des lignes SQLite depuis un autre processus. Aucune donnée client réelle n’a été envoyée au modèle.

Le contrôle volontaire `npx tsx scripts/cms-whisper-local-check.ts` utilise une nouvelle base `.data/tests/whisper-real-*`. Il n’est appelé ni par CI, ni par seed, ni par le démarrage de production. Il requiert le modèle, le fichier public, leur `provenance.json` et un serveur déjà disponible sur `127.0.0.1:8089`. Les artefacts et bases restent dans `.data`, exclu de Git ; la preuve publiée ne contient aucun identifiant de connexion.

## Installation locale de référence, sans installation globale

Cette recette utilise l’archive Windows x64 de la [préversion officielle b5454](https://github.com/ggml-org/whisper.cpp/releases/tag/b5454), correspondant à la version 1.9.5 du projet. Elle n’atteste pas une installation Linux ou Coolify. Les téléchargements sont exclusivement des artefacts publics ; aucun téléchargement ou mise à jour de modèle n’est exécuté automatiquement par le CMS.

| Artefact vérifié | Taille | SHA-256 |
| --- | --- | --- |
| `whisper-bin-x64.zip` | 8 928 640 octets | `6ba69e3482d7826214f90a6a9c84ca07782aec1e1d0c6a7c30c994fd5d816ccb` |
| `ggml-tiny.bin` | 77 691 713 octets | `be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21` |
| `jfk.wav` | 352 078 octets | `59dfb9a4acb36fe2a2affc14bacbee2920ff435cb13cc314a08c13f66ba7860e` |

L’empreinte de l’archive a été comparée au digest de l’API des versions GitHub, celle du modèle au [pointeur LFS officiel](https://huggingface.co/ggerganov/whisper.cpp/raw/main/ggml-tiny.bin). Le sample provient du [tag officiel v1.9.5](https://raw.githubusercontent.com/ggml-org/whisper.cpp/v1.9.5/samples/jfk.wav). Pour une autre version, vérifier à nouveau les empreintes et conserver la provenance avant exécution.

Exemple de préparation manuelle depuis la racine du projet, avec délais bornés et reprise du modèle :

```powershell
$whisperRoot = Join-Path (Get-Location) '.data/local-tools/whisper-b5454'
New-Item -ItemType Directory -Path $whisperRoot -Force | Out-Null
curl.exe --fail --location --connect-timeout 15 --max-time 180 --output "$whisperRoot/whisper-bin-x64.zip" https://github.com/ggml-org/whisper.cpp/releases/download/b5454/whisper-bin-x64.zip
curl.exe --fail --location --connect-timeout 15 --max-time 180 --continue-at - --output "$whisperRoot/ggml-tiny.bin" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin
curl.exe --fail --location --connect-timeout 15 --max-time 30 --output "$whisperRoot/jfk.wav" https://raw.githubusercontent.com/ggml-org/whisper.cpp/v1.9.5/samples/jfk.wav
Get-FileHash -Algorithm SHA256 -LiteralPath "$whisperRoot/whisper-bin-x64.zip", "$whisperRoot/ggml-tiny.bin", "$whisperRoot/jfk.wav"
```

Comparer les trois empreintes au tableau avant de poursuivre. Un téléchargement partiel doit être repris et son empreinte contrôlée ; un HTTP réussi seul n’est pas une validation. Après cette vérification :

```powershell
Expand-Archive -LiteralPath "$whisperRoot/whisper-bin-x64.zip" -DestinationPath $whisperRoot -Force
New-Item -ItemType Directory -Path "$whisperRoot/public-empty" -Force | Out-Null
& "$whisperRoot/Release/whisper-server.exe" --host 127.0.0.1 --port 8089 --model "$whisperRoot/ggml-tiny.bin" --no-gpu --threads 4 --public "$whisperRoot/public-empty" --tmp-dir $whisperRoot
```

Le lancement validé reste au premier plan dans un terminal, avec un répertoire public vide. Attendre le message d’écoute puis contrôler `http://127.0.0.1:8089/health` avant une demande du CMS. Deux lancements antérieurs n’avaient pas atteint l’écoute ; leur cause exacte n’a pas été établie. Ne pas confondre le message « modèle chargé » avec la disponibilité HTTP. L’arrêt du terminal arrête ce serveur de recette ; il n’est pas un service de production installé.

Dans le processus CMS, définir `WHISPER_BASE_URL=http://127.0.0.1:8089`, `WHISPER_MODEL=ggml-tiny.bin` et `WHISPER_CONVERT_ENABLED=false`, puis activer l’assistance locale. Pour rejouer le script de preuve, conserver les valeurs du tableau et les trois URL sources dans `.data/local-tools/whisper-b5454/provenance.json`, au format de la preuve JSON. Le script recalcule les empreintes avant toute inférence.

La recette a utilisé quatre threads CPU, sans GPU ni FFmpeg. Le modèle occupe 74,1 Mio sur disque ; la mémoire résidente du serveur après traitement était environ 167 Mio, pic observé 169 Mio. Ces valeurs mesurées ne constituent pas un dimensionnement de production. La conversion de MP3/MP4/WebM, le français, les longs enregistrements, les accents, le bruit et la charge simultanée restent à qualifier avec des enregistrements autorisés. Le résultat anglais correct d’un extrait ne certifie pas la qualité générale du modèle et ne déclenche aucune publication.
