<?php $__env->startSection('admin'); ?>

    <style>
  @import url("https://fonts.googleapis.com/css?family=Montserrat:400,400i,700");

body {
        background-color: #111;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: montserrat;
}
.dropbtn {
        font-family: montserrat;
        background-color: #222228;
        color: white;
        padding: 5px;
        font-size: 16px;
        border: none;
        border-radius: 10px 10px 10px 10px;
        width: 100px;
        box-shadow: 0px 0px 100px rgba(190, 200, 255, 0.6);
}

/* The container <div> - needed to position the dropdown content */
.dropdown {
        color: black;
 position: relative;
        display: inline-block;
        width: 100px;
        border-radius: 10px 10px 10px 10px;
        z-index: 1;
}

.dropdown-content {
        display: none;
        position: absolute;
        background-color: #222228;
        min-width: 100px;
        z-index: 1;
        border-radius: 0px 0px 14px 14px;
        box-shadow: 0px 0px 100px rgba(190, 200, 255, 0.25);
}

.dropdown-content a {
        color: white;
        padding: 5px 8px;
        text-decoration: none;
        display: block;
        border-radius: 10px;
        margin: 2px;
}
/* Change color of dropdown links on hover */
.dropdown-content a:hover {
        background-color: #33333f;
}

/* Show the dropdown menu on hover */
.dropdown:hover .dropdown-content {
        display: block;
}

/* Change the background color of the dropdown button when the dropdown content is shown */
.dropdown:hover .dropbtn {
        background-color: #222228;
        border-radius: 10px 10px 0px 0px;
        border-bottom: none;
}

</style>

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.4.1/dist/css/bootstrap.min.css" 
integrity="sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh" crossorigin="anonymous">
<div class="container-fluid">
    <div class="row">
         <?php if($errors->has('pin')): ?>
                <span class="text-danger error-message"><?php echo e($errors->first('pin')); ?></span>
            <?php endif; ?>

            <?php if(session('error')): ?>
                <div class="alert alert-danger">
                    <?php echo e(session('error')); ?>

                </div>
            <?php endif; ?>
            <?php if(session('Success')): ?>
                <div class="alert alert-success">
                    <?php echo e(session('Success')); ?>

                </div>
            <?php endif; ?>


<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
          <div class="heading1 margin_0 d-flex">
             <h2>Withdrawl List</h2>
            <!-- <form action="<?php echo e(route('widthdrawl.all_success')); ?>" method="post">-->
            <!--     <?php echo csrf_field(); ?>-->
            <!--<button type="submit" class="btn btn-primary"  style="margin-left:550px;">All Approve</button> -->
            <!--</form>-->
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
             <table id="example" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>UserId</th>
                      <th>Beneficiary Name</th>
                      <th>INR Amount</th>
                      <th>USDT Amount</th>
                      <th>Mobile</th>
                      <th>Usdt Wallet Address</th>
                      <th>Order Id</th>
                      <th>Status</th>
                      <th>Date</th>
 </tr>
                </thead>
                <tbody>
                  <?php $__currentLoopData = $widthdrawls; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                   <tr>
                      <td><?php echo e($item->id); ?></td>
                      <td><?php echo e($item->user_id); ?></td>
                      <td><?php echo e($item->uname); ?></td>
                       <td><?php echo e($item->amount); ?></td>
                       <td><?php echo e($item->usdt_amount); ?></td>
                         <td><?php echo e($item->mobile); ?></td>   
                      <td><?php echo e($item->usdt_wallet_address); ?></td>
                      <td><?php echo e($item->order_id); ?></td>
                      <?php if($item->status==1): ?>  
<td>
  <div class="dropdown">
    <button class="dropbtn">Pending</button>
    <div class="dropdown-content">
      <a class="dropdown-item" data-toggle="modal" data-target="#exampleModalCenter3<?php echo e($item->id); ?>" style="background-color: green; color: white;">
        Approved
      </a>
      <a href="<?php echo e(route('usdt_widthdrawl.reject',$item->id)); ?>">Reject</a>
    </div>
  </div>
</td>
<?php elseif($item->status==2): ?>
<td><button class="btn btn-success">Success</button></td>
<?php elseif($item->status==3): ?>
<td><button class="btn btn-danger">Reject</button></td>
<?php else: ?>
<td></td>
<?php endif; ?>

<!-- 🔻 Always include the modal here so it's in the DOM -->
<div class="modal fade" id="exampleModalCenter3<?php echo e($item->id); ?>" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Approve Withdraw</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <form action="<?php echo e(route('usdt_widthdrawl.success', ['id' => $item->id])); ?>" method="POST">
    <?php echo csrf_field(); ?>
    <input type="hidden" name="user_id" value="<?php echo e($item->id); ?>"> 
    <div class="modal-body">
        <div class="form-group">
            <label for="pin">Please Enter Pin</label>
            <input type="number" class="form-control <?php $__errorArgs = ['pin'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?> is-invalid <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>" id="pin" name="pin" required>
            <?php $__errorArgs = ['pin'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?>
                <span class="text-danger"><?php echo e($message); ?></span>
            <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>
        </div>
        <!-- loader and success message -->
    </div>
    <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
        <button type="submit" class="btn btn-primary">Submit</button>
    </div>
</form>

        </div>
    </div>
</div>




                      <td><?php echo e($item->created_at); ?></td>
                   </tr>
                  <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                </tbody>
             </table>
          </div>
       </div>
    </div>
 </div>
</div>
</div> 

<script src="https://code.jquery.com/jquery-3.4.1.min.js" 
        integrity="sha256-CSXorXvZcTkaGRbt+3m7Yd4P6Jp6bXoL5Xg5iDxTv3s=" crossorigin="anonymous"></script>


<!--<script src="https://code.jquery.com/jquery-3.4.1.slim.min.js" -->
<!--integrity="sha384-J6qa4849blE2+poT4WnyKhv5vZF5SrPo0iEjwBvKU7imGFAV0wwj1yYfoRSJoZ+n" crossorigin="anonymous"></script>-->

<script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js" 
integrity="sha384-Q6E9RHvbIyZFJoft+2mJbHaEWldlvI9IOYy5n3zV9zzTtmI3UksdQRVvoxMfooAo" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.4.1/dist/js/bootstrap.min.js" 
integrity="sha384-wfSDF2E50Y2D1uUdj0O3uMBJnjuUD4Ih7YwaYd1iqfktj0Uod8GCExl3Og8ifwB6" crossorigin="anonymous"></script>
 <?php $__env->stopSection(); ?>
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/index.blade.php ENDPATH**/ ?>