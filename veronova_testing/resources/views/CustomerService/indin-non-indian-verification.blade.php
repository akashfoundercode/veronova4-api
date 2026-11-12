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
    <div class="d-flex justify-content-between align-items-center mb-3">
        <h3 class="mb-0">
            USDT Verification - {{ $id == 1 ? 'Indian' : 'Non-Indian' }} Users
        </h3>

        <div>
            <a href="{{ route('usdt.verification.list', ['id' => 1]) }}"
               class="btn {{ $id == 1 ? 'btn-success' : 'btn-outline-success' }} me-2">
                Indian
            </a>

            <a href="{{ route('usdt.verification.list', ['id' => 2]) }}"
               class="btn {{ $id == 2 ? 'btn-success' : 'btn-outline-success' }}">
                Non-Indian
            </a>
        </div>
    </div>

    @if(session('success'))
        <div class="alert alert-success">{{ session('success') }}</div>
    @endif

    <div class="table-responsive">
        <table class="table table-bordered table-striped">
            <thead class="table-dark">
                <tr>
                    <th>ID</th>
                    <th>User ID</th>
                    <th>Region</th>
                    <th>Wallet Type</th>
                    <th>Exchange</th>
                    <th>Screenshot</th>
                    <th>Govt Card</th>
                    <th>Aadhar</th>
                    <th>Deposit Proof 1</th>
                    <th>Deposit Proof 2</th>
                    <th>USDT Bind</th>
                    <th>New USDT Address</th>
                    <th>Status</th>
                    <th>Submitted At</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                @foreach($data as $item)
                <tr>
                    <td>{{ $item->id }}</td>
                    <td>{{ $item->user_id }}</td>
                    <td>{{ $item->region_status == 2 ? 'Non-Indian' : 'Indian' }}</td>
                    <td>{{ $item->wallet_type }}</td>
                    <td>{{ $item->exchange_name }}</td>
                    <td><img src="{{ asset($item->screenshot_bdgwin_id) }}" width="50" onclick="showImage(this)"></td>
                    <td><img src="{{ asset($item->photo_government_card) }}" width="50" onclick="showImage(this)"></td>
                    <td><img src="{{ asset($item->photo_adhaar_card) }}" width="50" onclick="showImage(this)"></td>
                    <td><img src="{{ asset($item->photo_deposit_proof1) }}" width="50" onclick="showImage(this)"></td>
                    <td><img src="{{ asset($item->photo_deposit_proof2) }}" width="50" onclick="showImage(this)"></td>
                    <td><img src="{{ asset($item->photo_usdt_bind_bdgwin) }}" width="50" onclick="showImage(this)"></td>
                    <td><img src="{{ asset($item->photo_new_usdt_address) }}" width="50" onclick="showImage(this)"></td>
                    <td>
                        @if($item->status == 1)
                            <span class="badge bg-success">Verified</span>
                        @else
                            <span class="badge bg-warning">Pending</span>
                        @endif
                    </td>
                    <td>{{ \Carbon\Carbon::parse($item->created_at)->format('d-m-Y H:i') }}</td>
                    <td>
                        @if($item->status == 0)
                        <button class="btn btn-sm btn-primary" onclick="approveUsdt({{ $item->id }})">Approve</button>
                        @else
                        <button class="btn btn-sm btn-secondary" disabled>Done</button>
                        @endif
                    </td>
                </tr>
                @endforeach
            </tbody>
        </table>

        <!-- Hidden form -->
        <form id="usdtApproveForm" method="POST" style="display: none;">
            @csrf
        </form>
    </div>
</div>

<!-- Fullscreen Image Preview -->
<div id="imagePreview" class="image-preview" onclick="hideImage()">
    <button class="close-btn" onclick="hideImage(event)">×</button>
    <img id="previewImg" src="" alt="Preview Image">
</div>

<script>
function approveUsdt(id) {
    Swal.fire({
        title: 'Are you sure?',
        text: "Approve this USDT verification?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Approve'
    }).then((result) => {
        if (result.isConfirmed) {
            let form = document.getElementById('usdtApproveForm');
            form.action = '/admin/usdt-approve/' + id;
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
    const imagePreview = document.getElementById("imagePreview");
    const previewImg = document.getElementById("previewImg");

    previewImg.src = "";
    imagePreview.classList.remove("active");
}
</script>
@endsection
