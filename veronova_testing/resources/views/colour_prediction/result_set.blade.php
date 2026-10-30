@extends('admin.body.adminmaster')

@section('admin')

<!-- Bootstrap Icons -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css">

<!-- Bootstrap CSS -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">

<style>
    /* Your existing styles */
    .action-buttons {
        display: flex;
        justify-content: center;
        gap: 0.5rem;
    }
    body {
        background: #f4f7fa;
        font-family: 'Segoe UI', sans-serif;
    }
    .card {
        border: none;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }
    .card-header {
        background: linear-gradient(90deg, #4e73df, #1cc88a);
        color: white;
        font-weight: bold;
        font-size: 1.1rem;
        border-radius: 10px 10px 0 0;
    }
    .form-select, .form-control {
        border-radius: 6px;
    }
    .btn-success {
        background: linear-gradient(to right, #1cc88a, #17a673);
        border: none;
    }
    .btn-outline-danger {
        border: 2px solid #e74a3b;
        color: #e74a3b;
    }
    .btn-outline-danger:hover {
        background: #e74a3b;
        color: white;
    }
    .btn-warning {
        background: #f6c23e;
        border: none;
    }
    .btn-danger {
        background: #e74a3b;
        border: none;
    }
    .badge {
        padding: 0.4em 0.7em;
        font-size: 0.85em;
        border-radius: 0.35rem;
    }
    .badge-success {
        background-color: #1cc88a;
    }
    .badge-secondary {
        background-color: #858796;
    }
    .badge-big {
        background: #4e73df;
        color: #fff;
    }
    .badge-small {
        background: #36b9cc;
        color: #fff;
    }
    .badge-red {
        background: #e74a3b;
        color: #fff;
    }
    .badge-green {
        background: #1cc88a;
        color: #fff;
    }
    .badge-voilet {
        background: #6f42c1;
        color: #fff;
    }
    .badge-duration {
        background: #f6c23e;
        color: #000;
    }
    .highlight {
        font-weight: bold;
        color: #4e73df;
    }
    .table th {
        background: #f8f9fc;
        color: #4e73df;
    }
    .table-hover tbody tr:hover {
        background-color: #f0f8ff;
    }
    .modal-header {
        background: linear-gradient(90deg, #36b9cc, #4e73df);
    }
    .modal-title {
        color: #fff;
    }
    .action-buttons .btn {
        box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    .alert {
        border-left: 5px solid #4e73df;
        border-radius: 8px;
    }
    .icon-title {
        margin-right: 0.5rem;
    }
</style>

@php
    use Carbon\Carbon;
    $activeType = session('selected_type') ?? ($active_result->name ?? null);
@endphp

<div class="container py-5">

    {{-- Active Result Set Header --}}
    @if(isset($active_result))
        <div class="alert alert-primary mb-4">
            <i class="bi bi-info-circle-fill icon-title"></i>
            <strong class="highlight">Active Result Set:</strong> {{ $active_result->name }}
        </div>
    @endif

    {{-- Select Type Dropdown --}}
    <div class="card mb-4">
        <div class="card-header">
            <i class="bi bi-sliders2 icon-title"></i> Set Wingo Result
        </div>
        <div class="card-body">
            @if(session('success'))
                <div class="alert alert-success mb-3">
                    <i class="bi bi-check-circle-fill icon-title"></i>
                    {{ session('success') }}
                </div>
            @endif

            @if(session('selected_type'))
                <div class="alert alert-info mb-3">
                    <i class="bi bi-check2-circle icon-title"></i>
                    <strong class="highlight">Currently Selected:</strong> {{ session('selected_type') }}
                </div>
            @endif

            <form method="POST" action="{{ route('wingo.update.status') }}">
                @csrf
                <div class="form-group mb-4">
                    <label class="form-label">Select Type:</label>
                    <select name="type" class="form-select" {{ session('selected_type') ? 'disabled' : '' }} required onchange="this.form.submit()">
                        <option value="">-- Select --</option>
                        <option value="Business" {{ $activeType == 'Business' ? 'selected' : '' }}>Business</option>
                        <option value="Pattern" {{ $activeType == 'Pattern' ? 'selected' : '' }}>Pattern</option>
                    </select>
                </div>
            </form>
        </div>
    </div>

    {{-- Pattern Submit Form --}}
    @if(session('show_pattern_form'))
        <div class="card mb-4">
            <div class="card-header">
                <i class="bi bi-palette2 icon-title"></i> Submit Pattern Result
            </div>
            <div class="card-body">
                <form method="POST" action="{{ route('wingo.pattern.submit') }}">
                    @csrf
                    <div class="form-group mb-3">
                        <label class="form-label">Select Game Duration:</label>
                        <select name="game_id" class="form-select" required>
                            <option value="">-- Select Duration --</option>
                            <option value="1">30 Seconds</option>
                            <option value="2">1 Minute</option>
                            <option value="3">3 Minutes</option>
                            <option value="4">5 Minutes</option>
                        </select>
                    </div>
                    <div class="form-group mb-3">
                        <label class="form-label">Select Parameter:</label>
                        <select name="number" class="form-select" required>
                            <option value="">-- Select Parameter --</option>
                            <option value="40">Big</option>
                            <option value="50">Small</option>
                            <option value="30">Red</option>
                            <option value="10">Green</option>
                            <option value="20">Voilet</option>
                        </select>
                    </div>
                    <div class="form-group mb-4">
                        <label class="form-label">Enter Number:</label>
                        <input type="number" name="number_count" class="form-control" required>
                    </div>
                    <div class="d-flex gap-3">
                        <button type="submit" class="btn btn-success">
                            <i class="bi bi-check-circle me-2"></i> Submit
                        </button>
                        <a href="{{ route('wingo.show.form') }}" class="btn btn-outline-danger">
                            <i class="bi bi-x-circle me-2"></i> Cancel
                        </a>
                    </div>
                </form>
            </div>
        </div>
    @endif

    {{-- Pattern Result History Table --}}
    @if(isset($pattern_results) && $pattern_results->count())
        <div class="card">
            <div class="card-header">
                <i class="bi bi-table icon-title"></i> Pattern Result History
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-hover text-center mb-0">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Game Duration</th>
                                <th>Number</th>
                                <th>Name</th>
                                <th>Count</th>
                                <th>Status</th>
                                <th>Created At</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($pattern_results as $result)
                                @php
                                    $gameDuration = match($result->game_id) {
                                        1 => '30 Seconds',
                                        2 => '1 Minute',
                                        3 => '3 Minutes',
                                        4 => '5 Minutes',
                                        default => 'Unknown',
                                    };
                                    
                                    $badgeClass = match(strtolower($result->name)) {
                                        'big' => 'badge-big',
                                        'small' => 'badge-small',
                                        'red' => 'badge-red',
                                        'green' => 'badge-green',
                                        'voilet' => 'badge-voilet',
                                        default => 'badge-secondary',
                                    };
                                @endphp
                                <tr>
                                    <td>{{ $result->id }}</td>
                                    <td><span class="badge badge-duration">{{ $gameDuration }}</span></td>
                                    <td>{{ $result->number }}</td>
                                    <td><span class="badge {{ $badgeClass }}">{{ ucfirst($result->name) }}</span></td>
                                    <td>{{ $result->number_count }}</td>
                                    <td>
                                        @if($result->status == 1)
                                            <span class="badge badge-success">Active</span>
                                        @else
                                            <span class="badge badge-secondary">Inactive</span>
                                        @endif
                                    </td>
                                    <td>{{ Carbon::parse($result->created_at)->format('d M Y h:i A') }}</td>
                                    <td class="action-buttons">
                                        <button class="btn btn-sm btn-warning" onclick="openEditModal({{ $result->id }}, '{{ $result->name }}', '{{ $result->number_count }}', '{{ $result->game_id }}')">
                                            <i class="bi bi-pencil-square"></i>
                                        </button>

                                        <form action="{{ route('wingo.pattern.delete', $result->id) }}" method="POST" onsubmit="return confirm('Are you sure to delete?')" style="display:inline-block;">
                                            @csrf
                                            <button type="submit" class="btn btn-sm btn-danger">
                                                <i class="bi bi-trash"></i>
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    @endif

    {{-- Edit Pattern Modal --}}
    <div class="modal fade" id="editPatternModal" tabindex="-1" aria-labelledby="editPatternModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <form method="POST" id="editPatternForm">
                @csrf
                <div class="modal-content">
                    <div class="modal-header bg-primary text-white">
                        <h5 class="modal-title" id="editPatternModalLabel">Edit Pattern Result</h5>
                        <button type="button" class="btn-close bg-light" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group mb-3">
                            <label class="form-label">Select Game Duration:</label>
                            <select name="game_id" id="edit_game_id" class="form-select" required>
                                <option value="1">30 Seconds</option>
                                <option value="2">1 Minute</option>
                                <option value="3">3 Minutes</option>
                                <option value="4">5 Minutes</option>
                            </select>
                        </div>
                        <div class="form-group mb-3">
                            <label class="form-label">Select Parameter:</label>
                            <select name="name" id="edit_name" class="form-select" required>
                                <option value="big">Big</option>
                                <option value="small">Small</option>
                                <option value="red">Red</option>
                                <option value="green">Green</option>
                                <option value="voilet">Voilet</option>
                            </select>
                        </div>
                        <div class="form-group mb-3">
                            <label class="form-label">Enter Number Count:</label>
                            <input type="number" name="number_count" id="edit_number_count" class="form-control" required>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-success">
                            <i class="bi bi-save2 me-1"></i> Update
                        </button>
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle me-1"></i> Cancel
                        </button>
                    </div>
                </div>
            </form>
        </div>
    </div>

</div>

<!-- Bootstrap JS Bundle -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>

<script>
    function openEditModal(id, name, numberCount, gameId) {
        document.getElementById('edit_name').value = name.toLowerCase();
        document.getElementById('edit_number_count').value = numberCount;
        document.getElementById('edit_game_id').value = gameId;

        const form = document.getElementById('editPatternForm');
        form.action = '/wingo/pattern/edit/' + id;

        const modal = new bootstrap.Modal(document.getElementById('editPatternModal'));
        modal.show();
    }
</script>

@endsection