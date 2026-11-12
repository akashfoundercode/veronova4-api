<?php $__env->startSection('admin'); ?>
    <div class="full_container">
       <div class="container">
          <div class="center verticle_center full_height">
             <div class="login_section">
                <div class="logo_login">
                   <div class="center">
                    <h2 style="color: #fff;">Change Password</h2>
                      
                   </div>
                </div>
                <div class="login_form">
                   <form action="<?php echo e(route('change_pass.update')); ?>" method="post">
					   <?php echo csrf_field(); ?>
					    <?php if(session()->has('msg')): ?>
                     <div class="alert alert-<?php echo e(session('msg_class')); ?>">
                     <?php echo e(session('msg')); ?>

                     </div>
                     <?php endif; ?>
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
    


<?php $__env->stopSection(); ?>
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/change_password.blade.php ENDPATH**/ ?>