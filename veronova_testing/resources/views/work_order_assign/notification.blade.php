@extends('admin.body.adminmaster')

@section('admin')

<div class="container-fluid">
    <div class="row">
<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
             <div class="heading1 margin_0 d-flex">
             <h2>Notification  List</h2>
           
          </div>
		    <div class="heading1 margin_0 d-flex">
               <a href="{{route('add_notification')}}" class="btn btn-info"  style="margin-left:650px;">Add Notification</a>
           
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
             <table id="example" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>name</th>
                      <th>Notification</th>
                      <th>Action</th>
                   </tr>
                </thead>
                <tbody>
                  @foreach($settings as $item)
                   <tr>
                      <td>{{$item->id}}</td>
                      <td>{{$item->name}}</td>
                      <td>{{$item->disc}}</td>
                      <td>
                        <a href="{{route('view_notification',$item->id)}}"><i class="fa fa-edit mt-1"  style="font-size:30px"></i></a>
                     
            
                      </td>
                      
                    
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