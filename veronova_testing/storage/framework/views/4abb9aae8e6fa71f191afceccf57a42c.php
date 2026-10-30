<?php $__env->startSection('admin'); ?>

    <div class="container-fluid">
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title">Spin Bets Records Table</h4>
                    </div>
                    <form action="<?php echo e(route('spin.bets')); ?>" method="post">
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-bordered table-striped">
                                <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>User ID</th>
                                        <th>Peroid NUmber</th>
                                        <th>Game ID</th>
                                        <th>Amount</th>
                                        <th>Win Number</th>
                                        <th>Win Amount</th>
                                        <th>Status</th>
                                        <th>Created At</th>
                                        <th>Updated At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php $__currentLoopData = $records; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $record): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                        <tr>
                                            <td><?php echo e($record->id); ?></td>
                                            <td><?php echo e($record->user_id); ?></td>
                                            <td><?php echo e($record->period_no); ?></td>
                                            <td><?php echo e($record->game_id); ?></td>
                                            <td><?php echo e($record->amount); ?></td>
                                            <td><?php echo e($record->win_number); ?></td>
                                            <td><?php echo e($record->win_amount); ?></td>
                                            <td>
                                                <?php if($record->status == 0): ?>
                                                    Pending
                                                <?php elseif($record->status == 1): ?>
                                                    win
                                                <?php elseif($record->status == 2): ?>
                                                    loss
                                                <?php endif; ?>
                                            </td>
                                            <td><?php echo e($record->created_at); ?></td>
                                            <td><?php echo e($record->updated_at); ?></td>
                                        </tr>
                                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                                </tbody>
                            </table>
                        </div>
                        
                       
                            <?php if($records->hasPages()): ?>
                                <nav>
                                    <style>
                                        .pagination {
                                            display: flex;
                                            justify-content: center;
                                            list-style: none;
                                            padding: 0;
                                        }
                                        .pagination .page-item {
                                            margin: 0 5px;
                                        }
                                        .pagination .page-item .page-link {
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            width: 40px;
                                            height: 40px;
                                            border-radius: 50%;
                                            border: 1px solid #ddd;
                                            text-decoration: none;
                                            color: #333;
                                            font-weight: bold;
                                            transition: all 0.3s ease;
                                        }
                                        .pagination .page-item .page-link:hover {
                                            background-color: #e0e0e0;
                                            border-color: #ddd;
                                        }
                                        .pagination .page-item.active .page-link {
                                            background-color: #6f42c1;
                                            color: white;
                                            border-color: #6f42c1;
                                        }
                                        .pagination .page-item.disabled .page-link {
                                            color: #6c757d;
                                            pointer-events: none;
                                            background-color: #f5f5f5;
                                            border-color: #ddd;
                                        }
                                    </style>

                                    <ul class="pagination">
                                        
                                        <?php if($records->onFirstPage()): ?>
                                            <li class="page-item disabled">
                                                <span class="page-link">&lt;</span>
                                            </li>
                                        <?php else: ?>
                                            <li class="page-item">
                                                <a class="page-link" href="<?php echo e($records->previousPageUrl()); ?>" rel="prev">&lt;</a>
                                            </li>
                                        <?php endif; ?>

                                        
                                        <?php $__currentLoopData = $records->links()->elements; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $element): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                            
                                            <?php if(is_string($element)): ?>
                                                <li class="page-item disabled"><span class="page-link"><?php echo e($element); ?></span></li>
                                            <?php endif; ?>

                                            
                                            <?php if(is_array($element)): ?>
                                                <?php $__currentLoopData = $element; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $page => $url): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                                    <?php if($page == $records->currentPage() || $page == 1 || $page == $records->lastPage() || ($page >= $records->currentPage() - 2 && $page <= $records->currentPage() + 2)): ?>
                                                        <?php if($page == $records->currentPage()): ?>
                                                            <li class="page-item active"><span class="page-link"><?php echo e($page); ?></span></li>
                                                        <?php else: ?>
                                                            <li class="page-item"><a class="page-link" href="<?php echo e($url); ?>"><?php echo e($page); ?></a></li>
                                                        <?php endif; ?>
                                                    <?php elseif($page == $records->currentPage() - 3 || $page == $records->currentPage() + 3): ?>
                                                        <li class="page-item disabled"><span class="page-link">...</span></li>
                                                    <?php endif; ?>
                                                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                                            <?php endif; ?>
                                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

                                        
                                        <?php if($records->hasMorePages()): ?>
                                            <li class="page-item">
                                                <a class="page-link" href="<?php echo e($records->nextPageUrl()); ?>" rel="next">&gt;</a>
                                            </li>
                                        <?php else: ?>
                                            <li class="page-item disabled">
                                                <span class="page-link">&gt;</span>
                                            </li>
                                        <?php endif; ?>
                                    </ul>
                                </nav>
                            <?php endif; ?>
                        
                    </div>
                </div>
            </div>
        </div>
    </div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/spin/bets.blade.php ENDPATH**/ ?>