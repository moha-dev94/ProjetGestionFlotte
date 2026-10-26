<?php
/*
 * Réservations : création (demande client ou saisie agence), décision de l'agence,
 * annulation, remise des clés et retour du véhicule.
 */
declare(strict_types=1);

function reservation_by_code(string $code): array
{
    return one('SELECT * FROM reservations WHERE code = ?', [$code]) ?? fail(404, 'Réservation introuvable.');
}

function vehicle_by_id(int $id): array
{
    return one('SELECT * FROM vehicles WHERE id = ?', [$id]) ?? fail(404, 'Véhicule introuvable.');
}

function reservation_create(): never
{
    $user = require_login();
    $v = vehicle_by_id((int) (input()['vehicleId'] ?? 0));
    $start = date_in('start');
    $end = date_in('end');

    if ($start < today()) {
        fail(422, "La date de départ doit être aujourd'hui ou plus tard.");
    }
    if ($end <= $start) {
        fail(422, 'La date de retour doit être après la date de départ.');
    }
    if ($v['state'] !== 'ok') {
        fail(409, 'Ce véhicule est immobilisé.');
    }
    if (has_conflict((int) $v['id'], $start, $end)) {
        fail(409, "Ce véhicule vient d'être réservé sur ces dates. Choisissez-en un autre.");
    }

    if ($user['role'] === 'admin') {
        // Saisie en agence : confirmée directement, client existant ou créé à la volée
        $name = str_in('customerName', 120);
        if ($name === '') {
            fail(422, 'Indiquez le nom du client.');
        }
        $existing = one("SELECT id FROM users WHERE role = 'client' AND LOWER(name) = LOWER(?)", [$name]);
        $userId = $existing ? (int) $existing['id'] : create_client($name, null, null);
        $status = 'confirmee';
    } else {
        // Demande d'un client : l'agence vérifie ses documents avant de confirmer
        $userId = (int) $user['id'];
        if (!docs_sent($userId)) {
            fail(422, 'Envoyez vos documents avant de réserver.');
        }
        $status = 'demande';
    }

    $code = next_code();
    insert('reservations', [
        'code' => $code, 'vehicle_id' => (int) $v['id'], 'user_id' => $userId,
        'start_date' => $start, 'end_date' => $end, 'start_time' => '10:00', 'end_time' => '18:00',
        'status' => $status, 'price' => days_between($start, $end) * (float) $v['price_per_day'],
        'km_start' => null, 'fuel_start' => null, 'km_end' => null, 'extras' => null,
        'reason' => '', 'requested_on' => today(),
    ]);
    json_out(['code' => $code, 'docsValid' => docs_valid($userId)]);
}

function reservation_action(string $code, string $action): never
{
    $user = require_login();
    $r = reservation_by_code($code);
    $id = (int) $r['id'];
    $admin = $user['role'] === 'admin';
    $own = (int) $r['user_id'] === (int) $user['id'];

    if (!$admin && !($action === 'cancel' && $own)) {
        fail(403, "Action réservée à l'agence.");
    }

    switch ($action) {
        case 'accept':
            expect_status($r, ['demande']);
            if (!docs_valid((int) $r['user_id'])) {
                fail(409, 'Les 3 documents du client doivent être conformes pour accepter.');
            }
            if (has_conflict((int) $r['vehicle_id'], $r['start_date'], $r['end_date'], $id)) {
                fail(409, "Le véhicule n'est plus libre sur ces dates.");
            }
            update('reservations', $id, ['status' => 'confirmee']);
            break;

        case 'refuse':
            expect_status($r, ['demande', 'confirmee']);
            $reason = str_in('reason', 255);
            if ($reason === '') {
                fail(422, 'Indiquez le motif du refus.');
            }
            update('reservations', $id, ['status' => 'refusee', 'reason' => $reason]);
            break;

        case 'cancel':
            if ($admin) {
                expect_status($r, ['demande', 'confirmee']);
            } elseif (!($r['status'] === 'demande' || ($r['status'] === 'confirmee' && $r['start_date'] > today()))) {
                fail(409, "Cette réservation ne peut plus être annulée en ligne. Contactez l'agence.");
            }
            update('reservations', $id, ['status' => 'annulee']);
            break;

        case 'checkout':
            expect_status($r, ['confirmee']);
            if ($r['start_date'] > today()) {
                fail(409, "Le départ n'est pas prévu aujourd'hui.");
            }
            if (!docs_valid((int) $r['user_id'])) {
                fail(409, 'Documents non validés : la remise des clés est bloquée.');
            }
            $v = vehicle_by_id((int) $r['vehicle_id']);
            update('reservations', $id, ['status' => 'en_cours', 'km_start' => (int) $v['km'], 'fuel_start' => (int) $v['fuel']]);
            save_reservation_photos($id, 'out');
            break;

        case 'checkin':
            expect_status($r, ['en_cours']);
            $v = vehicle_by_id((int) $r['vehicle_id']);
            $km = (int) (input()['km'] ?? 0);
            $fuel = (int) (input()['fuel'] ?? -1);
            if ($km < (int) $r['km_start']) {
                fail(422, 'Le compteur doit être au moins égal au relevé du départ (' . $r['km_start'] . ' km).');
            }
            if ($fuel < 0 || $fuel > 100) {
                fail(422, 'Niveau de carburant invalide.');
            }
            $bill = compute_return($r, $v, $km, $fuel);
            update('reservations', $id, [
                'status' => 'terminee', 'km_end' => $km, 'extras' => $bill['extras'],
                'end_date' => max($r['end_date'], today()),
            ]);
            update('vehicles', (int) $v['id'], ['km' => $km, 'fuel' => $fuel]);
            save_reservation_photos($id, 'in');
            json_out(['ok' => true, 'bill' => $bill]);
    }

    json_out(['ok' => true]);
}

function expect_status(array $r, array $allowed): void
{
    if (!in_array($r['status'], $allowed, true)) {
        fail(409, "Cette action n'est plus possible : la réservation a changé de statut. Rechargez la page.");
    }
}

function save_reservation_photos(int $reservationId, string $moment): void
{
    foreach (images_in('photos') as $fileId) {
        insert('reservation_photos', ['reservation_id' => $reservationId, 'file_id' => $fileId, 'moment' => $moment]);
    }
}
