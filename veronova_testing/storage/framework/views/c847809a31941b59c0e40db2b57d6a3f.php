<?php $__env->startSection('admin'); ?>

<style>
    .btn-group .btn {
        margin-right: 5px; /* Add spacing between buttons */
    }

    .btn-group .btn:last-child {
        margin-right: 0; /* Remove right margin from the last button */
    }

    .btn-group {
        display: flex; /* Flexbox for alignment */
        justify-content: center; /* Center buttons if needed */
        align-items: center;
    }
</style>
 <style>
 th{
    white-space: nowrap; 
  
    text-overflow: ellipsis;
}
  </style>

<div class="container-fluid">
    <div class="row">
        <!-- Display Flash Message -->


        <div class="col-md-12">
            <?php if(session('success')): ?>
    <div class="alert alert-success">
        <?php echo e(session('success')); ?>

    </div>
<?php endif; ?>
            <div class="white_shd full margin_bottom_30">
                <div class="full graph_head">
                    <div class="heading1 margin_0 d-flex">
                        <h2>User List</h2>
                    </div>
                </div>
                <div class="table_section padding_infor_info">
                    <div class="table-responsive-sm">
                        <table id="example" class="table table-striped" style="width:100%">
                            <thead class="thead-dark">
                                <tr>
                                    <th>Id</th>
                                    <th>user_id</th>
                                    <th>User_name</th>
                                    <!--<th>Email</th>-->
                                    <th>Mobile</th>
                                    <th>Sponser</th>
                                    <th>Sponser Id</th>
                                    <th>Wallet</th>
                                    <th>Winning_Wallet</th>
                                    <th>Commission</th>
                                    <th>Bonus</th>
                                    <th>Turn Over</th>
                                    <th>Today TurnOver</th>
                                    <th>Bet Amount</th>
                                    <th>Password</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                    <th>filterSubordinateData</th>
                                    <th>ViewMoreDetails</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php $__currentLoopData = $users; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                    <tr>
                                        <td><?php echo e($item->id); ?></td>
                                        <td><?php echo e($item->u_id); ?></td>
                                        <td><?php echo e($item->username); ?></td>
                                        <!--<td><?php echo e($item->email); ?></td>-->
                                        <td><?php echo e($item->mobile); ?></td>
                                        <td><?php echo e($item->sname); ?></td>
                                
                                        <td>
                                              <?php echo e($item->referral_user_id); ?>

                                            <i class="fa fa-edit mt-1 ml-3" data-toggle="modal" data-target="#editReferralModal<?php echo e($item->id); ?>" style="font-size:20px"></i>
                                            <!-- Modal -->
                                            <div class="modal fade" id="editReferralModal<?php echo e($item->id); ?>" tabindex="-1" role="dialog" aria-hidden="true">
                                                <div class="modal-dialog modal-sm modal-dialog-centered" role="document"> <!-- Added modal-dialog-centered -->
                                                    <div class="modal-content">
                                                        <form action="<?php echo e(route('referral.update', $item->id)); ?>" method="post">
                                                            <?php echo csrf_field(); ?>
                                                            <div class="modal-header">
                                                                <h5 class="modal-title">Edit Sponser ID</h5>
                                                                <button type="button" class="close" data-dismiss="modal">&times;</button>
                                                            </div>
                                                            <div class="modal-body">
                                                                <input type="text" class="form-control" name="referral_user_id" value="<?php echo e($item->referral_user_id); ?>">
                                                            </div>
                                                            <div class="modal-footer">
                                                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                                                                <button type="submit" class="btn btn-primary">Save</button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td class="">
                                            <?php echo e($item->wallet); ?>

                                            <div class="btn-group" role="group" aria-label="Wallet actions">
                                                <!-- Add Funds Button -->
                                                <button type="button" class="btn btn-info btn-sm" data-toggle="modal" data-target="#exampleModalCenter<?php echo e($item->id); ?>" title="Add Funds">
                                                    <i class="fa fa-plus" style="font-size:20px"></i>
                                                </button>
                                                <!-- Subtract Funds Button -->
                                                <button type="button" class="btn btn-danger btn-sm" data-toggle="modal" data-target="#subtractWalletModal<?php echo e($item->id); ?>" title="Subtract Funds">
                                                    <i class="fa fa-minus" style="font-size:20px"></i>
                                                </button>
                                            </div>
                                        </td>
                                        <td><?php echo e($item->winning_wallet); ?></td>
                                        <td><?php echo e($item->commission); ?></td>
                                        <td><?php echo e($item->bonus); ?></td>
                                        <td><?php echo e($item->turnover); ?></td>
                                        <td><?php echo e($item->today_turnover); ?></td>
                                        <td class="">
                                            <?php echo e($item->recharge); ?>

                                            <div class="btn-group" role="group" aria-label="Wallet actions">
                                                <!-- Add Funds Button -->
                                                <button type="button" class="btn btn-info btn-sm" data-toggle="modal" data-target="#exampleBetamountModalCenter<?php echo e($item->id); ?>" title="Add Funds">
                                                    <i class="fa fa-plus" style="font-size:20px"></i>
                                                </button>
                                                <!-- Subtract Funds Button -->
                                                <button type="button" class="btn btn-danger btn-sm" data-toggle="modal" data-target="#subtractBetamountModal<?php echo e($item->id); ?>" title="Subtract Funds">
                                                    <i class="fa fa-minus" style="font-size:20px"></i>
                                                </button>
                                            </div>
                                        </td>
                                        <td><?php echo e($item->password); ?>

                                        <i class="fa fa-edit mt-1 ml-3" data-toggle="modal"
                                            data-target="#exampleModalCenterupdate1<?php echo e($item->id); ?>"
                                            style="font-size:20px"></i>

                                        <div class="modal fade" id="exampleModalCenterupdate1<?php echo e($item->id); ?>"
                                            tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
                                            aria-hidden="true">
                                            <div class="modal-dialog modal-dialog-centered" role="document">
                                                <div class="modal-content">
                                                    <div class="modal-header">
                                                        <h5 class="modal-title" id="exampleModalLongTitle">Change
                                                            Password</h5>
                                                        <button type="button" class="close" data-dismiss="modal"
                                                            aria-label="Close">
                                                            <span aria-hidden="true">&times;</span>
                                                        </button>
                                                    </div>
                                                    <form action="<?php echo e(route('password.update',$item->id)); ?>" method="post"
                                                        enctype="multipart/form-data">
                                                        <?php echo csrf_field(); ?>
                                                        <div class="modal-body">
                                                            <div class="container-fluid">
                                                                <div class="row">
                                                                    <div class="form-group col-md-6">
                                                                        <label for="wallet">Change Password</label>
                                                                        <input type="text" class="form-control" id=""
                                                                            name="password" value="<?php echo e($item->password); ?>"
                                                                            placeholder="Enter Password">
                                                                        <?php $__errorArgs = ['password'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?>
                                                                        <div class="alert alert-danger"><?php echo e($message); ?>

                                                                        </div>
                                                                        <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>
                                                                    </div>
                                                                    <?php

                                                                    $user =
                                                                    DB::table('users')->whereNull('email')->whereNull('password')->where('id',
                                                                    $item->id)->first();
                                                                    ?>

                                                                    <?php if($user): ?>
                                                                    <div class="form-group col-md-6">
                                                                        <label for="wallet">Sponser mobile no </label>
                                                                        <input type="text" class="form-control" id=""
                                                                            name="sponser_mobile"
                                                                            placeholder="Enter Sponser mobile">
                                                                        <?php $__errorArgs = ['sponser_mobile'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?>
                                                                        <div class="alert alert-danger"><?php echo e($message); ?>

                                                                        </div>
                                                                        <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>
                                                                    </div>
                                                                    <?php endif; ?>


                                                                </div>


                                                            </div>
                                                        </div>

                                                        <div class="modal-footer">
                                                            <button type="button" class="btn btn-secondary"
                                                                data-dismiss="modal">Close</button>
                                                            <button type="submit"
                                                                class="btn btn-primary">Submit</button>

                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                        </div>


                                    </td>
                                        <td><?php echo e($item->created_at); ?></td>
                                        <?php if($item->status == 1): ?>
                                            <td>
                                                <a href="<?php echo e(route('user.inactive', $item->id)); ?>" title="click me for order Disable">
                                                    <i class="fa fa-check-square-o green_color" aria-hidden="true" style="font-size:30px"></i>
                                                </a>
                                            </td>
                                        <?php elseif($item->status == 0): ?>
                                            <td>
                                                <a href="<?php echo e(route('user.active', $item->id)); ?>" title="click me for order Enable">
                                                    <i class="fa fa-ban red_color" aria-hidden="true" style="font-size:30px"></i>
                                                </a>
                                            </td>
                                        <?php else: ?>
                                            <td></td> 
                                        <?php endif; ?>
                                        <td class="d-flex">
                                            <a href="<?php echo e(route('userdetail', $item->id)); ?>" class="">
                                                <i class="fa fa-eye mt-1 ml-2" style="font-size:30px"></i>
                                            </a>
                                        </td>
                                     <td>
                                            <a href="<?php echo e(route('filterSubordinateData', $item->id)); ?>" class="btn btn-sm btn-primary" title="View Subordinates">
                                                Subordinates
                                            </a>
                                    </td>
                                      <td>
                                         <a href="<?php echo e(route('all_details', $item->id)); ?>" class="btn btn-sm btn-success" title="View Subordinates">
                                             ViewMoreDetails
                                         </a>
                                    </td>
                                    </tr>
                                    <!-- Add Wallet Modal -->
                                    <div class="modal fade" id="exampleModalCenter<?php echo e($item->id); ?>" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered" role="document">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title">Add Wallet</h5>
                                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                        <span aria-hidden="true">&times;</span>
                                                    </button>
                                                </div>
                                                <form action="<?php echo e(route('wallet.store', $item->id)); ?>" method="post">
                                                    <?php echo csrf_field(); ?>
                                                    <div class="modal-body">
                                                        <div class="form-group">
                                                            <label for="wallet">Wallet Amount</label>
                                                            <input type="text" class="form-control" id="wallet" name="wallet" placeholder="Enter Amount">
                                                            <?php $__errorArgs = ['wallet'];
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
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                                                        <button type="submit" class="btn btn-primary">Submit</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Subtract Wallet Modal -->
                                    <div class="modal fade" id="subtractWalletModal<?php echo e($item->id); ?>" tabindex="-1" role="dialog" aria-labelledby="subtractWalletModalTitle" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered" role="document">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title">Subtract Wallet</h5>
                                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                        <span aria-hidden="true">&times;</span>
                                                    </button>
                                                </div>
                                                <form action="<?php echo e(route('wallet.subtract', $item->id)); ?>" method="post">
                                                    <?php echo csrf_field(); ?>
                                                    <div class="modal-body">
                                                        <div class="form-group">
                                                            <label for="wallet">Wallet Amount</label>
                                                            <input type="text" class="form-control" id="wallet" name="wallet" placeholder="Enter Amount">
                                                            <?php $__errorArgs = ['wallet'];
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
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                                                        <button type="submit" class="btn btn-primary">Submit</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                    
                                <!--bet amount increase-->
                                
                                    <div class="modal fade" id="exampleBetamountModalCenter<?php echo e($item->id); ?>" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered" role="document">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title">Add Bet Amount</h5>
                                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                        <span aria-hidden="true">&times;</span>
                                                    </button>
                                                </div>
                                                <form action="<?php echo e(route('betamount.store', $item->id)); ?>" method="post">
                                                    <?php echo csrf_field(); ?>
                                                    <div class="modal-body">
                                                        <div class="form-group">
                                                            <label for="recharge">Betting Amount</label>
                                                            <input type="text" class="form-control" id="recharge" name="recharge" placeholder="Enter Amount">
                                                            <?php $__errorArgs = ['recharge'];
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
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                                                        <button type="submit" class="btn btn-primary">Submit</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Subtract bet amount Modal -->
                                    <div class="modal fade" id="subtractBetamountModal<?php echo e($item->id); ?>" tabindex="-1" role="dialog" aria-labelledby="subtractWalletModalTitle" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered" role="document">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title">Subtract Wallet</h5>
                                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                        <span aria-hidden="true">&times;</span>
                                                    </button>
                                                </div>
                                                <form action="<?php echo e(route('betamount.subtract', $item->id)); ?>" method="post">
                                                    <?php echo csrf_field(); ?>
                                                    <div class="modal-body">
                                                        <div class="form-group">
                                                            <label for="recharge">Wallet Amount</label>
                                                            <input type="text" class="form-control" id="recharge" name="recharge" placeholder="Enter Amount">
                                                            <?php $__errorArgs = ['recharge'];
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
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                                                        <button type="submit" class="btn btn-primary">Submit</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    $('#myModal').on('shown.bs.modal', function () {
        $('#myInputs').trigger('focus')
    })
</script>

<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/user/index.blade.php ENDPATH**/ ?>