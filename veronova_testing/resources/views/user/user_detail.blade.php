@extends('admin.body.adminmaster')

@section('admin')
<div class="container-fluid">
    <div class="row">
<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
          <div class="heading1 margin_0 d-flex">
             <h2>User Bet</h2>
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
            

             <table id="example" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>Amount</th>
                      <th>number</th>
					   <th>Game</th>
					    <th>GameNo</th>
                      <th>Date time</th>
                      
                      
                   </tr>
                </thead>
                <tbody>
                    @foreach($users as $row)
                    <tr>
                        <td>{{$row->id}}</td>
                        <td>{{$row->amount}}</td>
                        <td>{{$row->number}}</td>
						<td><?php if($row->game_id==1){echo "Wingo 1 Minute";}elseif($row->game_id==2){echo "Wingo 3 Minute";}elseif($row->game_id==3){echo "Wingo 5 Minute";}elseif($row->game_id==4){echo "Wingo 10 Minute";}elseif($row->game_id==5){echo "Aviator";}elseif($row->game_id==6){echo "TRX 1 Minute";}elseif($row->game_id==7){echo "TRX 3 Minute";}elseif($row->game_id==8){echo "TRX 5 Minute";}elseif($row->game_id==9){echo "TRX 10 Minute";}elseif($row->game_id==10){echo "Dragon Tiger";}elseif($row->game_id==11){echo "Plinko";}elseif($row->game_id==12){echo "Mine Game";} ?></td>
						<td>{{$row->games_no}}</td>
                        <td>{{$row->created_at}}</td>
                       
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
<div class="container-fluid">
    <div class="row">
<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
          <div class="heading1 margin_0 d-flex">
             <h2>User Withdrawal</h2>
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
            

             <table id="examplesss" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>Amount</th>
                       <th>Status</th>
                      <th>Date time</th>
                      
                      
                   </tr>
                </thead>
                <tbody>
                    @foreach($withdrawal as $rows)
                    <tr>
                        <td>{{$rows->id}}</td>
                        <td>{{$rows->amount}}</td>
                        @if($rows->status==1)  
                      <td>
                        
                       
                          <button class="dropbtn" style="font-size:13px;">Pending</button>
                      
                      </td>
                     @elseif($rows->status==2)
                     <td><button class="btn btn-success">Success</button></td>
                      @elseif($rows->status==3)
                     <td><button class="btn btn-danger">Reject</button></td>
                      @else
                      <td>
                     
                      </td> 
                      @endif
                        <td>{{$rows->created_at}}</td>
                       
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
<div class="container-fluid">
    <div class="row">
<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
          <div class="heading1 margin_0 d-flex">
             <h2>User Diposite</h2>
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
            

             <table id="exampless" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>Amount</th>
                      <!--<th>number</th>-->
					   <th>Transaction </th>
					   <th>Status</th>
					   
                      <th>Date time</th>
                      
                      
                   </tr>
                </thead>
                <tbody>
                    @foreach($dipositess as $rowtest)
                    <tr>
                        <td>{{$rowtest->id}}</td>
                        <td>{{$rowtest->cash}}</td>
						<td>{{$rowtest->order_id}}</td>
						  @if($rowtest->status==1)  
                     
                        
                       
                         <td><button class="btn btn-warning">Pending</button></td>
                      
                     
                     @elseif($rowtest->status==2)
                     <td><button class="btn btn-success">Success</button></td>
                      @elseif($rowtest->status==3)
                     <td><button class="btn btn-danger">Reject</button></td>
                      @else
                      <td>
                     
                      </td> 
                      @endif
                        <td>{{$rowtest->created_at}}</td>
                       
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