<?php $__env->startSection('admin'); ?>
<div class="container mt-4">
    <h2 class="text-center mb-4">Update Notice</h2>

    <form action="<?php echo e(route('offer.update', $notice->id)); ?>" method="POST" enctype="multipart/form-data">
        <?php echo csrf_field(); ?>
        <?php echo method_field('PUT'); ?>

        <div class="form-group">
            <label for="title">Title</label>
            <input type="text" class="form-control" id="title" name="title" value="<?php echo e(old('title', $notice->title)); ?>" required>
        </div>

        <div class="form-group">
            <label for="content">Content</label>
            <textarea class="form-control" id="content" name="content" rows="10" required><?php echo e(old('content', $notice->content)); ?></textarea>
        </div>

        <div class="form-group">
            <label for="image">Image</label>
            <input type="file" class="form-control" id="image" name="image">

            <?php if($notice->image): ?>
                <img src="<?php echo e(asset('notice/' . basename($notice->image))); ?>" id="imagePreview" width="100" style="display: block; margin-top: 10px;">
            <?php else: ?>
                <img id="imagePreview" width="100" style="display: none;">
            <?php endif; ?>
        </div>

        <button type="submit" class="btn btn-primary">Update</button>
    </form>
</div>
<?php $__env->stopSection(); ?>

<?php $__env->startSection('scripts'); ?>
<script src="https://cdn.ckeditor.com/4.16.2/standard/ckeditor.js"></script>
<script>
    CKEDITOR.replace('content');
</script>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/notice/offer.blade.php ENDPATH**/ ?>