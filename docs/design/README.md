# Design « Feu & relief » — brief d'implémentation

Ce dossier contient la maquette complète de la refonte visuelle. Il sert de référence pour l'implémenter dans l'appli React Native / Expo.

## Contenu

| Chemin | Rôle |
|---|---|
| `screens/*.dc.html` | **Référence exacte**, un fichier par écran (390×844, 1 px CSS = 1 dp). |
| `screens/Systeme.dc.html` | Résumé du système : couleurs, typo, surfaces, contrôles, indicateurs. |
| `screens/canvas.json` | Liste des écrans et leur titre (ex. « 5.2 Révision / repos »). |
| `inventaire-ecrans.md` | Comportement de chaque écran. Les **textes de l'UI viennent de là, mot pour mot**. |
| `fonts/DSEG7Modern-Bold.ttf` | Police 7 segments du chrono de l'onglet Chrono (licence OFL, voir `fonts/DSEG-LICENSE.txt`). |

Les fichiers `.dc.html` ne s'ouvrent pas tels quels dans un navigateur : ils dépendent du runtime de l'outil de design (`support.js`, balises `<x-dc>`, `<sc-if>`, `{{…}}`). **Lis-les comme du code source** :
- Les styles sont inline. Les ombres, dégradés et animations sont dans le `<style>` du `<helmet>`.
- Les écrans animés ont leur logique dans le `<script type="text/x-dc">` en bas de fichier (`renderVals`, `componentDidMount`).
- La police DSEG y est chargée via une URL `/_blob/…` propre à l'outil. Utilise le `.ttf` de `fonts/` à la place.

Les données affichées (Push day, 12-10-8, dates…) sont des **exemples**. Ne les code pas en dur.

| Fichier | Écran |
|---|---|
| `Main` | 1. Accueil |
| `Creation` | 2. Création (même écran pour la Duplication : titre « Dupliquer "Nom" », formulaire prérempli « Nom (2) », bouton « Créer la copie ») |
| `Detail` | 3. Détail d'un entrainement |
| `Seance-exercice` | 5.1 Exercice en répétitions |
| `Seance-decompte` | 5.1 Exercice en temps : décompte |
| `Seance-chrono` | 5.1 Exercice en temps : chrono |
| `Seance-repos` | 5.2 Révision / repos |
| `Seance-recap` | 5.3 Récap |
| `Chrono` | 6. Chrono seul : tous les états, interactif |
| `Chrono-en-cours` | 6. Chrono seul : état en cours |
| `Modale-exercice` | 7. Modale de sélection d'exercice |

Le lien « Debug DB » est **retiré** du design : masque-le dans l'appli.

---

## Règle n°1 : fidélité

- Recopie les valeurs exactes des maquettes : couleurs hex et rgba, rayons, paddings, gaps, tailles de police, durées. N'arrondis pas et ne « normalise » pas sur une grille 4/8.
- Si une valeur ne peut pas être reproduite en RN, **ne l'approxime pas en silence** : signale-la.
- Pas de fausse barre d'état. Utilise `react-native-safe-area-context`, avec la barre d'état et la barre de navigation Android en `#23201E` et des icônes claires.
- Cible tactile minimale : 44 dp.

## 1. Thème (`theme.js`) à créer en premier

**Couleurs :**

| Rôle | Valeur |
|---|---|
| Fond | `#23201E` |
| Texte | `#F4EEE8` |
| Texte secondaire | `#ABA39B` |
| Texte tertiaire | `#968E86` |
| Baisse | `#9DB3CC` |
| Destructif | `#FF7A5C` |
| Texte sur fond feu | `#1A0F0A` |
| Dégradé feu | `#FFD23F` → `#FF8A1F` → `#EE4A2B`, à 135° |

**Ombres**, à reprendre telles quelles :

```
up     7px 7px 16px rgba(0,0,0,.6), -6px -6px 14px rgba(255,236,220,.05)
up-sm  4px 4px 9px rgba(0,0,0,.55), -3px -3px 8px rgba(255,236,220,.045)
in     inset 5px 5px 11px rgba(0,0,0,.6), inset -4px -4px 10px rgba(255,236,220,.045)
in-sm  inset 3px 3px 6px rgba(0,0,0,.55), inset -2px -2px 5px rgba(255,236,220,.04)
glow   0 12px 28px -8px rgba(255,105,35,.6)
```

**Rayons usuels :** cartes 22–26, boutons 18–22, champs 14–18, pastilles 999.

**Usage :**
- Ce qui est en **relief** se touche (cartes, boutons secondaires).
- Ce qui est **en creux** est un champ, une piste, un bloc repos ou un état actif.
- Le **feu** est réservé à l'action principale, aux chiffres clés et aux hausses.
- Une **baisse** s'affiche en bleu-gris `#9DB3CC`, jamais en rouge : le rouge fait partie du feu.

## 2. Neumorphisme : le point délicat

- Le relief demande **deux ombres** (sombre en bas à droite, claire en haut à gauche). Les creux demandent des **ombres internes**. `elevation` sur Android ne sait faire ni l'un ni l'autre.
- Utilise la prop de style **`boxShadow`** de React Native (RN ≥ 0.76, New Architecture, donc Expo SDK 52+). Elle accepte la même syntaxe que le CSS, y compris plusieurs ombres et `inset`. Vérifie la version d'Expo et mets à jour si besoin.
- Si `boxShadow` n'est pas utilisable, passe par `@shopify/react-native-skia`. Pas de librairie d'ombre unique.
- Crée un composant `<Neu variant="up | up-sm | in | in-sm">` réutilisé partout.

