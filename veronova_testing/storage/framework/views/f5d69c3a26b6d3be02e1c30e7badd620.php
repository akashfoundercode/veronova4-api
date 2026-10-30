<?php $__env->startSection('admin'); ?>
<div class="container-fluid py-4">

    <div class="card shadow-lg border-0">
        <div class="card-header text-white" style="background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);">
            <h4 class="mb-0">🎮 Jilli Game Bets</h4>
        </div>
        <div class="card-body p-0">

            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); color: white;">
                        <tr>
                            <th>ID</th>
                            <th>Game UID</th>
                            <th>Game Round</th>
                            <th>Member Account</th>
                            <!--<th>Currency Code</th>-->
                            <th>Bet Amount</th>
                            <th>Win Amount</th>
                            <th>Serial Number</th>
                            <th>Timestamp</th>
                            <!--<th>Code</th>
                            <th>Created At</th>
                            <th>Updated At</th>-->
                        </tr>
                    </thead>
                    <tbody>
                        <?php $__empty_1 = true; $__currentLoopData = $bets; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $bet): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                            <tr>
                                <td><span class="badge bg-primary"><?php echo e($bet->id); ?></span></td>
                                <td><?php echo e($bet->game_uid); ?></td>
                                <td><?php echo e($bet->game_round); ?></td>
                                <td><span class="badge bg-info text-dark"><?php echo e($bet->member_account); ?></span></td>
                                <!--<td><?php echo e($bet->currency_code); ?></td>-->
                                <td><span class="badge bg-warning text-dark"><?php echo e(number_format($bet->bet_amount, 2)); ?></span></td>
                                <td>
                                    <?php if($bet->win_amount > 0): ?>
                                        <span class="badge bg-success"><?php echo e(number_format($bet->win_amount, 2)); ?></span>
                                    <?php else: ?>
                                        <span class="badge bg-danger">0.00</span>
                                    <?php endif; ?>
                                </td>
                                <td><?php echo e($bet->serial_number); ?></td>
                                <td><?php echo e($bet->timestamp); ?></td>
                               <!-- <td><?php echo e($bet->code); ?></td>
                                <td><?php echo e(\Carbon\Carbon::parse($bet->created_at)->format('d M Y H:i')); ?></td>
                                <td><?php echo e(\Carbon\Carbon::parse($bet->updated_at)->format('d M Y H:i')); ?></td>-->
                            </tr>
                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                            <tr>
                                <td colspan="12" class="text-center text-muted py-4">
                                    <i class="bi bi-exclamation-circle"></i> No records found
                                </td>
                            </tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>

        </div>

        <div class="card-footer">
            <?php echo e($bets->links()); ?>

        </div>
    </div>

</div>


<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/jilli_game_bets/index.blade.php ENDPATH**/ ?>