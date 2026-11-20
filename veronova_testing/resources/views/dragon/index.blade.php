@extends('admin.body.adminmaster')

@section('admin')

<style>
.dragon-card-btn {
    cursor: pointer;
    transition: all 0.3s ease;
    border-radius: 12px;
    position: relative;
    border: 3px solid transparent;
}
.dragon-card-btn:hover {
    transform: translateY(-6px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.25);
}
.dragon-card-btn.selected-forced-active {
    border: 4px solid #28a745 !important;
    box-shadow: 0 0 20px rgba(40, 167, 69, 0.9) !important;
    transform: scale(1.05);
}
.selected-badge-dt {
    position: absolute;
    top: 10px;
    right: 10px;
    background: #28a745;
    color: #fff;
    font-weight: bold;
    padding: 4px 10px;
    border-radius: 20px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    font-size: 13px;
}
</style>

<div class="container-fluid mt-3" style="margin-bottom: 60px;">
 <form action="{{route('dragon.store') }}" method="post" id="dragonForm">
        @csrf
    <input type="hidden" name="game_id" value="{{ $game_id ?? 10 }}">
	 
    <div class="row">
        <div class="col-md-12">
            <div class="white_shd full margin_bottom_30">
                <div class="full graph_head">
                    <div class="">
					<div class="row" style=" padding-left:30px;" id="gmsno">
                        <b style="font-size: 25px;">Period No: {{ $amounts[0]->gamesno ?? ($amounts[0]->games_no ?? '') }}</b>                       
                    </div>
                </div>
                <div class="row" style="padding-top: 30px;  padding-bottom:20px;">
                  
                    <!-- Tie Card (Number: 3) -->
                    <div class="card col-md-3 ml-3 mt-4 dragon-card-btn {{ (isset($active_forced) && (string)$active_forced === '3') ? 'selected-forced-active' : '' }}" 
                         id="card-tie" data-number="3" 
                         style="background-image:url('https://kingclub.co.in/admin/uploads/banner/tie.png'); height:300px;">
                        @if(isset($active_forced) && (string)$active_forced === '3')
                            <span class="selected-badge-dt"><i class="fa fa-check"></i> SELECTED</span>
                        @endif
                        <div class="card-body" style="margin-top:120px">
                            <b style="font-size: 25px; margin-left:70px; " id="tie-amount"> {{$amounts[0]->tie ?? 0}} </b>
                        </div>
                    </div>

                    <!-- Tiger Card (Number: 2) -->
                    <div class="card col-md-3 ml-3 mt-4 dragon-card-btn {{ (isset($active_forced) && (string)$active_forced === '2') ? 'selected-forced-active' : '' }}" 
                         id="card-tiger" data-number="2" 
                         style="background-image:url('https://kingclub.co.in/admin/uploads/banner/tiger.png'); height:300px;">
                        @if(isset($active_forced) && (string)$active_forced === '2')
                            <span class="selected-badge-dt"><i class="fa fa-check"></i> SELECTED</span>
                        @endif
                        <div class="card-body" style="margin-top:120px">
                            <b style="font-size: 25px; margin-left:70px;" id="tiger-amount">{{$amounts[0]->tiger ?? 0}} </b>
                        </div>
                    </div>

                    <!-- Dragon Card (Number: 1) -->
                    <div class="card col-md-3 ml-3 mt-4 dragon-card-btn {{ (isset($active_forced) && (string)$active_forced === '1') ? 'selected-forced-active' : '' }}" 
                         id="card-dragon" data-number="1" 
                         style="background-image:url('https://kingclub.co.in/admin/uploads/banner/dragon.png'); height:300px; width:200px;">
                        @if(isset($active_forced) && (string)$active_forced === '1')
                            <span class="selected-badge-dt"><i class="fa fa-check"></i> SELECTED</span>
                        @endif
                        <div class="card-body" style="margin-top:120px">
                            <b style="font-size: 25px; margin-left:70px; " id="dragon-amount">{{$amounts[0]->dragon ?? 0}} </b>
                        </div>
                    </div>
                   
                </div>
              
					
                <div class="row ml-4 d-flex" style="margin-bottom: 20px;">
		<div class="col-md-3 form-group d-flex">
           <input type="text" name="gamesno" id="gamesno-input" class="form-control" value="{{$amounts[0]->gamesno ?? ($amounts[0]->games_no ?? '')}}">
        </div>
		<div class="col-md-3 form-group d-flex">
           <input type="text" name="number" id="result-input" class="form-control" placeholder="1=Dragon, 2=Tiger, 3=Tie" value="{{ $active_forced ?? '' }}">
        </div>
        <div class="col-md-2 form-group d-flex">
          <button type="submit" class="form-control btn btn-info"><b>Submit</b></button>
        </div>

                </div>
				
            </div>
				
        </div>
    </div>
	</div>
	</form>
</div>

<script src="https://code.jquery.com/jquery-3.6.4.min.js"></script>
<script>
    // Click on card to select and set number
    $(document).on('click', '.dragon-card-btn', function() {
        const num = $(this).data('number');
        $('#result-input').val(num);
        $('.dragon-card-btn').removeClass('selected-forced-active');
        $('.selected-badge-dt').remove();
        $(this).addClass('selected-forced-active');
        $(this).append('<span class="selected-badge-dt"><i class="fa fa-check"></i> SELECTED</span>');
    });

    function fetchData() {
        fetch('/dragon_fetch/{{ $game_id ?? 10 }}')
            .then(response => response.json())
            .then(data => {
                if (data.amounts && data.amounts.length > 0) {
                    const row = data.amounts[0];
                    const gmsno = row.gamesno || row.games_no || '';
                    if (gmsno) {
                        $('#gmsno').html('<b style="font-size: 25px;">Period No: ' + gmsno + '</b>');
                        $('#gamesno-input').val(gmsno);
                    }
                    if (row.tie !== undefined) $('#tie-amount').text(row.tie);
                    if (row.tiger !== undefined) $('#tiger-amount').text(row.tiger);
                    if (row.dragon !== undefined) $('#dragon-amount').text(row.dragon);
                }

                // Keep active forced card highlighted until round changes
                $('.dragon-card-btn').removeClass('selected-forced-active');
                $('.selected-badge-dt').remove();
                if (data.active_forced !== null && data.active_forced !== undefined && data.active_forced !== '') {
                    const forcedNum = String(data.active_forced);
                    let targetCard = null;
                    if (forcedNum === '1') targetCard = $('#card-dragon');
                    else if (forcedNum === '2') targetCard = $('#card-tiger');
                    else if (forcedNum === '3') targetCard = $('#card-tie');
                    
                    if (targetCard && targetCard.length) {
                        targetCard.addClass('selected-forced-active');
                        targetCard.append('<span class="selected-badge-dt"><i class="fa fa-check"></i> SELECTED</span>');
                        $('#result-input').val(forcedNum);
                    }
                }
            })
            .catch(error => console.error('Error fetching data:', error));
    }

    function refreshData() {
        fetchData();
        setInterval(fetchData, 5000);
    }

    document.addEventListener('DOMContentLoaded', refreshData);
</script>

@endsection