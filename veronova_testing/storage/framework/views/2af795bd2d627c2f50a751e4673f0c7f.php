<?php $__env->startSection('admin'); ?>

<div class="container-fluid mt-5">
    <form action="<?php echo e(route('redblack.store')); ?>" method="post">
        <?php echo csrf_field(); ?>
        <input type="hidden" name="game_id" value="<?php echo e($game_id); ?>">
        <input type="hidden" name="games_no" value="<?php echo e($amounts[0]->games_no); ?>">

        <div class="row">
            <div class="col-md-12">
                <div class="white_shd full margin_bottom_30">
                    <div class="full graph_head">
                        <div class="">
                            <div class="row" style="padding-left:30px;" id="gmsno"></div>
                        </div>
                    </div>

                    <div class="row" style="padding-top: 30px; padding-bottom:20px;">
                        <?php $__currentLoopData = $amounts; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                            <?php if($item->number == '1'): ?>
                                <div class="card col-md-3 ml-3 mt-4" style="background-image: linear-gradient(to right, red , purple);">
                            <?php elseif($item->number == '2'): ?>
                                <div class="card col-md-3 ml-3 mt-4" style="background-image: linear-gradient(to right, green , purple);">
                            <?php else: ?>
                                <div class="card col-md-1 ml-3 mt-4" style="background-color:#ff0000">
                            <?php endif; ?>
                                <?php $gamid = $item->games_no; ?>
                                <div class="card-body">
                                    <b style="font-size: 20px; margin-left:12px; color: white;">
                                        <?php if($item->number == 1): ?>
                                            Red
                                        <?php elseif($item->number == 2): ?>
                                            Black
                                        <?php else: ?>
                                            <?php echo e($item->number); ?>

                                        <?php endif; ?>
                                    </b>
                                </div>
                            </div>
                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                    </div>

                    <div class="row" style="padding-bottom:20px;" id="amounts-container"></div>

                    <div class="row ml-4 d-flex" style="margin-bottom: 20px;">
                        <input type="hidden" name="game_id" value="<?php echo e($game_id); ?>">

                        <div class="col-md-3 form-group d-flex">
                            <input type="text" name="game_no" class="form-control" placeholder="Period" value="<?php echo e($gamid); ?>">
                        </div>

                        <div class="col-md-3 form-group d-flex">
                            <select name="number" class="form-control">
                                <option value="1"><b>Red</b></option>
                                <option value="2"><b>Black</b></option>
                            </select>
                        </div>

                        <div class="col-md-2 form-group d-flex">
                            <button type="submit" class="form-control btn btn-info"><b>Submit</b></button>
                        </div>

                        <div class="col-md-2 form-group d-flex mt-1">
                            <a href=""><i class="fa fa-refresh" aria-hidden="true" style="font-size:30px;"></i></a>
                        </div>
                    </div>
                </form>

                <form action="<?php echo e(route('redblackpercentage.update')); ?>" method="post">
                    <?php echo csrf_field(); ?>
                    <div class="row" style="padding-left:30px;">
                        <div class="col-md-3 form-group d-flex">
                            <input type="hidden" name="id" value="<?php echo e($game_id); ?>">
                            <input type="text" name="parsantage" value="<?php echo e($amounts[0]->parsantage); ?>" class="form-control" placeholder="Percentage">
                            <span><b>%</b></span>
                        </div>

                        <div class="row">
                            <?php $__errorArgs = ['game_no'];
$__bag = $errors->getBag($__errorArgs[1] ?? 'default');
if ($__bag->has($__errorArgs[0])) :
if (isset($message)) { $__messageOriginal = $message; }
$message = $__bag->first($__errorArgs[0]); ?>
                                <div class="alert alert-danger col-sm-6"><?php echo e($message); ?></div>
                            <?php unset($message);
if (isset($__messageOriginal)) { $message = $__messageOriginal; }
endif;
unset($__errorArgs, $__bag); ?>
                        </div>

                        <div class="col-md-2 form-group">
                            <button type="submit" class="form-control btn btn-info"><b>Submit</b></button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.4.min.js"></script>
    <script>
        function fetchData() {
            var gameid = <?php echo e($game_id); ?>;
            fetch('/fetch/' + gameid)
                .then(response => response.json())
                .then(data => {
                    updateBets(data.bets);
                })
                .catch(error => console.error('Error fetching data:', error));
        }

        function updateBets(bets) {
            var amountdetailHTML = '';
            var gmsno = '';
            var gmssno = '';

            bets.forEach(item => {
                amountdetailHTML += '<div class="card col-md-1 ml-3 mt-4 " style="background-color:#fff;">';
                amountdetailHTML += '<div class="card-body">';
                amountdetailHTML += '<b style="font-size: 10px;">' + item.amount + '</b>';
                amountdetailHTML += '</div>';
                amountdetailHTML += '</div>';
                gmsno = '<b style="font-size: 30px;">Period No - ' + item.games_no + '</b>';
                gmssno = item.games_no;
            });

            $('#amounts-container').html(amountdetailHTML);
            $('#gmsno').html(gmsno);
            $('#gmsssno').html(gmssno);
        }

        function refreshData() {
            fetchData();
            setInterval(fetchData, 5000);
        }

        document.addEventListener('DOMContentLoaded', refreshData);
    </script>

    <script type="text/javascript">
        setInterval(() => location.reload(), 60000);
    </script>

</div>

<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/RedBlack/index.blade.php ENDPATH**/ ?>