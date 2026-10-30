@extends('admin.body.adminmaster')

@section('admin')

<div class="container-fluid">
    <div class="row">
<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
          <div class="heading1 margin_0 d-flex">
             <h2>Order List</h2>
             <button type="button" class="btn btn-info" data-toggle="modal" data-target="#exampleModalCenter" style="margin-left:720px;">Add Order</button>
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
             <table id="example" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>Description</th>
                      <th>Quantity</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                   </tr>
                </thead>
                <tbody>
                  @foreach($orders as $item)
                   <tr>
                      <td>{{$item->id}}</td>
                      <td>{{$item->description}}</td>
                      <td>{{$item->quentity}}</td>
                      <td>{{$item->created_at}}</td>
                      @if($item->status==1)  
                      <td><a href="{{route('order.active',$item->id)}}" title="click me for order Disable"><i class="fa fa-check-square-o green_color" aria-hidden="true" style="font-size:30px"></i></a></td>
                     @elseif($item->status==0)
                     <td><a href="{{route('order.inactive',$item->id)}}" title="click me for order Enable"><i class="fa fa-ban red_color" aria-hidden="true" style="font-size:30px"></i></td>
                      @else
                      <td> </td>
                      @endif
                      <td>
                        <i class="fa fa-edit mt-1" data-toggle="modal" data-target="#exampleModalCenterupdate1{{$item->id}}" style="font-size:30px"></i>
                        <a href="{{route('order.delete',$item->id)}}"><i class="fa fa-trash mt-1 ml-1" style="font-size:30px;color:red;" ></i></a>
                      </td>
                      <!-- Modal -->
<div class="modal fade" id="exampleModalCenterupdate1{{$item->id}}" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered" role="document">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="exampleModalLongTitle">Edit Order</h5>
        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <form action="{{route('order.update',$item->id)}}" method="POST" enctype="multipart/form-data">
        @csrf
      <div class="modal-body">
        <div class="container-fluid">
          <div class="row">
            <div class="form-group col-md-12">
              <label for="quentity">Quantity</label>
              <input type="text" class="form-control" id="quentity" value="{{$item->quentity}}" name="quentity" placeholder="Enter Quantity">
            </div>
          </div>
          <div class="row">
            <div class="form-group col-md-12">
              <label for="description">Description</label>
              <textarea class="form-control" id="description" name="description" rows="4" cols="50">{{$item->description}}</textarea>
            </div>
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
{{-- popup modal form --}}
<!-- Modal -->
<div class="modal fade" id="exampleModalCenter" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLongTitle">Add Order</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <form action="{{route('order.store')}}" method="POST" enctype="multipart/form-data">
          @csrf
        <div class="modal-body">
          <div class="container-fluid">
            <div class="row">
              <div class="form-group col-md-12">
                <label for="quentity">Quantity</label>
                <input type="text" class="form-control" id="quentity" name="quentity" placeholder="Enter Quantity">
              </div>
            </div>
            <div class="row">
              <div class="form-group col-md-12">
                <label for="description">Description</label>
                <textarea class="form-control" id="description" name="description" rows="4" cols="50"></textarea>
              </div>
            </div>
           
        </div>
      
        </form>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
          <button type="submit" class="btn btn-primary">Submit</button>
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