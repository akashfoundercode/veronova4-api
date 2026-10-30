<?php $__env->startSection('admin'); ?>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<style>
    table thead th {
        white-space: nowrap;
    }
</style>

<div class="container mt-4">
    <h2 class="mb-4">IFSC Modifications</h2>

    <?php if(session('success')): ?>
        <div class="alert alert-success"><?php echo e(session('success')); ?></div>
    <?php endif; ?>

    <table class="table table-bordered">
        <thead class="table-dark">
            <tr>
                <th>ID</th>
                <th>User ID</th>
                <th>Account No</th>
                <th>IFSC</th>
                
                <th>Status / Remark</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
            <?php $__currentLoopData = $data; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <tr>
                    <td><?php echo e($item->id); ?></td>
                    <td><?php echo e($item->user_id); ?></td>
                    <td><?php echo e($item->account_no); ?></td>
                    <td><?php echo e($item->ifsc_code); ?></td>
                  
                    <td style="min-width: 220px;">
                        <?php if($item->status == 0): ?>
                            <div class="dropdown">
                                <button class="btn btn-sm btn-primary dropdown-toggle" type="button" data-toggle="dropdown">
                                    Action
                                </button>
                                <div class="dropdown-menu">
                                    <a class="dropdown-item text-success" href="#" onclick="approveIfsc(<?php echo e($item->id); ?>)">Approve</a>
                                    <a class="dropdown-item text-danger" href="#" onclick="openRejectModal(<?php echo e($item->id); ?>)">Reject</a>
                                </div>
                            </div>
                        <?php elseif($item->status == 1): ?>
                            <span class="badge badge-success">Approved</span>
                        <?php elseif($item->status == 2): ?>
                            <span class="badge badge-danger">Rejected</span>
                            <div class="bg-light border rounded text-dark"
                                 style="font-size: 13px; max-height: 80px; overflow-y: auto; white-space: pre-wrap;">
                              
                                <?php echo e($item->remark); ?>

                            </div>
                        <?php endif; ?>
                    </td>
                      <td><?php echo e(\Carbon\Carbon::parse($item->created_at)->format('d-m-Y H:i')); ?></td>
                </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </tbody>
    </table>
</div>

<!-- Hidden Reject Form with Modal -->
<form id="rejectForm" method="POST" action="">
    <?php echo csrf_field(); ?>
    <input type="hidden" name="id" id="rejectId">
    <input type="hidden" name="action_type" value="reject">
    <div class="modal fade" id="rejectModal" tabindex="-1" role="dialog" aria-labelledby="rejectModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Reject IFSC Modification</h5>
                    <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                </div>
                <div class="modal-body">
                    <label for="remark">Reason</label>
                    <textarea name="remark" id="remark" class="form-control" required></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-danger">Reject</button>
                </div>
            </div>
        </div>
    </div>
</form>



<!-- Scripts -->
<script>
function approveIfsc(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "Do you want to approve this IFSC modification?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Approve'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = "/admin/ifsc-modification-approve/" + id;
        }
    });
}

function openRejectModal(id) {
    const form = document.getElementById('rejectForm');
    form.action = "/admin/ifsc-modification-approve/" + id;
    document.getElementById('rejectId').value = id;
    document.getElementById('remark').value = '';
    $('#rejectModal').modal('show');
}

$(document).ready(function () {
    $('.modal').on('click', '[data-dismiss="modal"]', function () {
        $(this).closest('.modal').modal('hide');
    });
});
</script>

<!-- Required Scripts -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js"></script>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/CustomerService/ifsc_modifications.blade.php ENDPATH**/ ?>