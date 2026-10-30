@extends('admin.body.adminmaster')

@section('admin')

@php
    use Illuminate\Support\Facades\DB;

    $result = DB::select("
        SELECT
            COUNT(CASE WHEN account_type = 1 THEN 1 END) AS demo_user,
            COUNT(CASE WHEN illegal_count > 0 THEN 1 END) AS illegal_better
        FROM users
    ");

    $payincount = DB::select("
        SELECT
            (SELECT COUNT(*) FROM payins WHERE status = 1) AS payins_count,
            (SELECT COUNT(*) FROM withdraw_histories WHERE status = 1) AS withdraw_count
    ");

    $pending_payin = $payincount[0]->payins_count;
    $pending_payout = $payincount[0]->withdraw_count;
    $demoUser = $result[0]->demo_user;
    $illegalBetter = $result[0]->illegal_better;

$otp_pack_row = DB::select("SELECT `opt_pack` FROM `otp_sms` LIMIT 1");
$otp_pack = isset($otp_pack_row[0]) ? $otp_pack_row[0]->opt_pack : 0;

@endphp

<style>
    .card {
        transition: transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out;
        border: none;
        border-left: 4px solid;
    }
    .card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.15);
    }
    .border-left-primary { border-color: #007bff; }
    .border-left-success { border-color: #28a745; }
    .border-left-info    { border-color: #17a2b8; }
    .border-left-warning { border-color: #ffc107; }
    .border-left-danger  { border-color: #dc3545; }
    .border-left-dark    { border-color: #343a40; }
    .text-purple         { color: #6f42c1!important; }
</style>

<div class="midde_cont">
    <div class="container-fluid">
        <div class="row mb-4">
            <div class="col">
                <h2 class="fw-bold">Admin Dashboard</h2>
            </div>
        </div>

        {{-- Filter Form --}}
        <form action="{{ route('dashboard') }}" method="get" class="row g-3 mb-4">
            @csrf
            <div class="col-md-3">
                <input type="date" class="form-control" name="start_date" placeholder="Start Date">
            </div>
            <div class="col-md-3">
                <input type="date" class="form-control" name="end_date" placeholder="End Date">
            </div>
            <div class="col-md-3">
                <button class="btn btn-success">Search</button>
                <a href="{{ route('dashboard') }}" class="btn btn-secondary">Reset</a>
            </div>
        </form>

        {{-- Dashboard Cards --}}
        <div class="row g-4">
           @php 
    $adminProfit = $users[0]->chicken_total_admin_profit;

    // Agar profit hai to show karo, warna 0
    $admin_Profit = $adminProfit > 0 ? $adminProfit : 0;
    // Agar loss hai to show karo (negative hai to hi), warna 0
    $admin_Loss = $adminProfit < 0 ? abs($adminProfit) : 0;
    
	$aviator_adminProfit = $users[0]->aviator_total_admin_profit;
	$aviator_admin_Profit = $aviator_adminProfit > 0 ? $aviator_adminProfit : 0;
	$aviator_admin_Loss = $aviator_adminProfit < 0 ? abs($aviator_adminProfit) : 0;


					  
    $cards = [
        ['icon'=>'fa-user',             'label'=>'Total Player',       'value'=>$users[0]->totaluser,       'color'=>'primary'],
        ['icon'=>'fa-user-check',       'label'=>'Active Player',      'value'=>$users[0]->activeuser,      'color'=>'success'],
        ['icon'=>'fa-user-plus',        'label'=>'Today User',         'value'=>$users[0]->todayuser,       'color'=>'info'],
        ['icon'=>'fa-chart-line',       'label'=>'Today Turnover',     'value'=>$users[0]->todayturnover,   'color'=>'warning'],
        ['icon'=>'fa-wallet',           'label'=>'Total Turnover',     'value'=>$users[0]->total_turnover,  'color'=>'dark'],
        ['icon'=>'fa-university',       'label'=>'Total Deposit',      'value'=>$users[0]->totaldeposit,    'color'=>'info'],
        ['icon'=>'fa-money-bill-wave',  'label'=>'Today Deposit',      'value'=>$users[0]->tdeposit,        'color'=>'success'],
        ['icon'=>'fa-hand-holding-usd', 'label'=>'Total Withdrawal',   'value'=>$users[0]->totalwithdraw,   'color'=>'danger'],
        ['icon'=>'fa-cash-register',    'label'=>'Today Withdrawal',   'value'=>$users[0]->tamount,         'color'=>'warning'],
        ['icon'=>'fa-comments',         'label'=>'Feedbacks',          'value'=>$users[0]->totalfeedback,   'color'=>'info'],
        ['icon'=>'fa-gamepad',          'label'=>'Total Games',        'value'=>3,      'color'=>'purple'],
        ['icon'=>'fa-percent',          'label'=>'Total Commission',   'value'=>$users[0]->commissions,     'color'=>'dark'],
        ['icon'=>'fa-user-secret',      'label'=>'Demo Users',         'value'=>$demoUser,                  'color'=>'warning'],
        ['icon'=>'fa-ban',              'label'=>'Illegal Betters',    'value'=>$illegalBetter,             'color'=>'danger'],
        ['icon'=>'fa-money-bill-wave',  'label'=>'Pending Deposit',    'value'=>$pending_payin,             'color'=>'success', 'link' => url('https://bdgcassino.apponrent.com/deposit-1')],
        ['icon'=>'fa-cash-register',    'label'=>'Pending Withdrawal', 'value'=>$pending_payout,            'color'=>'warning', 'link' => url('https://bdgcassino.apponrent.com/widthdrawl/1')],

        // 🟢 Admin Profit Card (only if profit exists)
        ['icon'=>'fa-balance-scale', 'label'=>'Chicken Road Admin Profit', 'value'=>$admin_Profit, 'color'=>'success'],

        // 🔴 Admin Loss Card (only if loss exists)
        ['icon'=>'fa-balance-scale', 'label'=>'Chicken Road Admin Loss', 'value'=>$admin_Loss, 'color'=>'danger'],
			
    ['icon'=>'fa-chart-line', 'label'=>'Aviator Admin Profit', 'value'=>$aviator_admin_Profit, 'color'=>'success'],
    ['icon'=>'fa-arrow-trend-down', 'label'=>'Aviator Admin Loss', 'value'=>$aviator_admin_Loss, 'color'=>'danger'],
	['icon'=>'fa-sms', 'label'=>'Otp pack', 'value'=>$otp_pack, 'color'=>'danger'],


    ];
@endphp


            @foreach ($cards as $card)
                <div class="col-md-6 col-lg-3">
                    @if (isset($card['link']))
                        <a href="{{ $card['link'] }}" class="text-decoration-none">
                    @endif

                    <div class="card border-left-{{ $card['color'] }} shadow h-100 py-2">
                        <div class="card-body d-flex align-items-center">
                            <div class="me-3">
                                <i class="fa {{ $card['icon'] }} fa-2x text-{{ $card['color'] }} {{ $card['color'] == 'purple' ? 'text-purple' : '' }}"></i>
                            </div>
                            <div>
                                <div class="text-muted">{{ $card['label'] }}</div>
                                <h4 class="fw-bold mb-0">{{ number_format($card['value'], 2) }}</h4>
                            </div>
                        </div>
                    </div>

                    @if (isset($card['link']))
                        </a>
                    @endif
                </div>
            @endforeach
        </div>
    </div>
</div>

@endsection
