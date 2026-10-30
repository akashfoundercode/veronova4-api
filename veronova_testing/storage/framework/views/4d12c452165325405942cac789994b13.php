<?php $__env->startSection('admin'); ?>
<div class="container mt-2">
    <?php if(session('success')): ?>
    <div class="alert alert-success alert-dismissible fade show" role="alert">
        <?php echo e(session('success')); ?>

        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
<?php endif; ?>

<?php if(session('error')): ?>
    <div class="alert alert-danger alert-dismissible fade show" role="alert">
        <?php echo e(session('error')); ?>

        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
<?php endif; ?>

<?php if($errors->any()): ?>
    <div class="alert alert-danger alert-dismissible fade show" role="alert">
        <ul class="mb-0">
            <?php $__currentLoopData = $errors->all(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $error): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <li><?php echo e($error); ?></li>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </ul>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
<?php endif; ?>

    <div class="row justify-content-center">
        <div class="col-md-12">
            <div class="card border-0 shadow ">
                <div class="card-header bg-dark text-white  d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">
                        <i class="bi bi-gift-fill me-2"></i>Fund Transfer from Admin
                    </h5>
                  <span id="userDisplay" class="fs-5 fw-bold text-white"></span>

                </div>

                <form action="<?php echo e(route('admin.give_bonus')); ?>" method="POST" class="border p-3  rounded-3 shadow-sm bg-light">
    <?php echo csrf_field(); ?>
    <div class="row  align-items-end">
        <div class="col-sm-2">
            <label for="user_id" class="form-label mb-0">
                <i class="bi bi-person-fill-check me-1"></i> User ID
            </label>
            <input type="text" id="user_id" name="user_id" class="form-control" placeholder="Enter User ID" oninput="fetchUsernameLive()" required>
        </div>

        <div class="col-sm-2">
            <label for="bonus" class="form-label mb-0">
                <i class="bi bi-currency-rupee me-1"></i> Amount
            </label>
            <input type="number" id="bonus" name="bonus" class="form-control" placeholder="Bonus" required>
        </div>

        <div class="col-sm-3">
            <label for="type" class="form-label mb-0">
                <i class="bi bi-wallet2 me-1"></i> Type
            </label>
            <select name="type" id="type" class="form-select" required>
                <option value="" disabled selected>-- Select --</option>
                <?php $__currentLoopData = $data; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <option value="<?php echo e($item->id); ?>"><?php echo e($item->name); ?></option>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
            </select>
        </div>

        <div class="col-sm-4">
            <label for="remark" class="form-label mb-0">
                <i class="bi bi-chat-dots me-1"></i> Remark
            </label>
            <input type="text" id="remark" name="remark" class="form-control" placeholder="Optional">
        </div>

        <div class="col-sm-1 d-grid">
            <button type="submit" class="btn btn-success">
                <i class="bi bi-send-check-fill"></i>
            </button>
        </div>
    </div>
</form>


            </div>
        </div>
    </div>
  <div class="table-responsive mt-4">
    <table class="table table-bordered table-striped align-middle">
        <thead class="table-dark">
            <tr>
                <th>#</th>
                <th>User ID</th>
                <th>Amount</th>
                <th>Remark</th>
               
                <th>Description</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
            <?php $__empty_1 = true; $__currentLoopData = $fund_user_details; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $entry): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
                <tr>
                    <td><?php echo e($fund_user_details->firstItem() + $index); ?></td>
                    <td><?php echo e($entry->user_id); ?></td>
                    <td>₹<?php echo e(number_format($entry->amount, 2)); ?></td>
                    <td><?php echo e($entry->remark); ?></td>
                 
                    <td><?php echo e($entry->description); ?></td>
                    <td><?php echo e(\Carbon\Carbon::parse($entry->created_at)->format('d-m-Y h:i A')); ?></td>
                </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
                <tr>
                    <td colspan="7" class="text-center">No fund transfer records found.</td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>


<div class="d-flex justify-content-center">
    <?php echo $fund_user_details->links(); ?>

</div>

</div>


<script>
let debounceTimer;

function fetchUsernameLive() {
    const userId = document.getElementById("user_id").value.trim();
    const userDisplay = document.getElementById("userDisplay");

    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        if (userId) {
            fetch(`/admin/get-username/${userId}`)
                .then(res => res.json())
                .then(data => {
                    userDisplay.innerHTML = data.success
                        ? `To <u>${data.username}</u>`
                        : `<span class="text-warning">— User not found</span>`;
                })
                .catch(() => {
                    userDisplay.innerHTML = `<span class="text-danger">— Error fetching username</span>`;
                });
        } else {
            userDisplay.innerHTML = '';
        }
    }, 400);
}
</script>


<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/user/fund_transfer_by_admin.blade.php ENDPATH**/ ?>