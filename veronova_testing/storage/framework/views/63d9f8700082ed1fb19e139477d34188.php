<?php $__env->startSection('admin'); ?>

<div class="container-fluid" style="margin-bottom: 60px;">
    <form action="<?php echo e(route('trx.store')); ?>" method="post">
        <?php echo csrf_field(); ?>
        <!-- Your existing form content -->
        <input type="hidden" name="gameid"  value="<?php echo e($gameid); ?>">
        <input type="hidden" name="gamesno"  value="<?php echo e($bets[0]->games_no); ?>">

        <div class="row">
            <div class="col-md-12">
                <div class="white_shd full margin_bottom_30">
                    <div class="full graph_head">
                        <div class="row" style="padding-left:30px;" id="gmsno">                       
                        </div>
                    </div>
                    <div class="row" style="padding-top: 30px; padding-bottom:20px;">
                        <?php $__currentLoopData = $bets; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                            <?php if($item->number =='1' || $item->number =='3'||$item->number =='7'||$item->number =='9'): ?>
                                <div class="card col-md-1 ml-3 mt-4 " style="background-color:#008000;">
                            <?php elseif($item->number =='5'): ?>        
                                <div class="card col-md-1 ml-3 mt-4 " style="background-image: linear-gradient(to right, green , purple);">
                            <?php elseif($item->number =='0'): ?>        
                                <div class="card col-md-1 ml-3 mt-4 " style="background-image: linear-gradient(to right, red , purple);">
                            <?php else: ?>
                                <div class="card col-md-1 ml-3 mt-4 " style="background-color:#ff0000">
                            <?php endif; ?>
                                <?php $gamid= $item->games_no;?>
                                <div class="card-body">
                                    <b style="font-size: 20px; margin-left:12px; color: white;"> <?php echo e($item->number); ?></b>
                                </div>
                            </div>
                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                    </div>
                    <div class="row" style="padding-bottom:20px;" id="amounts-container">
                    </div>

                    <div class="row ml-4 d-flex" style="margin-bottom: 20px;">
						 <input type="hidden" name="game_id"  value="<?php echo e($gameid); ?>">
                        <div class="col-md-3 form-group d-flex">
                            <input type="text" name="game_no" class="form-control" placeholder="Period" value ="<?php echo $gamid;?>">
                        </div>
                        <div class="col-md-3 form-group d-flex">
                            <input type="number" min="1" max="9" name="number" class="form-control" placeholder="Result">
                        </div>
                        <div class="col-md-2 form-group d-flex">
                            <button type="submit" class="form-control btn btn-info"><b>Submit</b></button>
                        </div>
						<div class="col-md-2 form-group d-flex mt-1">
                            <a href=""> <i class="fa fa-refresh" aria-hidden="true" style="font-size:30px;"></i></a>
                        </div>
                    </div>
                </form>
					
                <form action="<?php echo e(route('percentage.update')); ?>" method="post">
                    <?php echo csrf_field(); ?>
                    <div class="row" style="padding-left:30px;">
                        <div class="col-md-3 form-group d-flex">
                            <input type="hidden" name="id" value="<?php echo e($gameid); ?>">
                            <input type="text" name="parsantage" value="<?php echo e($bets[0]->parsantage); ?>" class="form-control" placeholder="Percentage">
                            <span><b>%</b></span>
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
            var gameid = <?php echo e($gameid); ?>;
            fetch('/fetch/' + gameid)
                .then(response => response.json())
                .then(data => {
                    console.log('Fetched data:', data);
                    updateBets(data.bets);
                    updateGameId(data.gameid);
                })
                .catch(error => console.error('Error fetching data:', error));
        }

        function updateBets(bets) {
            console.log('Updated Bets:', bets);
            var amountdetailHTML = '';
            var gmsno='';
            bets.forEach(item => {
                amountdetailHTML += '<div class="card col-md-1 ml-3 mt-4 " style="background-color:#fff;">';
                amountdetailHTML += '<div class="card-body">';
                amountdetailHTML += '<b style="font-size: 10px; ">' + item.amount + '</b>';
                amountdetailHTML += ' </div>';
                amountdetailHTML += '</div>';
                gmsno ='<b style="font-size: 50px; "> Period No :' + item.games_no + '</b>';
            });

            $('#amounts-container').html(amountdetailHTML);
            $('#gmsno').html(gmsno);
        }

        function updateGameId(gameid) {
            console.log('Updated Game ID:', gameid);
        }

        function refreshData() {
            fetchData();
            setInterval(fetchData, 5000);
        }

        document.addEventListener('DOMContentLoaded', refreshData);
    </script>
<?php $__env->stopSection(); ?>
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/trx/index.blade.php ENDPATH**/ ?>