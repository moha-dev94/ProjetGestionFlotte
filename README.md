# Touge Fleet 峠

Site vitrine d'un logiciel de **gestion de flotte automobile pour agences de location**.
Direction artistique inspirée du touge japonais des années 90 : cols de montagne de nuit,
traînées de phares, lignes de vitesse façon manga, typographie italique et compte-tours.

> Phase actuelle : vitrine statique (HTML / CSS / JS natif).
> Phase suivante : PHP + base de données.

## Lancer le projet

Aucune dépendance ni build. Ouvre `index.html` dans un navigateur, ou lance un petit serveur local :

```bash
python -m http.server 8000
```

Puis va sur http://localhost:8000.

## Structure

```
projetFlotte/
├── index.html              Page vitrine (une section = un bloc commenté)
├── assets/
│   ├── css/
│   │   ├── base.css        Variables (couleurs, polices, espacements), reset, utilitaires
│   │   ├── components.css  Blocs réutilisables : logo, boutons, cartes, badges, compte-tours, formulaire
│   │   └── sections.css    Mise en page de chaque section, dans l'ordre du HTML
│   └── js/
│       └── main.js         Petites fonctions indépendantes (menu, animations, formulaire)
└── README.md
```

## Conventions

- **CSS en BEM simplifié** : `.bloc`, `.bloc__element`, `.bloc--variante`. Les états ajoutés en JS commencent par `is-` (`is-open`, `is-visible`, `is-scrolled`).
- **Thème** : tout passe par les variables de `base.css`. Pour changer l'accent rouge, modifie `--c-red`. Pour l'inclinaison des boutons et badges, modifie `--skew`.
- **Animations au défilement** : ajoute la classe `reveal` à un élément. `data-count="42"` crée un compteur animé, `data-gauge="78"` remplit le compte-tours.
- **Accessibilité** : navigation au clavier, `aria-*` sur le menu mobile, et prise en compte de `prefers-reduced-motion`.

## Pistes pour la phase PHP

1. Renommer `index.html` en `index.php` et extraire l'en-tête et le pied de page dans `includes/header.php` et `includes/footer.php`.
2. Brancher le formulaire sur `contact.php` (`action="contact.php"`) et garder la validation JS comme confort.
3. Remplacer les données de démonstration du tableau de bord par une requête PDO sur une table `vehicles` (immatriculation, modèle, agence, kilométrage, statut).

## Note

Projet personnel et portfolio. Toutes les données affichées sont fictives. L'univers visuel rend hommage au genre, sans reprendre de logo ni d'élément officiel.
