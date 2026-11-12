@extends('admin.body.adminmaster')

@section('admin')
<style>
    .table-hover tbody tr:hover {
        background-color: #f8f9fa;
        cursor: pointer;
    }

    .text-danger {
        color: red;
        font-weight: bold;
    }
</style>

<div class="container mt-5">
    <div class="card shadow-sm border-0">
        <div class="card-header bg-danger text-white d-flex justify-content-between align-items-center">
            <h4 class="mb-0"><i class="bi bi-exclamation-triangle-fill me-2"></i>Illegal Bets Details</h4>
        </div>

        <div class="card-body">
            <div class="table-responsive">
                <table class="table table-hover align-middle text-center">
                    <thead class="table-dark">
                        <tr>
                            <th>ID</th>
                            <th>User ID</th>
                            <th>Period Number</th>
                            <th>Game ID</th>
                            <th>Amount</th>
                            <th>Win Number</th>
                            <th>Number</th>
                            <th>Win Amount</th>
                            <th>Win / Loss</th>
                        
                            <th>Created At</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($data as $bet)
                        <tr>
                            <td>{{ $bet->id }}</td>
                            <td>{{ $bet->userid }}</td>
                            <td>{{ $bet->games_no }}</td>
                            <td>{{ $bet->game_id }}</td>
                            <td>{{ $bet->amount }}</td>
                            <td>{{ $bet->win_number }}</td>
                            
                             <td>
                                @if($bet->number == 50)
                                    <span style="background-color: skyblue; color: black; font-weight: bold; border-radius: 5px; padding: 2px 6px;">Small</span>
                                @elseif($bet->number == 40)
                                    <span style="background-color: yellow; color: black; font-weight: bold; border-radius: 5px; padding: 2px 6px;">Big</span>
                                @elseif($bet->number == 30)
                                    <span style="background-color: red; color: black; font-weight: bold; border-radius: 5px; padding: 2px 6px;">Red</span>
                                @elseif($bet->number == 20)
                                    <span style="background-color: violet; color: black; font-weight: bold; border-radius: 5px; padding: 2px 6px;">Violet</span>
                                @elseif($bet->number == 10)
                                    <span style="background-color: #4caf50; color: black; font-weight: bold; border-radius: 5px; padding: 2px 6px;">Green</span>
                                @else
                                    <span style="color: black; font-weight: bold; border-radius: 5px; padding: 2px 6px;">{{$bet->number}}</span>
                                @endif
                            </td>

                            <td>{{ $bet->win_amount }}</td>
                            <td>
                                @if($bet->win_amount > 0)
                                    <span class="text-success">Win</span>
                                @else
                                    <span class="text-danger">Loss</span>
                                @endif
                            </td>
                            
                            <td>{{ \Carbon\Carbon::parse($bet->created_at)->format('Y-m-d H:i:s') }}</td>
                        </tr>
                        @endforeach
                    </tbody>
                </table>
              <div class="d-flex justify-content-center mt-3">
    {{ $data->links() }}
</div>
            </div>
        </div>
    </div>
</div>
@endsection
