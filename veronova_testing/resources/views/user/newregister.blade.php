<html lang="en" translate="no" data-dpr="1" style="font-size: 37.5px;">

<head>
 <meta charset="UTF-8">
 <link rel="icon" type="image/svg+xml" href="#">
 <meta name="google" content="notranslate">
 <meta name="robots" content="noindex,nofollow">
 <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no,viewport-fit=cover">
 <link rel="stylesheet" href="/indexh.css">
 <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
 <!--动态选择配置文件-->
 <link rel="manifest">

 @php
 use App\Models\Admin_setting;
 $adminSetting = Admin_setting::find(3);
 @endphp
 <title>{{ $adminSetting ? $adminSetting->longtext : 'Game' }}</title>
 <script type="module" crossorigin="" src="/assets/js/index-fbf0707b.js"></script>
 <link rel="modulepreload" crossorigin="" href="/assets/js/vendor-b2024301.js">
 <link rel="stylesheet" href="/assets/css/index-3cf8aaa6.css">
 <script>
  window._TENANT = [];
 </script>
 <script>
  window._CONFIG = {
  	"tenant": "daman",
  	"scenes": "ScenesDaman"
  };
 </script>
 <link rel="modulepreload" as="script" crossorigin="" href="/assets/js/index-74b8a99f.js">
 <link rel="modulepreload" as="script" crossorigin="" href="/assets/js/LangPopup-08a11cc6.js">
 <link rel="modulepreload" as="script" crossorigin="" href="/assets/js/index-4a5675bf.js">
 <link rel="stylesheet" href="/assets/css/index-f18748b8.css">
 <link rel="stylesheet" href="/assets/css/LangPopup-51cc2937.css">
 <link rel="modulepreload" as="script" crossorigin="" href="/assets/js/SlideCaptcha-7b0791d7.js">
 <link rel="stylesheet" href="/assets/css/SlideCaptcha-2937b4a9.css">
 <link rel="modulepreload" as="script" crossorigin="" href="/assets/js/PasswordInput-31e16272.js">
 <link rel="stylesheet" href="/assets/css/PasswordInput-39e32c58.css">
 <link rel="modulepreload" as="script" crossorigin="" href="/assets/js/PhoneInput-cdb15012.js">
 <link rel="modulepreload" as="script" crossorigin="" href="/assets/js/DropDown-f1f7db31.js">
 <link rel="stylesheet" href="/assets/css/DropDown-f83d38a9.css">
 <link rel="stylesheet" href="/assets/css/PhoneInput-d06cfae1.css">
 <link rel="modulepreload" as="script" crossorigin="" href="/assets/js/VerifyInput-776957e7.js">
 <link rel="stylesheet" href="/assets/css/VerifyInput-ba9a4f32.css">
 <link rel="modulepreload" as="script" crossorigin="" href="/assets/js/validate-0bf9ac20.js">
 <link rel="modulepreload" as="script" crossorigin="" href="/assets/js/useCode.hook-56068ce8.js">
 <link rel="modulepreload" as="script" crossorigin="" href="/assets/js/EmailInput-42416bc1.js">
 <link rel="stylesheet" href="/assets/css/EmailInput-2bd6f8af.css">
 <link rel="stylesheet" href="/assets/css/index-d5587658.css">
 <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css" integrity="sha512-Evv84Mr4kqVGRNSgIGL/F/aIDqQb7xQ2vcrdIwxfjThSH8CSR7PBEakCr51Ck+w+/U6swU2Im1vVX0SVk9ABhg==" crossorigin="anonymous" referrerpolicy="no-referrer" />
 <style>
  .imagebackground{
  background-image: url("{{ asset('assets/auth_bg.png') }}");
  background-repeat: no-repeat;
  background-size: cover; 
  }
  .bgblack{
  background-color:black; 
  }
  input::placeholder {
  color:black; 
  }
  input{
  color:black; 
  border: 1px solid #ccc;
  padding: 10px;
  font-size: 16px;
  }
  		  img{
  			  height:20px
  		  }
 </style>
</head>

