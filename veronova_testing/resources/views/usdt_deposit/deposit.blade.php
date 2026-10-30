@extends('admin.body.adminmaster')

@section('admin')

<style>
    /* Custom Pagination Styles */
    .custom-pagination {
        margin-top: 20px;
        padding: 15px 10px;
        background: #f8f9fa;
        border-radius: 8px;
    }
    
    .pagination-info {
        color: #6c757d;
        font-size: 14px;
        font-weight: 500;
    }
    
    .pagination {
        margin-bottom: 0;
        flex-wrap: wrap;
    }
    
    .page-item {
        margin: 0 2px;
    }
    
    .page-item .page-link {
        border-radius: 6px !important;
        padding: 8px 14px;
        color: #007bff;
        background-color: #fff;
        border: 1px solid #dee2e6;
        transition: all 0.3s ease;
        font-size: 14px;
    }
    
    .page-item.active .page-link {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-color: #667eea;
        color: white;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    
    .page-item.disabled .page-link {
        color: #6c757d;
        background-color: #fff;
        border-color: #dee2e6;
        opacity: 0.6;
    }
    
    .page-item:not(.disabled) .page-link:hover {
        background-color: #e9ecef;
        border-color: #dee2e6;
        transform: translateY(-1px);
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    }
    
    /* Modal styling */
    .modal-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    
    .modal-header .close,
    .modal-header .btn-close {
        color: white;
        opacity: 1;
    }
    
    .modal-header .close:hover,
    .modal-header .btn-close:hover {
        color: white;
        opacity: 0.8;
    }
    
    /* Alert animations */
    .alert {
        animation: slideDown 0.5s ease;
        margin-bottom: 20px;
    }
    
    @keyframes slideDown {
        from {
            transform: translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateY(0);
            opacity: 1;
        }
    }
    
    /* Table styling */
    .table {
        font-size: 14px;
    }
    
    .table thead th {
        background-color: #343a40;
        color: white;
        border-bottom: none;
        vertical-align: middle;
    }
    
    .table tbody tr:hover {
        background-color: #f8f9fa;
        transition: background-color 0.3s ease;
    }
    
    /* Thumbnail styling */
    .thumbnail-img {
        width: 60px;
        height: 60px;
        object-fit: cover;
        cursor: pointer;
        border-radius: 8px;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .thumbnail-img:hover {
        transform: scale(1.05);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    /* Button improvements */
    .btn-sm {
        font-size: 12px;
        padding: 5px 12px;
    }
    
    .dropdown-menu {
        min-width: 150px;
        padding: 5px 0;
    }
    
    .dropdown-item {
        font-size: 13px;
        padding: 6px 12px;
        cursor: pointer;
    }
    
    .dropdown-item:hover {
        background-color: #f8f9fa;
    }
    
    /* Responsive design */
    @media (max-width: 768px) {
        .custom-pagination .d-flex {
            flex-direction: column;
            gap: 15px;
            align-items: center !important;
        }
        
        .page-item .page-link {
            padding: 6px 10px;
            font-size: 12px;
        }
        
        .pagination-info {
            font-size: 12px;
            text-align: center;
        }
        
        .table-responsive-sm {
            overflow-x: auto;
        }
        
        th, td {
            font-size: 12px;
            white-space: nowrap;
        }
        
        .thumbnail-img {
            width: 40px;
            height: 40px;
        }
    }
    
    /* Loading overlay */
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 9999;
        display: none;
        justify-content: center;
        align-items: center;
    }
    
    .loading-spinner {
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
</style>

<div class="container-fluid mt-2">
    @if(session('success'))
        <div class="alert alert-success alert-dismissible fade show" role="alert">
            {{ session('success') }}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    @endif

    @if(session('error'))
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            {{ session('error') }}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    @endif
    
    <div class="row">
        <div class="col-md-12">
            <div class="white_shd full margin_bottom_30">
                <div class="full graph_head">
                    <div class="heading1 margin_0 d-flex justify-content-between align-items-center">
                        <h2>USDT Deposit List - 
                            @if($id == 1) Pending 
                            @elseif($id == 2) Success 
                            @elseif($id == 3) Rejected 
                            @endif
                        </h2>
                        <div class="text-muted" style="margin-right:-1000px;">Total: {{ $deposits->total() }} records</div>
                    </div>
                </div>

                <div class="table_section padding_infor_info">
                    <div class="table-responsive-sm">
                        <table class="table table-striped table-bordered" style="width:100%">
                            <thead class="thead-dark">
                                <tr>
                                    <th width="5%">Id</th>
                                    <th width="8%">User Id</th>
                                    <th width="12%">User Name</th>
                                    <th width="15%">Order Id</th>
                                    <th width="10%">INR Amount</th>
                                    <th width="10%">USDT Amount</th>
                                    <th width="10%">Screenshot</th>
                                    <th width="12%">Status</th>
                                    <th width="18%">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                @forelse($deposits as $item)
                                <tr>
                                    <td>{{ $item->id }}</td>
                                    <td>{{ $item->userid }}</td>
                                    <td>{{ $item->uname }}</td>
                                    <td>{{ $item->order_id }}</td>
                                    <td>{{ number_format($item->cash, 2) }}</td>
                                    <td>{{ number_format($item->usdt_amount, 2) }}</td>
                                    <td class="text-center">
                                        @if($item->screenshot)
                                            <img src="{{ 'https://root.bdgcassino.com/'.$item->screenshot }}" 
                                                 alt="screenshot" 
                                                 class="thumbnail-img"
                                                 data-toggle="modal" 
                                                 data-target="#imageModal{{ $item->id }}">
                                        @else
                                            <span class="text-muted">No image</span>
                                        @endif
                                    </td>
                                    <td>
                                        @if($item->status == 1)
                                            <div class="dropdown">
                                                <button class="btn btn-warning btn-sm dropdown-toggle" type="button" data-toggle="dropdown" aria-expanded="false">
                                                    Pending
                                                </button>
                                                <div class="dropdown-menu">
                                                    <form method="POST" action="{{ route('payin.update.status') }}">
                                                        @csrf
                                                        <input type="hidden" name="id" value="{{ $item->id }}">
                                                        <input type="hidden" name="userid" value="{{ $item->userid }}">
                                                        <input type="hidden" name="status" value="2">
                                                        <button type="submit" class="dropdown-item text-success">
                                                            <i class="fas fa-check"></i> Mark as Success
                                                        </button>
                                                    </form>
                                                    <form method="POST" action="{{ route('payin.update.status') }}">
                                                        @csrf
                                                        <input type="hidden" name="id" value="{{ $item->id }}">
                                                        <input type="hidden" name="userid" value="{{ $item->userid }}">
                                                        <input type="hidden" name="status" value="3">
                                                        <button type="submit" class="dropdown-item text-danger">
                                                            <i class="fas fa-times"></i> Mark as Reject
                                                        </button>
                                                    </form>
                                                </div>
                                            </div>
                                        @elseif($item->status == 2)
                                            <button class="btn btn-success btn-sm">Success</button>
                                        @elseif($item->status == 3)
                                            <button class="btn btn-danger btn-sm">Reject</button>
                                        @else
                                            <span class="badge badge-secondary">Unknown</span>
                                        @endif
                                    </td>
                                    <td>{{ date('d-m-Y H:i:s', strtotime($item->created_at)) }}</td>
                                </tr>

                                <!-- Image Modal -->
                                <div class="modal fade" id="imageModal{{ $item->id }}" tabindex="-1" aria-labelledby="imageModalLabel{{ $item->id }}" aria-hidden="true">
                                    <div class="modal-dialog modal-dialog-centered modal-lg">
                                        <div class="modal-content">
                                            <div class="modal-header">
                                                <h5 class="modal-title" id="imageModalLabel{{ $item->id }}">Screenshot - Order #{{ $item->order_id }}</h5>
                                                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                    <span aria-hidden="true">&times;</span>
                                                </button>
                                            </div>
                                            <div class="modal-body text-center">
                                                @if($item->screenshot)
                                                    <img src="{{ 'https://root.bdgcassino.com/'.$item->screenshot }}" 
                                                         alt="screenshot full" 
                                                         class="img-fluid" 
                                                         style="max-height: 500px; max-width: 100%;">
                                                @else
                                                    <p class="text-muted">No screenshot available</p>
                                                @endif
                                            </div>
                                            <div class="modal-footer">
                                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                                                <a href="{{ 'https://root.bdgcassino.com/'.$item->screenshot }}" 
                                                   target="_blank" 
                                                   class="btn btn-primary">View Full Size</a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                @empty
                                <tr>
                                    <td colspan="9" class="text-center">
                                        <div class="alert alert-info mb-0">
                                            No records found for USDT deposits with status {{ $id == 1 ? 'Pending' : ($id == 2 ? 'Success' : 'Rejected') }}
                                        </div>
                                    </td>
                                </tr>
                                @endforelse
                            </tbody>
                        </table>
                        
                        <!-- Custom Styled Pagination -->
                        @if($deposits->total() > 0)
                            <div class="custom-pagination">
                                <div class="d-flex justify-content-between align-items-center flex-wrap">
                                    <div class="pagination-info">
                                        Showing {{ $deposits->firstItem() }} to {{ $deposits->lastItem() }} of {{ $deposits->total() }} entries
                                    </div>
                                    <div>
                                        {{ $deposits->appends(['id' => $id])->links('pagination::bootstrap-4') }}
                                    </div>
                                </div>
                            </div>
                        @endif
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- Loading Overlay -->
<div class="loading-overlay" id="loadingOverlay">
    <div class="loading-spinner"></div>
</div>

<!-- Scripts -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

<script>
    $(document).ready(function() {
        // Auto-hide alerts after 5 seconds
        setTimeout(function() {
            $('.alert').fadeOut('slow', function() {
                $(this).remove();
            });
        }, 5000);
        
        // Add smooth loading effect on pagination click
        $(document).on('click', '.pagination a', function(e) {
            e.preventDefault();
            var url = $(this).attr('href');
            if(url) {
                $('#loadingOverlay').fadeIn();
                window.location.href = url;
            }
        });
        
        // Show loading on form submit
        $('form').on('submit', function() {
            $('#loadingOverlay').fadeIn();
        });
        
        // Fix dropdown z-index issue with modals
        $('.dropdown-toggle').on('click', function(e) {
            $('.dropdown-menu').css('z-index', '1050');
        });
        
        // Confirm before status change
        $('.dropdown-item.text-success').on('click', function(e) {
            if(!confirm('Are you sure you want to mark this as SUCCESS?')) {
                e.preventDefault();
                return false;
            }
        });
        
        $('.dropdown-item.text-danger').on('click', function(e) {
            if(!confirm('Are you sure you want to mark this as REJECTED?')) {
                e.preventDefault();
                return false;
            }
        });
        
        // Image modal enhancement - clear on close
        $('.modal').on('hidden.bs.modal', function () {
            $(this).find('img').removeAttr('style');
        });
    });
</script>

@endsection