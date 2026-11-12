<?php $__env->startSection('admin'); ?>

<style>
    .banner-card {
        transition: transform 0.3s, box-shadow 0.3s;
    }
    .banner-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.1);
    }
    .image-preview {
        max-width: 100px;
        max-height: 100px;
        border-radius: 8px;
        border: 1px solid #ddd;
        padding: 5px;
        background: #f8f9fa;
    }
    .btn-icon {
        margin: 0 3px;
        transition: all 0.3s;
    }
    .btn-icon:hover {
        transform: scale(1.05);
    }
    .modal-header.bg-primary-custom {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    .table-wrapper {
        background: white;
        border-radius: 15px;
        overflow: hidden;
        box-shadow: 0 5px 20px rgba(0,0,0,0.05);
    }
    .btn-add-banner {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 10px 25px;
        border-radius: 25px;
        border: none;
        transition: all 0.3s;
    }
    .btn-add-banner:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(102,126,234,0.4);
        color: white;
    }
    .status-badge {
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }
    .status-active {
        background: #d4edda;
        color: #155724;
    }
    .status-inactive {
        background: #f8d7da;
        color: #721c24;
    }
    .action-buttons {
        display: flex;
        gap: 8px;
    }
    .btn-sm-custom {
        padding: 6px 12px;
        font-size: 12px;
        border-radius: 6px;
    }
    .file-input-wrapper {
        position: relative;
        overflow: hidden;
        display: inline-block;
    }
    .file-input-wrapper input[type=file] {
        position: absolute;
        left: 0;
        top: 0;
        opacity: 0;
        width: 100%;
        height: 100%;
        cursor: pointer;
    }
    .custom-file-btn {
        background: #f0f0f0;
        border: 1px dashed #ccc;
        padding: 8px 15px;
        border-radius: 6px;
        display: inline-block;
        cursor: pointer;
        transition: all 0.3s;
    }
    .custom-file-btn:hover {
        background: #e0e0e0;
        border-color: #667eea;
    }
    .current-image {
        background: #f8f9fa;
        padding: 10px;
        border-radius: 8px;
        margin-top: 10px;
        text-align: center;
    }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .table-row {
        animation: fadeIn 0.5s ease-out;
    }
    .search-box {
        border-radius: 25px;
        padding: 8px 20px;
        border: 1px solid #ddd;
        width: 300px;
    }
    .search-box:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 0.2rem rgba(102,126,234,0.25);
    }
</style>

