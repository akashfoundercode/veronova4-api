<?php $__env->startSection('admin'); ?>
<style>
    .table-hover tbody tr:hover {
        background-color: #f8f9fa;
        cursor: pointer;
    }

    .text-danger {
        color: red;
        font-weight: bold;
    }
</style>

<div class="container mt-5">
    <div class="card shadow-sm border-0">
        <div class="card-header bg-danger text-white d-flex justify-content-between align-items-center">
            <h4 class="mb-0"><i class="bi bi-exclamation-triangle-fill me-2"></i>Illegal Bets Details</h4>
        </div>

        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-hover align-middle text-center">
                    <thead class="table-dark">
                        <tr>
                            <th>ID</th>
                            <th>User ID</th>
                            <th>Period Number</th>
                            <th>Game ID</th>
                            <th>Amount</th>
                            <th>Win Number</th>
                            <th>Number</th>
                            <th>Win Amount</th>
                            <th>Win / Loss</th>
                        
                            <th>Created At</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php $__currentLoopData = $data; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $bet): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                        <tr>
                            <td><?php echo e($bet->id); ?></td>
                            <td><?php echo e($bet->userid); ?></td>
                            <td><?php echo e($bet->games_no); ?></td>
                            <td><?php echo e($bet->game_id); ?></td>
                            <td><?php echo e($bet->amount); ?></td>
                            <td><?php echo e($bet->win_number); ?></td>
                            
                             <td>
                                <?php if($bet->number == 50): ?>
                                    <span style="background-color: skyblue; color: black; font-weight: bold; border-radius: 5px; padding: 2px 6px;">Small</span>
                                <?php elseif($bet->number == 40): ?>
                                    <span style="background-color: yellow; color: black; font-weight: bold; border-radius: 5px; padding: 2px 6px;">Big</span>
                                <?php elseif($bet->number == 30): ?>
                                    <span style="background-color: red; color: black; font-weight: bold; border-radius: 5px; padding: 2px 6px;">Red</span>
                                <?php elseif($bet->number == 20): ?>
                                    <span style="background-color: violet; color: black; font-weight: bold; border-radius: 5px; padding: 2px 6px;">Violet</span>
                                <?php elseif($bet->number == 10): ?>
                                    <span style="background-color: #4caf50; color: black; font-weight: bold; border-radius: 5px; padding: 2px 6px;">Green</span>
                                <?php else: ?>
                                    <span style="color: black; font-weight: bold; border-radius: 5px; padding: 2px 6px;"><?php echo e($bet->number); ?></span>
                                <?php endif; ?>
                            </td>

                            <td><?php echo e($bet->win_amount); ?></td>
                            <td>
                                <?php if($bet->win_amount > 0): ?>
                                    <span class="text-success">Win</span>
                                <?php else: ?>
                                    <span class="text-danger">Loss</span>
                                <?php endif; ?>
                            </td>
                            
                            <td><?php echo e(\Carbon\Carbon::parse($bet->created_at)->format('Y-m-d H:i:s')); ?></td>
                        </tr>
                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                    </tbody>
                </table>
              <div class="d-flex justify-content-center mt-3">
    <?php echo e($data->links()); ?>

</div>
            </div>
        </div>
    </div>
</div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/user/wingoSingleillegal.blade.php ENDPATH**/ ?>