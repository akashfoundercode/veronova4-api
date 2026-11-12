@extends('admin.body.adminmaster')

@section('admin')
<div class="container-fluid mt-4">
    <div class="row">
        <div class="col-md-12">
            <div class="card shadow-sm border-0 rounded-lg" style="background-color: white; color: black;">
                <div class="card-header d-flex justify-content-between align-items-center" 
                     style="background: #f8f9fa; color: black; border-bottom: 2px solid #FFD369; padding: 10px 15px;">
                    <h4 class="mb-0" style="font-size: 18px;"><i class="fas fa-history"></i>Hot Air Balloon Bet History</h4>
                </div>
                <div class="card-body p-3">
                    <div class="table-responsive">
                        <table id="example" class="table table-sm table-hover table-bordered text-center" 
                               style="background-color: white; color: black; border-color: #ddd;">
                            <table class="table">
                                <thead style="background-color: #f8f9fa; color: black;">
                                    <tr style="font-size: 14px;">
                                        <th>Id</th>
                                        <th>User ID</th>
                                        <th>Amount</th>
                                        <th>Stop_multiplier</th>
                                        <th>Number</th>
                                        <th>Game sr num</th>
                                        <th>Status</th>
                                        <th>Win</th>
                                        <th>Multiplier</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach ($bets as $bet)
                                        <tr>
                                            <td>{{ $bet->id }}</td>
                                            <td>{{ $bet->uid}}</td>
                                            <td>{{ number_format($bet->amount, 2) }}</td>
                                            <td>{{ $bet->stop_multiplier ?? '-' }}</td>
                                            <td>{{ $bet->number ?? '-' }}</td>
                                            <td>{{ $bet->game_sr_num ?? '-' }}</td>
                                            <td>
                                                @if ($bet->status == 1)
                                                    <span class="badge bg-success">Win</span>
                                                @else
                                                    <span class="badge bg-danger">Lost</span>
                                                @endif
                                            </td>
                                            <td>{{ number_format($bet->win, 2) }}</td>
                                            <td>{{ $bet->multiplier ?? '-' }}</td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                            <div class="d-flex justify-content-center">
                                {{ $bets->links() }}
                            </div>

                        </table>
                    </div>

                </div>
            </div>
        </div>
    </div>
</div>

<!-- FontAwesome for Icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
@endsection
