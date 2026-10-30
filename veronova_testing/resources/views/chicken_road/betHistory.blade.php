@extends('admin.body.adminmaster')

@section('admin')

<div class="clearfix"></div>

<div class="content-wrapper">
  <div class="container-fluid mt-4">
    <div class="col-lg-12">
      <div class="card shadow-lg border-0">
        <div class="card-body">
          <h4 class="card-title text-primary fw-bold mb-4">Bet Hostory</h4>
          <div class="table-responsive">
            <table id="betTable" class="table table-striped table-hover table-bordered align-middle">
              <thead class="text-center">
                <tr>
                  <th>ID</th>
                  <th>User ID</th>
                  <th>Game ID</th> 
                  <th>Win Amount</th>
                  <th>Multiplier</th> 
                </tr>
              </thead>
              <tbody class="text-center">
                @foreach($betHistory as $key=>$bet_history)
                <tr>
                  <td>{{ $key+1}}</td>
                  <td>{{ $bet_history->user_id }}</td>
                  <td>{{ $bet_history->game_id }}</td>
                  <td class="text-info fw-semibold">₹{{ $bet_history->win_amount }}</td>
                  <td><span class="badge bg-warning text-dark">{{ $bet_history->multiplier }}x</span></td> 
                </tr>
                @endforeach
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div><!--End Row-->

  <div class="overlay toggle-menu"></div>
</div><!--End content-wrapper-->

<a href="javascript:void(0);" class="back-to-top"><i class="fa fa-angle-double-up"></i></a>



<!-- jQuery and Bootstrap core -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="assets/js/popper.min.js"></script>
<script src="assets/js/bootstrap.min.js"></script>

<!-- DataTables CSS and JS -->
<link rel="stylesheet" href="https://cdn.datatables.net/1.13.6/css/jquery.dataTables.min.css">
<script src="https://cdn.datatables.net/1.13.6/js/jquery.dataTables.min.js"></script>

<!-- Initialize DataTables -->
<script>
  $(document).ready(function() {
    $('#betTable').DataTable({
      "pageLength": 10,
      "lengthMenu": [5, 10, 25, 50, 100],
    //   "order": [[1, 'desc']],
      "language": {
        "search": "🔍 Search:",
        "lengthMenu": "Show _MENU_ entries",
        "info": "Showing _START_ to _END_ of _TOTAL_ bets",
      }
    });
  });
</script>

<!-- Other Scripts -->
<script src="assets/plugins/simplebar/js/simplebar.js"></script>
<script src="assets/js/sidebar-menu.js"></script>
<script src="assets/js/app-script.js"></script>

</body>
</html>

@endsection