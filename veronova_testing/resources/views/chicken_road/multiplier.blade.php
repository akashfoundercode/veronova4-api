@extends('admin.body.adminmaster')

@section('admin')

<div class="clearfix"></div>

<div class="content-wrapper">

<!-- Roast Multiplier Table Card -->
<div class="col-lg-12 mb-4">
  <div class="card shadow border-0">
      @if(session('success'))
      <div id="flash-message" class="flash-message">
          {{ session('success') }}
      </div>

      <script>
          setTimeout(function () {
              let flash = document.getElementById('flash-message');
              if (flash) {
                  flash.style.top = '-100px';
                  flash.style.opacity = '0';
              }
          }, 3000);
      </script>
      @endif

      <div class="card-body">
          <h5 class="card-title text-primary fw-bold mb-3">🔥 Roast Multiplier Set</h5>

          <div class="table-responsive">
              <table class="table table-bordered table-hover text-center">
                  <thead>
                      <tr>
                          <th>ID</th>
                          <th>Type</th>
                          <th>Roast Multiplier</th>
                          <th>Action</th>
                      </tr>
                  </thead>
                  <tbody>
                      @foreach($roast_multipliers as $item)
                      <tr>
                          <td>{{ $item->id }}</td>
                          <td>
                              @if($item->types == 1)
                                  <span class="badge badge-success">Easy</span>
                              @elseif($item->types == 2)
                                  <span class="badge badge-info">Medium</span>
                              @elseif($item->types == 3)
                                  <span class="badge badge-primary">Hard</span>
                              @elseif($item->types == 4)
                                  <span class="badge badge-danger">Hardcore</span>
                              @else
                                  <span class="badge badge-secondary">Unknown</span>
                              @endif
                          </td>

                          <td>{{ $item->roast_multiplier }}</td>
                          <td>
                              <a href="javascript:void(0);" class="text-primary" data-toggle="modal" data-target="#editRoast{{ $item->id }}">
                                  <i class="fa fa-pencil-alt"></i>
                              </a>
                          </td>
                      </tr>
                      @endforeach
                  </tbody>
              </table>
          </div>
      </div>
  </div>
</div>

<!-- Edit Modals for Roast Multipliers -->
@foreach($roast_multipliers as $item)
<div class="modal fade" id="editRoast{{ $item->id }}" tabindex="-1" role="dialog" aria-labelledby="editRoastLabel{{ $item->id }}" aria-hidden="true">
    <div class="modal-dialog modal-dialog" role="document">
        <form action="{{ route('updateRoastMultiplier') }}" method="POST">
            @csrf
            <input type="hidden" name="id" value="{{ $item->id }}">
            <div class="modal-content" style="background: linear-gradient(135deg, #1f1c2c, #928dab); color: white; border-radius: 10px;">
                <div class="modal-header border-0">
                    <h5 class="modal-title text-white">
                        Edit Roast Multiplier (
                        {{ $item->types == 1 ? 'Easy' : ($item->types == 2 ? 'Medium' : ($item->types == 3 ? 'Hard' : ($item->types == 4 ? 'Hardcore' : 'Unknown'))) }}
                        )
                    </h5>
                    <button type="button" class="close text-white" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="font-weight-bold text-light">Roast Multiplier</label>
                        <select name="roast_multiplier" class="form-control" style="background:#2a2b38; color:white;" required>
                            <option value="0" {{ $item->roast_multiplier == 0 ? 'selected' : '' }}>Random</option>
                            @if(isset($multiList[$item->types]))
                                @foreach($multiList[$item->types] as $multi)
                                    <option value="{{ $multi }}" {{ $item->roast_multiplier == $multi ? 'selected' : '' }}>
                                        {{ $multi }}
                                    </option>
                                @endforeach
                            @else
                                <option value="">No Multiplier Found</option>
                            @endif
                        </select>
                    </div>
                </div>
                <div class="modal-footer border-0">
                    <button type="submit" class="btn btn-primary">Update</button>
                    <button type="button" class="btn btn-outline-light" data-dismiss="modal">Close</button>
                </div>
            </div>
        </form>
    </div>
</div>
@endforeach

