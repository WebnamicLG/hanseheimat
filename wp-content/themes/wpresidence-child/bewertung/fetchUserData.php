<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set proper headers for JSON response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Initialize response
$response = [
    'status' => 'error',
    'message' => 'Invalid request'
];

try {
    // Check if it's a POST request
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Only POST method is allowed');
    }

    // Get JSON input
    $input = file_get_contents('php://input');
    if (empty($input)) {
        throw new Exception('No input data received');
    }

    // Decode JSON
    $data = json_decode($input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('Invalid JSON: ' . json_last_error_msg());
    }

    // Check for userKey
    if (!isset($data['userKey']) || empty($data['userKey'])) {
        throw new Exception('userKey is required');
    }

    $userKey = $data['userKey'];

    // TODO: Implement database connection and fetch user data
    // For now, return a sample response
    
    // Example response structure
    $response = [
        'status' => 'success',
        'data' => [
            'userKey' => $userKey,
            'property_address' => 'Sample Street 123, Sample City, 12345',
            // Add more user data as needed
        ]
    ];

    // If no data found for user (example condition)
    // $response = [
    //     'status' => 'error',
    //     'message' => 'No data found for user'
    // ];

} catch (Exception $e) {
    $response = [
        'status' => 'error',
        'message' => $e->getMessage()
    ];
    http_response_code(400);
}

// Send JSON response
echo json_encode($response);
exit();