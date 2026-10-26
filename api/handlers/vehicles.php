<?php
/* Véhicules : photos et état (entretien, hors service, remise en service). */
declare(strict_types=1);

function vehicle_photos_add(string $vehicleId): never
{
    require_admin();
    $v = vehicle_by_id((int) $vehicleId);
    $position = (int) (one('SELECT MAX(position) AS m FROM vehicle_photos WHERE vehicle_id = ?', [$v['id']])['m'] ?? -1);
    foreach (images_in('images') as $fileId) {
        insert('vehicle_photos', ['vehicle_id' => (int) $v['id'], 'file_id' => $fileId, 'position' => ++$position]);
    }
    json_out(['ok' => true]);
}

function vehicle_photo_action(string $vehicleId, string $photoId, string $action): never
{
    require_admin();
    $photo = one('SELECT * FROM vehicle_photos WHERE id = ? AND vehicle_id = ?', [(int) $photoId, (int) $vehicleId])
        ?? fail(404, 'Photo introuvable.');
    if ($action === 'delete') {
        q('DELETE FROM vehicle_photos WHERE id = ?', [$photo['id']]);
        delete_file((int) $photo['file_id']);
    } else {
        $min = (int) (one('SELECT MIN(position) AS m FROM vehicle_photos WHERE vehicle_id = ?', [$photo['vehicle_id']])['m'] ?? 0);
        update('vehicle_photos', (int) $photo['id'], ['position' => $min - 1]);
    }
    json_out(['ok' => true]);
}

/** action : entretien, hs, ok (remise en service) ou maintenance_done. */
function vehicle_state(string $vehicleId): never
{
    require_admin();
    $v = vehicle_by_id((int) $vehicleId);
    $id = (int) $v['id'];
    $action = (string) (input()['action'] ?? '');
    $rented = one("SELECT id FROM reservations WHERE vehicle_id = ? AND status = 'en_cours'", [$id]);

    if (in_array($action, ['entretien', 'hs'], true)) {
        if ($rented) {
            fail(409, 'Le véhicule est en location : attendez son retour.');
        }
        $note = $action === 'entretien' ? 'Révision programmée' : 'Déclaré hors service depuis la console';
        update('vehicles', $id, ['state' => $action, 'note' => $note]);
        $clash = one("SELECT COUNT(*) AS n FROM reservations WHERE vehicle_id = ? AND status = 'confirmee' AND start_date <= ?",
            [$id, add_days(today(), 2)]);
        json_out(['ok' => true, 'clash' => (int) $clash['n']]);
    }

    if ($action === 'ok') {
        update('vehicles', $id, ['state' => 'ok', 'note' => '']);
    } elseif ($action === 'maintenance_done') {
        $row = ['state' => 'ok', 'note' => ''];
        if ($v['state'] === 'entretien' || (int) $v['next_service_km'] - (int) $v['km'] <= 1500) {
            $row['next_service_km'] = (int) (ceil(((int) $v['km'] + 15000) / 1000) * 1000);
        }
        if ($v['ct_date'] <= add_days(today(), 30)) {
            $row['ct_date'] = add_days(today(), 730);
        }
        update('vehicles', $id, $row);
    } else {
        fail(422, 'Action inconnue.');
    }
    json_out(['ok' => true]);
}
