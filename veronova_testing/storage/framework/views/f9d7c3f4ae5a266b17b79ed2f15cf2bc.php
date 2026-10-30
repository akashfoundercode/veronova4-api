<?php $__env->startSection('admin'); ?>

<div class="container-fluid">
    <div class="row">
<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
          <div class="heading1 margin_0 d-flex">
             <h2>Complaint List</h2>
             <button type="button" class="btn btn-info" data-toggle="modal" data-target="#exampleModalCenter" style="margin-left:650px;">Add Complaint</button>
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
             <table id="example" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>S.no</th>
                      <th>Village</th>
                      <th>Block</th>
                      <th>District</th>
                      <th>State</th>
                      <th>Discription</th>
                      
                      <th>Date</th>
                      <th>Action</th>
                   </tr>
                </thead>
                <tbody>
                  <?php $__currentLoopData = $complaints; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                   <tr>
                      <td><?php echo e($item->id); ?></td>
                      <td><?php echo e($item->s_no); ?></td>
                      <td><?php echo e($item->village); ?></td>
                      <td><?php echo e($item->block); ?></td>
                      <td><?php echo e($item->district); ?></td>
                      <td><?php echo e($item->state); ?></td>
                      <td><?php echo e($item->discription); ?></td>
                      <td><?php echo e($item->created_at); ?></td>
                      <td>
                        <i class="fa fa-edit mt-1" data-toggle="modal" data-target="#exampleModalCenterupdate<?php echo e($item->id); ?>" style="font-size:30px"></i>
                        <a href="<?php echo e(route('complaint.delete',$item->id)); ?>"><i class="fa fa-trash mt-1 ml-1" style="font-size:30px;color:red;" ></i></a>
                   
                      </td>

                      <div class="modal fade" id="exampleModalCenterupdate<?php echo e($item->id); ?>" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                          <div class="modal-content">
                            <div class="modal-header">
                              <h5 class="modal-title" id="exampleModalLongTitle">Edit Complaint</h5>
                              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                              </button>
                            </div>
                            <form action="<?php echo e(route('complaint.update',$item->id)); ?>" method="POST" enctype="multipart/form-data">
                              <?php echo csrf_field(); ?>
                            <div class="modal-body">
                              <div class="container-fluid">
                                <div class="row">
                                  <div class="form-group col-md-6">
                                    <label for="s_no">S No</label>
                                    <input type="text" class="form-control" id="s_no" value="<?php echo e($item->s_no); ?>" name="s_no" placeholder="Enter s_no">
                                  </div>
                                  <div class="form-group col-md-6">
                                    <label for="village">Village</label>
                                    <input  type="text" class="form-control" id="village" value="<?php echo e($item->village); ?>" name="village" placeholder="Enter village">
                                  </div>
                                </div>
                                <div class="row">
                                  <div class="form-group col-md-6">
                                    <label for="block">Block</label>
                                    <input  type="text" class="form-control" id="block" value="<?php echo e($item->block); ?>" name="block" placeholder="Enter block">
                                  </div>
                                  <div class="form-group col-md-6">
                                    <label for="district">District</label>
                                    <input type="text" class="form-control" id="district" value="<?php echo e($item->district); ?>" name="district" placeholder="Enter district">
                                  </div>
                                </div>
                                <div class="row">
                                  <div class="form-group col-md-6">
                                    <label for="state">State</label>
                                    <input  type="text" class="form-control" id="state" value="<?php echo e($item->state); ?>" name="state" placeholder="Enter state">
                                  </div>
                                  <div class="form-group col-md-6">
                                    <label for="discription">Discription</label>
                                    <input type="text" class="form-control" id="discription" value="<?php echo e($item->discription); ?>" name="discription" placeholder="Enter discription">
                                  </div>
                                </div>
                               
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
        <h5 class="modal-title" id="exampleModalLongTitle">Add Complaint</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <form action="<?php echo e(route('complaint.store')); ?>" method="POST" enctype="multipart/form-data">
        <?php echo csrf_field(); ?>
      <div class="modal-body">
        <div class="container-fluid">
          <div class="row">
            <div class="form-group col-md-6">
              <label for="s_no">S No</label>
              <input type="text" class="form-control" id="s_no" name="s_no" placeholder="Enter s_no">
            </div>
            <div class="form-group col-md-6">
              <label for="village">Village</label>
              <input  type="text" class="form-control" id="village" name="village" placeholder="Enter village">
            </div>
          </div>
          <div class="row">
            <div class="form-group col-md-6">
              <label for="block">Block</label>
              <input  type="text" class="form-control" id="block" name="block" placeholder="Enter block">
            </div>
            <div class="form-group col-md-6">
              <label for="district">District</label>
              <input type="text" class="form-control" id="district" name="district" placeholder="Enter district">
            </div>
          </div>
          <div class="row">
            <div class="form-group col-md-6">
              <label for="state">State</label>
              <input  type="text" class="form-control" id="state" name="state" placeholder="Enter state">
            </div>
            <div class="form-group col-md-6">
              <label for="discription">Discription</label>
              <input type="text" class="form-control" id="discription" name="discription" placeholder="Enter discription">
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
  $('#myInput').trigger('focus')
   })
</script>
 <?php $__env->stopSection(); ?>
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/complaint/index.blade.php ENDPATH**/ ?>