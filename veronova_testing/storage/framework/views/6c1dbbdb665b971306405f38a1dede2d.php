<?php $__env->startSection('admin'); ?>

<div class="container-fluid">
  <div class="row">
<div class="col-md-12">
  <div class="white_shd full margin_bottom_30">
     <div class="full graph_head">
        <div class="heading1 margin_0 d-flex">
           <h2>Bet History</h2>
           <!--<button type="button" class="btn btn-info" data-toggle="modal" data-target="#exampleModalCenter" style="margin-left:650px;">Add Gift</button>-->
        </div>
     </div>
     <div class="table_section padding_infor_info">
        <div class="table-responsive-sm">
           <table id="exam" class="table table-striped" style="width:100%">
              <thead class="thead-dark">
                 <tr>
                    <th>Id</th>
                    <th>Game Serial No</th>
                    <th>Amount</th>
                    <th>UserName</th>
                    <th>Date</th>
                 </tr>
              </thead>
              <tbody>
                <?php $__currentLoopData = $bets; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                 <tr>
                    <td><?php echo e($item->id); ?></td>
                    <td><?php echo e($item->game_sr_num); ?></td>
                    
                    <td><?php echo e($item->amount); ?></td>
                    <td><?php echo e($item->username); ?></td>
                    
                    <td><?php echo e($item->datetime); ?></td>
                    
                 </tr>
                 <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
              </tbody>
           </table>
			
			<nav aria-label="Page navigation example">
    <ul class="pagination justify-content-center">
        <li class="page-item <?php echo e($bets->onFirstPage() ? 'disabled' : ''); ?>">
            <a class="page-link" href="<?php echo e($bets->url(1)); ?>" aria-label="First">
                <span aria-hidden="true">&laquo;&laquo;</span>
            </a>
        </li>
        <li class="page-item <?php echo e($bets->onFirstPage() ? 'disabled' : ''); ?>">
            <a class="page-link" href="<?php echo e($bets->previousPageUrl()); ?>" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>

        <?php
            $half_total_links = floor(9 / 2);
            $from = $bets->currentPage() - $half_total_links;
            $to = $bets->currentPage() + $half_total_links;

            if ($bets->currentPage() < $half_total_links) {
                $to += $half_total_links - $bets->currentPage();
            }

            if ($bets->lastPage() - $bets->currentPage() < $half_total_links) {
                $from -= $half_total_links - ($bets->lastPage() - $bets->currentPage()) - 1;
            }
        ?>

        <?php for($i = $from; $i <= $to; $i++): ?>
            <?php if($i > 0 && $i <= $bets->lastPage()): ?>
                <li class="page-item <?php echo e($bets->currentPage() == $i ? 'active' : ''); ?>">
                    <a class="page-link" href="<?php echo e($bets->url($i)); ?>"><?php echo e($i); ?></a>
                </li>
            <?php endif; ?>
        <?php endfor; ?>

        <li class="page-item <?php echo e($bets->hasMorePages() ? '' : 'disabled'); ?>">
            <a class="page-link" href="<?php echo e($bets->nextPageUrl()); ?>" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
        <li class="page-item <?php echo e($bets->currentPage() == $bets->lastPage() ? 'disabled' : ''); ?>">
            <a class="page-link" href="<?php echo e($bets->url($bets->lastPage())); ?>" aria-label="Last">
                <span aria-hidden="true">&raquo;&raquo;</span>
            </a>
        </li>
    </ul>
</nav>
			
			
			
        </div>
     </div>
  </div>
</div>
</div>
</div> 




<?php $__env->stopSection(); ?>
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/aviator/bet.blade.php ENDPATH**/ ?>