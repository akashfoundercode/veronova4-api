<?php
$dadas = $_GET['data'] ?? '';
$json = base64_decode($dadas);

// Decode the JSON string into a PHP associative array
$decode = json_decode($json, true);
if ($decode && is_array($decode)) {
    $amount = $decode['amount'] ?? '';
    $walletAddress = $decode['address'] ?? '';
    $txnId = $decode['orderid'] ?? '';
    $qr = $decode['qr'] ?? '';
    $network = "TRON(TRC-20)";
} else {
    echo "Invalid JSON provided!";
    exit;
}
?>

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>UPay Recharge</title>
  <style>
    body {
        font-family: Arial, sans-serif;
        background-color: #f6f7fb;
        margin: 0;
        padding: 0;
        color: #333;
    }

    .container {
        max-width: 420px;
        margin: 30px auto;
        background-color: #fff;
        padding: 20px 25px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        border-radius: 12px;
    }

    .header {
        text-align: center;
        margin-bottom: 20px;
    }

    .header h1 {
        margin: 0;
        font-size: 24px;
        color: #333;
    }

    .header span {
        font-size: 14px;
        color: gray;
    }

    .amount-section {
        text-align: center;
    }

    .amount-section h2 {
        font-size: 30px;
        margin: 10px 0;
    }

    .amount-section .alert {
        background-color: #ffe0e0;
        padding: 10px;
        font-size: 12px;
        color: red;
        border-radius: 6px;
        margin: 10px 0;
    }

    .wallet-section {
        text-align: center;
        margin-top: 20px;
    }

    .wallet-section img {
        margin: 10px 0;
    }

    .wallet-section code {
        font-size: 14px;
        word-break: break-all;
    }

    .countdown {
        text-align: center;
        font-size: 16px;
        font-weight: bold;
        margin-top: 20px;
    }

    .tips {
        font-size: 14px;
        margin-top: 20px;
    }

    .tips h4 {
        margin-bottom: 10px;
    }

    .tips ol {
        padding-left: 20px;
    }

    .red {
        color: red;
    }

    code {
        background-color: #f4f4f4;
        padding: 2px 6px;
        border-radius: 4px;
        display: inline-block;
        margin-top: 5px;
    }

    img.qr {
        width: 180px;
        height: 180px;
        transition: filter 0.3s ease-in-out;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>IPay</h1>
      <span>u05cashier.upay.mobi</span>
    </div>

    <div class="amount-section">
      <img src="https://zengo.com/wp-content/uploads/USDT-TRC20.png" alt="USDT" width="40">
      <h2><?php echo $amount; ?> USDT</h2>
      <p>Network · <?php echo $network; ?></p>
      <div class="alert">⚠️ The amount received will be subject to the actual transfer amount. Not less than <?php echo $amount; ?> USDT</div>
      <p>Transaction ID: <code><?php echo $txnId; ?></code></p>
    </div>

    <div class="wallet-section">
      <h3>Recipient’s wallet address:</h3>
      <img class="qr" id="qrImage" src="<?php echo $qr ?>" alt="QR Code">
      <p><code><?php echo $walletAddress; ?></code></p>
    </div>

    <div class="countdown" id="countdown">
      <span id="days">00</span>d :
      <span id="hours">00</span>h :
      <span id="minutes">02</span>m :
      <span id="seconds">00</span>s
    </div>

    <div class="tips">
      <h4>Tips:</h4>
      <ol>
        <li>This channel only supports <strong>USDT-TRC20</strong> recharge</li>
        <li>The recharge address is a <span class="red">one-time address</span>, do not save or reuse.</li>
        <li>The amount must be at least <strong><?php echo $amount; ?> USDT</strong></li>
        <li>After recharging, confirmation takes about <strong>1 to 2 minutes</strong>. Please wait.</li>
      </ol>
    </div>
  </div>

  <script>
    // Set 2 minutes from now
    const countdownTime = new Date().getTime() + 2 * 60 * 1000;

    function updateCountdown() {
      const now = new Date().getTime();
      const distance = countdownTime - now;

      if (distance <= 0) {
        // Set all to 00
        document.getElementById("days").textContent = "00";
        document.getElementById("hours").textContent = "00";
        document.getElementById("minutes").textContent = "00";
        document.getElementById("seconds").textContent = "00";

        // Blur the QR code
        document.getElementById("qrImage").style.filter = "blur(5px)";

        // Show expired alert
        let expiredAlert = document.createElement("div");
        expiredAlert.classList.add("alert");
        expiredAlert.style.color = "red";
        expiredAlert.innerHTML = "⚠️ QR expired. Please generate a new one.";
        document.querySelector(".wallet-section").appendChild(expiredAlert);

        clearInterval(timerInterval);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      document.getElementById("days").textContent = String(days).padStart(2, '0');
      document.getElementById("hours").textContent = String(hours).padStart(2, '0');
      document.getElementById("minutes").textContent = String(minutes).padStart(2, '0');
      document.getElementById("seconds").textContent = String(seconds).padStart(2, '0');
    }

    const timerInterval = setInterval(updateCountdown, 1000);
  </script>
</body>
</html>
