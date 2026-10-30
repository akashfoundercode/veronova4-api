@extends('admin.body.adminmaster')

@section('admin')

<div class="container-fluid">
    <div class="row">
<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
          <div class="heading1 margin_0 d-flex">
             <h2>Attendance List</h2>
             <!--<button type="button" class="btn btn-info" data-toggle="modal" data-target="#exampleModalCenter" style="margin-left:650px;">Add Attendance</button>-->
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
             <table id="example" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>accumulated_amount</th>
                       <th>attendance_bonus</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                   </tr>
                </thead>
                <tbody>
                  @foreach($attendances as $item)
                   <tr>
                      <td>{{$item->id}}</td>
                      <td>{{$item->accumulated_amount}}</td>
                      <td>{{$item->attendance_bonus}}</td>
                      <td>{{$item->created_at}}</td>
                      <td></td>
                      <td>
                        <i class="fa fa-edit mt-1" data-toggle="modal" data-target="#exampleModalCenterupdate1{{$item->id}}" style="font-size:30px"></i>
                        <!--<a href="{{route('attendance.delete',$item->id)}}"><i class="fa fa-trash mt-1 ml-1" style="font-size:30px;color:red;" ></i></a>-->
                      </td>
                      <div class="modal fade" id="exampleModalCenterupdate1{{$item->id}}" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                          <div class="modal-content">
                            <div class="modal-header">
                              <h5 class="modal-title" id="exampleModalLongTitle">Edit Attendance Amount</h5>
                              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                              </button>
                            </div>
                            <form action="{{route('attendance.update',$item->id)}}" method="post" enctype="multipart/form-data">
                              @csrf
                            <div class="modal-body">
                              <div class="container-fluid">
                                <div class="row">
                                  <div class="form-group col-md-12">
                                    <label for="accumulated_amount">Amount</label>
                                    <input type="text" class="form-control" id="accumulated_amount" name="accumulated_amount" value="{{$item->accumulated_amount}}" placeholder="Enter name">
                                    @error('amount')
                                        <div class="alert alert-danger">{{ $message }}</div>
                                    @enderror
                                  </div>
                                  
                                  <div class="form-group col-md-12">
                                    <label for="amount">Attendance Bonus</label>
                                    <input type="text" class="form-control" id="amount" name="attendance_bonus" value="{{$item->attendance_bonus}}" placeholder="Enter name">
                                    @error('amount')
                                        <div class="alert alert-danger">{{ $message }}</div>
                                    @enderror
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
                  <h5 class="modal-title" id="exampleModalLongTitle">Add Attendance</h5>
                  <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                  </button>
                </div>
                <form action="{{route('attendance.store')}}" method="POST" enctype="multipart/form-data">
                  @csrf
                <div class="modal-body">
                  <div class="container-fluid">
                    <div class="row">
                      <div class="form-group col-md-12">
                        <label for="amount">Amount</label>
                        <input type="text" class="form-control" id="amount" name="accumulated_amount" placeholder="Enter amount">
                      </div>
                      <div class="form-group col-md-12">
                        <label for="attendance_bonus">attendance Bonus</label>
                        <input type="text" class="form-control" id="attendance_bonus" name="attendance_bonus" placeholder="Enter amount">
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