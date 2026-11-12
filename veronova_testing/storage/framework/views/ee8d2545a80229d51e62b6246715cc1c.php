<?php $__env->startSection('admin'); ?>

<style>
    @import url("https://fonts.googleapis.com/css?family=Montserrat:400,400i,700");

    body {
        background-color: #111;
        font-family: Montserrat, sans-serif;
        margin: 0;
        padding: 0;
    }

    .dropbtn {
        font-family: Montserrat, sans-serif;
        background-color: #222228;
        color: white;
        padding: 5px;
        font-size: 16px;
        border: none;
        border-radius: 10px;
        width: 100px;
        box-shadow: 0px 0px 100px rgba(190, 200, 255, 0.6);
    }

    .dropdown {
        position: relative;
        display: inline-block;
        width: 100px;
        border-radius: 10px;
        z-index: 1;
    }

    .dropdown-content {
        display: none;
        position: absolute;
        background-color: #222228;
        min-width: 100px;
        z-index: 1;
        border-radius: 0 0 14px 14px;
        box-shadow: 0px 0px 100px rgba(190, 200, 255, 0.25);
    }

    .dropdown-content a {
        color: white;
        padding: 5px 8px;
        text-decoration: none;
        display: block;
        border-radius: 10px;
        margin: 2px;
        cursor: pointer;
    }

    .dropdown-content a:hover {
        background-color: #33333f;
    }

    .dropdown:hover .dropdown-content {
        display: block;
    }

    .dropdown:hover .dropbtn {
        background-color: #222228;
        border-radius: 10px 10px 0 0;
        border-bottom: none;
    }

    .error-message {
        font-weight: bold;
    }
    
    /* Custom Pagination Styles */
    .custom-pagination {
        margin-top: 20px;
        padding: 15px 10px;
        background: #1a1a1a;
        border-radius: 8px;
    }
    
    .pagination-info {
        color: #ffffff;
        font-size: 14px;
        font-weight: 500;
    }
    
    .pagination {
        margin-bottom: 0;
        flex-wrap: wrap;
    }
    
    .page-item {
        margin: 0 2px;
    }
    
    .page-item .page-link {
        border-radius: 6px !important;
        padding: 8px 14px;
        color: #007bff;
        background-color: #fff;
        border: 1px solid #dee2e6;
        transition: all 0.3s ease;
        font-size: 14px;
    }
    
    .page-item.active .page-link {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-color: #667eea;
        color: white;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    
    .page-item.disabled .page-link {
        color: #6c757d;
        background-color: #fff;
        border-color: #dee2e6;
        opacity: 0.6;
    }
    
    .page-item:not(.disabled) .page-link:hover {
        background-color: #e9ecef;
        border-color: #dee2e6;
        transform: translateY(-1px);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    
    /* Alert animations */
    .alert {
        animation: slideDown 0.5s ease;
        margin-bottom: 20px;
    }
    
    @keyframes slideDown {
        from {
            transform: translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    /* Modal styling */
    .modal-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    
    .modal-header .close {
        color: white;
        opacity: 1;
    }
    
    .modal-header .close:hover {
        color: white;
        opacity: 0.8;
    }
    
    /* Table styling */
    .table {
        font-size: 14px;
        background-color: #1a1a1a;
        color: #ffffff;
    }
    
    .table thead th {
        background-color: #222228;
        color: white;
        border-bottom: none;
        vertical-align: middle;
    }
    
    .table tbody tr:hover {
        background-color: #2a2a30;
        transition: background-color 0.3s ease;
    }
    
    .table-striped tbody tr:nth-of-type(odd) {
        background-color: #1e1e24;
    }
    
    /* Button improvements */
    .btn-sm {
        font-size: 12px;
        padding: 5px 12px;
    }
    
    @media (max-width: 768px) {
        .custom-pagination .d-flex {
            flex-direction: column;
            gap: 15px;
            align-items: center !important;
        }
        
        .page-item .page-link {
            padding: 6px 10px;
            font-size: 12px;
        }
        
        .pagination-info {
            font-size: 12px;
            text-align: center;
        }
        
        .table-responsive-sm {
            overflow-x: auto;
        }
        
        th, td {
            font-size: 12px;
            white-space: nowrap;
        }
        
        .dropbtn {
            font-size: 12px;
            padding: 3px;
            width: 80px;
        }
        
        .dropdown {
            width: 80px;
        }
    }
</style>

<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.4.1/dist/css/bootstrap.min.css"
    integrity="sha384-Vkoo8x4CGsO3+Hhxv8T/Q5PaXtkKtu6ug5TOeNV6gBiFeWPGFN9MuhOf23Q9Ifjh" crossorigin="anonymous">

<div class="container-fluid">
    <div class="row">
        <div class="col-md-12">
            <?php if($errors->has('pin')): ?>
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <?php echo e($errors->first('pin')); ?>

                    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
            <?php endif; ?>

            <?php if(session('error')): ?>
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    <?php echo e(session('error')); ?>

                    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
            <?php endif; ?>

            <?php if(session('Success')): ?>
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <?php echo e(session('Success')); ?>

                    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
            <?php endif; ?>
        </div>

        <div class="col-md-12">
            <div class="white_shd full margin_bottom_30">
                <div class="full graph_head">
                    <div class="heading1 margin_0 d-flex justify-content-between align-items-center">
                        <h2>USDT Withdrawal List - 
                            <?php if($id == 1): ?> Pending 
                            <?php elseif($id == 2): ?> Success 
                            <?php elseif($id == 3): ?> Rejected 
                            <?php else: ?> All 
                            <?php endif; ?>
                        </h2>
                        <div class="text-muted" style="color: #ffffff; margin-right:-1000px;">Total: <?php echo e($widthdrawls->total()); ?> records</div>
                    </div>
                </div>
                <div class="table_section padding_infor_info">
                    <div class="table-responsive-sm">
                        <table class="table table-striped" style="width:100%">
                            <thead class="thead-dark">
                                <tr>
                                    <th>Id</th>
                                    <th>UserId</th>
                                    <th>Beneficiary Name</th>
                                    <th>INR Amount</th>
                                    <th>USDT Amount</th>
                                    <th>Mobile</th>
                                    <th>USDT Wallet Address</th>
                                    <th>Order Id</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php $__empty_1 = true; $__currentLoopData = $widthdrawls; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                                <tr>
                                    <td><?php echo e($item->id); ?></td>
                                    <td><?php echo e($item->user_id); ?></td>
                                    <td><?php echo e($item->uname); ?></td>
                                    <td><?php echo e(number_format($item->amount, 2)); ?></td>
                                    <td><?php echo e(number_format($item->usdt_amount, 2)); ?></td>
                                    <td><?php echo e($item->mobile); ?></td>
                                    <td><?php echo e($item->usdt_wallet_address); ?></td>
                                    <td><?php echo e($item->order_id); ?></td>
                                    <td>
                                        <?php if($item->status == 1): ?>
                                        <div class="dropdown">
                                            <button class="dropbtn">Pending</button>
                                            <div class="dropdown-content">
                                                <a class="dropdown-item" data-toggle="modal"
                                                    data-target="#approveModal<?php echo e($item->id); ?>"
                                                    style="background-color: green; color: white;">
                                                    Approve
                                                </a>
                                                <a href="<?php echo e(route('usdt_widthdrawl.reject', $item->id)); ?>" 
                                                   onclick="return confirm('Are you sure you want to reject this withdrawal?');"
                                                   style="background-color: red; color: white;">
                                                    Reject
                                                </a>
                                            </div>
                                        </div>
                                        <?php elseif($item->status == 2): ?>
                                            <button class="btn btn-success btn-sm">Success</button>
                                        <?php elseif($item->status == 3): ?>
                                            <button class="btn btn-danger btn-sm">Rejected</button>
                                        <?php else: ?>
                                            <span class="badge badge-secondary">Unknown</span>
                                        <?php endif; ?>
                                    </td>

                                    <!-- Approve Modal -->
                                    <div class="modal fade" id="approveModal<?php echo e($item->id); ?>" tabindex="-1"
                                        role="dialog" aria-labelledby="approveModalLabel<?php echo e($item->id); ?>" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered modal-sm" role="document">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title">Approve Withdrawal</h5>
                                                    <button type="button" class="close" data-dismiss="modal"
                                                        aria-label="Close">
                                                        <span aria-hidden="true">&times;</span>
                                                    </button>
                                                </div>
                                                <form
                                                    action="<?php echo e(route('usdt_widthdrawl.success', ['id' => $item->id])); ?>"
                                                    method="POST">
                                                    <?php echo csrf_field(); ?>
                                                    <div class="modal-body">
                                                        <div class="form-group">
                                                            <label for="pin_<?php echo e($item->id); ?>">Please Enter Pin</label>
                                                            <input type="number"
                                                                class="form-control <?php $__errorArgs = ['pin'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?> is-invalid <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>"
                                                                id="pin_<?php echo e($item->id); ?>" name="pin" 
                                                                placeholder="Enter your PIN" required autocomplete="off">
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
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary btn-sm"
                                                            data-dismiss="modal">Close</button>
                                                        <button type="submit" class="btn btn-primary btn-sm">Submit</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>

                                    <td><?php echo e(date('d-m-Y H:i:s', strtotime($item->created_at))); ?></td>
                                </tr>
                                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                                    <tr>
                                        <td colspan="10" class="text-center">No records found</td>
                                    </tr>
                                <?php endif; ?>
                            </tbody>
                        </table>
                        
                        <!-- Custom Styled Pagination -->
                        <?php if($widthdrawls->total() > 0): ?>
                            <div class="custom-pagination">
                                <div class="d-flex justify-content-between align-items-center flex-wrap">
                                    <div class="pagination-info">
                                        Showing <?php echo e($widthdrawls->firstItem()); ?> to <?php echo e($widthdrawls->lastItem()); ?> of <?php echo e($widthdrawls->total()); ?> entries
                                    </div>
                                    <div>
                                        <?php echo e($widthdrawls->appends(['id' => $id])->links('pagination::bootstrap-4')); ?>

                                    </div>
                                </div>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Scripts -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.4.1/dist/js/bootstrap.min.js"></script>

<script>
    $(document).ready(function() {
        // Auto-hide alerts after 5 seconds
        setTimeout(function() {
            $('.alert').fadeOut('slow', function() {
                $(this).remove();
            });
        }, 5000);
        
        // Clear modal input fields when closed
        $('.modal').on('hidden.bs.modal', function () {
            $(this).find('form')[0].reset();
        });
        
        // Add smooth loading effect on pagination click
        $(document).on('click', '.pagination a', function(e) {
            e.preventDefault();
            var url = $(this).attr('href');
            if(url) {
                $('body').css('opacity', '0.5');
                window.location.href = url;
            }
        });
        
        // Fix dropdown z-index issue with modals
        $('.dropbtn').on('click', function(e) {
            $('.dropdown-content').css('z-index', '1050');
        });
        
        // Confirm before reject
        $('a[href*="usdt_widthdrawl.reject"]').on('click', function(e) {
            if(!confirm('Are you sure you want to reject this withdrawal?')) {
                e.preventDefault();
            }
        });
    });
</script>

<?php $__env->stopSection(); ?>
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/usdt_withdraw/index.blade.php ENDPATH**/ ?>