<body style="font-size: 12px;">
 <div id="app" data-v-app="" style=":#D3D3D3">
  <!--<div data-v-61e74e3f="" class="ar-loading-view" style="display: none; --f817f0ee: 'Roboto', 'Inter', sans-serif;">-->
  <!--   <div data-v-61e74e3f="" class="loading-wrapper">-->
  <!--      <div data-v-61e74e3f="" class="loading-animat">-->
  <!--      </div>-->
  <!--      <div data-v-61e74e3f="" class="com__box" style="display: none;">-->
  <!--         <div class="loading" data-v-61e74e3f="">-->
  <!--            <div class="shape shape-1" data-v-61e74e3f=""></div>-->
  <!--            <div class="shape shape-2" data-v-61e74e3f=""></div>-->
  <!--            <div class="shape shape-3" data-v-61e74e3f=""></div>-->
  <!--            <div class="shape shape-4" data-v-61e74e3f=""></div>-->
  <!--         </div>-->
  <!--      </div>-->
  <!--   </div>-->
  <!--<div data-v-61e74e3f="" class="skeleton-wrapper" style="display: none;">-->
  <!--   <div data-v-61e74e3f="" class="van-skeleton van-skeleton--animate">-->
  <!--      <div class="van-skeleton__content">-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 60%;"></div>-->
  <!--      </div>-->
  <!--   </div>-->
  <!--   <div data-v-61e74e3f="" class="van-skeleton van-skeleton--animate">-->
  <!--      <div class="van-skeleton-avatar van-skeleton-avatar--round"></div>-->
  <!--      <div class="van-skeleton__content">-->
  <!--         <h3 class="van-skeleton-title">-->
  <!--         </h3>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 60%;"></div>-->
  <!--      </div>-->
  <!--   </div>-->
  <!--   <div data-v-61e74e3f="" class="van-skeleton van-skeleton--animate">-->
  <!--      <div class="van-skeleton__content">-->
  <!--         <h3 class="van-skeleton-title"></h3>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 100%;"></div>-->
  <!--         <div class="van-skeleton-paragraph" style="width: 60%;"></div>-->
  <!--      </div>-->
  <!--   </div>-->
  <!--</div>-->
  <!--</div>-->
  <div class="imagebackground">
   <div data-v-a4c8bf60="" class="resgister__C " style="--f817f0ee: 'Roboto', 'Inter', sans-serif;" style=":#2a8ff3;">
    <div data-v-81ead1cb="" data-v-a4c8bf60="" class="navbar">
     <div data-v-81ead1cb="" class=" wc" style="background:none;">
      <div data-v-81ead1cb="" class="navbar__content" style=":#2a8ff3;">
       <div data-v-81ead1cb="" class="navbar__content-left">
        <i data-v-81ead1cb="" class="van-badge__wrapper van-icon van-icon-arrow-left"></i>
       </div>
       <div data-v-81ead1cb="" class="navbar__content-center" style=":#2a8ff3;">
        <!--<img src="https://root.nandigame.live/assets/nandi3.png" height="100%">-->
        <h2 style="color : white; font-weight: bold; font-size: 20px;"> {{ $adminSetting ? $adminSetting->longtext : 'Game' }} </h2>
       </div>
       <div data-v-81ead1cb="" class="navbar__content-title"></div>
      </div>
      <div data-v-81ead1cb="" class="navbar__content-right" style=":#2a8ff3;">
       <form action="{{route('user_register',$ref_id->referral_code)}}" method="post">
        @csrf
      </div>
     </div>
    </div>
   </div>
   <div style="text-align:center; :#2a8ff3;">
    <img data-v-dba00bcf="" src="/assets/png/cellphone-35529171.png" class="phoneInput__container-label__icon">
    <p style="color : white; font-weight: bold; font-size: 20px;">Register your phone</p>
    <hr>
   </div>
   <div style=": red;">
    @includeIf('admin.body.flash-message')
   </div>
   <div data-v-a4c8bf60="" class="resgister__C-form" style=": LightGray;">
    <div data-v-a4c8bf60="" class="tab-content activecontent">
     <div data-v-327ab6b4="" data-v-a4c8bf60="" class="register__container ">
      <div data-v-dba00bcf="" data-v-327ab6b4="" class="phoneInput__container">
       <div data-v-dba00bcf="" class="phoneInput__container-label">
        <img data-v-dba00bcf="" src="/assets/png/cellphone-35529171.png" class="phoneInput__container-label__icon">
        <span data-v-dba00bcf="" style="color:white;">Phone number</span>
       </div>
       <div data-v-dba00bcf="" class="phoneInput__container-input">
        <div data-v-183fb3f9="" data-v-dba00bcf="" style="white-space: nowrap; color: grey; height: 50px;padding:2px" class="dropdown">
    <div data-v-183fb3f9="" class="dropdown__value" style="background:white; border-radius:10px; height: 70%; display: flex; align-items: center; padding: 5px;margin-top:10px">
        <select  id="phone_code" name="phone_code" style="height:; border: none; padding: 5px; font-size: 14px; flex: 1;outline:none">
            @foreach($country as $countries)
                <option value="{{$countries->phone_code}}">{{$countries->phone_code}}</option>
            @endforeach
        </select>
        <!--<i data-v-183fb3f9="" style="color: Gray; padding-left: 10px;" class="van-badge__wrapper van-icon van-icon-arrow-down"></i>-->
    </div>
