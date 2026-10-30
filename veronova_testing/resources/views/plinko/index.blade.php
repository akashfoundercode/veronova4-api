@extends('admin.body.adminmaster')

@section('admin')

<div class="container-fluid">
  <div class="row">
<div class="col-md-12">
  <div class="white_shd full margin_bottom_30">
     <div class="full graph_head">
        <div class="heading1 margin_0 d-flex">
           <h2>Plinko</h2>

     </div>
     <div class="table_section padding_infor_info">
        <div class="table-responsive-sm">
           <table id="example" class="table table-striped" style="width:100%">
              <thead class="thead-dark">
                 <tr>
                    <th>Id</th>
                    <th>Username</th>
                    <th>Bet Amount</th>
                    <th>Multiplier</th>
                    <th>Wining Amount</th>
					 <th>Date Time</th>
                 </tr>
              </thead>
              <tbody>
                @foreach($bets as $item)
                 <tr>
                    <td>{{$item->id}}</td>
                    <td>{{$item->username}}</td>
                    
                    <td>{{$item->amount}}</td>
                    <td>{{$item->multipler}}</td>
                    
                    <td>{{$item->win_amount}}</td>
                     <td>{{$item->datetime}}</td>
                 </tr>
                 @endforeach
              </tbody>
           </table>
        </div>
     </div>
  </div>
</div>
</div>
</div> 




@endsection