<div class="container-fluid px-4">
    <!-- Header Section -->
    <div class="row mb-4">
        <div class="col-12">
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h2 class="mb-1" style="color: #333; font-weight: 600;">
                        <i class="fa fa-image mr-2" style="color: #667eea;"></i>
                        Banner Management
                    </h2>
                    <p class="text-muted">Manage your banners and activity images</p>
                </div>
                <button type="button" class="btn btn-add-banner" data-toggle="modal" data-target="#exampleModalCenter">
                    <i class="fa fa-plus mr-2"></i>Add New Banner
                </button>
            </div>
        </div>
    </div>

    <!-- Alert Messages -->
    <?php if(session('success')): ?>
        <div class="alert alert-success alert-dismissible fade show shadow-sm" role="alert" style="border-left: 4px solid #28a745;">
            <i class="fa fa-check-circle mr-2"></i>
            <?php echo e(session('success')); ?>

            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    <?php endif; ?>

    <?php if(session('error')): ?>
        <div class="alert alert-danger alert-dismissible fade show shadow-sm" role="alert" style="border-left: 4px solid #dc3545;">
            <i class="fa fa-exclamation-circle mr-2"></i>
            <?php echo e(session('error')); ?>

            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    <?php endif; ?>

    <!-- Search and Filter Bar -->
    <div class="row mb-3">
        <div class="col-md-6">
            <div class="input-group">
                <div class="input-group-prepend">
                    <span class="input-group-text bg-white border-right-0">
                        <i class="fa fa-search text-muted"></i>
                    </span>
                </div>
                <input type="text" id="searchInput" class="form-control search-box" placeholder="Search by title..." style="border-left: none;">
            </div>
        </div>
        <div class="col-md-6 text-right">
            <span class="text-muted">
                <i class="fa fa-database"></i> Total Banners: <strong id="totalCount"><?php echo e(count($banner)); ?></strong>
            </span>
        </div>
    </div>

    <!-- Table Section -->
    <div class="table-wrapper">
        <div class="table-responsive">
            <table class="table table-hover mb-0" id="bannerTable">
                <thead style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 20%;">Title</th>
                        <th style="width: 25%;">Banner Image</th>
                        <th style="width: 25%;">Activity Image</th>
                        <th style="width: 15%;">Status</th>
                        <th style="width: 10%;">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php $__currentLoopData = $banner; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                    <tr class="table-row">
                        <td class="align-middle"><?php echo e($index + 1); ?></td>
                        <td class="align-middle">
                            <strong><?php echo e($item->title); ?></strong>
                        </td>
                        <td class="align-middle">
                            <?php if($item->image && file_exists(public_path($item->image))): ?>
                                <div class="current-image">
                                    <img src="<?php echo e(asset($item->image)); ?>" class="image-preview" alt="Banner Image">
                                    <div class="mt-1">
                                        <small class="text-muted"><?php echo e(basename($item->image)); ?></small>
                                    </div>
                                </div>
                            <?php else: ?>
                                <div class="text-center text-muted">
                                    <i class="fa fa-image fa-2x"></i>
                                    <p class="mb-0">No Image</p>
                                </div>
                            <?php endif; ?>
                        </td>
                        <td class="align-middle">
                            <?php if($item->activity_image && file_exists(public_path($item->activity_image))): ?>
                                <div class="current-image">
                                    <img src="<?php echo e(asset($item->activity_image)); ?>" class="image-preview" alt="Activity Image">
                                    <div class="mt-1">
                                        <small class="text-muted"><?php echo e(basename($item->activity_image)); ?></small>
                                    </div>
                                </div>
                            <?php else: ?>
                                <div class="text-center text-muted">
                                    <i class="fa fa-file-image-o fa-2x"></i>
                                    <p class="mb-0">No Image</p>
                                </div>
                            <?php endif; ?>
                        </td>
                        <td class="align-middle">
                            <span class="status-badge status-active">
                                <i class="fa fa-check-circle"></i> Active
                            </span>
                        </td>
                        <td class="align-middle">
                            <div class="action-buttons">
                                <button class="btn btn-sm btn-primary btn-sm-custom" data-toggle="modal" data-target="#editModal<?php echo e($item->id); ?>" title="Edit">
                                    <i class="fa fa-edit"></i>
                                </button>
                                <a href="<?php echo e(route('banner.delete',$item->id)); ?>" class="btn btn-sm btn-danger btn-sm-custom" onclick="return confirm('Are you sure you want to delete this banner?')" title="Delete">
                                    <i class="fa fa-trash"></i>
                                </a>
                            </div>
                        </td>
                    </tr>

                    <!-- Edit Modal - Styled -->
                    <div class="modal fade" id="editModal<?php echo e($item->id); ?>" tabindex="-1" role="dialog">
                        <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
                            <div class="modal-content shadow-lg">
                                <div class="modal-header bg-primary-custom">
                                    <h5 class="modal-title">
                                        <i class="fa fa-edit mr-2"></i>Edit Banner
                                    </h5>
                                    <button type="button" class="close text-white" data-dismiss="modal">
                                        <span>&times;</span>
                                    </button>
                                </div>
                                <form action="<?php echo e(route('banner.update',$item->id)); ?>" method="POST" enctype="multipart/form-data">
                                    <?php echo csrf_field(); ?>
                                    <?php echo method_field('PUT'); ?>
                                    <div class="modal-body">
                                        <div class="row">
                                            <div class="col-md-12">
                                                <div class="form-group">
                                                    <label><i class="fa fa-tag mr-1"></i> Title <span class="text-danger">*</span></label>
                                                    <input type="text" class="form-control" name="title" value="<?php echo e($item->title); ?>" required placeholder="Enter banner title">
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div class="row">
                                            <div class="col-md-6">
                                                <div class="form-group">
                                                    <label><i class="fa fa-image mr-1"></i> Banner Image</label>
                                                    <?php if($item->image && file_exists(public_path($item->image))): ?>
                                                        <div class="current-image mb-2">
                                                            <img src="<?php echo e(asset($item->image)); ?>" class="image-preview" alt="Current Banner">
                                                            <p class="text-muted small mt-2 mb-0">Current Image</p>
                                                        </div>
                                                    <?php endif; ?>
                                                    <div class="custom-file-btn">
                                                        <i class="fa fa-upload"></i> Choose New Image
                                                        <input type="file" name="image" accept="image/*">
                                                    </div>
                                                    <small class="form-text text-muted">
                                                        <i class="fa fa-info-circle"></i> Leave empty to keep current image. Max size: 2MB
                                                    </small>
                                                </div>
                                            </div>
                                            
                                            <div class="col-md-6">
                                                <div class="form-group">
                                                    <label><i class="fa fa-file-image-o mr-1"></i> Activity Image</label>
                                                    <?php if($item->activity_image && file_exists(public_path($item->activity_image))): ?>
                                                        <div class="current-image mb-2">
                                                            <img src="<?php echo e(asset($item->activity_image)); ?>" class="image-preview" alt="Current Activity">
                                                            <p class="text-muted small mt-2 mb-0">Current Image</p>
                                                        </div>
                                                    <?php endif; ?>
                                                    <div class="custom-file-btn">
                                                        <i class="fa fa-upload"></i> Choose New Image
                                                        <input type="file" name="activity_image" accept="image/*">
                                                    </div>
                                                    <small class="form-text text-muted">
                                                        <i class="fa fa-info-circle"></i> Leave empty to keep current image. Max size: 2MB
                                                    </small>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="modal-footer">
                                        <button type="button" class="btn btn-secondary" data-dismiss="modal">
                                            <i class="fa fa-times"></i> Cancel
                                        </button>
                                        <button type="submit" class="btn btn-primary">
                                            <i class="fa fa-save"></i> Update Banner
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Add Banner Modal - Styled -->
<div class="modal fade" id="exampleModalCenter" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
        <div class="modal-content shadow-lg">
            <div class="modal-header bg-primary-custom">
                <h5 class="modal-title">
                    <i class="fa fa-plus-circle mr-2"></i>Add New Banner
                </h5>
                <button type="button" class="close text-white" data-dismiss="modal">
                    <span>&times;</span>
                </button>
            </div>
            <form action="<?php echo e(route('banner.store')); ?>" method="POST" enctype="multipart/form-data" id="addBannerForm">
                <?php echo csrf_field(); ?>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-12">
                            <div class="form-group">
                                <label><i class="fa fa-tag mr-1"></i> Title <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="title" name="title" required placeholder="Enter banner title">
                                <small class="form-text text-muted">Give a descriptive title for your banner</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label><i class="fa fa-image mr-1"></i> Banner Image <span class="text-danger">*</span></label>
                                <div class="custom-file-btn" id="bannerImageBtn">
                                    <i class="fa fa-cloud-upload"></i> Choose Banner Image
                                    <input type="file" name="image" accept="image/*" required onchange="previewImage(this, 'bannerPreview')">
                                </div>
                                <div id="bannerPreview" class="mt-2" style="display: none;">
                                    <img class="image-preview" id="bannerPreviewImg">
                                </div>
                                <small class="form-text text-muted">
                                    <i class="fa fa-info-circle"></i> Supported: JPG, PNG, GIF, WEBP (Max: 2MB)
                                </small>
                            </div>
                        </div>
                        
                        <div class="col-md-6">
                            <div class="form-group">
                                <label><i class="fa fa-file-image-o mr-1"></i> Activity Image <span class="text-danger">*</span></label>
                                <div class="custom-file-btn" id="activityImageBtn">
                                    <i class="fa fa-cloud-upload"></i> Choose Activity Image
                                    <input type="file" name="activity_image" accept="image/*" required onchange="previewImage(this, 'activityPreview')">
                                </div>
                                <div id="activityPreview" class="mt-2" style="display: none;">
                                    <img class="image-preview" id="activityPreviewImg">
                                </div>
                                <small class="form-text text-muted">
                                    <i class="fa fa-info-circle"></i> Supported: JPG, PNG, GIF, WEBP (Max: 2MB)
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">
                        <i class="fa fa-times"></i> Close
                    </button>
                    <button type="submit" class="btn btn-primary" id="submitBtn">
                        <i class="fa fa-check-circle"></i> Add Banner
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>

