# Recette réelle Ollama — 26 octobre 2026

Une génération française réelle a été exécutée via le CMS, sur un texte fictif sans client réel. Le résultat reste une suggestion privée. Aucune publication, réponse client ou transmission à une IA externe n’a été effectuée. La preuve machine est [ia-locale.json](preuves/ia-locale.json) ; le contrôle reproductible est `scripts/cms-ai-local-check.ts`, volontairement exclu de la CI et du seed.

## Observation

| Élément | Valeur réellement observée |
| --- | --- |
| Heure | 26/10/2026 20:46:39 UTC |
| Serveur | Ollama 0.40.6, `127.0.0.1:11435` |
| Modèle déjà installé | `dolphin-llama3:latest`, 4 661 235 994 octets ; digest de manifeste annoncé par Ollama dans la preuve |
| Entrée / sortie | 179 / 121 tokens ; 8,714 secondes pour le contrôle |
| Persistance | Une demande terminée, une réservation de quota ; répétition de la même clé = même demande |
| Poste | Windows, Node 26.4.0, 32 Gio de RAM ; RTX 5080, 15,9 Gio de VRAM annoncée |
| Chargement observé | 33/33 couches sur GPU ; tampon modèle CUDA 4 156 Mio et hôte 281,82 Mio |
| Cloisonnement | Cloud désactivé dans le journal du serveur, écoute en boucle locale uniquement |

Ces mesures décrivent ce poste et ce modèle, sans garantie de vitesse sur un hôte Coolify. Le résultat reprend les faits du texte synthétique mais inclut une consigne éditoriale qui mériterait d’être retirée à la relecture : réussite technique et qualité éditoriale sont deux validations distinctes. Aucun corpus privé ni test de qualité métier français exhaustif n’a été utilisé.

## Rejouer sans modifier l’installation habituelle

Le poste possédait déjà Ollama et le modèle. Sa variable habituelle `OLLAMA_HOST` désignait une IP distante ; la recette l’a remplacée uniquement dans son processus enfant. Ce service distant n’a reçu aucun texte. Pour un nouvel hôte, installer Ollama depuis sa source officielle et un modèle local autorisé, vérifier sa licence, son empreinte et les ressources disponibles avant de configurer le CMS. Ne jamais sélectionner un modèle cloud dans cet adaptateur.

Dans une console dédiée, avec un compte non privilégié :

```powershell
$env:OLLAMA_HOST = '127.0.0.1:11435'
$env:OLLAMA_NO_CLOUD = '1'
$env:OLLAMA_CONTEXT_LENGTH = '2048'
$env:OLLAMA_NUM_PARALLEL = '1'
$env:OLLAMA_MAX_LOADED_MODELS = '1'
$env:OLLAMA_KEEP_ALIVE = '0'
ollama serve
```

Dans une seconde console à la racine du dépôt :

```powershell
$env:OLLAMA_BASE_URL = 'http://127.0.0.1:11435'
$env:CMS_CHECK_OLLAMA_MODEL = 'dolphin-llama3:latest'
npx tsx scripts/cms-ai-local-check.ts
```

Le script crée sa propre base sous `.data/tests/ai-real-*`, un compte aléatoire et des quotas de deux demandes. Il ne configure pas la base livrable. Le test est explicite : ne pas l’ajouter à un démarrage automatique. En exploitation, configurer `OLLAMA_BASE_URL`, sélectionner le modèle installé dans les paramètres IA et fixer les quotas avant activation. Garder le service sur la même boucle locale que l’application : dans Docker, `127.0.0.1` désigne le conteneur courant. Le Compose actuel n’installe ni modèle ni serveur IA.

La [FAQ officielle Ollama](https://docs.ollama.com/faq) décrit les variables d’écoute, de mémoire et de désactivation du cloud. La [recette Whisper](TRANSCRIPTION-LOCALE.md) décrit séparément la transcription.

## Décision d’autorisation conservée

La revue automatique avait refusé l’adaptateur IA externe envisagé, à cause du risque de transfert de contenus privés. Ce refus reste respecté : cet adaptateur n’a pas été ajouté, aucune clé externe demandée et aucun contournement effectué. Les essais locaux ci-dessus utilisent uniquement des données synthétiques.
