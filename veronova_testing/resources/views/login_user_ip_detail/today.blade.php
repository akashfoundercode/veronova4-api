@extends('admin.body.adminmaster')

@section('admin')

<!-- DataTables CSS -->
<link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/dataTables.bootstrap5.min.css" />

<style>
    body {
        background-color: #f8f9fa;
    }

    .custom-card {
        border-radius: 12px;
        background: #ffffffcc;
        backdrop-filter: blur(8px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    }

    .custom-header {
        background: linear-gradient(135deg, #007bff, #6610f2);
        color: white;
        padding: 20px;
        border-top-left-radius: 12px;
        border-top-right-radius: 12px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
    }

    .table td, .table th {
        padding: 14px;
    }

    .badge-time {
        background-color: #20c997;
        font-size: 0.85rem;
    }
</style>

<div class="container py-5">
    <div class="custom-card">
        <div class="custom-header">
            <h3 class="mb-0"><i class="bi bi-shield-lock"></i> Today's IP Address Logs</h3>
        </div>
        <div class="p-4">
            <div class="table-responsive">
                <table id="ipTable" class="table table-hover table-striped align-middle mb-0">
                    <thead class="table-dark">
                        <tr>
                            <th>#</th>
                            <th>User ID</th>
                            <th>IP Address</th>
                            <th>Login Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($ipAddresses as $ip)
                            <tr>
                                <td>{{ $ip->id }}</td>
                                <td><span class="fw-bold text-dark">{{ $ip->user_id }}</span></td>
                                <td>
                                    <span class="badge text-white"
                                          style="background-color: {{ $ipColorMap[$ip->ip_address] ?? '#6c757d' }};">
                                        {{ $ip->ip_address }}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge badge-time text-white">
                                        {{ \Carbon\Carbon::parse($ip->login_time)->format('d M Y, h:i A') }}
                                    </span>
                                </td>
                            </tr>
                        @empty
                            <tr>
                                <td colspan="4" class="text-center text-muted">No IP logs found for today.</td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

<!-- DataTables Scripts -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.13.6/js/dataTables.bootstrap5.min.js"></script>

<script>
    $(document).ready(function () {
        $('#ipTable').DataTable({
            pageLength: 10,
            lengthChange: true,
            searching: true,
            ordering: true,
            order: [], // preserve Laravel order
            language: {
                searchPlaceholder: "Search by IP, User ID or Time"
            }
        });
    });
</script>

<!-- Bootstrap Icons -->
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">

@endsection
