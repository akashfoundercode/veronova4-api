<?php $__env->startSection('admin'); ?>

<style>
    .form-container {
        max-width: 650px;
        margin: 40px auto;
        background: linear-gradient(to bottom right, #fdfbfb, #ebedee);
        padding: 30px 40px;
        border-radius: 15px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .form-container h2 {
        text-align: center;
        font-size: 28px;
        color: #333;
        margin-bottom: 30px;
    }

    .form-group {
        margin-bottom: 20px;
    }

    .form-group label {
        display: block;
        font-weight: 600;
        margin-bottom: 6px;
        color: #333;
    }

    .form-group input {
        width: 100%;
        padding: 12px 14px;
        border: 1px solid #ccc;
        border-radius: 8px;
        background-color: #ffffff;
        color: #333;
        transition: 0.3s;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
    }

    .form-group input:focus {
        outline: none;
        border-color: #7b61ff;
        box-shadow: 0 0 6px rgba(123, 97, 255, 0.4);
    }

    .btn-submit {
        background: linear-gradient(to right, #667eea, #764ba2);
        color: white;
        border: none;
        padding: 12px 25px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        transition: 0.3s;
        display: block;
        width: 100%;
        margin-top: 10px;
    }

    .btn-submit:hover {
        background: linear-gradient(to right, #5a67d8, #6b46c1);
    }

    @media (max-width: 600px) {
        .form-container {
            padding: 20px;
        }

        .form-container h2 {
            font-size: 22px;
        }
    }
</style>

<div class="form-container">
    <h2>Edit VIP Level</h2>

    <form action="<?php echo e(route('vip-levels.update', $vipLevel->id)); ?>" method="POST">
        <?php echo csrf_field(); ?>

        <div class="form-group">
            <label>Name:</label>
            <input type="text" name="name" value="<?php echo e($vipLevel->name); ?>" required>
        </div>

        <div class="form-group">
            <label>Betting Range:</label>
            <input type="text" name="betting_range" value="<?php echo e($vipLevel->betting_range); ?>" required>
        </div>

        <div class="form-group">
            <label>Level Up Rewards:</label>
            <input type="text" name="level_up_rewards" value="<?php echo e($vipLevel->level_up_rewards); ?>" required>
        </div>

        <div class="form-group">
            <label>Monthly Rewards:</label>
            <input type="text" name="monthly_rewards" value="<?php echo e($vipLevel->monthly_rewards); ?>" required>
        </div>

        <button type="submit" class="btn-submit">Update VIP Level</button>
    </form>
</div>

<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/vip_levels/edit.blade.php ENDPATH**/ ?>