<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Test endpoint: /proxy.php?test=1
if (isset($_GET['test'])) {
    echo json_encode([
        'php' => 'ok',
        'curl' => function_exists('curl_init') ? 'ok' : 'missing',
        'version' => phpversion(),
    ]);
    exit;
}

$url = isset($_GET['url']) ? $_GET['url'] : '';

if (!$url) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing url parameter']);
    exit;
}

// Only allow requests to Yahoo Finance
if (!preg_match('#^https://query[12]\.finance\.yahoo\.com/#', $url)) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden']);
    exit;
}

if (!function_exists('curl_init')) {
    http_response_code(500);
    echo json_encode(['error' => 'cURL not available']);
    exit;
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept: application/json, text/plain, */*',
    'Accept-Language: en-US,en;q=0.9',
    'Referer: https://finance.yahoo.com/',
    'Origin: https://finance.yahoo.com',
]);

$body = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    http_response_code(502);
    echo json_encode(['error' => $error]);
    exit;
}

http_response_code($status);
echo $body;
