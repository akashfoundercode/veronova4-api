<?php $__env->startSection('admin'); ?>

<div class="container-fluid">
    <div class="row">
<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
          <div class="heading1 margin_0 d-flex">
             <h2>Setting List</h2>
             
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
             <table id="example" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>name</th>
                      <th>Status</th>
                      <th>Action</th>
                   </tr>
                </thead>
                <tbody>
                  <?php $__currentLoopData = $settings; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                   <tr>
                      <td><?php echo e($item->id); ?></td>
                      <td><?php echo e($item->name); ?></td>
                      
                      <?php if($item->status==1): ?>  
                      <td><a href="#" title="click me for work_details Disable"><i class="fa fa-check-square-o green_color" aria-hidden="true" style="font-size:30px"></i></a></td>
                     <?php elseif($item->status==0): ?>
                     <td><a href="#" title="click me for work_details Enable"><i class="fa fa-ban red_color" aria-hidden="true" style="font-size:30px"></i></td>
                      <?php else: ?>
                      <td> </td>
                      <?php endif; ?>
                      <td>
                        <a href="<?php echo e(route('view',$item->id)); ?>"><i class="fa fa-edit mt-1"  style="font-size:30px"></i></a>
                        
            
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

 <?php $__env->stopSection(); ?>
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/work_order_assign/setting.blade.php ENDPATH**/ ?>