@extends('admin.body.adminmaster')

@section('admin')
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">

<div class="container mt-4">
    <h4 class="mb-3">Plinko Bets History</h4>

    <div class="table-responsive">
        <table class="table table-bordered table-hover table-striped">
            <thead class="thead-dark">
                <tr>
                    <th>ID</th>
                 
                    <th>User ID</th>
                    <th>Game ID</th>
                    <th>Amount</th>
                
                    <th>Win Amount</th>
                    <th>Status</th>

                 
                    <th>Datetime</th>
                    <th>Created At</th>
                    <th>Updated At</th>
                </tr>
            </thead>
            <tbody>
                @forelse($bets as $bet)
                    <tr>
                        <td>{{ $bet->id }}</td>
                      
                        <td>{{ $bet->userid }}</td>
                        <td>{{ $bet->game_id }}</td>
                        <td>{{ $bet->amount }}</td>
                       
                        <td>{{ $bet->win_amount }}</td>
                        <td>{{ $bet->status }}</td>
                       
                      
                
                        <td>{{ $bet->datetime }}</td>
                        <td>{{ $bet->created_at }}</td>
                        <td>{{ $bet->updated_at }}</td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="14" class="text-center">No Plinko Bets Found</td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>
</div>
@endsection
