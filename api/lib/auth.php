<?php
/* Session PHP et contrôle des droits (client / agence). */
declare(strict_types=1);

function start_session(): void
{
    if (session_status() === PHP_SESSION_NONE) {
        session_name('tougefleet');
        session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'path' => '/']);
        session_start();
    }
}

function public_user(array $u): array
{
    return ['id' => (string) $u['id'], 'role' => $u['role'], 'name' => $u['name'], 'email' => $u['email']];
}

function current_user(): ?array
{
    start_session();
    $id = $_SESSION['uid'] ?? null;
    if (!$id) {
        return null;
    }
    $u = one('SELECT id, role, name, email FROM users WHERE id = ?', [$id]);
    return $u ? public_user($u) : null;
}

function require_login(): array
{
    return current_user() ?? fail(401, 'Votre session a expiré. Reconnectez-vous.');
}

function require_admin(): array
{
    $u = require_login();
    if ($u['role'] !== 'admin') {
        fail(403, "Action réservée à l'agence.");
    }
    return $u;
}

function log_in(int $userId): void
{
    start_session();
    session_regenerate_id(true);
    $_SESSION['uid'] = $userId;
}
