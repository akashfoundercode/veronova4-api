@extends('admin.body.adminmaster')

@section('admin')

<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css">

<style>

*{
    margin:0;
    padding:0;
    box-sizing:border-box;
    font-family:'Inter',sans-serif;
}

body{
    background:#f4f7fb;
}

/* =========================
   PAGE WRAPPER
========================= */

.aviator-page{
    padding:35px 20px;
}

.settings-wrapper{
    max-width:1100px;
    margin:auto;
}

/* =========================
   TOP HEADER
========================= */

.page-header{
    display:flex;
    align-items:center;
    justify-content:space-between;
    flex-wrap:wrap;
    margin-bottom:30px;
    gap:20px;
}

.page-left h1{
    font-size:34px;
    font-weight:800;
    color:#111827;
    margin-bottom:8px;
}

.page-left p{
    font-size:15px;
    color:#6b7280;
}

.live-badge{
    padding:12px 18px;
    background:#fff;
    border-radius:14px;
    display:flex;
    align-items:center;
    gap:10px;
    border:1px solid #e5e7eb;
    box-shadow:0 4px 18px rgba(15,23,42,0.05);
}

.live-dot{
    width:10px;
    height:10px;
    border-radius:50%;
    background:#10b981;
    animation:pulse 1.5s infinite;
}

@keyframes pulse{
    0%{
        box-shadow:0 0 0 0 rgba(16,185,129,0.5);
    }
    70%{
        box-shadow:0 0 0 10px rgba(16,185,129,0);
    }
    100%{
        box-shadow:0 0 0 0 rgba(16,185,129,0);
    }
}

/* =========================
   MAIN CARD
========================= */

.settings-card{
    background:#ffffff;
    border-radius:28px;
    overflow:hidden;
    border:1px solid #e5e7eb;
    box-shadow:0 10px 35px rgba(15,23,42,0.06);
}

/* =========================
   CARD HEADER
========================= */

