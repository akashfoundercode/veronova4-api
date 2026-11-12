@extends('admin.body.adminmaster')

@section('admin')

<div class="container-fluid">
  <div class="row">
<div class="col-md-12">
  <div class="white_shd full margin_bottom_30">
     <div class="full graph_head">
        <div class="heading1 margin_0 d-flex">
           <h2>Gift List</h2>
            <button type="button" class="btn btn-info" data-toggle="modal" data-target="#exampleModalCenter" style="margin-left:650px;">Add Gift</button> 
        </div>
     </div>
     <div class="table_section padding_infor_info">
        <div class="table-responsive-sm">
           <table id="example" class="table table-striped" style="width:100%">
              <thead class="thead-dark">
                 <tr>
                    <th>Id</th>
                    <th>Code</th>
                    <th>Deposit Amount</th>
                    <th>Gift Amount</th>
                    <th>Number_People</th>
					<th>Available People</th>
                    <th>Date</th>
                    <th>Action</th>
                 </tr>
              </thead>
              <tbody>
                @foreach($gifts as $item)
                 <tr>
                    <td>{{$item->id}}</td>
                    <td>{{$item->code}}</td>
                    <td>{{$item->deposit_amount}}</td>
                    <td>{{$item->amount}}</td>
					
                    <td>{{$item->number_people}}</td>
					   <td>{{$item->availed_num}}</td>
                    
                    <td>
                      {{$item->datetime}}
                      {{-- <i class="fa fa-edit mt-1" data-toggle="modal" data-target="#exampleModalCenterupdate1{{$item->id}}" style="font-size:30px"></i> --}}
                      {{-- <a href="{{route('mlmlevel.delete',$item->id)}}"><i class="fa fa-trash mt-1 ml-1" style="font-size:30px;color:red;" ></i></a> --}}
                    </td>
                    <td class="d-flex">
                      {{-- Edit Icon --}}
                      <button class="btn btn-sm btn-info mr-2" data-toggle="modal" data-target="#editGiftModal{{$item->id}}">
                        <i class="fa fa-edit"></i>
                      </button>
                    
                      {{-- Delete Icon --}}
                      <a href="{{ route('delete-gift', $item->id) }}" class="btn btn-sm btn-danger"
                         onclick="return confirm('Are you sure you want to delete this gift?')">
                        <i class="fa fa-trash"></i>
                      </a>
                      @foreach($gifts as $item)
                            <div class="modal fade" id="editGiftModal{{$item->id}}" tabindex="-1" role="dialog" aria-labelledby="editModalLabel{{$item->id}}" aria-hidden="true">
                              <div class="modal-dialog modal-dialog-centered" role="document">
                                <form action="{{ route('gift.update', $item->id) }}" method="POST">
                                  @csrf
                                  <div class="modal-content">
                                    <div class="modal-header">
                                      <h5 class="modal-title">Edit Gift (Code: {{$item->code}})</h5>
                                      <button type="button" class="close" data-dismiss="modal"><span>&times;</span></button>
                                    </div>
                                    <div class="modal-body">
                                      <div class="container-fluid">
                                        <div class="row">
                                          <div class="form-group col-md-12">
                                            <h4><label for="deposit_amount">Deposit Amount</label></h4>
                                            <input type="text" class="form-control" name="deposit_amount" value="{{ $item->deposit_amount }}">
                                          </div>
                                          <div class="form-group col-md-12">
                                            <h4><label for="amount">Gift Amount</label></h4>
                                            <input type="text" class="form-control" name="amount" value="{{ $item->amount }}">
                                          </div>
                                          <div class="form-group col-md-12">
                                            <h4><label for="number_people">Number People</label></h4>
                                            <input type="text" class="form-control" name="number_people" value="{{ $item->number_people }}">
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                    <div class="modal-footer">
                                      <button type="submit" class="btn btn-success">Update</button>
                                      <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                                    </div>
                                  </div>
                                </form>
                              </div>
                            </div>
                          @endforeach

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

<div class="modal fade" id="exampleModalCenter" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
   <div class="modal-dialog modal-dialog-centered" role="document">
     <div class="modal-content">
       <div class="modal-header">
         <h5 class="modal-title" id="exampleModalLongTitle">Add Gift</h5>
         <button type="button" class="close" data-dismiss="modal" aria-label="Close">
           <span aria-hidden="true">&times;</span>
         </button>
       </div>
       <form action="{{route('gift.store')}}" method="POST" enctype="multipart/form-data">
         @csrf
       <div class="modal-body">
         <div class="container-fluid">
           <div class="row">
               <div class="form-group col-md-12">
               <h4><label for="number_people">Deposit Amount</label></h4>
               <input  type="text" class="form-control" id="deposit_amount" name="deposit_amount" placeholder="Enter Deposit Amount">
             </div>
             <div class="form-group col-md-12">
               <h4><label for="number_people">Gift Amount</label></h4>
               <input type="text" class="form-control" id="amount" name="amount" placeholder="Enter amount">
             </div>
             <div class="form-group col-md-12">
               <h4><label for="number_people">Number People</label></h4>
               <input  type="text" class="form-control" id="number_people" name="number_people" placeholder="Enter number_people">
             </div>
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

 
 
 <script>
     $('#myModal').on('shown.bs.modal', function () {
   $('#myInput').trigger('focus')
    })
 </script>


@endsection