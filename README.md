# Touge Fleet 峠

Logiciel de **gestion de flotte automobile pour agences de location** : un site vitrine
et une application avec un espace client et un espace agence.
Direction artistique inspirée du touge japonais des années 90 : cols de montagne de nuit,
traînées de phares, lignes de vitesse façon manga, typographie italique et compte-tours.

> Phase actuelle : vitrine + prototype d'application en HTML / CSS / JS natif, données d'exemple.
> Phase suivante : PHP + base de données.

## Lancer le projet

Aucune dépendance ni build. Lance un petit serveur local à la racine du projet :

```bash
python -m http.server 8000
```

- Vitrine : http://localhost:8000
- Application : http://localhost:8000/app/

Ouvrir directement les fichiers `index.html` dans le navigateur fonctionne aussi.

## L'application (`app/`)

Comptes de démonstration sur la page de connexion (aucun mot de passe n'est vérifié) :

| Compte | Ce qu'on peut tester |
| --- | --- |
| Sarah Lemaire, agence | Tableau de bord, validation ou refus des documents et des demandes, flotte et photos, planning, départs et retours, entretien, clients |
| Paul Henry, client | Location en cours avec compte à rebours jusqu'au retour |
| Inès Haddad, cliente | Demande en attente, permis expiré à refuser côté agence |

Les données sont des exemples, enregistrées dans le `localStorage` du navigateur.
« Réinitialiser la démo », en bas du menu, remet les données de départ.

## Structure

```
projetFlotte/
├── index.html                Vitrine (une section = un bloc commenté)
├── assets/                   Styles et script de la vitrine
│   ├── css/
│   │   ├── base.css          Variables (couleurs, polices, espacements), reset, utilitaires
│   │   ├── components.css    Logo, boutons, cartes, badges, compte-tours, formulaire
│   │   └── sections.css      Mise en page de chaque section, dans l'ordre du HTML
│   └── js/
│       └── main.js           Menu, animations, formulaire
├── app/                      Application (espace client + espace agence)
│   ├── index.html            Coquille vide : l'interface est générée en JS
│   ├── css/
│   │   ├── base.css          Variables de couleurs et polices, reset
│   │   ├── layout.css        Page de connexion, menu latéral, en-tête
│   │   ├── components.css    Boutons, pastilles de statut, plaques, blocs, KPI, graphique
│   │   ├── views.css         Flotte, planning, listes, documents, photos, espace client
│   │   ├── panels.css        Tiroirs, fenêtres, factures, notifications
│   │   └── responsive.css    Écrans moyens et mobiles
│   └── js/                   Chargés dans cet ordre (voir app/index.html)
│       ├── config.js         Constantes : agences, catégories, tarifs, statuts, motifs de refus
│       ├── format.js         Formatage des dates, montants, km, pastilles
│       ├── data.js           Données d'exemple, sauvegarde, état de l'interface
│       ├── rules.js          Règles métier : statuts, conflits de réservation, entretien, facturation
│       ├── images.js         Illustrations des véhicules, spécimens de documents, compression des photos
│       ├── components.js     Vérification des documents, grilles de photos
│       ├── views-agence.js   Écrans de l'espace agence
│       ├── views-client.js   Écrans de l'espace client
│       ├── panels.js         Tiroirs et fenêtres (véhicule, demande, remise des clés, retour…)
│       ├── app.js            Rendu, menu, connexion et création de compte
│       └── events.js         Clics, formulaires, envois de fichiers, compte à rebours, démarrage
└── README.md
```

Les scripts de `app/js/` sont des scripts classiques (pas de modules) : ils partagent leurs
fonctions et constantes, et l'ordre de chargement compte. Une fonction peut appeler une
fonction d'un fichier chargé après elle, mais le code exécuté au chargement
(`data.js`, `app.js`, `events.js`) doit trouver ce dont il a besoin déjà chargé.

## Conventions

- **CSS en BEM simplifié** : `.bloc`, `.bloc__element`, `.bloc--variante`. Les états ajoutés en JS commencent par `is-` (`is-open`, `is-visible`, `is-late`).
- **Thème** : tout passe par les variables de `base.css`. Couleurs de statut (`--ok`, `--res`, `--loc`, `--late`, `--maint`, `--wait`) séparées de l'accent rouge.
- **Actions** : dans l'application, chaque bouton porte un `data-action` traité dans `events.js` (un seul écouteur par type d'événement).
- **Accessibilité** : navigation au clavier, `aria-*` sur les menus et fenêtres, prise en compte de `prefers-reduced-motion`.

## Pistes pour la phase PHP

1. **Base de données** : tables `agencies`, `vehicles`, `vehicle_photos`, `customers`, `customer_documents`, `reservations`, `reservation_photos` (les champs reprennent ceux de `data.js`).
2. **Connexion** : `password_hash()` / `password_verify()`, sessions PHP, rôle `client` ou `agence` sur l'utilisateur.
3. **Fichiers** : documents et photos envoyés via formulaire (`$_FILES`), stockés hors du dossier public, servis par un script qui vérifie les droits.
4. **Règles métier** : porter `rules.js` côté serveur (conflits de réservation, facturation au retour) et garder la version JS pour l'affichage.
5. **Vitrine** : renommer `index.html` en `index.php`, extraire l'en-tête et le pied de page dans `includes/`, brancher le formulaire sur `contact.php`.

## Note

Projet personnel et portfolio. Toutes les données affichées sont fictives. L'univers visuel rend hommage au genre, sans reprendre de logo ni d'élément officiel.
