<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed</title>

  <link href="https://fonts.googleapis.com/css?family=Nunito+Sans:400,400i,700,900&display=swap" rel="stylesheet">

  <script src="https://unpkg.com/@dotlottie/player-component@2.7.12/dist/dotlottie-player.mjs" type="module"></script>

  <style>

    *{
        margin:0;
        padding:0;
        box-sizing:border-box;
    }

    body{
        text-align:center;
        padding:20px;
        background:linear-gradient(135deg,#ff9a9e,#fad0c4);
        font-family:"Nunito Sans","Helvetica Neue",sans-serif;
        height:100vh;
        display:flex;
        justify-content:center;
        align-items:center;
    }

    .card{

        background:#fff;
        padding:40px 30px;
        border-radius:15px;
        box-shadow:0 12px 24px rgba(0,0,0,.15);
        width:100%;
        max-width:450px;
        transition:.3s;

    }

    .card:hover{

        transform:translateY(-5px);
        box-shadow:0 20px 40px rgba(0,0,0,.25);

    }

    h1{

        color:#e53935;
        font-size:36px;
        font-weight:900;
        margin-bottom:10px;

    }

    p{

        color:#666;
        line-height:1.6;
        font-size:16px;
        margin-bottom:20px;

    }

    .countdown{

        color:#ff5722;
        font-size:18px;
        font-weight:bold;

    }

    dotlottie-player{

        width:100%;
        max-width:300px;
        margin:auto;

    }

    @media(max-width:600px){

        .card{

            padding:20px;

        }

        h1{

            font-size:28px;

        }

        p{

            font-size:14px;

        }

    }

  </style>

  <script>

      let countdown=3;

      function timer(){

          if(countdown>0){

              document.getElementById("countdown").innerHTML=countdown;

              countdown--;

              setTimeout(timer,1000);

          }else{

              window.location.href="https://veronova.co.in/";

          }

      }

      window.onload=timer;

  </script>

</head>

<body>

<div class="card">

    <dotlottie-player
        src="https://lottie.host/1f5d0f5e-f7b5-4d45-a3a8-8f3d56d741ad/XkQz2L7HjR.lottie"
        background="transparent"
        speed="1"
        autoplay
        loop>
    </dotlottie-player>

    <h1>Payment Failed</h1>

    <p>
        Sorry! Your payment could not be completed.<br>
        Please try again or use another payment method.
    </p>

    <p class="countdown">
        Redirecting to home in
        <span id="countdown">3</span>
        seconds...
    </p>

</div>

</body>
</html>