@extends('admin.body.adminmaster')

@section('admin')

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

@if ($errors->has('pin'))
    <div class="alert alert-danger alert-dismissible fade show" role="alert">
        {{ $errors->first('pin') }}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    </div>
@endif

<div class="container-fluid">
    <div class="row">
        <div class="col-md-12">
            <div class="white_shd full margin_bottom_30">
                <div class="full graph_head">
    <div class="heading1 margin_0 d-flex justify-content-between align-items-center">
        <h2 class="mb-0">Deposit List - {{ $id == 1 ? 'Pending' : ($id == 2 ? 'Success' : 'Rejected') }}</h2>
        <div class="text-muted mb-0" style="font-size: 14px; font-weight: 500; margin-right:-1000px;">
            Total: {{ $deposits->total() }} records
        </div>
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
                                    <th width="8%">Amount</th>
                                    <th width="12%">Status</th>
                                    <th width="15%">Date</th>
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
                                        <td>
                                            @if($item->status == 1)
                                                <div class="dropdown">
                                                    <button class="btn btn-warning btn-sm dropdown-toggle" type="button" id="dropdownMenuButton{{ $item->id }}" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                                                        Pending
                                                    </button>
                                                    <div class="dropdown-menu" aria-labelledby="dropdownMenuButton{{ $item->id }}">
                                                        <a class="dropdown-item" data-toggle="modal" data-target="#successModal{{ $item->id }}" style="background-color: green; color: white;">
                                                            Success
                                                        </a>
                                                        <a class="dropdown-item" data-toggle="modal" data-target="#rejectModal{{ $item->id }}" style="background-color: Red; color: white;">
                                                            Reject
                                                        </a>
                                                    </div>
                                                </div>
                                            @elseif($item->status == 2)
                                                <button class="btn btn-success btn-sm">Success</button>
                                            @elseif($item->status == 3)
                                                <button class="btn btn-danger btn-sm">Reject</button>
                                            @else
                                                <span class="badge badge-secondary">Unknown Status</span>
                                            @endif
                                         </td>
                                        <td>{{ date('d-m-Y H:i:s', strtotime($item->created_at)) }}</td>
                                    </tr>

                                    <!-- Success Modal -->
                                    <div class="modal fade" id="successModal{{ $item->id }}" tabindex="-1" role="dialog" aria-labelledby="successModalLabel{{ $item->id }}" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered modal-sm" role="document">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title" id="successModalLabel{{ $item->id }}">Success Deposit</h5>
                                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                        <span aria-hidden="true">&times;</span>
                                                    </button>
                                                </div>
                                                <form action="{{ route('payin_success', $item->id) }}" method="POST">
                                                    @csrf
                                                    <div class="modal-body">
                                                        <div class="form-group">
                                                            <label for="pin_{{ $item->id }}">Please Enter PIN</label>
                                                            <input type="number" class="form-control" id="pin_{{ $item->id }}" name="pin" placeholder="Enter your PIN" required autocomplete="off">
                                                        </div>
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Close</button>
                                                        <button type="submit" class="btn btn-primary btn-sm">Submit</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Reject Modal -->
                                    <div class="modal fade" id="rejectModal{{ $item->id }}" tabindex="-1" role="dialog" aria-labelledby="rejectModalLabel{{ $item->id }}" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered" role="document">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title" id="rejectModalLabel{{ $item->id }}">Reject Deposit</h5>
                                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                        <span aria-hidden="true">&times;</span>
                                                    </button>
                                                </div>
                                                <form action="{{ route('deposit.reject', $item->id) }}" method="POST">
                                                    @csrf
                                                    <div class="modal-body">
                                                        <div class="form-group">
                                                            <label for="msg_{{ $item->id }}">Reason for rejection</label>
                                                            <textarea class="form-control" id="msg_{{ $item->id }}" name="msg" rows="3" placeholder="Enter reason for rejection" required></textarea>
                                                        </div>
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Close</button>
                                                        <button type="submit" class="btn btn-primary btn-sm">Submit</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                @empty
                                    <tr>
                                        <td colspan="7" class="text-center">No records found</td>
                                    </tr>
                                @endforelse
                            </tbody>
                        </table>
                        
                        <!-- Custom Styled Pagination -->
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
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

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
    
    /* Bootstrap 4 Pagination Styling */
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
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
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
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    }
    
    .page-item.active .page-link:hover {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        transform: translateY(-1px);
    }
    
    /* First and Last page items special styling */
    .page-item:first-child .page-link,
    .page-item:last-child .page-link {
        font-weight: 500;
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
        
        /* Make heading responsive on mobile */
        .full.graph_head .heading1 {
            flex-direction: column !important;
            align-items: flex-start !important;
        }
        
        .full.graph_head .heading1 .d-flex {
            flex-direction: column !important;
            align-items: flex-start !important;
        }
        
        .text-muted.ml-3 {
            margin-left: 0 !important;
            margin-top: 5px;
        }
    }
    
    /* Modal styling improvements */
    .modal-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }
    
    .modal-header .close {
        color: white;
        opacity: 1;
    }
    
    .modal-header .close:hover {
        color: white;
        opacity: 0.8;
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
    
    /* Button improvements */
    .btn-sm {
        font-size: 12px;
        padding: 5px 12px;
    }
    
    .dropdown-menu {
        min-width: 100px;
        padding: 5px 0;
    }
    
    .dropdown-item {
        font-size: 13px;
        padding: 6px 12px;
    }
    
    /* Alert animations */
    .alert {
        animation: slideDown 0.5s ease;
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
</style>

<!-- Scripts -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

<script>
    $(document).ready(function() {
        // Auto-hide alerts after 5 seconds
        setTimeout(function() {
            $('.alert').fadeOut('slow');
        }, 5000);
        
        // Clear modal input fields when closed
        $('.modal').on('hidden.bs.modal', function () {
            $(this).find('form')[0].reset();
        });
        
        // Add smooth loading effect on pagination click
        $(document).on('click', '.pagination a', function(e) {
            e.preventDefault();
            var url = $(this).attr('href');
            if(url) {
                $('body').css('opacity', '0.5');
                window.location.href = url;
            }
        });
    });
</script>

@endsection