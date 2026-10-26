<?php
/*
 * Routeur du serveur intégré de PHP, à lancer depuis la racine du projet :
 *   php -S localhost:8000 api/router.php
 * Il sert les fichiers statiques et bloque l'accès direct aux dossiers internes.
 */
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');

if (preg_match('#^/(storage|api/(lib|db|handlers)|api/config)#', $path)) {
    http_response_code(404);
    echo 'Introuvable';
    return true;
}

return false;
