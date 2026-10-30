<?php $__env->startSection('admin'); ?>

    <div class="container mt-4">
        <h2 class="text-center mb-4">Notices</h2>

        <!-- Table to Display Data -->
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Content</th>
                    <th>Image</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <?php $__currentLoopData = $notices; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $notice): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <tr>
                        <td><?php echo e($notice->id); ?></td>
                        <td><?php echo e($notice->title); ?></td>
                        <td><?php echo e(Str::limit($notice->content, 500)); ?></td>
                        <td>
                            <?php if($notice->image): ?>
                                <!-- Display the image with the URL stored in the database -->
                                <img src="<?php echo e($notice->image); ?>" alt="<?php echo e($notice->title); ?>" width="100">
                            <?php else: ?>
                                <img src="https://via.placeholder.com/100" alt="No Image">
                            <?php endif; ?>
                        </td>
                        <td>
                            <!-- Redirect to edit page instead of using modal -->
                            <a href="<?php echo e(route('offer.edit', $notice->id)); ?>" class="btn btn-warning">Update</a>
                        </td>
                    </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </tbody>
        </table>
    </div>

<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/notice/index.blade.php ENDPATH**/ ?>