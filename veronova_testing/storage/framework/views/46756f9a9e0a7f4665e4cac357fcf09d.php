<?php $__env->startSection('admin'); ?>
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" 
integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
 <form style="margin-top:200px;" method="post" action="<?php echo e(route('notification_store')); ?>">
   <?php echo csrf_field(); ?>
 
     
                                    <label for="accumulated_amount">Name</label>
                                    <input type="text" class="form-control" id="accumulated_amount" name="name" value="">  <br>
                            
                                  
     <label for="accumulated_amount">Description</label>
     <textarea class="form-control" id="editor" name="disc">
        
       </textarea><br>
      
     <button class="btn btn-primary" type="submit" style="float:right; margin-right:5%;">Submit</button>
 </form><br><br>
 
  
 
<script src="https://shoptriangle.in/public/assets/back-end/js/vendor.min.js"></script>

    
    <script src="https://shoptriangle.in/vendor/ckeditor/ckeditor/ckeditor.js"></script>
    <script src="https://shoptriangle.in/vendor/ckeditor/ckeditor/adapters/jquery.js"></script>
    <script>
        $('#editor').ckeditor({
            contentsLangDirection : 'ltr',
        });
    </script>
 <?php $__env->stopSection(); ?>
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/work_order_assign/add_notification.blade.php ENDPATH**/ ?>