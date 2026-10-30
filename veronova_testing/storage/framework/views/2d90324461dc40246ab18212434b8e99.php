<?php $__env->startSection('admin'); ?>
<div class="container-fluid mt-4">
    <div class="row">
        <div class="col-md-12">
            <div class="card shadow-sm border-0 rounded-lg" style="background-color: white; color: black;">
                <div class="card-header d-flex justify-content-between align-items-center" 
                     style="background: #f8f9fa; color: black; border-bottom: 2px solid #FFD369; padding: 10px 15px;">
                    <h4 class="mb-0" style="font-size: 18px;"><i class="fas fa-history"></i> Dice Bet History</h4>
                </div>
                <div class="card-body p-3">
                    <div class="table-responsive">
                        <table class="table table-sm table-hover table-bordered text-center" style="background-color: white; color: black; border-color: #ddd;">

                            <thead style="background-color: #f8f9fa; color: black;">
                                <tr style="font-size: 14px; font-weight: 700; text-transform: uppercase;">
                                    <th>ID</th>
                                    <th>Username</th>
                                    <th>Amount</th>
                                    <th>Trade</th>
                                    <th>Win</th>
                                    <th>Bet</th>
                                    <th>Win No</th>
                                    <th>Game</th>
                                    <th>Order</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>

                            <tbody>
                                <?php $__currentLoopData = $bets; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $bet): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                    <tr>
                                        <td style="font-weight: 600; color: #333;"><?php echo e($bet->id); ?></td>
                                        <td style="font-weight: 600; color: #333;"><?php echo e($bet->userid); ?></td>
                                        <td style="font-weight: 600; color: #333;"><?php echo e($bet->amount); ?></td>
                                        <td style="font-weight: 600; color: #333;"><?php echo e($bet->trade_amount); ?></td>
                                        <td style="font-weight: 600; color: #333;"><?php echo e($bet->win_amount); ?></td>
                                        <td style="font-weight: 600; color: #333;"><?php echo e($bet->number); ?></td>
                                        <td style="font-weight: 600; color: #333;"><?php echo e($bet->win_number); ?></td>
                                        <td style="font-weight: 600; color: #333;"><?php echo e($bet->games_no); ?></td>
                                        <td style="font-weight: 600; color: #333;"><?php echo e($bet->order_id); ?></td>
                                        <td style="font-weight: 600; color: #333;">
                                            <?php if($bet->status == 0): ?>
                                                <span class="badge badge-info">Pending</span>
                                            <?php elseif($bet->status == 1): ?>
                                                <span class="badge badge-success">Win</span>
                                            <?php elseif($bet->status == 2): ?>
                                                <span class="badge badge-danger">Lose</span>
                                            <?php endif; ?>
                                        </td>
                                        <td style="font-weight: 600; color: #333;"><?php echo e(\Carbon\Carbon::parse($bet->created_at)->format('d-m-Y H:i')); ?></td>
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

<!-- FontAwesome for Icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/dice/dicehistory.blade.php ENDPATH**/ ?>