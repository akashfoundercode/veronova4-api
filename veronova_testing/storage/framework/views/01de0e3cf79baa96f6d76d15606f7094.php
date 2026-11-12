<?php $__env->startSection('admin'); ?>
<div class="container">
    <h4>Salary Lists</h4>
    <a href="<?php echo e(route('admin.salary-lists.export')); ?>" class="btn btn-success mb-3">Download Excel</a>

    <table class="table table-bordered">
        <thead>
            <tr>
                <th>ID</th>
                <th>User ID</th>
                <th>Amount</th>
                <th>Created At</th>
                <th>Updated At</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
            <?php $__currentLoopData = $salaries; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $salary): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <tr>
                <td><?php echo e($salary->id); ?></td>
                <td><?php echo e($salary->userid); ?></td>
                <td><?php echo e($salary->amount); ?></td>
                <td><?php echo e($salary->created_at); ?></td>
                <td><?php echo e($salary->updated_at); ?></td>
                <td>
                    <button class="btn btn-sm btn-primary edit-btn"
                        data-id="<?php echo e($salary->id); ?>"
                        data-amount="<?php echo e($salary->amount); ?>">
                        Edit
                    </button>
                </td>
            </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </tbody>
    </table>

    <?php echo e($salaries->links()); ?>

</div>

<!-- Edit Modal -->
<div class="modal fade" id="editAmountModal" tabindex="-1" role="dialog" aria-labelledby="editModalLabel" aria-hidden="true">
  <div class="modal-dialog" role="document">
    <form id="editAmountForm">
        <?php echo csrf_field(); ?>
        <input type="hidden" name="id" id="salaryId">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Edit Amount</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                <label for="amount">New Amount</label>
                <input type="number" name="amount" id="salaryAmount" class="form-control" min="0" required>
            </div>
            <div class="modal-footer">
                <button type="submit" class="btn btn-success">Save</button>
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
            </div>
        </div>
    </form>
  </div>
</div>
<?php $__env->stopSection(); ?>

<?php $__env->startPush('scripts'); ?>
<script>
$(document).ready(function () {
    $('.edit-btn').on('click', function () {
        $('#salaryId').val($(this).data('id'));
        $('#salaryAmount').val($(this).data('amount'));
        $('#editAmountModal').modal('show');
    });

    $('#editAmountForm').on('submit', function (e) {
        e.preventDefault();
        const formData = $(this).serialize();

        $.post("<?php echo e(route('admin.salary-lists.update')); ?>", formData, function (res) {
            alert(res.message);
            location.reload();
        }).fail(function (xhr) {
            alert("Error: " + xhr.responseJSON.message);
        });
    });
});
</script>
<?php $__env->stopPush(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/salary/index.blade.php ENDPATH**/ ?>