<?php $__env->startSection('admin'); ?>


<div class="content-wrapper">
  <div class="container-fluid mt-4">
    <div class="card shadow-lg border-0">
      <div class="card-body">
          <?php if(session('success')): ?>
  <div class="alert p-3 alert-success alert-dismissible fade show mt-3" role="alert">
    <?php echo e(session('success')); ?>

  </div>

  <script>
    setTimeout(function () {
      const alert = document.querySelector('.alert');
      if (alert) {
        alert.classList.remove('show');
        alert.classList.add('hide');
        setTimeout(() => alert.remove(), 300);
      }
    },1500);
  </script>
<?php endif; ?>

        <h4 class="card-title text-primary fw-bold mb-4">Settings List</h4>
        <div class="table-responsive">
        <table class="table table-bordered table-striped text-center bg-light">
          <thead class="bg-primary text-white">
            <tr>
              <th>Sr.No</th>
              <th>Setting name</th>
              <th>Value</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <?php $__currentLoopData = $amountSetup; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $setting): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <tr>
              <td><?php echo e($key + 1); ?></td>
             <td>
                <?php if($setting->name == 'min_recharge'): ?>
                    First Recharge
                <?php else: ?>
                    <?php echo e($setting->name); ?>

                <?php endif; ?>
            </td>

              <td>
                <form action="<?php echo e(route('updateGameRules')); ?>" method="POST" class="form-inline d-flex">
                  <?php echo csrf_field(); ?>
                  <input type="hidden" name="id" value="<?php echo e($setting->id); ?>">
                  <input type="text" name="value" value="<?php echo e($setting->value); ?>" class="form-control form-control-sm w-100">
              </td>
              <td>
                  <button type="submit" class="btn  btn-sm" style="background:#7934F3;color:white">Update</button>
                </form>
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
 <div class="overlay toggle-menu"></div>
</div><!--End content-wrapper-->

<a href="javascript:void(0);" class="back-to-top"><i class="fa fa-angle-double-up"></i></a>



<!-- jQuery and Bootstrap core -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="assets/js/popper.min.js"></script>
<script src="assets/js/bootstrap.min.js"></script>

<!-- DataTables CSS and JS -->
<link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
<script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>

<!-- Initialize DataTables -->
<script>
  $(document).ready(function() {
    $('#betTable').DataTable({
      "pageLength": 10,
      "lengthMenu": [5, 10, 25, 50, 100],
    //   "order": [[1, 'desc']],
      "language": {
        "search": "🔍 Search:",
        "lengthMenu": "Show _MENU_ entries",
        "info": "Showing _START_ to _END_ of _TOTAL_ bets",
      }
    });
  });
</script>

<!-- Other Scripts -->
<script src="assets/plugins/simplebar/js/simplebar.js"></script>
<script src="assets/js/sidebar-menu.js"></script>
<script src="assets/js/app-script.js"></script>

</body>
</html>
<?php $__env->stopSection(); ?>
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/chicken_road/amount_setupList.blade.php ENDPATH**/ ?>