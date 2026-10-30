<?php $__env->startSection('admin'); ?>
<div class="clearfix"></div>

<div class="content-wrapper">
  <div class="container-fluid mt-4">
    <div class="col-lg-12">
      <div class="card shadow-lg border-0">
        <div class="card-body">
          <h4 class="card-title text-primary fw-bold mb-4">🎯 User Bets Table</h4>
          <div class="table-responsive">
            <table id="betTable" class="table table-striped table-hover table-bordered align-middle">
              <thead class="text-center">
                <tr>
                  <th>SR No</th> 
                  <th>User_id</th>
                  <th>User Name</th>
                  <!--<th>Game Name</th>-->
                  <th>Amount</th>
                  <th>Win Amount</th>
                  <th>Multiplier</th>
                  <!--<th>Cashout</th>-->
                  <th>Winning Result</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody class="text-center">
                <?php $__currentLoopData = $bet; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key=>$bets): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <tr>
                  <td><?php echo e($key+1); ?></td>
                  <td><?php echo e($bets->user_id); ?></td>
                  <td><?php echo e($bets->user_name); ?></td>
                  <!--<td>-->
                  <!--  <?php if($bets->game_id == 1): ?>-->
                  <!--      <span class="badge badge-success">chickenroad</span>-->
                  <!--  <?php else: ?>-->
                  <!--      <span class="badge badge-secondary"><?php echo e($bets->game_id); ?></span>-->
                  <!--  <?php endif; ?>-->
                    <!--</td>-->

                  <td class="text-success fw-semibold">₹<?php echo e($bets->amount); ?></td>
                  <td class="text-info fw-semibold">₹<?php echo e($bets->win_amount); ?></td>
                  <td><span class="badge bg-warning text-dark"><?php echo e($bets->multiplier); ?>x</span></td>
                  
                  <!--<td>-->
                  <!--    <?php if($bets->cashout_status == 1): ?>-->
                  <!--      <span class="badge badge-success">Yes</span>-->
                  <!--  <?php else: ?>-->
                  <!--      <span class="badge " style="background:#6432BB">No</span>-->
                  <!--  <?php endif; ?>-->
                  <!--  </td>-->
                  
                  <td>
                       <?php if($bets->status == 1): ?>
                        <span class="badge badge-success">Win</span>
                    <?php else: ?>
                        <span class="badge " style="background:#6432BB">Loss</span>
                    <?php endif; ?>
                  </td>
                  <td><?php echo e(\Carbon\Carbon::parse($bets->created_at)->format('d M Y h:i A')); ?></td>
                </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
<!--End Row-->

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

<!-- Initialize DataTables with dynamic serial number -->
<script>
  $(document).ready(function() {
    var table = $('#betTable').DataTable({
      "pageLength": 10,
      "lengthMenu": [5, 10, 25, 50, 100],
    //   "order": [[1, 'desc']],  // Order by actual ID column (index 1, since 0 is SR No)
      "language": {
        "search": "🔍 Search:",
        "lengthMenu": "Show _MENU_ entries",
        "info": "Showing _START_ to _END_ of _TOTAL_ bets",
      },
      "columnDefs": [
        { "orderable": false, "targets": 0 }  // Disable ordering on SR No column
      ]
    });

    // Dynamically add serial number on order and search
    table.on('order.dt search.dt', function () {
      let start = table.page.info().start;
      table.column(0, {search:'applied', order:'applied'}).nodes().each(function(cell, i) {
        cell.innerHTML = start + i + 1;
      });
    }).draw();
  });
</script>

<!-- Other Scripts -->
<script src="assets/plugins/simplebar/js/simplebar.js"></script>
<script src="assets/js/sidebar-menu.js"></script>
<script src="assets/js/app-script.js"></script>

</body>
</html>
<?php $__env->stopSection(); ?>
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/chicken_road/bet.blade.php ENDPATH**/ ?>