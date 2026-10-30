<?php $__env->startSection('admin'); ?>

<div class="container-fluid">
    <div class="row">
<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
          <div class="heading1 margin_0 d-flex">
             <h2>Attendance List</h2>
             <!--<button type="button" class="btn btn-info" data-toggle="modal" data-target="#exampleModalCenter" style="margin-left:650px;">Add Attendance</button>-->
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
             <table id="example" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>accumulated_amount</th>
                       <th>attendance_bonus</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                   </tr>
                </thead>
                <tbody>
                  <?php $__currentLoopData = $attendances; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                   <tr>
                      <td><?php echo e($item->id); ?></td>
                      <td><?php echo e($item->accumulated_amount); ?></td>
                      <td><?php echo e($item->attendance_bonus); ?></td>
                      <td><?php echo e($item->created_at); ?></td>
                      <td></td>
                      <td>
                        <i class="fa fa-edit mt-1" data-toggle="modal" data-target="#exampleModalCenterupdate1<?php echo e($item->id); ?>" style="font-size:30px"></i>
                        <!--<a href="<?php echo e(route('attendance.delete',$item->id)); ?>"><i class="fa fa-trash mt-1 ml-1" style="font-size:30px;color:red;" ></i></a>-->
                      </td>
                      <div class="modal fade" id="exampleModalCenterupdate1<?php echo e($item->id); ?>" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                          <div class="modal-content">
                            <div class="modal-header">
                              <h5 class="modal-title" id="exampleModalLongTitle">Edit Attendance Amount</h5>
                              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                              </button>
                            </div>
                            <form action="<?php echo e(route('attendance.update',$item->id)); ?>" method="post" enctype="multipart/form-data">
                              <?php echo csrf_field(); ?>
                            <div class="modal-body">
                              <div class="container-fluid">
                                <div class="row">
                                  <div class="form-group col-md-12">
                                    <label for="accumulated_amount">Amount</label>
                                    <input type="text" class="form-control" id="accumulated_amount" name="accumulated_amount" value="<?php echo e($item->accumulated_amount); ?>" placeholder="Enter name">
                                    <?php $__errorArgs = ['amount'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?>
                                        <div class="alert alert-danger"><?php echo e($message); ?></div>
                                    <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>
                                  </div>
                                  
                                  <div class="form-group col-md-12">
                                    <label for="amount">Attendance Bonus</label>
                                    <input type="text" class="form-control" id="amount" name="attendance_bonus" value="<?php echo e($item->attendance_bonus); ?>" placeholder="Enter name">
                                    <?php $__errorArgs = ['amount'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?>
                                        <div class="alert alert-danger"><?php echo e($message); ?></div>
                                    <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>
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

<!-- Modal -->
        <div class="modal fade" id="exampleModalCenter" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered" role="document">
              <div class="modal-content">
                <div class="modal-header">
                  <h5 class="modal-title" id="exampleModalLongTitle">Add Attendance</h5>
                  <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <form action="<?php echo e(route('attendance.store')); ?>" method="POST" enctype="multipart/form-data">
                  <?php echo csrf_field(); ?>
                <div class="modal-body">
                  <div class="container-fluid">
                    <div class="row">
                      <div class="form-group col-md-12">
                        <label for="amount">Amount</label>
                        <input type="text" class="form-control" id="amount" name="accumulated_amount" placeholder="Enter amount">
                      </div>
                      <div class="form-group col-md-12">
                        <label for="attendance_bonus">attendance Bonus</label>
                        <input type="text" class="form-control" id="attendance_bonus" name="attendance_bonus" placeholder="Enter amount">
                      </div>
                    </div>
                </div>
                </form>
                <div class="modal-footer">
                  <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                  <button type="submit" class="btn btn-primary">Submit</button>
                </div>
              </div>
            </div>
        </div>
<script>
    $('#myModal').on('shown.bs.modal', function () {
  $('#myInputs').trigger('focus')
  })
</script>
 <?php $__env->stopSection(); ?>
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/attendance/index.blade.php ENDPATH**/ ?>