@extends('admin.body.adminmaster')

@section('admin')
<div class="container-fluid mt-4">
    <div class="row">
        <div class="col-md-12">
            <div class="card shadow-sm border-0 rounded-lg" style="background-color: white; color: black;">
                <div class="card-header d-flex justify-content-between align-items-center" 
                     style="background: #f8f9fa; color: black; border-bottom: 2px solid #FFD369; padding: 10px 15px;">
                    <h4 class="mb-0" style="font-size: 18px;"><i class="fas fa-history"></i>Mini Roullete Result</h4>
                </div>
                <div class="card-body p-3">
                    <div class="table-responsive">
                        <table id="example" class="table table-sm table-hover table-bordered text-center" 
                               style="background-color: white; color: black; border-color: #ddd;">
                            <table class="table">
                                <thead style="background-color: #f8f9fa; color: black;">
                                <tr style="font-size: 14px;">
                                    <th>ID</th>
                                    <th>Game sr no</th>
                                    <th>Win No</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($bets as $bet)
                                <tr>
                                    <td>{{ $bet->id }}</td>
                                    <td>{{ $bet->games_no }}</td>
                                    <td>{{ $bet->result_number }}</td>
                                    <td>{{ \Carbon\Carbon::parse($bet->created_at)->format('d-m-Y H:i:s') }}</td>
                                </tr>
                                @endforeach
                            </tbody>
                        </table>
                        <div class="d-flex justify-content-center mt-3">
                            {{ $bets->links() }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css">
@endsection
