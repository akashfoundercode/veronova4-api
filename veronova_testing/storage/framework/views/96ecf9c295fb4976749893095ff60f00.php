<?php $__env->startSection('admin'); ?>
<div class="container mt-4">
    <h4 class="mb-3">Plinko Bets History</h4>

    <div class="table-responsive">
        <table class="table table-bordered table-hover table-striped">
            <thead class="thead-dark">
                <tr>
                    <th>ID</th>
                 
                    <th>User ID</th>
                    <th>Amount</th>
                    <th>Game ID</th>
                    <th>Type</th>
                    <th>Indexs</th>
                    <th>Multipler</th>
                    <th>Win Amount</th>
                    <th>Status</th>
                    <th>Tax</th>
                    <th>After Tax</th>
                    <th>Order ID</th>
                    <th>Created At</th>
                    <th>Updated At</th>
                </tr>
            </thead>
            <tbody>
                <?php $__empty_1 = true; $__currentLoopData = $bets; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $bet): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                    <tr>
                        <td><?php echo e($bet->id); ?></td>
                        
                        <td><?php echo e($bet->userid); ?></td>
                        <td><?php echo e($bet->amount); ?></td>
                        <td><?php echo e($bet->game_id); ?></td>
                        <td>
                            <?php if($bet->type == 1): ?>
                                <span class="badge bg-success text-white">Green</span>
                            <?php elseif($bet->type == 2): ?>
                                <span class="badge bg-warning text-dark">Yellow</span>
                            <?php elseif($bet->type == 3): ?>
                                <span class="badge bg-danger">Red</span>
                            <?php else: ?>
                                <span class="badge bg-secondary">Unknown</span>
                            <?php endif; ?>
                        </td>
                        <td><?php echo e($bet->indexs); ?></td>
                        <td><?php echo e($bet->multipler); ?></td>
                        <td><?php echo e($bet->win_amount); ?></td>
                        <td><?php echo e($bet->status); ?></td>
                        <td><?php echo e($bet->tax); ?></td>
                        <td><?php echo e($bet->after_tax); ?></td>
                        <td><?php echo e($bet->orderid); ?></td>
                        <td><?php echo e($bet->created_at); ?></td>
                        <td><?php echo e($bet->updated_at); ?></td>
                    </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                    <tr>
                        <td colspan="15" class="text-center">No Plinko Bets Found</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/plinko/plinkohistory.blade.php ENDPATH**/ ?>