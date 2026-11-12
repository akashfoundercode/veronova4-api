<?php $__env->startSection('admin'); ?>
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">

<style>
  body {
    background: #f5f5f5;
  }

  .container-fluid {
    max-width: 1200px;
    margin: 0 auto;
  }

  /* Mode tabs styling */
  .mode-tab-group {
    background-color:#4d4d4c;
    display: flex;
    border-radius: 12px;
    overflow: hidden;
    margin: 20px 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .mode-tab-group a {
    flex: 1;
    text-align: center;
    padding: 15px 0;
    text-decoration: none;
    color: #fff;
    background-color: #4d4d4c;
    transition: all 0.3s ease;
  }
  
  .mode-tab-group a.active {
    background: linear-gradient(45deg, #F0D58D, #CA9C49);
    color: #000;
    font-weight: bold;
    box-shadow: inset 0 -4px 0 rgba(202,156,73,0.8);
  }
  
  .mode-tab-group img {
    width: 44px;
    height: 44px;
    margin: 0 auto 6px;
  }
  
  .mode-tab-group span {
    display: block;
    font-size: 0.95rem;
    font-weight: 600;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
  }

  /* Card styling */
  .card-modern {
    background: #fff;
    border-radius: 12px;
    transition: transform .3s, box-shadow .3s;
    overflow: hidden;
    margin-bottom: 25px;
  }
  
  .card-modern:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 30px rgba(0,0,0,0.1);
  }

  .section-bg {
    background: #f8f9fa;
    padding: 2rem;
    border-radius: 0 0 12px 12px;
  }

  /* Results container */
  .results-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 20px;
    margin: 20px 0;
  }

  .result-wrapper {
    width: 18%;
    min-width: 100px;
    text-align: center;
  }

  .data-count {
    display: inline-block;
    border-radius: 50%;
    width: 70px;
    height: 70px;
    background: #fff;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    margin: 0 auto;
    cursor: pointer;
    position: relative;
    transition: all 0.3s ease;
  }
  
  .data-count:hover {
    transform: translateY(-5px) scale(1.05);
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  }
  
  .data-count img {
    width: 40px;
    height: 40px;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .amount-box {
    background: #fff;
    border-radius: 8px;
    padding: 10px 0;
    margin-top: 12px;
    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
    font-weight: 600;
    font-size: 1rem;
    border: 1px solid #eee;
  }

  /* Category row styling */
  .category-row {
    display: flex;
    justify-content: space-between;
    margin: 15px 0;
    gap: 15px;
  }

  /* Current Timer Styling */
  .current-timer-container {
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    color: white;
    padding: 25px;
    border-radius: 12px;
    text-align: center;
    margin: 15px 0;
    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
    position: relative;
    overflow: hidden;
    border: 2px solid rgba(255,255,255,0.1);
  }

  .current-timer-container::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 70%);
    animation: pulse 4s infinite;
  }

  @keyframes pulse {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .timer-label {
    font-size: 18px;
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: rgba(255,255,255,0.9);
    font-weight: 600;
  }

  .timer-value {
    font-size: 48px;
    font-weight: bold;
    font-family: 'Courier New', monospace;
    letter-spacing: 3px;
    text-shadow: 0 2px 10px rgba(0,0,0,0.3);
    margin: 10px 0;
    transition: all 0.3s ease;
  }

  .timer-game-info {
    margin-top: 15px;
    font-size: 16px;
    color: rgba(255,255,255,0.8);
    display: flex;
    justify-content: center;
    gap: 15px;
  }

  .timer-game-info span {
    background: rgba(255,255,255,0.1);
    padding: 5px 15px;
    border-radius: 20px;
  }

  /* Individual category boxes */
  .category-box {
    flex: 1;
    padding: 15px;
    border-radius: 10px;
    color: white;
    font-weight: bold;
    text-align: center;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    min-height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  /* Specific category colors */
  .green-box {
    background-color: #4CAF50;
    border: 2px solid #388E3C;
  }

  .violet-box {
    background-color: #9C27B0;
    border: 2px solid #7B1FA2;
  }

  .red-box {
    background-color: #F44336;
    border: 2px solid #D32F2F;
  }

  .small-box {
    background-color: #03A9F4;
    border: 2px solid #0288D1;
  }

  .big-box {
    background-color: #FFEB3B;
    border: 2px solid #FBC02D;
    color: #333;
  }

  .category-name {
    font-size: 1.1rem;
    margin-bottom: 5px;
    text-transform: uppercase;
  }

  .category-amount {
    font-size: 1.3rem;
    font-weight: 700;
  }

  /* Responsive adjustments */
  @media (max-width: 992px) {
    .timer-value {
      font-size: 40px;
    }
  }

  @media (max-width: 768px) {
    .result-wrapper {
      width: 30%;
    }
    .category-row {
      flex-wrap: wrap;
    }
    .category-box {
      min-width: calc(50% - 10px);
    }
    .timer-value {
      font-size: 36px;
    }
    .timer-label {
      font-size: 16px;
    }
  }

  @media (max-width: 480px) {
    .result-wrapper {
      width: 45%;
    }
    .category-name {
      font-size: 1rem;
    }
    .category-amount {
      font-size: 1.1rem;
    }
    .timer-value {
      font-size: 32px;
    }
    .timer-game-info {
      flex-direction: column;
      gap: 8px;
    }
  }
</style>

<div class="container-fluid py-5">
    
  <!-- Profit Summary Boxes -->
  <div class="row mb-4">
    <div class="col-md-3">
      <div class="card text-white bg-success shadow">
        <div class="card-body">
          <h5>Total Admin Profit</h5>
          <h3>₹<?php echo e($total_admin_profit ?? 0); ?></h3>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card text-white bg-danger shadow">
        <div class="card-body">
          <h5>Total User Profit</h5>
          <h3>₹<?php echo e($total_user_profit ?? 0); ?></h3>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card text-white bg-info shadow">
        <div class="card-body">
          <h5>Today Admin Profit</h5>
          <h3>₹<?php echo e($today_admin_profit ?? 0); ?></h3>
        </div>
      </div>
    </div>
    <div class="col-md-3">
      <div class="card text-white bg-warning shadow">
        <div class="card-body">
          <h5>Today User Profit</h5>
          <h3>₹<?php echo e($today_user_profit ?? 0); ?></h3>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Game Header -->
  <div class="row d-flex justify-content-between align-items-center">
    <div class="col-md-6">
      <div class="game-header fw-bold mb-0" id="gmsno" style="font-size:25px;"></div>
    </div>
    <div class="col-md-6 text-end">
      <b id="users_playing_block" style="font-weight: bold; font-size: 22px;">
        Total Users Playing - <span><?php echo e($total_users_playing ?? 0); ?></span>
      </b>
    </div>
  </div>

  <!-- Current Timer Display -->
  <div class="current-timer-container">
    <div class="timer-label" id="current-timer-label">
      <?php if($gameid == 1): ?>
       Wingo 30 SECOND GAME COUNTDOWN
      <?php elseif($gameid == 2): ?>
       Wingo 1 MINUTE GAME COUNTDOWN
      <?php elseif($gameid == 3): ?>
       Wingo 3 MINUTE GAME COUNTDOWN
      <?php elseif($gameid == 4): ?>
       Wingo 5 MINUTE GAME COUNTDOWN
      <?php endif; ?>
    </div>
    <div class="timer-value" id="current-timer">
      <?php if($gameid == 1): ?>
        00:30
      <?php elseif($gameid == 2): ?>
        01:00
      <?php elseif($gameid == 3): ?>
        03:00
      <?php elseif($gameid == 4): ?>
        05:00
      <?php endif; ?>
    </div>
  </div>

  <!-- Mode Tabs -->
  <?php
    $modes = ['Wingo 30 Second', 'Wingo 1 Minute', 'Wingo 3 Minute', 'Wingo 5 Minute'];
    $gameModes = DB::table('game_settings')
      ->whereIn('name', $modes)
      ->orderByRaw("FIELD(name, '".implode("','", $modes)."')")
      ->get();
  ?>

  <div class="mode-tab-group">
    <?php $__currentLoopData = $gameModes; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $mode): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
      <?php
        $isActive = request()->is('colour_prediction/'.$mode->id);
        $img = $isActive ? 'https://root.bdgcassino.com/wingo/redWatch.png' : 'https://root.bdgcassino.com/wingo/grayWatch.png';
      ?>
      <a style="border-radius:12px;" href="<?php echo e(route('colour_prediction', $mode->id)); ?>" class="<?php echo e($isActive ? 'active' : ''); ?>">
        <img src="<?php echo e($img); ?>" alt="Mode Icon">
        <span><?php echo e($mode->name); ?></span>
      </a>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
  </div>

  <?php if(session('success')): ?>
    <div class="alert alert-success alert-dismissible fade show">
      <i class="fas fa-check-circle me-2"></i><?php echo e(session('success')); ?>

      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  <?php endif; ?>

  <!-- Game Results Card -->
  <div class="card-modern shadow-sm">
    <div class="card-header text-white" style="background: linear-gradient(60deg,#007bff,#6610f2);">
      <h5><i class="fas fa-chart-bar me-2"></i>Game Results</h5>
    </div>
    <div class="section-bg">
      <!-- Color Categories Row -->
      <div class="category-row">
        <div class="category-box green-box">
          <div class="category-name">Green </div>
          <div class="category-amount" id="green-amount">₹0</div>
        </div>
        <div class="category-box violet-box">
          <div class="category-name">Violet </div>
          <div class="category-amount" id="violet-amount">₹0</div>
        </div>
        <div class="category-box red-box">
          <div class="category-name">Red </div>
          <div class="category-amount" id="red-amount">₹0</div>
        </div>
      </div>
      
      <!-- Numbers Grid -->
      <div class="results-container" id="results-container">
        <?php for($i = 0; $i <= 9; $i++): ?>
          <?php
            $betForNumber = $bets->firstWhere('number', $i);
            $amount = $betForNumber ? $betForNumber->amount : 0;
          ?>
          <div class="result-wrapper">
            <div class="data-count" data-number="<?php echo e($i); ?>" data-gameid="<?php echo e($gameid); ?>">
              <img src="https://root.bdgcassino.com/wingo/<?php echo e($i); ?>.png" alt="<?php echo e($i); ?>">
            </div>
            <div class="amount-box" id="amount-<?php echo e($i); ?>">₹<?php echo e($amount); ?></div>
          </div>
        <?php endfor; ?>
      </div>
      
      <!-- Size Categories Row -->
      <div class="category-row">
        <div class="category-box big-box">
          <div class="category-name">Big </div>
          <div class="category-amount" id="big-amount">₹0</div>
        </div>
        <div class="category-box small-box">
          <div class="category-name">Small </div>
          <div class="category-amount" id="small-amount">₹0</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Future Result Card -->
  <div class="card-modern shadow-sm">
    <div class="card-header d-flex justify-content-between align-items-center" style="background: linear-gradient(60deg,#20c997,#0dcaf0);">
      <h5 class="mb-0"><i class="fas fa-hourglass-half me-2"></i>Schedule Future Result</h5>
      <button class="btn btn-light btn-sm rounded-pill" onclick="copyPeriodNo()" title="Copy Period No">
        <i class="fas fa-copy me-1" style="color:black;"></i> Copy Period:
        <span id="copy-period"><?php echo e($bets->first()->games_no ?? '-'); ?></span>
      </button>
    </div>
       
    <div class="section-bg">
      <form method="post" action="<?php echo e(route('future_result.store')); ?>" class="row g-3 needs-validation" novalidate>
        <?php echo csrf_field(); ?>
        <input type="hidden" name="game_id" value="<?php echo e($gameid); ?>">
        <div class="col-sm-5">
          <label><i class="fas fa-calendar-alt me-1"></i>Future Period</label>
          <input type="text" name="game_no" class="form-control rounded-pill" placeholder="Game no" required>
        </div>
        <div class="col-sm-5">
          <label><i class="fas fa-sort-numeric-up-alt me-1"></i>Result</label>
          <select name="number" class="form-select rounded-pill" required>
            <option value="">Select</option>
            <?php for($i=0;$i<=9;$i++): ?>
              <option value="<?php echo e($i); ?>"><?php echo e($i); ?> - 
                <?php if($i == 0 || $i == 5): ?>
                  Violet
                <?php endif; ?>
                <?php if($i == 0 || in_array($i, [2,4,6,8])): ?>
                  Red
                <?php endif; ?>
                <?php if($i == 5 || in_array($i, [1,3,7,9])): ?>
                  Green
                <?php endif; ?>
                (<?php echo e($i >= 5 ? 'Big' : 'Small'); ?>)
              </option>
            <?php endfor; ?>
          </select>
        </div>
        <div class="col-auto d-flex align-items-end">
          <button type="submit" class="btn btn-success rounded-pill px-4">
            Submit <i class="fas fa-check ms-2"></i>
          </button>
        </div>
      </form>
    </div>
  </div>
  
  <!-- Toggle Buttons -->
  <div class="d-flex justify-content-start gap-3 mb-3 mt-4">
    <button class="btn btn-primary toggle-btn" data-target="future">Future Predictions</button>
    <button class="btn btn-secondary toggle-btn" data-target="user">User Bets</button>
  </div>

  <!-- Future Predictions Table - WITH PENDING/DECLARED LOGIC -->
  <div id="table-future" class="toggle-table">
    <div class="card shadow">
      <div class="card-header bg-info text-white"><strong>Future Prediction List</strong></div>
      <div class="card-body table-responsive">
        <table class="table table-bordered">
          <thead class="table-dark">
            <tr>
              <th>ID</th>
              <th>Period No</th>
              <th>Predicted Number</th>
              <th>Status</th>
              <th>Created</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            <?php $__empty_1 = true; $__currentLoopData = $futurePredictions; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $prediction): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
              <?php
                // Get current period number from bets
                $currentPeriod = $bets->first()->games_no ?? 0;
                $predictionPeriod = $prediction->gamesno;
                
                // Determine status based on period comparison
                $status = 'pending';
                $statusBadge = '<span class="badge bg-warning text-dark"><i class="fas fa-hourglass-half me-1"></i>Pending</span>';
                
                if($predictionPeriod < $currentPeriod) {
                  $status = 'declared';
                  $statusBadge = '<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Declared</span>';
                }
                
                $predictedNum = $prediction->predicted_number;
                $colorClass = '';
                if($predictedNum == 0 || $predictedNum == 5) $colorClass = 'violet';
                elseif(in_array($predictedNum, [1,3,7,9])) $colorClass = 'green';
                elseif(in_array($predictedNum, [2,4,6,8])) $colorClass = 'red';
              ?>
              <tr>
                <td><?php echo e($prediction->id); ?></td>
                <td><?php echo e($prediction->gamesno); ?></td>
                <td>
                  <span class="badge" style="background-color: 
                    <?php if($colorClass == 'green'): ?> #4CAF50 
                    <?php elseif($colorClass == 'violet'): ?> #9C27B0 
                    <?php elseif($colorClass == 'red'): ?> #F44336 
                    <?php else: ?> #6c757d <?php endif; ?>;
                    padding: 8px 12px; font-size: 14px;">
                    <?php echo e($predictedNum); ?>

                    <?php if($colorClass): ?>
                      (<?php echo e(ucfirst($colorClass)); ?>)
                    <?php endif; ?>
                  </span>
                 </td>
                 <td><?php echo $statusBadge; ?></td>
                 <td><?php echo e($prediction->created_at); ?></td>
                 <td><?php echo e($prediction->updated_at); ?></td>
              </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
              <tr>
                <td colspan="6" class="text-center">No predictions found.</td>
              </tr>
            <?php endif; ?>
          </tbody>
        </table>
        <?php echo e($futurePredictions->appends(['tab' => 'future'])->links('pagination::bootstrap-5')); ?>

      </div>
    </div>
  </div>

  <!-- User Bets Table -->
  <div id="table-user" class="toggle-table d-none">
    <div class="card shadow">
      <div class="card-header bg-warning text-dark"><strong>User Bet List</strong></div>
      <div class="card-body table-responsive">
        <table class="table table-bordered table-hover">
          <thead class="table-dark">
            <tr>
              <th>ID</th>
              <th>User ID</th>
              <th>Period Number</th>
              <th>Game ID</th>
              <th>Amount</th>
              <th>Win Number</th>
              <th>Win Amount</th>
              <th>Win / Loss</th>
              <th>Status</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            <?php $__empty_1 = true; $__currentLoopData = $userBets; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $bet): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); $__empty_1 = false; ?>
            <tr>
              <td><?php echo e($bet->id); ?></td>
              <td><?php echo e($bet->userid); ?></td>
              <td><?php echo e($bet->games_no); ?></td>
              <td><?php echo e($bet->game_id); ?></td>
              <td><?php echo e($bet->amount); ?></td>
              <td><?php echo e($bet->win_number); ?></td>
              <td><?php echo e($bet->win_amount); ?></td>
              <td class="text-center">
                <?php if($bet->win_amount == 0): ?>
                  <span class="text-danger"><strong>Loss</strong></span>
                <?php elseif($bet->win_amount > 0): ?>
                  <span class="text-success"><strong>Win</strong></span>
                <?php endif; ?>
              </td>
              <td><?php echo e($bet->status); ?></td>
              <td><?php echo e($bet->created_at); ?></td>
            </tr>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); if ($__empty_1): ?>
              <tr><td colspan="9" class="text-center">No user bets found.</td></tr>
            <?php endif; ?>
          </tbody>
        </table>
        <?php echo e($userBets->appends(['tab' => 'user'])->links('pagination::bootstrap-5')); ?>

      </div>
    </div>
  </div>
