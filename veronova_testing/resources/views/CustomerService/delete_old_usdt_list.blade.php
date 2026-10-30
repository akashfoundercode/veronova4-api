@extends('admin.body.adminmaster')

@section('admin')
<style>
    table thead th,
    table tbody td {
        white-space: nowrap;
    }

    .image-preview {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.85);
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }

    .image-preview.active {
        display: flex;
    }

    .image-preview img {
        max-width: 90%;
        max-height: 90%;
        border-radius: 10px;
        box-shadow: 0 0 15px #000;
        border: 2px solid green;
    }

    .close-btn {
        position: absolute;
        top: 20px;
        right: 30px;
        background: transparent;
        border: none;
        font-size: 40px;
        color: #fff;
        cursor: pointer;
        z-index: 10000;
    }

    .close-btn:hover {
        color: #ff6666;
    }
</style>

<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<div class="container-fluid mt-5">
    <h3 class="mb-3">Delete Old USDT Address - Verifications</h3>

    @if(session('success'))
        <div class="alert alert-success">{{ session('success') }}</div>
    @endif

    <div class="table-responsive">
        <table class="table table-bordered table-striped">
            <thead class="table-dark">
                <tr>
                    <th>ID</th>
                    <th>User ID</th>
                    <th>USDT Address</th>
                    <th>Identity Card</th>
                    <th>Deposit Receipt</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                @foreach($data as $item)
                <tr>
                    <td>{{ $item->id }}</td>
                    <td>{{ $item->user_id }}</td>
                    <td><img src="{{ asset($item->photo_usdt_address) }}" width="50" onclick="showImage(this)"></td>
                    <td><img src="{{ asset($item->photo_identity_card) }}" width="50" onclick="showImage(this)"></td>
                    <td><img src="{{ asset($item->deposit_receipt_proof) }}" width="50" onclick="showImage(this)"></td>
                    <td>
                        @if($item->status == 'approved')
                            <span class="badge bg-success">Approved</span>
                        @elseif($item->status == 'rejected')
                            <span class="badge bg-danger">Rejected</span>
                        @else
                            <span class="badge bg-warning text-dark">Pending</span>
                        @endif
                    </td>
                    <td>{{ \Carbon\Carbon::parse($item->created_at)->format('d-m-Y H:i') }}</td>
                    <td>
                        @if($item->status == 'pending')
                        <button class="btn btn-sm btn-success" onclick="approveUsdt({{ $item->id }})">Approve</button>
                        @else
                        <button class="btn btn-sm btn-secondary" disabled>Done</button>
                        @endif
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <form id="usdtApproveForm" method="POST" style="display: none;">
            @csrf
        </form>
    </div>
</div>

<!-- Image Fullscreen Preview -->
<div id="imagePreview" class="image-preview" onclick="hideImage()">
    <button class="close-btn" onclick="hideImage(event)">×</button>
    <img id="previewImg" src="" alt="Preview Image">
</div>

<script>
function approveUsdt(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You want to approve this record?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Approve'
    }).then((result) => {
        if (result.isConfirmed) {
            let form = document.getElementById('usdtApproveForm');
            form.action = '/admin/usdt-approve-old/' + id;
            form.submit();
        }
    });
}

function showImage(imgElement) {
    const imagePreview = document.getElementById("imagePreview");
    const previewImg = document.getElementById("previewImg");

    previewImg.src = imgElement.src;
    imagePreview.classList.add("active");
}

function hideImage(event) {
    event.stopPropagation();
    document.getElementById("imagePreview").classList.remove("active");
    document.getElementById("previewImg").src = '';
}
</script>
@endsection
