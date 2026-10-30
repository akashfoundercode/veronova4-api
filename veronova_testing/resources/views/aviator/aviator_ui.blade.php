@extends('admin.body.adminmaster')

@section('admin')

<!-- Fonts & Plugins -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">

<style>

*{
    margin:0;
    padding:0;
    box-sizing:border-box;
}

body{
    font-family:'Poppins',sans-serif;
    background:#f4f7fe;
}

/* =========================
   MAIN CONTAINER
========================= */

.game-container{
    max-width:1300px;
    margin:auto;
    padding:25px;
}

/* =========================
   TOP HEADER
========================= */

.top-title-box{
    background:#fff;
    border-radius:24px;
    padding:28px;
    margin-bottom:25px;
    border:1px solid #e8eef7;
    box-shadow:0 4px 25px rgba(15,23,42,.05);
}

.top-title-flex{
    display:flex;
    justify-content:space-between;
    align-items:center;
    flex-wrap:wrap;
    gap:20px;
}

.dashboard-title{
    display:flex;
    align-items:center;
    gap:18px;
}

.dashboard-icon{
    width:70px;
    height:70px;
    border-radius:20px;
    background:linear-gradient(135deg,#2563eb,#4f46e5);
    display:flex;
    align-items:center;
    justify-content:center;
    color:#fff;
    font-size:30px;
    box-shadow:0 10px 25px rgba(37,99,235,.25);
}

.dashboard-title h2{
    margin:0;
    font-size:36px;
    font-weight:800;
    color:#0f172a;
}

.dashboard-title p{
    margin-top:5px;
    color:#64748b;
    font-size:15px;
}

.live-time{
    background:#f8fafc;
    padding:14px 20px;
    border-radius:14px;
    border:1px solid #e2e8f0;
    font-weight:600;
    color:#475569;
}

/* =========================
   PROFIT CARDS
========================= */

.analytics-card{
    border:none;
    border-radius:24px;
    overflow:hidden;
    color:#fff;
    position:relative;
    box-shadow:0 10px 30px rgba(0,0,0,.08);
    transition:.3s;
}

.analytics-card:hover{
    transform:translateY(-5px);
}

.analytics-card .card-body{
    padding:25px;
}

.analytics-card h6{
    font-size:15px;
    font-weight:600;
    opacity:.9;
    margin-bottom:10px;
}

.analytics-card h2{
    font-size:22px;
    font-weight:600;
    margin:0;
}

.analytics-icon{
    position:absolute;
    right:10px;
    top:10px;
    width:55px;
    height:55px;
    border-radius:18px;
    background:rgba(255,255,255,.15);
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:22px;
}

/* Gradient Colors */

.green-card{
    background:linear-gradient(135deg,#22c55e,#16a34a);
}

.red-card{
    background:linear-gradient(135deg,#ef4444,#dc2626);
}

.blue-card{
    background:linear-gradient(135deg,#06b6d4,#2563eb);
}

.orange-card{
    background:linear-gradient(135deg,#f59e0b,#ea580c);
}

/* =========================
   MAIN PANEL
========================= */

.main-card{
    background:#fff;
    border-radius:25px;
    border:1px solid #e8eef7;
    box-shadow:0 4px 25px rgba(15,23,42,.05);
    padding:30px;
    margin-top:25px;
}

/* =========================
   TOP INFO
========================= */

.info-flex{
    display:flex;
    justify-content:space-between;
    align-items:center;
    flex-wrap:wrap;
    gap:20px;
    margin-bottom:30px;
}

.game-header{
    font-size:32px;
    font-weight:800;
    color:#0f172a;
}

#users_playing_block{
    background:#0f172a;
    color:#fff;
    padding:15px 22px;
    border-radius:16px;
    font-size:18px;
    font-weight:700;
    box-shadow:0 8px 20px rgba(15,23,42,.12);
}

/* =========================
   FORM
========================= */

.form-section{
    background:#f8fafc;
    border-radius:22px;
    padding:25px;
    border:1px solid #e2e8f0;
}

.form-label{
    font-weight:700;
    color:#334155;
    margin-bottom:10px;
}

.form-control{
    height:58px;
    border-radius:15px;
    border:1px solid #dbeafe;
    box-shadow:none !important;
    font-weight:600;
    padding-left:18px;
}

.form-control:focus{
    border-color:#2563eb;
}

.submit-btn{
    width:100%;
    height:58px;
    border:none;
    border-radius:15px;
    background:linear-gradient(135deg,#2563eb,#4f46e5);
    color:#fff;
    font-weight:700;
    font-size:16px;
    transition:.3s;
    margin-top:32px;
    box-shadow:0 10px 20px rgba(37,99,235,.20);
}

.submit-btn:hover{
    transform:translateY(-2px);
}

/* =========================
   TOGGLE BUTTONS
========================= */

.toggle-wrapper{
    display:flex;
    gap:15px;
    margin-top:30px;
    margin-bottom:25px;
}

.toggle-btn{
    border:none;
    padding:13px 24px;
    border-radius:14px;
    font-weight:700;
    transition:.3s;
}

.toggle-btn.active{
    background:linear-gradient(135deg,#2563eb,#4f46e5);
    color:#fff;
    box-shadow:0 10px 20px rgba(37,99,235,.20);
}

.toggle-btn.inactive{
    background:#0f172a;
    color:#fff;
}

/* =========================
   TABLES
========================= */

.table-card{
    background:#fff;
    border-radius:22px;
    overflow:hidden;
    border:1px solid #e8eef7;
    box-shadow:0 4px 25px rgba(15,23,42,.05);
}

.table-header{
    padding:20px 25px;
    font-size:20px;
    font-weight:700;
    color:#fff;
}

.header-blue{
    background:linear-gradient(135deg,#06b6d4,#2563eb);
}

.header-orange{
    background:linear-gradient(135deg,#f59e0b,#ea580c);
}

.table{
    margin-bottom:0;
}

.table thead{
    background:#0f172a;
    color:#fff;
}

.table th{
    border:none !important;
    padding:16px !important;
    font-size:14px;
    font-weight:700;
}

.table td{
    padding:16px !important;
    vertical-align:middle;
    border-color:#eef2ff !important;
    font-weight:500;
}

.table tbody tr:hover{
    background:#f8fafc;
}

/* =========================
   BADGES
========================= */

.custom-badge{
    padding:8px 14px;
    border-radius:50px;
    font-size:12px;
    font-weight:700;
}

.badge-success-custom{
    background:#dcfce7;
    color:#15803d;
}

.badge-warning-custom{
    background:#fef3c7;
    color:#b45309;
}

/* =========================
   PAGINATION
========================= */

.pagination .page-link{
    border:none;
    margin:0 4px;
    border-radius:10px;
    color:#2563eb;
    font-weight:700;
}

.pagination .active .page-link{
    background:#2563eb;
    color:#fff;
}

/* =========================
   MOBILE
========================= */

@media(max-width:768px){

    .dashboard-title h2{
        font-size:28px;
    }

    .game-header{
        font-size:24px;
    }

    .toggle-wrapper{
        flex-wrap:wrap;
    }

    .info-flex{
        flex-direction:column;
        align-items:flex-start;
    }

    #users_playing_block{
        width:100%;
        text-align:center;
    }

}

</style>

<div class="container-fluid game-container">

    <input type="hidden" id="game_id" value="{{ $game_id }}">
    <input type="hidden" id="games_no" value="{{ $bets[0]->games_no ?? '' }}">

    <!-- TOP HEADER -->
    <div class="top-title-box">

        <div class="top-title-flex">

            <div class="dashboard-title">

                <div class="dashboard-icon">
                    ✈️
                </div>

                <div>
                    <h2>Aviator Dashboard</h2>
                    <p>Complete analytics and business overview</p>
                </div>

            </div>

            <div class="live-time">
                📅 {{ now()->format('d M Y h:i A') }}
            </div>

        </div>

    </div>

    <!-- PROFIT CARDS -->
    <div class="row">

        <div class="col-lg-3 col-md-6 mb-4">
            <div class="analytics-card green-card">
                <div class="card-body">
                    <h6>Total Admin Profit</h6>
                   <h2>₹{{ sprintf('%.2f', (float)($total_admin_profit ?? 0)) }}</h2>

                    <div class="analytics-icon">
                        💰
                    </div>
                </div>
            </div>
        </div>

        <div class="col-lg-3 col-md-6 mb-4">
            <div class="analytics-card red-card">
                <div class="card-body">
                    <h6>Total User Profit</h6>
                    <h2>₹{{ $total_user_profit ?? 0, 2 }}</h2>

                    <div class="analytics-icon">
                        👤
                    </div>
                </div>
            </div>
        </div>

        <div class="col-lg-3 col-md-6 mb-4">
            <div class="analytics-card blue-card">
                <div class="card-body">
                    <h6>Today Admin Profit</h6>
                    <h2>₹{{ $today_admin_profit ?? 0, 2 }}</h2>

                    <div class="analytics-icon">
                        📈
                    </div>
                </div>
            </div>
        </div>

        <div class="col-lg-3 col-md-6 mb-4">
            <div class="analytics-card orange-card">
                <div class="card-body">
                    <h6>Today User Profit</h6>
                    <h2>₹{{ $today_user_profit ?? 0, 2 }}</h2>

                    <div class="analytics-icon">
                        ⚡
                    </div>
                </div>
            </div>
        </div>

    </div>

    <!-- MAIN CONTENT -->
    <div class="main-card">

        <div class="info-flex">

            <div class="game-header">
                🎯 Period No - {{ $results->game_sr_num ?? '-' }}
            </div>

            <div id="users_playing_block">
                👥 Total Users Playing -
                <span>{{ $total_users_playing ?? 0 }}</span>
            </div>

        </div>

        <!-- FORM -->
        <div class="form-section">

            <form action="{{ route('aviator.store') }}" method="POST">
                @csrf

                <input type="hidden" name="game_id" value="{{ $game_id }}">

                <div class="row">

                    <div class="col-md-5 mb-3">
                        <label class="form-label">
                            Game Period
                        </label>

                        <input type="number"
                               name="game_sr_num"
                               class="form-control"
                               value="{{ ($results->game_sr_num ?? 0) + 2 }}"
                               required>
                    </div>

                    <div class="col-md-5 mb-3">
                        <label class="form-label">
                            Multiplier
                        </label>

                        <input type="number"
                               name="multiplier"
                               class="form-control"
                               step="any"
                               placeholder="e.g. 1.25"
                               required>
                    </div>

                    <div class="col-md-2 mb-3">
                        <button type="submit" class="submit-btn">
                            Submit
                        </button>
                    </div>

                </div>

            </form>

        </div>

        <!-- TOGGLE -->
        <div class="toggle-wrapper">

            <button class="toggle-btn active"
                    data-target="future">
                Future Predictions
            </button>

            <button class="toggle-btn inactive"
                    data-target="user">
                User Bets
            </button>

        </div>

        <!-- FUTURE TABLE -->
        <div id="table-future" class="toggle-table">

            <div class="table-card">

                <div class="table-header header-blue">
                    Future Prediction List
                </div>

                <div class="table-responsive">

                    <table class="table">

                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Period No</th>
                                <th>Predicted Number</th>
                                <th>Status</th>
                                <th>DateTime</th>
                            </tr>
                        </thead>

                        <tbody>

                        @forelse($futurePredictions as $prediction)

                            @php
                                $currentPeriod = $currentPeriod ?? 0;
                                $predictionPeriod = $prediction->game_sr_num;

                                if($predictionPeriod <= $currentPeriod){
                                    $statusBadge = '<span class="custom-badge badge-success-custom">Declared</span>';
                                }else{
                                    $statusBadge = '<span class="custom-badge badge-warning-custom">Pending</span>';
                                }
                            @endphp

                            <tr>
                                <td>#{{ $prediction->id }}</td>
                                <td>{{ $prediction->game_sr_num }}</td>
                                <td>{{ $prediction->predicted_number }}</td>
                                <td>{!! $statusBadge !!}</td>
                                <td>{{ $prediction->datetime }}</td>
                            </tr>

                        @empty

                            <tr>
                                <td colspan="5" class="text-center py-4">
                                    No predictions found.
                                </td>
                            </tr>

                        @endforelse

                        </tbody>

                    </table>

                </div>

            </div>

        </div>

        <!-- USER TABLE -->
        <div id="table-user" class="toggle-table d-none">

            <div class="table-card">

                <div class="table-header header-orange">
                    User Bet List
                </div>

                <div class="table-responsive">

                    <table class="table">

                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>User ID</th>
                                <th>Period Number</th>
                                <th>Game ID</th>
                                <th>Bet Amount</th>
                                <th>Win Amount</th>
                                <th>Status</th>
                                <th>DateTime</th>
                            </tr>
                        </thead>

                        <tbody>

                        @forelse($userBets as $bet)

                            <tr>
                                <td>#{{ $bet->id }}</td>
                                <td>{{ $bet->uid }}</td>
                                <td>{{ $bet->game_sr_num }}</td>
                                <td>{{ $bet->game_id }}</td>
                                <td>₹{{ $bet->amount }}</td>
                                <td>₹{{ $bet->win }}</td>
                                <td>
                                    <span class="custom-badge badge-success-custom">
                                        {{ $bet->status }}
                                    </span>
                                </td>
                                <td>{{ $bet->created_at }}</td>
                            </tr>

                        @empty

                            <tr>
                                <td colspan="8" class="text-center py-4">
                                    No user bets found.
                                </td>
                            </tr>

                        @endforelse

                        </tbody>

                    </table>

                    <div class="p-3">
                        {{ $userBets->links('pagination::bootstrap-5') }}
                    </div>

                </div>

            </div>

        </div>

    </div>

</div>

<!-- Scripts -->
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<script src="https://code.jquery.com/jquery-3.6.4.min.js"></script>

<script>

$(document).ready(function(){

    $('.toggle-btn').click(function(){

        $('.toggle-btn').removeClass('active');

        $('.toggle-btn').addClass('inactive');

        $(this).removeClass('inactive').addClass('active');

        let target = $(this).data('target');

        $('.toggle-table').addClass('d-none');

        $('#table-' + target).removeClass('d-none');

    });

    setInterval(() => {
        location.reload();
    }, 20000);

});

</script>

@endsection