<?php
/*
 * Marque blanche : nom, sigle, logo, couleurs, ambiance et polices.
 * TougeFleet est la marque par défaut ; l'agence peut la remplacer par celle d'un client.
 */
declare(strict_types=1);

const BRAND_DEFAULTS = [
    'name' => 'TougeFleet',
    'tagline' => 'Location de véhicules',
    'mark' => '峠',
    'accent' => '#e3061b',
    'highlight' => '#ffd60a',
    'ambiance' => 'nuit',
    'fontDisplay' => 'Bebas Neue',
    'fontBody' => 'Barlow',
    'logoFileId' => null,
];
const BRAND_AMBIANCES = ['nuit', 'asphalte', 'clair'];
const BRAND_FONTS_DISPLAY = ['Bebas Neue', 'Oswald', 'Anton', 'Montserrat', 'Playfair Display'];
const BRAND_FONTS_BODY = ['Barlow', 'Inter', 'Roboto', 'Poppins', 'Source Sans 3'];

function brand_data(): array
{
    $row = one("SELECT value FROM settings WHERE name = 'brand'");
    $saved = $row ? (json_decode($row['value'], true) ?: []) : [];
    return array_merge(BRAND_DEFAULTS, array_intersect_key($saved, BRAND_DEFAULTS));
}

function save_brand(array $brand): void
{
    $value = json_encode(array_intersect_key($brand, BRAND_DEFAULTS), JSON_UNESCAPED_UNICODE);
    if (one("SELECT name FROM settings WHERE name = 'brand'")) {
        q("UPDATE settings SET value = ? WHERE name = 'brand'", [$value]);
    } else {
        q("INSERT INTO settings (name, value) VALUES ('brand', ?)", [$value]);
    }
}

function brand_get(): never
{
    json_out(['brand' => brand_data()]);
}

function brand_save(): never
{
    require_admin();
    $in = input();
    $brand = brand_data();

    $name = str_in('name', 40);
    if ($name === '') {
        fail(422, "Indiquez le nom de l'entreprise.");
    }
    $mark = str_in('mark', 3);
    $tagline = str_in('tagline', 60);
    foreach (['accent', 'highlight'] as $key) {
        if (!preg_match('/^#[0-9a-f]{6}$/i', (string) ($in[$key] ?? ''))) {
            fail(422, 'Couleur invalide.');
        }
    }
    if (!in_array($in['ambiance'] ?? '', BRAND_AMBIANCES, true)
        || !in_array($in['fontDisplay'] ?? '', BRAND_FONTS_DISPLAY, true)
        || !in_array($in['fontBody'] ?? '', BRAND_FONTS_BODY, true)) {
        fail(422, 'Ambiance ou police inconnue.');
    }

    // Logo : nouveau fichier, suppression, ou inchangé
    $logoId = $brand['logoFileId'];
    if (!empty($in['logo'])) {
        $logoId = store_image((string) $in['logo']);
    } elseif (!empty($in['removeLogo'])) {
        $logoId = null;
    }
    if ($brand['logoFileId'] && $brand['logoFileId'] !== $logoId) {
        delete_file((int) $brand['logoFileId']);
    }

    save_brand([
        'name' => $name, 'tagline' => $tagline, 'mark' => $mark,
        'accent' => strtolower($in['accent']), 'highlight' => strtolower($in['highlight']),
        'ambiance' => $in['ambiance'], 'fontDisplay' => $in['fontDisplay'], 'fontBody' => $in['fontBody'],
        'logoFileId' => $logoId,
    ]);
    json_out(['brand' => brand_data()]);
}
