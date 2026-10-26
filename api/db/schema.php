<?php
/*
 * Schéma de la base. Le même SQL marche sous SQLite et MySQL,
 * seule la colonne d'identifiant auto-incrémenté change.
 */
declare(strict_types=1);

function create_schema(PDO $pdo, string $driver): void
{
    $id = $driver === 'mysql' ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';

    $tables = [
        // Réglages clé / valeur (ex. : la marque, en JSON)
        "CREATE TABLE settings (
            name VARCHAR(64) PRIMARY KEY,
            value TEXT NOT NULL
        )",

        // Fichiers envoyés, stockés dans storage/uploads
        "CREATE TABLE files (
            id $id,
            path VARCHAR(255) NOT NULL,
            mime VARCHAR(64) NOT NULL,
            created_at DATETIME NOT NULL
        )",

        // Comptes : agence (admin) ou client. Un client créé au comptoir n'a pas de mot de passe.
        "CREATE TABLE users (
            id $id,
            role VARCHAR(10) NOT NULL,
            name VARCHAR(120) NOT NULL,
            email VARCHAR(190) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NULL,
            created_on DATE NOT NULL
        )",

        "CREATE TABLE agencies (
            id $id,
            code VARCHAR(10) NOT NULL UNIQUE,
            name VARCHAR(120) NOT NULL,
            address VARCHAR(255) NOT NULL,
            phone VARCHAR(30) NOT NULL
        )",

        // state : ok, entretien ou hs (hors service)
        "CREATE TABLE vehicles (
            id $id,
            plate VARCHAR(12) NOT NULL UNIQUE,
            model VARCHAR(120) NOT NULL,
            category VARCHAR(30) NOT NULL,
            agency_id INT NOT NULL REFERENCES agencies(id),
            km INT NOT NULL,
            fuel INT NOT NULL,
            price_per_day DECIMAL(8,2) NOT NULL,
            next_service_km INT NOT NULL,
            ct_date DATE NOT NULL,
            color VARCHAR(9) NOT NULL,
            state VARCHAR(12) NOT NULL DEFAULT 'ok',
            note VARCHAR(255) NOT NULL DEFAULT ''
        )",

        // position 0 = photo principale
        "CREATE TABLE vehicle_photos (
            id $id,
            vehicle_id INT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
            file_id INT NOT NULL REFERENCES files(id),
            position INT NOT NULL
        )",

        // type : permis, identite, domicile
        // status : manquant, en_attente, valide, refuse
        // specimen : document d'exemple généré par l'interface (données de démo)
        "CREATE TABLE documents (
            id $id,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type VARCHAR(12) NOT NULL,
            status VARCHAR(12) NOT NULL,
            file_id INT NULL REFERENCES files(id),
            specimen INT NOT NULL DEFAULT 0,
            specimen_expired INT NOT NULL DEFAULT 0,
            sent_on DATE NULL,
            reason VARCHAR(255) NOT NULL DEFAULT '',
            checked_at_counter INT NOT NULL DEFAULT 0,
            UNIQUE (user_id, type)
        )",

        // status : demande, confirmee, en_cours, terminee, annulee, refusee
        "CREATE TABLE reservations (
            id $id,
            code VARCHAR(12) NOT NULL UNIQUE,
            vehicle_id INT NOT NULL REFERENCES vehicles(id),
            user_id INT NOT NULL REFERENCES users(id),
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            start_time VARCHAR(5) NOT NULL,
            end_time VARCHAR(5) NOT NULL,
            status VARCHAR(12) NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            km_start INT NULL,
            fuel_start INT NULL,
            km_end INT NULL,
            extras DECIMAL(10,2) NULL,
            reason VARCHAR(255) NOT NULL DEFAULT '',
            requested_on DATE NOT NULL
        )",

        // moment : out (départ) ou in (retour)
        "CREATE TABLE reservation_photos (
            id $id,
            reservation_id INT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
            file_id INT NOT NULL REFERENCES files(id),
            moment VARCHAR(4) NOT NULL
        )",
    ];

    foreach ($tables as $sql) {
        $pdo->exec($sql);
    }
}