## 3. Dégradés, polices, icônes

**Dégradés :**
- Fonds en dégradé : `expo-linear-gradient`.
- Texte en dégradé (gros chiffres, mot « entrainements ») : `@react-native-masked-view/masked-view` + `LinearGradient`.

**Polices :**
- **Chakra Petch** (titres, chiffres, boutons) : `@expo-google-fonts/chakra-petch`.
- **Barlow** (texte courant) : `@expo-google-fonts/barlow`.
- Sur Android, une graisse = une `fontFamily` (ex. `ChakraPetch_700Bold`). Ne compte pas sur `fontWeight`. La graisse max de Chakra Petch est 700 : un 800 ou 900 dans les maquettes s'affiche en 700.

**DSEG7 Modern Bold**, uniquement pour les chiffres du chrono de l'onglet Chrono (états en cours et terminé) :
- Charge `fonts/DSEG7Modern-Bold.ttf` avec `expo-font`.
- Les segments éteints sont un texte « 88:88. » superposé, en `rgba(255,236,220,.055)`.
- Le « . » de DSEG a une chasse nulle : il se superpose au chiffre précédent, c'est voulu.
- Format : `m:ss.` sous 1 h, `h:mm:ss.` au-delà, puis les centièmes dans un texte séparé.
- Tailles : 46 dp sous 1 h, 36 dp de 1 à 10 h, 30 dp au-delà. Les centièmes sont à 50 % de la taille.

**Chrono de séance** (en Chakra Petch) : mets `fontVariant: ['tabular-nums']`. Si les chiffres bougent encore, donne une largeur fixe à chaque caractère.

**Icônes :** `lucide-react-native` (+ `react-native-svg`), licence ISC/MIT.
- `strokeWidth` 2, ou 2,5 pour les flèches de 13 dp.
- Noms : `house`, `timer`, `volume-2`, `volume-x`, `x`, `arrow-left`, `arrow-up`, `arrow-down`, `chevron-right`, `chevron-up`, `chevron-down`, `plus`, `minus`, `search`, `play`, `square`, `check`, `pause`, `trophy`, `copy`, `trash-2`, `pencil`, `chevrons-right`, `arrow-right`, `rotate-ccw`.
- `play` et `square` sont remplis (`fill="currentColor"`).
- Les icônes au trait dégradé (onglet actif, trophée) se font avec MaskedView + LinearGradient.

## 4. Composants partagés, à créer avant les écrans

- `Neu` (surfaces)
- `FireButton` (action principale) et `NeuButton` (secondaire)
- `Chip` / pastille
- `RecordBadge` (trophée + valeur)
- `ProgressIndicator` : ↑ +n en feu plein, ↓ −n en creux bleu-gris, `=` en creux, « 1ʳᵉ fois » en relief jaune
- `Stepper` (− / champ / +, appui maintenu qui répète)
- `ProgressBar` (piste en creux + remplissage feu)
- `Ring` : anneau de progression en `react-native-svg`, `strokeDasharray` animé
- `TabBar` personnalisée, sans effet d'onde : `android_ripple` désactivé
- `Header` avec bouton retour en relief

## 5. Animations (`react-native-reanimated`)

Reprends les `@keyframes` de chaque fichier :

| Animation | Valeurs |
|---|---|
| Apparition des listes | translateY 18 → 0 + opacité, 600 ms, `cubic-bezier(.2,.7,.2,1)`, décalage de 70 ms par élément |
| Point « en direct » | pulse, 1,6 s (1 s sur le Chrono en cours) |
| Bouton « Série terminée » | lueur qui respire, 2,8 s, plus un reflet qui le traverse, 3,6 s |
| Dégradé des gros chiffres | défile lentement, 5 s |
| Décompte | chaque chiffre passe de 1,45× à 1× puis s'efface, l'anneau se vide en 1 s, le halo bat à chaque seconde |
| Chrono d'exercice | l'anneau se remplit vers l'objectif, un point fait le tour en 1 s, halo pulsé (1,4 s) quand l'objectif est atteint |
| Barre de progression | se remplit en 1,1 s |
| Récap | cartes en cascade, puis les pastilles apparaissent avec un petit ressort |

Si « Réduire les animations » est activé sur le téléphone (`useReducedMotion`), coupe toutes les animations.

Les accélérations des maquettes sont **réservées à la démo**, ne les implémente pas :
- le repos qui démarre à 0:12 ;
- les chronos qui bouclent ;
- le chrono qui démarre à 59:52.

Le comportement réel est celui de `inventaire-ecrans.md`. Par exemple, le repos ne s'enchaîne pas tout seul.

## Méthode

1. Commence par le thème et les composants partagés.
2. Fais ensuite un écran à la fois, dans cet ordre : Accueil, Détail, Création (et Duplication), modale exercice, Séance (5 phases), Chrono.
3. Après chaque écran, compare une capture du téléphone à la maquette et **liste les écarts** avant de passer au suivant.
