@extends('admin.body.adminmaster')

@section('admin')

<!-- SweetAlert2 -->
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<div class="container-fluid">
    <div class="row">
        <div class="col-md-12">
            @if(session('success'))
                <div class="alert alert-success">{{ session('success') }}</div>
            @endif
            @if(session('error'))
                <div class="alert alert-danger">{{ session('error') }}</div>
            @endif

            <div class="white_shd full margin_bottom_30">
                <div class="full graph_head">
                    <div class="heading1 margin_0 d-flex justify-content-between">
                        <h2>Delete Withdraw Bank Account Requests</h2>
                    </div>
                </div>
                <div class="table_section padding_infor_info">
                    <div class="table-responsive-sm">
                        <table id="example" class="table table-striped" style="width:100%">
                            <thead class="thead-dark">
                                <tr>
                                    <th>ID</th>
                                    <th>User ID</th>
                                    <th>Account No</th>
                                    <th>IFSC</th>
                                    <th>Passbook</th>
                                    <th>Identity Card</th>
                                    <th>Deposit Proof</th>
                                    <th>Status / Action</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($data as $item)
                                <tr>
                                    <td>{{ $item->id }}</td>
                                    <td>{{ $item->user_id }}</td>
                                    <td>{{ $item->account_no }}</td>
                                    <td>{{ $item->ifsc_code }}</td>
                                    <td><img src="{{ asset($item->passbook_photo) }}" width="50" height="50" onclick="showImage(this)" style="cursor: zoom-in;"></td>
                                    <td><img src="{{ asset($item->identity_card_photo) }}" width="50" height="50" onclick="showImage(this)" style="cursor: zoom-in;"></td>
                                    <td><img src="{{ asset($item->last_deposit_proof) }}" width="50" height="50" onclick="showImage(this)" style="cursor: zoom-in;"></td>
                                    <td>
                                        @if($item->status == 1)
                                            <span class="badge badge-success">Approved</span>
                                        @elseif($item->status == 2)
                                                  <span class="badge badge-danger">Rejected</span>
                                    <div class="bg-light border rounded text-dark" 
                                         style="font-size: 13px; max-height:50px; overflow-y: auto; word-wrap: break-word; white-space: pre-wrap; width: 250px;">
                                        {{ $item->remark }}
                                    </div>

                                        @else
                                            <div class="dropdown">
                                                <button class="btn btn-sm btn-primary dropdown-toggle" type="button" data-toggle="dropdown">
                                                    Action
                                                </button>
                                                <div class="dropdown-menu">
                                                    <a class="dropdown-item text-success" href="#" onclick="confirmApproval({{ $item->id }})">Approve</a>
                                                    <a class="dropdown-item text-danger" href="#" onclick="openRejectModal({{ $item->id }})">Reject</a>
                                                </div>
                                            </div>
                                        @endif
                                    </td>
                                    <td>{{ \Carbon\Carbon::parse($item->created_at)->format('d-m-Y H:i') }}</td>
                                </tr>
                                @endforeach
                            </tbody>
                        </table>

                        <!-- Hidden Approve Form -->
                        <form id="approvalForm" method="POST" style="display: none;">
                            @csrf
                            <input type="hidden" name="id" id="approvalId">
                            <input type="hidden" name="action_type" value="approve">
                        </form>

                        <!-- Hidden Reject Form -->
                        <form id="rejectForm" method="POST">
                            @csrf
                            <input type="hidden" name="id" id="rejectId">
                            <input type="hidden" name="action_type" value="reject">

                            <!-- Reject Modal -->
                            <div class="modal fade" id="rejectModal" tabindex="-1" role="dialog" aria-labelledby="rejectModalLabel" aria-hidden="true">
                                <div class="modal-dialog modal-dialog-centered" role="document">
                                    <div class="modal-content">
                                        <div class="modal-header">
                                            <h5 class="modal-title" id="rejectModalLabel">Reject Request</h5>
                                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                <span aria-hidden="true">&times;</span>
                                            </button>
                                        </div>
                                        <div class="modal-body">
                                            <label for="remark">Reason</label>
                                            <textarea name="reason" id="remark" class="form-control" required></textarea>
                                        </div>
                                        <div class="modal-footer">
                                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                                            <button type="submit" class="btn btn-danger">Reject</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>

                        <!-- Image Zoom Preview -->
                        <div id="imagePreview" class="image-preview" onclick="hideImage()">
                            <button class="close-btn" onclick="hideImage(event)">×</button>
                            <img id="previewImg" src="" alt="Preview Image">
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    .image-preview {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        z-index: 9999;
        background: rgba(0, 0, 0, 0.85);
        width: 100%;
        height: 100%;
        align-items: center;
        justify-content: center;
    }

    .image-preview.active {
        display: flex;
    }

    .image-preview img {
        max-width: 90%;
        max-height: 90%;
    }

    .image-preview .close-btn {
        position: absolute;
        top: 20px;
        right: 30px;
        font-size: 30px;
        color: white;
        background: transparent;
        border: none;
    }
</style>

<script>
    function showImage(imgElement) {
        document.getElementById("previewImg").src = imgElement.src;
        document.getElementById("imagePreview").classList.add("active");
    }

    function hideImage(event) {
        if (event) event.stopPropagation();
        document.getElementById("imagePreview").classList.remove("active");
        document.getElementById("previewImg").src = '';
    }

    function confirmApproval(id) {
        Swal.fire({
            title: 'Are you sure?',
            text: "Do you want to approve this request?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, Approve',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                const form = document.getElementById('approvalForm');
                form.action = `/admin/bank-account-change-status/${id}`;
                document.getElementById('approvalId').value = id;
                form.submit();
            }
        });
    }

    function openRejectModal(id) {
        const form = document.getElementById('rejectForm');
        form.action = `/admin/bank-account-change-status/${id}`;
        document.getElementById('rejectId').value = id;
        document.getElementById('remark').value = '';
        $('#rejectModal').modal('show');
    }

    $(document).ready(function () {
        $('.modal').on('click', '[data-dismiss="modal"]', function () {
            $(this).closest('.modal').modal('hide');
        });
    });
</script>

<!-- jQuery -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

<!-- Bootstrap Bundle (includes Popper) -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.2/dist/js/bootstrap.bundle.min.js"></script>

@endsection
