@extends('admin.body.adminmaster')

@section('admin')
<div class="container">
    <h4>Salary Lists</h4>
    <a href="{{ route('admin.salary-lists.export') }}" class="btn btn-success mb-3">Download Excel</a>

    <table class="table table-bordered">
        <thead>
            <tr>
                <th>ID</th>
                <th>User ID</th>
                <th>Amount</th>
                <th>Created At</th>
                <th>Updated At</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
            @foreach($salaries as $salary)
            <tr>
                <td>{{ $salary->id }}</td>
                <td>{{ $salary->userid }}</td>
                <td>{{ $salary->amount }}</td>
                <td>{{ $salary->created_at }}</td>
                <td>{{ $salary->updated_at }}</td>
                <td>
                    <button class="btn btn-sm btn-primary edit-btn"
                        data-id="{{ $salary->id }}"
                        data-amount="{{ $salary->amount }}">
                        Edit
                    </button>
                </td>
            </tr>
            @endforeach
        </tbody>
    </table>

    {{ $salaries->links() }}
</div>

<!-- Edit Modal -->
<div class="modal fade" id="editAmountModal" tabindex="-1" role="dialog" aria-labelledby="editModalLabel" aria-hidden="true">
  <div class="modal-dialog" role="document">
    <form id="editAmountForm">
        @csrf
        <input type="hidden" name="id" id="salaryId">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Edit Amount</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
                <label for="amount">New Amount</label>
                <input type="number" name="amount" id="salaryAmount" class="form-control" min="0" required>
            </div>
            <div class="modal-footer">
                <button type="submit" class="btn btn-success">Save</button>
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
            </div>
        </div>
    </form>
  </div>
</div>
@endsection

@push('scripts')
<script>
$(document).ready(function () {
    $('.edit-btn').on('click', function () {
        $('#salaryId').val($(this).data('id'));
        $('#salaryAmount').val($(this).data('amount'));
        $('#editAmountModal').modal('show');
    });

    $('#editAmountForm').on('submit', function (e) {
        e.preventDefault();
        const formData = $(this).serialize();

        $.post("{{ route('admin.salary-lists.update') }}", formData, function (res) {
            alert(res.message);
            location.reload();
        }).fail(function (xhr) {
            alert("Error: " + xhr.responseJSON.message);
        });
    });
});
</script>
@endpush
