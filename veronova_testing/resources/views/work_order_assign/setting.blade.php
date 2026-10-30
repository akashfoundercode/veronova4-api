@extends('admin.body.adminmaster')

@section('admin')

<div class="container-fluid">
    <div class="row">
<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
          <div class="heading1 margin_0 d-flex">
             <h2>Setting List</h2>
             
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
             <table id="example" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>name</th>
                      <th>Status</th>
                      <th>Action</th>
                   </tr>
                </thead>
                <tbody>
                  @foreach($settings as $item)
                   <tr>
                      <td>{{$item->id}}</td>
                      <td>{{$item->name}}</td>
                      
                      @if($item->status==1)  
                      <td><a href="#" title="click me for work_details Disable"><i class="fa fa-check-square-o green_color" aria-hidden="true" style="font-size:30px"></i></a></td>
                     @elseif($item->status==0)
                     <td><a href="#" title="click me for work_details Enable"><i class="fa fa-ban red_color" aria-hidden="true" style="font-size:30px"></i></td>
                      @else
                      <td> </td>
                      @endif
                      <td>
                        <a href="{{route('view',$item->id)}}"><i class="fa fa-edit mt-1"  style="font-size:30px"></i></a>
                        {{-- <a href="{{route('work_details.delete',$item->id)}}"><i class="fa fa-trash mt-1 ml-1" style="font-size:30px;color:red;" ></i></a> --}}
            
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