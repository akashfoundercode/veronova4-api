<?php $__env->startSection('admin'); ?>
<!-- Bootstrap Icons -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">

<!-- DataTables CSS -->
<link rel="stylesheet" href="https://cdn.datatables.net/1.13.4/css/dataTables.bootstrap5.min.css">

<style>
    .table-hover tbody tr:hover {
        background-color: #f8f9fa;
        cursor: pointer;
    }

    .badge.bg-danger {
        animation: pulse 1.5s infinite;
    }

    @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.6); }
        70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
        100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
    }
</style>

<div class="container mt-5">
    <div class="card shadow-sm border-0">
        <div class="card-header bg-danger text-white d-flex justify-content-between align-items-center">
            <h4 class="mb-0"><i class="bi bi-exclamation-triangle-fill me-2"></i>Users with illegal Bets</h4>
            <span class="badge bg-light text-dark"><?php echo e($illegalUsers->count()); ?> found</span>
        </div>

        <div class="card-body">
            <?php if($illegalUsers->count() > 0): ?>
                <div class="table-responsive">
                    <table class="table table-hover align-middle text-center" id="illegalUsersTable">
                        <thead class="table-dark">
                            <tr>
                                <th>User ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <!--<th>Mobile</th>-->
                                <th>Illegal Count</th>
                                <th>User Status</th>
                                <th>Bet Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php $__currentLoopData = $illegalUsers; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $user): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                <tr>
                                    <td><?php echo e($user->id); ?></td>
                                    <td><?php echo e($user->username ?? 'N/A'); ?></td>
                                    <td><?php echo e($user->email ?? 'N/A'); ?></td>
                                    <!--<td><?php echo e($user->mobile ?? 'N/A'); ?></td>-->
                                    <td>
                                        <span class="badge bg-danger fs-6" title="Illegal Bets"><?php echo e($user->illegal_count); ?></span>
                                    </td>
                                    <td>
                                        <?php if($user->status == 1): ?>
                                            <a href="<?php echo e(route('Illegaluser.inactive', $user->id)); ?>" title="Click to Disable User">
                                                <i class="fa fa-check-square-o green_color" aria-hidden="true" style="font-size:30px"></i>
                                            </a>
                                        <?php elseif($user->status == 0): ?>
                                            <a href="<?php echo e(route('Illegaluser.active', $user->id)); ?>" title="Click to Enable User">
                                                <i class="fa fa-ban red_color" aria-hidden="true" style="font-size:30px"></i>
                                            </a>
                                        <?php endif; ?>
                                    </td>
                                    <td>
                                        <a href="<?php echo e(route('illegal_single_Users' , $user->id)); ?>" class="btn btn-success">View More</a>
                                    </td>
                                </tr>
                            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                        </tbody>
                    </table>
                </div>
            <?php else: ?>
                <div class="alert alert-info text-center mb-0">
                    <i class="bi bi-info-circle-fill me-2"></i>No users with illegal bets found.
                </div>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- DataTables JS -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.datatables.net/1.13.4/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.13.4/js/dataTables.bootstrap5.min.js"></script>

<script>
    $(document).ready(function () {
        $('#illegalUsersTable').DataTable({
            "language": {
                "search": "Search:",
                "lengthMenu": "Show _MENU_ entries",
                "info": "Showing _START_ to _END_ of _TOTAL_ users",
                "paginate": {
                    "next": "Next",
                    "previous": "Previous"
                },
                "zeroRecords": "No matching records found"
            },
            "order": [[4, "desc"]] // Sort by Illegal Count by default
        });
    });
</script>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/user/illegal_bet.blade.php ENDPATH**/ ?>