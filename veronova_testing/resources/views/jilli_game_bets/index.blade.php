@extends('admin.body.adminmaster')

@section('admin')
<div class="container-fluid py-4">

    <div class="card shadow-lg border-0">
        <div class="card-header text-white" style="background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);">
            <h4 class="mb-0">🎮 Jilli Game Bets</h4>
        </div>
        <div class="card-body p-0">

            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead style="background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); color: white;">
                        <tr>
                            <th>ID</th>
                            <th>Game UID</th>
                            <th>Game Round</th>
                            <th>Member Account</th>
                            <!--<th>Currency Code</th>-->
                            <th>Bet Amount</th>
                            <th>Win Amount</th>
                            <th>Serial Number</th>
                            <th>Timestamp</th>
                            <!--<th>Code</th>
                            <th>Created At</th>
                            <th>Updated At</th>-->
                        </tr>
                    </thead>
                    <tbody>
                        @forelse($bets as $bet)
                            <tr>
                                <td><span class="badge bg-primary">{{ $bet->id }}</span></td>
                                <td>{{ $bet->game_uid }}</td>
                                <td>{{ $bet->game_round }}</td>
                                <td><span class="badge bg-info text-dark">{{ $bet->member_account }}</span></td>
                                <!--<td>{{ $bet->currency_code }}</td>-->
                                <td><span class="badge bg-warning text-dark">{{ number_format($bet->bet_amount, 2) }}</span></td>
                                <td>
                                    @if($bet->win_amount > 0)
                                        <span class="badge bg-success">{{ number_format($bet->win_amount, 2) }}</span>
                                    @else
                                        <span class="badge bg-danger">0.00</span>
                                    @endif
                                </td>
                                <td>{{ $bet->serial_number }}</td>
                                <td>{{ $bet->timestamp }}</td>
                               <!-- <td>{{ $bet->code }}</td>
                                <td>{{ \Carbon\Carbon::parse($bet->created_at)->format('d M Y H:i') }}</td>
                                <td>{{ \Carbon\Carbon::parse($bet->updated_at)->format('d M Y H:i') }}</td>-->
                            </tr>
                        @empty
                            <tr>
                                <td colspan="12" class="text-center text-muted py-4">
                                    <i class="bi bi-exclamation-circle"></i> No records found
                                </td>
                            </tr>
                        @endforelse
                    </tbody>
                </table>
            </div>

        </div>

        <div class="card-footer">
            {{ $bets->links() }}
        </div>
    </div>

</div>

{{-- Bootstrap Icons CDN --}}
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
@endsection
