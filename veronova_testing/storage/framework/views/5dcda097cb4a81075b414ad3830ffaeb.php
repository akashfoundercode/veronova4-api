<?php $__env->startSection('admin'); ?>
<div class="container-fluid">
    <div class="row">
<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
          <div class="heading1 margin_0 d-flex">
             <h2>User Bet</h2>
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
            

             <table id="example" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>Amount</th>
                      <th>number</th>
					   <th>Game</th>
					    <th>GameNo</th>
                      <th>Date time</th>
                      
                      
                   </tr>
                </thead>
                <tbody>
                    <?php $__currentLoopData = $users; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $row): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <tr>
                        <td><?php echo e($row->id); ?></td>
                        <td><?php echo e($row->amount); ?></td>
                        <td><?php echo e($row->number); ?></td>
						<td><?php if($row->game_id==1){echo "Wingo 1 Minute";}elseif($row->game_id==2){echo "Wingo 3 Minute";}elseif($row->game_id==3){echo "Wingo 5 Minute";}elseif($row->game_id==4){echo "Wingo 10 Minute";}elseif($row->game_id==5){echo "Aviator";}elseif($row->game_id==6){echo "TRX 1 Minute";}elseif($row->game_id==7){echo "TRX 3 Minute";}elseif($row->game_id==8){echo "TRX 5 Minute";}elseif($row->game_id==9){echo "TRX 10 Minute";}elseif($row->game_id==10){echo "Dragon Tiger";}elseif($row->game_id==11){echo "Plinko";}elseif($row->game_id==12){echo "Mine Game";} ?></td>
						<td><?php echo e($row->games_no); ?></td>
                        <td><?php echo e($row->created_at); ?></td>
                       
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
<div class="container-fluid">
    <div class="row">
<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
          <div class="heading1 margin_0 d-flex">
             <h2>User Withdrawal</h2>
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
            

             <table id="examplesss" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>Amount</th>
                       <th>Status</th>
                      <th>Date time</th>
                      
                      
                   </tr>
                </thead>
                <tbody>
                    <?php $__currentLoopData = $withdrawal; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $rows): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <tr>
                        <td><?php echo e($rows->id); ?></td>
                        <td><?php echo e($rows->amount); ?></td>
                        <?php if($rows->status==1): ?>  
                      <td>
                        
                       
                          <button class="dropbtn" style="font-size:13px;">Pending</button>
                      
                      </td>
                     <?php elseif($rows->status==2): ?>
                     <td><button class="btn btn-success">Success</button></td>
                      <?php elseif($rows->status==3): ?>
                     <td><button class="btn btn-danger">Reject</button></td>
                      <?php else: ?>
                      <td>
                     
                      </td> 
                      <?php endif; ?>
                        <td><?php echo e($rows->created_at); ?></td>
                       
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
<div class="container-fluid">
    <div class="row">
<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
          <div class="heading1 margin_0 d-flex">
             <h2>User Diposite</h2>
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
            

             <table id="exampless" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>Amount</th>
                      <!--<th>number</th>-->
					   <th>Transaction </th>
					   <th>Status</th>
					   
                      <th>Date time</th>
                      
                      
                   </tr>
                </thead>
                <tbody>
                    <?php $__currentLoopData = $dipositess; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $rowtest): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <tr>
                        <td><?php echo e($rowtest->id); ?></td>
                        <td><?php echo e($rowtest->cash); ?></td>
						<td><?php echo e($rowtest->order_id); ?></td>
						  <?php if($rowtest->status==1): ?>  
                     
                        
                       
                         <td><button class="btn btn-warning">Pending</button></td>
                      
                     
                     <?php elseif($rowtest->status==2): ?>
                     <td><button class="btn btn-success">Success</button></td>
                      <?php elseif($rowtest->status==3): ?>
                     <td><button class="btn btn-danger">Reject</button></td>
                      <?php else: ?>
                      <td>
                     
                      </td> 
                      <?php endif; ?>
                        <td><?php echo e($rowtest->created_at); ?></td>
                       
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
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/user/user_detail.blade.php ENDPATH**/ ?>