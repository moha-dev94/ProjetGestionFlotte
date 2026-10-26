<?php
/*
 * Données d'exemple, datées par rapport au jour de l'installation
 * (0 = aujourd'hui, -1 = hier, 3 = dans 3 jours).
 * Pour tout recréer : bouton « Réinitialiser la démo » de l'espace agence,
 * ou en ligne de commande : php api/db/reset.php
 */
declare(strict_types=1);

function seed_demo(): void
{
    $pdo = db();
    $pdo->beginTransaction();
    $d = fn(int $offset): string => add_days(today(), $offset);
    $hash = password_hash(config()['demo_password'], PASSWORD_DEFAULT);

    save_brand(BRAND_DEFAULTS);

    $agencyIds = [];
    $agencies = [
        'PAR' => ['Paris Gare de Lyon', 'Gare de Lyon, hall 1 · Paris 12e', '01 99 00 12 34'],
        'LYO' => ['Lyon Part-Dieu', 'Gare Part-Dieu, parking P2 · Lyon 3e', '04 99 00 56 78'],
        'MRS' => ['Marseille St-Charles', 'Gare St-Charles, parvis · Marseille 1er', '04 99 00 90 12'],
    ];
    foreach ($agencies as $code => [$name, $address, $phone]) {
        $agencyIds[$code] = insert('agencies', compact('code', 'name', 'address', 'phone'));
    }

    // immatriculation, modèle, catégorie, agence, km, carburant %, prix/jour, prochaine révision (km), CT dans N jours, couleur, état, note
    $vehicles = [
        'v1' => ['AE-086-TF', 'Toyota Corolla Hybrid', 'Compacte', 'LYO', 42180, 80, 49, 45000, 120, '#f1f1ec'],
        'v2' => ['FD-317-RX', 'Mazda MX-5', 'Premium', 'MRS', 18920, 100, 89, 30000, 300, '#c8102e'],
        'v3' => ['GT-200-SC', 'Renault Clio', 'Citadine', 'LYO', 67450, 40, 35, 67000, 12, '#f2a900', 'entretien', 'Révision des 67 000 km et plaquettes avant'],
        'v4' => ['EV-034-NS', 'Peugeot e-208', 'Électrique', 'PAR', 9310, 90, 45, 30000, 400, '#3a7bd5'],
        'v5' => ['HB-512-KL', 'Peugeot 3008', 'SUV', 'PAR', 35400, 70, 69, 45000, 200, '#6b6f7a'],
        'v6' => ['DZ-778-PM', 'Dacia Duster', 'SUV', 'MRS', 51200, 55, 52, 60000, 21, '#7f8f52'],
        'v7' => ['TR-449-UV', 'Renault Trafic', 'Utilitaire', 'PAR', 88300, 65, 75, 89000, 180, '#e4e4e4'],
        'v8' => ['GL-903-WX', 'Volkswagen Golf', 'Compacte', 'PAR', 27750, 85, 52, 30000, 260, '#2a4a78'],
        'v9' => ['MZ-221-BC', 'Tesla Model 3', 'Électrique', 'PAR', 14400, 75, 95, 30000, 500, '#d6d6dc'],
        'v10' => ['YR-660-DF', 'Toyota Yaris Hybrid', 'Citadine', 'LYO', 22100, 95, 39, 30000, 330, '#c0392b'],
        'v11' => ['CA-145-GH', 'Mercedes Classe A', 'Premium', 'LYO', 31800, 60, 85, 45000, 150, '#34343c'],
        'v12' => ['FI-500-JK', 'Fiat 500', 'Citadine', 'MRS', 40500, 20, 32, 45000, 90, '#9fd3c7'],
        'v13' => ['KG-318-LN', 'Kia Niro EV', 'Électrique', 'MRS', 12900, 88, 59, 30000, 410, '#4f6d7a'],
        'v14' => ['MT-702-QR', 'Renault Master', 'Utilitaire', 'LYO', 104200, 50, 89, 105000, 60, '#efefef', 'hs', 'Sinistre carrosserie, expertise en attente'],
        'v15' => ['SK-834-ST', 'Skoda Octavia Break', 'Compacte', 'MRS', 58000, 70, 55, 60000, 210, '#6a4f3f'],
        'v16' => ['CP-219-YZ', 'Citroën C3', 'Citadine', 'PAR', 46300, 45, 34, 60000, 140, '#e67e22'],
    ];
    $vehicleIds = [];
    foreach ($vehicles as $key => $v) {
        [$plate, $model, $category, $agency, $km, $fuel, $price, $nextService, $ctIn, $color] = $v;
        $vehicleIds[$key] = insert('vehicles', [
            'plate' => $plate, 'model' => $model, 'category' => $category, 'agency_id' => $agencyIds[$agency],
            'km' => $km, 'fuel' => $fuel, 'price_per_day' => $price, 'next_service_km' => $nextService,
            'ct_date' => $d($ctIn), 'color' => $color, 'state' => $v[10] ?? 'ok', 'note' => $v[11] ?? '',
        ]);
    }

    insert('users', [
        'role' => 'admin', 'name' => 'Sarah Lemaire', 'email' => 'agence@tougefleet.demo',
        'password_hash' => $hash, 'created_on' => $d(-900),
    ]);

    // Clients : créés à la première mention, avec leurs 3 documents
    $customerIds = [];
    $customer = function (string $name, array $opt = []) use (&$customerIds, $d, $hash): int {
        if (isset($customerIds[$name])) {
            return $customerIds[$name];
        }
        $id = insert('users', [
            'role' => 'client', 'name' => $name, 'email' => slug($name) . '@exemple.fr',
            'password_hash' => $hash, 'created_on' => $d($opt['since'] ?? -200),
        ]);
        foreach (DOC_TYPES as $type) {
            $status = $opt['docs'][$type] ?? $opt['status'] ?? 'valide';
            insert('documents', [
                'user_id' => $id, 'type' => $type, 'status' => $status, 'file_id' => null,
                'specimen' => $status === 'manquant' ? 0 : 1,
                'specimen_expired' => $type === 'permis' && !empty($opt['expired']) ? 1 : 0,
                'sent_on' => $status === 'manquant' ? null : $d($opt['sent'] ?? -120),
                'reason' => $opt['reasons'][$type] ?? '', 'checked_at_counter' => 0,
            ]);
        }
        return $customerIds[$name] = $id;
    };
    $customer('Paul Henry', ['since' => -420]);
    $customer('Inès Haddad', ['since' => -2, 'status' => 'en_attente', 'sent' => -1, 'expired' => true]);
    $customer('Yanis Benali', ['since' => -3, 'status' => 'en_attente', 'sent' => -1]);
    $customer('Mehdi Karim', [
        'since' => -5, 'status' => 'en_attente', 'sent' => -4,
        'docs' => ['identite' => 'refuse', 'domicile' => 'manquant'],
        'reasons' => ['identite' => 'Document illisible ou flou'],
    ]);

    $times = ['08:30', '09:00', '09:30', '10:00', '11:00', '14:00', '16:30', '17:00', '18:00', '18:30'];
    $n = 0;
    $reserve = function (string $vehicle, string $client, int $start, int $end, string $status, array $extra = [])
        use (&$n, $times, $vehicleIds, $customer, $d): void {
        $n++;
        $v = one('SELECT km, price_per_day FROM vehicles WHERE id = ?', [$vehicleIds[$vehicle]]);
        $running = $status === 'en_cours';
        insert('reservations', [
            'code' => 'R-' . (2400 + $n),
            'vehicle_id' => $vehicleIds[$vehicle],
            'user_id' => $customer($client),
            'start_date' => $d($start),
            'end_date' => $d($end),
            'start_time' => $extra['tStart'] ?? $times[$n % 5],
            'end_time' => $extra['tEnd'] ?? $times[5 + $n % 5],
            'status' => $status,
            'price' => max(1, $end - $start) * (float) $v['price_per_day'],
            'km_start' => $running ? (int) $v['km'] - 180 * max(1, -$start) : null,
            'fuel_start' => $running ? 100 : null,
            'km_end' => null,
            'extras' => null,
            'reason' => '',
            'requested_on' => $d($extra['requested'] ?? $start - 10),
        ]);
    };

    // Historique
    $reserve('v16', 'Paul Henry', -25, -22, 'terminee');
    $reserve('v1', 'Camille Durand', -13, -9, 'terminee');
    $reserve('v1', 'Hugo Martin', -7, -3, 'terminee');
    $reserve('v2', 'Léa Bernard', -12, -8, 'terminee');
    $reserve('v2', 'Nathan Petit', -5, -1, 'terminee');
    $reserve('v4', 'Inès Moreau', -14, -10, 'terminee');
    $reserve('v4', 'Lucas Garnier', -7, -3, 'terminee');
    $reserve('v5', 'Chloé Laurent', -11, -6, 'terminee');
    $reserve('v5', 'Tom Roux', -4, -1, 'terminee');
    $reserve('v6', 'Manon Fournier', -10, -5, 'terminee');
    $reserve('v7', 'Atelier Lefèvre SARL', -9, -7, 'terminee');
    $reserve('v7', "Déménagements Rapid'", -6, -3, 'terminee');
    $reserve('v8', 'Sarah Girard', -13, -6, 'terminee');
    $reserve('v9', 'Julien Bonnet', -8, -4, 'terminee');
    $reserve('v10', 'Emma Lambert', -12, -5, 'terminee');
    $reserve('v11', 'Antoine Mercier', -8, -4, 'terminee');
    $reserve('v12', 'Zoé Faure', -11, -8, 'terminee');
    $reserve('v12', 'Maxime Blanc', -6, -3, 'terminee');
    $reserve('v13', 'Clara Rousseau', -9, -2, 'terminee');
    $reserve('v15', 'Louis Vincent', -14, -7, 'terminee');
    $reserve('v16', 'Jade Muller', -10, -4, 'terminee');

    // En cours (v8 est en retard)
    $reserve('v1', 'Paul Henry', -1, 3, 'en_cours');
    $reserve('v4', 'Raphaël Dubois', -2, 2, 'en_cours');
    $reserve('v7', 'Bâtiments Morel', -2, 0, 'en_cours');
    $reserve('v8', 'Kevin André', -3, -1, 'en_cours');
    $reserve('v9', 'Mathilde Roy', -1, 5, 'en_cours');
    $reserve('v11', 'Victor Leroy', -3, 1, 'en_cours');
    $reserve('v13', 'Nicolas Perrin', -1, 0, 'en_cours');
    $reserve('v15', 'Élodie Masson', -4, 6, 'en_cours');

    // À venir
    $reserve('v2', 'Alice Chevalier', 0, 4, 'confirmee');
    $reserve('v5', 'Sophie Lemoine', 0, 2, 'confirmee');
    $reserve('v12', 'Lina Gauthier', 0, 3, 'confirmee');
    $reserve('v6', 'Benjamin Robin', 2, 6, 'confirmee');
    $reserve('v10', 'Anaïs Caron', 1, 4, 'confirmee');
    $reserve('v16', 'Théo Picard', 3, 8, 'confirmee');
    $reserve('v1', 'Margaux Colin', 4, 9, 'confirmee');
    $reserve('v9', 'Quentin Brun', 6, 10, 'confirmee');
    $reserve('v3', 'Pauline Fabre', 5, 8, 'confirmee');
    $reserve('v4', 'Arthur Guérin', 3, 7, 'confirmee');
    $reserve('v8', 'Lucie Noël', 2, 5, 'confirmee');
    $reserve('v11', 'Hôtel Belvédère', 2, 6, 'confirmee');
    $reserve('v13', 'Romain Gaillard', 1, 5, 'confirmee');
    $reserve('v2', 'Céline Arnaud', 6, 11, 'confirmee');

    // Demandes envoyées depuis l'espace client, à valider par l'agence
    $reserve('v5', 'Inès Haddad', 4, 7, 'demande', ['tStart' => '10:00', 'tEnd' => '18:00', 'requested' => -1]);
    $reserve('v10', 'Yanis Benali', 6, 9, 'demande', ['tStart' => '09:00', 'tEnd' => '17:00', 'requested' => 0]);

    $pdo->commit();
}
