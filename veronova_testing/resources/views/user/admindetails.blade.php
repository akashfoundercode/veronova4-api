@extends('admin.body.adminmaster')

@section('admin')
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">

<style>
.fixed-admin {
    position: sticky;
    top: 0;
    z-index: 1000;
   
    padding:5px 0;
  
    margin-bottom:2px;
}
.scroll-container {
    overflow-x: auto;
    overflow-y: hidden;
    white-space: nowrap;
    padding-bottom: 20px;
    margin-top: 20px;
}
.tree {
    display: inline-block;
    min-width: max-content;
}
.tree ul {
    padding-top: 20px;
    position: relative;
    display: flex;
    justify-content: center;
}
.tree li {
    list-style-type: none;
    margin: 0 20px;
    text-align: center;
    position: relative;
    padding: 20px 5px 0 5px;
}
.tree li::before,
.tree li::after {
    content: '';
    position: absolute;
    top: 0;
    right: 50%;
    border-top: 4px solid black;
    width: 50%;
    height: 20px;
}
.tree li::after {
    right: auto;
    left: 50%;
    border-left: 4px solid red;
}
.tree li:only-child::before,
.tree li:only-child::after {
    content: none;
}
.tree li:only-child {
    padding-top: 0;
}
.tree li .card {
    display: inline-block;
    padding: 10px;
    background: #f8f9fa;
    border: 1px solid #ccc;
    border-radius: 5px;
    width: 150px;
}
.tree li .bottom-user {
    background-color: #6f42c1 !important;
    color: white;
}
.bi-person-circle {
    font-size: 30px;
    margin-bottom: 5px;
    color: #0d6efd;
}
.zoom-controls {
    position: fixed;
    top: 80px;
    right: 30px;
    z-index: 9999;
    background: white;
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 0 10px rgba(0,0,0,0.15);
}
</style>

<div class="container mt-5">
    <h4 class="text-center mb-4">Admin Details</h4>
    
    <!-- Centered Form Wrapper -->
    <div class="d-flex justify-content-center">
        <form method="GET" action="{{ route('admin_details') }}" class="mb-4">
            <div class="row g-2 align-items-end justify-content-center">
                
                <div class="col-md-auto">
                    <label for="start_date" class="form-label">From:</label>
                    <input type="date" name="start_date" id="start_date" class="form-control" value="{{ request('start_date') }}">
                </div>

                <div class="col-md-auto">
                    <label for="end_date" class="form-label">To:</label>
                    <input type="date" name="end_date" id="end_date" class="form-control" value="{{ request('end_date') }}">
                </div>

                <div class="col-md-auto mt-2 mt-md-0">
                    <button type="submit" class="btn btn-primary w-100">Filter</button>
                </div>

                @if(request('start_date') || request('end_date'))
                <div class="col-md-auto mt-2 mt-md-0">
                    <a href="{{ route('admin_details') }}" class="btn btn-danger w-100">Reset</a>
                </div>
                @endif

            </div>
        </form>
    </div>
