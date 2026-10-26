<?php
/* Charge la configuration, les outils et tous les gestionnaires de routes. */
declare(strict_types=1);

mb_internal_encoding('UTF-8');
date_default_timezone_set('Europe/Paris');

function config(): array
{
    static $config = null;
    return $config ??= require __DIR__ . '/../config.php';
}

require __DIR__ . '/http.php';
require __DIR__ . '/db.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/files.php';
require __DIR__ . '/rules.php';
require __DIR__ . '/../db/schema.php';
require __DIR__ . '/../db/seed.php';

foreach (glob(__DIR__ . '/../handlers/*.php') as $file) {
    require $file;
}
