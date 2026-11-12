@extends('admin.body.adminmaster')

@section('admin')
<div class="container-fluid">
    <!-- Alert Messages -->
    @if(session('success'))
    <div class="alert alert-success alert-dismissible fade show mt-4" role="alert">
        {{ session('success') }}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
    @endif

    @if(session('error'))
    <div class="alert alert-danger alert-dismissible fade show mt-4" role="alert">
        {{ session('error') }}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
    @endif

    <div class="row mb-4">
        <div class="col-12">
            <div class="d-flex justify-content-between align-items-center">
                <h2><i class="fas fa-money-bill-wave me-2"></i>Salary Management</h2>
                <button type="submit" form="salary-form" class="btn btn-primary">
                    <i class="fas fa-paper-plane me-2"></i>Send Selected Salaries
                </button>
            </div>
        </div>
    </div>

    <!-- Salary Calculation Form -->
    <div class="container mt-5">
        <div class="card shadow-lg border-0">
            <div class="card-header bg-gradient-primary text-white d-flex align-items-center" style="background: linear-gradient(to right, #007bff, #6610f2);">
                <i class="fas fa-calculator me-2"></i>
                <h4 class="mb-0">Calculate User Salary</h4>
            </div>
            <div class="card-body bg-light">
                @if(session('message'))
                <div class="alert alert-info alert-dismissible fade show" role="alert">
                    <i class="fas fa-info-circle me-2"></i>{{ session('message') }}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
                @endif

                <form method="POST" action="{{ route('calculate.user.salary') }}" class="row g-3">
                    @csrf
                    <div class="col-md-6 mx-auto">
                        <label for="u_id" class="form-label fw-semibold">User ID</label>
                        <div class="input-group input-group-lg">
                            <span class="input-group-text bg-primary text-white">
                                <i class="fas fa-user"></i>
                            </span>
                            <input type="text" class="form-control" name="u_id" id="u_id" required placeholder="Enter User ID">
                        </div>
                    </div>

                    <div class="col-12 text-center mt-4">
                        <button type="submit" class="btn btn-success px-5 py-2">
                            <i class="fas fa-play-circle me-2"></i>Calculate Salary
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Salary Records Table -->
    <div class="card shadow mt-5">
        <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center">
            <h3 class="mb-0"><i class="fas fa-users me-2"></i>User Salary Records</h3>
            <button id="export-excel" class="btn btn-success">
                <i class="fas fa-file-excel me-2"></i>Export to Excel
            </button>
        </div>
        <div class="card-body">
            <form method="POST" action="{{ route('admin.user_salaries.send') }}" id="salary-form">
                @csrf
                <div class="table-responsive">
                    <table class="table table-hover" id="salary-table">
                        <thead class="bg-light fw-bold text-dark">
                            <tr>
                                <th><input type="checkbox" id="select-all" class="mr-3"></th>
                                <th>User</th>
                                <th>Active</th>
                                <th>Downline</th>
                                <th>Daily Performance</th>
                                <th>Monthly Performance</th>
                                <th>Salary Amount</th>
                                <th>Date</th>
                                <th>Daily / Monthly Salary</th>
                            </tr>
                        </thead>
                        <tbody>
                            @foreach($salaries as $salary)
                            <tr>
                               <td>
                                <div class="form-check">
                                    <input class="form-check-input salary-checkbox" type="checkbox" name="selected_ids[]" 
                                           value="{{ $salary->id }}" id="check_{{ $salary->id }}">
                                    <label class="form-check-label" for="check_{{ $salary->id }}"></label>
                                </div>
                               </td>
                                
                                <td>
                                    <strong>{{ $salary->user_name }}</strong>
                                    <div class="text-muted small">ID: {{ $salary->user_id }}</div>
                                </td>
                                <td><span class="badge bg-success"><i class="fas fa-user-check"></i> {{ $salary->active_players }}</span></td>
                                <td><span class="badge bg-info"><i class="fas fa-network-wired"></i> {{ $salary->downline_levels }}</span></td>
                                <td>
                                    <div class="d-flex flex-column">
                                        <small>Deposit: ₹{{ number_format($salary->daily_deposit, 2) }}</small>
                                        <small>Withdraw: ₹{{ number_format($salary->daily_withdrawal, 2) }}</small>
                                        <small class="{{ $salary->daily_profit_loss >= 0 ? 'text-success' : 'text-danger' }}">
                                            P/L: ₹{{ number_format(abs($salary->daily_profit_loss), 2) }}
                                            <i class="fas {{ $salary->daily_profit_loss >= 0 ? 'fa-arrow-up' : 'fa-arrow-down' }}"></i>
                                        </small>
                                    </div>
                                </td>
                                <td>
                                    <div class="d-flex flex-column">
                                        <small>Deposit: ₹{{ number_format($salary->monthly_deposit, 2) }}</small>
                                        <small>Withdraw: ₹{{ number_format($salary->monthly_withdrawal, 2) }}</small>
                                        <small class="{{ $salary->monthly_profit_loss >= 0 ? 'text-success' : 'text-danger' }}">
                                            P/L: ₹{{ number_format(abs($salary->monthly_profit_loss), 2) }}
                                            <i class="fas {{ $salary->monthly_profit_loss >= 0 ? 'fa-arrow-up' : 'fa-arrow-down' }}"></i>
                                        </small>
                                    </div>
                                </td>
                                <td>
                                    <div class="input-group input-group-sm">
                                        <span class="input-group-text">₹</span>
                                        <input type="number" class="form-control salary-input" 
                                               value="{{ $salary->salary }}" 
                                               data-id="{{ $salary->id }}"
                                               name="salary[{{ $salary->id }}]">
                                    </div>
                                </td>
                                <td>
                                    {{ \Carbon\Carbon::parse($salary->created_at)->format('d M Y') }}
                                    <div class="text-muted small">{{ \Carbon\Carbon::parse($salary->created_at)->format('h:i A') }}</div>
                                </td>
                                <td>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" 
                                               name="salary_type[{{ $salary->id }}]" 
                                               value="0" 
                                               id="not_selected_{{ $salary->id }}"
                                               {{ $salary->salary_type == 0 ? 'checked' : '' }}>
                                        <label class="form-check-label" for="not_selected_{{ $salary->id }}">Not Selected</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" 
                                               name="salary_type[{{ $salary->id }}]" 
                                               value="1" 
                                               id="daily_{{ $salary->id }}"
                                               {{ $salary->salary_type == 1 ? 'checked' : '' }}>
                                        <label class="form-check-label" for="daily_{{ $salary->id }}">Daily Salary</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="radio" 
                                               name="salary_type[{{ $salary->id }}]" 
                                               value="2" 
                                               id="monthly_{{ $salary->id }}"
                                               {{ $salary->salary_type == 2 ? 'checked' : '' }}>
                                        <label class="form-check-label" for="monthly_{{ $salary->id }}">Monthly Salary</label>
                                    </div>
                                </td>
                            </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>
            </form>
        </div>
    </div>
