<!DOCTYPE html>
<html lang="en">
   <head>
      <!-- basic -->
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <!-- mobile metas -->
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta name="viewport" content="initial-scale=1, maximum-scale=1">
      <!-- site metas -->
      <title>Pluto - Responsive Bootstrap Admin Panel Templates</title>
      <meta name="keywords" content="">
      <meta name="description" content="">
      <meta name="author" content="">
      <!-- site icon -->
      <link rel="icon" href="images/fevicon.png" type="image/png" />
      <!-- bootstrap css -->
      <link rel="stylesheet" href="{{asset('css/bootstrap.min.css')}}" />
      <!-- site css -->
      <link rel="stylesheet" href="{{asset('style.css')}}" />
      <!-- responsive css -->
      <link rel="stylesheet" href="{{asset('css/responsive.css')}}" />
      <!-- color css -->
      <link rel="stylesheet" href="{{asset('css/colors.css')}}" />
      <!-- select bootstrap -->
      <link rel="stylesheet" href="{{asset('css/bootstrap-select.css')}}" />
      <!-- scrollbar css -->
      <link rel="stylesheet" href="{{asset('css/perfect-scrollbar.css')}}" />
      <!-- custom css -->
      <link rel="stylesheet" href="{{asset('css/custom.css')}}" />
      <!-- calendar file css -->
      <link rel="stylesheet" href="{{asset('js/semantic.min.css')}}" />
      <!--[if lt IE 9]>
      <script src="https://oss.maxcdn.com/libs/html5shiv/3.7.0/html5shiv.js"></script>
      <script src="https://oss.maxcdn.com/libs/respond.js/1.4.2/respond.min.js"></script>
      <![endif]-->
   </head>
   <body class="inner_page login">
      <div class="full_container">
         <div class="container">
            <div class="center verticle_center full_height">
               <div class="login_section">
                  <div class="logo_login">
                     <div class="center">
                        <h3 class="text-white">Registration</h3>
                        {{-- <img width="210" src="images/layout_img/bg1.png" alt="#" /> --}}
                     </div>
                  </div>
                  <div class="login_form">
                     <form  action="{{route('register.store')}}" method="POST">
                        @csrf
{{--      
                          @error('email')
                             <div class="alert alert-danger">{{ $message }}</div>
                          @enderror --}}
                        <fieldset>
                            
                           <div class="field">
                              <label class="label_field">Name</label>
                              <input type="text" name="name" placeholder="Enter Name" />
                           </div>
                           <div class="field">
                            <label class="label_field">Email Address</label>
                            <input type="email" name="email" placeholder="E-mail" />
                         </div>
                         <div class="field">
                            <label class="label_field">Mobile</label>
                            <input type="text" name="mobile" placeholder="Enter Your Number" />
                         </div>
                         <div class="field">
                              <label class="label_field">User Name</label>
                              <input type="text" name="user_name" placeholder="Enter UserName" />
                           </div>
                           {{-- <div class="field">
                            <label class="label_field">Village</label>
                            <input type="text" name="village" placeholder="Enter Village Name" />
                         </div>
                         <div class="field">
                          <label class="label_field">City</label>
                          <input type="text" name="city" placeholder="Enter Your City" />
                       </div> --}}
                       {{-- <div class="field">
                          <label class="label_field">State</label>
                          <input type="text" name="state" placeholder="Enter Your State" />
                       </div> --}}
                       {{-- <div class="field">
                            <label class="label_field">Country</label>
                            <input type="text" name="country" placeholder="Enter Country Name" />
                         </div> --}}
                         {{-- <div class="field">
                            <label class="label_field">Block</label>
                            <input type="text" name="block" placeholder="Enter Block Name" />
                         </div>
                         <div class="field">
                            <label class="label_field">Pincode</label>
                            <input type="text" name="pincode" placeholder="Enter Your Pincode" />
                         </div>
                         <div class="field">
                              <label class="label_field">Latlong</label>
                              <input type="text" name="latlong" placeholder="Enter Latlong" />
                           </div> --}}
                           <div class="field">
                              <label class="label_field">Password</label>
                              <input type="password" name="password" placeholder="Password" />
                           </div>
                           
                           <div class="field margin_0">
                              {{-- <label class="label_field hidden">hidden label</label> --}}
                              <center><button class="main_bt">Register</button></center>
                           </div>
                        </fieldset>
                     </form>
                  </div>
               </div>
            </div>
         </div>
      </div>
      <!-- jQuery -->
      <script src="{{asset('js/jquery.min.js')}}"></script>
      <script src="{{asset('js/popper.min.js')}}"></script>
      <script src="{{asset('js/bootstrap.min.js')}}"></script>
      <!-- wow animation -->
      <script src="{{asset('js/animate.js')}}"></script>
      <!-- select country -->
      <script src="{{asset('js/bootstrap-select.js')}}"></script>
      <!-- nice scrollbar -->
      <script src="{{asset('js/perfect-scrollbar.min.js')}}"></script>
      <script>
         var ps = new PerfectScrollbar('#sidebar');
      </script>
      <!-- custom js -->
      <script src="{{asset('js/custom.js')}}"></script>
   </body>
</html>