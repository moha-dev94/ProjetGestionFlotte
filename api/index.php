<?php
/*
 * Point d'entrée unique de l'API : api/index.php?r=<route>
 * Toutes les réponses sont en JSON, sauf les fichiers (photos, documents).
 */
declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';

$route = trim((string) ($_GET['r'] ?? ''), '/');
$method = $_SERVER['REQUEST_METHOD'];

// [méthode, motif de la route, fonction appelée avec les morceaux capturés]
$routes = [
    ['GET', 'brand', 'brand_get'],
    ['POST', 'brand', 'brand_save'],

    ['GET', 'me', 'auth_me'],
    ['POST', 'login', 'auth_login'],
    ['POST', 'logout', 'auth_logout'],
    ['POST', 'signup', 'auth_signup'],

    ['GET', 'state', 'state_get'],
    ['POST', 'reset', 'demo_reset'],
    ['GET', 'files/(\d+)', 'file_get'],

    ['POST', 'reservations', 'reservation_create'],
    ['POST', 'reservations/(R-\d+)/(accept|refuse|cancel|checkout|checkin)', 'reservation_action'],

    ['POST', 'documents/(permis|identite|domicile)', 'document_upload'],
    ['POST', 'customers/(\d+)/documents/(permis|identite|domicile)', 'document_review'],

    ['POST', 'vehicles/(\d+)/photos', 'vehicle_photos_add'],
    ['POST', 'vehicles/(\d+)/photos/(\d+)/(delete|main)', 'vehicle_photo_action'],
    ['POST', 'vehicles/(\d+)/state', 'vehicle_state'],
];

try {
    // Protection CSRF : un autre site ne peut pas envoyer cet en-tête sans autorisation CORS.
    if ($method === 'POST') {
        require_fetch_header();
    }
    foreach ($routes as [$m, $pattern, $handler]) {
        if ($m === $method && preg_match("#^$pattern$#", $route, $parts)) {
            array_shift($parts);
            $handler(...$parts);
            exit;
        }
    }
    fail(404, 'Route inconnue.');
} catch (HttpError $e) {
    json_out(['error' => $e->getMessage()], $e->status);
} catch (Throwable $e) {
    error_log((string) $e);
    json_out(['error' => 'Erreur du serveur. Réessayez ou réinitialisez la démo.'], 500);
}
