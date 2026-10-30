@extends('admin.body.adminmaster')

@section('admin')

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fctechteamnode.shop" crossorigin>
<link rel="dns-prefetch" href="https://fctechteamnode.shop">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

<style>

*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family:'Poppins', sans-serif;
}

body{
    background:#0a0a0a;
}

/* ================= MAIN CONTAINER ================= */
.aviator-wrapper {
    max-width: 1400px;
    margin: 0 auto;
    padding: 20px;
}

/* ================= FLASH MESSAGES ================= */
.flash-msg {
    padding: 14px 20px;
    border-radius: 12px;
    margin-bottom: 20px;
    font-weight: 600;
    font-size: 15px;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slideDown .35s ease;
}
.flash-error {
    background: linear-gradient(135deg, #ff4949 0%, #c40000 100%);
    color: #fff;
    border-left: 5px solid #fff;
    box-shadow: 0 6px 20px rgba(255,73,73,.35);
}
.flash-success {
    background: linear-gradient(135deg, #00e676 0%, #00994d 100%);
    color: #000;
    border-left: 5px solid #000;
    box-shadow: 0 6px 20px rgba(0,230,118,.35);
}
@keyframes slideDown {
    from { transform: translateY(-15px); opacity: 0; }
    to   { transform: translateY(0);     opacity: 1; }
}

/* ================= PROFIT SUMMARY CARDS ================= */
.profit-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.profit-card {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border-radius: 20px;
    padding: 20px;
    border: 1px solid rgba(255,255,255,0.1);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.profit-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.profit-card h5 {
    color: #8d8d8d;
    font-size: 14px;
    margin-bottom: 10px;
    font-weight: 600;
}

.profit-card h3 {
    color: #fff;
    font-size: 28px;
    font-weight: 800;
    margin: 0;
}

.profit-card.success { border-left: 4px solid #00e676; }
.profit-card.danger { border-left: 4px solid #ff4949; }
.profit-card.info { border-left: 4px solid #4595ff; }
.profit-card.warning { border-left: 4px solid #ffb347; }

/* ================= GAME SECTION ================= */
.aviator-main{
    width:100%;
    margin-bottom: 30px;
}

/* ================= HISTORY ================= */
.top-history{
    width:100%;
    background:#111;
    border-radius:20px;
    border:1px solid #262626;
    padding:8px;
    display:flex;
    align-items:center;
    gap:10px;
    overflow:auto;
    margin-bottom:12px;
}

.top-history::-webkit-scrollbar{ display:none; }

.history-item{
    min-width:70px;
    background:#171717;
    border-radius:40px;
    padding:8px 10px;
    text-align:center;
    font-weight:700;
    font-size:18px;
    border:1px solid #2d2d2d;
}

.red   { color:#ff4949; }
.blue  { color:#4595ff; }
.green { color:#00e676; }
.orange{ color:#ffb347; }
.purple{ color:#bc7cff; }

/* ================= GAME BOX ================= */

.game-box{
    width:100%;
    height:440px;
    position:relative;
    overflow:hidden;
    border-radius:24px;
    border:1px solid #292929;
    background:#000;
}

/* ================= ROTATING BG ================= */

.rotating-bg{
    position:absolute;
    width:340%;
    height:760%;
    left:0%;
    top:110%;
    transform:translate(-50%, -50%);
    background-image:url('https://bdgcassino.siberiancrane.tech/activity_image/chakra.jpeg');
    background-position:center;
    background-size:cover;
    background-repeat:no-repeat;
    opacity:.18;
    z-index:1;
    animation:none;
}

.rotating-bg.active{
    animation:spinBg 15s linear infinite;
}

@keyframes spinBg{
    from{ transform:translate(-50%, -50%) rotate(0deg); }
    to{   transform:translate(-50%, -50%) rotate(360deg); }
}

/* ================= OVERLAY ================= */

.dark-overlay{
    position:absolute;
    inset:0;
    background:rgba(0,0,0,.38);
    z-index:2;
}

/* ================= ROUND ID ================= */

.round-id{
    position:absolute;
    top:18px;
    left:22px;
    color:#8c8c8c;
    font-size:18px;
    z-index:60;
    font-weight:600;
}

/* ================= LEFT DOTS ================= */

.side-dots{
    position:absolute;
    left:12px;
    top:20px;
    bottom:32px;
    width:10px;
    z-index:50;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
}

.side-dots::before{
    content:'';
    position:absolute;
    left:2px; top:0;
    width:2px; height:100%;
    background:rgba(255,0,72,.35);
    box-shadow:0 0 10px rgba(255,0,72,.5);
    z-index:1;
}

.dot{
    width:5px; height:5px;
    border-radius:50%;
    background:#00ff9d;
    box-shadow:0 0 5px #00ff9d, 0 0 10px #00ff9d, 0 0 18px #00ff9d;
    opacity:.35;
    position:relative;
    z-index:2;
}

.dot.active{ animation:dotMove .8s linear infinite; }

@keyframes dotMove{
    0%  { transform:translateY(-8px); opacity:1; }
    100%{ transform:translateY(8px);  opacity:.2; }
}

/* ================= BOTTOM DOTS ================= */

.bottom-dots{
    position:absolute;
    left:30px; right:20px;
    bottom:14px;
    height:10px;
    z-index:50;
    display:flex;
    align-items:center;
    justify-content:space-between;
}

.bottom-dot{
    width:5px; height:5px;
    border-radius:50%;
    background:#00ff9d;
    box-shadow:0 0 5px #00ff9d, 0 0 10px #00ff9d, 0 0 18px #00ff9d;
    opacity:.35;
    position:relative;
    z-index:2;
}

.bottom-dot.active{ animation:bottomDotMove .8s linear infinite; }

@keyframes bottomDotMove{
    0%  { transform:translateX(-5px); opacity:1; }
    100%{ transform:translateX(5px);  opacity:.2; }
}

/* ================= CANVAS ================= */

#aviatorCanvas{
    width:100%; height:100%;
    position:absolute;
    left:0; top:0;
    z-index:5;
}

/* ================= CENTER DISPLAY ================= */

.multiplier-center{
    position:absolute;
    left:50%; top:40%;
    transform:translate(-50%, -50%);
    z-index:70;
    text-align:center;
    pointer-events:none;
}

.main-multiplier{
    font-size:72px;
    color:#fff;
    font-weight:900;
    text-shadow:
        0 0 10px #fff,
        0 0 20px #7f8cff,
        0 0 40px #7f8cff;
}

.waiting-text{
    font-size:32px;
    color:#fff;
    font-weight:800;
    text-shadow:0 0 20px #9ca4ff;
    line-height:1.4;
}

.waiting-icon{
    width:120px;
    margin-bottom:20px;
    filter:drop-shadow(0 0 12px #fff);
}

/* ================= AIRPLANE ================= */

.airplane{
    width:130px;
    position:absolute;
    left:0; bottom:0;
    z-index:80;
    pointer-events:none;
    transition:left .08s linear, top .08s linear;
    transform-origin:center center;
    filter:
        drop-shadow(0 0 10px #ff0048)
        drop-shadow(0 0 22px #ff0048);
}

/* ================= STATS ================= */

.bottom-stats{
    width:100%;
    display:flex;
    gap:10px;
    margin-top:14px;
    flex-wrap:wrap;
}

.stat-box{
    flex:1;
    min-width:180px;
    background:#111;
    border:1px solid #292929;
    border-radius:18px;
    padding:14px;
    text-align:center;
    transition: all 0.2s ease;
}

.stat-title{
    color:#8d8d8d;
    font-size:14px;
    margin-bottom:8px;
    font-weight:600;
}

.stat-value{
    color:#fff;
    font-size:24px;
    font-weight:800;
}

.drop-box{
    background:#ff0048;
    cursor:pointer;
    transition:.2s;
}

.drop-box:hover{ transform:scale(1.02); }

.drop-box .stat-title,
.drop-box .stat-value{ color:#fff; }

.drop-box.dropping {
    background: #ff6655;
    transform: scale(0.98);
}

.drop-box.disabled {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
    background: #555 !important;
    transform: none !important;
}

.drop-box.disabled:hover {
    transform: none !important;
    box-shadow: none !important;
}

.drop-box.disabled .stat-value {
    color: #aaa !important;
}

/* ================= ADMIN PANEL ================= */
.admin-panel {
    background: #0a0a0a;
    border-radius: 24px;
    border: 1px solid #262626;
    padding: 25px;
    margin-top: 30px;
}

.panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    flex-wrap: wrap;
    gap: 15px;
}

.panel-header h3 {
    color: #fff;
    font-size: 22px;
    font-weight: 700;
    margin: 0;
}

.period-info {
    background: #1a1a2e;
    padding: 10px 20px;
    border-radius: 40px;
    border: 1px solid #2d2d2d;
}

.period-info span {
    color: #00e676;
    font-weight: 700;
    font-size: 20px;
}

.toggle-buttons {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}

.toggle-btn {
    background: #1a1a2e;
    color: #fff;
    border: 1px solid #2d2d2d;
    padding: 10px 25px;
    border-radius: 40px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.toggle-btn.active {
    background: #ff0048;
    border-color: #ff0048;
}

.toggle-btn:hover {
    transform: translateY(-2px);
}

/* ================= TABLES ================= */
.data-table {
    background: #111;
    border-radius: 20px;
    overflow-x: auto;
    border: 1px solid #262626;
}

.data-table table {
    width: 100%;
    color: #e0e0e0;
    background: #111;
    border-collapse: collapse;
}

.data-table th {
    background: #1a1a2e;
    color: #ffffff;
    padding: 15px;
    font-weight: 600;
    border-bottom: 2px solid #2d2d2d;
    white-space: nowrap;
}

.data-table td {
    padding: 12px 15px;
    border-bottom: 1px solid #262626;
    background: #111;
    color: #e0e0e0;
}

.data-table tr:hover td {
    background: #1a1a2e;
}

.data-table td strong {
    color: #ff4949 !important;
}

.badge {
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 600;
    display: inline-block;
}

.badge-success { background: #00e676; color: #000; }
.badge-warning { background: #ffb347; color: #000; }
.badge-danger  { background: #ff4949; color: #fff; }
.badge-info    { background: #4595ff; color: #fff; }

.status-pending {
    background: #ffb347; color: #000;
    padding: 5px 12px; border-radius: 20px;
    font-size: 12px; font-weight: 600;
    display: inline-block;
}

.status-win {
    background: #00e676; color: #000;
    padding: 5px 12px; border-radius: 20px;
    font-size: 12px; font-weight: 600;
    display: inline-block;
}

.status-loss {
    background: #ff4949; color: #fff;
    padding: 5px 12px; border-radius: 20px;
    font-size: 12px; font-weight: 600;
    display: inline-block;
}

/* ================= FORM ================= */
.result-form {
    background: #111;
    border-radius: 20px;
    padding: 20px;
    border: 1px solid #262626;
    margin-bottom: 25px;
}

.form-row {
    display: flex;
    gap: 15px;
    align-items: flex-end;
    flex-wrap: wrap;
}

.form-group { flex: 1; }

.form-group label {
    color: #8d8d8d;
    font-size: 13px;
    margin-bottom: 8px;
    display: block;
}

.form-group input {
    width: 100%;
    background: #1a1a2e;
    border: 1px solid #2d2d2d;
    padding: 12px;
    border-radius: 12px;
    color: #fff;
    font-size: 14px;
}

.form-group input:focus {
    outline: none;
    border-color: #ff0048;
}

.submit-btn {
    background: #ff0048;
    color: #fff;
    border: none;
    padding: 12px 30px;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.submit-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(255,0,72,0.3);
}

/* ================= PAGINATION ================= */
.pagination-container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    margin-top: 20px;
    padding: 15px;
    background: #111;
    border-radius: 12px;
}

.pagination-btn {
    background: #1a1a2e;
    border: 1px solid #2d2d2d;
    color: #fff;
    padding: 8px 15px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 500;
}

.pagination-btn:hover:not(:disabled) {
    background: #ff0048;
    border-color: #ff0048;
}

.pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.page-numbers {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
}

.page-number {
    background: #1a1a2e;
    border: 1px solid #2d2d2d;
    color: #fff;
    width: 35px;
    height: 35px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
}

.page-number:hover {
    background: #ff0048;
    border-color: #ff0048;
}

.page-number.active {
    background: #ff0048;
    border-color: #ff0048;
}

/* ================= SOCKET DEBUG PANEL ================= */
#socketDebug {
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(0,0,0,0.9);
    color: #00ff9d;
    font-family: monospace;
    font-size: 11px;
    padding: 10px 14px;
    border-radius: 8px;
    z-index: 9999;
    max-width: 340px;
    border: 1px solid #00ff9d;
    display: none;
    line-height: 1.5;
}
#socketDebug.show { display: block; }
#socketDebug .err { color: #ff4949; }
#socketDebug .warn { color: #ffb347; }

/* ================= MOBILE ================= */
@media(max-width:768px){
    .game-box{ height:380px; }
    .main-multiplier{ font-size:50px; }
    .waiting-text{ font-size:22px; }
    .airplane{ width:100px; }
    .profit-summary { grid-template-columns: 1fr; }
    .form-row { flex-direction: column; }
    .submit-btn { width: 100%; }
    .page-numbers { display: none; }
    .toggle-buttons { justify-content: center; }
    .stat-value { font-size: 18px; }
    .stat-box { min-width: 140px; padding: 10px; }
    .drop-box .stat-value { font-size: 14px; }
    .data-table { font-size: 12px; }
    .data-table th, .data-table td { padding: 8px 10px; }
}

</style>

<div class="aviator-wrapper">

    {{-- ================= FLASH MESSAGES ================= --}}
    @if(session('error'))
        <div class="flash-msg flash-error">
            <span style="font-size:20px;">⚠️</span>
            <span>{{ session('error') }}</span>
        </div>
    @endif

    @if(session('success'))
        <div class="flash-msg flash-success">
            <span style="font-size:20px;">✅</span>
            <span>{{ session('success') }}</span>
        </div>
    @endif

    @if($errors->any())
        <div class="flash-msg flash-error">
            <span style="font-size:20px;">⚠️</span>
            <span>{{ $errors->first() }}</span>
        </div>
    @endif

    {{-- PROFIT SUMMARY --}}
    <div class="profit-summary">
        <div class="profit-card success">
            <h5>Total Admin Profit</h5>
            <h3>₹{{ number_format($total_admin_profit ?? 0, 2) }}</h3>
        </div>
        <div class="profit-card danger">
            <h5>Total User Profit</h5>
            <h3>₹{{ number_format($total_user_profit ?? 0, 2) }}</h3>
        </div>
        <div class="profit-card info">
            <h5>Today Admin Profit</h5>
            <h3>₹{{ number_format($today_admin_profit ?? 0, 2) }}</h3>
        </div>
        <div class="profit-card warning">
            <h5>Today User Profit</h5>
            <h3>₹{{ number_format($today_user_profit ?? 0, 2) }}</h3>
        </div>
    </div>

    {{-- GAME SECTION --}}
    <div class="aviator-main">

        {{-- HISTORY --}}
        <div class="top-history" id="historyBox"></div>

        {{-- GAME --}}
        <div class="game-box">
            <div class="rotating-bg" id="rotatingBg"></div>
            <div class="dark-overlay"></div>

            <div class="side-dots" id="sideDots">
                <div class="dot"></div><div class="dot"></div><div class="dot"></div>
                <div class="dot"></div><div class="dot"></div><div class="dot"></div>
                <div class="dot"></div><div class="dot"></div><div class="dot"></div>
                <div class="dot"></div>
            </div>

            <div class="bottom-dots" id="bottomDots">
                <div class="bottom-dot"></div><div class="bottom-dot"></div>
                <div class="bottom-dot"></div><div class="bottom-dot"></div>
                <div class="bottom-dot"></div><div class="bottom-dot"></div>
                <div class="bottom-dot"></div><div class="bottom-dot"></div>
                <div class="bottom-dot"></div><div class="bottom-dot"></div>
                <div class="bottom-dot"></div><div class="bottom-dot"></div>
                <div class="bottom-dot"></div><div class="bottom-dot"></div>
            </div>

            <div class="round-id">Round ID : <span id="roundId">0</span></div>

            <div class="multiplier-center">
                <img
                    src="https://bdgcassino.siberiancrane.tech/activity_image/fan_aviator.gif"
                    class="waiting-icon"
                    id="waitingIcon"
                >
                <div class="waiting-text" id="waitingText">WAITING...</div>
                <div class="main-multiplier" id="mainMultiplier" style="display:none;">1.00x</div>
            </div>

            <img
                src="https://bdgcassino.siberiancrane.tech/activity_image/aviator.gif"
                class="airplane"
                id="plane"
            >

            <canvas id="aviatorCanvas"></canvas>
        </div>

        {{-- STATS --}}
        <div class="bottom-stats">
            <div class="stat-box">
                <div class="stat-title">TOTAL BET</div>
                <div class="stat-value" id="totalBet">₹0.00</div>
            </div>
            <div class="stat-box">
                <div class="stat-title">TOTAL CASHOUT</div>
                <div class="stat-value" id="totalCashout">₹0.00</div>
            </div>
            <div class="stat-box drop-box" id="dropNowBtn">
                <div class="stat-title">ADMIN</div>
                <div class="stat-value" id="dropBtnText">WAITING...</div>
            </div>
            <div class="stat-box">
                <div class="stat-title">MULTIPLIER</div>
                <div class="stat-value" id="liveMultiplierAmount">₹0.00</div>
            </div>
            <div class="stat-box">
                <div class="stat-title">TOTAL PLAYER</div>
                <div class="stat-value" id="totalPlayer">0</div>
            </div>
        </div>

    </div>

    {{-- ADMIN PANEL --}}
    <div class="admin-panel">
        <div class="panel-header">
            <h3>Game Result Entry</h3>
            <div class="period-info text-white">
                Period No - <span id="adminPeriodNo">{{ $results->game_sr_num ?? '-' }}</span>
                <span style="margin-left: 15px;">Users Playing - <span id="totalUsersPlaying">{{ $total_users_playing ?? 0 }}</span></span>
            </div>
        </div>

        <div class="result-form">
            <form action="{{ route('aviator.store') }}" method="POST">
                @csrf
                <input type="hidden" name="game_id" value="{{ $game_id }}">
                <div class="form-row">
                    <div class="form-group">
                        <label for="game_sr_num">Game Period</label>
                        <input type="number"
                               name="game_sr_num"
                               id="gameSrNumInput"
                               value="{{ $results->game_sr_num ?? 0 }}"
                               required>
                    </div>
                    <div class="form-group">
                        <label for="multiplier">Multiplier</label>
                        <input type="number" name="multiplier" step="any" placeholder="e.g. 1.25" required>
                    </div>
                    <div class="form-group">
                        <button type="submit" class="submit-btn">Submit Result</button>
                    </div>
                </div>
            </form>
        </div>

        <div class="toggle-buttons">
            <button class="toggle-btn active" data-target="drop">📜 Drop History</button>
            <button class="toggle-btn" data-target="future">📊 Future Predictions</button>
            <button class="toggle-btn" data-target="user">💰 User Bets</button>
        </div>

        <div id="table-drop" class="toggle-table data-table">
            <div id="dropHistoryContent"></div>
        </div>

        <div id="table-future" class="toggle-table data-table d-none">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Period No</th>
                        <th>Predicted Number</th>
                        <th>Status</th>
                        <th>Datetime</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($futurePredictions as $prediction)
                        @php
                            $currentPeriod = $currentPeriod ?? 0;
                            $predictionPeriod = $prediction->game_sr_num;
                            $statusBadge = ($predictionPeriod <= $currentPeriod)
                                ? '<span class="badge-success" style="padding:5px 12px;border-radius:20px;">Declared</span>'
                                : '<span class="badge-warning" style="padding:5px 12px;border-radius:20px;">Pending</span>';
                        @endphp
                        <tr>
                            <td>{{ $prediction->id }}</td>
                            <td>{{ $prediction->game_sr_num }}</td>
                            <td>{{ $prediction->predicted_number }}</td>
                            <td>{!! $statusBadge !!}</td>
                            <td>{{ $prediction->datetime }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="5" style="text-align: center;">No predictions found.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div id="table-user" class="toggle-table data-table d-none">
            <table class="table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>User ID</th>
                        <th>Period No</th>
                        <th>Game ID</th>
                        <th>Bet Amount</th>
                        <th>Win Amount</th>
                        <th>Status</th>
                        <th>Datetime</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($userBets as $bet)
                        @php
                            $statusText = '';
                            $statusClass = '';
                            if($bet->status == 0) {
                                $statusText = 'Pending';
                                $statusClass = 'status-pending';
                            } elseif($bet->status == 1) {
                                $statusText = 'Win';
                                $statusClass = 'status-win';
                            } elseif($bet->status == 2) {
                                $statusText = 'Loss';
                                $statusClass = 'status-loss';
                            } else {
                                $statusText = $bet->status;
                                $statusClass = 'badge-info';
                            }
                        @endphp
                        <tr>
                            <td>{{ $bet->id }}</td>
                            <td>{{ $bet->uid }}</td>
                            <td>{{ $bet->game_sr_num }}</td>
                            <td>{{ $bet->game_id }}</td>
                            <td>₹{{ number_format($bet->amount, 2) }}</td>
                            <td>₹{{ number_format($bet->win, 2) }}</td>
                            <td><span class="{{ $statusClass }}">{{ $statusText }}</span></td>
                            <td>{{ $bet->created_at }}</td>
                        </tr>
                    @empty
                        <tr>
                            <td colspan="8" style="text-align: center;">No user bets found.</td>
                        </tr>
                    @endforelse
                </tbody>
            </table>
            {{ $userBets->links('pagination::bootstrap-5') }}
        </div>
    </div>

</div>

{{-- SOCKET DEBUG PANEL --}}
<div id="socketDebug">
    <div><b>🔌 Socket Debug</b></div>
    <div id="dbgStatus">Initializing...</div>
    <div id="dbgEvent">Waiting for events...</div>
    <div id="dbgCdn" style="margin-top:5px;color:#8d8d8d;"></div>
</div>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>

{{-- ============================================================
     SOCKET.IO FAST LOADER
     ============================================================ --}}
<script>
(function() {
    var sources = [
        "{{ asset('js/socket.io.min.js') }}",
        "https://cdn.socket.io/4.7.5/socket.io.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.min.js",
        "https://unpkg.com/socket.io-client@4.7.5/dist/socket.io.min.js"
    ];

    var loaded = false;
    var index = 0;

    function markLoaded(src) {
        if (loaded) return;
        loaded = true;
        console.log('✅ Socket.IO loaded:', src);
        var el = document.getElementById('dbgCdn');
        if (el) el.innerHTML = '✅ ' + src.split('/').slice(-2).join('/');
        window.dispatchEvent(new Event('socketio:ready'));
    }

    function tryLoad() {
        if (loaded) return;
        if (index >= sources.length) {
            console.error("❌ All Socket.IO sources failed");
            var el = document.getElementById('dbgCdn');
            if (el) el.innerHTML = '<span style="color:#ff4949;">❌ All CDN sources failed</span>';
            return;
        }

        var src = sources[index++];
        var script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.defer = true;

        var timeout = setTimeout(function() {
            if (!loaded) {
                console.warn('⏱️ Timeout (3s):', src);
                tryLoad();
            }
        }, 3000);

        script.onload = function() {
            clearTimeout(timeout);
            if (typeof io !== 'undefined') {
                markLoaded(src);
            } else {
                tryLoad();
            }
        };

        script.onerror = function() {
            clearTimeout(timeout);
            console.warn('⚠️ Load failed:', src);
            tryLoad();
        };

        document.head.appendChild(script);
    }

    tryLoad();
})();
</script>

{{-- ============================================================
     MAIN AVIATOR SCRIPT
     ============================================================ --}}
<script>
(function() {

    function bootAviator() {

        if (typeof io === 'undefined') {
            console.error('❌ Cannot boot — socket.io not available');
            return;
        }

        console.log('🚀 Booting Aviator socket...');

        /* =====================================================
           CONFIG
        ===================================================== */
        const SOCKET_URL = "https://fctechteamnode.shop";
        const EVENT_NAME = "demobdg_aviator";
        const DEBUG_MODE = true;

        let isManualDrop = false;
        let currentRoundId = null;
        let currentDropPage = 1;
        let dropHistoryData = [];
        let socketStatus = 'init';
        let historyLoaded = false;
        let dropHistoryLoaded = false;
        let periodInputTouched = false; // ✅ track manual edit

        /* =====================================================
           DEBUG HELPER
        ===================================================== */
        function dbg(msg, isErr) {
            if (!DEBUG_MODE) return;
            const time = new Date().toLocaleTimeString();
            console.log((isErr ? '❌ ' : '✅ ') + msg);
            const $el = $('#dbgStatus');
            if ($el.length) {
                $el.html(`<span class="${isErr ? 'err' : ''}">[${time}] ${msg}</span>`);
            }
        }

        function dbgEvent(msg) {
            if (!DEBUG_MODE) return;
            const $el = $('#dbgEvent');
            if ($el.length) $el.html(msg);
        }

        /* =====================================================
           GAME PERIOD INPUT — manual touch detection
        ===================================================== */
        $(document).on('input', '#gameSrNumInput', function() {
            periodInputTouched = true;
        });

        /* =====================================================
           CANVAS
        ===================================================== */
        const canvas = document.getElementById('aviatorCanvas');
        const ctx    = canvas.getContext('2d');
        const plane  = document.getElementById('plane');

        function resizeCanvas() {
            canvas.width  = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        function getBaselineY() { return canvas.height - 38; }

        let graphPoints = [];
        let lastPeriod  = null;
        let tickCount   = 0;

        function resetGraph() {
            graphPoints = [];
            tickCount   = 0;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            plane.style.left      = '0px';
            plane.style.bottom    = '30px';
            plane.style.top       = 'auto';
            plane.style.opacity   = '1';
            plane.style.transform = 'rotate(-5deg)';
        }

        function drawBaseline() {
            let by = getBaselineY();
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(26, by);
            ctx.lineTo(canvas.width - 16, by);
            ctx.strokeStyle  = 'rgba(0, 255, 157, 0.55)';
            ctx.lineWidth    = 1.8;
            ctx.shadowColor  = '#00ff9d';
            ctx.shadowBlur   = 18;
            ctx.setLineDash([6, 8]);
            ctx.lineCap      = 'round';
            ctx.stroke();
            ctx.restore();
        }

        function computePoint(tick, multiplier) {
            let W  = canvas.width;
            let by = getBaselineY();
            let maxX   = W * 0.75;
            let xRatio = Math.min(tick / 120, 1);
            let x = 10 + maxX * Math.pow(xRatio, 0.65);
            let rise  = Math.pow(multiplier - 1.0, 0.72) * (canvas.height * 0.72);
            let y     = by - rise;
            let minY  = canvas.height * 0.12;
            if (y < minY) y = minY;
            if (y > by - 2) y = by - 2;
            return { x, y };
        }

        function drawGraph() {
            if (graphPoints.length < 2) return;
            let by = getBaselineY();
            let pts = graphPoints;
            let last = pts[pts.length - 1];

            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 0; i < pts.length - 1; i++) {
                let cx = (pts[i].x + pts[i+1].x) / 2;
                let cy = (pts[i].y + pts[i+1].y) / 2;
                ctx.quadraticCurveTo(pts[i].x, pts[i].y, cx, cy);
            }
            ctx.lineTo(last.x, last.y);
            ctx.strokeStyle = '#ff0048';
            ctx.lineWidth   = 4.5;
            ctx.shadowColor = '#ff0048';
            ctx.shadowBlur  = 20;
            ctx.stroke();

            ctx.lineTo(last.x, by);
            ctx.lineTo(pts[0].x, by);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 0, 72, 0.15)';
            ctx.shadowBlur = 0;
            ctx.fill();
        }

        function positionPlane(x, y) {
            plane.style.left   = (x - 30) + 'px';
            plane.style.top    = (y - 72) + 'px';
            plane.style.bottom = 'auto';

            let angle = -30;
            let pts = graphPoints;
            if (pts.length >= 2) {
                let prev = pts[pts.length - 2];
                let curr = pts[pts.length - 1];
                let dx   = curr.x - prev.x;
                let dy   = curr.y - prev.y;
                angle    = Math.atan2(dy, dx) * (180 / Math.PI);
                angle = Math.max(-55, Math.min(5, angle));
            }
            plane.style.transform = `rotate(${angle}deg) scale(1.05)`;
        }

        /* =====================================================
           HISTORY
        ===================================================== */
        function saveCrashToDatabase(roundId, crashValue) {
            return $.ajax({
                url: '{{ route("aviator.crash.store") }}',
                type: 'POST',
                data: {
                    round_id: roundId,
                    crash_point: crashValue,
                    _token: '{{ csrf_token() }}'
                }
            });
        }

        function loadHistoryFromDatabase() {
            $.ajax({
                url: '{{ route("aviator.crash.history") }}',
                type: 'GET',
                success: function(history) {
                    if (history && history.length) {
                        $('#historyBox').empty();
                        history.slice(0, 15).forEach(function(crash) {
                            let colors = ['red','blue','green','orange','purple'];
                            let cls    = colors[Math.floor(Math.random() * colors.length)];
                            $('#historyBox').append(
                                `<div class="history-item ${cls}">${parseFloat(crash.crash_point).toFixed(2)}x</div>`
                            );
                        });
                    }
                }
            });
        }

        function loadDropHistory(page = 1) {
            $.ajax({
                url: '{{ route("aviator.crash.history") }}',
                type: 'GET',
                success: function(history) {
                    dropHistoryData = history;
                    currentDropPage = page;
                    renderDropHistoryTable();
                }
            });
        }

        function renderDropHistoryTable() {
            const itemsPerPage = 10;
            const totalItems = dropHistoryData.length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            const start = (currentDropPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const pageData = dropHistoryData.slice(start, end);

            let tableHtml = `
                <table class="table">
                    <thead>
                        <tr>
                            <th>ID</th><th>Round ID</th><th>Crash Point</th><th>Crashed At</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            if (pageData.length > 0) {
                pageData.forEach(function(crash) {
                    tableHtml += `<tr>
                        <td>${crash.id}</td>
                        <td>${crash.round_id}</td>
                        <td><strong style="color: #ff4949;">${parseFloat(crash.crash_point).toFixed(2)}x</strong></td>
                        <td>${new Date(crash.crashed_at).toLocaleString()}</td>
                    </tr>`;
                });
            } else {
                tableHtml += `<tr><td colspan="4" style="text-align: center;">No drop history found.</td></tr>`;
            }
            tableHtml += `</tbody></table>`;

            if (totalPages > 1) {
                let paginationHtml = `<div class="pagination-container">`;
                paginationHtml += `<button class="pagination-btn" onclick="changeDropPage(${currentDropPage - 1})" ${currentDropPage === 1 ? 'disabled' : ''}>← Previous</button>`;
                paginationHtml += `<div class="page-numbers">`;

                let startPage = Math.max(1, currentDropPage - 2);
                let endPage = Math.min(totalPages, currentDropPage + 2);

                if (startPage > 1) {
                    paginationHtml += `<div class="page-number" onclick="changeDropPage(1)">1</div>`;
                    if (startPage > 2) paginationHtml += `<div class="page-number">...</div>`;
                }
                for (let i = startPage; i <= endPage; i++) {
                    paginationHtml += `<div class="page-number ${i === currentDropPage ? 'active' : ''}" onclick="changeDropPage(${i})">${i}</div>`;
                }
                if (endPage < totalPages) {
                    if (endPage < totalPages - 1) paginationHtml += `<div class="page-number">...</div>`;
                    paginationHtml += `<div class="page-number" onclick="changeDropPage(${totalPages})">${totalPages}</div>`;
                }
                paginationHtml += `</div>`;
                paginationHtml += `<button class="pagination-btn" onclick="changeDropPage(${currentDropPage + 1})" ${currentDropPage === totalPages || totalPages === 0 ? 'disabled' : ''}>Next →</button>`;
                paginationHtml += `</div>`;
                tableHtml += paginationHtml;
            }

            $('#dropHistoryContent').html(tableHtml);
        }

        window.changeDropPage = function(page) {
            if (page < 1 || page > Math.ceil(dropHistoryData.length / 10)) return;
            loadDropHistory(page);
        };

        /* =====================================================
           LIVE DATA
        ===================================================== */
        function fetchLiveData(period, multiplier) {
            $.ajax({
                url:  '{{ url("admin/get-aviator-live-data") }}',
                type: 'GET',
                data: { period: period },
                success: function(res) {
                    $('#totalBet').html('₹' + parseFloat(res.totalBet).toFixed(2));
                    $('#totalCashout').html('₹' + parseFloat(res.totalCashout).toFixed(2));
                    $('#totalPlayer').html(res.totalPlayer);
                    $('#totalUsersPlaying').html(res.totalPlayer);
                    let multi = parseFloat(res.totalBet) * parseFloat(multiplier);
                    $('#liveMultiplierAmount').html('₹' + multi.toFixed(2));
                }
            });
        }

        /* =====================================================
           DROP BUTTON STATE
        ===================================================== */
        function updateDropButtonState(status) {
            const $dropBtn = $('#dropNowBtn');
            const $dropBtnText = $('#dropBtnText');

            if (status === 1) {
                $dropBtn.css('opacity', '1').css('cursor', 'pointer').css('background', '#ff0048');
                $dropBtnText.text('DROP NOW');
                $dropBtn.removeClass('disabled');
            } else {
                $dropBtn.css('opacity', '0.5').css('cursor', 'not-allowed').css('background', '#555');
                if (status === 0) $dropBtnText.text('WAITING...');
                else if (status === 2) $dropBtnText.text('CRASHED');
                $dropBtn.addClass('disabled');
            }
        }

        /* =====================================================
           SOCKET
        ===================================================== */
        dbg('Initializing socket...');
        $('#socketDebug').addClass('show');

        console.log("========= AVIATOR SOCKET INIT =========");
        console.log("🔌 URL:", SOCKET_URL);
        console.log("📡 Event:", EVENT_NAME);

        const socket = io(SOCKET_URL, {
            transports: ['websocket'],
            upgrade: false,
            secure: true,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 500,
            reconnectionDelayMax: 2000,
            timeout: 5000,
            forceNew: false,
            withCredentials: false,
            rememberUpgrade: true
        });

        function loadAllDataOnce() {
            if (!historyLoaded) {
                historyLoaded = true;
                loadHistoryFromDatabase();
            }
            if (!dropHistoryLoaded) {
                dropHistoryLoaded = true;
                loadDropHistory();
            }
        }

        socket.on('connect', function() {
            socketStatus = 'connected';
            dbg('CONNECTED — id: ' + socket.id);
            console.log('🚀 Transport:', socket.io.engine.transport.name);

            loadAllDataOnce();

            setTimeout(() => {
                if (socketStatus === 'connected') $('#socketDebug').removeClass('show');
            }, 5000);
        });

        socket.on('connect_error', function(err) {
            socketStatus = 'error';
            dbg('CONNECT ERROR: ' + err.message, true);
            console.error('❌ Full error:', err);
            $('#socketDebug').addClass('show');
        });

        socket.on('connect_timeout', function() {
            dbg('Connect timeout', true);
            $('#socketDebug').addClass('show');
        });

        socket.io.on('reconnect_attempt', function(attempt) {
            dbg('Reconnect attempt #' + attempt);
        });

        socket.io.on('reconnect', function(attempt) {
            socketStatus = 'connected';
            dbg('Reconnected after ' + attempt + ' attempts');
            $('#socketDebug').removeClass('show');
        });

        socket.io.on('reconnect_error', function(err) {
            dbg('Reconnect error: ' + err.message, true);
        });

        socket.io.on('reconnect_failed', function() {
            dbg('Reconnect FAILED — giving up', true);
        });

        socket.on('disconnect', function(reason) {
            socketStatus = 'disconnected';
            dbg('DISCONNECTED — reason: ' + reason, true);
            $('#socketDebug').addClass('show');
        });

        socket.on('error', function(err) {
            dbg('SOCKET ERROR: ' + (err && err.message ? err.message : err), true);
            console.error('❌ Socket error:', err);
        });

        socket.onAny((eventName, ...args) => {
            dbgEvent('Event: <b>' + eventName + '</b>');
            console.log('📩 EVENT:', eventName, args);
        });

        /* =====================================================
           MAIN AVIATOR EVENT
        ===================================================== */
        socket.on(EVENT_NAME, function(response) {

            console.log('🎯 AVIATOR DATA:', response);
            dbgEvent('aviator: status=' + (response && response.status));

            let data = typeof response === "string" ? JSON.parse(response) : response;

            if (!data || (data.period === undefined && data.status === undefined)) {
                console.warn('⚠️ Invalid data — skipping');
                return;
            }

            $('#roundId').text(data.period);
            $('#adminPeriodNo').text(data.period);

            // ✅ Auto-fill Game Period only if admin hasn't manually typed
            if (!periodInputTouched) {
                $('#gameSrNumInput').val(data.period);
            }

            currentRoundId = data.period;

            if (lastPeriod !== data.period) {
                lastPeriod = data.period;
                isManualDrop = false;
                resetGraph();
                $('#totalBet').html('₹0.00');
                $('#totalCashout').html('₹0.00');
                $('#liveMultiplierAmount').html('₹0.00');
                $('#totalPlayer').html('0');
                $('#totalUsersPlaying').html('0');
            }

            /* STATUS 0 — Waiting */
            if (parseInt(data.status) === 0) {
                $('#waitingIcon').show();
                $('#waitingText').show().html('WAITING FOR NEXT ROUND <br>' + (data.betTime || ''));
                $('#mainMultiplier').hide();
                $('#rotatingBg').removeClass('active');
                $('#sideDots .dot').removeClass('active');
                $('#bottomDots .bottom-dot').removeClass('active');
                resetGraph();
                updateDropButtonState(0);
            }

            /* STATUS 1 — Flying */
            if (parseInt(data.status) === 1) {
                $('#waitingIcon').hide();
                $('#waitingText').hide();
                $('#mainMultiplier').show();
                $('#rotatingBg').addClass('active');
                $('#sideDots .dot').addClass('active');
                $('#bottomDots .bottom-dot').addClass('active');

                let multiplier = parseFloat(data.timer);
                $('#mainMultiplier').text(multiplier.toFixed(2) + 'x');

                fetchLiveData(data.period, multiplier);

                tickCount++;
                let pt = computePoint(tickCount, multiplier);
                graphPoints.push(pt);

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawBaseline();
                drawGraph();
                positionPlane(pt.x, pt.y);

                updateDropButtonState(1);
            }

            /* STATUS 2 — Crashed */
            if (parseInt(data.status) === 2) {
                $('#rotatingBg').removeClass('active');
                $('#sideDots .dot').removeClass('active');
                $('#bottomDots .bottom-dot').removeClass('active');

                let crashValue = parseFloat(data.timer).toFixed(2);
                let roundId = data.period;

                if (isManualDrop) {
                    saveCrashToDatabase(roundId, crashValue).then(function(response) {
                        if (response.success) {
                            loadHistoryFromDatabase();
                            loadDropHistory();
                        }
                    });
                    isManualDrop = false;
                }

                $('#waitingIcon').hide();
                $('#mainMultiplier').show().html(`
                    <div style="font-size:38px;font-weight:800;color:#fff;line-height:1.2;text-shadow:0 0 20px #9ca4ff;">
                        Flew away!
                    </div>
                    <div style="font-size:76px;font-weight:900;color:#fff;text-shadow:0 0 10px #fff,0 0 30px #9ca4ff;">
                        ${crashValue}x
                    </div>
                `);
                $('#waitingText').hide();

                plane.style.transition = 'all .8s ease-in';
                plane.style.left       = (canvas.width + 300) + 'px';
                plane.style.top        = '-200px';
                plane.style.transform  = 'rotate(35deg) scale(.7)';
                plane.style.opacity    = '0';

                setTimeout(() => { ctx.clearRect(0, 0, canvas.width, canvas.height); }, 250);
                setTimeout(() => {
                    plane.style.transition = '';
                    plane.style.opacity    = '1';
                    resetGraph();
                }, 1500);

                updateDropButtonState(2);
            }
        });

        /* =====================================================
           DROP NOW BUTTON
        ===================================================== */
        $('#dropNowBtn').click(function() {
            if ($(this).hasClass('disabled')) return false;

            const $btnText = $('#dropBtnText');
            $btnText.text('DROPPING...');
            $(this).addClass('dropping').css('opacity', '0.7').css('cursor', 'wait');

            isManualDrop = true;
            socket.emit("aviator_drop_now");
            console.log('📤 Emitted: aviator_drop_now');
            dbgEvent('Sent: aviator_drop_now');

            setTimeout(() => {
                if (!$('#dropNowBtn').hasClass('disabled')) {
                    $btnText.text('DROP NOW');
                    $('#dropNowBtn').css('opacity', '1');
                }
                $('#dropNowBtn').removeClass('dropping').css('cursor', 'pointer');
            }, 1500);
        });

        window.__socket = socket;

        /* =====================================================
           TOGGLE BUTTONS
        ===================================================== */
        $('.toggle-btn').on('click', function() {
            let target = $(this).data('target');
            $('.toggle-table').addClass('d-none');
            $('#table-' + target).removeClass('d-none');
            $('.toggle-btn').removeClass('active');
            $(this).addClass('active');
            if (target === 'drop') loadDropHistory();
        });

        updateDropButtonState(0);

        setInterval(function() {
            if (!$('#table-user').hasClass('d-none')) {
                location.reload();
            }
        }, 10000);
    }

    if (typeof io !== 'undefined') {
        bootAviator();
    } else {
        window.addEventListener('socketio:ready', bootAviator);

        let tries = 0;
        let poll = setInterval(function() {
            tries++;
            if (typeof io !== 'undefined') {
                clearInterval(poll);
                bootAviator();
            } else if (tries > 20) {
                clearInterval(poll);
                console.error('❌ Timed out waiting for socket.io');
                var el = document.getElementById('dbgStatus');
                if (el) el.innerHTML = '<span style="color:#ff4949;">❌ socket.io never loaded</span>';
                document.getElementById('socketDebug').classList.add('show');
            }
        }, 500);
    }

})();
</script>

{{-- Auto-hide flash messages after 6 seconds --}}
<script>
setTimeout(function() {
    document.querySelectorAll('.flash-msg').forEach(function(el) {
        el.style.transition = 'opacity .5s ease';
        el.style.opacity = '0';
        setTimeout(function() { el.remove(); }, 500);
    });
}, 6000);
</script>

@endsection