<!-- Multiplier List Section -->
<div class="container-fluid mt-4">
  <div class="col-lg-12">
      <div class="card shadow-lg border-0">
          <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                  <h4 class="card-title text-primary fw-bold mb-0">Multiplier List</h4>
                  <button class="btn btn-success" data-toggle="modal" data-target="#addMultiplierModal">
                      ➕ Add Multiplier
                  </button>
              </div>

              <div class="table-responsive">
                  <table id="betTable" class="table table-striped table-hover table-bordered align-middle">
                      <thead class="text-center">
                          <tr>
                              <th>ID</th> 
                              <th>Multiplier</th> 
                              <th>Type</th> 
                              <th>Created At</th> 
                              <th>Action</th>
                          </tr>
                      </thead>
                      <tbody class="text-center">
                          @foreach($multiplier as $key => $multipliers)
                          <tr> 
                              <td></td>
                              <td><span class="badge badge-warning text-dark">{{ $multipliers->multiplier }}x</span></td> 
                              <td>
                                  @if($multipliers->type == 1)
                                      <span class="badge badge-success">Easy</span>
                                  @elseif($multipliers->type == 2)
                                      <span class="badge badge-info">Medium</span>
                                  @elseif($multipliers->type == 3)
                                      <span class="badge badge-primary">Hard</span>
                                  @elseif($multipliers->type == 4)
                                      <span class="badge badge-danger">Hardcore</span>
                                  @else
                                      <span class="badge badge-secondary">Unknown</span>
                                  @endif
                              </td>
                              <td>{{ \Carbon\Carbon::parse($multipliers->created_at)->format('d M Y h:i A') }}</td>
                              <td>
                                  <a href="javascript:void(0);" class="text-primary mr-2" data-toggle="modal" data-target="#editModal{{ $multipliers->id }}">
                                      <i class="fa fa-pencil-alt"></i>
                                  </a>
                                  <a href="javascript:void(0);" class="text-danger" data-toggle="modal" data-target="#deleteMultiplier{{ $multipliers->id }}">
                                      <i class="fa fa-trash"></i>
                                  </a>
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

<!-- Edit & Delete Modals for Multipliers -->
@foreach($multiplier as $multipliers)
<div class="modal fade" id="editModal{{ $multipliers->id }}" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-dialog" role="document">
        <form action="{{ route('multiplier_update')}}" method="POST">
            @csrf
            <input type="hidden" name="id" value="{{ $multipliers->id }}">
            <div class="modal-content" style="background: linear-gradient(145deg, #1f1c2c, #928dab); color: white;">
                <div class="modal-header border-0">
                    <h5 class="modal-title">✏️ Edit Multiplier</h5>
                    <button type="button" class="close text-white" data-dismiss="modal">
                        <span>&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Multiplier</label>
                        <input type="text" name="multiplier" class="form-control" value="{{ $multipliers->multiplier }}" required>
                    </div>
                    <div class="form-group">
                        <label>Frequency</label>
                        <input type="number" name="frequency" class="form-control" value="{{ $multipliers->frequency ?? '' }}">
                    </div>
                    <div class="form-group">
                        <label>Type</label>
                        <select name="type" class="form-control" required>
                            <option value="1" {{ $multipliers->type == 1 ? 'selected' : '' }}>Easy</option>
                            <option value="2" {{ $multipliers->type == 2 ? 'selected' : '' }}>Medium</option>
                            <option value="3" {{ $multipliers->type == 3 ? 'selected' : '' }}>Hard</option>
                            <option value="4" {{ $multipliers->type == 4 ? 'selected' : '' }}>Hardcore</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer border-0">
                    <button type="submit" class="btn btn-primary">Update</button>
                    <button type="button" class="btn btn-outline-light" data-dismiss="modal">Close</button>
                </div>
            </div>
        </form>
    </div>
</div>

<div class="modal fade" id="deleteMultiplier{{ $multipliers->id }}" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-dialog" role="document">
        <form action="{{ route('multiplier_delete') }}" method="POST">
            @csrf
            <input type="hidden" name="id" value="{{ $multipliers->id }}">
            <div class="modal-content" style="background: linear-gradient(135deg, #1f1c2c, #928dab); color: white;">
                <div class="modal-header border-0">
                    <h5 class="modal-title">Delete Confirmation</h5>
                    <button type="button" class="close text-white" data-dismiss="modal">
                        <span>&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete this multiplier?</p>
                </div>
                <div class="modal-footer border-0">
                    <button type="submit" class="btn btn-danger">Yes, Delete</button>
                    <button type="button" class="btn btn-outline-light" data-dismiss="modal">Cancel</button>
                </div>
            </div>
        </form>
    </div>
