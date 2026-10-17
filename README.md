# Pixar Board pour Home Assistant

Un tableau de bord tablette « une page fixe » au style 3D Pixar, pensé pour une tablette murale en mode kiosque (Fully Kiosk) en 1280×800 ou 1200×750. Il n'y a ni défilement ni menu, juste huit cartes lisibles de loin :

| Carte | Contenu |
|---|---|
| **Famille** | avatars, lieu de chacun, batterie des téléphones, photo de famille |
| **Météo** | date, grande horloge, température extérieure, maxi prévue |
| **Maison** | serrure, garage, volets, détecteurs de fumée |
| **Climat** | température et humidité intérieures, CO₂, chambres |
| **Énergie** | compteur en temps réel, production solaire, conso, voiture |
| **Frigos** | températures, avec une alerte qui ne se déclenche qu'après un dépassement durable |
| **Vie de famille** | annonces « À table ! » et « Dépêche-toi ! », poubelles, litière |
| **Salon** | télé, appli en cours, sortie son |

Le tableau inclut aussi :
- un **mode nuit automatique** (sun.sun), avec ciel étoilé, maisons éclairées et avatars en pyjama si vous les fournissez ;
- des **thèmes saisonniers** : Halloween du 15 octobre au 1er novembre, Noël du 1er décembre au 6 janvier. Un appui long sur la date permet de choisir Auto / Normal / Halloween / Noël.

> ⚠️ Ce n'est pas une carte clé en main de type HACS. Elle a été écrite pour une maison précise, puis rendue paramétrable. Attendez-vous à adapter un peu les entités et les illustrations. Les cartes ne sont pas déplaçables : la mise en page est fixe.

---

## 1. Installer le fichier

1. Copiez `pixar-board.js` dans `/config/www/pixar-board/` (avec File editor, Studio Code Server ou Samba).
2. **Paramètres ▸ Tableaux de bord ▸ ⋮ ▸ Ressources ▸ Ajouter une ressource**
   - URL : `/local/pixar-board/pixar-board.js?v=1`
   - Type : **Module JavaScript**
3. À chaque mise à jour du fichier, changez le numéro (`?v=2`, `?v=3`…), sinon la tablette garde l'ancienne version en cache.

