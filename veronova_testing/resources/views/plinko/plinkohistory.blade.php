@extends('admin.body.adminmaster')

@section('admin')
<div class="container mt-4">
    <h4 class="mb-3">Plinko Bets History</h4>

    <div class="table-responsive">
        <table class="table table-bordered table-hover table-striped">
            <thead class="thead-dark">
                <tr>
                    <th>ID</th>
                 
                    <th>User ID</th>
                    <th>Amount</th>
                    <th>Game ID</th>
                    <th>Type</th>
                    <th>Indexs</th>
                    <th>Multipler</th>
                    <th>Win Amount</th>
                    <th>Status</th>
                    <th>Tax</th>
                    <th>After Tax</th>
                    <th>Order ID</th>
                    <th>Created At</th>
                    <th>Updated At</th>
                </tr>
            </thead>
            <tbody>
                @forelse($bets as $bet)
                    <tr>
                        <td>{{ $bet->id }}</td>
                        
                        <td>{{ $bet->userid }}</td>
                        <td>{{ $bet->amount }}</td>
                        <td>{{ $bet->game_id }}</td>
                        <td>
                            @if($bet->type == 1)
                                <span class="badge bg-success text-white">Green</span>
                            @elseif($bet->type == 2)
                                <span class="badge bg-warning text-dark">Yellow</span>
                            @elseif($bet->type == 3)
                                <span class="badge bg-danger">Red</span>
                            @else
                                <span class="badge bg-secondary">Unknown</span>
                            @endif
                        </td>
                        <td>{{ $bet->indexs }}</td>
                        <td>{{ $bet->multipler }}</td>
                        <td>{{ $bet->win_amount }}</td>
                        <td>{{ $bet->status }}</td>
                        <td>{{ $bet->tax }}</td>
                        <td>{{ $bet->after_tax }}</td>
                        <td>{{ $bet->orderid }}</td>
                        <td>{{ $bet->created_at }}</td>
                        <td>{{ $bet->updated_at }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="15" class="text-center">No Plinko Bets Found</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>
</div>
@endsection
