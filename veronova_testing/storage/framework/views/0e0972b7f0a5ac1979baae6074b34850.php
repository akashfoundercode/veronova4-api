<?php $__env->startSection('admin'); ?>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">

<div class="container mt-4">
    <h4 class="mb-3">Plinko Bets History</h4>

    <div class="table-responsive">
        <table class="table table-bordered table-hover table-striped">
            <thead class="thead-dark">
                <tr>
                    <th>ID</th>
                 
                    <th>User ID</th>
                    <th>Game ID</th>
                    <th>Amount</th>
                
                    <th>Win Amount</th>
                    <th>Status</th>

                 
                    <th>Datetime</th>
                    <th>Created At</th>
                    <th>Updated At</th>
                </tr>
            </thead>
            <tbody>
                <?php $__empty_1 = true; $__currentLoopData = $bets; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $bet): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                    <tr>
                        <td><?php echo e($bet->id); ?></td>
                      
                        <td><?php echo e($bet->userid); ?></td>
                        <td><?php echo e($bet->game_id); ?></td>
                        <td><?php echo e($bet->amount); ?></td>
                       
                        <td><?php echo e($bet->win_amount); ?></td>
                        <td><?php echo e($bet->status); ?></td>
                       
                      
                
                        <td><?php echo e($bet->datetime); ?></td>
                        <td><?php echo e($bet->created_at); ?></td>
                        <td><?php echo e($bet->updated_at); ?></td>
                    </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                    <tr>
                        <td colspan="14" class="text-center">No Plinko Bets Found</td>
                    </tr>
                <?php endif; ?>
            </tbody>
        </table>
    </div>
</div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/plinko/miens.blade.php ENDPATH**/ ?>