<script>
// Image preview function
function previewImage(input, previewId) {
    if (input.files && input.files[0]) {
        var reader = new FileReader();
        reader.onload = function(e) {
            var preview = document.getElementById(previewId);
            var previewImg = document.getElementById(previewId + 'Img');
            if (previewImg) {
                previewImg.src = e.target.result;
                preview.style.display = 'block';
            }
        }
        reader.readAsDataURL(input.files[0]);
    }
}

// Search functionality
document.getElementById('searchInput').addEventListener('keyup', function() {
    var searchValue = this.value.toLowerCase();
    var table = document.getElementById('bannerTable');
    var rows = table.getElementsByTagName('tr');
    var visibleCount = 0;
    
    for (var i = 1; i < rows.length; i++) {
        var row = rows[i];
        var titleCell = row.getElementsByTagName('td')[1];
        if (titleCell) {
            var titleText = titleCell.textContent || titleCell.innerText;
            if (titleText.toLowerCase().indexOf(searchValue) > -1) {
                row.style.display = '';
                visibleCount++;
            } else {
                row.style.display = 'none';
            }
        }
    }
    
    document.getElementById('totalCount').innerText = visibleCount;
});

// Auto hide alerts after 5 seconds
setTimeout(function() {
    $('.alert').fadeOut('slow');
}, 5000);

// Form validation and loading state
document.getElementById('addBannerForm')?.addEventListener('submit', function() {
    var submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Adding...';
});

// Tooltip initialization
$(document).ready(function() {
    $('[title]').tooltip();
    
    // Custom file input styling
    $('.custom-file-btn').click(function() {
        $(this).find('input[type=file]').click();
    });
    
    // Show file name when selected
    $('input[type=file]').change(function(e) {
        var fileName = e.target.files[0]?.name;
        if (fileName) {
            $(this).parent().find('.file-name').remove();
            $(this).parent().append('<span class="file-name ml-2 text-success"><i class="fa fa-check"></i> ' + fileName + '</span>');
        }
    });
});
</script>

<?php $__env->stopSection(); ?>
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/banner/index.blade.php ENDPATH**/ ?>