<?php
/*
 * Recrée la base avec les données d'exemple, en ligne de commande :
 *   php api/db/reset.php
 * La marque (nom, couleurs, logo) est remise à TougeFleet.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../lib/bootstrap.php';

db();
drop_all();
foreach (glob(uploads_dir() . '/*') as $file) {
    @unlink($file);
}
install_demo();

echo 'Base recréée (' . config()['driver'] . ') avec les données d\'exemple.' . PHP_EOL;
echo 'Comptes : agence@tougefleet.demo, paul.henry@exemple.fr, ines.haddad@exemple.fr' . PHP_EOL;
echo 'Mot de passe : ' . config()['demo_password'] . PHP_EOL;
