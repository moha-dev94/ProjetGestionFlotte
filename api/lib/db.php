<?php
/*
 * Connexion PDO (SQLite ou MySQL) et petites fonctions de requête.
 * La base est créée et remplie avec les données d'exemple au premier appel.
 */
declare(strict_types=1);

const TABLES = ['reservation_photos', 'reservations', 'documents', 'vehicle_photos', 'vehicles', 'agencies', 'users', 'files', 'settings'];

function db(): PDO
{
    static $pdo = null;
    if ($pdo) {
        return $pdo;
    }

    $c = config();
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];

    if ($c['driver'] === 'mysql') {
        $m = $c['mysql'];
        $pdo = new PDO("mysql:host={$m['host']};port={$m['port']};charset=utf8mb4", $m['user'], $m['password'], $options);
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$m['database']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `{$m['database']}`");
    } else {
        $dir = dirname($c['sqlite_path']);
        if (!is_dir($dir)) {
            mkdir($dir, 0775, true);
        }
        $pdo = new PDO('sqlite:' . $c['sqlite_path'], null, null, $options);
        $pdo->exec('PRAGMA foreign_keys = ON');
    }

    if (!table_exists('users')) {
        install_demo();
    }
    return $pdo;
}

function table_exists(string $table): bool
{
    try {
        db()->query("SELECT 1 FROM $table LIMIT 1");
        return true;
    } catch (PDOException) {
        return false;
    }
}

function install_demo(): void
{
    create_schema(db(), config()['driver']);
    seed_demo();
}

function drop_all(): void
{
    foreach (TABLES as $table) {
        db()->exec("DROP TABLE IF EXISTS $table");
    }
}

function q(string $sql, array $params = []): PDOStatement
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

function one(string $sql, array $params = []): ?array
{
    $row = q($sql, $params)->fetch();
    return $row ?: null;
}

function all(string $sql, array $params = []): array
{
    return q($sql, $params)->fetchAll();
}

function insert(string $table, array $row): int
{
    $cols = array_keys($row);
    $marks = implode(', ', array_fill(0, count($cols), '?'));
    q("INSERT INTO $table (" . implode(', ', $cols) . ") VALUES ($marks)", array_values($row));
    return (int) db()->lastInsertId();
}

function update(string $table, int $id, array $row): void
{
    $set = implode(', ', array_map(fn($col) => "$col = ?", array_keys($row)));
    q("UPDATE $table SET $set WHERE id = ?", [...array_values($row), $id]);
}
