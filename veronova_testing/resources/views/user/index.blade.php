@extends('admin.body.adminmaster')

@section('admin')

<style>
    .btn-group .btn {
        margin-right: 5px; /* Add spacing between buttons */
    }

    .btn-group .btn:last-child {
        margin-right: 0; /* Remove right margin from the last button */
    }

    .btn-group {
        display: flex; /* Flexbox for alignment */
        justify-content: center; /* Center buttons if needed */
        align-items: center;
    }
</style>
 <style>
 th{
    white-space: nowrap; 
  
    text-overflow: ellipsis;
}
  </style>

<div class="container-fluid">
    <div class="row">
        <!-- Display Flash Message -->


        <div class="col-md-12">
            @if(session('success'))
    <div class="alert alert-success">
        {{ session('success') }}
    </div>
@endif
            <div class="white_shd full margin_bottom_30">
                <div class="full graph_head">
                    <div class="heading1 margin_0 d-flex">
                        <h2>User List</h2>
                    </div>
                </div>
                <div class="table_section padding_infor_info">
                    <div class="table-responsive-sm">
                        <table id="example" class="table table-striped" style="width:100%">
                            <thead class="thead-dark">
                                <tr>
                                    <th>Id</th>
                                    <th>user_id</th>
                                    <th>User_name</th>
                                    <!--<th>Email</th>-->
                                    <th>Mobile</th>
                                    <th>Sponser</th>
                                    <th>Sponser Id</th>
                                    <th>Wallet</th>
                                    <th>Winning_Wallet</th>
                                    <th>Commission</th>
                                    <th>Bonus</th>
                                    <th>Turn Over</th>
                                    <th>Today TurnOver</th>
                                    <th>Bet Amount</th>
                                    <th>Password</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                    <th>filterSubordinateData</th>
                                    <th>ViewMoreDetails</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach ($users as $item)
                                    <tr>
                                        <td>{{$item->id}}</td>
                                        <td>{{$item->u_id}}</td>
                                        <td>{{$item->username}}</td>
                                        <!--<td>{{$item->email}}</td>-->
                                        <td>{{$item->mobile}}</td>
                                        <td>{{$item->sname}}</td>
                                
                                        <td>
                                              {{$item->referral_user_id}}
                                            <i class="fa fa-edit mt-1 ml-3" data-toggle="modal" data-target="#editReferralModal{{$item->id}}" style="font-size:20px"></i>
                                            <!-- Modal -->
                                            <div class="modal fade" id="editReferralModal{{$item->id}}" tabindex="-1" role="dialog" aria-hidden="true">
                                                <div class="modal-dialog modal-sm modal-dialog-centered" role="document"> <!-- Added modal-dialog-centered -->
                                                    <div class="modal-content">
                                                        <form action="{{ route('referral.update', $item->id) }}" method="post">
                                                            @csrf
                                                            <div class="modal-header">
                                                                <h5 class="modal-title">Edit Sponser ID</h5>
                                                                <button type="button" class="close" data-dismiss="modal">&times;</button>
                                                            </div>
                                                            <div class="modal-body">
                                                                <input type="text" class="form-control" name="referral_user_id" value="{{$item->referral_user_id}}">
                                                            </div>
                                                            <div class="modal-footer">
                                                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                                                                <button type="submit" class="btn btn-primary">Save</button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        
                                        <td class="">
                                            {{$item->wallet}}
                                            <div class="btn-group" role="group" aria-label="Wallet actions">
                                                <!-- Add Funds Button -->
                                                <button type="button" class="btn btn-info btn-sm" data-toggle="modal" data-target="#exampleModalCenter{{$item->id}}" title="Add Funds">
                                                    <i class="fa fa-plus" style="font-size:20px"></i>
                                                </button>
                                                <!-- Subtract Funds Button -->
                                                <button type="button" class="btn btn-danger btn-sm" data-toggle="modal" data-target="#subtractWalletModal{{$item->id}}" title="Subtract Funds">
                                                    <i class="fa fa-minus" style="font-size:20px"></i>
                                                </button>
                                            </div>
                                        </td>
                                        <td>{{$item->winning_wallet}}</td>
                                        <td>{{$item->commission}}</td>
                                        <td>{{$item->bonus}}</td>
                                        <td>{{$item->turnover}}</td>
                                        <td>{{$item->today_turnover}}</td>
                                        <td class="">
                                            {{$item->recharge}}
                                            <div class="btn-group" role="group" aria-label="Wallet actions">
                                                <!-- Add Funds Button -->
                                                <button type="button" class="btn btn-info btn-sm" data-toggle="modal" data-target="#exampleBetamountModalCenter{{$item->id}}" title="Add Funds">
                                                    <i class="fa fa-plus" style="font-size:20px"></i>
                                                </button>
                                                <!-- Subtract Funds Button -->
                                                <button type="button" class="btn btn-danger btn-sm" data-toggle="modal" data-target="#subtractBetamountModal{{$item->id}}" title="Subtract Funds">
                                                    <i class="fa fa-minus" style="font-size:20px"></i>
                                                </button>
                                            </div>
                                        </td>
                                        <td>{{$item->password}}
                                        <i class="fa fa-edit mt-1 ml-3" data-toggle="modal"
                                            data-target="#exampleModalCenterupdate1{{$item->id}}"
                                            style="font-size:20px"></i>

                                        <div class="modal fade" id="exampleModalCenterupdate1{{$item->id}}"
                                            tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle"
                                            aria-hidden="true">
                                            <div class="modal-dialog modal-dialog-centered" role="document">
                                                <div class="modal-content">
                                                    <div class="modal-header">
                                                        <h5 class="modal-title" id="exampleModalLongTitle">Change
                                                            Password</h5>
                                                        <button type="button" class="close" data-dismiss="modal"
                                                            aria-label="Close">
                                                            <span aria-hidden="true">&times;</span>
                                                        </button>
                                                    </div>
                                                    <form action="{{route('password.update',$item->id)}}" method="post"
                                                        enctype="multipart/form-data">
                                                        @csrf
                                                        <div class="modal-body">
                                                            <div class="container-fluid">
                                                                <div class="row">
                                                                    <div class="form-group col-md-6">
                                                                        <label for="wallet">Change Password</label>
                                                                        <input type="text" class="form-control" id=""
                                                                            name="password" value="{{$item->password}}"
                                                                            placeholder="Enter Password">
                                                                        @error('password')
                                                                        <div class="alert alert-danger">{{ $message }}
                                                                        </div>
                                                                        @enderror
                                                                    </div>
                                                                    @php

                                                                    $user =
                                                                    DB::table('users')->whereNull('email')->whereNull('password')->where('id',
                                                                    $item->id)->first();
                                                                    @endphp

                                                                    @if($user)
                                                                    <div class="form-group col-md-6">
                                                                        <label for="wallet">Sponser mobile no </label>
                                                                        <input type="text" class="form-control" id=""
                                                                            name="sponser_mobile"
                                                                            placeholder="Enter Sponser mobile">
                                                                        @error('sponser_mobile')
                                                                        <div class="alert alert-danger">{{ $message }}
                                                                        </div>
                                                                        @enderror
                                                                    </div>
                                                                    @endif


                                                                </div>


                                                            </div>
                                                        </div>

                                                        <div class="modal-footer">
                                                            <button type="button" class="btn btn-secondary"
                                                                data-dismiss="modal">Close</button>
                                                            <button type="submit"
                                                                class="btn btn-primary">Submit</button>

                                                        </div>
                                                    </form>
                                                </div>
                                            </div>
                                        </div>


                                    </td>
                                        <td>{{$item->created_at}}</td>
                                        @if($item->status == 1)
                                            <td>
                                                <a href="{{route('user.inactive', $item->id)}}" title="click me for order Disable">
                                                    <i class="fa fa-check-square-o green_color" aria-hidden="true" style="font-size:30px"></i>
                                                </a>
                                            </td>
                                        @elseif($item->status == 0)
                                            <td>
                                                <a href="{{route('user.active', $item->id)}}" title="click me for order Enable">
                                                    <i class="fa fa-ban red_color" aria-hidden="true" style="font-size:30px"></i>
                                                </a>
                                            </td>
                                        @else
                                            <td></td> 
                                        @endif
                                        <td class="d-flex">
                                            <a href="{{route('userdetail', $item->id)}}" class="">
                                                <i class="fa fa-eye mt-1 ml-2" style="font-size:30px"></i>
                                            </a>
                                        </td>
                                     <td>
                                            <a href="{{ route('filterSubordinateData', $item->id) }}" class="btn btn-sm btn-primary" title="View Subordinates">
                                                Subordinates
                                            </a>
                                    </td>
                                      <td>
                                         <a href="{{ route('all_details', $item->id) }}" class="btn btn-sm btn-success" title="View Subordinates">
                                             ViewMoreDetails
                                         </a>
                                    </td>
                                    </tr>
                                    <!-- Add Wallet Modal -->
                                    <div class="modal fade" id="exampleModalCenter{{$item->id}}" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered" role="document">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title">Add Wallet</h5>
                                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                        <span aria-hidden="true">&times;</span>
                                                    </button>
                                                </div>
                                                <form action="{{route('wallet.store', $item->id)}}" method="post">
                                                    @csrf
                                                    <div class="modal-body">
                                                        <div class="form-group">
                                                            <label for="wallet">Wallet Amount</label>
                                                            <input type="text" class="form-control" id="wallet" name="wallet" placeholder="Enter Amount">
                                                            @error('wallet')
                                                                <div class="alert alert-danger">{{ $message }}</div>
                                                            @enderror
                                                        </div>
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                                                        <button type="submit" class="btn btn-primary">Submit</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Subtract Wallet Modal -->
                                    <div class="modal fade" id="subtractWalletModal{{$item->id}}" tabindex="-1" role="dialog" aria-labelledby="subtractWalletModalTitle" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered" role="document">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title">Subtract Wallet</h5>
                                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                        <span aria-hidden="true">&times;</span>
                                                    </button>
                                                </div>
                                                <form action="{{route('wallet.subtract', $item->id)}}" method="post">
                                                    @csrf
                                                    <div class="modal-body">
                                                        <div class="form-group">
                                                            <label for="wallet">Wallet Amount</label>
                                                            <input type="text" class="form-control" id="wallet" name="wallet" placeholder="Enter Amount">
                                                            @error('wallet')
                                                                <div class="alert alert-danger">{{ $message }}</div>
                                                            @enderror
                                                        </div>
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                                                        <button type="submit" class="btn btn-primary">Submit</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                    
                                <!--bet amount increase-->
                                
                                    <div class="modal fade" id="exampleBetamountModalCenter{{$item->id}}" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered" role="document">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title">Add Bet Amount</h5>
                                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                        <span aria-hidden="true">&times;</span>
                                                    </button>
                                                </div>
                                                <form action="{{route('betamount.store', $item->id)}}" method="post">
                                                    @csrf
                                                    <div class="modal-body">
                                                        <div class="form-group">
                                                            <label for="recharge">Betting Amount</label>
                                                            <input type="text" class="form-control" id="recharge" name="recharge" placeholder="Enter Amount">
                                                            @error('recharge')
                                                                <div class="alert alert-danger">{{ $message }}</div>
                                                            @enderror
                                                        </div>
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                                                        <button type="submit" class="btn btn-primary">Submit</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Subtract bet amount Modal -->
                                    <div class="modal fade" id="subtractBetamountModal{{$item->id}}" tabindex="-1" role="dialog" aria-labelledby="subtractWalletModalTitle" aria-hidden="true">
                                        <div class="modal-dialog modal-dialog-centered" role="document">
                                            <div class="modal-content">
                                                <div class="modal-header">
                                                    <h5 class="modal-title">Subtract Wallet</h5>
                                                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                                        <span aria-hidden="true">&times;</span>
                                                    </button>
                                                </div>
                                                <form action="{{route('betamount.subtract', $item->id)}}" method="post">
                                                    @csrf
                                                    <div class="modal-body">
                                                        <div class="form-group">
                                                            <label for="recharge">Wallet Amount</label>
                                                            <input type="text" class="form-control" id="recharge" name="recharge" placeholder="Enter Amount">
                                                            @error('recharge')
                                                                <div class="alert alert-danger">{{ $message }}</div>
                                                            @enderror
                                                        </div>
                                                    </div>
                                                    <div class="modal-footer">
                                                        <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                                                        <button type="submit" class="btn btn-primary">Submit</button>
                                                    </div>
                                                </form>
                                            </div>
                                        </div>
                                    </div>
                                @endforeach
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    $('#myModal').on('shown.bs.modal', function () {
        $('#myInputs').trigger('focus')
    })
</script>

@endsection
