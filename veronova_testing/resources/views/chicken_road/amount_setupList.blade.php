@extends('admin.body.adminmaster')

@section('admin')


<div class="content-wrapper">
  <div class="container-fluid mt-4">
    <div class="card shadow-lg border-0">
      <div class="card-body">
          @if(session('success'))
  <div class="alert p-3 alert-success alert-dismissible fade show mt-3" role="alert">
    {{ session('success') }}
  </div>

  <script>
    setTimeout(function () {
      const alert = document.querySelector('.alert');
      if (alert) {
        alert.classList.remove('show');
        alert.classList.add('hide');
        setTimeout(() => alert.remove(), 300);
      }
    },1500);
  </script>
@endif

        <h4 class="card-title text-primary fw-bold mb-4">Settings List</h4>
        <div class="table-responsive">
        <table class="table table-bordered table-striped text-center bg-light">
          <thead class="bg-primary text-white">
            <tr>
              <th>Sr.No</th>
              <th>Setting name</th>
              <th>Value</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            @foreach($amountSetup as $key => $setting)
            <tr>
              <td>{{ $key + 1 }}</td>
             <td>
                @if($setting->name == 'min_recharge')
                    First Recharge
                @else
                    {{ $setting->name }}
                @endif
            </td>

              <td>
                <form action="{{ route('updateGameRules')}}" method="POST" class="form-inline d-flex">
                  @csrf
                  <input type="hidden" name="id" value="{{ $setting->id }}">
                  <input type="text" name="value" value="{{ $setting->value }}" class="form-control form-control-sm w-100">
              </td>
              <td>
                  <button type="submit" class="btn  btn-sm" style="background:#7934F3;color:white">Update</button>
                </form>
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