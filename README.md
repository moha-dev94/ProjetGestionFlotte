# TougeFleet 峠

Logiciel de **gestion de flotte automobile pour agences de location**, en **marque blanche** :
un site vitrine et une application (espace client + espace agence) reliés à une vraie base de données.
TougeFleet est la marque par défaut. Pour une démo de prospection, l'écran **Personnalisation**
remplace le nom, le logo, les couleurs, l'ambiance et les polices par ceux de l'agence démarchée.

Direction artistique par défaut inspirée du touge japonais des années 90 : cols de montagne de nuit,
traînées de phares, lignes de vitesse façon manga, typographie italique et compte-tours.

## Lancer le projet

Il faut **PHP 8.1 ou plus** avec l'extension `pdo_sqlite` (incluse dans XAMPP). Rien d'autre à installer.
À la racine du projet :

```bash
php -S localhost:8000 api/router.php
```

- Vitrine : http://localhost:8000
- Application : http://localhost:8000/app/

Au premier appel, l'API crée la base SQLite `storage/database.sqlite` et la remplit avec les données d'exemple.

### Avec XAMPP (Apache + MySQL)

1. Copie le projet dans `C:\xampp\htdocs\projetFlotte` et démarre Apache et MySQL.
2. Crée `api/config.local.php` :
   ```php
   <?php return ['driver' => 'mysql', 'mysql' => ['user' => 'root', 'password' => '']];
   ```
3. Ouvre http://localhost/projetFlotte/app/ : la base `tougefleet` est créée automatiquement.

## Comptes de démonstration

Mot de passe pour tous : `demo1234` (boutons directs sur la page de connexion).

| Compte | Ce qu'on peut tester |
| --- | --- |
| `agence@tougefleet.demo` (Sarah Lemaire) | Tableau de bord, demandes et documents, flotte et photos, planning, départs et retours, entretien, clients, personnalisation |
| `paul.henry@exemple.fr` | Location en cours avec compte à rebours jusqu'au retour |
| `ines.haddad@exemple.fr` | Demande en attente, permis expiré à refuser côté agence |

On peut aussi créer un vrai compte client (onglet « Créer un compte »).

**Remettre la démo à zéro** : bouton « Réinitialiser la démo » de l'espace agence (garde la marque),
ou `php api/db/reset.php` (remet aussi la marque TougeFleet). Les données sont datées par rapport au jour
de l'installation : pour une démo client, réinitialise le jour même.

## Préparer une démo pour un prospect

1. Connecte-toi en agence, ouvre **Personnalisation**.
2. Saisis le nom de l'agence, ajoute son logo (PNG transparent de préférence), choisis un modèle
   (TougeFleet, Corporate, Émeraude, Prestige) puis ajuste les couleurs, l'ambiance et les polices.
3. **Enregistrer** : la marque s'applique à tous les comptes et à la vitrine.
4. « Revenir à TougeFleet » remet la marque par défaut.

## Structure

