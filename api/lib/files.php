<?php
/*
 * Stockage des images envoyées (photos de véhicules, états des lieux, documents, logo).
 * Le navigateur envoie l'image compressée en data URL ; on vérifie que c'est une vraie
 * image, on l'écrit sous un nom aléatoire et on garde sa trace dans la table files.
 */
declare(strict_types=1);

function uploads_dir(): string
{
    $dir = config()['uploads_dir'];
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    // Bloque l'accès direct sous Apache (XAMPP, hébergeur).
    $guard = dirname($dir) . '/.htaccess';
    if (!is_file($guard)) {
        file_put_contents($guard, "Require all denied\n");
    }
    return $dir;
}

function store_image(string $dataUrl): int
{
    if (!preg_match('#^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$#', $dataUrl, $m)) {
        fail(422, 'Image invalide : envoyez une photo JPG, PNG ou WebP.');
    }
    $bin = base64_decode($m[2], true);
    if ($bin === false) {
        fail(422, 'Image invalide.');
    }
    if (strlen($bin) > config()['max_upload_bytes']) {
        fail(413, 'Image trop lourde (4 Mo maximum).');
    }

    $types = [
        IMAGETYPE_JPEG => ['image/jpeg', 'jpg'],
        IMAGETYPE_PNG => ['image/png', 'png'],
        IMAGETYPE_WEBP => ['image/webp', 'webp'],
    ];
    $info = @getimagesizefromstring($bin);
    if (!$info || !isset($types[$info[2]])) {
        fail(422, "Ce fichier n'est pas une image valide.");
    }
    [$mime, $ext] = $types[$info[2]];

    $name = bin2hex(random_bytes(16)) . ".$ext";
    file_put_contents(uploads_dir() . "/$name", $bin);
    return insert('files', ['path' => $name, 'mime' => $mime, 'created_at' => date('Y-m-d H:i:s')]);
}

/** Liste d'images envoyée sous la clé $key (facultative). */
function images_in(string $key, int $max = 10): array
{
    $list = input()[$key] ?? [];
    if (!is_array($list)) {
        fail(422, 'Liste de photos invalide.');
    }
    if (count($list) > $max) {
        fail(422, "$max photos maximum à la fois.");
    }
    return array_map(fn($data) => store_image((string) $data), $list);
}

function delete_file(int $id): void
{
    $f = one('SELECT path FROM files WHERE id = ?', [$id]);
    if ($f) {
        @unlink(uploads_dir() . '/' . basename($f['path']));
        q('DELETE FROM files WHERE id = ?', [$id]);
    }
}