</div>

    <div class="zoom-controls">
        <button class="btn btn-outline-primary btn-sm me-2" onclick="zoomOut()">
            <i class="bi bi-dash-circle"></i> Zoom Out
        </button>
        <button class="btn btn-outline-success btn-sm" onclick="zoomIn()">
            <i class="bi bi-plus-circle"></i> Zoom In
        </button>
    </div>



    <!-- Fixed Admin Section -->
    <div class="fixed-admin text-center">
        @php
            $admin = $users->firstWhere('username', 'Admin');
        @endphp
        <div class="card shadow-sm bg-dark text-white mx-auto" style="width: 150px;">
            <i class="bi bi-person-circle"></i><br>
            UID: {{ $admin->u_id }}<br>
            <button class="btn btn-sm btn-light mt-2" onclick='showModal(@json([
                "id" => $admin->id,
                "username" => $admin->username,
                "uid" => $admin->u_id
            ]))'>See More</button>
        </div>
    </div>

    <!-- Scrollable Tree Section -->
    <div class="scroll-container">
        <div id="zoomable-tree" style="transform: scale(1); transform-origin: top center;">
            <div class="tree">
                @php
                    function getDownlineUserIds($parentId, $users) {
                        $ids = [];
                        foreach ($users as $user) {
                            if ($user->referral_user_id == $parentId) {
                                $ids[] = $user->id;
                                $ids = array_merge($ids, getDownlineUserIds($user->id, $users));
                            }
                        }
                        return $ids;
                    }

                    $allBets = [
                        'aviator' => $aviatorData,
                        'chicken' => $chickenData,
                        'wingo' => $wingoData,
                    ];
                    
                    function buildTree($parentId, $users, $allBets) {
                        $children = $users->filter(fn($u) => $u->referral_user_id == $parentId);
                        if ($children->isEmpty()) return;
                        echo '<ul>';
                        foreach ($children as $user) {
                            if ($user->referral_user_id == 1) {
                                $isBottom = !$users->contains('referral_user_id', $user->id);
                                echo '<li>';
                                echo '<div class="card shadow-sm ' . ($isBottom ? 'bottom-user' : '') . '">';
                                echo '<i class="bi bi-person-circle"></i><br>';
                                echo 'UID: ' . $user->u_id . '<br>';
                                echo '<button class="btn btn-sm btn-primary mt-2" onclick="showModal(' . htmlspecialchars(json_encode([
                                    'id' => $user->id,
                                    'username' => $user->username,
                                    'uid' => $user->u_id
                                ])) . ')">See More</button>';
                                echo '</div>';
                                buildTree($user->id, $users, $allBets);
                                echo '</li>';
                            }
                        }
                        echo '</ul>';
                    }
                @endphp

                <ul>
                    <li>
                        @php buildTree($admin->id, $users, $allBets); @endphp
                    </li>
                </ul>
            </div>
        </div>
    </div>
</div>

<!-- Modal -->
<div class="modal fade" id="bettingSummaryModal" tabindex="-1" aria-labelledby="bettingSummaryModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-dialog-centered  text-center" style="max-width: 500px;">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title" id="bettingSummaryModalLabel">!!! Summary !!!</h5>
       <button type="button" class="btn btn-dark text-white" data-dismiss="modal" aria-label="Close">
  <i class="fas fa-times"></i>
</button>
      </div>
      <div class="modal-body" id="modalSummaryContent">Loading...</div>
    </div>
  </div>
</div>