</div>
@endforeach

<!-- Add Multiplier Modal -->
<div class="modal fade" id="addMultiplierModal" tabindex="-1" role="dialog">
    <div class="modal-dialog modal-dialog" role="document">
        <form action="{{ route('add_multiplier') }}" method="POST">
            @csrf
            <div class="modal-content" style="background: linear-gradient(145deg, #1f1c2c, #928dab); color: white;">
                <div class="modal-header border-0">
                    <h5 class="modal-title">🎯 Add Multiplier</h5>
                    <button type="button" class="close text-white" data-dismiss="modal">
                        <span>&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Multiplier (e.g., 2.5)</label>
                        <input type="text" name="multiplier" class="form-control" required>
                    </div>
                    <div class="form-group">
                        <label>Frequency</label>
                        <input type="number" name="frequency" class="form-control">
                    </div>
                    <div class="form-group">
                        <label>Type</label>
                        <select name="type" class="form-control" required>
                            <option value="1">Easy</option>
                            <option value="2">Medium</option>
                            <option value="3">Hard</option>
                            <option value="4">Hardcore</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer border-0">
                    <button type="submit" class="btn btn-success">Add</button>
                    <button type="button" class="btn btn-outline-light" data-dismiss="modal">Close</button>
                </div>
            </div>
        </form>
    </div>
</div>




<div class="overlay toggle-menu"></div>
</div>

<a href="javascript:void(0);" class="back-to-top"><i class="fa fa-angle-double-up"></i></a>

<!-- Scripts -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="assets/js/popper.min.js"></script>
<script src="assets/js/bootstrap.min.js"></script>

<!-- DataTables -->
<link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
<script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>

<!-- Viewport Meta Tag for Mobile -->
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">

<style>
    /* Responsive adjustments */
    .flash-message {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #d4edda;
        color: #155724;
        border: 1px solid #c3e6cb;
        padding: 10px 20px;
        border-radius: 8px;
        z-index: 9999;
        box-shadow: 0px 4px 8px rgba(0,0,0,0.1);
        transition: all 0.5s ease-in-out;
        max-width: 90%;
        word-wrap: break-word;
    }
    
    /* Modal adjustments for mobile */
    @media (max-width: 576px) {
        .modal-dialog {
            margin: 10px auto;
            max-width: 95%;
        }
        
        .modal-content {
            font-size: 14px;
        }
        
        .table-responsive {
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
        }
        
        .card-body {
            padding: 15px;
        }
    }
    
    /* Prevent horizontal scrolling on mobile */
    html, body {
        overflow-x: hidden;
    }
    
    /* Button tap highlight color for iOS */
    a, button {
        -webkit-tap-highlight-color: transparent;
    }
    
</style>

<script>
  $(document).ready(function() {
      var table = $('#betTable').DataTable({
          "pageLength": 10,
          "lengthMenu": [5, 10, 25, 50, 100],
          "language": {
              "search": "🔍 Search:",
              "lengthMenu": "Show _MENU_ entries",
              "info": "Showing _START_ to _END_ of _TOTAL_ bets",
          },
          "columnDefs": [
              { "orderable": false, "targets": 0 }
          ],
          "responsive": true
      });

      table.on('order.dt search.dt page.dt', function () {
          var info = table.page.info();
          table.column(0, {search:'applied', order:'applied'}).nodes().each(function (cell, i) {
              cell.innerHTML = info.start + i + 1;
          });
      }).draw();
      
      // Fix for iOS modal scrolling
      $('.modal').on('show.bs.modal', function () {
          $('body').addClass('modal-open');
      }).on('hidden.bs.modal', function () {
          $('body').removeClass('modal-open');
      });
  });

  $('.deleteBtn').on('click', function () {
      var id = $(this).data('id');
      alert('Delete clicked for ID: ' + id);
  });
</script>

<script src="assets/plugins/simplebar/js/simplebar.js"></script>
<script src="assets/js/sidebar-menu.js"></script>
<script src="assets/js/app-script.js"></script>

</body>
</html>

@endsection