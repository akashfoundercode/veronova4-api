<?php $__env->startSection('admin'); ?>



<div class="container-fluid mt-5">
    <div class="row justify-content-center">
		<?php if(session('success')): ?>
    <div class="alert alert-success">
        <?php echo e(session('success')); ?>

    </div>
<?php endif; ?>

<?php if(session('error')): ?>
    <div class="alert alert-danger">
        <?php echo e(session('error')); ?>

    </div>
<?php endif; ?>

        <div class="col-xl-11 col-lg-12">
            <div class="card card-custom">
                <div class="card-header card-header-custom">
                    <h4><i class="fas fa-wallet mr-2"></i>USDT Account Details</h4>
                </div>

                <div class="card-body">
                    <div class="table-responsive">
                        <table id="usdt-table" class="table table-striped" style="width:100%">
                            <thead class="thead-dark">
                                <tr>
                                    <th>ID</th>
                                    <th>User ID</th>
                                    <th>Name</th>
                                    <th>Wallet</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php $__currentLoopData = $usdt; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                    <tr>
                                        <td><?php echo e($item->id); ?></td>
                                        <td><?php echo e($item->user_id); ?></td>
                                        <td><?php echo e($item->name); ?></td>
                                        <td><?php echo e($item->usdt_wallet_address); ?></td>
                                        <td>
                                            <?php if($item->status == 0): ?>
                                                <select class="status-dropdown status-0" data-id="<?php echo e($item->id); ?>">
                                                    <option value="0" selected>Pending</option>
                                                    <option value="1">Approved</option>
                                                    <option value="2">Rejected</option>
                                                </select>
                                            <?php elseif($item->status == 1): ?>
                                                <span class="badge badge-success">Approved</span>
                                            <?php else: ?>
                                                <span class="badge badge-danger">Rejected</span>
                                            <?php endif; ?>
                                        </td>
                                        <td><?php echo e(\Carbon\Carbon::parse($item->created_at)->format('d M Y')); ?></td>
                                        <td>
                                            <button type="button" class="btn btn-sm btn-primary editBtn"
                                                data-id="<?php echo e($item->id); ?>"
                                                data-name="<?php echo e($item->name); ?>"
                                                data-wallet="<?php echo e($item->usdt_wallet_address); ?>"
                                                data-toggle="modal"
                                                data-target="#editModal">
                                                Edit
                                            </button>
											<div class="modal fade" id="editModal" tabindex="-1" role="dialog" aria-labelledby="editModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
    <div class="modal-content shadow rounded border-0">
      <form method="POST" action="<?php echo e(route('usdtqr.updates' , $item->id)); ?>">
        <?php echo csrf_field(); ?>
        <div class="modal-header bg-primary text-white">
            <h5 class="modal-title"><i class="fas fa-edit mr-2"></i>Edit USDT Account</h5>
            <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
                <span>&times;</span>
            </button>
        </div>
        <div class="modal-body p-4">
            <input type="hidden" name="id" id="edit_id">
            <div class="form-group">
                <label><strong>Name</strong></label>
                <input type="text" name="name" id="edit_name" class="form-control form-control-lg" required>
            </div>
            <div class="form-group">
                <label><strong>Wallet Address</strong></label>
                <input type="text" name="usdt_wallet_address" id="edit_wallet" class="form-control form-control-lg" required>
            </div>
        </div>
        <div class="modal-footer px-4 py-3">
            <button type="submit" class="btn btn-success btn-lg">Update</button>
            <button type="button" class="btn btn-secondary btn-lg" data-dismiss="modal">Close</button>
        </div>
      </form>
    </div>
  </div>
</div>
                                        </td>
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

<!-- Edit Modal -->


<!-- JS Includes -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap4.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js"></script>

<script>
$(document).ready(function () {

    $('#usdt-table').DataTable({
        order: [[0, 'desc']]
    });

    // Handle status update via AJAX
    $(document).on('change', '.status-dropdown', function () {
        const dropdown = $(this);
        const status = dropdown.val();
        const id = dropdown.data('id');

        $.ajax({
            url: '/admin/usdtqr/status-update/' + id,
            type: 'POST',
            data: {
                _token: '<?php echo e(csrf_token()); ?>',
                status: status
            },
            success: function () {
                if (status == '1') {
                    dropdown.replaceWith('<span class="badge badge-success">Approved</span>');
                } else if (status == '2') {
                    dropdown.replaceWith('<span class="badge badge-danger">Rejected</span>');
                }
                toastr.success('Status updated successfully');
            },
            error: function () {
                toastr.error('Failed to update status');
            }
        });
    });

    // Fill modal data
    $(document).on('click', '.editBtn', function () {
        $('#edit_id').val($(this).data('id'));
        $('#edit_name').val($(this).data('name'));
        $('#edit_wallet').val($(this).data('wallet'));
    });

});
</script>

<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/usdt_qr/usdt_address.blade.php ENDPATH**/ ?>