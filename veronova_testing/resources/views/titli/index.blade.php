@extends('admin.body.adminmaster')

@section('admin')
    <div class="container-fluid">
        <div class="row">
            <div class="col-md-12">
                <div class="white_shd full margin_bottom_30">
                    <div class="full graph_head">
                        <div class="heading1 margin_0 d-flex">
                            <h2>Game Management Table</h2>
                        </div>
                    </div>
                    <div class="table_section padding_infor_info">
                        <div class="table-responsive-sm">
                            <table id="gameTable" class="table table-striped" style="width:100%">
                                <thead class="thead-dark">
                                    <tr>
                                        <th>Id</th>
                                        <th>Card Name</th>
                                        <th>Image</th>
                                        <th>Winning Percentage %</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach($data as $row)
                                    <tr>
                                        <td>{{ $row->id }}</td>
                                        <td>{{ $row->name }}</td>
                                        <td>
                                            <img src="{{ asset($row->image) }}" alt="Image" width="50" height="50">
                                        </td>
                                        <td>{{ $row->multiplier }}%</td>
                                        <td>
                                            <i class="fa fa-edit mt-1 ml-3" data-toggle="modal" data-target="#exampleModalCenterupdate{{ $row->id }}" style="font-size:20px"></i>
                                        </td>
                                    </tr>
                                    @endforeach
                                </tbody>
                            </table>
                            <div class="table-navigation d-flex justify-content-between mt-3">
                                <button id="prevBtn" class="btn btn-success">Previous</button>
                                <button id="nextBtn" class="btn btn-success">Next</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    @foreach($data as $row)
        <div class="modal fade" id="exampleModalCenterupdate{{ $row->id }}" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Edit Data</h5>
                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                            <span aria-hidden="true">&times;</span>
                        </button>
                    </div>
                    <form action="{{ route('updateData', $row->id) }}" method="POST">
                        @csrf
                        @method('POST')
                    
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="name">Name</label>
                                <input type="text" class="form-control" name="name" value="{{ $row->name ?? '' }}">
                            </div>
                            <div class="form-group">
                                <label for="multiplier">Multiplier</label>
                                <input type="number" step="any" class="form-control" name="multiplier" value="{{ $row->multiplier }}" required>
                            </div>
                        </div>
                    
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                            <button type="submit" class="btn btn-primary">Update</button>
                        </div>
                    </form>

                </div>
            </div>
        </div>
    @endforeach

    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@4.6.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.datatables.net/1.10.25/js/jquery.dataTables.min.js"></script>
    <script src="https://cdn.datatables.net/1.10.25/js/dataTables.bootstrap4.min.js"></script>

    <script>
        $(document).ready(function() {
            var table = $('#gameTable').DataTable();
            
            $('#prevBtn').on('click', function() {
                table.page('previous').draw('page');
            });
            
            $('#nextBtn').on('click', function() {
                table.page('next').draw('page');
            });
        });
    </script>
@endsection
