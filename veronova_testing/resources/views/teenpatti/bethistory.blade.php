@extends('admin.body.adminmaster')

@section('admin')
<div class="container-fluid mt-4">
    <div class="row">
        <div class="col-md-12">
            <div class="card shadow-sm border-0 rounded-lg" style="background-color: white; color: black;">
                <div class="card-header d-flex justify-content-between align-items-center" 
                     style="background: #f8f9fa; color: black; border-bottom: 2px solid #FFD369; padding: 10px 15px;">
                    <h4 class="mb-0" style="font-size: 18px;"><i class="fas fa-history"></i>Teen Patti Bet History</h4>
                </div>
                <div class="card-body p-3">
                    <div class="table-responsive">
                        <table id="example" class="table table-sm table-hover table-bordered text-center" 
                               style="background-color: white; color: black; border-color: #ddd;">
                            <table class="table">
                                <thead style="background-color: #f8f9fa; color: black;">
                                    <tr style="font-size: 14px;">
                                        <th>ID</th>
                                        <th>Username</th>
                                        <th>Amount</th>
                                        <th>Player Cards</th>
                                        <th>Banker Cards</th>
                                        <th>Winner</th>
                                        <th>win_amount</th>
                                        <th>Order</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach ($bets as $bet)
                                        <tr>
                                            <td>{{ $bet->id }}</td>
                                            <td>{{ $bet->userid }}</td>
                                            <td>{{ $bet->amount }}</td>
                                            <td>{{ $bet->player_cards }}</td>
                                            <td>{{ $bet->banker_cards }}</td>
                                            <td>{{ $bet->winner }}</td>
                                            <td>{{ $bet->win_amount }}</td>
                                            <td>{{ $bet->order_id }}</td>
                                            <td>{{ $bet->status }}</td>
                                            <td>{{ $bet->created_at }}</td>
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
