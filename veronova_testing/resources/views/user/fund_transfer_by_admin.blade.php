@extends('admin.body.adminmaster')

@section('admin')
<div class="container mt-2">
    @if (session('success'))
    <div class="alert alert-success alert-dismissible fade show" role="alert">
        {{ session('success') }}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
@endif

@if (session('error'))
    <div class="alert alert-danger alert-dismissible fade show" role="alert">
        {{ session('error') }}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
@endif

@if ($errors->any())
    <div class="alert alert-danger alert-dismissible fade show" role="alert">
        <ul class="mb-0">
            @foreach ($errors->all() as $error)
                <li>{{ $error }}</li>
            @endforeach
        </ul>
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
@endif

    <div class="row justify-content-center">
        <div class="col-md-12">
            <div class="card border-0 shadow ">
                <div class="card-header bg-dark text-white  d-flex justify-content-between align-items-center">
                    <h5 class="mb-0">
                        <i class="bi bi-gift-fill me-2"></i>Fund Transfer from Admin
                    </h5>
                  <span id="userDisplay" class="fs-5 fw-bold text-white"></span>

                </div>

                <form action="{{ route('admin.give_bonus') }}" method="POST" class="border p-3  rounded-3 shadow-sm bg-light">
    @csrf
    <div class="row  align-items-end">
        <div class="col-sm-2">
            <label for="user_id" class="form-label mb-0">
                <i class="bi bi-person-fill-check me-1"></i> User ID
            </label>
            <input type="text" id="user_id" name="user_id" class="form-control" placeholder="Enter User ID" oninput="fetchUsernameLive()" required>
        </div>

        <div class="col-sm-2">
            <label for="bonus" class="form-label mb-0">
                <i class="bi bi-currency-rupee me-1"></i> Amount
            </label>
            <input type="number" id="bonus" name="bonus" class="form-control" placeholder="Bonus" required>
        </div>

        <div class="col-sm-3">
            <label for="type" class="form-label mb-0">
                <i class="bi bi-wallet2 me-1"></i> Type
            </label>
            <select name="type" id="type" class="form-select" required>
                <option value="" disabled selected>-- Select --</option>
                @foreach($data as $item)
                    <option value="{{ $item->id }}">{{ $item->name }}</option>
                @endforeach
            </select>
        </div>

        <div class="col-sm-4">
            <label for="remark" class="form-label mb-0">
                <i class="bi bi-chat-dots me-1"></i> Remark
            </label>
            <input type="text" id="remark" name="remark" class="form-control" placeholder="Optional">
        </div>

        <div class="col-sm-1 d-grid">
            <button type="submit" class="btn btn-success">
                <i class="bi bi-send-check-fill"></i>
            </button>
        </div>
    </div>
</form>


            </div>
        </div>
    </div>
  <div class="table-responsive mt-4">
    <table class="table table-bordered table-striped align-middle">
        <thead class="table-dark">
            <tr>
                <th>#</th>
                <th>User ID</th>
                <th>Amount</th>
                <th>Remark</th>
               
                <th>Description</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
            @forelse($fund_user_details as $index => $entry)
                <tr>
                    <td>{{ $fund_user_details->firstItem() + $index }}</td>
                    <td>{{ $entry->user_id }}</td>
                    <td>₹{{ number_format($entry->amount, 2) }}</td>
                    <td>{{ $entry->remark }}</td>
                 
                    <td>{{ $entry->description }}</td>
                    <td>{{ \Carbon\Carbon::parse($entry->created_at)->format('d-m-Y h:i A') }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="7" class="text-center">No fund transfer records found.</td>
                </tr>
            @endforelse
        </tbody>
    </table>
</div>

{{-- Pagination Links --}}
<div class="d-flex justify-content-center">
    {!! $fund_user_details->links() !!}
</div>

</div>

{{-- ✅ Live Username Fetch with Debounce --}}
<script>
let debounceTimer;

function fetchUsernameLive() {
    const userId = document.getElementById("user_id").value.trim();
    const userDisplay = document.getElementById("userDisplay");

    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        if (userId) {
            fetch(`/admin/get-username/${userId}`)
                .then(res => res.json())
                .then(data => {
                    userDisplay.innerHTML = data.success
                        ? `To <u>${data.username}</u>`
                        : `<span class="text-warning">— User not found</span>`;
                })
                .catch(() => {
                    userDisplay.innerHTML = `<span class="text-danger">— Error fetching username</span>`;
                });
        } else {
            userDisplay.innerHTML = '';
        }
    }, 400);
}
</script>

{{-- Bootstrap Icons CDN --}}
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
@endsection
