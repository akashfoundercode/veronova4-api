<?php 
   include public_path('db_info.php');
?>
<!DOCTYPE html>
<html lang="en">
   <head>
      <!-- basic -->
      <meta charset="utf-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <!-- mobile metas -->
      <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
      <meta name="csrf-token" content="<?php echo e(csrf_token()); ?>">

      <!-- site metas -->
      <title><?php echo data($conn,3)?></title>
      <meta name="keywords" content="">
      <meta name="description" content="">
      <meta name="author" content="">

      <!-- Icons & Bootstrap -->
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
      <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">

      <!-- site icon -->
      <link rel="icon" href="<?php echo e(asset('images/fevicon.png')); ?>" type="image/png" />

      <!-- App CSS Files -->
      <link rel="stylesheet" href="<?php echo e(asset('css/bootstrap.min.css')); ?>" />
      <link rel="stylesheet" href="<?php echo e(asset('style.css')); ?>" />
      <link rel="stylesheet" href="<?php echo e(asset('css/responsive.css')); ?>" />
      <link rel="stylesheet" href="<?php echo e(asset('css/colors.css')); ?>" />
      <link rel="stylesheet" href="<?php echo e(asset('css/bootstrap-select.css')); ?>" />
      <link rel="stylesheet" href="<?php echo e(asset('css/perfect-scrollbar.css')); ?>" />
      <link rel="stylesheet" href="<?php echo e(asset('css/custom.css')); ?>" />

      <!-- DataTables CSS -->
      <link rel="stylesheet" href="https://cdn.datatables.net/1.10.25/css/dataTables.bootstrap4.min.css">
   </head>

   <body class="dashboard dashboard_1">

      <?php if ($__env->exists('admin.body.sidebar')) echo $__env->make('admin.body.sidebar', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?>
      <?php if ($__env->exists('admin.body.header')) echo $__env->make('admin.body.header', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?> 
      <?php echo $__env->yieldContent('admin'); ?>

      <!-- JS Dependencies -->

      <!-- jQuery (only once) -->
      <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>

      <!-- Bootstrap Bundle -->
      <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

      <!-- Other Vendor JS -->
      <script src="<?php echo e(asset('js/popper.min.js')); ?>"></script>
      <script src="<?php echo e(asset('js/animate.js')); ?>"></script>
      <script src="<?php echo e(asset('js/bootstrap-select.js')); ?>"></script>
      <script src="<?php echo e(asset('js/owl.carousel.js')); ?>"></script>
      <script src="<?php echo e(asset('js/Chart.bundle.min.js')); ?>"></script>
      <script src="<?php echo e(asset('js/utils.js')); ?>"></script>
      <script src="<?php echo e(asset('js/analyser.js')); ?>"></script>
      <script src="<?php echo e(asset('js/perfect-scrollbar.min.js')); ?>"></script>
      <script>
         var ps = new PerfectScrollbar('#sidebar');
      </script>

      <!-- Custom JS -->
      <script src="<?php echo e(asset('js/custom.js')); ?>"></script>
      <script src="<?php echo e(asset('js/chart_custom_style1.js')); ?>"></script>

      <!-- DataTables JS + Buttons -->
      <script src="https://cdn.datatables.net/1.10.25/js/jquery.dataTables.min.js"></script>
      <script src="https://cdn.datatables.net/1.10.25/js/dataTables.bootstrap4.min.js"></script>
      <script src="https://cdn.datatables.net/buttons/2.0.1/js/dataTables.buttons.min.js"></script>
      <script src="https://cdn.datatables.net/buttons/2.0.1/js/buttons.bootstrap4.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>
      <script src="https://cdn.datatables.net/buttons/2.0.1/js/buttons.html5.min.js"></script>

      <!-- DataTables Init -->
      <script>
$(document).ready(function() {
    $('#example').DataTable({
        dom: 'Bfrtip',
        buttons: ['excelHtml5'],
        order: [[0, 'desc']]
    });
});
      </script>
      
   </body>
</html>
<?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/admin/body/adminmaster.blade.php ENDPATH**/ ?>