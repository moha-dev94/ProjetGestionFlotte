<?php
/*
 * Règles métier côté serveur. Elles reprennent celles de app/js/rules.js :
 * le navigateur s'en sert pour l'affichage, le serveur pour décider.
 */
declare(strict_types=1);

const KM_INCLUDED_PER_DAY = 250;
const EXTRA_KM_PRICE = 0.25;
const TANK_LITERS = 50;
const FUEL_PRICE = 2.10;
const CHARGE_PRICE_PER_PCT = 0.45;
const LATE_RATE = 1.5;

const DOC_TYPES = ['permis', 'identite', 'domicile'];
const BLOCKING_STATUSES = ['demande', 'confirmee', 'en_cours'];

/** Une location en cours non rendue occupe le véhicule au moins jusqu'à aujourd'hui. */
function effective_end(array $r): string
{
    return $r['status'] === 'en_cours' && $r['end_date'] < today() ? today() : $r['end_date'];
}

/** Deux locations du même véhicule ne partagent jamais un jour. */
function has_conflict(int $vehicleId, string $start, string $end, ?int $ignoreId = null): bool
{
    $rows = all("SELECT * FROM reservations WHERE vehicle_id = ? AND status IN ('demande', 'confirmee', 'en_cours')", [$vehicleId]);
    foreach ($rows as $r) {
        if ($ignoreId !== null && (int) $r['id'] === $ignoreId) {
            continue;
        }
        if ($start <= effective_end($r) && $r['start_date'] <= $end) {
            return true;
        }
    }
    return false;
}

function docs_status(int $userId): array
{
    $status = array_fill_keys(DOC_TYPES, 'manquant');
    foreach (all('SELECT type, status FROM documents WHERE user_id = ?', [$userId]) as $d) {
        $status[$d['type']] = $d['status'];
    }
    return $status;
}

function docs_valid(int $userId): bool
{
    return !array_diff(docs_status($userId), ['valide']);
}

function docs_sent(int $userId): bool
{
    return !array_diff(docs_status($userId), ['valide', 'en_attente']);
}

function next_code(): string
{
    $max = 2400;
    foreach (all('SELECT code FROM reservations') as $r) {
        $max = max($max, (int) substr($r['code'], 2));
    }
    return 'R-' . ($max + 1);
}

/** Facture du retour : km en trop, carburant ou recharge manquants, jours de retard. */
function compute_return(array $r, array $v, int $kmEnd, int $fuelEnd): array
{
    $days = max(1, days_between($r['start_date'], effective_end($r)));
    $driven = max(0, $kmEnd - (int) $r['km_start']);
    $included = $days * KM_INCLUDED_PER_DAY;
    $extraKm = max(0, $driven - $included);
    $missing = max(0, (int) $r['fuel_start'] - $fuelEnd);
    $energyFee = $v['category'] === 'Électrique'
        ? $missing * CHARGE_PRICE_PER_PCT
        : $missing / 100 * TANK_LITERS * FUEL_PRICE;
    $lateDays = max(0, days_between($r['end_date'], today()));
    $lateFee = $lateDays * (float) $v['price_per_day'] * LATE_RATE;
    $extras = round($extraKm * EXTRA_KM_PRICE + $energyFee + $lateFee, 2);

    return [
        'driven' => $driven,
        'extraKm' => $extraKm,
        'extras' => $extras,
        'total' => round((float) $r['price'] + $extras, 2),
    ];
}

/** Identifiant simple dérivé d'un nom : « Inès Haddad » → « ines.haddad ». */
function slug(string $text): string
{
    $text = strtr(mb_strtolower($text), [
        'à' => 'a', 'â' => 'a', 'ä' => 'a', 'á' => 'a', 'ç' => 'c', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
        'î' => 'i', 'ï' => 'i', 'í' => 'i', 'ô' => 'o', 'ö' => 'o', 'ó' => 'o', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ú' => 'u',
        'ÿ' => 'y', 'ñ' => 'n', 'œ' => 'oe', 'æ' => 'ae',
    ]);
    return trim(preg_replace('/[^a-z0-9]+/', '.', $text), '.') ?: 'client';
}
