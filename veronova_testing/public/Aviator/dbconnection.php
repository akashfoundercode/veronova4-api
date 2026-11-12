<?php

$servername = "localhost";
$username = "verenova_db";
$password = "Verenova_db";
$dbname = "verenova_db";

// Create connection  
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>

