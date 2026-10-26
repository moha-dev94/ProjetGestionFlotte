<?php
/*
 * Toutes les données dont l'interface a besoin, en une requête.
 * L'agence voit tout ; un client ne voit que ses propres données
 * (les réservations des autres arrivent anonymisées, pour calculer les disponibilités).
 */
declare(strict_types=1);

function state_get(): never
{
    $user = require_login();
    $admin = $user['role'] === 'admin';
    $uid = (int) $user['id'];

    $agencies = [];
    $agencyCode = [];
    foreach (all('SELECT * FROM agencies ORDER BY id') as $a) {
        $agencies[$a['code']] = ['name' => $a['name'], 'address' => $a['address'], 'phone' => $a['phone']];
        $agencyCode[$a['id']] = $a['code'];
    }

    $photos = [];
    foreach (all('SELECT * FROM vehicle_photos ORDER BY position, id') as $p) {
        $photos[$p['vehicle_id']][] = ['id' => (string) $p['id'], 'fileId' => (string) $p['file_id']];
    }
    $vehicles = array_map(fn($v) => [
        'id' => (string) $v['id'],
        'plate' => $v['plate'],
        'model' => $v['model'],
        'cat' => $v['category'],
        'agency' => $agencyCode[$v['agency_id']],
        'km' => (int) $v['km'],
        'fuel' => (int) $v['fuel'],
        'price' => (float) $v['price_per_day'],
        'nextServiceKm' => (int) $v['next_service_km'],
        'ctDate' => $v['ct_date'],
        'color' => $v['color'],
        'state' => $v['state'],
        'note' => $v['note'],
        'photos' => $photos[$v['id']] ?? [],
    ], all('SELECT * FROM vehicles ORDER BY id'));

    $users = $admin
        ? all("SELECT * FROM users WHERE role = 'client' ORDER BY id")
        : all('SELECT * FROM users WHERE id = ?', [$uid]);
    $docs = [];
    foreach (all('SELECT * FROM documents') as $doc) {
        $docs[$doc['user_id']][$doc['type']] = [
            'status' => $doc['status'],
            'fileId' => $doc['file_id'] ? (string) $doc['file_id'] : null,
            'specimen' => (bool) $doc['specimen'],
            'specimenExpired' => (bool) $doc['specimen_expired'],
            'sentOn' => $doc['sent_on'],
            'reason' => $doc['reason'],
            'counter' => (bool) $doc['checked_at_counter'],
        ];
    }
    $customers = array_map(fn($u) => [
        'id' => (string) $u['id'],
        'name' => $u['name'],
        'email' => $u['email'],
        'since' => $u['created_on'],
        'docs' => $docs[$u['id']] ?? [],
    ], $users);

    $resPhotos = [];
    foreach (all('SELECT * FROM reservation_photos ORDER BY id') as $p) {
        $resPhotos[$p['reservation_id']][$p['moment']][] = (string) $p['file_id'];
    }
    $reservations = [];
    foreach (all('SELECT r.*, u.name AS client FROM reservations r JOIN users u ON u.id = r.user_id ORDER BY r.id') as $r) {
        $mine = $admin || (int) $r['user_id'] === $uid;
        if (!$mine && !in_array($r['status'], BLOCKING_STATUSES, true)) {
            continue;
        }
        $reservations[] = [
            'id' => $mine ? $r['code'] : null,
            'vehicleId' => (string) $r['vehicle_id'],
            'customerId' => $mine ? (string) $r['user_id'] : null,
            'client' => $mine ? $r['client'] : '',
            'start' => $r['start_date'],
            'end' => $r['end_date'],
            'tStart' => $r['start_time'],
            'tEnd' => $r['end_time'],
            'status' => $r['status'],
            'price' => $mine ? (float) $r['price'] : 0,
            'kmStart' => $mine && $r['km_start'] !== null ? (int) $r['km_start'] : null,
            'fuelStart' => $mine && $r['fuel_start'] !== null ? (int) $r['fuel_start'] : null,
            'kmEnd' => $mine && $r['km_end'] !== null ? (int) $r['km_end'] : null,
            'extras' => $mine && $r['extras'] !== null ? (float) $r['extras'] : null,
            'reason' => $mine ? $r['reason'] : '',
            'requestedOn' => $r['requested_on'],
            'photosOut' => $mine ? ($resPhotos[$r['id']]['out'] ?? []) : [],
            'photosIn' => $mine ? ($resPhotos[$r['id']]['in'] ?? []) : [],
        ];
    }

    json_out([
        'user' => $user,
        'brand' => brand_data(),
        'agencies' => $agencies,
        'vehicles' => $vehicles,
        'customers' => $customers,
        'reservations' => $reservations,
    ]);
}

/** Recrée les données d'exemple, en gardant la marque et le logo. */
function demo_reset(): never
{
    require_admin();
    $brand = brand_data();
    $logo = null;
    if ($brand['logoFileId']) {
        $f = one('SELECT * FROM files WHERE id = ?', [$brand['logoFileId']]);
        $bin = $f ? @file_get_contents(uploads_dir() . '/' . basename($f['path'])) : false;
        $logo = $bin ? 'data:' . $f['mime'] . ';base64,' . base64_encode($bin) : null;
    }

    drop_all();
    foreach (glob(uploads_dir() . '/*') as $file) {
        @unlink($file);
    }
    install_demo();

    $brand['logoFileId'] = $logo ? store_image($logo) : null;
    save_brand($brand);

    $admin = one("SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1");
    log_in((int) $admin['id']);
    json_out(['ok' => true]);
}
