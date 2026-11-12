<?php $__env->startSection('admin'); ?>

<div class="container-fluid">
    <div class="row">
<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
          <div class="heading1 margin_0 d-flex">
             <h2>FeedBack List</h2>
             
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
             <table id="example" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>User Name</th>
                      <th>Description</th>
                      
                      <th>Date</th>
                      
                   </tr>
                </thead>
                <tbody>
                  <?php $__currentLoopData = $feedbacks; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                   <tr>
                      <td><?php echo e($item->id); ?></td>
                      <td><?php echo e($item->uname); ?></td>
                      <td><?php echo e($item->description); ?></td>
                      
                      <td><?php echo e($item->created_at); ?></td>
                      
                      
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

<!-- Modal -->

 <?php $__env->stopSection(); ?>
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/work_order_assign/feedback.blade.php ENDPATH**/ ?>