<?php $__env->startSection('admin'); ?>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<style>
    table thead th {
        white-space: nowrap;
    }
</style>
<div class="container-fluid">
    <div class="row">
        <div class="col-md-12">
                     <?php if(session('success')): ?>
    <div class="alert alert-success">
        <?php echo e(session('success')); ?>

    </div>
<?php endif; ?>
            <div class="white_shd full margin_bottom_30">
                <div class="full graph_head">
                    <div class="heading1 margin_0 d-flex justify-content-between">
                        <h2>Request Change Login Password</h2>
                    </div>
                </div>
                <div class="table_section padding_infor_info">
                    <div class="table-responsive-sm">
                        <table id="example" class="table table-striped" style="width:100%">
                            <thead class="thead-dark">
                                <tr>
                                    <th>ID</th>
                                    <th>User ID</th>
                                    <th>Password</th>
                                    <th>BDG Win ID</th>
                                    <th>Deposit Receipt</th>
                                    <th>Selfie with Passbook</th>
                                    <th>Selfie with ID</th>
                                    <th>Status / Action</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php $__currentLoopData = $data; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                <tr>
                                    <td><?php echo e($item->id); ?></td>
                                    <td><?php echo e($item->user_id); ?></td>
                                    <td><?php echo e($item->password); ?></td>
                                    <td><?php echo e($item->bdg_win_id); ?></td>
                                    <td>
                                        <img src="<?php echo e(asset($item->latest_deposit_receipt)); ?>" width="50" height="50" alt="Deposit" onclick="showImage(this)" style="cursor: zoom-in;">
                                    </td>
                                    <td>
                                        <img src="<?php echo e(asset($item->photo_selfie_hold_passbook)); ?>" width="50" height="50" alt="Passbook Selfie" onclick="showImage(this)" style="cursor: zoom-in;">
                                    </td>
                                    <td>
                                        <img src="<?php echo e(asset($item->photo_selfie_hold_Identity_card)); ?>" width="50" height="50" alt="ID Selfie" onclick="showImage(this)" style="cursor: zoom-in;">
                                    </td>
                                    <td>
                                        <?php if($item->status == 1): ?>
                                            <span class="btn btn-sm btn-success">Approved</span>
                                        <?php else: ?>
                                            <button class="btn btn-sm btn-warning"
                                                onclick="confirmApproval(<?php echo e($item->id); ?>)">Pending</button>
                                        <?php endif; ?>
                                    </td>
                                    <td><?php echo e(\Carbon\Carbon::createFromTimestamp($item->created_at)->format('d-m-Y H:i')); ?></td>
                                </tr>
                                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                            </tbody>
                        </table>
                    </div> <!-- table-responsive -->
                </div> <!-- table_section -->
            </div> <!-- white_shd -->
        </div> <!-- col -->
    </div> <!-- row -->
</div> <!-- container -->

<!-- Fullscreen Image Preview -->
<div id="imagePreview" class="image-preview" onclick="hideImage()">
    <button class="close-btn" onclick="hideImage(event)">×</button>
    <img id="previewImg" src="" alt="Preview Image">
</div>

<!-- CSS -->
<style>
.image-preview {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    justify-content: center;
    align-items: center;
    z-index: 9999;
}

.image-preview.active {
    display: flex;
}

.image-preview img {
    max-width: 90%;
    max-height: 90%;
    border-radius: 10px;
    box-shadow: 0 0 15px #000;
    border: 2px solid green;
}

.close-btn {
    position: absolute;
    top: 20px;
    right: 30px;
    background: transparent;
    border: none;
    font-size: 40px;
    color: #fff;
    cursor: pointer;
    z-index: 10000;
}

.close-btn:hover {
    color: #ff6666;
}
</style>

<!-- JS -->
<script>
function confirmApproval(id) {
    Swal.fire({
        title: 'Are you sure?',
      text: "Are you sure you have updated this user's login information?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, Sure'
    }).then((result) => {
        if (result.isConfirmed) {
            window.location.href = "/admin/approve-login-password-request/" + id;
        }
    });
}

function showImage(img) {
    document.getElementById('previewImg').src = img.src;
    document.getElementById('imagePreview').classList.add('active');
}

function hideImage(event) {
    event?.stopPropagation();
    document.getElementById('imagePreview').classList.remove('active');
}
</script>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/CustomerService/request_change_login_password.blade.php ENDPATH**/ ?>