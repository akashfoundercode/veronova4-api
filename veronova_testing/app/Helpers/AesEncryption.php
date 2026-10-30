// app/Helpers/AesEncryption.php

namespace App\Helpers;

class AesEncryption
{
    public static function encryptData($data, $secretKey)
    {
        $cipherMethod = 'AES-256-CBC';
        $ivLength = openssl_cipher_iv_length($cipherMethod);
        $iv = openssl_random_pseudo_bytes($ivLength);

        $encryptedData = openssl_encrypt(
            json_encode($data),
            $cipherMethod,
            $secretKey,
            0,
            $iv
        );

        // Encode the result to send over HTTP
        return base64_encode($iv . $encryptedData);
    }

    public static function decryptData($encryptedData, $secretKey)
    {
        $cipherMethod = 'AES-256-CBC';
        $encryptedData = base64_decode($encryptedData);
        $ivLength = openssl_cipher_iv_length($cipherMethod);
        $iv = substr($encryptedData, 0, $ivLength);
        $ciphertext = substr($encryptedData, $ivLength);

        return openssl_decrypt($ciphertext, $cipherMethod, $secretKey, 0, $iv);
    }
}
