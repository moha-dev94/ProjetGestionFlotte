<?php
/* Connexion, déconnexion et création de compte client. */
declare(strict_types=1);

function auth_me(): never
{
    json_out(['user' => current_user()]);
}

function auth_login(): never
{
    $email = mb_strtolower(str_in('email', 190));
    $password = (string) (input()['password'] ?? '');
    $u = one('SELECT * FROM users WHERE email = ?', [$email]);
    if (!$u || !$u['password_hash'] || !password_verify($password, $u['password_hash'])) {
        fail(401, 'E-mail ou mot de passe incorrect.');
    }
    log_in((int) $u['id']);
    json_out(['user' => public_user($u)]);
}

function auth_logout(): never
{
    start_session();
    $_SESSION = [];
    session_destroy();
    json_out(['ok' => true]);
}

function auth_signup(): never
{
    $name = str_in('name', 120);
    $email = mb_strtolower(str_in('email', 190));
    $password = (string) (input()['password'] ?? '');

    if (count(explode(' ', $name)) < 2) {
        fail(422, 'Indiquez votre prénom et votre nom.');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        fail(422, "Cette adresse e-mail n'est pas valide.");
    }
    if (mb_strlen($password) < 8) {
        fail(422, "Choisissez un mot de passe d'au moins 8 caractères.");
    }
    if (one('SELECT id FROM users WHERE email = ?', [$email])) {
        fail(409, 'Un compte existe déjà avec cet e-mail. Connectez-vous.');
    }

    $id = create_client($name, $email, password_hash($password, PASSWORD_DEFAULT));
    log_in($id);
    json_out(['user' => public_user(one('SELECT * FROM users WHERE id = ?', [$id]))]);
}

/** Crée un client et ses 3 documents « à envoyer ». Sans e-mail, on en génère un. */
function create_client(string $name, ?string $email, ?string $passwordHash): int
{
    if ($email === null) {
        $base = slug($name);
        $email = "$base@exemple.fr";
        for ($i = 2; one('SELECT id FROM users WHERE email = ?', [$email]); $i++) {
            $email = "$base$i@exemple.fr";
        }
    }
    $id = insert('users', [
        'role' => 'client', 'name' => $name, 'email' => $email,
        'password_hash' => $passwordHash, 'created_on' => today(),
    ]);
    foreach (DOC_TYPES as $type) {
        insert('documents', [
            'user_id' => $id, 'type' => $type, 'status' => 'manquant', 'file_id' => null,
            'specimen' => 0, 'specimen_expired' => 0, 'sent_on' => null, 'reason' => '', 'checked_at_counter' => 0,
        ]);
    }
    return $id;
}
