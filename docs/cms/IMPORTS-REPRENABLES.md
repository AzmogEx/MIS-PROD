# Imports médias reprenables

La médiathèque `/medias` envoie les fichiers par fragments de 4 Mio. Après une coupure ou un redémarrage, le propriétaire retrouve l’import, resélectionne son fichier et reprend les fragments manquants. Tous les octets participent à une empreinte SHA-256 calculée par fragments ; le nom et la taille seuls ne suffisent pas. Une reprise renouvelle le jeton opaque et invalide le précédent.

Le traitement final crée un média à diffusion **restreinte**. Il utilise les contrôles de signature, de dimensions, de taille et de stockage du CMS. Les crédits et droits doivent ensuite être vérifiés avant diffusion publique.

## Point focal et nouvelle version recadrée

L’option de cadrage à l’import ouvre un aperçu avec choix du point focal, cadres 16:9, 4:3, carré ou vertical, et réglages au clavier. Le remplacement d’une image ouvre également cet aperçu. Le point focal initial guide les variantes web ; les octets de l’original sont conservés. Une modification ultérieure passe par une nouvelle version.

Un recadrage crée deux documents dans la même transaction : l’original intégral restreint, puis le dérivé restreint qui sera proposé au remplacement des références de brouillons. La provenance du dérivé cite l’identifiant de sa source ; la fiche d’usage de la source retrouve ce dérivé. La clé d’import garantit qu’une reprise ne recrée ni l’un ni l’autre. Les images animées ne peuvent pas être recadrées par ce parcours. Le choix de cadrage fait partie de la session : une reprise le conserve ; changer le cadrage crée un nouvel import.

La recette utilise une image rouge et bleue : les focales opposées produisent les variantes attendues, l’empreinte de chaque source reste exacte, et les dimensions du dérivé correspondent au cadre demandé.

## Stockage et limites

| Paramètre | Valeur par défaut | Fonction |
| --- | --- | --- |
| `MEDIA_IMPORT_ROOT` | `.data/media-imports` | Manifests et fragments privés ; jamais dans `public` ni dans le répertoire de diffusion des médias. |
| `MEDIA_IMPORT_STORAGE_MAX_BYTES` | 2 Gio | Réservation temporaire : deux fois la taille annoncée pour couvrir les écritures atomiques. |
| `MEDIA_IMPORT_TTL_SECONDS` | 86 400 | Durée de conservation, entre 60 secondes et 7 jours. La reprise ne prolonge pas l’échéance. |
| `MEDIA_MAX_BYTES` | 100 Mio | Taille maximale du fichier ; le parcours reprenable est également plafonné à 512 Mio. |
| `MEDIA_STORAGE_MAX_BYTES` | 10 Gio | Quota des médias et de leurs variantes, également vérifié lors de la finalisation. |

Les réservations sont limitées à huit imports actifs par compte, 256 actifs et 1 024 manifests au total. Les sessions expirées sont refusées immédiatement ; leurs fichiers sont purgés lors de la prochaine liste ou création d’import. L’annulation retire les fragments d’un import non terminé. Les médias déjà créés se gèrent dans leur fiche.

L’assemblage final et Payload/Sharp utilisent de la mémoire serveur. Ce parcours concerne les originaux web dans les limites annoncées ; les masters volumineux exigent une architecture de stockage et de traitement dédiée. Aucun fournisseur externe ni coût estimé n’est simulé.

## Concurrence, coupures et restauration

Le stockage est prévu pour **un hôte local avec SQLite configuré en `BEGIN IMMEDIATE`**. Le mutex central de l’adaptateur sérialise ses transactions. Une transaction exclusive protège les mutations de manifests, les réservations et les fragments ; un témoin `.lock` protège aussi la courte phase après commit. Les manifests et fragments sont écrits dans un fichier temporaire, synchronisés, puis renommés atomiquement. Ce mécanisme ne doit pas être utilisé sur un partage réseau multi-hôte.

La finalisation utilise la clé unique `resumable:<identifiant>`. Avant toute création elle recherche cette clé. Une nouvelle tentative après un commit retrouve le même média, même si la confirmation ou la dernière écriture du manifest a été perdue. Les fragments sont retirés uniquement après commit. Un crash survenant entre l’écriture physique de Payload et son commit peut laisser des fichiers orphelins : ils restent privés, comptés dans le stockage et conservés pour examen, sans second document média automatique.

Inclure le répertoire d’import dans les sauvegardes privées. Les jetons sont stockés sous forme d’empreinte. Exclure les témoins `.lock` des sauvegardes ou les retirer d’une restauration isolée après vérification qu’aucun traitement n’est actif. Si `MEDIA_IMPORT_ROOT` est externe à la sauvegarde habituelle, sauvegarder ce volume séparément et signaler explicitement cette portée.

## Contrôle d’accès et recette

Les routes `/api/media-imports` exigent une session propriétaire, administrateur ou éditeur. Les fragments, l’état individuel et la finalisation exigent aussi le jeton de session ; les modifications vérifient l’origine de la requête. Un éditeur ne peut reprendre ni annuler les imports d’un autre compte ; propriétaire et administrateur peuvent les reprendre avec le fichier correspondant. Les fragments n’ont aucune route de téléchargement public.

`tests/cms-media-import.test.ts` utilise une vraie base SQLite et un PNG de plus de 8 Mio. Il vérifie la lecture de l’état depuis un second processus Node, la reprise, les fragments dupliqués ou contradictoires, l’idempotence après commit, les permissions, le CSRF, les empreintes, les formats, le quota, les chemins et l’expiration. Les tests utilisent leurs propres répertoires temporaires et ne modifient pas la base du site.