.card-header{
    padding:35px;
    background:linear-gradient(135deg,#111827,#1f2937);
    position:relative;
    overflow:hidden;
}

.card-header::before{
    content:'';
    position:absolute;
    width:220px;
    height:220px;
    background:rgba(255,255,255,0.05);
    border-radius:50%;
    right:-70px;
    top:-70px;
}

.card-header-content{
    position:relative;
    z-index:2;
    display:flex;
    align-items:center;
    justify-content:space-between;
    flex-wrap:wrap;
    gap:20px;
}

.mode-info{
    display:flex;
    align-items:center;
    gap:18px;
}

.mode-icon{
    width:80px;
    height:80px;
    border-radius:22px;
    background:rgba(255,255,255,0.08);
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:38px;
    backdrop-filter:blur(10px);
    border:1px solid rgba(255,255,255,0.08);
}

.mode-text h2{
    color:#fff;
    font-size:30px;
    font-weight:800;
    margin-bottom:6px;
}

.mode-text p{
    color:#cbd5e1;
    font-size:14px;
}

.mode-status{
    padding:14px 24px;
    border-radius:16px;
    font-weight:700;
    font-size:14px;
    letter-spacing:0.5px;
}

.status-simple{
    background:#2563eb;
    color:#fff;
}

.status-advance{
    background:#e11d48;
    color:#fff;
}

/* =========================
   BODY
========================= */

.card-body{
    padding:35px;
}

/* =========================
   MODE GRID
========================= */

.mode-grid{
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:22px;
    margin-bottom:30px;
}

.mode-option{
    position:relative;
    border:2px solid #e5e7eb;
    border-radius:24px;
    padding:28px;
    cursor:pointer;
    transition:0.3s ease;
    background:#fff;
}

.mode-option:hover{
    transform:translateY(-4px);
    box-shadow:0 12px 30px rgba(15,23,42,0.08);
}

.mode-option.active{
    border-color:#111827;
    background:#111827;
}

.mode-option.active .mode-card-title,
.mode-option.active .mode-card-desc{
    color:#fff;
}

.mode-option.active .feature{
    background:rgba(255,255,255,0.08);
    color:#fff;
}

.mode-top{
    display:flex;
    align-items:center;
    justify-content:space-between;
    margin-bottom:18px;
}

.mode-card-icon{
    width:68px;
    height:68px;
    border-radius:20px;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:30px;
    background:#f3f4f6;
}

.mode-option.active .mode-card-icon{
    background:rgba(255,255,255,0.08);
}

.check-circle{
    width:28px;
    height:28px;
    border-radius:50%;
    border:2px solid #d1d5db;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:13px;
    color:transparent;
}

.mode-option.active .check-circle{
    background:#10b981;
    border-color:#10b981;
    color:#fff;
}

.mode-card-title{
    font-size:24px;
    font-weight:800;
    color:#111827;
    margin-bottom:10px;
}

.mode-card-desc{
    color:#6b7280;
    font-size:14px;
    line-height:1.7;
    margin-bottom:20px;
}

.mode-features{
    display:flex;
    flex-wrap:wrap;
    gap:10px;
}

.feature{
    padding:8px 14px;
    border-radius:30px;
    background:#f3f4f6;
    color:#374151;
    font-size:12px;
    font-weight:600;
}

/* =========================
   ACTION AREA
========================= */

.action-box{
    background:#f9fafb;
    border-radius:22px;
    padding:24px;
    border:1px solid #e5e7eb;
}

.action-top{
    margin-bottom:20px;
}

.action-top h3{
    font-size:20px;
    color:#111827;
    font-weight:700;
    margin-bottom:6px;
}

.action-top p{
    color:#6b7280;
    font-size:14px;
}

.save-btn{
    width:100%;
    height:60px;
    border:none;
    border-radius:18px;
    background:linear-gradient(135deg,#111827,#1f2937);
    color:#fff;
    font-size:16px;
    font-weight:700;
    cursor:pointer;
    transition:0.3s ease;
}

.save-btn:hover{
    transform:translateY(-2px);
    box-shadow:0 12px 25px rgba(17,24,39,0.18);
}

/* =========================
   MOBILE
========================= */

@media(max-width:768px){

    .page-left h1{
        font-size:28px;
    }

    .mode-grid{
        grid-template-columns:1fr;
    }

    .card-header{
        padding:28px 20px;
    }

    .card-body{
        padding:20px;
    }

    .mode-info{
        width:100%;
    }

    .mode-text h2{
        font-size:24px;
    }

    .mode-status{
        width:100%;
        text-align:center;
    }

}

</style>

<div class="aviator-page">

    <div class="settings-wrapper">

        <!-- HEADER -->
        <div class="page-header">

            <div class="page-left">
                <h1>Aviator Game Settings</h1>
                <p>Manage and control live Aviator game modes professionally</p>
            </div>

            <div class="live-badge">
                <div class="live-dot"></div>
                <span>Live System Active</span>
            </div>

        </div>

        <!-- MAIN CARD -->
        <div class="settings-card">

            <!-- CARD HEADER -->
            <div class="card-header">

                <div class="card-header-content">

                    <div class="mode-info">

                        <div class="mode-icon" id="modeIcon">
                            {{ ($settings->game_type ?? 'simple') == 'simple' ? '✈️' : '🚀' }}
                        </div>

                        <div class="mode-text">

                            <h2 id="modeTitle">
                                {{ ($settings->game_type ?? 'simple') == 'simple' ? 'Simple Aviator' : 'Advance Aviator' }}
                            </h2>

                            <p>
                                Current active game mode configuration
                            </p>

                        </div>

                    </div>

                    <div class="mode-status {{ ($settings->game_type ?? 'simple') == 'simple' ? 'status-simple' : 'status-advance' }}" id="modeStatus">

                        {{ ($settings->game_type ?? 'simple') == 'simple' ? 'SIMPLE MODE' : 'ADVANCE MODE' }}

                    </div>

                </div>

            </div>

            <!-- CARD BODY -->
            <div class="card-body">

                <div class="mode-grid">

                    <!-- SIMPLE -->
                    <div class="mode-option {{ ($settings->game_type ?? 'simple') == 'simple' ? 'active' : '' }}" data-game="simple">

                        <div class="mode-top">

                            <div class="mode-card-icon">
                                ✈️
                            </div>

                            <div class="check-circle">
                                ✓
                            </div>

                        </div>

                        <div class="mode-card-title">
                            Simple Aviator
                        </div>

                        <div class="mode-card-desc">
                            Fast, lightweight and stable aviator gameplay mode with simplified logic and smooth performance.
                        </div>

                        <div class="mode-features">

                            <div class="feature">
                                Fast
                            </div>

                            <div class="feature">
                                Lightweight
                            </div>

                            <div class="feature">
                                Stable
                            </div>

                        </div>

                    </div>

                    <!-- ADVANCE -->
                    <div class="mode-option {{ ($settings->game_type ?? 'simple') == 'advance' ? 'active' : '' }}" data-game="advance">

                        <div class="mode-top">

                            <div class="mode-card-icon">
                                🚀
                            </div>

                            <div class="check-circle">
                                ✓
                            </div>

                        </div>

                        <div class="mode-card-title">
                            Advance Aviator
                        </div>

                        <div class="mode-card-desc">
                            Advanced gameplay system with enhanced controls, animations and premium game mechanics.
                        </div>

                        <div class="mode-features">

                            <div class="feature">
                                Premium
                            </div>

                            <div class="feature">
                                Advanced Logic
                            </div>

                            <div class="feature">
                                Dynamic
                            </div>

                        </div>

                    </div>

                </div>

                <!-- ACTION -->
                <div class="action-box">

                    <div class="action-top">

                        <h3>Save Configuration</h3>

                        <p>
                            Selected game mode will be applied instantly on the live Aviator system.
                        </p>

                    </div>

                    <form id="gameTypeForm">

                        @csrf

                        <input type="hidden" name="game_type" id="gameTypeInput" value="{{ $settings->game_type ?? 'simple' }}">

                        <button type="submit" class="save-btn">
                            Save Game Mode
                        </button>

                    </form>

                </div>

            </div>

        </div>

    </div>

</div>

<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

<script>

$(document).ready(function(){

    $('.mode-option').click(function(){

        $('.mode-option').removeClass('active');

        $(this).addClass('active');

        const gameType = $(this).data('game');

        $('#gameTypeInput').val(gameType);

        if(gameType === 'simple'){

            $('#modeIcon').html('✈️');

            $('#modeTitle').text('Simple Aviator');

            $('#modeStatus')
            .removeClass('status-advance')
            .addClass('status-simple')
            .text('SIMPLE MODE');

        }else{

            $('#modeIcon').html('🚀');

            $('#modeTitle').text('Advance Aviator');

            $('#modeStatus')
            .removeClass('status-simple')
            .addClass('status-advance')
            .text('ADVANCE MODE');

        }

    });

    $('#gameTypeForm').submit(function(e){

        e.preventDefault();

        let gameType = $('#gameTypeInput').val();

        Swal.fire({
            title:'Updating...',
            text:'Please wait while saving settings',
            allowOutsideClick:false,
            didOpen:() => {
                Swal.showLoading();
            }
        });

        $.ajax({

            url:'{{ route("aviator.update.game.type") }}',
            type:'POST',

            data:{
                _token:'{{ csrf_token() }}',
                game_type:gameType
            },

            success:function(response){

                if(response.success){

                    Swal.fire({
                        icon:'success',
                        title:'Settings Updated',
                        text:response.message,
                        confirmButtonColor:'#111827'
                    });

                }else{

                    Swal.fire({
                        icon:'error',
                        title:'Error',
                        text:response.message
                    });

                }

            },

            error:function(){

                Swal.fire({
                    icon:'error',
                    title:'Server Error',
                    text:'Something went wrong.'
                });

            }

        });

    });

});

</script>

@endsection