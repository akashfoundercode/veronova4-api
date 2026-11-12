@extends('admin.body.adminmaster')

@section('admin')
    <div class="full_container">
       <div class="container">
          <div class="center verticle_center full_height">
             <div class="login_section">
                <div class="logo_login">
                   <div class="center">
                    <h2 style="color: #fff;">Change Password</h2>
                      {{-- <img width="210" src="images/logo/logo.png" alt="#" /> --}}
                   </div>
                </div>
                <div class="login_form">
                   <form action="{{route('change_pass.update')}}" method="post">
					   @csrf
					    @if(session()->has('msg'))
                     <div class="alert alert-{{session('msg_class')}}">
                     {{session('msg')}}
                     </div>
                     @endif
                      <fieldset>
                         <div class="field">
                            <label class="label_field">Email</label>
                            <input type="email" name="email" placeholder="Enter Email" required/>
                         </div>
                         <div class="field">
                            <label class="label_field">Old Password</label>
                            <input type="password" name="password" placeholder="Old Password" required/>
                         </div>
                         <div class="field">
                            <label class="label_field">New Password</label>
                            <input type="password" name="npassword" placeholder="New Password" required/>
                         </div>
						  
                         {{-- <div class="field">
                            <label class="label_field hidden">hidden label</label>
                            <label class="form-check-label"><input type="checkbox" class="form-check-input"> Remember Me</label>
                            <a class="forgot" href="">Forgotten Password?</a>
                         </div> --}}
                         <div class="field margin_0">
                            <label class="label_field hidden">hidden label</label>
                            <button class="main_bt">Change Password</button>
                         </div>
                      </fieldset>
                   </form>
                </div>
             </div>
          </div>
       </div>
    </div>
    


@endsection