</div>

        <input class="bgblack" data-v-dba00bcf="" type="number" style=": white; color:black;background:white" id="mobileNumber" name="mobile" placeholder="Only 10 numbers allowed" maxlength="10" required pattern="\d{10}" oninput="this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);" title="Please enter exactly 10 digits.">
       </div>
       @error('mobile')
       <div class="alert alert-warning" style="color: red;">{{ $message }}</div>
       @enderror
      </div>
      <div data-v-dba00bcf="" data-v-327ab6b4="" id="otp_section" class="phoneInput__container">
       <div data-v-dba00bcf="" class="phoneInput__container-label">
        <img data-v-dba00bcf="" src="/assets/png/cellphone-35529171.png" class="phoneInput__container-label__icon">
        <span data-v-dba00bcf="" style="color: white;">OTP</span>
       </div>
       <div data-v-dba00bcf="" class="phoneInput__container-input">
        <div data-v-183fb3f9="" data-v-dba00bcf="" class="dropdown" style="color:white;background:green">
         <div data-v-183fb3f9="" class="dropdown__value" id="sendOtp">
          <span data-v-183fb3f9>Send</span>
         </div>
        </div>
        <input data-v-dba00bcf="" type="number" style=": white; color:black;background:white" name="otp" placeholder="Please enter the otp" maxlength="10" required>
       </div>
       <div class="response" id="responseMessage"></div>
      </div>
      <script>
       responseMessage.style.color = 'white';  // Set text color to white
       //responseMessage.style.backgroundColor = '#007bff'; // Set a background color (optional)
       responseMessage.style.padding = '10px'; // Add padding (optional)
       responseMessage.style.borderRadius = '5px'; // Rounded corners (optional)
       responseMessage.style.fontWeight = 'bold'; // Make the text bold (optional)
       
      </script>
      <script>
       document.getElementById('sendOtp').addEventListener('click', function() {
       	var mobileNumber = document.getElementById('mobileNumber').value;
       	var responseMessage = document.getElementById('responseMessage');
       
       	if (mobileNumber.length !== 10) {
       		alert('Please enter a valid 10-digit mobile number.');
       		return;
       	}
       
       	// Step 1: Send OTP
       	var xhrSend = new XMLHttpRequest();
       	var sendUrl = 'https://otp.fctechteam.org/send_otp.php?mode=live&digit=4&mobile=' + mobileNumber;
       
       	xhrSend.open('GET', sendUrl, true);
       	xhrSend.onreadystatechange = function() { 
       		if (xhrSend.readyState === 4) {
       			if (xhrSend.status === 200) {
       			
       							var sendResponse = JSON.parse(xhrSend.responseText);
       							var otpSent = sendResponse.otp; // Capture the OTP from the response
       							responseMessage.innerText = 'OTP Sent Successfully: ' + sendResponse.msg;
       							responseMessage.style.color = 'white';
       				verifyOtp(mobileNumber, otpSent);
       			} else {
       				responseMessage.innerText = 'Error Sending OTP: ' + xhrSend.statusText;
       			}
       		}
       	};
       	xhrSend.send();
       });
       
       function verifyOtp(mobileNumber, otp) {
       	var responseMessage = document.getElementById('responseMessage');
       
       	// Step 2: Verify OTP
       	var xhrVerify = new XMLHttpRequest();
       	var verifyUrl = 'https://otp.fctechteam.org/verifyotp.php?mobile=' + mobileNumber + '&otp=' + otp;
       
       	xhrVerify.open('GET', verifyUrl, true);
       	xhrVerify.onreadystatechange = function() {
       		if (xhrVerify.readyState === 4) {
       			if (xhrVerify.status === 200) {
       				var verifyResponse = JSON.parse(xhrVerify.responseText);
       				if (verifyResponse.error === "200") {
       
       
       					// Step 3: Register mobile and OTP
       					var xhrRegister = new XMLHttpRequest();
       					var registerUrl = 'https://root.jupitergames.app/api/otp-register';
       					var params = JSON.stringify({
       						mobile: mobileNumber,
       						otp: otp
       					});
       
       					xhrRegister.open('POST', registerUrl, true);
       					xhrRegister.setRequestHeader('Content-Type', 'application/json');
       
       					xhrRegister.onreadystatechange = function() {
       						if (xhrRegister.readyState === 4) {
       							if (xhrRegister.status === 200) {
       								var registerResponse = JSON.parse(xhrRegister.responseText);
       
       							} else {
       								//responseMessage.innerText += '\nError Registering: ' + xhrRegister.statusText;
       							}
       						}
       					};
       					xhrRegister.send(params);
       				} else {
       					responseMessage.innerText = 'OTP Verification Failed: ' + verifyResponse.msg;
       				}
       			} else {
       				responseMessage.innerText = 'Error Verifying OTP: ' + xhrVerify.statusText;
       			}
       		}
       	};
       	xhrVerify.send();
       }
      </script>
      <div data-v-327ab6b4="" class="register__container-tips" style="display: none;"><span data-v-327ab6b4="">Entered twice the password does not match!</span></div>
      <div data-v-327ab6b4="" class="register__container-invitation">
       <div data-v-327ab6b4="" class="register__container-invitation__label"><img data-v-327ab6b4="" class="register__container-						invitation__label-icon" data-src="/assets/png/invitation-5285cf0f.png" src="/assets/png/invitation-5285cf0f.png" lazy="loaded"><span data-v-327ab6b4="" style="color: white;">Email</span></div>
       <div data-v-327ab6b4="" class="register__container-invitation__input">
        <input data-v-327ab6b4="" name="email" required value="" type="text" placeholder="Please enter your email" style="color: black;background:white" maxlength="40" required>
       </div>
       @error('email')
       <div class="alert alert-warning" style="color: red;">{{ $message }}</div>
       @enderror
      </div><br><br><br>
      <div data-v-327ab6b4="" class="tip">
       <!---->
       <!---->
      </div>
      <!---->
      <div data-v-934f92c4="" data-v-327ab6b4="" class="passwordInput__container">
       <div data-v-934f92c4="" class="passwordInput__container-label"><img data-v-934f92c4="" class="passwordInput__container-						label__icon" data-src="/assets/png/password-12e0a3fc.png" src="/assets/png/password-12e0a3fc.png" lazy="loaded"><span data-v-934f92c4="" style="color:white;">Set password</span></div>
       <div data-v-934f92c4="" class="passwordInput__container-input"><input data-v-934f92c4="" type="password" required placeholder="Set password" id="password" name="password" maxlength="15" style="color: black;background:white;" autocomplete="new-password" required>
        <i class="fa-solid fa-eye-slash fa-xl toggle-icon" onclick="togglePassword()" style="margin-left:-40"></i>
       </div>
       @error('password')
       <div class="alert alert-warning" style="color: red;">{{ $message }}</div>
       @enderror
      </div>
      <div data-v-327ab6b4="" class="register__container-tip" style="display: none;">
       <div data-v-327ab6b4="" class="tipbg"></div><span data-v-327ab6b4="">The password must be at least 8 digits and must contain letters + numbers</span>
      </div>
      <div data-v-934f92c4="" data-v-327ab6b4="" class="passwordInput__container">
       <div data-v-934f92c4="" class="passwordInput__container-label"><img data-v-934f92c4="" class="passwordInput__container-							label__icon" data-src="/assets/png/password-12e0a3fc.png" src="/assets/png/password-12e0a3fc.png" lazy="loaded"><span data-v- 934f92c4="" style="color: white;">Confirm password</span></div>
       <div data-v-934f92c4="" class="passwordInput__container-input">
        <input data-v-934f92c4="" id="confirm_password" type="password" required name="password_confirmation" placeholder="Confirm password" maxlength="15" style="color:black;background:white" autocomplete="new-password" required>
        <i id="eye-icon" class="fa-solid fa-eye-slash fa-xl cpassword" onclick="togglePasswordVisibility()" style="margin-left:-40"></i>

       </div>
       @error('password_confirmation')
       <div class="alert alert-warning" style="color: red;">{{ $message }}</div>
       @enderror
      </div>
      <div data-v-327ab6b4="" class="register__container-tips" style="display: none;"><span data-v-327ab6b4="">Entered twice the password does not match!</span></div>
      <div data-v-327ab6b4="" class="register__container-invitation">
       <div data-v-327ab6b4="" class="register__container-invitation__label"><img data-v-327ab6b4="" class="register__container-invitation__label-icon" data-src="/assets/png/invitation-5285cf0f.png" src="/assets/png/invitation-5285cf0f.png" lazy="loaded"><span data-v-327ab6b4="" style="color: white;">Invite code</span></div>
       <div data-v-327ab6b4="" class="register__container-invitation__input">
        <input class="inviteCode" data-v-327ab6b4="" name="referral_code" value="{{$ref_id->referral_code}}" type="text" auto-complete="new-password" style="color:black;background:white" autocomplete="off" name="userNumber" placeholder="Please enter your email" disabled="" maxlength="40" required>
       </div>
      </div>
      <div data-v-327ab6b4="" class="register__container-remember">
       <div data-v-327ab6b4="" role="checkbox" class="van-checkbox" tabindex="0" aria-checked="false"></div>
      </div>
      <div data-v-327ab6b4="" class="register__container-button">
       <button data-v-327ab6b4="" type="submit">Register</button><br>
       <!--<a href="http://nandigame.live/" data-v-327ab6b4="" type="">login</a>-->
       <a href="https://webbdgcassino.apponrent.com/" style="
               width: 7.73333rem;
               height: 1.06667rem;
               color: #fff;
               font-size: .48rem;
               font-weight: 700;
               letter-spacing: .05333rem;
               border-radius: 1.06667rem;
               border: none;
               background: -webkit-linear-gradient(top, #2AAAF3 0%, #2979F2 100%);
               background: linear-gradient(180deg, #2AAAF3 0%, #2979F2 100%);
               display: -webkit-box;
               display: -webkit-flex;
               display: flex;
               -webkit-box-align: center;
               -webkit-align-items: center;
               align-items: center;
               -webkit-box-pack: center;
               -webkit-justify-content: center;
               justify-content: center;
               ">Login</a>
      </div>
     </div>
    </div>
   </div>
   <!---->
  </div>
 </div>
 <div class="customer" id="customerId" style="--f817f0ee: 'Roboto', 'Inter', sans-serif; --733cb41a: bahnschrift;"><img data- src="/assets/png/icon_sevice-f79b6ecd.png" src="/assets/png/icon_sevice-f79b6ecd.png" lazy="loaded"></div>
 </form>
 </div>
 <!---->
 <!---->
 <!---->
 <!---->

 <script>
  function togglePassword() {
      const passwordField = document.getElementById('password');
      const icon = document.querySelector('.toggle-icon');
      if (passwordField.type === 'password') {
          passwordField.type = 'text';
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye'); 
      } else {
          passwordField.type = 'password';
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash'); 
      }
  }
 </script>
 <script>
  function togglePasswordVisibility() {
    var passwordField = document.getElementById("confirm_password");
    var eyeIcon = document.getElementById("eye-icon");
  
    if (passwordField.type === "password") {
      passwordField.type = "text";
      eyeIcon.classList.remove("fa-eye");
      eyeIcon.classList.add("fa-eye-slash");
    } else {
      passwordField.type = "password"; 
      eyeIcon.classList.remove("fa-eye-slash");
      eyeIcon.classList.add("fa-eye"); 
    }
  }
 </script>
 
 <script>
document.getElementById('phone_code').addEventListener('change', function() {
    var selectedCode = this.value;
    var otpSection = document.getElementById('otp_section');
    
    if (selectedCode === '+91') {
        otpSection.style.display = 'block';
    } else {
        otpSection.style.display = 'none';
    }
});

window.addEventListener('DOMContentLoaded', (event) => {
    var selectedCode = document.getElementById('phone_code').value;
    var otpSection = document.getElementById('otp_section');
    
    if (selectedCode === '+91') {
        otpSection.style.display = 'block';
    } else {
        otpSection.style.display = 'none';
    }
});

</script>


</body>

</html>