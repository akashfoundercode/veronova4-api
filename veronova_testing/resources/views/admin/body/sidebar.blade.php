<!-- Bootstrap CSS -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<!-- Font Awesome -->
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
<style>
  /* Sidebar UI improvements */
  #sidebar {
    height: 100vh;
    overflow-y: auto;
  }
  #sidebar .components li > a {
    display: flex;
    align-items: center;
    padding: 10px 15px;
    color: #fff;
    text-decoration: none;
  }
  #sidebar .components li > a i {
    margin-right: 10px;
    min-width: 20px;
  }
  #sidebar .components ul {
    padding-left: 30px;
    background: #f9f9f9;
  }
  .collapse:not(.show) { display: none; }
  .collapse.show { display: block; }
  
  /* Active item styling */
  #sidebar .components li.active > a {
    background-color: rgba(255, 255, 255, 0.2);
    border-left: 3px solid #fff;
  }
  #sidebar .components li.active > a i {
    color: #fff;
  }
</style>

<div class="full_container">
  <div class="inner_container">
    <!-- Sidebar -->
    <nav id="sidebar">
      <div class="sidebar_blog_1">
        <div class="sidebar-header">
          <div class="logo_section">
            <a href="index.html"><img class="logo_icon img-responsive" src="images/logo/logo_icon.png" alt="Logo" /></a>
          </div>
        </div>
        <div class="sidebar_user_info">
          <div class="icon_setting"></div>
          <div class="user_profle_side">
            <div class="user_img">
              <img class="img-responsive" src="https://root.veronova.co.in/public/images/layout_img/user_img.jpg" alt="User">
            </div>
            <div class="user_info">
              <h6>Admin</h6>
              <p><span class="online_animation"></span> Online</p>
            </div>
          </div>
        </div>
      </div>
      <div class="sidebar_blog_2">
        <h4>General</h4>
        <ul class="list-unstyled components">
          <!-- Dashboard -->
          <li class="{{ Request::routeIs('dashboard') ? 'active' : '' }}"><a href="{{route('dashboard')}}"><i class="fa fa-dashboard yellow_color"></i> <span>Dashboard</span></a></li>
          <!-- Attendance -->
          <li class="{{ Request::routeIs('attendance.index') ? 'active' : '' }}"><a href="{{route('attendance.index')}}"><i class="fa fa-clock-o purple_color2"></i> <span>Attendance</span></a></li>
          <!-- Players -->
          <li class="{{ Request::routeIs('users') ? 'active' : '' }}"><a href="{{route('users')}}"><i class="fa fa-user orange_color"></i> <span>Players</span></a></li>
          <li class="{{ Request::routeIs('fund_transfer') ? 'active' : '' }}"><a href="{{route('fund_transfer')}}"><i class="fa fa-user red_color"></i> <span>Fund Transfer</span></a></li>
			 <li class="{{ Request::routeIs('vip-levels.index') ? 'active' : '' }}"><a href="{{route('vip-levels.index')}}"><i class="fa fa-user red_color"></i> <span>VIP Levels</span></a></li>
			
          
          <li class="{{ Request::routeIs('admin.illegalUsers') ? 'active' : '' }}"><a href="{{route('admin.illegalUsers')}}"><i class="fa fa-user orange_color"></i> <span>Illegal User Bet</span></a></li>
          
          <li class="{{ Request::routeIs('register.create') ? 'active' : '' }}"><a href="{{route('register.create')}}"><i class="fa fa-user orange_color"></i> <span>System User</span></a></li>
          
          <li class="{{ Request::routeIs('ip_address') ? 'active' : '' }}"><a href="{{route('ip_address')}}"><i class="fa fa-list red_color"></i> <span>Login User IP Details</span></a></li>
  
          <li class="{{ Request::routeIs('ip.logs.today') ? 'active' : '' }}"><a href="{{route('ip.logs.today')}}"><i class="fa fa-list red_color"></i> <span>Today Login IP Details</span></a></li>
  
			<li class="{{ Request::routeIs('result') && request()->route('id') == 5 ? 'active' : '' }}">
                <a href="{{route('result' , 5)}}">
                    <i class="fa fa-plane red_color"></i>
                    <span>Aviator Game</span>
                </a>
            </li>

            <li class="{{ Request::routeIs('aviator.settings') ? 'active' : '' }}">
                <a href="{{route('aviator.settings')}}">
                    <i class="fa fa-cogs yellow_color"></i>
                    <span>Aviator Settings</span>
                </a>
            </li>

			
          <!-- MLM Levels -->
          <li class="{{ Request::routeIs('mlmlevel') ? 'active' : '' }}"><a href="{{route('mlmlevel')}}"><i class="fa fa-list red_color"></i> <span>MLM Levels</span></a></li>
          <li class="{{ Request::routeIs('admin.user_salaries.index') ? 'active' : '' }}"><a href="{{route('admin.user_salaries.index')}}"><i class="fa fa-list red_color"></i> <span>Salary List</span></a></li>
            
          @php
            $firstPart = DB::select("SELECT * FROM `game_settings` LIMIT 4");
            // id = 1 waale record ko find karo
            $recordWithId1 = collect($firstPart)->firstWhere('id', 1);
          @endphp

          @if($recordWithId1)
              <li class="{{ Request::routeIs('colour_prediction') ? 'active' : '' }}">
                  <a href="{{ route('colour_prediction', $recordWithId1->id) }}">
                      <i class="fa fa-list red_color"></i>
                      <span>Colour Prediction</span>
                  </a>
              </li>
          @endif

         <!-- <li class="{{ Request::routeIs('wingo.show.form') ? 'active' : '' }}">
              <a href="{{ route('wingo.show.form') }}">
                  <i class="fas fa-dice"></i>
                  <span>Set Wingo Result</span>
              </a>
          </li>-->

          <!-- Chicken Road Game -->
          <li class="{{ Request::is('multiplier') || Request::is('bet') || Request::is('betValues') || Request::routeIs('amountSetup') ? 'active' : '' }}">
            <a href="#apps1" data-bs-toggle="collapse" data-bs-target="#apps1" aria-expanded="{{ Request::is('multiplier') || Request::is('bet') || Request::is('betValues') || Request::routeIs('amountSetup') ? 'true' : 'false' }}" class="dropdown-toggle">
              <i class="fa fa-gamepad dark_color"></i><span>Chicken Road Game</span>
            </a>
            <ul class="collapse list-unstyled {{ Request::is('multiplier') || Request::is('bet') || Request::is('betValues') || Request::routeIs('amountSetup') ? 'show' : '' }}" id="apps1">
              <li class="{{ Request::is('multiplier') ? 'active' : '' }}">
                <a href="{{ url('multiplier') }}">
                  <i class="fas fa-percentage"></i> <span>Multiplier</span>
                </a>
              </li>
              <li class="{{ Request::is('bet') ? 'active' : '' }}">
                <a href="{{ url('bet') }}">
                  <i class="fas fa-dice"></i> <span>Bet History</span>
                </a>
              </li>
              <li class="{{ Request::is('betValues') ? 'active' : '' }}">
                <a href="{{ route('betValues') }}">
                  <i class="fas fa-star"></i> <span>Bet Values</span>
                </a>
              </li>
              <li class="{{ Request::routeIs('amountSetup') ? 'active' : '' }}">
                <a href="{{ route('amountSetup') }}">
                  <i class="fas fa-rupee-sign"></i> <span>Amount Setup</span>
                </a>
              </li>
            </ul>
          </li>
			 <li class="{{ Request::routeIs('jilli-game-bets') && request()->route('id') == 5 ? 'active' : '' }}"><a href="{{route('jilli-game-bets')}}"><i class="fa fa-list red_color"></i> <span>Jilli Game Bets</span></a></li>

 
          <!--<li class="{{ Request::routeIs('result') && request()->route('id') == 5 ? 'active' : '' }}"><a href="{{route('result' , 5)}}"><i class="fa fa-list red_color"></i> <span>Aviator Game</span></a></li>-->

          <!-- Offer -->
          <li class="{{ Request::routeIs('offer') ? 'active' : '' }}"><a href="{{route('offer')}}"><i class="fa fa-bullhorn dark_color"></i> <span>Offer</span></a></li>
          <!-- Gift -->
          <li class="{{ Request::routeIs('gift') ? 'active' : '' }}"><a href="{{route('gift')}}"><i class="fa fa-gift dark_color"></i> <span>Gift</span></a></li>
          <!-- Gift Redeemed History -->
          <li class="{{ Request::routeIs('giftredeemed') ? 'active' : '' }}"><a href="{{route('giftredeemed')}}"><i class="fa fa-credit-card dark_color"></i> <span>Gift Redeemed History</span></a></li>
          <!-- Activity & Banner -->
          <li class="{{ Request::routeIs('banner') ? 'active' : '' }}"><a href="{{route('banner')}}"><i class="fa fa-picture-o dark_color"></i> <span>Activity & Banner</span></a></li>
          <!-- Feedback -->
          <li class="{{ Request::routeIs('feedback') ? 'active' : '' }}"><a href="{{route('feedback')}}"><i class="fa fa-file blue1_color"></i> <span>Feedback</span></a></li>

			<li class="{{ Request::routeIs('admin.payment_limits.index') ? 'active' : '' }}"><a href="{{route('admin.payment_limits.index')}}"><i class="fas fa-fw fa-credit-card"></i> <span>Payments Limit</span></a></li>
			
          <!-- Deposit -->
          <li class="{{ Request::routeIs('deposit') ? 'active' : '' }}">
            <a href="#app13" data-bs-toggle="collapse" data-bs-target="#app13" aria-expanded="{{ Request::routeIs('deposit') ? 'true' : 'false' }}" class="dropdown-toggle">
              <i class="fa fa-tasks green_color"></i><span>Deposit</span>
            </a>
            <ul class="collapse list-unstyled {{ Request::routeIs('deposit') ? 'show' : '' }}" id="app13">
              <li class="{{ Request::routeIs('deposit') && request()->route('status') == 1 ? 'active' : '' }}"><a href="{{ route('deposit', 1) }}">Pending</a></li>
              <li class="{{ Request::routeIs('deposit') && request()->route('status') == 2 ? 'active' : '' }}"><a href="{{ route('deposit', 2) }}">Success</a></li>
              <li class="{{ Request::routeIs('deposit') && request()->route('status') == 3 ? 'active' : '' }}"><a href="{{ route('deposit', 3) }}">Reject</a></li>
            </ul>
          </li>

          <!-- Withdrawal -->
          <li class="{{ Request::routeIs('widthdrawl') ? 'active' : '' }}">
            <a href="#app11" data-bs-toggle="collapse" data-bs-target="#app11" aria-expanded="{{ Request::routeIs('widthdrawl') ? 'true' : 'false' }}" class="dropdown-toggle">
              <i class="fa fa-wrench purple_color2"></i><span>Withdrawal</span>
            </a>
            <ul class="collapse list-unstyled {{ Request::routeIs('widthdrawl') ? 'show' : '' }}" id="app11">
              <li class="{{ Request::routeIs('widthdrawl') && request()->route('status') == 1 ? 'active' : '' }}"><a href="{{ route('widthdrawl', 1) }}">Pending</a></li>
              <li class="{{ Request::routeIs('widthdrawl') && request()->route('status') == 2 ? 'active' : '' }}"><a href="{{ route('widthdrawl', 2) }}">Approved</a></li>
              <li class="{{ Request::routeIs('widthdrawl') && request()->route('status') == 3 ? 'active' : '' }}"><a href="{{ route('widthdrawl', 3) }}">Reject</a></li>
            </ul>
          </li>

          <!-- USDT QR Code -->
          <!--<li class="{{ Request::routeIs('usdtqr') ? 'active' : '' }}"><a href="{{route('usdtqr')}}"><i class="fa fa-table purple_color2"></i> <span>USDT QR Code</span></a></li>-->

          <!--<li class="{{ Request::routeIs('bankdetails') ? 'active' : '' }}"><a href="{{route('bankdetails')}}"><i class="fa fa-table yellow_color"></i> <span>Bank Details</span></a></li>-->
          <!--<li class="{{ Request::routeIs('usdt.address') ? 'active' : '' }}"><a href="{{route('usdt.address')}}"><i class="fa fa-table purple_color2"></i> <span>USDT Bank Details</span></a></li>-->

          <!-- USDT Deposit -->
          <!--<li class="{{ Request::routeIs('usdt_deposit') ? 'active' : '' }}">-->
          <!--  <a href="#app20" data-bs-toggle="collapse" data-bs-target="#app20" aria-expanded="{{ Request::routeIs('usdt_deposit') ? 'true' : 'false' }}" class="dropdown-toggle">-->
          <!--    <i class="fa fa-tasks green_color"></i><span>USDT Deposit</span>-->
          <!--  </a>-->
          <!--  <ul class="collapse list-unstyled {{ Request::routeIs('usdt_deposit') ? 'show' : '' }}" id="app20">-->
          <!--    <li class="{{ Request::routeIs('usdt_deposit') && request()->route('status') == 1 ? 'active' : '' }}"><a href="{{ route('usdt_deposit', 1) }}">Pending</a></li>-->
          <!--    <li class="{{ Request::routeIs('usdt_deposit') && request()->route('status') == 2 ? 'active' : '' }}"><a href="{{ route('usdt_deposit', 2) }}">Success</a></li>-->
          <!--    <li class="{{ Request::routeIs('usdt_deposit') && request()->route('status') == 3 ? 'active' : '' }}"><a href="{{ route('usdt_deposit', 3) }}">Reject</a></li>-->
          <!--  </ul>-->
          <!--</li>-->

          <!-- USDT Withdrawal -->
          <!--<li class="{{ Request::routeIs('usdt_widthdrawl') ? 'active' : '' }}">-->
          <!--  <a href="#usdtWithdraw" data-bs-toggle="collapse" aria-expanded="{{ Request::routeIs('usdt_widthdrawl') ? 'true' : 'false' }}" class="dropdown-toggle">-->
          <!--    <i class="fa fa-wrench purple_color2"></i><span>USDT Withdrawal</span>-->
          <!--  </a>-->
          <!--  <ul class="collapse list-unstyled {{ Request::routeIs('usdt_widthdrawl') ? 'show' : '' }}" id="usdtWithdraw">-->
          <!--    <li class="{{ Request::routeIs('usdt_widthdrawl') && request()->route('status') == 1 ? 'active' : '' }}"><a href="{{ route('usdt_widthdrawl', 1) }}">Pending</a></li>-->
          <!--    <li class="{{ Request::routeIs('usdt_widthdrawl') && request()->route('status') == 2 ? 'active' : '' }}"><a href="{{ route('usdt_widthdrawl', 2) }}">Success</a></li>-->
          <!--    <li class="{{ Request::routeIs('usdt_widthdrawl') && request()->route('status') == 3 ? 'active' : '' }}"><a href="{{ route('usdt_widthdrawl', 3) }}">Reject</a></li>-->
          <!--  </ul>-->
          <!--</li>-->

          <li class="{{ Request::routeIs('view_bank_request') || Request::routeIs('request_change_login_password') || Request::routeIs('ifsc_modifications') || Request::routeIs('usdt.verification.list') || Request::routeIs('admin.usdt.address.verification') || Request::routeIs('bank_name_modifications') || Request::routeIs('game_issue_complaints') ? 'active' : '' }}">
            <a href="#customerService" data-bs-toggle="collapse" aria-expanded="{{ Request::routeIs('view_bank_request') || Request::routeIs('request_change_login_password') || Request::routeIs('ifsc_modifications') || Request::routeIs('usdt.verification.list') || Request::routeIs('admin.usdt.address.verification') || Request::routeIs('bank_name_modifications') || Request::routeIs('game_issue_complaints') ? 'true' : 'false' }}" class="dropdown-toggle">
              <i class="fa fa-headset text-warning"></i> <span>Customer Service</span>
            </a>
            <ul class="collapse list-unstyled {{ Request::routeIs('view_bank_request') || Request::routeIs('request_change_login_password') || Request::routeIs('ifsc_modifications') || Request::routeIs('usdt.verification.list') || Request::routeIs('admin.usdt.address.verification') || Request::routeIs('bank_name_modifications') || Request::routeIs('game_issue_complaints') ? 'show' : '' }}" id="customerService">
              <li class="{{ Request::routeIs('view_bank_request') ? 'active' : '' }}">
                <a href="{{ route('view_bank_request') }}">
                  <i class="fa fa-university text-primary me-1"></i> View Bank Request
                </a>
              </li>
              <li class="{{ Request::routeIs('request_change_login_password') ? 'active' : '' }}">
                <a href="{{ route('request_change_login_password') }}">
                  <i class="fa fa-key text-danger me-1"></i> Change Login Password
                </a>
              </li>
              <li class="{{ Request::routeIs('ifsc_modifications') ? 'active' : '' }}">
                <a href="{{ route('ifsc_modifications') }}">
                  <i class="fa fa-edit text-success me-1"></i> IFSC Modifications
                </a>
              </li>
              <li class="{{ Request::routeIs('usdt.verification.list') ? 'active' : '' }}">
                <a href="{{ route('usdt.verification.list', 1) }}">
                  <i class="fa fa-id-card text-info me-1"></i> Indian/Non-Indian Verification
                </a>
              </li>
              <li class="{{ Request::routeIs('admin.usdt.address.verification') ? 'active' : '' }}">
                <a href="{{ route('admin.usdt.address.verification') }}">
                  <i class="fa fa-trash text-danger me-1"></i> Delete Old USDT
                </a>
              </li>
              <li class="{{ Request::routeIs('bank_name_modifications') ? 'active' : '' }}">
                <a href="{{ route('bank_name_modifications') }}">
                  <i class="fa fa-pen text-secondary me-1"></i> Bank Name Modifications
                </a>
              </li>
              <li class="{{ Request::routeIs('game_issue_complaints') ? 'active' : '' }}">
                <a href="{{ route('game_issue_complaints') }}">
                  <i class="fa fa-info-circle red_color"></i>Game Issue Complaints
                </a>
              </li>
            </ul>
          </li>

          <!-- Notice -->
          <li class="{{ Request::routeIs('admin_details') ? 'active' : '' }}"><a href="{{route('admin_details')}}"><i class="fa fa-bell yellow_color"></i> <span>Profit/Loss-Admin Details</span></a></li>
          <!--<li class="{{ Request::routeIs('notification') ? 'active' : '' }}"><a href="{{route('notification')}}"><i class="fa fa-bell yellow_color"></i> <span>Notice</span></a></li>-->
          <!-- Setting -->
          <!--<li class="{{ Request::routeIs('setting') ? 'active' : '' }}"><a href="{{route('setting')}}"><i class="fa fa-cogs dark_color"></i> <span>Setting</span></a></li>-->
          <!-- Support Setting -->
          <li class="{{ Request::routeIs('support_setting') ? 'active' : '' }}"><a href="{{route('support_setting')}}"><i class="fa fa-info-circle yellow_color"></i> <span>Support Setting</span></a></li>
          <!-- Change Password -->
         <!-- <li class="{{ Request::routeIs('change_password') ? 'active' : '' }}"><a href="{{route('change_password')}}"><i class="fa fa-warning red_color"></i> <span>Change Password</span></a></li>-->
          <!-- Logout -->
          <li><a href="{{route('auth.logout')}}"><i class="fa fa-sign-out-alt yellow_color"></i> <span>Logout</span></a></li>
        </ul>
      </div>
    </nav>
    <!-- end sidebar -->
  </div>
</div>

<!-- Bootstrap JS -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script>
  // Scroll to active item on page load
  document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const activeItem = sidebar.querySelector('.components li.active');
    
    if (activeItem) {
      // Scroll the active item into view
      activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Keep the sidebar scrolled to this position even if content changes
      sidebar.addEventListener('scroll', function() {
        localStorage.setItem('sidebarScrollPosition', sidebar.scrollTop);
      });
      
      // Restore scroll position if it exists
      const savedPosition = localStorage.getItem('sidebarScrollPosition');
      if (savedPosition) {
        sidebar.scrollTop = savedPosition;
      }
    }
  });
</script>