```
projetFlotte/
├── index.html                Vitrine (une section = un bloc commenté)
├── assets/                   Styles et scripts de la vitrine
│   ├── css/                  base.css, components.css, sections.css
│   └── js/
│       ├── main.js           Menu, animations, formulaire
│       └── brand.js          Reprend la marque réglée dans l'application
├── app/                      Application (espace client + espace agence)
│   ├── index.html            Coquille vide : l'interface est générée en JS
│   ├── css/
│   │   ├── base.css          Variables de couleurs et polices, reset
│   │   ├── layout.css        Page de connexion, menu latéral, en-tête
│   │   ├── components.css    Boutons, pastilles de statut, plaques, blocs, KPI, graphique
│   │   ├── views.css         Flotte, planning, listes, documents, photos, espace client
│   │   ├── panels.css        Tiroirs, fenêtres, factures, notifications
│   │   ├── brand.css         Logo et écran Personnalisation
│   │   └── responsive.css    Écrans moyens et mobiles
│   └── js/                   Chargés dans cet ordre (voir app/index.html)
│       ├── config.js         Constantes : catégories, tarifs, statuts, motifs de refus, comptes de démo
│       ├── format.js         Formatage des dates, montants, km, pastilles
│       ├── brand.js          Marque blanche : ambiances, polices, application des couleurs
│       ├── data.js           Appels à l'API, chargement des données, état de l'interface
│       ├── rules.js          Règles métier pour l'affichage (statuts, conflits, entretien, facture)
│       ├── images.js         Illustrations des véhicules, spécimens de documents, compression des photos
│       ├── components.js     Vérification des documents, grilles de photos
│       ├── views-agence.js   Écrans de l'espace agence
│       ├── views-client.js   Écrans de l'espace client
│       ├── views-brand.js    Écran Personnalisation
│       ├── panels.js         Tiroirs et fenêtres (véhicule, demande, remise des clés, retour…)
│       ├── app.js            Rendu, menu, connexion et création de compte
│       └── events.js         Clics, formulaires, envois de fichiers, compte à rebours, démarrage
├── api/                      API PHP (JSON) : api/index.php?r=<route>
│   ├── index.php             Liste des routes et gestion des erreurs
│   ├── router.php            Routeur pour php -S (bloque storage/ et les dossiers internes)
│   ├── config.php            SQLite ou MySQL, dossier des fichiers, mot de passe de démo
│   ├── lib/                  Connexion PDO, session, envoi de fichiers, règles métier
│   ├── db/
│   │   ├── schema.php        Tables (identiques sous SQLite et MySQL)
│   │   ├── seed.php          Données d'exemple
│   │   └── reset.php         Recrée la base en ligne de commande
│   └── handlers/             Une fonction par route : auth, state, reservations, documents, vehicles, brand, files
└── storage/                  Créé automatiquement, ignoré par Git : base SQLite et fichiers envoyés
```

## Base de données

| Table | Contenu |
| --- | --- |
| `users` | Comptes agence (`admin`) et clients, mots de passe hachés (`password_hash`) |
| `agencies` | Agences : code, nom, adresse, téléphone |
| `vehicles` | Parc : immatriculation, modèle, catégorie, agence, km, carburant, tarif, révision, contrôle technique, état |
| `vehicle_photos` | Photos des véhicules (`position` 0 = principale) |
| `documents` | Permis, identité, domicile de chaque client : statut, fichier, motif de refus |
| `reservations` | Demandes et locations : dates, statut, prix, relevés de départ et de retour, suppléments, motif de refus |
| `reservation_photos` | Photos d'état des lieux au départ (`out`) et au retour (`in`) |
| `files` | Fichiers envoyés, stockés sous un nom aléatoire dans `storage/uploads` |
| `settings` | Réglages, dont la marque (JSON) |

## Sécurité

- Mots de passe hachés avec `password_hash()`, session PHP régénérée à la connexion, cookie `HttpOnly` et `SameSite=Lax`.
- Chaque route vérifie les droits côté serveur : un client ne voit que ses données ; les réservations des
  autres lui arrivent anonymisées (seulement pour calculer les disponibilités).
- Les requêtes `POST` exigent l'en-tête `X-Requested-With: fetch` (protection CSRF).
- Les images envoyées sont vérifiées (vraie image JPG, PNG ou WebP, 4 Mo maximum) et servies par l'API
  après contrôle des droits ; le dossier `storage/` n'est pas accessible directement.
- Les règles importantes (conflits de dates, documents conformes avant d'accepter ou de remettre les clés,
  facture du retour) sont appliquées par le serveur, pas seulement par l'interface.

## Conventions

- **CSS en BEM simplifié** : `.bloc`, `.bloc__element`, `.bloc--variante`. Les états ajoutés en JS commencent par `is-`.
- **Thème** : tout passe par les variables CSS. `brand.js` les remplace selon la marque et l'ambiance.
- **Actions** : chaque bouton porte un `data-action` traité dans `events.js` ; les modifications passent par `act()` (appel API puis rechargement).
- **PHP** : `declare(strict_types=1)`, requêtes préparées PDO, une fonction par route dans `api/handlers/`.

## Pistes suivantes

- Gestion des agences et du parc depuis l'interface (ajout, modification de véhicules).
- Envoi des e-mails (confirmation, refus avec motif, rappel avant le retour).
- Brancher le formulaire de contact de la vitrine sur l'API.

## Note

Projet personnel et portfolio. Toutes les données affichées sont fictives. L'univers visuel rend hommage au genre, sans reprendre de logo ni d'élément officiel.
