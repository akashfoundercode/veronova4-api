@extends('admin.body.adminmaster')

@section('admin')
<style>
    .page-header {
        background: linear-gradient(135deg, #4e73df, #1cc88a);
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .page-header h2 {
        margin: 0;
        font-weight: bold;
    }
    .form-label {
        font-weight: bold;
        color: #4e73df;
    }
    .form-control:focus {
        border-color: #4e73df;
        box-shadow: 0 0 5px rgba(78, 115, 223, 0.5);
    }
    .btn-gradient {
        background: linear-gradient(90deg, #1cc88a, #4e73df);
        color: white;
        border: none;
        transition: 0.3s;
    }
    .btn-gradient:hover {
        opacity: 0.9;
        color: white;
    }
</style>

<div class="container-fluid">
    <div class="page-header">
        <h2><i class="fas fa-edit"></i> Edit Payment Limit</h2>
        <a href="{{ route('admin.payment_limits.index') }}" class="btn btn-light btn-sm">
            <i class="fas fa-arrow-left"></i> Back
        </a>
    </div>

    <div class="card shadow">
        <div class="card-body">
            <form action="{{ route('admin.payment_limits.update', $limit->id) }}" method="POST">
                @csrf

                <div class="mb-3">
                    <label class="form-label">Name</label>
                    <input type="text" value="{{ $limit->name }}" class="form-control" readonly>
                </div>

                <div class="mb-3">
                    <label class="form-label">Amount</label>
                    <input type="number" name="amount" value="{{ $limit->amount }}" step="0.01" class="form-control" required>
                </div>

                <div class="mb-3">
                    <label class="form-label">Status</label>
                    <select name="status" class="form-control" required>
                        <option value="1" {{ $limit->status ? 'selected' : '' }}>Active</option>
                        <option value="0" {{ !$limit->status ? 'selected' : '' }}>Inactive</option>
                    </select>
                </div>

                <button type="submit" class="btn btn-gradient mt-2">
                    <i class="fas fa-save"></i> Update
                </button>
                <a href="{{ route('admin.payment_limits.index') }}" class="btn btn-secondary mt-2">
                    <i class="fas fa-times"></i> Cancel
                </a>
            </form>
        </div>
    </div>
</div>
@endsection
