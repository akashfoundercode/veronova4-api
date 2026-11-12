                      <?php
                        
                          $trx = DB::select("SELECT CASE WHEN id = 6 THEN 6 WHEN id = 7 THEN 7 WHEN id = 8 THEN 8 WHEN id = 9 THEN 9 ELSE id END AS id, game_settings.name as name FROM game_settings WHERE game_settings.id IN (6,7, 8, 9)");
                      
                     ?>
                     
                     <li>
                        <a href="#appss" data-toggle="collapse" aria-expanded="false" class="dropdown-toggle"><i class='fa fa-gamepad' style='font-size:28px;color:red'></i> <span>Trx Game</span></a>
                        <ul class="collapse list-unstyled" id="appss">
                           <?php $__currentLoopData = $trx; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                           <li><a href="<?php echo e(route('trx',$item->id)); ?>"> <span><?php echo e($item->name); ?></span></a></li>
                           <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                        </ul>
                     </li><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/admin/body/trx_sidebar.blade.php ENDPATH**/ ?>