<?php

header("Access-Control-Allow-Methods: POST");
            header("Content-Type: application/json; charset=UTF-8");
            header("Access-Control-Allow-Origin: *");
            header("Access-Control-Allow-Headers: Origin, Content-Type");
            header("Content-Type: application/json");
            header("Expires: 0");
            header("Last-Modified: " . gmdate("D, d M Y H:i:s") . " GMT");
            header("Cache-Control: no-store, no-cache, must-revalidate");
            header("Cache-Control: post-check=0, pre-check=0", false);
            header("Pragma: no-cache");
                    
            
            $date=date('Y-m-d H:i:s');
          $_POST = json_decode(file_get_contents("php://input"), true);


$name=$_POST['name'];
$email=$_POST['email'];
$amounts=$_POST['amount'];
$mobile=$_POST['mobile'];
$orderid=$_POST['orderid'];

    date_default_timezone_set('Asia/Kolkata');
     $rand=rand(1111,9999);
    // Details of User and Merchant Account
    $authId = "M00006491";
    $authKey = "qM4tC7HO4lR5hi4nL0eF0dL8OH9Ot4bx";
    $transactionId = $orderid;
    $amount = "$amounts.00";
    $paymentDate = date('Y-m-d H:i:s');
    $userMobile = "$mobile";
    $userEmail = "$email";
    $paymentCallBackUrl = 'https://dashboard.kuberpay.co.in/skillpaycallback';
    // End of Details

    function encryptData($data, $key, $iv) {
        return openssl_encrypt($data, 'aes-256-cbc', $key, 0, $iv);
    }
    function decryptData($data, $key, $iv) {
        return openssl_decrypt($data, 'aes-256-cbc', $key, 0, $iv);
    }

    $url = 'https://dashboard.skill-pay.in/pay/paymentinit';
    $data = array(
        "AuthID" => $authId,
        "AuthKey" => $authKey,
        "CustRefNum" => $transactionId,
        "txn_Amount" => $amount,
        "PaymentDate" => $paymentDate,
        "ContactNo" => $userMobile,
        "EmailId" => $userEmail,
        "IntegrationType" => "seamless",
        "CallbackURL" => $paymentCallBackUrl,
        "adf1" => "NA",
        "adf2" => "NA",
        "adf3" => "NA",
        "MOP" => "UPI",
        "MOPType" => "UPI",
        "MOPDetails" => "I"
    );
  
    $jsonData = json_encode($data);
     
    $iv = substr($authKey, 0, 16);
    $encryptedData = encryptData($jsonData, $authKey, $iv);
    // echo $encryptedData;
    if (!$encryptedData) {
        die('Encryption failed');
    }
  
    $postData = http_build_query(array(
        'encData' => $encryptedData,
        'AuthID' => $authId
    ));
   
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        'Content-Type: application/x-www-form-urlencoded'
    ));

    $result = curl_exec($ch);
   
    // Check for cURL errors
    if (curl_errno($ch)) {
        die('Curl error: ' . curl_error($ch));
    }
  
    curl_close($ch);

    $response = json_decode($result);
   
    if (!$response || !isset($response->respData)) {
        die('Invalid response from payment gateway');
    }
    
    $decoded = $response->respData;
    
    $decryptedData = decryptData($decoded, $authKey, $iv);
    
    echo $decryptedData;die;

    if (!$decryptedData) {
        die('Decryption failed');
    }

    $upiIntent = json_decode($decryptedData)->qrString;
    
    if (!$upiIntent) {
        die('Something went wrong');
    }
    
    
    
    // Generate button for UPI payment
    echo '<a href="' . htmlspecialchars($upiIntent) . '">Click to Pay</a>';
?>