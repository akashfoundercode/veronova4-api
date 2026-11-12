<?php $__env->startSection('admin'); ?>

<div class="container-fluid">
    <div class="row">
        <div class="col-md-12">
            <?php if(session('message')): ?>
    <div class="alert alert-success mt-2">
        <?php echo e(session('message')); ?>

    </div>
<?php endif; ?>

<?php if(session('error')): ?>
    <div class="alert alert-danger mt-2">
        <?php echo e(session('error')); ?>

    </div>
<?php endif; ?>

            <div class="white_shd full margin_bottom_30">
                <div class="full graph_head">
                    <div class="heading1 margin_0 d-flex">
                        <h2>Bank Details List</h2>
                    </div>
                </div>
                <div class="table_section padding_infor_info">
                    <div class="table-responsive-sm">
                        <table id="example" class="table table-striped" style="width:100%">
                            <thead class="thead-dark">
                                <tr>
                                    <th>Id</th>
                                    <th>Name</th>
                                    <!--<th>Mobile</th>-->
                                    <th>Account Number</th>
                                    <th>Branch</th>
                                    <th>Bank Name</th>
                                    <th>IFSC Code</th>
                                    <th>UPI Id</th>
                                    <th>Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php $__currentLoopData = $bank_details; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                    <tr>
                                        <td><?php echo e($item->id); ?></td>
                                        <td><?php echo e($item->name); ?></td>
                                       <!-- <td><?php echo e($item->mobile); ?></td>-->
                                        <td><?php echo e($item->account_number); ?></td>
                                        <td><?php echo e($item->branch); ?></td>
                                        <td><?php echo e($item->bank_name); ?></td>
                                        <td><?php echo e($item->ifsc_code); ?></td>
                                        <td><?php echo e($item->upi_id); ?></td>
                                        <td><?php echo e($item->created_at); ?></td>
                                         <td>
                                            <i class="fa fa-edit mt-1" data-toggle="modal" data-target="#exampleModalCenterupdate1<?php echo e($item->id); ?>" style="font-size:30px"></i>
                                              <div class="modal fade" id="exampleModalCenterupdate1<?php echo e($item->id); ?>" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                          <div class="modal-content">
                            <div class="modal-header">
                              <h5 class="modal-title" id="exampleModalLongTitle">Edit Bank Details</h5>
                              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                              </button>
                            </div>
                            <form action="<?php echo e(route('edit_bank_details')); ?>" method="post" enctype="multipart/form-data">
                              <?php echo csrf_field(); ?>
                            <div class="modal-body">
                              <div class="container-fluid">
                                <div class="row">
                                  <div class="form-group col-md-12">
                                    <label for="accumulated_amount">Name</label>
                                     <input type="hidden" class="form-control" id="accumulated_amount" name="id" value="<?php echo e($item->id); ?>" placeholder="Enter name">
                                    <input type="text" class="form-control" id="accumulated_amount" name="name" value="<?php echo e($item->name); ?>" placeholder="Enter name">
                                   
                                    <?php $__errorArgs = ['name'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?>
                                        <div class="alert alert-danger"><?php echo e($message); ?></div>
                                    <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>
                                  </div>
                                    <div class="form-group col-md-12">
                                    <label for="accumulated_amount">Account</label>
                                    <input type="text" class="form-control" id="accumulated_amount" name="account_number" value="<?php echo e($item->account_number); ?>" placeholder="Enter account_number">
                                    <?php $__errorArgs = ['account_number'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?>
                                        <div class="alert alert-danger"><?php echo e($message); ?></div>
                                    <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>
                                  </div>
                                    <div class="form-group col-md-12">
                                    <label for="accumulated_amount">Branch</label>
                                    <input type="text" class="form-control" id="accumulated_amount" name="branch" value="<?php echo e($item->branch); ?>" placeholder="Enter name">
                                    <?php $__errorArgs = ['branch'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?>
                                        <div class="alert alert-danger"><?php echo e($message); ?></div>
                                    <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>
                                  </div>
                                  <div class="form-group col-md-12">
                                    <label for="amount">Bank Name</label>
                                    <input type="text" class="form-control" id="amount" name="bank_name" value="<?php echo e($item->bank_name); ?>" placeholder="Enter bank name">
                                    <?php $__errorArgs = ['bank_name'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?>
                                        <div class="alert alert-danger"><?php echo e($message); ?></div>
                                    <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>
                                  </div>
                                   <div class="form-group col-md-12">
                                    <label for="amount">IFSC Code</label>
                                    <input type="text" class="form-control" id="amount" name="ifsc_code" value="<?php echo e($item->ifsc_code); ?>" placeholder="Enter ifsc code">
                                    <?php $__errorArgs = ['ifsc_code'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?>
                                        <div class="alert alert-danger"><?php echo e($message); ?></div>
                                    <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>
                                  </div>
                                     <div class="form-group col-md-12">
                                    <label for="upi">UPI Id</label>
                                    <input type="text" class="form-control" id="upi" name="upi_id" value="<?php echo e($item->upi_id); ?>" placeholder="Enter upi id">
                                    <?php $__errorArgs = ['upi_id'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?>
                                        <div class="alert alert-danger"><?php echo e($message); ?></div>
                                    <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>
                                  </div>
                                 
                                
                            <div class="modal-footer">
                              <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                              <button type="submit" class="btn btn-primary">Submit</button>
                            </div>
                            </form>
                            
                          </div>
                        </div>
                      </div>
                   </tr>
                  <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                </tbody>
             </table>
          </div>
       </div>
    </div>
                                          </td>
                                    </tr>
                         
            </div>
        </div>
    </div> 
</div>

<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/bank_details/index.blade.php ENDPATH**/ ?>