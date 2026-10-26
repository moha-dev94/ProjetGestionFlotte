<?php
/* Réponses JSON, erreurs, lecture du corps de la requête et dates. */
declare(strict_types=1);

final class HttpError extends Exception
{
    public function __construct(public int $status, string $message)
    {
        parent::__construct($message);
    }
}

/** Arrête la requête avec un code HTTP et un message lisible par l'utilisateur. */
function fail(int $status, string $message): never
{
    throw new HttpError($status, $message);
}

function json_out(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function require_fetch_header(): void
{
    if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'fetch') {
        fail(403, 'Requête refusée.');
    }
}

/** Corps JSON de la requête. */
function input(): array
{
    static $in = null;
    if ($in === null) {
        $raw = file_get_contents('php://input') ?: '';
        $in = $raw === '' ? [] : json_decode($raw, true);
        if (!is_array($in)) {
            fail(400, 'Requête invalide.');
        }
    }
    return $in;
}

/** Texte saisi, nettoyé et limité en longueur. */
function str_in(string $key, int $max = 255): string
{
    $value = trim(preg_replace('/\s+/u', ' ', (string) (input()[$key] ?? '')));
    if (mb_strlen($value) > $max) {
        fail(422, "Le texte saisi est trop long ($max caractères maximum).");
    }
    return $value;
}

function date_in(string $key): string
{
    $value = (string) (input()[$key] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) || !strtotime($value)) {
        fail(422, 'Date invalide.');
    }
    return $value;
}

function today(): string
{
    return date('Y-m-d');
}

function add_days(string $date, int $days): string
{
    return date('Y-m-d', strtotime(sprintf('%s %+d days', $date, $days)));
}

function days_between(string $from, string $to): int
{
    return (int) round((strtotime($to) - strtotime($from)) / 86400);
}
