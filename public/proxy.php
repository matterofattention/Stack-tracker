<?php
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

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (compatible; stack-tracker/1.0)');
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

$body = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    http_response_code(502);
    echo json_encode(['error' => $error]);
    exit;
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
http_response_code($status);
echo $body;
