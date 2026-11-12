<?php $__env->startSection('admin'); ?>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">

<style>
    body {
        background: linear-gradient(135deg, #667eea, #764ba2);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        min-height: 100vh;
        padding: 40px 0;
    }

    .register-card {
        background: #ffffffcc;
        border-radius: 12px;
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        padding: 40px 35px;
        max-width: 450px;
        margin: 0 auto 50px;
        transition: transform 0.3s ease;
    }
    .register-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    }
    .register-card h3 {
        text-align: center;
        margin-bottom: 30px;
        color: #4b3f72;
        font-weight: 700;
        letter-spacing: 1.2px;
    }

    .form-floating input {
        border-radius: 8px;
        border: 1.8px solid #ddd;
        padding: 1rem 1rem 1rem 3rem;
        font-size: 1rem;
        transition: border-color 0.3s ease;
    }
    .form-floating input:focus {
        border-color: #764ba2;
        box-shadow: 0 0 8px #764ba2aa;
        outline: none;
    }
    .form-floating label {
        color: #777;
        font-weight: 600;
        padding-left: 2rem;
        cursor: pointer;
        user-select: none;
    }
    .form-floating i {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        color: #764ba2;
        font-size: 1.2rem;
    }

    .btn-primary {
        background-color: #764ba2;
        border: none;
        border-radius: 8px;
        width: 100%;
        padding: 12px;
        font-size: 1.1rem;
        font-weight: 700;
        transition: background-color 0.3s ease;
    }
    .btn-primary:hover {
        background-color: #5a3679;
    }

    .alert {
        border-radius: 8px;
        margin-bottom: 25px;
        font-weight: 600;
        font-size: 0.95rem;
    }

    /* Table Section */
    .white_shd {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgb(0 0 0 / 0.1);
        padding: 30px 25px;
        margin-bottom: 50px;
    }

    .graph_head h2 {
        font-weight: 700;
        color: #4b3f72;
        letter-spacing: 1px;
    }

    table#example {
        border-collapse: separate !important;
        border-spacing: 0 12px !important;
    }

    table#example thead th {
        background: #764ba2;
        color: white;
        font-weight: 700;
        font-size: 0.9rem;
        padding: 12px 15px;
        border-radius: 8px;
        border: none !important;
        text-align: center;
        white-space: nowrap;
        user-select: none;
    }

    table#example tbody tr {
        background: #f9f9f9;
        border-radius: 10px;
        transition: background-color 0.3s ease;
    }
    table#example tbody tr:hover {
        background-color: #e0d6f5;
    }

    table#example tbody td {
        padding: 15px;
        vertical-align: middle;
        text-align: center;
        font-weight: 600;
        color: #4a4a4a;
    }

    /* Wallet button group */
    .btn-group .btn {
        margin-right: 6px;
        border-radius: 6px;
        transition: background-color 0.3s ease;
    }
    .btn-group .btn-info {
        background-color: #5a67d8;
        border-color: #5a67d8;
        color: white;
    }
    .btn-group .btn-info:hover {
        background-color: #434bbd;
        border-color: #434bbd;
    }
    .btn-group .btn-danger {
        background-color: #e53e3e;
        border-color: #e53e3e;
        color: white;
    }
    .btn-group .btn-danger:hover {
        background-color: #b83232;
        border-color: #b83232;
    }

    /* Status Icons */
    .green_color {
        color: #38a169;
        cursor: pointer;
    }
    .red_color {
        color: #e53e3e;
        cursor: pointer;
    }

    /* Modal styles */
    .modal-content {
        border-radius: 12px;
        padding: 20px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .modal-header {
        border-bottom: none;
        padding-bottom: 0;
    }

    .modal-title {
        font-weight: 700;
        color: #4b3f72;
        font-size: 1.3rem;
    }

    .modal-footer {
        border-top: none;
        padding-top: 15px;
        justify-content: flex-end;
    }

    .modal-footer .btn-secondary {
        border-radius: 8px;
        padding: 8px 20px;
        font-weight: 600;
        background-color: #a0aec0;
        border: none;
        transition: background-color 0.3s ease;
    }
    .modal-footer .btn-secondary:hover {
        background-color: #718096;
    }

    .modal-footer .btn-primary {
        border-radius: 8px;
        padding: 8px 25px;
        font-weight: 700;
    }

    /* Responsive */
    @media (max-width: 575.98px) {
        .register-card {
            padding: 30px 25px;
            max-width: 100%;
        }

        table#example thead th,
        table#example tbody td {
            font-size: 0.85rem;
            padding: 10px 8px;
        }

        .btn-group .btn i {
            font-size: 16px;
        }
    }
