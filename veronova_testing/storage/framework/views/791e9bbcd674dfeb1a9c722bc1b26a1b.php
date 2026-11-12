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
    .form-label {
        font-weight: bold;
        color: #4e73df;
    }
    .form-control:focus {
        border-color: #4e73df;
        box-shadow: 0 0 5px rgba(78, 115, 223, 0.5);
    }
    .btn-gradient {
        background: linear-gradient(90deg, #1cc88a, #4e73df);
        color: white;
        border: none;
        transition: 0.3s;
    }
    .btn-gradient:hover {
        opacity: 0.9;
        color: white;
    }
</style>

<div class="container-fluid">
    <div class="page-header">
        <h2><i class="fas fa-edit"></i> Edit Payment Limit</h2>
        <a href="<?php echo e(route('admin.payment_limits.index')); ?>" class="btn btn-light btn-sm">
            <i class="fas fa-arrow-left"></i> Back
        </a>
    </div>

    <div class="card shadow">
        <div class="card-body">
            <form action="<?php echo e(route('admin.payment_limits.update', $limit->id)); ?>" method="POST">
                <?php echo csrf_field(); ?>

                <div class="mb-3">
                    <label class="form-label">Name</label>
                    <input type="text" value="<?php echo e($limit->name); ?>" class="form-control" readonly>
                </div>

                <div class="mb-3">
                    <label class="form-label">Amount</label>
                    <input type="number" name="amount" value="<?php echo e($limit->amount); ?>" step="0.01" class="form-control" required>
                </div>

                <div class="mb-3">
                    <label class="form-label">Status</label>
                    <select name="status" class="form-control" required>
                        <option value="1" <?php echo e($limit->status ? 'selected' : ''); ?>>Active</option>
                        <option value="0" <?php echo e(!$limit->status ? 'selected' : ''); ?>>Inactive</option>
                    </select>
                </div>

                <button type="submit" class="btn btn-gradient mt-2">
                    <i class="fas fa-save"></i> Update
                </button>
                <a href="<?php echo e(route('admin.payment_limits.index')); ?>" class="btn btn-secondary mt-2">
                    <i class="fas fa-times"></i> Cancel
                </a>
            </form>
        </div>
    </div>
</div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/payment_limits/edit.blade.php ENDPATH**/ ?>