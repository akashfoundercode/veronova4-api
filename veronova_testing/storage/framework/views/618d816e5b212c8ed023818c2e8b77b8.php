<?php $__env->startSection('admin'); ?>
<style>
    .page-header {
        background: linear-gradient(135deg, #4e73df, #1cc88a);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .page-header h2 {
        margin: 0;
        font-weight: bold;
    }
    .table thead {
        background: #4e73df;
        color: white;
    }
    .table tbody tr:hover {
        background: #f1f3f9;
        transition: 0.3s;
    }
    .status-active {
        background: #1cc88a;
        color: white;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 0.85rem;
    }
    .status-inactive {
        background: #e74a3b;
        color: white;
        padding: 5px 10px;
        border-radius: 5px;
        font-size: 0.85rem;
    }
</style>

<div class="container-fluid">
    
    <div class="page-header">
        <h2><i class="fas fa-credit-card"></i> Payment Limits</h2>
        <a href="<?php echo e(route('dashboard')); ?>" class="btn btn-light btn-sm">
            <i class="fas fa-home"></i> Dashboard
        </a>
    </div>

    <?php if(session('success')): ?> 
        <div class="alert alert-success shadow-sm"><i class="fas fa-check-circle"></i> <?php echo e(session('success')); ?></div> 
    <?php endif; ?>
    <?php if(session('error')): ?> 
        <div class="alert alert-danger shadow-sm"><i class="fas fa-exclamation-triangle"></i> <?php echo e(session('error')); ?></div> 
    <?php endif; ?>

    <div class="card shadow">
        <div class="card-body p-0">
            <table class="table table-hover mb-0">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Updated At</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                <?php $__currentLoopData = $limits; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $limit): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <tr>
                        <td><?php echo e($limit->id); ?></td>
                        <td><?php echo e($limit->name); ?></td>
                        <td><strong class="text-primary"><?php echo e(number_format($limit->amount, 2)); ?></strong></td>
                        <td>
                            <?php if($limit->status): ?>
                                <span class="status-active">Active</span>
                            <?php else: ?>
                                <span class="status-inactive">Inactive</span>
                            <?php endif; ?>
                        </td>
                        <td><?php echo e(\Carbon\Carbon::parse($limit->updated_at)->format('d M Y, h:i A')); ?></td>
                        <td>
                            <a href="<?php echo e(route('admin.payment_limits.edit', $limit->id)); ?>" 
                               class="btn btn-sm btn-primary">
                               <i class="fas fa-edit"></i> Edit
                            </a>
                        </td>
                    </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                </tbody>
            </table>
        </div>
    </div>
</div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/payment_limits/index.blade.php ENDPATH**/ ?>