</style>

<div class="register-card position-relative">
    <h3><b>Demo User Register</b></h3>

    <?php if(session('success')): ?>
        <div class="alert alert-success"><?php echo e(session('success')); ?></div>
    <?php endif; ?>
    <?php if($errors->any()): ?>
        <div class="alert alert-danger">
            <ul class="mb-0 ps-3">
                <?php $__currentLoopData = $errors->all(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $e): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <li><?php echo e($e); ?></li>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </ul>
        </div>
    <?php endif; ?>

    <form method="POST" action="<?php echo e(route('register.store')); ?>">
        <?php echo csrf_field(); ?>

        <div class="form-floating mb-4 position-relative">
            <input type="email" name="email" class="form-control" id="email" placeholder="Email" required>
            <label for="email"><i class="bi bi-envelope"></i> Email</label>
        </div>

        <div class="form-floating mb-4 position-relative">
            <input type="text" name="mobile" class="form-control" id="mobile" placeholder="Mobile" required>
            <label for="mobile"><i class="bi bi-phone"></i> Mobile</label>
        </div>

        <div class="form-floating mb-4 position-relative">
            <input type="password" name="password" class="form-control" id="password" placeholder="Password" required>
            <label for="password"><i class="bi bi-lock"></i> Password</label>
        </div>

        <button type="submit" class="btn btn-primary">Register</button>
    </form>
</div>

