@extends('admin.body.adminmaster')

@section('admin')
<div class="clearfix"></div>

<div class="content-wrapper">
  <div class="container-fluid mt-4">
    <div class="col-lg-12">
      <div class="card shadow-lg border-0">
        <div class="card-body">
          <h4 class="card-title text-primary fw-bold mb-4">🎯 User Bets Table</h4>
          <div class="table-responsive">
            <table id="betTable" class="table table-striped table-hover table-bordered align-middle">
              <thead class="text-center">
                <tr>
                  <th>SR No</th> 
                  <th>User_id</th>
                  <th>User Name</th>
                  <!--<th>Game Name</th>-->
                  <th>Amount</th>
                  <th>Win Amount</th>
                  <th>Multiplier</th>
                  <!--<th>Cashout</th>-->
                  <th>Winning Result</th>
                  <th>Created At</th>
                </tr>
              </thead>
              <tbody class="text-center">
                @foreach($bet as $key=>$bets)
                <tr>
                  <td>{{$key+1}}</td>
                  <td>{{ $bets->user_id }}</td>
                  <td>{{ $bets->user_name }}</td>
                  <!--<td>-->
                  <!--  @if($bets->game_id == 1)-->
                  <!--      <span class="badge badge-success">chickenroad</span>-->
                  <!--  @else-->
                  <!--      <span class="badge badge-secondary">{{ $bets->game_id }}</span>-->
                  <!--  @endif-->
                    <!--</td>-->

                  <td class="text-success fw-semibold">₹{{ $bets->amount }}</td>
                  <td class="text-info fw-semibold">₹{{ $bets->win_amount }}</td>
                  <td><span class="badge bg-warning text-dark">{{ $bets->multiplier }}x</span></td>
                  
                  <!--<td>-->
                  <!--    @if($bets->cashout_status == 1)-->
                  <!--      <span class="badge badge-success">Yes</span>-->
                  <!--  @else-->
                  <!--      <span class="badge " style="background:#6432BB">No</span>-->
                  <!--  @endif-->
                  <!--  </td>-->
                  
                  <td>
                       @if($bets->status == 1)
                        <span class="badge badge-success">Win</span>
                    @else
                        <span class="badge " style="background:#6432BB">Loss</span>
                    @endif
                  </td>
                  <td>{{ \Carbon\Carbon::parse($bets->created_at)->format('d M Y h:i A') }}</td>
                </tr>
                @endforeach
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
<!--End Row-->

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

<!-- Initialize DataTables with dynamic serial number -->
<script>
  $(document).ready(function() {
    var table = $('#betTable').DataTable({
      "pageLength": 10,
      "lengthMenu": [5, 10, 25, 50, 100],
    //   "order": [[1, 'desc']],  // Order by actual ID column (index 1, since 0 is SR No)
      "language": {
        "search": "🔍 Search:",
        "lengthMenu": "Show _MENU_ entries",
        "info": "Showing _START_ to _END_ of _TOTAL_ bets",
      },
      "columnDefs": [
        { "orderable": false, "targets": 0 }  // Disable ordering on SR No column
      ]
    });

    // Dynamically add serial number on order and search
    table.on('order.dt search.dt', function () {
      let start = table.page.info().start;
      table.column(0, {search:'applied', order:'applied'}).nodes().each(function(cell, i) {
        cell.innerHTML = start + i + 1;
      });
    }).draw();
  });
</script>

<!-- Other Scripts -->
<script src="assets/plugins/simplebar/js/simplebar.js"></script>
<script src="assets/js/sidebar-menu.js"></script>
<script src="assets/js/app-script.js"></script>

</body>
</html>
@endsection