**Optionnel, mais recommandé :**
- [kiosk-mode](https://github.com/NemesisRE/kiosk-mode) (HACS), pour masquer l'en-tête et la barre latérale ;
- [browser_mod](https://github.com/thomasloven/hass-browser_mod), pour recharger la tablette à distance (`browser_mod.refresh`).

## 2. Préparer les illustrations

Les illustrations ne sont **pas fournies** : chacun génère les siennes (ChatGPT, Midjourney, Gemini…). Les fichiers `gabarit-*.png` montrent où placer chaque image.

| Fichier | Obligatoire | Contenu |
|---|---|---|
| Planche principale (`sprite`) | oui | 20 icônes dans une grille 5×5 : voir `gabarit-planche-principale.png` |
| Planche de nuit (`night_sprite`) | non | lune, nuage de nuit, pluie de nuit, maison éclairée (1re rangée) |
| Planche de variantes (`variants_sprite`) | non | télé en veille, maison de nuit, éclaircies, neige, orage, batterie |
| Avatars (`image`, `night_image`) | conseillé | un PNG carré par personne, fond transparent |
| Photo de famille (`photo`, `photo_night`) | non | image carrée, fond quelconque |

Règles pour les planches :
- une image **carrée** (1280×1280 conseillé) découpée en **5×5 cases égales** ;
- **fond transparent** obligatoire : le découpage repère chaque illustration grâce à la transparence ;
- une illustration par case, centrée, avec un peu de marge : elle est recadrée automatiquement.

Exemple d'instruction pour générer une planche :

> Planche d'icônes 3D style Pixar, rendu doux et chaleureux, éclairage studio venant d'en haut à gauche, sur fond **transparent**, disposées dans une grille stricte de 5×5 cases égales, une icône centrée par case, avec une marge. Dans l'ordre, ligne par ligne : soleil souriant, nuage, nuage de pluie, lune endormie, porte d'entrée, porte de garage, réfrigérateur, thermomètre, plante en pot, maison, [case vide], volet roulant, lit, chat, voiture électrique, cloche, réveil, poubelle, télévision, détecteur de fumée, panneau solaire.

Pour les avatars, partez d'une photo de chaque personne : « portrait 3D style Pixar en buste, fond transparent, cadrage carré ». Faites de même pour la version pyjama.

Déposez ensuite tout dans `/config/www/pixar-board/`.

## 3. Créer le tableau de bord

1. **Paramètres ▸ Tableaux de bord ▸ Ajouter ▸ Nouveau tableau de bord à partir de zéro.**
2. Ouvrez-le, puis **⋮ ▸ Modifier ▸ ⋮ ▸ Éditeur de configuration brute**.
3. Collez `exemple-config.yaml`, puis remplacez les entités et les images par les vôtres.

On peut aussi utiliser la carte seule dans une vue `panel` avec `type: custom:pixar-board` et les mêmes options. La stratégie fait simplement ça pour vous, en ajoutant le fond et le masquage d'en-tête.

## 4. Les entités (`entities`)

Toute clé absente garde sa valeur par défaut. Mettez `""` pour désactiver une fonction optionnelle.

| Clé | Type | Rôle |
|---|---|---|
| `weather` | weather | météo du jour, prévision |
| `outdoor_temp` | sensor (°C) | température extérieure |
| `door_lock` | lock | serrure de la porte d'entrée |
| `door_contact` | binary_sensor | capteur d'ouverture de la porte (optionnel) |
| `garage` | cover | porte de garage |
| `shutters` | liste de cover | volets comptés comme ouverts ou fermés |
| `smoke` | liste de binary_sensor | détecteurs de fumée |
| `alerts_count` | sensor | nombre d'alertes maison (optionnel) |
| `indoor_temp`, `indoor_humidity`, `co2` | sensor | climat intérieur |
| `bedrooms` | liste de sensor (°C) | affiche la fourchette mini–maxi |
| `bedrooms_tap` | entité | ce qu'ouvre un appui sur « Chambres » (par défaut : la 1re chambre) |
| `grid_power` | sensor (**W**) | compteur temps réel ; négatif = surplus envoyé au réseau |
| `solar_power`, `house_power` | sensor (**kW**) | production solaire, consommation de la maison |
| `grid_energy_today` | sensor (kWh) | énergie prise au réseau aujourd'hui (fenêtre détails) |
| `virtual_batteries` | liste | `{ name, level, stock, capacity, power, state }` (optionnel) |
| `car` | objet | `{ name, battery, charging, plugged }` ; `battery: ""` pour masquer |
| `fridges` | liste | `{ entity, name, warn, bad, ge, warn_delay, bad_delay }`, voir ci-dessous |
| `grill` | sensor | état d'un barbecue connecté, affiché en pastille (optionnel) |
| `hurry_button`, `dinner_watch`, `sound_watch` | entité | entité surveillée pour confirmer « Envoyé ✓ » |
| `litter` | objet | `{ status, count, threshold }` pour une litière connectée (optionnel) |
| `bins` | objet | `{ weekday, yellow_reference, yellow_every_weeks }` pour les poubelles |
| `tv` | media_player | télé du salon |
| `tv_app` | input_select | dernière appli connue quand la télé est éteinte (optionnel) |
| `speakers` | liste | `{ entity, name }` : la sortie son en lecture est affichée |

**Frigos.** `warn` est le seuil d'attention, `bad` le seuil d'alerte, en °C. `ge: true` signifie « supérieur ou égal ». `warn_delay` et `bad_delay` sont des durées en minutes : la case ne s'allume qu'après un dépassement continu de cette durée, pour ignorer les portes ouvertes quelques instants.

**Poubelles.** `weekday` est le jour de collecte (1 = lundi … 7 = dimanche). La veille au soir, la carte passe en alerte. La poubelle jaune est annoncée toutes les `yellow_every_weeks` semaines, à partir de la date `yellow_reference` (un jour de collecte jaune).

## 5. Les actions (`actions`)

Chaque zone appuyable a une clé. Sans action configurée, un appui ouvre la fiche (more-info) de l'entité concernée.

`presence` · `porte` · `garage` · `volets` · `fumee` · `alertes` · `climat` · `chambres` · `air` · `energie` · `voiture` · `froid` · `barbecue` · `atable` · `depeche` · `poubelles` · `litiere` · `tele` · `son` · `more` (avatars)

Le format est celui de toutes les cartes Home Assistant (`tap_action`) : `more-info`, `navigate`, `perform-action`, `confirmation`…

## 6. Nuit et thèmes

- **Nuit.** Elle s'active automatiquement quand `sun.sun` passe sous l'horizon. Les avatars `night_image`, la photo `photo_night` et la planche de nuit sont utilisés s'ils existent. Il n'y a pas de filtre sombre ni de baisse de luminosité.
- **Thèmes.** Faites un appui long (≈ 0,7 s) sur la date de la carte Météo pour choisir. Le choix est mémorisé sur la tablette. Les dates du mode Auto se trouvent dans `P2T.calendar`, en haut de la section « thèmes saisonniers » du fichier. On peut y ajouter un thème en suivant le modèle `P2T.themes.halloween`.

## 7. Limites connues

- La mise en page est fixe, pensée pour le paysage 16:10 : 1280×800 et 1200×750 sont testés. Sur téléphone, c'est illisible.
- Les textes sont en français.
- La police Nunito est chargée depuis Google Fonts ; sans Internet, la police système prend le relais.
- Le premier chargement découpe les planches dans le navigateur, ce qui prend 1 à 2 s sur une tablette modeste.
