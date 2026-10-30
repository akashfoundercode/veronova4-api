<?php $__env->startSection('admin'); ?>

<div class="clearfix"></div>

<div class="content-wrapper">
  <div class="container-fluid mt-4">

    <?php if(session('success')): ?>
    <div id="flash-message" style="position:fixed; top:20px; left:50%; transform:translateX(-50%); background:#d4edda; color:#155724; border:1px solid #c3e6cb; padding:10px 20px; border-radius:8px; z-index:9999; box-shadow:0 4px 8px rgba(0,0,0,0.1); transition:all 0.5s ease;">
      <?php echo e(session('success')); ?>

    </div>
    <script>
      setTimeout(function () {
        document.getElementById('flash-message').style.top = '-100px';
        document.getElementById('flash-message').style.opacity = '0';
      }, 3000);
    </script>
    <?php endif; ?>

    <div class="col-lg-12">
      <div class="card shadow-lg border-0">
        <div class="card-body">
          <h4 class="card-title text-primary fw-bold mb-3">Bet Value List</h4>

          <div class="table-responsive">
            <table id="betTable" class="table table-striped table-hover table-bordered align-middle">
              <thead class="text-center">
                <tr>
                  <th>ID</th>
                  <th>Value</th>
                  <!--<th>Status</th>-->
                  <th>Action</th>
                </tr>
              </thead>
              <tbody class="text-center">
                <?php $__currentLoopData = $betValues; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $bet): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <tr>
                  <td><?php echo e($bet->id); ?></td>
                  <td><?php echo e($bet->value); ?></td>
                  <!--<td>-->
                  <!--  <?php if($bet->status == 1): ?>-->
                  <!--  <span class="badge badge-success">Enabled</span>-->
                  <!--  <?php else: ?>-->
                  <!--  <span class="badge badge-danger">Disabled</span>-->
                  <!--  <?php endif; ?>-->
                  <!--</td>-->
                  <td>
                    <a href="javascript:void(0);" class="text-primary" data-toggle="modal" data-target="#editBet<?php echo e($bet->id); ?>">
                      <i class="fa fa-pencil-alt"></i>
                    </a>
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

  <!-- Edit Modals -->
  <?php $__currentLoopData = $betValues; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $bet): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
  <div class="modal fade" id="editBet<?php echo e($bet->id); ?>" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <form action="<?php echo e(route('updateBetValues')); ?>" method="POST">
        <?php echo csrf_field(); ?>
        <input type="hidden" name="id" value="<?php echo e($bet->id); ?>">
        <div class="modal-content" style="background: linear-gradient(145deg, #1f1c2c, #928dab); color:white; border-radius:10px;">
          <div class="modal-header border-0">
            <h5 class="modal-title text-white">Edit Bet Value</h5>
            <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="text-light font-weight-bold">Value</label>
              <input type="text" name="value" class="form-control" value="<?php echo e($bet->value); ?>" required>
            </div>
            
          </div>
          <div class="modal-footer border-0">
            <button type="submit" class="btn btn-primary">Update</button>
            <button type="button" class="btn btn-outline-light" data-dismiss="modal">Close</button>
          </div>
        </div>
      </form>
    </div>
  </div>
  <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

</div>
<div class="overlay toggle-menu"></div>
</div>

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
       "order": [[0, 'desc']],   
      "language": {
        "search": "🔍 Search:",
        "lengthMenu": "Show _MENU_ entries",
        "info": "Showing _START_ to _END_ of _TOTAL_ bets",
      }
    });
  });
</script>

<script src="assets/plugins/simplebar/js/simplebar.js"></script>
<script src="assets/js/sidebar-menu.js"></script>
<script src="assets/js/app-script.js"></script>

</body>
</html>

<?php $__env->stopSection(); ?>
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/chicken_road/bet_values.blade.php ENDPATH**/ ?>