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
                            <h4>Period No - <?php echo e($nextGameNo ?? 'N/A'); ?></h4>
                            
                            <div class="d-flex flex-wrap justify-content-center mb-3" style="max-width: 700px; margin: auto;">
                                <?php $__currentLoopData = $multiplierData; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $data): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                    <div class="text-center mx-3 my-2">
                                        <img src="<?php echo e($data->image); ?>" 
                                             style="width: 80px; height: 80px; cursor: pointer; border-radius: 10px; padding: 5px;" 
                                             class="card-image"
                                             data-id="<?php echo e($data->id); ?>">
                                        <div style="font-size: 14px; font-weight: bold;"><?php echo e($data->id); ?></div>
                                        <div style="font-size: 12px; color: green; font-weight: bold;">
                                            ₹<?php echo e($betsAmount[$data->id] ?? 0); ?>

                                        </div>
                                    </div>
                                    <?php if(($index + 1) % 6 == 0): ?>
                                        <div class="w-100"></div>
                                    <?php endif; ?>
                                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                            </div>
                            <form action="<?php echo e(route('titli.add')); ?>" method="post" class="d-flex align-items-center justify-content-center">
                                <?php echo csrf_field(); ?>
                                <div class="form-group mx-5">
                                    <label for="games_no" class="mr-6">Game No:</label>
                                    <input type="text" id="games_no" name="games_no" 
                                           class="form-control form-control-sm font-weight-bold" 
                                           value="<?php echo e($nextGameNo ?? ''); ?>" style="width: 150px;">
                                </div>
                                <div class="form-group mx-3">
                                    <label for="card_id" class="mr-2">Card ID:</label>
                                    <select id="card_id" name="card_id" class="form-control form-control-sm font-weight-bold" style="width: 100px;">
                                        <?php $__currentLoopData = $multiplierData; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $data): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                            <option value="<?php echo e($data->id); ?>"><?php echo e($data->id); ?></option>
                                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                                    </select>
                                </div>
                                <button type="submit" class="btn btn-primary btn-sm mx-3">Submit</button>
                            </form>
                            <form>
                                <?php echo csrf_field(); ?>
                            <div>
                                <label></label>
                            </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>
        $(document).ready(function() {
            $(".card-image").click(function() {
                var cardId = $(this).data("id");
                $("#card_id").val(cardId);
            });
        });
    </script>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/titli/index2.blade.php ENDPATH**/ ?>