<?php $__env->startSection('admin'); ?>



<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Commission and Bonus Details</title>
    <style>
        table {
            border-collapse: collapse;
            width: 100%;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>

<h4>User Details</h4>

<table>
    <tr>
        <th>Total Commission</th>
        <th>Bonus</th>
        <th>Total Users</th>
    </tr>
    <tr>
        <td><?php echo e($data->commission); ?></td>
        <td><?php echo e($data->bonus); ?></td>
        <td><?php echo e($data->totaluser); ?></td>
    </tr>
</table>

<h4>Level-wise Commission</h4>

<table>
    <tr>
        <th>Level</th>
        <th>Count</th>
        <th>Commission</th>
    </tr>
    <!-- Repeat this row for each level -->
	<?php $__currentLoopData = $data->levelwisecommission; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <tr>
        <td><?php echo e($item->name); ?></td>
        <td><?php echo e($item->count); ?></td>
        <td><?php echo e($item->commission); ?></td>
    </tr>
	<?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    <!-- ... Repeat for other levels ... -->
</table>

<h2>User Data</h2>

<!-- Repeat the following table for each level -->
<table>
    <tr>
        <th>User ID</th>
        <th>Username</th>
        <th>Turnover</th>
        <th>Commission</th>
    </tr>
    <!-- Repeat this row for each user at the corresponding level -->
	<?php $__currentLoopData = $data->userdata; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $obj): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
	    <?php $__currentLoopData = $obj; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $obj1): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <tr>
        <td><?php echo e($obj1->user_id); ?></td>
       <td><?php echo e($obj1->username); ?></td>
        <td><?php echo e($obj1->turnover); ?></td>
        <td><?php echo e($obj1->commission); ?></td>
    </tr>
	<?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?> <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    <!-- ... Repeat for other users ... -->
</table>

</body>
</html>

<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/user/mlm_user_view.blade.php ENDPATH**/ ?>