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
          <li class="<?php echo e(Request::routeIs('dashboard') ? 'active' : ''); ?>"><a href="<?php echo e(route('dashboard')); ?>"><i class="fa fa-dashboard yellow_color"></i> <span>Dashboard</span></a></li>
          <!-- Attendance -->
          <li class="<?php echo e(Request::routeIs('attendance.index') ? 'active' : ''); ?>"><a href="<?php echo e(route('attendance.index')); ?>"><i class="fa fa-clock-o purple_color2"></i> <span>Attendance</span></a></li>
          <!-- Players -->
          <li class="<?php echo e(Request::routeIs('users') ? 'active' : ''); ?>"><a href="<?php echo e(route('users')); ?>"><i class="fa fa-user orange_color"></i> <span>Players</span></a></li>
          <li class="<?php echo e(Request::routeIs('fund_transfer') ? 'active' : ''); ?>"><a href="<?php echo e(route('fund_transfer')); ?>"><i class="fa fa-user red_color"></i> <span>Fund Transfer</span></a></li>
			 <li class="<?php echo e(Request::routeIs('vip-levels.index') ? 'active' : ''); ?>"><a href="<?php echo e(route('vip-levels.index')); ?>"><i class="fa fa-user red_color"></i> <span>VIP Levels</span></a></li>
			
          
          <li class="<?php echo e(Request::routeIs('admin.illegalUsers') ? 'active' : ''); ?>"><a href="<?php echo e(route('admin.illegalUsers')); ?>"><i class="fa fa-user orange_color"></i> <span>Illegal User Bet</span></a></li>
          
          <li class="<?php echo e(Request::routeIs('register.create') ? 'active' : ''); ?>"><a href="<?php echo e(route('register.create')); ?>"><i class="fa fa-user orange_color"></i> <span>System User</span></a></li>
          
          <li class="<?php echo e(Request::routeIs('ip_address') ? 'active' : ''); ?>"><a href="<?php echo e(route('ip_address')); ?>"><i class="fa fa-list red_color"></i> <span>Login User IP Details</span></a></li>
  
          <li class="<?php echo e(Request::routeIs('ip.logs.today') ? 'active' : ''); ?>"><a href="<?php echo e(route('ip.logs.today')); ?>"><i class="fa fa-list red_color"></i> <span>Today Login IP Details</span></a></li>
  
			<li class="<?php echo e(Request::routeIs('result') && request()->route('id') == 5 ? 'active' : ''); ?>">
                <a href="<?php echo e(route('result' , 5)); ?>">
                    <i class="fa fa-plane red_color"></i>
                    <span>Aviator Game</span>
                </a>
            </li>

            <li class="<?php echo e(Request::routeIs('aviator.settings') ? 'active' : ''); ?>">
                <a href="<?php echo e(route('aviator.settings')); ?>">
                    <i class="fa fa-cogs yellow_color"></i>
                    <span>Aviator Settings</span>
                </a>
            </li>

			
          <!-- MLM Levels -->
          <li class="<?php echo e(Request::routeIs('mlmlevel') ? 'active' : ''); ?>"><a href="<?php echo e(route('mlmlevel')); ?>"><i class="fa fa-list red_color"></i> <span>MLM Levels</span></a></li>
          <li class="<?php echo e(Request::routeIs('admin.user_salaries.index') ? 'active' : ''); ?>"><a href="<?php echo e(route('admin.user_salaries.index')); ?>"><i class="fa fa-list red_color"></i> <span>Salary List</span></a></li>
            
          <?php
            $firstPart = DB::select("SELECT * FROM `game_settings` LIMIT 4");
            // id = 1 waale record ko find karo
            $recordWithId1 = collect($firstPart)->firstWhere('id', 1);
          ?>

          <?php if($recordWithId1): ?>
              <li class="<?php echo e(Request::routeIs('colour_prediction') ? 'active' : ''); ?>">
                  <a href="<?php echo e(route('colour_prediction', $recordWithId1->id)); ?>">
                      <i class="fa fa-list red_color"></i>
                      <span>Colour Prediction</span>
                  </a>
              </li>
          <?php endif; ?>

         <!-- <li class="<?php echo e(Request::routeIs('wingo.show.form') ? 'active' : ''); ?>">
              <a href="<?php echo e(route('wingo.show.form')); ?>">
                  <i class="fas fa-dice"></i>
                  <span>Set Wingo Result</span>
              </a>
          </li>-->

          <!-- Chicken Road Game -->
          <li class="<?php echo e(Request::is('multiplier') || Request::is('bet') || Request::is('betValues') || Request::routeIs('amountSetup') ? 'active' : ''); ?>">
            <a href="#apps1" data-bs-toggle="collapse" data-bs-target="#apps1" aria-expanded="<?php echo e(Request::is('multiplier') || Request::is('bet') || Request::is('betValues') || Request::routeIs('amountSetup') ? 'true' : 'false'); ?>" class="dropdown-toggle">
              <i class="fa fa-gamepad dark_color"></i><span>Chicken Road Game</span>
            </a>
            <ul class="collapse list-unstyled <?php echo e(Request::is('multiplier') || Request::is('bet') || Request::is('betValues') || Request::routeIs('amountSetup') ? 'show' : ''); ?>" id="apps1">
              <li class="<?php echo e(Request::is('multiplier') ? 'active' : ''); ?>">
                <a href="<?php echo e(url('multiplier')); ?>">
                  <i class="fas fa-percentage"></i> <span>Multiplier</span>
                </a>
              </li>
              <li class="<?php echo e(Request::is('bet') ? 'active' : ''); ?>">
                <a href="<?php echo e(url('bet')); ?>">
                  <i class="fas fa-dice"></i> <span>Bet History</span>
                </a>
              </li>
              <li class="<?php echo e(Request::is('betValues') ? 'active' : ''); ?>">
                <a href="<?php echo e(route('betValues')); ?>">
                  <i class="fas fa-star"></i> <span>Bet Values</span>
                </a>
              </li>
              <li class="<?php echo e(Request::routeIs('amountSetup') ? 'active' : ''); ?>">
                <a href="<?php echo e(route('amountSetup')); ?>">
                  <i class="fas fa-rupee-sign"></i> <span>Amount Setup</span>
                </a>
              </li>
            </ul>
          </li>
			 <li class="<?php echo e(Request::routeIs('jilli-game-bets') && request()->route('id') == 5 ? 'active' : ''); ?>"><a href="<?php echo e(route('jilli-game-bets')); ?>"><i class="fa fa-list red_color"></i> <span>Jilli Game Bets</span></a></li>

 
          <!--<li class="<?php echo e(Request::routeIs('result') && request()->route('id') == 5 ? 'active' : ''); ?>"><a href="<?php echo e(route('result' , 5)); ?>"><i class="fa fa-list red_color"></i> <span>Aviator Game</span></a></li>-->

          <!-- Offer -->
          <li class="<?php echo e(Request::routeIs('offer') ? 'active' : ''); ?>"><a href="<?php echo e(route('offer')); ?>"><i class="fa fa-bullhorn dark_color"></i> <span>Offer</span></a></li>
          <!-- Gift -->
          <li class="<?php echo e(Request::routeIs('gift') ? 'active' : ''); ?>"><a href="<?php echo e(route('gift')); ?>"><i class="fa fa-gift dark_color"></i> <span>Gift</span></a></li>
          <!-- Gift Redeemed History -->
          <li class="<?php echo e(Request::routeIs('giftredeemed') ? 'active' : ''); ?>"><a href="<?php echo e(route('giftredeemed')); ?>"><i class="fa fa-credit-card dark_color"></i> <span>Gift Redeemed History</span></a></li>
          <!-- Activity & Banner -->
          <li class="<?php echo e(Request::routeIs('banner') ? 'active' : ''); ?>"><a href="<?php echo e(route('banner')); ?>"><i class="fa fa-picture-o dark_color"></i> <span>Activity & Banner</span></a></li>
          <!-- Feedback -->
          <li class="<?php echo e(Request::routeIs('feedback') ? 'active' : ''); ?>"><a href="<?php echo e(route('feedback')); ?>"><i class="fa fa-file blue1_color"></i> <span>Feedback</span></a></li>

			<li class="<?php echo e(Request::routeIs('admin.payment_limits.index') ? 'active' : ''); ?>"><a href="<?php echo e(route('admin.payment_limits.index')); ?>"><i class="fas fa-fw fa-credit-card"></i> <span>Payments Limit</span></a></li>
			
          <!-- Deposit -->
          <li class="<?php echo e(Request::routeIs('deposit') ? 'active' : ''); ?>">
            <a href="#app13" data-bs-toggle="collapse" data-bs-target="#app13" aria-expanded="<?php echo e(Request::routeIs('deposit') ? 'true' : 'false'); ?>" class="dropdown-toggle">
              <i class="fa fa-tasks green_color"></i><span>Deposit</span>
            </a>
            <ul class="collapse list-unstyled <?php echo e(Request::routeIs('deposit') ? 'show' : ''); ?>" id="app13">
              <li class="<?php echo e(Request::routeIs('deposit') && request()->route('status') == 1 ? 'active' : ''); ?>"><a href="<?php echo e(route('deposit', 1)); ?>">Pending</a></li>
              <li class="<?php echo e(Request::routeIs('deposit') && request()->route('status') == 2 ? 'active' : ''); ?>"><a href="<?php echo e(route('deposit', 2)); ?>">Success</a></li>
              <li class="<?php echo e(Request::routeIs('deposit') && request()->route('status') == 3 ? 'active' : ''); ?>"><a href="<?php echo e(route('deposit', 3)); ?>">Reject</a></li>
            </ul>
          </li>

          <!-- Withdrawal -->
          <li class="<?php echo e(Request::routeIs('widthdrawl') ? 'active' : ''); ?>">
            <a href="#app11" data-bs-toggle="collapse" data-bs-target="#app11" aria-expanded="<?php echo e(Request::routeIs('widthdrawl') ? 'true' : 'false'); ?>" class="dropdown-toggle">
              <i class="fa fa-wrench purple_color2"></i><span>Withdrawal</span>
            </a>
            <ul class="collapse list-unstyled <?php echo e(Request::routeIs('widthdrawl') ? 'show' : ''); ?>" id="app11">
              <li class="<?php echo e(Request::routeIs('widthdrawl') && request()->route('status') == 1 ? 'active' : ''); ?>"><a href="<?php echo e(route('widthdrawl', 1)); ?>">Pending</a></li>
              <li class="<?php echo e(Request::routeIs('widthdrawl') && request()->route('status') == 2 ? 'active' : ''); ?>"><a href="<?php echo e(route('widthdrawl', 2)); ?>">Approved</a></li>
              <li class="<?php echo e(Request::routeIs('widthdrawl') && request()->route('status') == 3 ? 'active' : ''); ?>"><a href="<?php echo e(route('widthdrawl', 3)); ?>">Reject</a></li>
            </ul>
          </li>

          <!-- USDT QR Code -->
          <!--<li class="<?php echo e(Request::routeIs('usdtqr') ? 'active' : ''); ?>"><a href="<?php echo e(route('usdtqr')); ?>"><i class="fa fa-table purple_color2"></i> <span>USDT QR Code</span></a></li>-->

          <!--<li class="<?php echo e(Request::routeIs('bankdetails') ? 'active' : ''); ?>"><a href="<?php echo e(route('bankdetails')); ?>"><i class="fa fa-table yellow_color"></i> <span>Bank Details</span></a></li>-->
          <!--<li class="<?php echo e(Request::routeIs('usdt.address') ? 'active' : ''); ?>"><a href="<?php echo e(route('usdt.address')); ?>"><i class="fa fa-table purple_color2"></i> <span>USDT Bank Details</span></a></li>-->

          <!-- USDT Deposit -->
          <!--<li class="<?php echo e(Request::routeIs('usdt_deposit') ? 'active' : ''); ?>">-->
          <!--  <a href="#app20" data-bs-toggle="collapse" data-bs-target="#app20" aria-expanded="<?php echo e(Request::routeIs('usdt_deposit') ? 'true' : 'false'); ?>" class="dropdown-toggle">-->
          <!--    <i class="fa fa-tasks green_color"></i><span>USDT Deposit</span>-->
          <!--  </a>-->
          <!--  <ul class="collapse list-unstyled <?php echo e(Request::routeIs('usdt_deposit') ? 'show' : ''); ?>" id="app20">-->
          <!--    <li class="<?php echo e(Request::routeIs('usdt_deposit') && request()->route('status') == 1 ? 'active' : ''); ?>"><a href="<?php echo e(route('usdt_deposit', 1)); ?>">Pending</a></li>-->
          <!--    <li class="<?php echo e(Request::routeIs('usdt_deposit') && request()->route('status') == 2 ? 'active' : ''); ?>"><a href="<?php echo e(route('usdt_deposit', 2)); ?>">Success</a></li>-->
          <!--    <li class="<?php echo e(Request::routeIs('usdt_deposit') && request()->route('status') == 3 ? 'active' : ''); ?>"><a href="<?php echo e(route('usdt_deposit', 3)); ?>">Reject</a></li>-->
          <!--  </ul>-->
          <!--</li>-->

          <!-- USDT Withdrawal -->
          <!--<li class="<?php echo e(Request::routeIs('usdt_widthdrawl') ? 'active' : ''); ?>">-->
          <!--  <a href="#usdtWithdraw" data-bs-toggle="collapse" aria-expanded="<?php echo e(Request::routeIs('usdt_widthdrawl') ? 'true' : 'false'); ?>" class="dropdown-toggle">-->
          <!--    <i class="fa fa-wrench purple_color2"></i><span>USDT Withdrawal</span>-->
          <!--  </a>-->
          <!--  <ul class="collapse list-unstyled <?php echo e(Request::routeIs('usdt_widthdrawl') ? 'show' : ''); ?>" id="usdtWithdraw">-->
          <!--    <li class="<?php echo e(Request::routeIs('usdt_widthdrawl') && request()->route('status') == 1 ? 'active' : ''); ?>"><a href="<?php echo e(route('usdt_widthdrawl', 1)); ?>">Pending</a></li>-->
          <!--    <li class="<?php echo e(Request::routeIs('usdt_widthdrawl') && request()->route('status') == 2 ? 'active' : ''); ?>"><a href="<?php echo e(route('usdt_widthdrawl', 2)); ?>">Success</a></li>-->
          <!--    <li class="<?php echo e(Request::routeIs('usdt_widthdrawl') && request()->route('status') == 3 ? 'active' : ''); ?>"><a href="<?php echo e(route('usdt_widthdrawl', 3)); ?>">Reject</a></li>-->
          <!--  </ul>-->
          <!--</li>-->

          <li class="<?php echo e(Request::routeIs('view_bank_request') || Request::routeIs('request_change_login_password') || Request::routeIs('ifsc_modifications') || Request::routeIs('usdt.verification.list') || Request::routeIs('admin.usdt.address.verification') || Request::routeIs('bank_name_modifications') || Request::routeIs('game_issue_complaints') ? 'active' : ''); ?>">
            <a href="#customerService" data-bs-toggle="collapse" aria-expanded="<?php echo e(Request::routeIs('view_bank_request') || Request::routeIs('request_change_login_password') || Request::routeIs('ifsc_modifications') || Request::routeIs('usdt.verification.list') || Request::routeIs('admin.usdt.address.verification') || Request::routeIs('bank_name_modifications') || Request::routeIs('game_issue_complaints') ? 'true' : 'false'); ?>" class="dropdown-toggle">
              <i class="fa fa-headset text-warning"></i> <span>Customer Service</span>
            </a>
            <ul class="collapse list-unstyled <?php echo e(Request::routeIs('view_bank_request') || Request::routeIs('request_change_login_password') || Request::routeIs('ifsc_modifications') || Request::routeIs('usdt.verification.list') || Request::routeIs('admin.usdt.address.verification') || Request::routeIs('bank_name_modifications') || Request::routeIs('game_issue_complaints') ? 'show' : ''); ?>" id="customerService">
              <li class="<?php echo e(Request::routeIs('view_bank_request') ? 'active' : ''); ?>">
                <a href="<?php echo e(route('view_bank_request')); ?>">
                  <i class="fa fa-university text-primary me-1"></i> View Bank Request
                </a>
              </li>
              <li class="<?php echo e(Request::routeIs('request_change_login_password') ? 'active' : ''); ?>">
                <a href="<?php echo e(route('request_change_login_password')); ?>">
                  <i class="fa fa-key text-danger me-1"></i> Change Login Password
                </a>
              </li>
              <li class="<?php echo e(Request::routeIs('ifsc_modifications') ? 'active' : ''); ?>">
                <a href="<?php echo e(route('ifsc_modifications')); ?>">
                  <i class="fa fa-edit text-success me-1"></i> IFSC Modifications
                </a>
              </li>
              <li class="<?php echo e(Request::routeIs('usdt.verification.list') ? 'active' : ''); ?>">
                <a href="<?php echo e(route('usdt.verification.list', 1)); ?>">
                  <i class="fa fa-id-card text-info me-1"></i> Indian/Non-Indian Verification
                </a>
              </li>
              <li class="<?php echo e(Request::routeIs('admin.usdt.address.verification') ? 'active' : ''); ?>">
                <a href="<?php echo e(route('admin.usdt.address.verification')); ?>">
                  <i class="fa fa-trash text-danger me-1"></i> Delete Old USDT
                </a>
              </li>
              <li class="<?php echo e(Request::routeIs('bank_name_modifications') ? 'active' : ''); ?>">
                <a href="<?php echo e(route('bank_name_modifications')); ?>">
                  <i class="fa fa-pen text-secondary me-1"></i> Bank Name Modifications
                </a>
              </li>
              <li class="<?php echo e(Request::routeIs('game_issue_complaints') ? 'active' : ''); ?>">
                <a href="<?php echo e(route('game_issue_complaints')); ?>">
                  <i class="fa fa-info-circle red_color"></i>Game Issue Complaints
                </a>
              </li>
            </ul>
          </li>

          <!-- Notice -->
          <li class="<?php echo e(Request::routeIs('admin_details') ? 'active' : ''); ?>"><a href="<?php echo e(route('admin_details')); ?>"><i class="fa fa-bell yellow_color"></i> <span>Profit/Loss-Admin Details</span></a></li>
          <!--<li class="<?php echo e(Request::routeIs('notification') ? 'active' : ''); ?>"><a href="<?php echo e(route('notification')); ?>"><i class="fa fa-bell yellow_color"></i> <span>Notice</span></a></li>-->
          <!-- Setting -->
          <!--<li class="<?php echo e(Request::routeIs('setting') ? 'active' : ''); ?>"><a href="<?php echo e(route('setting')); ?>"><i class="fa fa-cogs dark_color"></i> <span>Setting</span></a></li>-->
          <!-- Support Setting -->
          <li class="<?php echo e(Request::routeIs('support_setting') ? 'active' : ''); ?>"><a href="<?php echo e(route('support_setting')); ?>"><i class="fa fa-info-circle yellow_color"></i> <span>Support Setting</span></a></li>
          <!-- Change Password -->
         <!-- <li class="<?php echo e(Request::routeIs('change_password') ? 'active' : ''); ?>"><a href="<?php echo e(route('change_password')); ?>"><i class="fa fa-warning red_color"></i> <span>Change Password</span></a></li>-->
          <!-- Logout -->
          <li><a href="<?php echo e(route('auth.logout')); ?>"><i class="fa fa-sign-out-alt yellow_color"></i> <span>Logout</span></a></li>
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
</script><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/admin/body/sidebar.blade.php ENDPATH**/ ?>