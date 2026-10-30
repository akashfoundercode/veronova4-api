<?php $__env->startSection('admin'); ?>

<style>
    .btn-group .btn {
        margin-right: 5px;
    }

    .btn-group .btn:last-child {
        margin-right: 0;
    }

    .btn-group {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    th {
        white-space: nowrap;
        text-overflow: ellipsis;
    }
</style>

<div class="container-fluid mt-4">
    <div class="row">
        <div class="col-md-12">

            
            <?php if(session('success')): ?>
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    <?php echo e(session('success')); ?>

                    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
            <?php endif; ?>

            
            <div class="white_shd full margin_bottom_30">
               <?php
    $statuses = [
        1 => 'Bets',
        2 => 'Chicken',
        3 => 'Aviator',
        4 => 'Payins',
        5 => 'Withdraws',
        6 => 'Gifts',
    ];
?>

<div class="full graph_head d-flex align-items-center justify-content-between">
   <h2 class="ml-3"><?php echo e($statuses[$status] ?? 'Game Result Table'); ?> Table</h2>
    <div class="btn-group mr-3">
        <?php $__currentLoopData = $statuses; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $label): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <button type="button"
                    class="btn btn-sm <?php echo e($status == $key ? 'btn-success' : 'btn-secondary'); ?>"
                    onclick="submitStatus(<?php echo e($key); ?>)">
                <?php echo e($label); ?>

            </button>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </div>
</div>

<!-- Hidden form -->
<form id="statusForm" method="POST" action="<?php echo e(route('all_details', $user_id ?? request()->route('user_id'))); ?>">
    <?php echo csrf_field(); ?>
    <input type="hidden" name="status" id="statusInput">
</form>

<!-- JavaScript to handle form submit -->
<script>
    function submitStatus(status) {
        document.getElementById('statusInput').value = status;
        document.getElementById('statusForm').submit();
    }
</script>

                <div class="table_section padding_infor_info">
                    <div class="table-responsive-sm">
                        <?php if($status == null || $status == 1): ?>
                        <table class="table table-bordered table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Win</th>
                                    
                                 
                                </tr>
                            </thead>
                            <tbody>
                                <?php $__currentLoopData = $data; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                    <tr>
                                        <td><?php echo e($item->id); ?></td>
                                        <td><?php echo e($item->amount); ?></td>
                                        <td>
                                            <?php if($item->status == 0): ?>
                                                <span class="badge bg-warning text-dark">Pending</span>
                                            <?php elseif($item->status == 1): ?>
                                                <span class="badge bg-success">Win</span>
                                            <?php else: ?>
                                                <span class="badge bg-danger">Loss</span>
                                            <?php endif; ?>
                                        </td>
                                        <td><?php echo e($item->win_amount ?? 0); ?></td>
                                      
                                     
                                     
                                    </tr>
                                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                            </tbody>
                        </table>
                       <?php elseif($status == 2): ?>
                         <table class="table table-bordered table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Win </th>
                                   
                                  
                                </tr>
                            </thead>
                            <tbody>
                                <?php $__currentLoopData = $data; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                    <tr>
                                        <td><?php echo e($item->id); ?></td>
                                        <td><?php echo e($item->amount); ?></td>
                                        <td>
                                            <?php if($item->status == 0): ?>
                                                <span class="badge bg-warning text-dark">Pending</span>
                                            <?php elseif($item->status == 1): ?>
                                                <span class="badge bg-success">Win</span>
                                            <?php else: ?>
                                                <span class="badge bg-danger">Loss</span>
                                            <?php endif; ?>
                                        </td>
                                        <td><?php echo e($item->win_amount); ?></td>
                        
                                      
                                       
                                    </tr>
                                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                            </tbody>
                        </table>
                        <?php elseif($status == 3): ?>
                           <table class="table table-bordered table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Win</th>
                                
                                </tr>
                            </thead>
                            <tbody>
                                <?php $__currentLoopData = $data; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                    <tr>
                                        <td><?php echo e($item->id); ?></td>
                                        <td><?php echo e($item->amount); ?></td>
                                        <td>
                                            <?php if($item->status == 0): ?>
                                                <span class="badge bg-warning text-dark">Pending</span>
                                            <?php elseif($item->status == 1): ?>
                                                <span class="badge bg-success">Win</span>
                                            <?php else: ?>
                                                <span class="badge bg-danger">Loss</span>
                                            <?php endif; ?>
                                        </td>
                                        <td><?php echo e($item->win); ?></td>
                                     
                                    </tr>
                                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                            </tbody>
                        </table>
                        <?php elseif($status == 4): ?>
                          <table class="table table-bordered table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>ID</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php $__currentLoopData = $data; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                    <tr>
                                        <td><?php echo e($item->id); ?></td>
                                        <td><?php echo e($item->cash); ?></td>
                                        <td>
                                            <?php if($item->status == 1): ?>
                                                <span class="badge bg-warning text-dark">Pending</span>
                                            <?php elseif($item->status == 2): ?>
                                                <span class="badge bg-success">Success</span>
                                            <?php else: ?>
                                                <span class="badge bg-danger">Reject</span>
                                            <?php endif; ?>
                                        </td>
                                        <td><?php echo e($item->created_at); ?></td>
                                    </tr>
                                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                            </tbody>
                        </table>
                        <?php elseif($status == 5): ?>
                          <table class="table table-bordered table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>id</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php $__currentLoopData = $data; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                    <tr>
                                        <td><?php echo e($item->id); ?></td>
                                        <td><?php echo e($item->amount); ?></td>
                                        <td>
                                            <?php if($item->status == 1): ?>
                                                <span class="badge bg-warning text-dark">Pending</span>
                                            <?php elseif($item->status == 2): ?>
                                                <span class="badge bg-success">Success</span>
                                            <?php else: ?>
                                                <span class="badge bg-danger">Reject</span>
                                            <?php endif; ?>
                                        </td>
                                       <td><?php echo e($item->created_at); ?></td>
                                    </tr>
                                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                            </tbody>
                        </table>
                        <?php elseif($status == 6): ?>
                          <table class="table table-bordered table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>id</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                  
                                 
                                    <th>date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php $__currentLoopData = $data; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                    <tr>
                                        <td><?php echo e($item->id); ?></td>
                                        <td><?php echo e($item->amount); ?></td>
                                        <td>
                                            <?php if($item->status == 0): ?>
                                                <span class="badge bg-warning text-dark">Pending</span>
                                            <?php elseif($item->status == 1): ?>
                                                <span class="badge bg-success">Success</span>
                                            <?php else: ?>
                                                <span class="badge bg-danger">Reject</span>
                                            <?php endif; ?>
                                        </td>
                                         <td><?php echo e($item->datetime); ?></td>
                                    </tr>
                                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                            </tbody>
                        </table>
                         <?php else: ?>
                          <p>No data available.</p>
                         <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/user/activityInfo.blade.php ENDPATH**/ ?>