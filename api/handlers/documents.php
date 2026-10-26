<?php
/* Documents : envoi par le client, vérification par l'agence. */
declare(strict_types=1);

function document_upload(string $type): never
{
    $user = require_login();
    if ($user['role'] !== 'client') {
        fail(403, 'Seul le client peut envoyer ses documents.');
    }
    $old = one('SELECT file_id FROM documents WHERE user_id = ? AND type = ?', [$user['id'], $type]);
    $fileId = store_image((string) (input()['image'] ?? ''));
    q('UPDATE documents SET status = ?, file_id = ?, specimen = 0, specimen_expired = 0, sent_on = ?, reason = ?, checked_at_counter = 0
       WHERE user_id = ? AND type = ?', ['en_attente', $fileId, today(), '', $user['id'], $type]);
    if ($old && $old['file_id']) {
        delete_file((int) $old['file_id']);
    }
    json_out(['ok' => true]);
}

/** action : valide, refuse (avec motif) ou counter (original vérifié au comptoir). */
function document_review(string $userId, string $type): never
{
    require_admin();
    $doc = one('SELECT * FROM documents WHERE user_id = ? AND type = ?', [(int) $userId, $type])
        ?? fail(404, 'Document introuvable.');
    $action = (string) (input()['action'] ?? '');

    if ($action === 'counter') {
        update('documents', (int) $doc['id'], ['status' => 'valide', 'reason' => '', 'checked_at_counter' => 1, 'sent_on' => today()]);
    } elseif ($action === 'valide') {
        if ($doc['status'] === 'manquant') {
            fail(409, "Le client n'a rien envoyé : vérifiez l'original au comptoir.");
        }
        update('documents', (int) $doc['id'], ['status' => 'valide', 'reason' => '']);
    } elseif ($action === 'refuse') {
        $reason = str_in('reason', 255);
        if ($reason === '') {
            fail(422, 'Indiquez le motif du refus.');
        }
        if ($doc['status'] === 'manquant') {
            fail(409, "Le client n'a rien envoyé.");
        }
        update('documents', (int) $doc['id'], ['status' => 'refuse', 'reason' => $reason]);
    } else {
        fail(422, 'Action inconnue.');
    }
    json_out(['ok' => true]);
}