</div>

<!-- Scripts -->
<link rel="stylesheet" href="https://cdn.datatables.net/1.11.5/css/dataTables.bootstrap5.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.css">
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
<script src="https://cdn.datatables.net/1.11.5/js/dataTables.bootstrap5.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/toastr.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.sheetjs.com/xlsx-0.19.3/package/dist/xlsx.full.min.js"></script>

<script>
$(document).ready(function() {
    console.log("Document ready");

    $('#salary-table').DataTable({
        responsive: true,
        columnDefs: [{ orderable: false, targets: [0, 8] }],
        language: {
            search: "INPUT",
            searchPlaceholder: "Search records...",
            lengthMenu: "Show MENU records",
            info: "Showing START to END of TOTAL records",
            paginate: {
                previous: "<i class='fas fa-chevron-left'></i>",
                next: "<i class='fas fa-chevron-right'></i>"
            }
        }
    });

    // Enhanced Excel Export Functionality
    $('#export-excel').click(function() {
        // Get table data
        const table = document.getElementById('salary-table');
        const rows = table.querySelectorAll('tbody tr');
        
        // Prepare data array with all required columns
        const data = [
            [
                'ID', // Record ID from checkbox value
                'User ID', 
                'User Name', 
                'Active Players', 
                'Downline Levels',
                'Daily Deposit',
                'Daily Withdrawal',
                'Daily P/L',
                'Monthly Deposit',
                'Monthly Withdrawal',
                'Monthly P/L',
                'Salary Amount',
                'Date',
                'Time',
                'Salary Type',
                'Selected' // Whether the record is selected
            ]
        ];
        
        // Process each row
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            
            // Get the record ID from checkbox value
            const recordId = cells[0].querySelector('input[type="checkbox"]').value;
            
            // User information
            const userInfo = cells[1].textContent.split('\n');
            const userId = userInfo[1].replace('ID:', '').trim();
            const userName = userInfo[0].trim();
            
            // Active players and downline
            const activePlayers = cells[2].textContent.trim();
            const downlineLevels = cells[3].textContent.trim();
            
            // Daily performance
            const dailyPerf = cells[4].textContent.split('\n');
            const dailyDeposit = dailyPerf[0].replace('Deposit: ₹', '').trim();
            const dailyWithdrawal = dailyPerf[1].replace('Withdraw: ₹', '').trim();
            const dailyPL = dailyPerf[2].replace('P/L: ₹', '').trim();
            
            // Monthly performance
            const monthlyPerf = cells[5].textContent.split('\n');
            const monthlyDeposit = monthlyPerf[0].replace('Deposit: ₹', '').trim();
            const monthlyWithdrawal = monthlyPerf[1].replace('Withdraw: ₹', '').trim();
            const monthlyPL = monthlyPerf[2].replace('P/L: ₹', '').trim();
            
            // Salary amount
            const salaryAmount = cells[6].querySelector('input').value;
            
            // Date and time
            const dateInfo = cells[7].textContent.split('\n');
            const date = dateInfo[0].trim();
            const time = dateInfo[1] ? dateInfo[1].trim() : '';
            
            // Salary type
            let salaryType = 'Not Selected';
            if (cells[8].querySelector('input[value="1"]').checked) {
                salaryType = 'Daily Salary';
            } else if (cells[8].querySelector('input[value="2"]').checked) {
                salaryType = 'Monthly Salary';
            }
            
            // Check if selected
            const isSelected = cells[0].querySelector('input[type="checkbox"]').checked ? 'Yes' : 'No';
            
            data.push([
                recordId, // Record ID
                userId,   // User ID
                userName,
                activePlayers,
                downlineLevels,
                dailyDeposit,
                dailyWithdrawal,
                dailyPL,
                monthlyDeposit,
                monthlyWithdrawal,
                monthlyPL,
                salaryAmount,
                date,
                time,
                salaryType,
                isSelected
            ]);
        });
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(data);
        
        // Set column widths for better Excel display
        const wscols = [
            {wch: 8},  // ID
            {wch: 8},  // User ID
            {wch: 20}, // User Name
            {wch: 12}, // Active Players
            {wch: 12}, // Downline Levels
            {wch: 12}, // Daily Deposit
            {wch: 12}, // Daily Withdrawal
            {wch: 12}, // Daily P/L
            {wch: 12}, // Monthly Deposit
            {wch: 12}, // Monthly Withdrawal
            {wch: 12}, // Monthly P/L
            {wch: 12}, // Salary Amount
            {wch: 12}, // Date
            {wch: 10}, // Time
            {wch: 15}, // Salary Type
            {wch: 10}  // Selected
        ];
        ws['!cols'] = wscols;
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, "Salary Records");
        
        // Export to Excel file with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        XLSX.writeFile(wb, `Salary_Records_${timestamp}.xlsx`);
    });

    // Rest of your existing JavaScript code
    $('#select-all').change(function() {
        const isChecked = $(this).prop('checked');
        console.log("'Select All' changed:", isChecked);
        $('.salary-checkbox').prop('checked', isChecked);
    });

    $('.salary-input').on('change', function() {
        const input = $(this);
        const id = input.data('id');
        const salary = parseFloat(input.val());
        const salaryType = $(`input[name="salary_type[${id}]"]:checked`).val();

        console.log("Salary input changed: ", { id, salary, salaryType });

        if (isNaN(salary) || salary < 0) {
            toastr.error('Enter valid salary amount');
            input.val(0);
            return;
        }

        $.ajax({
            url: '{{ route("admin.user_salaries.update") }}',
            type: 'POST',
            data: {
                _token: '{{ csrf_token() }}',
                id: id,
                salary: salary,
                salary_type: salaryType
            },
            beforeSend: function() {
                console.log("Sending salary update AJAX...");
                input.prop('disabled', true);
            },
            success: function(response) {
                console.log("Salary update success:", response);
                input.prop('disabled', false);
                toastr.success(response.message || 'Salary updated successfully');
            },
            error: function(xhr) {
                console.log("Salary update error:", xhr);
                input.prop('disabled', false);
                toastr.error('Failed to update salary');
            }
        });
    });

    $('input[type=radio][name^="salary_type"]').on('change', function () {
        const radio = $(this);
        const id = radio.attr('name').match(/\d+/)[0];
        const salary = parseFloat($(`.salary-input[data-id="${id}"]`).val());
        const salaryType = radio.val();

        console.log("Salary type changed: ", { id, salary, salaryType });

        if (isNaN(salary) || salary < 0) {
            toastr.error('Invalid salary amount');
            return;
        }

        $.ajax({
            url: '{{ route("admin.user_salaries.update") }}',
            type: 'POST',
            data: {
                _token: '{{ csrf_token() }}',
                id: id,
                salary: salary,
                salary_type: salaryType
            },
            beforeSend: function () {
                console.log("Sending salary type update AJAX...");
                radio.prop('disabled', true);
            },
            success: function (response) {
                console.log("Salary type update success:", response);
                radio.prop('disabled', false);
                toastr.success(response.message || 'Salary type updated successfully');
            },
            error: function (xhr) {
                console.log("Salary type update error:", xhr);
                radio.prop('disabled', false);
                toastr.error('Failed to update salary type');
            }
        });
    });

    $('#salary-form').on('submit', function() {
        const checkedCount = $('.salary-checkbox:checked').length;
        console.log("Form submit — selected count:", checkedCount);

        if (checkedCount === 0) {
            toastr.error('Please select at least one salary to send');
            return false;
        }

        $('button[type="submit"]').prop('disabled', true)
            .html('<i class="fas fa-spinner fa-spin me-2"></i> Processing...');
    });
});
</script>

@endsection