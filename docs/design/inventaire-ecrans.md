# Inventaire des écrans — appli de suivi de callisthénie

## À propos de ce document

Ce document liste **tous les écrans** de l'application dans son état actuel et, pour chacun, **les éléments qu'on y trouve** : textes, données affichées, champs, boutons, états successifs et navigation. Il sert de base à la refonte visuelle complète de l'appli.

Il ne contient volontairement **aucune indication de design** : ni couleurs, ni tailles, ni disposition, ni style. Seuls le contenu et le comportement sont décrits. Toute la mise en forme est à concevoir librement.

### Contexte

- Application **Android** personnelle (React Native + Expo) pour guider et enregistrer des séances de callisthénie (musculation au poids du corps). Une seule personne l'utilise, pendant ses entraînements, souvent avec de la musique en fond.
- Pas de compte ni de connexion : toutes les données sont stockées localement sur le téléphone.
- **Interface en français.**
- L'écran de séance s'utilise pendant l'effort : téléphone posé, coups d'œil rapides, appuis entre deux séries.

### Vocabulaire

| Terme | Sens |
|---|---|
| **Entrainement** (workout) | Un programme réutilisable : une suite ordonnée de blocs. Ex. « Push day ». |
| **Bloc** | Un élément de l'entrainement : soit un **exercice**, soit un **temps de repos** autonome. |
| **Exercice** | De type **répétitions** (objectif en reps, ex. pompes) ou **temps** (objectif en secondes, ex. planche). Les exercices sont rangés dans une bibliothèque réutilisable. |
| **Série** | Une exécution d'un exercice. Un bloc exercice contient plusieurs séries, chacune avec son propre objectif (ex. 12 / 10 / 8). |
| **Séance** (session) | Une exécution réelle d'un entrainement, enregistrée avec sa date et les valeurs réalisées. |
| **Record** | La meilleure valeur réalisée pour un exercice **à un numéro de série précis, dans cet entrainement**. La 3ᵉ série a son propre record, distinct de celui de la 1ʳᵉ. |
| **Dernière fois** | La valeur réalisée à la séance précédente du même entrainement, pour la même série du même exercice. |

### Carte de navigation

```
Barre d'onglets
├── Onglet « Home »   → Accueil (liste des entrainements)
│     ├── Nouvel entrainement (création)
│     ├── Détail d'un entrainement
│     │     ├── Séance (exécution)
│     │     └── Duplication
│     └── Debug DB (temporaire)
└── Onglet « Chrono » → Chrono seul
```

La **modale de sélection d'exercice** s'ouvre depuis les écrans de création et de duplication.

---

## Éléments communs

### Barre d'onglets

Visible sur les deux écrans d'onglet (Accueil et Chrono), masquée sur tous les autres écrans.

- **Onglet « Home »** : icône maison, libellé « Home ».
- **Onglet « Chrono »** : icône chronomètre, libellé « Chrono ».
- L'onglet actif est distingué de l'inactif.
- L'appui sur un onglet n'a actuellement aucun retour visuel. L'effet d'onde d'Android a été retiré exprès.

### En-tête natif (barre de titre)

Présent sur les écrans Création, Détail, Duplication et Debug. Il contient :
- un **bouton retour** vers l'écran précédent ;
- un **titre**, propre à chaque écran (indiqué dans les sections ci-dessous).

Absent sur l'Accueil, le Chrono et la Séance, qui affichent leur propre titre ou leur propre barre du haut.

### Boîtes de dialogue système

L'appli utilise des alertes natives Android : titre, message et boutons. Elles sont listées dans les écrans qui les déclenchent.

### Clavier

