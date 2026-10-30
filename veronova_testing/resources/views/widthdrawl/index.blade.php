@extends('admin.body.adminmaster')

@section('admin')

<style>
    @import url("https://fonts.googleapis.com/css?family=Montserrat:400,400i,700");
    
    th {
        white-space: nowrap;
        text-overflow: ellipsis;
    }
    
    td {
        white-space: nowrap;
        text-overflow: ellipsis;
    }
    
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
        }
    }
    
    /* Modal styling */
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
        cursor: pointer;
    }
    
    .dropdown-item:hover {
        background-color: #f8f9fa;
    }
</style>

<div class="container-fluid mt-5">
    <div class="row">
        @if ($errors->has('pin'))
            <div class="col-md-12">
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    {{ $errors->first('pin') }}
                    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
            </div>
        @endif

        @if(session('error'))
            <div class="col-md-12">
                <div class="alert alert-danger alert-dismissible fade show" role="alert">
                    {{ session('error') }}
                    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
            </div>
        @endif
        
        @if(session('Success'))
            <div class="col-md-12">
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    {{ session('Success') }}
                    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
            </div>
        @endif

        <div class="col-md-12">
            <div class="white_shd full margin_bottom_30">
                <div class="full graph_head">
                    <div class="heading1 margin_0 d-flex justify-content-between align-items-center">
                        <h2>Withdrawal List - 
                            @if($id == 1) Pending 
                            @elseif($id == 2) Approved 
                            @elseif($id == 3) Rejected 
                            @elseif($id == 4) Successful 
                            @elseif($id == 5) Failed 
                            @endif
                        </h2>
                        <div class="text-muted" style="margin-right:-1000px;">Total: {{ $widthdrawls->total() }} records</div>
                    </div>
                </div>
                <div class="table_section padding_infor_info">
                    <div class="table-responsive-sm">
                        <table class="table table-striped table-bordered" style="width:100%">
                            <thead class="thead-dark">
                                <tr>
                                    <th>Id</th>
                                    <th>User name</th>
                                    <th>User Id</th>
                                    <th>Bank Holder name</th>
                                    <th>Bank name</th>
                                    <th>Ac. No.</th>
                                    <th>IFSC</th>
                                    <th>UPI ID</th>
                                    <th>Amount</th>
                                    <th>Actual_amount</th>
                                    <th>Status</th>
                                    <th>Msg</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                @forelse($widthdrawls as $item)
                                    <tr>
                                        <td>{{ $item->id }}</td>
                                        <td>{{ $item->uname }}</td>
                                        <td>{{ $item->user_id }}</td>
                                        <td>{{ $item->name }}</td>
                                        <td>{{ $item->bname }}</td>
                                        <td>{{ $item->acno }}</td>
                                        <td>{{ $item->ifsc }}</td>
                                        <td>{{ $item->upi_id }}</td>
                                        <td>{{ number_format($item->amount, 2) }}</td>
                                        <td>{{ number_format($item->actual_amount, 2) }}</td>
                                        
                                        @if($item->status == 1)
                                            <td>
                                                <div class="dropdown" style="display: inline-block;">
                                                    <button class="btn btn-warning btn-sm dropdown-toggle" type="button" data-toggle="dropdown" style="font-size: 13px;">
                                                        Pending
                                                    </button>
                                                    <div class="dropdown-menu" style="min-width: 160px; font-size: 12px;">
                                                        <form action="{{ route('widthdraw.success', ['id' => $item->id]) }}" method="POST" onsubmit="return confirm('Are you sure to approve this withdrawal?');">
                                                            @csrf
                                                            <button type="submit" class="dropdown-item" style="background-color: green; color: white; border: none; width: 100%; text-align: left;">
                                                                Success
                                                            </button>
                                                        </form>
                                                        <a class="dropdown-item" data-toggle="modal" data-target="#rejectModal{{ $item->id }}" style="color: red;">
                                                            Reject
                                                        </a>
                                                    </div>
                                                </div>
                                            </td>
                                        @elseif($item->status == 2)
                                            <td><button class="btn btn-success btn-sm">Approved</button></td>
                                        @elseif($item->status == 3)
                                            <td><button class="btn btn-danger btn-sm">Reject</button></td>
                                        @elseif($item->status == 4)
                                            <td><button class="btn btn-success btn-sm">Successful</button></td>
                                        @elseif($item->status == 5)
                                            <td><button class="btn btn-danger btn-sm">Failed</button></td>
                                        @else
                                            <td></td>
                                        @endif
                                        
                                        <td>
                                            @if($item->status == 3)
                                                {{ $item->rejectmsg }}
                                            @elseif($item->status == 1)
                                                Pending
                                            @elseif($item->status == 2)
                                                Success
                                            @elseif($item->status == 4)
                                                Successful
                                            @elseif($item->status == 5)
                                                Failed
                                            @else
                                                -
                                            @endif
                                        </td>
                                        <td>{{ date('d-m-Y H:i:s', strtotime($item->created_at)) }}</td>
                                    </tr>

                                    <!-- Reject Modal -->
                                    <div class="modal fade" id="rejectModal{{ $item->id }}" tabindex="-1" role="dialog" aria-labelledby="rejectModalLabel{{ $item->id }}" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered" role="document">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title" id="rejectModalLabel{{ $item->id }}">Reject Withdrawal</h5>
                                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                        <span aria-hidden="true">&times;</span>
                                                    </button>
                                                </div>
                                                <form action="{{ route('widthdrawl.reject', ['id' => $item->id]) }}" method="POST">
                                                    @csrf
                                                    <div class="modal-body">
                                                        <div class="form-group">
                                                            <label for="msg_{{ $item->id }}">Reason for rejection</label>
                                                            <textarea class="form-control" id="msg_{{ $item->id }}" name="msg" rows="3" placeholder="Enter reason for rejection" required></textarea>
                                                            @error('msg')
                                                                <div class="alert alert-danger mt-2">{{ $message }}</div>
                                                            @enderror
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
                                        <td colspan="13" class="text-center">No records found</td>
                                    </tr>
                                @endforelse
                            </tbody>
                         </table>
                        
                        <!-- Custom Styled Pagination -->
                        @if($widthdrawls->total() > 0)
                            <div class="custom-pagination">
                                <div class="d-flex justify-content-between align-items-center flex-wrap">
                                    <div class="pagination-info">
                                        Showing {{ $widthdrawls->firstItem() }} to {{ $widthdrawls->lastItem() }} of {{ $widthdrawls->total() }} entries
                                    </div>
                                    <div>
                                        {{ $widthdrawls->appends(['id' => $id])->links('pagination::bootstrap-4') }}
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

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/popper.js@1.16.0/dist/umd/popper.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.4.1/dist/js/bootstrap.min.js"></script>

<script>
    $(document).ready(function() {
        // Auto-hide alerts after 5 seconds
        setTimeout(function() {
            $('.alert').fadeOut('slow', function() {
                $(this).remove();
            });
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
        
        // Fix dropdown z-index issue with modals
        $('.dropdown-toggle').on('click', function(e) {
            $('.dropdown-menu').css('z-index', '1050');
        });
    });
</script>

@endsection