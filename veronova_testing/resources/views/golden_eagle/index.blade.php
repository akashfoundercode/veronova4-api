@extends('admin.body.adminmaster')

@section('admin')

<style>
    /* Custom styles for SPIN CITY+ */
.sidebar {
    background-color: #1a1a2e !important;
}

.card {
    border: none;
    border-radius: 10px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.table-dark {
    background-color: #16213e;
}

.table-dark th {
    border-bottom: 1px solid #2d4263;
}

.table-dark td {
    border-bottom: 1px solid #2d4263;
}

.btn-outline-light {
    border-color: #2d4263;
    color: #e94560;
}

.btn-outline-light:hover {
    background-color: #e94560;
    border-color: #e94560;
}

.badge {
    font-size: 0.9rem;
    padding: 0.5em 0.75em;
}

.bg-success {
    background-color: #00b894 !important;
}

.bg-danger {
    background-color: #d63031 !important;
}

.text-success {
    color: #00b894 !important;
}

/* Scrollable table body */
.table-responsive {
    max-height: 400px;
    overflow-y: auto;
}

/* Hide scrollbar but keep functionality */
.table-responsive::-webkit-scrollbar {
    width: 5px;
}

.table-responsive::-webkit-scrollbar-track {
    background: #16213e;
}

.table-responsive::-webkit-scrollbar-thumb {
    background: #e94560;
    border-radius: 10px;
}
</style>
<div class="container-fluid">
    <div class="row">
        <!-- Sidebar -->
        <div class="col-md-3 col-lg-2 d-md-block bg-dark sidebar collapse">
            <div class="position-sticky pt-3">
                <ul class="nav flex-column">
                    <li class="nav-item">
                        <a class="nav-link active text-white" href="#">
                            <i class="fas fa-gamepad me-2"></i> SPIN CITY+
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link text-white" href="#">
                            <i class="fas fa-home me-2"></i> Dashboard
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link text-white" href="#">
                            <i class="fas fa-wallet me-2"></i> Wallet
                        </a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link text-white" href="#">
                            <i class="fas fa-history me-2"></i> History
                        </a>
                    </li>
                </ul>
            </div>
        </div>

        <!-- Main Content -->
        <main class="col-md-9 ms-sm-auto col-lg-10 px-md-4 py-4">
            <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                <h1 class="h2 text-white">SPIN CITY+</h1>
                <div class="btn-toolbar mb-2 mb-md-0">
                    <div class="btn-group me-2">
                        <button type="button" class="btn btn-sm btn-outline-light">
                            <i class="fas fa-volume-up"></i>
                        </button>
                        <button type="button" class="btn btn-sm btn-outline-light">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Game Stats Header -->
            <div class="row mb-4">
                <div class="col-md-12">
                    <div class="card bg-dark text-white">
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 class="mb-0">All Bets</h5>
                                    <h3 class="mb-0 text-success">113807.00</h3>
                                </div>
                                <div class="text-end">
                                    <small class="text-muted">Online Players</small>
                                    <h4 class="mb-0">1,248</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row">
                <!-- Game Container -->
                <div class="col-lg-8">
                    <div class="aviator-container" id="aviatorParent" style="height: 60vh;">
                        <!-- Game elements from previous implementation -->
                        <!-- ... -->
                    </div>
                </div>

                <!-- Bets Panel -->
                <div class="col-lg-4">
                    <div class="card bg-dark text-white h-100">
                        <div class="card-header">
                            <h5 class="mb-0">Current Bets</h5>
                        </div>
                        <div class="card-body p-0">
                            <div class="table-responsive">
                                <table class="table table-dark table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>User</th>
                                            <th>Bet</th>
                                            <th>X</th>
                                            <th>Cash Out</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>UserUVF</td>
                                            <td>4284.00</td>
                                            <td>2.02x</td>
                                            <td class="text-success">8653.68</td>
                                        </tr>
                                        <tr>
                                            <td>UserBUU</td>
                                            <td>1859.00</td>
                                            <td>-</td>
                                            <td>-</td>
                                        </tr>
                                        <tr>
                                            <td>UserPYL</td>
                                            <td>646.00</td>
                                            <td>-</td>
                                            <td>-</td>
                                        </tr>
                                        <tr>
                                            <td>UserUDI</td>
                                            <td>303.00</td>
                                            <td>-</td>
                                            <td>-</td>
                                        </tr>
                                        <tr>
                                            <td>UserWRU</td>
                                            <td>1719.00</td>
                                            <td>-</td>
                                            <td>-</td>
                                        </tr>
                                        <tr>
                                            <td>UserBMW</td>
                                            <td>419.00</td>
                                            <td>1.01x</td>
                                            <td class="text-success">423.19</td>
                                        </tr>
                                        <tr>
                                            <td>UserPNK</td>
                                            <td>2378.00</td>
                                            <td>4.50x</td>
                                            <td class="text-success">10701.00</td>
                                        </tr>
                                        <tr>
                                            <td>UserOMI</td>
                                            <td>868.00</td>
                                            <td>-</td>
                                            <td>-</td>
                                        </tr>
                                        <tr>
                                            <td>UserQJT</td>
                                            <td>3328.00</td>
                                            <td>-</td>
                                            <td>-</td>
                                        </tr>
                                        <tr>
                                            <td>UserJPW</td>
                                            <td>2837.00</td>
                                            <td>1.01x</td>
                                            <td class="text-success">2865.37</td>
                                        </tr>
                                        <tr>
                                            <td>UserJRJ</td>
                                            <td>509.00</td>
                                            <td>1.25x</td>
                                            <td class="text-success">636.25</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bet Controls -->
            <div class="row mt-4">
                <div class="col-md-12">
                    <div class="card bg-dark text-white">
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h5>Bet Amount</h5>
                                    <div class="input-group mb-3">
                                        <input type="number" class="form-control bg-secondary text-white border-0" value="100.00">
                                        <button class="btn btn-primary" type="button">BET</button>
                                    </div>
                                    <div class="d-flex flex-wrap gap-2">
                                        <button class="btn btn-sm btn-outline-light">100.00</button>
                                        <button class="btn btn-sm btn-outline-light">500.00</button>
                                        <button class="btn btn-sm btn-outline-light">1000.00</button>
                                        <button class="btn btn-sm btn-outline-light">5000.00</button>
                                        <button class="btn btn-sm btn-outline-light">1/2</button>
                                        <button class="btn btn-sm btn-outline-light">2x</button>
                                        <button class="btn btn-sm btn-outline-light">MAX</button>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <h5>Auto Cash Out</h5>
                                    <div class="input-group mb-3">
                                        <input type="number" class="form-control bg-secondary text-white border-0" placeholder="1.00x">
                                        <button class="btn btn-danger" type="button">AUTO</button>
                                    </div>
                                    <div class="d-flex flex-wrap gap-2">
                                        <button class="btn btn-sm btn-outline-light">1.50x</button>
                                        <button class="btn btn-sm btn-outline-light">2.00x</button>
                                        <button class="btn btn-sm btn-outline-light">3.00x</button>
                                        <button class="btn btn-sm btn-outline-light">5.00x</button>
                                        <button class="btn btn-sm btn-outline-light">10.00x</button>
                                        <button class="btn btn-sm btn-outline-light">20.00x</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Multipliers -->
            <div class="row mt-4">
                <div class="col-md-12">
                    <div class="card bg-dark text-white">
                        <div class="card-body">
                            <h5 class="card-title">Recent Multipliers</h5>
                            <div class="d-flex flex-wrap gap-2">
                                <span class="badge bg-success">4.94x</span>
                                <span class="badge bg-danger">1.01x</span>
                                <span class="badge bg-success">2.15x</span>
                                <span class="badge bg-success">3.42x</span>
                                <span class="badge bg-danger">1.00x</span>
                                <span class="badge bg-success">5.67x</span>
                                <span class="badge bg-success">1.89x</span>
                                <span class="badge bg-danger">1.02x</span>
                                <span class="badge bg-success">7.23x</span>
                                <span class="badge bg-danger">1.01x</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</div>

<!-- Include the JavaScript from previous implementation -->
<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        // Previous game JavaScript implementation
        // ...
        
        // Add real-time updates for bets table
        const socket = io();
        
        socket.on('new-bet', (data) => {
            const tbody = document.querySelector('.table tbody');
            const newRow = document.createElement('tr');
            
            newRow.innerHTML = `
                <td>${data.username}</td>
                <td>${data.amount}</td>
                <td>-</td>
                <td>-</td>
            `;
            
            tbody.insertBefore(newRow, tbody.firstChild);
            
            // Update all bets total
            const allBetsElement = document.querySelector('.card-header h3');
            const currentTotal = parseFloat(allBetsElement.textContent) || 0;
            allBetsElement.textContent = (currentTotal + parseFloat(data.amount)).toFixed(2);
        });
        
        socket.on('cash-out', (data) => {
            const rows = document.querySelectorAll('.table tbody tr');
            rows.forEach(row => {
                if (row.cells[0].textContent === data.username) {
                    row.cells[2].textContent = `${data.multiplier}x`;
                    row.cells[3].className = 'text-success';
                    row.cells[3].textContent = (parseFloat(row.cells[1].textContent) * data.multiplier).toFixed(2);
                }
            });
            
            // Add to recent multipliers
            const recentMultipliers = document.querySelector('.d-flex.flex-wrap.gap-2');
            const newBadge = document.createElement('span');
            newBadge.className = `badge ${data.multiplier > 1.5 ? 'bg-success' : 'bg-danger'}`;
            newBadge.textContent = `${data.multiplier}x`;
            recentMultipliers.insertBefore(newBadge, recentMultipliers.firstChild);
        });
    });
</script>
@endsection