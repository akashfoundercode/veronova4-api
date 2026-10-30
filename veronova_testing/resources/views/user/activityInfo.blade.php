@extends('admin.body.adminmaster')

@section('admin')

<style>
    .btn-group .btn {
        margin-right: 5px;
    }

    .btn-group .btn:last-child {
        margin-right: 0;
    }

    .btn-group {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    th {
        white-space: nowrap;
        text-overflow: ellipsis;
    }
</style>

<div class="container-fluid mt-4">
    <div class="row">
        <div class="col-md-12">

            {{-- Flash Success Message --}}
            @if(session('success'))
                <div class="alert alert-success alert-dismissible fade show" role="alert">
                    {{ session('success') }}
                    <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
            @endif

            {{-- Card --}}
            <div class="white_shd full margin_bottom_30">
               @php
    $statuses = [
        1 => 'Bets',
        2 => 'Chicken',
        3 => 'Aviator',
        4 => 'Payins',
        5 => 'Withdraws',
        6 => 'Gifts',
    ];
@endphp

<div class="full graph_head d-flex align-items-center justify-content-between">
   <h2 class="ml-3">{{ $statuses[$status] ?? 'Game Result Table' }} Table</h2>
    <div class="btn-group mr-3">
        @foreach($statuses as $key => $label)
            <button type="button"
                    class="btn btn-sm {{ $status == $key ? 'btn-success' : 'btn-secondary' }}"
                    onclick="submitStatus({{ $key }})">
                {{ $label }}
            </button>
        @endforeach
    </div>
</div>

<!-- Hidden form -->
<form id="statusForm" method="POST" action="{{ route('all_details', $user_id ?? request()->route('user_id')) }}">
    @csrf
    <input type="hidden" name="status" id="statusInput">
</form>

<!-- JavaScript to handle form submit -->
<script>
    function submitStatus(status) {
        document.getElementById('statusInput').value = status;
        document.getElementById('statusForm').submit();
    }
</script>

                <div class="table_section padding_infor_info">
                    <div class="table-responsive-sm">
                        @if($status == null || $status == 1)
                        <table class="table table-bordered table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Win</th>
                                    
                                 
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($data as $key => $item)
                                    <tr>
                                        <td>{{ $item->id }}</td>
                                        <td>{{ $item->amount }}</td>
                                        <td>
                                            @if ($item->status == 0)
                                                <span class="badge bg-warning text-dark">Pending</span>
                                            @elseif ($item->status == 1)
                                                <span class="badge bg-success">Win</span>
                                            @else
                                                <span class="badge bg-danger">Loss</span>
                                            @endif
                                        </td>
                                        <td>{{ $item->win_amount ?? 0 }}</td>
                                      
                                     
                                     
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                       @elseif($status == 2)
                         <table class="table table-bordered table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Win </th>
                                   
                                  
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($data as $key => $item)
                                    <tr>
                                        <td>{{ $item->id }}</td>
                                        <td>{{ $item->amount }}</td>
                                        <td>
                                            @if ($item->status == 0)
                                                <span class="badge bg-warning text-dark">Pending</span>
                                            @elseif ($item->status == 1)
                                                <span class="badge bg-success">Win</span>
                                            @else
                                                <span class="badge bg-danger">Loss</span>
                                            @endif
                                        </td>
                                        <td>{{ $item->win_amount }}</td>
                        
                                      
                                       
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                        @elseif($status == 3)
                           <table class="table table-bordered table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Win</th>
                                
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($data as $key => $item)
                                    <tr>
                                        <td>{{ $item->id }}</td>
                                        <td>{{ $item->amount }}</td>
                                        <td>
                                            @if ($item->status == 0)
                                                <span class="badge bg-warning text-dark">Pending</span>
                                            @elseif ($item->status == 1)
                                                <span class="badge bg-success">Win</span>
                                            @else
                                                <span class="badge bg-danger">Loss</span>
                                            @endif
                                        </td>
                                        <td>{{ $item->win }}</td>
                                     
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                        @elseif($status == 4)
                          <table class="table table-bordered table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>ID</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($data as $key => $item)
                                    <tr>
                                        <td>{{ $item->id }}</td>
                                        <td>{{ $item->cash }}</td>
                                        <td>
                                            @if ($item->status == 1)
                                                <span class="badge bg-warning text-dark">Pending</span>
                                            @elseif ($item->status == 2)
                                                <span class="badge bg-success">Success</span>
                                            @else
                                                <span class="badge bg-danger">Reject</span>
                                            @endif
                                        </td>
                                        <td>{{ $item->created_at }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                        @elseif($status == 5)
                          <table class="table table-bordered table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>id</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($data as $key => $item)
                                    <tr>
                                        <td>{{ $item->id }}</td>
                                        <td>{{ $item->amount }}</td>
                                        <td>
                                            @if ($item->status == 1)
                                                <span class="badge bg-warning text-dark">Pending</span>
                                            @elseif ($item->status == 2)
                                                <span class="badge bg-success">Success</span>
                                            @else
                                                <span class="badge bg-danger">Reject</span>
                                            @endif
                                        </td>
                                       <td>{{ $item->created_at }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                        @elseif($status == 6)
                          <table class="table table-bordered table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>id</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                  
                                 
                                    <th>date</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($data as $key => $item)
                                    <tr>
                                        <td>{{ $item->id }}</td>
                                        <td>{{ $item->amount }}</td>
                                        <td>
                                            @if ($item->status == 0)
                                                <span class="badge bg-warning text-dark">Pending</span>
                                            @elseif ($item->status == 1)
                                                <span class="badge bg-success">Success</span>
                                            @else
                                                <span class="badge bg-danger">Reject</span>
                                            @endif
                                        </td>
                                         <td>{{ $item->datetime }}</td>
                                    </tr>
                                @endforeach
                            </tbody>
                        </table>
                         @else
                          <p>No data available.</p>
                         @endif
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

@endsection