</div>

<script src="https://code.jquery.com/jquery-3.6.4.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
<!--<script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>-->
<script src="https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.7.5/socket.io.min.js"></script>

<script>
  // Correct color classification based on your rules
  function getColorCategories(number) {
    const categories = [];
    
    // Violet: numbers 0 and 5
    if (number == 0 || number == 5) {
      categories.push('violet');
    }
    
    // Red: numbers 0,2,4,6,8
    if (number == 0 || number == 2 || number == 4 || number == 6 || number == 8) {
      categories.push('red');
    }
    
    // Green: numbers 1,3,5,7,9
    if (number == 1 || number == 3 || number == 5 || number == 7 || number == 9) {
      categories.push('green');
    }
    
    return categories;
  }
  
  function getSize(number) {
    return number >= 5 ? 'big' : 'small';
  }
  
  // Function to format seconds into MM:SS
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Initialize socket connection
  const socket = io('https://socket.funplay.services');

  socket.on("connect", () => {
    console.log("Connected to timer server");
  });

  // Listen for timer updates
  socket.on("funplay_wingo", (data) => {
    try {
      const timerData = JSON.parse(data);
      
      // Update only the current game mode timer
      let currentTimer = '';
      if (<?php echo e($gameid); ?> == 1) {
        currentTimer = formatTime(timerData.timerBetTime);
      } else if (<?php echo e($gameid); ?> == 2) {
        currentTimer = formatTime(timerData.oneMinTimer);
      } else if (<?php echo e($gameid); ?> == 3) {
        currentTimer = formatTime(timerData.threeMinTimer);
      } else if (<?php echo e($gameid); ?> == 4) {
        currentTimer = formatTime(timerData.fiveMinTimer);
      }
      
      document.getElementById("current-timer").innerText = currentTimer;
      
      // Add animation when timer is below 10 seconds
      const timerElement = document.getElementById("current-timer");
      if (parseInt(currentTimer.split(':')[1]) < 10 || 
         (currentTimer.split(':')[0] === '00' && currentTimer.split(':')[1] === '00')) {
        timerElement.style.color = "#ffcc00";
        timerElement.style.textShadow = "0 0 10px #ffcc00";
        timerElement.style.animation = "pulse 0.5s infinite";
      } else {
        timerElement.style.color = "white";
        timerElement.style.textShadow = "0 2px 10px rgba(0,0,0,0.3)";
        timerElement.style.animation = "none";
      }
    } catch (e) {
      console.error("Error processing timer data:", e);
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected from server");
  });

  function copyPeriodNo() {
    const txt = $('#copy-period').text().trim();
    if (txt) {
      navigator.clipboard.writeText(txt).then(() => {
        Swal.fire({
          icon: 'success',
          title: 'Copied!',
          text: 'Period: ' + txt,
          timer: 1500,
          showConfirmButton: false
        });
      });
    }
  }

  function fetchData() {
    fetch(`/fetch/<?php echo e($gameid); ?>`)
      .then(res => res.json())
      .then(data => {
        if (data.bets && data.bets.length > 0) {
          const gameNo = data.bets[0].games_no ?? '—';
          $('#gmsno').text('Period No – ' + gameNo);
          $('#copy-period').text(gameNo);
          
          // Initialize totals
          let greenTotal = 0;
          let violetTotal = 0;
          let redTotal = 0;
          let smallTotal = 0;
          let bigTotal = 0;
          
          // Reset all individual amount displays to 0 first
          for(let i = 0; i <= 9; i++) {
            $(`#amount-${i}`).text('₹0');
          }
          
          // Process each bet to update individual number amounts and category totals
          data.bets.forEach(bet => {
            const number = parseInt(bet.number);
            const amount = parseFloat(bet.amount) || 0;
            
            // Update individual number amount
            $(`#amount-${number}`).text('₹' + amount);
            
            // Get color categories and size for this number
            const colors = getColorCategories(number);
            const size = getSize(number);
            
            // Add to color category totals
            if (colors.includes('green')) greenTotal += amount;
            if (colors.includes('violet')) violetTotal += amount;
            if (colors.includes('red')) redTotal += amount;
            
            // Add to size category totals
            if (size === 'small') smallTotal += amount;
            if (size === 'big') bigTotal += amount;
          });
          
          // Update category amounts
          $('#green-amount').text('₹' + greenTotal);
          $('#violet-amount').text('₹' + violetTotal);
          $('#red-amount').text('₹' + redTotal);
          $('#small-amount').text('₹' + smallTotal);
          $('#big-amount').text('₹' + bigTotal);
        }
      })
      .catch(err => {
        console.error('Error fetching data:', err);
      });
  }

  $(document).ready(function() {
    fetchData();
    setInterval(fetchData, 5000);

    $(document).on('click', '.data-count', function() {
      const number = $(this).data('number');
      const gameId = $(this).data('gameid');
      const periodNo = $('#copy-period').text().trim();

      if (number === undefined || !gameId || !periodNo) {
        return alert('Missing required data!');
      }

      Swal.fire({
        title: 'Confirm Result',
        text: `Set ${number} as result for period ${periodNo}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, submit it!',
        cancelButtonText: 'No'
      }).then((result) => {
        if (result.isConfirmed) {
          $.ajax({
            url: '<?php echo e(route("colour_prediction.store")); ?>',
            type: 'POST',
            data: {
              _token: '<?php echo e(csrf_token()); ?>',
              game_id: gameId,
              game_no: periodNo,
              number: number
            },
            success: function(response) {
              Swal.fire('Success!', 'Result submitted successfully.', 'success');
              fetchData();
              setTimeout(() => location.reload(), 1500);
            },
            error: function(xhr, status, error) {
              console.error(error);
              Swal.fire('Error!', 'Failed to submit result. ' + (xhr.responseJSON?.message || ''), 'error');
            }
          });
        }
      });
    });

    $('.toggle-btn').on('click', function() {
      let target = $(this).data('target');
      $('.toggle-table').addClass('d-none');
      $('#table-' + target).removeClass('d-none');
      $('.toggle-btn').removeClass('btn-primary').addClass('btn-secondary');
      $(this).removeClass('btn-secondary').addClass('btn-primary');
      
      const url = new URL(window.location.href);
      url.searchParams.set('tab', target);
      window.history.replaceState(null, '', url);
    });

    const tabParam = new URLSearchParams(window.location.search).get('tab');
    if (tabParam === 'user') {
      $('.toggle-btn[data-target="user"]').click();
    } else {
      $('.toggle-btn[data-target="future"]').click();
    }
  });
</script>


<?php $__env->stopSection(); ?>
<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/colour_prediction/index.blade.php ENDPATH**/ ?>