<?php


$servername = "localhost";
$username = "gamebridge_jupiter_world";
$password = "gamebridge_jupiter_world";
$dbname = "gamebridge_jupiter_world";

// Create connection  
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>

