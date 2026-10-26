<?php
/*
 * Envoi d'un fichier stocké, après contrôle des droits :
 * - le logo de la marque est public (page de connexion) ;
 * - l'agence voit tout ;
 * - un client voit les photos des véhicules, ses documents et les photos de ses locations.
 */
declare(strict_types=1);

function file_get(string $id): never
{
    $fileId = (int) $id;
    $f = one('SELECT * FROM files WHERE id = ?', [$fileId]) ?? fail(404, 'Fichier introuvable.');

    if ((int) brand_data()['logoFileId'] !== $fileId) {
        $u = require_login();
        if ($u['role'] !== 'admin' && !client_can_see_file((int) $u['id'], $fileId)) {
            fail(403, 'Accès refusé.');
        }
    }

    $path = uploads_dir() . '/' . basename($f['path']);
    if (!is_file($path)) {
        fail(404, 'Fichier introuvable.');
    }
    header('Content-Type: ' . $f['mime']);
    header('Content-Length: ' . filesize($path));
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: private, max-age=86400');
    readfile($path);
    exit;
}

function client_can_see_file(int $userId, int $fileId): bool
{
    return (bool) (
        one('SELECT id FROM vehicle_photos WHERE file_id = ?', [$fileId])
        ?? one('SELECT id FROM documents WHERE file_id = ? AND user_id = ?', [$fileId, $userId])
        ?? one('SELECT p.id FROM reservation_photos p JOIN reservations r ON r.id = p.reservation_id
                WHERE p.file_id = ? AND r.user_id = ?', [$fileId, $userId])
    );
}
