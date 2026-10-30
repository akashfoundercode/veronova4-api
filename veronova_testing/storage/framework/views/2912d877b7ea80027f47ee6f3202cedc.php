<?php $__env->startSection('admin'); ?>


    <div class="container-fluid">
        <div class="row">
            <div class="col-md-12">
                <div class="white_shd full margin_bottom_30">
                   <div class="full graph_head">
                      <div class="heading1 margin_0 d-flex">
                         <h2>Titli Game Result</h2>
                    </div>
                   </div>
                   <div class="table_section padding_infor_info">
                      <div class="table-responsive-sm">
                        <table id="example" class="table table-striped" style="width:100%">
                            <thead class="thead-dark">
                                <tr>
                                    <th>Id</th>
                                    <th>Win Number</th>
                                    <th>Game Sr. NO</th>
                                    <th>Image</th>
                                </tr>
                            <tbody>
                                <?php $__currentLoopData = $data; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $row): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                    <tr>
                                        <td><?php echo e($row->id); ?></td>
                                        <td><?php echo e($row->card_name); ?></td>
                                        <td><?php echo e($row->games_no); ?></td>
                                        <td>
                                            <img src="<?php echo e($row->image); ?>" alt="Image" width="50" height="50">
                                        </td>

                                    </tr>
                                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                            </tbody>

                            </thead>
                            
                        </table>
                        <div class="table-navigation d-flex justify-content-between mt-3">
                                <button id="prevBtn" class="btn btn-success">Previous</button>
                                <button id="nextBtn" class="btn btn-success">Next</button>
                            </div>
                      </div>
                   </div>
                </div>
            </div>
        </div>
    </div> 
    <script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.5.2/dist/js/bootstrap.bundle.min.js"></script>
   <script>
        $(document).ready(function () {
            var table = $('#example').DataTable(); 
            
            $('#prevBtn').on('click', function() {
                table.page('previous').draw('page');
            });
            
            $('#nextBtn').on('click', function() {
                table.page('next').draw('page');
            });
        });
    </script>
<?php $__env->stopSection(); ?>


<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/titli/result.blade.php ENDPATH**/ ?>