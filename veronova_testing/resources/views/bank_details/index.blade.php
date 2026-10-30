@extends('admin.body.adminmaster')

@section('admin')

<div class="container-fluid">
    <div class="row">
        <div class="col-md-12">
            @if (session('message'))
    <div class="alert alert-success mt-2">
        {{ session('message') }}
    </div>
@endif

@if (session('error'))
    <div class="alert alert-danger mt-2">
        {{ session('error') }}
    </div>
@endif

            <div class="white_shd full margin_bottom_30">
                <div class="full graph_head">
                    <div class="heading1 margin_0 d-flex">
                        <h2>Bank Details List</h2>
                    </div>
                </div>
                <div class="table_section padding_infor_info">
                    <div class="table-responsive-sm">
                        <table id="example" class="table table-striped" style="width:100%">
                            <thead class="thead-dark">
                                <tr>
                                    <th>Id</th>
                                    <th>Name</th>
                                    <!--<th>Mobile</th>-->
                                    <th>Account Number</th>
                                    <th>Branch</th>
                                    <th>Bank Name</th>
                                    <th>IFSC Code</th>
                                    <th>UPI Id</th>
                                    <th>Date</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                @foreach($bank_details as $item)
                                    <tr>
                                        <td>{{$item->id}}</td>
                                        <td>{{$item->name}}</td>
                                       <!-- <td>{{$item->mobile}}</td>-->
                                        <td>{{$item->account_number}}</td>
                                        <td>{{$item->branch}}</td>
                                        <td>{{$item->bank_name}}</td>
                                        <td>{{$item->ifsc_code}}</td>
                                        <td>{{$item->upi_id}}</td>
                                        <td>{{$item->created_at}}</td>
                                         <td>
                                            <i class="fa fa-edit mt-1" data-toggle="modal" data-target="#exampleModalCenterupdate1{{$item->id}}" style="font-size:30px"></i>
                                              <div class="modal fade" id="exampleModalCenterupdate1{{$item->id}}" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
                        <div class="modal-dialog modal-dialog-centered" role="document">
                          <div class="modal-content">
                            <div class="modal-header">
                              <h5 class="modal-title" id="exampleModalLongTitle">Edit Bank Details</h5>
                              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                              </button>
                            </div>
                            <form action="{{route('edit_bank_details')}}" method="post" enctype="multipart/form-data">
                              @csrf
                            <div class="modal-body">
                              <div class="container-fluid">
                                <div class="row">
                                  <div class="form-group col-md-12">
                                    <label for="accumulated_amount">Name</label>
                                     <input type="hidden" class="form-control" id="accumulated_amount" name="id" value="{{$item->id}}" placeholder="Enter name">
                                    <input type="text" class="form-control" id="accumulated_amount" name="name" value="{{$item->name}}" placeholder="Enter name">
                                   
                                    @error('name')
                                        <div class="alert alert-danger">{{ $message }}</div>
                                    @enderror
                                  </div>
                                    <div class="form-group col-md-12">
                                    <label for="accumulated_amount">Account</label>
                                    <input type="text" class="form-control" id="accumulated_amount" name="account_number" value="{{$item->account_number}}" placeholder="Enter account_number">
                                    @error('account_number')
                                        <div class="alert alert-danger">{{ $message }}</div>
                                    @enderror
                                  </div>
                                    <div class="form-group col-md-12">
                                    <label for="accumulated_amount">Branch</label>
                                    <input type="text" class="form-control" id="accumulated_amount" name="branch" value="{{$item->branch}}" placeholder="Enter name">
                                    @error('branch')
                                        <div class="alert alert-danger">{{ $message }}</div>
                                    @enderror
                                  </div>
                                  <div class="form-group col-md-12">
                                    <label for="amount">Bank Name</label>
                                    <input type="text" class="form-control" id="amount" name="bank_name" value="{{$item->bank_name}}" placeholder="Enter bank name">
                                    @error('bank_name')
                                        <div class="alert alert-danger">{{ $message }}</div>
                                    @enderror
                                  </div>
                                   <div class="form-group col-md-12">
                                    <label for="amount">IFSC Code</label>
                                    <input type="text" class="form-control" id="amount" name="ifsc_code" value="{{$item->ifsc_code}}" placeholder="Enter ifsc code">
                                    @error('ifsc_code')
                                        <div class="alert alert-danger">{{ $message }}</div>
                                    @enderror
                                  </div>
                                     <div class="form-group col-md-12">
                                    <label for="upi">UPI Id</label>
                                    <input type="text" class="form-control" id="upi" name="upi_id" value="{{$item->upi_id}}" placeholder="Enter upi id">
                                    @error('upi_id')
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
                                          </td>
                                    </tr>
                         
            </div>
        </div>
    </div> 
</div>

@endsection