<script>
    let currentZoom = 1;
    const allBets = @json($allBets);
    const allUsers = @json($users);
    const allPaying = @json($payingData);
    const allWithdraw = @json($withdrawData);

    function zoomIn() {
        if (currentZoom < 2) {
            currentZoom += 0.1;
            updateZoom();
        }
    }

    function zoomOut() {
        if (currentZoom > 0.2) {
            currentZoom -= 0.1;
            updateZoom();
        }
    }

    function updateZoom() {
        document.getElementById('zoomable-tree').style.transform = `scale(${currentZoom})`;
    }

    function getDownlineIds(parentId) {
        const ids = [];
        for (const user of allUsers) {
            if (user.referral_user_id === parentId) {
                ids.push(user.id);
                ids.push(...getDownlineIds(user.id));
            }
        }
        return ids;
    }

    function showModal(user) {
        const downlineIds = getDownlineIds(user.id);
        downlineIds.push(user.id); // include self

        let content = '';
        let overallBets = 0;
        let overallAmount = 0;
        let overallWinAmount = 0;
        let overallUserProfit = 0;

        ['aviator', 'chicken', 'wingo'].forEach(game => {
            let totalBets = 0;
            let totalAmount = 0;
            let totalWinAmount = 0;
            let totalUserProfit = 0;

            downlineIds.forEach(uid => {
                const betData = allBets[game][uid];
                if (betData) {
                    totalBets += parseInt(betData.total_bets || 0);
                    totalAmount += parseFloat(betData.total_amount || 0);
                    totalWinAmount += parseFloat(betData.total_win || 0);

                    const userProfit = parseFloat(betData.total_win || 0) - parseFloat(betData.total_amount || 0);
                    totalUserProfit += userProfit;
                }
            });

            // Add to overall
            overallBets += totalBets;
            overallAmount += totalAmount;
            overallWinAmount += totalWinAmount;
            overallUserProfit += totalUserProfit;

            if (totalBets > 0 || totalAmount > 0 || totalWinAmount > 0) {
                const adminLoss = totalUserProfit;

                let adminText = '';
                if (adminLoss > 0) {
                    adminText = `<span class="text-danger"><strong>Admin Loss: ₹${adminLoss.toFixed(2)}</strong></span>`;
                } else if (adminLoss < 0) {
                    adminText = `<span class="text-primary"><strong>Admin Profit: ₹${Math.abs(adminLoss).toFixed(2)}</strong></span>`;
                } else {
                    adminText = `<span class="text-muted"><strong>Admin Profit/Loss: ₹0.00</strong></span>`;
                }

                content += `<strong>${game.charAt(0).toUpperCase() + game.slice(1)}:</strong><br>`;
                content += `Bets Count: ${totalBets}<br>`;
                content += `Total Bet Amount: ₹${totalAmount.toFixed(2)}<br>`;
                content += `Win: ₹${totalWinAmount.toFixed(2)}<br>`;
                content += `<span class="${totalUserProfit >= 0 ? 'text-success' : 'text-danger'}"><strong>User Net ${totalUserProfit >= 0 ? 'Profit' : 'Loss'}: ₹${Math.abs(totalUserProfit).toFixed(2)}</strong></span><br>`;
                content += `${adminText}<hr>`;
            }
        });

        // Overall Summary
        let overallAdminLoss = overallUserProfit;
        let overallAdminText = '';
        if (overallAdminLoss > 0) {
            overallAdminText = `<span class="text-danger"><strong>Admin Loss: ₹${overallAdminLoss.toFixed(2)}</strong></span>`;
        } else if (overallAdminLoss < 0) {
            overallAdminText = `<span class="text-primary"><strong>Admin Profit: ₹${Math.abs(overallAdminLoss).toFixed(2)}</strong></span>`;
        } else {
            overallAdminText = `<span class="text-muted"><strong>Admin Profit/Loss: ₹0.00</strong></span>`;
        }

        content += `<h6><strong>Overall Summary (All Games):</strong></h6>`;
        content += `Total Bets: ${overallBets}<br>`;
        content += `Total Bet Amount: ₹${overallAmount.toFixed(2)}<br>`;
        content += `Total Win: ₹${overallWinAmount.toFixed(2)}<br>`;
        content += `<span class="${overallUserProfit >= 0 ? 'text-success' : 'text-danger'}"><strong>User Net ${overallUserProfit >= 0 ? 'Profit' : 'Loss'}: ₹${Math.abs(overallUserProfit).toFixed(2)}</strong></span><br>`;
        content += `${overallAdminText}<hr>`;

        // Deposit Summary
        let totalPaying = 0;
        downlineIds.forEach(id => {
            const pay = allPaying.find(p => p.user_id === id);
            if (pay) {
                totalPaying += parseFloat(pay.total_paying || 0);
            }
        });
        content += `<strong>Total Deposit:</strong> ₹${totalPaying.toFixed(2)}<br>`;

        // Withdraw Summary
        let totalWithdraw = 0;
        downlineIds.forEach(id => {
            const wd = allWithdraw.find(w => w.user_id === id);
            if (wd) {
                totalWithdraw += parseFloat(wd.total_withdraw || 0);
            }
        });
        content += `<strong>Total Withdraw:</strong> ₹${totalWithdraw.toFixed(2)}<br>`;

        if (!content) {
            content = '<em>No betting summary available.</em>';
        }

        document.getElementById('bettingSummaryModalLabel').innerText = `All Summary - ${user.username} (UID: ${user.uid})`;
        document.getElementById('modalSummaryContent').innerHTML = content;
        new bootstrap.Modal(document.getElementById('bettingSummaryModal')).show();
    }
</script>
@endsection