Les écrans qui ont des champs de saisie (Création, Duplication, Séance en mode révision ou récap, Chrono, modale d'exercice) laissent de la place pour que le champ actif reste visible au-dessus du clavier. Tous les champs numériques ouvrent un **pavé numérique**.

---

## 1. Accueil — liste des entrainements

**Accès** : onglet « Home ». C'est l'écran de démarrage de l'appli.

**Éléments**
- **Titre** : « Mes entrainements ».
- **Liste des entrainements**, du plus récent au plus ancien.
  - Chaque élément affiche **le nom de l'entrainement** (ex. « Push day », « Full body (2) ») et rien d'autre.
  - Appui → ouvre le **Détail** de cet entrainement.
  - La liste défile quand elle est longue.
- **État vide** (aucun entrainement) : texte « Aucun entrainement pour l'instant. »
- **Bouton « + Nouvel entrainement »** → ouvre l'écran de **Création**.
- **Lien « Debug DB »** → ouvre l'écran **Debug** (temporaire, voir §8).

La liste se recharge chaque fois qu'on revient sur cet écran, par exemple après avoir créé un entrainement.

---

## 2. Création d'un entrainement

**Accès** : bouton « + Nouvel entrainement » de l'Accueil.
**Titre de l'en-tête** : « Nouvel entrainement ».

L'écran est un formulaire qui défile. Sa construction est identique à celle de l'écran de Duplication (§4).

**Champs généraux**
- **Libellé « Nom de l'entrainement »** + champ texte (exemple affiché quand le champ est vide : « Ex: Push day »).
- **Libellé « Description (optionnel) »** + champ texte sur plusieurs lignes (exemple affiché quand le champ est vide : « Notes, objectifs, contexte... »).

**Liste des blocs**, dans l'ordre de l'entrainement. Elle est vide au départ, et chaque bloc est numéroté selon sa position (1, 2, 3…). Deux types de blocs :

- **Bloc exercice**
  - Titre : numéro + nom de l'exercice (ex. « 1. Pompes »).
  - **Bouton ↑** : remonter le bloc d'un cran.
  - **Bouton ↓** : descendre le bloc d'un cran.
  - **Bouton ✕** : supprimer le bloc.
  - **Une ligne par série** : libellé « Série N », un champ numérique (l'objectif), l'unité (« reps » ou « sec » selon le type d'exercice). S'il y a plus d'une série, chaque ligne a aussi un **bouton ✕** pour supprimer cette série.
  - **Bouton « + Ajouter une série »** : ajoute une série, préremplie avec l'objectif de la dernière série.
  - **Ligne « Repos entre séries »** : champ numérique + unité « sec ».
  - Valeurs par défaut quand on ajoute un exercice : 1 série, objectif 10 reps ou 30 sec selon le type, 60 sec de repos entre séries.
- **Bloc repos**
  - Titre : numéro + « Repos » (ex. « 3. Repos »).
  - **Boutons ↑, ↓ et ✕** (mêmes actions que pour un bloc exercice).
  - **Ligne « Durée »** : champ numérique + unité « sec ». Vaut 90 par défaut.
  - Les blocs exercice et repos doivent pouvoir se distinguer l'un de l'autre.

**Actions**
- **Bouton « + Exercice »** → ouvre la **modale de sélection d'exercice** (§7). L'exercice choisi est ajouté en fin de liste.
- **Bouton « + Repos »** → ajoute un bloc repos en fin de liste.
- **Bouton « Enregistrer l'entrainement »** → enregistre l'entrainement et revient à l'écran précédent. Il ne fait rien si le nom est vide ou s'il n'y a aucun bloc, et n'affiche aucun message dans ce cas.

---

## 3. Détail d'un entrainement

**Accès** : appui sur un entrainement dans l'Accueil.
**Titre de l'en-tête** : le nom de l'entrainement.

**Éléments**
- **Nom de l'entrainement** (repris dans le contenu).
- **Description**, affichée seulement si elle existe.
- **Bouton « Lancer l'entrainement »** → ouvre l'écran **Séance**.
- **Aperçu des blocs**, dans l'ordre, en lecture seule :
  - **Bloc exercice** : nom de l'exercice ; les objectifs de chaque série séparés par des tirets, suivis de l'unité (ex. « 12 - 10 - 8 reps », « 30 - 30 sec ») ; la ligne « Repos entre séries : 60 sec ».
  - **Bloc repos** : « Repos : 90 sec ».
  - Les deux types doivent pouvoir se distinguer l'un de l'autre.
- **Section « Historique »** :
  - Titre de section « Historique ».
  - **État vide** : « Aucune séance enregistrée pour l'instant. »
  - Sinon, **une entrée dépliable par séance passée**, de la plus récente à la plus ancienne.
    - **En-tête** (toujours visible) : date et heure de la séance (ex. « 10 septembre 2026, 14:32 ») et un indicateur déplié / replié. Un appui déplie ou replie l'entrée.
    - **Contenu déplié** : une ligne par exercice, dans l'ordre de l'entrainement, avec le nom de l'exercice et les valeurs de chaque série séparées par des tirets, suivies de l'unité (ex. « Pompes — 12 - 11 - 9 reps »).
    - Plusieurs entrées peuvent être dépliées en même temps.
- **Bouton « Dupliquer »** → ouvre l'écran **Duplication**.
- **Bouton « Supprimer »** → ouvre une confirmation :
  - Titre « Supprimer cet entrainement ? », message « Cette action est irréversible. »
  - Boutons « Annuler » et « Supprimer » (ce dernier marqué comme destructif).
  - Après suppression, retour à l'Accueil.

**État de chargement** : texte « Chargement... » le temps de lire les données.

L'écran se recharge chaque fois qu'on y revient, par exemple après une séance.

---

## 4. Duplication d'un entrainement

**Accès** : bouton « Dupliquer » du Détail.
**Titre de l'en-tête** : « Dupliquer "Nom de l'entrainement" ».

On ne peut pas modifier un entrainement existant. On le duplique, on ajuste la copie, et on l'enregistre comme un **nouvel** entrainement.

**Éléments** : exactement le même formulaire que la **Création** (§2), avec ces différences :
- Le formulaire est **prérempli** avec le contenu de l'entrainement source : nom suivi de « (2) » (ex. « Push day (2) »), description, blocs, séries, objectifs, repos.
- Le bouton final s'intitule **« Créer la copie »**.

**État de chargement** : texte « Chargement... ».

---

## 5. Séance — exécution d'un entrainement

**Accès** : bouton « Lancer l'entrainement » du Détail.
**En-tête natif masqué** : l'écran a sa propre barre du haut. L'écran reste allumé pendant toute la séance.

L'écran enchaîne les séries de l'entrainement une par une. Pour chaque série, on passe par la **phase Exercice**, puis par la **phase Révision / repos**. Après la dernière série vient la **phase Récap**. Tout se passe sur ce seul écran, sans changer de page.

### 5.0 Barre du haut (visible dans toutes les phases)

- **Durée totale de la séance** depuis le lancement, au format minutes:secondes (ex. « 12:47 »). Elle avance en continu.
- **Bouton son** : active ou coupe tous les bips de la séance. L'icône change selon l'état (haut-parleur actif ou barré).
- **Bouton ✕ (abandonner)** :
  - S'il n'y a encore eu aucune progression, il quitte immédiatement, sans rien enregistrer.
  - Sinon, il demande confirmation : titre « Arrêter l'entrainement ? », message « Les séries restantes seront enregistrées avec les valeurs par défaut (dernière performance ou objectif si première fois). », boutons « Annuler » et « Arrêter et enregistrer » (destructif). La confirmation enregistre la séance puis quitte.
- **Barre de progression** : proportion des séries terminées.
- **Pourcentage de progression** (ex. « 40% »). Il atteint 100 % dans la phase Récap.

### 5.1 Phase Exercice

**Éléments communs aux deux types d'exercice**
- **Indicateur de série** : « Série 2 / 4 ».
- **Nom de l'exercice**, élément principal (ex. « Pompes »).
- **Objectif** : « Objectif : 12 reps » ou « Objectif : 45 sec ». L'objectif est la valeur réalisée la dernière fois sur cette série, ou l'objectif programmé si c'est la première fois.
- **Mention « (première fois sur cette série) »**, seulement s'il n'y a pas d'historique pour cette série.
- **Record** : « Record sur cette série : 14 reps », ou « Record sur cette série : — » s'il n'y en a pas encore.

**Exercice de type répétitions**
- **Bouton « Série terminée »** → passe à la phase Révision, avec l'objectif comme valeur réalisée.

**Exercice de type temps** : trois états successifs, toujours sur le même écran.
1. **Prêt** : **bouton « Lancer le chrono »**.
2. **Décompte** : un grand chiffre qui descend de 5 à 1, une seconde par chiffre. Ce temps laisse le pratiquant se mettre en position. Un bip court sonne à chaque chiffre, puis un bip différent à 0. Aucun bouton.
3. **Chrono** : le temps écoulé **qui monte**, au format minutes:secondes (ex. « 0:37 »), et un **bouton « Terminé »**. Un bip sonne quand le chrono atteint l'objectif, mais le chrono continue au-delà : il n'y a pas de limite. « Terminé » passe à la phase Révision, avec le temps réalisé.

### 5.2 Phase Révision / repos (entre deux séries)

- **Rappel de la série terminée** : « Résultat — Pompes, série 2 ».
- **Réglage de la valeur réalisée**, modifiable avant de continuer :
  - **Bouton −** et **bouton +** : un appui change la valeur de 1. Un appui maintenu répète le changement en continu, ce qui sert pour les longues durées. La valeur ne descend pas sous 0.
  - **Champ numérique** avec la valeur, modifiable directement au clavier.
  - **Unité** : « reps » ou « sec ».
- **Si ce n'est pas la dernière série** :
  - Libellé **« Repos »**.
  - **Compte à rebours du repos** au format minutes:secondes. Il descend jusqu'à 0:00, puis s'arrête et attend : il n'y a pas d'enchaînement automatique. Un bip sonne à la fin du repos.
  - **Aperçu de la série suivante** : « À suivre : Tractions — série 1/3 (8 reps) ».
  - **Bouton « Passer »** pendant le repos, qui devient **« Continuer »** quand le repos est terminé. Les deux mènent à la phase Exercice de la série suivante.
- **Si c'est la dernière série** :
  - Texte **« Séance terminée ! »**.
  - **Bouton « Passer au récap »** → phase Récap.

### 5.3 Phase Récap (fin de séance)

- **Titre** : « Récap de la séance ».
- **Bouton « Modifier »**, qui devient **« Valider »** en mode modification. Il bascule entre le mode affichage et le mode modification.
- **Une carte par bloc d'exercice**, dans l'ordre de l'entrainement. La liste défile quand elle est longue.
  - **Nom de l'exercice.**
  - **Une ligne par série** : libellé « Série N », la valeur réalisée, l'unité (« reps » / « sec »), puis :
    - **en mode affichage**, un **indicateur de progression** par rapport à la dernière fois :
      - **mieux qu'avant** : flèche vers le haut + écart positif (ex. « +2 ») ;
      - **moins bien** : flèche vers le bas + écart négatif (ex. « −1 ») ;
      - **pareil** : « = » ;
      - **première fois** sur cette série : « 1ʳᵉ fois ».
      - Le « mieux » et le « moins bien » doivent se reconnaître immédiatement l'un de l'autre.
    - **en mode modification**, la valeur devient un **champ numérique** modifiable, et l'indicateur de progression est masqué. Il est recalculé quand on valide.
- **Bouton « Enregistrer et terminer »**. Pendant l'enregistrement, son libellé devient « Enregistrement... » et il ne réagit plus, pour éviter un double enregistrement.
  - Succès : alerte « Séance enregistrée ! » / « Bien joué 💪 », bouton « OK », puis retour au Détail de l'entrainement.
  - Échec : alerte « Erreur » / « La séance n'a pas pu être enregistrée. », et on reste sur le récap.

### 5.4 États particuliers

- **Chargement** : texte « Chargement... ».
- **Entrainement sans exercice** : texte « Aucun exercice dans cet entrainement. » (cas où il ne contient que des repos).

---

## 6. Chrono seul

**Accès** : onglet « Chrono ».
Pas d'en-tête natif. L'écran reste allumé tant qu'on est sur cet onglet.

Il s'agit du même chrono que pour les exercices de type temps de la séance, mais sans informations d'exercice, et avec un décompte réglable.

**Éléments permanents**
- **Titre** : « Chrono ».
- **Bouton son** : active ou coupe les bips. L'icône change selon l'état (haut-parleur actif ou barré).

**Zone principale** : quatre états successifs.
1. **Prêt**
   - **Libellé « Décompte »** + **champ numérique** (5 par défaut) + unité « sec ». La valeur 0 est acceptée et lance directement le chrono.
   - **Bouton « Lancer le chrono »**.
2. **Décompte** : un grand chiffre qui descend jusqu'à 1. Un bip court sonne à chacune des 5 dernières secondes, puis un bip différent à 0. Aucun bouton.
3. **Chrono** : le temps écoulé qui monte, **au centième de seconde** (format « 1:23.45 », défilement fluide), et un **bouton « Terminé »**.
4. **Terminé**
   - **Libellé « Temps »** + le temps final au centième (ex. « 1:23.45 »).
   - **Bouton « Recommencer »** → retour à l'état Prêt (la valeur du décompte est conservée).

**Historique (sous la zone principale)**
- **Menu dépliable « Historique (N) »**, où N est le nombre de chronos, avec un indicateur déplié / replié. Il est replié par défaut.
- **Déplié et vide** : « Aucun chrono pour l'instant. »
- **Déplié avec des chronos** : une ligne par chrono, du plus récent au plus ancien, avec :
  - le **numéro** (« #3 ») ;
  - la **durée** au centième (« 1:23.45 ») ;
  - l'**heure** à laquelle il a été arrêté (« 14:32 »).
- La liste défile si elle est longue.
- L'historique ne dure que le temps d'utilisation de l'appli : il est vidé quand on la ferme complètement.

---

## 7. Modale de sélection d'exercice

**Accès** : bouton « + Exercice » des écrans Création et Duplication. Elle s'ouvre par-dessus l'écran, et le bouton retour d'Android la ferme.

**Éléments**
- **Champ de recherche** (exemple affiché quand il est vide : « Rechercher un exercice... »). Le clavier s'ouvre automatiquement à l'ouverture de la modale.
- **Liste des exercices** de la bibliothèque dont le nom contient le texte recherché (20 au maximum, triés par nom). Sans recherche, ce sont les 20 premiers.
  - Chaque ligne : **nom de l'exercice** + **type** (« Répétitions » ou « Temps »).
  - Appui → ajoute l'exercice à l'entrainement et ferme la modale.
- **Section de création**, visible dès qu'un texte est saisi :
  - Texte « Aucun résultat ? Créer "texte saisi" ».
  - **Choix du type**, deux options exclusives : « Répétitions » (sélectionnée par défaut) et « Temps ». L'option choisie est mise en évidence.
  - **Bouton « Créer et ajouter »** → crée l'exercice dans la bibliothèque, l'ajoute à l'entrainement, ferme la modale.
- **Lien « Annuler »** → ferme la modale sans rien ajouter.

---

## 8. Debug DB (temporaire)

**Accès** : lien « Debug DB » de l'Accueil.
**Titre de l'en-tête** : par défaut (« debug »).

Écran de développement, destiné à être retiré ou caché. Il n'est sans doute pas à inclure dans la refonte.

- Pour chacune des six tables de la base (`exercises`, `workouts`, `workout_blocks`, `workout_sets`, `sessions`, `session_performances`) :
  - le **nom de la table** et son nombre de lignes entre parenthèses ;
  - le **contenu brut** de la table, en texte JSON.
- L'écran défile.

---

## Sons (pour information)

Les sons ne sont pas des éléments visuels, mais ils accompagnent certains états de l'interface :

| Moment | Son |
|---|---|
| Décompte avant un chrono (séance et Chrono seul) | Bip court à chacune des 5 dernières secondes, puis bip différent à 0 |
| Chrono d'un exercice temps qui atteint l'objectif (séance) | Bip « objectif atteint » |
| Fin d'un repos (séance) | Bip « fin de repos » |

Les sons se superposent à la musique d'une autre appli sans la couper. Chaque écran qui en joue a un bouton son on/off.