<div class="container-fluid px-0">
    <div class="row justify-content-center">
        <div class="col-12 col-lg-11">
            <?php if(session('success')): ?>
                <div class="alert alert-success">
                    <?php echo e(session('success')); ?>

                </div>
            <?php endif; ?>
            <div class="white_shd full margin_bottom_30">
                <div class="full graph_head mb-4">
                    <div class="heading1 margin_0 d-flex justify-content-between align-items-center">
                        <h2>Demo User List</h2>
                    </div>
                </div>
                <div class="table_section padding_infor_info">
                    <div class="table-responsive-sm">
                        <table id="example" class="table table-striped" style="width:100%">
                            <thead>
                                <tr>
                                    <th>Id</th>
                                    <th>User_name</th>
                                    <th>Email</th>
                                   <!-- <th>Mobile</th>-->
                                    <th>Wallet</th>
                                    <th>Password</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php $__currentLoopData = $demo_users; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                    <tr>
                                        <td><?php echo e($item->id); ?></td>
                                        <td><?php echo e($item->username); ?></td>
                                        <td><?php echo e($item->email); ?></td>
                                        <!--<td><?php echo e($item->mobile); ?></td>-->
                                        <td>
                                            <?php echo e($item->wallet); ?>

                                            <div class="btn-group" role="group" aria-label="Wallet actions">
                                                <button type="button" class="btn btn-info btn-sm" data-toggle="modal" data-target="#exampleModalCenter<?php echo e($item->id); ?>" title="Add Funds">
                                                    <i class="fa fa-plus"></i>
                                                </button>
                                                <button type="button" class="btn btn-danger btn-sm" data-toggle="modal" data-target="#subtractWalletModal<?php echo e($item->id); ?>" title="Subtract Funds">
                                                    <i class="fa fa-minus"></i>
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            <?php echo e($item->password); ?>

                                            <i class="fa fa-edit ms-3" data-toggle="modal" data-target="#exampleModalCenterupdate1<?php echo e($item->id); ?>" style="cursor:pointer; font-size:20px; color:#764ba2;"></i>

                                            <!-- Modal code remains unchanged -->
                                            <div class="modal fade" id="exampleModalCenterupdate1<?php echo e($item->id); ?>" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                                                <div class="modal-dialog modal-dialog-centered" role="document">
                                                    <div class="modal-content">
                                                        <div class="modal-header">
                                                            <h5 class="modal-title" id="exampleModalLongTitle">Change Password</h5>
                                                            <button type="button" class="btn-close" data-dismiss="modal" aria-label="Close"></button>
                                                        </div>
                                                        <form action="<?php echo e(route('password.update',$item->id)); ?>" method="post" enctype="multipart/form-data">
                                                            <?php echo csrf_field(); ?>
                                                            <div class="modal-body">
                                                                <div class="container-fluid">
                                                                    <div class="row">
                                                                        <div class="form-group col-md-6">
                                                                            <label for="wallet">Change Password</label>
                                                                            <input type="text" class="form-control" name="password" value="<?php echo e($item->password); ?>" placeholder="Enter Password">
                                                                            <?php $__errorArgs = ['password'];
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

                                                                        <?php
                                                                            $user = DB::table('users')->whereNull('email')->whereNull('password')->where('id', $item->id)->first();
                                                                        ?>

                                                                        <?php if($user): ?>
                                                                        <div class="form-group col-md-6">
                                                                            <label for="wallet">Sponser mobile no </label>
                                                                            <input type="text" class="form-control" name="sponser_mobile" placeholder="Enter Sponser mobile">
                                                                            <?php $__errorArgs = ['sponser_mobile'];
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
                                                                        <?php endif; ?>
                                                                    </div>
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

                                        </td>
                                        <td><?php echo e($item->created_at); ?></td>
                                        <td>
                                            <?php if($item->status == 1): ?>
                                                <a href="<?php echo e(route('user.inactive', $item->id)); ?>" title="Click to Disable">
                                                    <i class="fa fa-check-square-o green_color" style="font-size:30px"></i>
                                                </a>
                                            <?php elseif($item->status == 0): ?>
                                                <a href="<?php echo e(route('user.active', $item->id)); ?>" title="Click to Enable">
                                                    <i class="fa fa-ban red_color" style="font-size:30px"></i>
                                                </a>
                                            <?php else: ?>
                                                <span>-</span>
                                            <?php endif; ?>
                                        </td>
                                    </tr>

                                    <!-- Add Wallet Modal -->
                                    <div class="modal fade" id="exampleModalCenter<?php echo e($item->id); ?>" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered" role="document">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title">Add Wallet</h5>
                                                    <button type="button" class="btn-close" data-dismiss="modal" aria-label="Close"></button>
                                                </div>
                                                <form action="<?php echo e(route('wallet.store', $item->id)); ?>" method="post">
                                                    <?php echo csrf_field(); ?>
                                                    <div class="modal-body">
                                                        <div class="form-group">
                                                            <label for="wallet">Wallet Amount</label>
                                                            <input type="text" class="form-control" name="wallet" placeholder="Enter Amount">
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
                                                    <button type="button" class="btn-close" data-dismiss="modal" aria-label="Close"></button>
                                                </div>
                                                <form action="<?php echo e(route('wallet.subtract', $item->id)); ?>" method="post">
                                                    <?php echo csrf_field(); ?>
                                                    <div class="modal-body">
                                                        <div class="form-group">
                                                            <label for="wallet">Wallet Amount</label>
                                                            <input type="text" class="form-control" name="wallet" placeholder="Enter Amount">
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

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/user/demo_user.blade.php ENDPATH**/ ?>