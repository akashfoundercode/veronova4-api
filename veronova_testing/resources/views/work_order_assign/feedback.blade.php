@extends('admin.body.adminmaster')

@section('admin')

<div class="container-fluid">
    <div class="row">
<div class="col-md-12">
    <div class="white_shd full margin_bottom_30">
       <div class="full graph_head">
          <div class="heading1 margin_0 d-flex">
             <h2>FeedBack List</h2>
             {{-- <button type="button" class="btn btn-info" data-toggle="modal" data-target="#exampleModalCenter" style="margin-left:650px;">Add Work Report</button> --}}
          </div>
       </div>
       <div class="table_section padding_infor_info">
          <div class="table-responsive-sm">
             <table id="example" class="table table-striped" style="width:100%">
                <thead class="thead-dark">
                   <tr>
                      <th>Id</th>
                      <th>User Name</th>
                      <th>Description</th>
                      {{-- <th>Latlong</th> --}}
                      <th>Date</th>
                      {{-- <th>Action</th> --}}
                   </tr>
                </thead>
                <tbody>
                  @foreach($feedbacks as $item)
                   <tr>
                      <td>{{$item->id}}</td>
                      <td>{{$item->uname}}</td>
                      <td>{{$item->description}}</td>
                      {{-- <td>{{$item->latlong}}</td> --}}
                      <td>{{$item->created_at}}</td>
                      {{-- <td>
                        <i class="fa fa-edit mt-1" data-toggle="modal" data-target="#exampleModalCenterupdate{{$item->id}}" style="font-size:30px"></i>
                        <a href="{{route('work_report.delete',$item->id)}}"><i class="fa fa-trash mt-1 ml-1" style="font-size:30px;color:red;" ></i></a>
            
                      </td> --}}
                      {{-- <div class="modal fade" id="exampleModalCenterupdate{{$item->id}}" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                          <div class="modal-content">
                            <div class="modal-header">
                              <h5 class="modal-title" id="exampleModalLongTitle">Edit Work Report</h5>
                              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                              </button>
                            </div>
                            <form action="{{route('work_report.update',$item->id)}}" method="POST" enctype="multipart/form-data">
                              @csrf
                            <div class="modal-body">
                              <div class="container-fluid">
                                <div class="row">
                                  <div class="form-group col-md-6">
                                    <label for="type">Work Type</label>
                                    <input type="text" class="form-control" id="type" name="type" value="{{$item->type}}" placeholder="Enter work type">
                                  </div>
                                  <div class="form-group col-md-6">
                                    <label for="data">Data</label>
                                    <input type="text" class="form-control" id="data" value="{{$item->data}}" name="data" placeholder="Enter Data">
                                  </div>
                                  
                                </div>
                                <div class="row">
                                    <div class="form-group col-md-6">
                                        <label for="s_no">S.no</label>
                                        <input type="text" class="form-control" name="s_no" value="{{$item->s_no}}" id="s_no" placeholder="Enter Sno">
                                      </div>
                               
                                    <div class="form-group col-md-6">
                                      <label for="latlong">Latlong</label>
                                      <input type="text"  class="form-control" id="latlong" name="latlong" value="{{$item->latlong}}"  placeholder="Enter Latlong">
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
                      </div> --}}
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
{{-- <div class="modal fade" id="exampleModalCenter" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
    <div class="modal-dialog modal-dialog-centered" role="document">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="exampleModalLongTitle">Add Work Report</h5>
          <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <form action="{{route('work_report.store')}}" method="POST" enctype="multipart/form-data">
          @csrf
        <div class="modal-body">
          <div class="container-fluid">
            <div class="row">
              <div class="form-group col-md-6">
                <label for="type">Work Type</label>
                <input type="text" class="form-control" id="type" name="type" placeholder="Enter work type">
              </div>
              <div class="form-group col-md-6">
                <label for="data">Data</label>
                <input type="text" class="form-control" id="data" name="data" placeholder="Enter Data">
              </div>
              
            </div>
            <div class="row">
                <div class="form-group col-md-12">
                    <label for="s_no">S.no</label>
                    <input type="text" class="form-control" name="s_no" id="s_no" placeholder="Enter Sno">
                  </div>
            </div>
            <div class="row">
                <div class="form-group col-md-12">
                  <label for="latlong">Latlong</label>
                  <input type="text"  class="form-control" id="latlong" name="latlong"  placeholder="Enter Latlong">
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
</script> --}}
 @endsection