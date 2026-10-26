<?php
/*
 * Réglages de l'API.
 * Pour les changer sans toucher au dépôt, crée api/config.local.php qui renvoie
 * seulement les clés à remplacer, par exemple :
 *   <?php return ['driver' => 'mysql', 'mysql' => ['password' => 'secret']];
 */
$config = [
    // 'sqlite' : un simple fichier, rien à installer (par défaut).
    // 'mysql'  : MySQL / MariaDB (XAMPP, hébergeur). La base est créée si elle n'existe pas.
    'driver' => 'sqlite',
    'sqlite_path' => __DIR__ . '/../storage/database.sqlite',
    'mysql' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'database' => 'tougefleet',
        'user' => 'root',
        'password' => '',
    ],

    // Photos et documents envoyés (dossier non public).
    'uploads_dir' => __DIR__ . '/../storage/uploads',
    'max_upload_bytes' => 4 * 1024 * 1024,

    // Mot de passe des comptes de démonstration créés par les données d'exemple.
    'demo_password' => 'demo1234',
];

if (is_file(__DIR__ . '/config.local.php')) {
    $config = array_replace_recursive($config, require __DIR__ . '/config.local.php');
}

return $config;
