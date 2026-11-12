@extends('admin.body.adminmaster')

@section('admin')
<div class="container-fluid mt-4">
    <div class="row">
        <div class="col-md-12">
            <div class="card shadow-sm border-0 rounded-lg" style="background-color: white; color: black;">
                <!-- Header -->
                <div class="card-header d-flex justify-content-between align-items-center" 
                     style="background: #f8f9fa; color: black; border-bottom: 2px solid #FFD369; padding: 10px 15px;">
                    <h4 class="mb-0" style="font-size: 18px;"><i class="fas fa-history"></i>Kino Bet History</h4>
                </div>

                <!-- Table Section -->
                <div class="card-body p-3">
                    <div class="table-responsive">
                        <table class="table table-striped">
                            <thead style="background-color: #f8f9fa; color: black;">
                                <tr style="font-size: 14px;">
                                    <th>ID</th>
                                    <th>User ID</th>
                                    <th>Risk Level</th>
                                    <th>Game sr no</th>                                    
                                    <th>Amount</th>
                                    <th>Win_amount</th>
                                    <th>Bet</th>
                                    <th>Win No</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($bets as $bet)
                                    <tr>
                                        <td>{{ $bet->id }}</td>
                                        <td>{{ $bet->userid }}</td>
                                        <td>@if($bet->risk_level == 1)
                                                <span class="badge bg-success">High</span>
                                            @elseif($bet->risk_level == 2)
                                                <span class="badge bg-danger">Medium</span>
                                            @elseif($bet->risk_level == 3)
                                                <span class="badge bg-danger">Low</span>
                                            @endif</td>
                                        <td>{{ $bet->games_no }}</td>                                            
                                        <td>{{ $bet->amount }}</td>
                                        <td>{{ $bet->win_amount }}</td>
                                        <td>{{ $bet->selected_numbers }}</td>
                                        <td>{{ $bet->number }}</td>
                                        <td>
                                            @if($bet->status == 0)
                                                <span class="badge bg-info">pending</span>
                                            @elseif($bet->status == 1)
                                                <span class="badge bg-success">win</span>
                                                @elseif($bet->status == 2)
                                                <span class="badge bg-danger">Loss</span>
                                            @endif
                                        </td>
                                        <td>{{ date('d M Y H:i', strtotime($bet->created_at)) }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                        
                        <!-- Pagination Links -->
                        <div class="d-flex justify-content-center">
                            {{ $bets->links() }}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<!-- FontAwesome for Icons -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
@endsection
