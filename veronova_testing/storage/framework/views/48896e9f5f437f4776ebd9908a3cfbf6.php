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
					   <th>Social Media</th>
                  
                      <th>Action</th>
                   </tr>
                </thead>
                <tbody>
                  <?php $__currentLoopData = $settings; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                   <tr>
                      <td><?php echo e($item->id); ?></td>
                      <td><?php echo e($item->name); ?></td>
                      <td><?php echo e($item->link); ?></td>
                  
 <td>
                        <i class="fa fa-edit mt-1" data-toggle="modal" data-target="#exampleModalCenterupdate1<?php echo e($item->id); ?>" style="font-size:30px"></i>
                       
                      </td>
                      <div class="modal fade" id="exampleModalCenterupdate1<?php echo e($item->id); ?>" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                          <div class="modal-content">
                            <div class="modal-header">
                              <h5 class="modal-title" id="exampleModalLongTitle">Edit Social Media</h5>
                              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                              </button>
                            </div>
                            <form action="<?php echo e(route('supportsetting.update',$item->id)); ?>" method="post" enctype="multipart/form-data">
                              <?php echo csrf_field(); ?>
                            <div class="modal-body">
                              <div class="container-fluid">
                                <div class="row">
                                  <div class="form-group col-md-12">
                                    <label for="accumulated_amount">Social Media</label>
                                    <input type="text" class="form-control" id="accumulated_amount" name="socialmedia" value="<?php echo e($item->link); ?>">
                            
                                  </div>
                                  

                                 
                                
                            <div class="modal-footer">
                              <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                              <button type="submit" class="btn btn-primary">Submit</button>
                            </div>
                            </form>
                            
                          </div>
                        </div>
                      </div>
                      
                    
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
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/work_order_assign/support_setting.blade.php ENDPATH**/ ?>