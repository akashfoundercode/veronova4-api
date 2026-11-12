<?php 


$data=$_GET['data'];
// $order_id=$Jsondecode['order_id'];



if(!empty($data))
{
$decoded=base64_decode($data);

$Jsondecode=json_decode($decoded,true);
$cname=$Jsondecode['cname'];
$intent_link=$Jsondecode['intent_link'];
$order_id=$Jsondecode['order_id'];
$amount=$Jsondecode['amount'];


$qr_code_url = 'https://api.qrserver.com/v1/create-qr-code/?amp;size=200x200&data=' . urlencode($intent_link);
// echo $intent_link;die;
}else{
    echo "no data";
}


?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Page</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }

        .container {
            max-width: 400px;
            height: 520px;
            margin: 20px auto;
            background-color: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        }

        .header .title {
            font-size: 16px;
            font-weight: 590;
            color: #333;
        }

        .header .amount {
            font-size: 19px;
            font-weight: 550;
        }

        .qr-section {
            text-align: center;
            margin: 30px 0;
        }

        .qr-section img {
            width: 170px;
        }

        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0 10px;
            display: flex;
            align-items: center;
        }

        .section-title img {
            width: 25px;
            margin-right: 10px;
        }

        .payment-methods {
            display: flex;
            justify-content: space-around;
            margin-top: 15px;
        }

        .payment-methods img {
            width: 45px;
            height: 45px;
            border-radius: 25%;
            cursor: pointer;
            border: 2px solid lightgray;
            transition: background-color 0.3s ease, border 0.3s ease;
        }

        .payment-methods img.phonepay:hover {
            border: 2px solid #5F259F; 
            box-shadow: 0.4px 0.4px 0.4px 0.4px #5F259F ;
        }

        .payment-methods img.gpay:hover {
            border: 2px solid gray;
            box-shadow: 0.955px 0.955px 0.955px 0.955px lightgray;  
        }

        .payment-methods img.paytm:hover {
            border: 2px solid gray;
            box-shadow: 0.955px 0.955px 0.955px 0.955px lightgray;  
        }

        .payment-methods img.other:hover {
            border: 2px solid gray;
            box-shadow: 0.955px 0.955px 0.955px 0.955px lightgray;  
        }

        .pay-button {
            display: block;
            width: 100%;
            padding: 12px;
            margin-top: 30px;
            background-color: #5F259F;
            color: white;
            font-size: 18px;	
            border: none;
            border-radius: 30px;
            cursor: pointer;
            text-align: center;
        }

        .pay-button:hover {
            background-color:#6a0399;
        }

        .info-text {
            font-size: 12px;
            color: gray;
            margin-top: -6px;
            margin-bottom: 15px;
        }

        .correct-icon {
            position: relative;
            float: right;
            margin-top: -50px;
        }

        .correct-icon img {
            width: 20px;
        }
        .timer-container {
          text-align: center;
        }
        
        #timer {
          font-size: 3rem;
          color: #333;
          background-color: #fff;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        a{
            text-decoration: none; 
        }
    </style>
</head>
<body>

    <div class="container">
        <!-- Header with amount and title -->
        <div class="header">
            <div class="title">
               Winzy 
            </div>
            <div class="amount">
                ₹<?php echo $amount; ?> <i class="fa fa-times"></i>
            </div>
        </div>

        <!-- QR Section -->
        <div class="qr-section">
            <img src="<?php echo $qr_code_url; ?>" alt="QR Code">
        </div>
        <div class="timer-container">
            <h1 id="timer">02:00</h1>
        </div>

        <!-- UPI Apps -->
        <div class="section-title">
            <img src="upiiiii.png" alt="UPI Logo"> UPI Apps
        </div>
        
        <p class="info-text">Instant payment via UPI apps or UPI ID</p>

        <div class="correct-icon">
            <img src="correct.png" alt="Correct">
        </div>

        <!-- Payment Methods -->
        <div class="payment-methods">
            <a href="<?php echo $intent_link; ?>"><img class="phonepay" src="phonepay.png" alt="PhonePe"></a>
            <a href="<?php echo $intent_link; ?>"><img class="gpay" src="gp.png" alt="GPay"></a>
            <a href="<?php echo $intent_link; ?>"><img class="paytm" src="pt.png" alt="Paytm"></a>
            <a href="<?php echo $intent_link; ?>"><img class="other" src="upii.png" alt="Other"></a>
        </div>
        <br>
        <!-- Pay Button -->
        <a href="<?php echo $intent_link; ?>"><button class="pay-button">PAY ₹<?php echo $amount; ?></button></a>
    </div>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>
        // Set the initial time (2 minutes = 120 seconds)
        let time = 120;
        
        // Function to update the timer display
        function updateTimerDisplay() {
          let minutes = Math.floor(time / 60);
          let seconds = time % 60;
        
          // Add a leading zero to seconds if needed
          seconds = seconds < 10 ? '0' + seconds : seconds;
        
          document.getElementById('timer').textContent = `${minutes}:${seconds}`;
        }
        
        // Function to start the countdown
        function startTimer() {
          const countdown = setInterval(() => {
            time--;
        
            updateTimerDisplay();
        
            // Stop the timer when time runs out
            if (time <= 0) {
              clearInterval(countdown);
            }
          }, 1000);
        }
        
        // Start the timer when the page loads
        window.onload = startTimer;

    </script>
    <script>
$(document).ready(function() {
    function apiCall() {
        $.ajax({
            type: 'get',
            url: 'https://root.winzy.app/api/checkSkillPayOrderId',
            data: { order_id: '<?php echo $order_id; ?>' },
            dataType: 'json',
            success: function(data) {
                if (data.status === 200 && data.msg === 'Pending') {
                    console.log('Order is still pending');
                } else {
                    console.log('Redirecting...');
                    window.location.href = data.msg;
                }
            },
            error: function(xhr, status, error) {
                console.error('Error:', error);
            }
        });
    }

    // Call apiCall() function initially
    apiCall();

    // Call apiCall() function every 3 seconds
    setInterval(apiCall, 3000);
});

    
</script>
</body>
</html>


