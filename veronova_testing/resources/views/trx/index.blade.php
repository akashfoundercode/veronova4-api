@extends('admin.body.adminmaster')

@section('admin')

<div class="container-fluid" style="margin-bottom: 60px;">
    <form action="{{ route('trx.store') }}" method="post">
        @csrf
        <!-- Your existing form content -->
        <input type="hidden" name="gameid"  value="{{$gameid}}">
        <input type="hidden" name="gamesno"  value="{{$bets[0]->games_no}}">

        <div class="row">
            <div class="col-md-12">
                <div class="white_shd full margin_bottom_30">
                    <div class="full graph_head">
                        <div class="row" style="padding-left:30px;" id="gmsno">                       
                        </div>
                    </div>
                    <div class="row" style="padding-top: 30px; padding-bottom:20px;">
                        @foreach ($bets as $item)
                            @if($item->number =='1' || $item->number =='3'||$item->number =='7'||$item->number =='9')
                                <div class="card col-md-1 ml-3 mt-4 " style="background-color:#008000;">
                            @elseif($item->number =='5')        
                                <div class="card col-md-1 ml-3 mt-4 " style="background-image: linear-gradient(to right, green , purple);">
                            @elseif($item->number =='0')        
                                <div class="card col-md-1 ml-3 mt-4 " style="background-image: linear-gradient(to right, red , purple);">
                            @else
                                <div class="card col-md-1 ml-3 mt-4 " style="background-color:#ff0000">
                            @endif
                                <?php $gamid= $item->games_no;?>
                                <div class="card-body">
                                    <b style="font-size: 20px; margin-left:12px; color: white;"> {{ $item->number }}</b>
                                </div>
                            </div>
                        @endforeach
                    </div>
                    <div class="row" style="padding-bottom:20px;" id="amounts-container">
                    </div>

                    <div class="row ml-4 d-flex" style="margin-bottom: 20px;">
						 <input type="hidden" name="game_id"  value="{{$gameid}}">
                        <div class="col-md-3 form-group d-flex">
                            <input type="text" name="game_no" class="form-control" placeholder="Period" value ="<?php echo $gamid;?>">
                        </div>
                        <div class="col-md-3 form-group d-flex">
                            <input type="number" min="1" max="9" name="number" class="form-control" placeholder="Result">
                        </div>
                        <div class="col-md-2 form-group d-flex">
                            <button type="submit" class="form-control btn btn-info"><b>Submit</b></button>
                        </div>
						<div class="col-md-2 form-group d-flex mt-1">
                            <a href=""> <i class="fa fa-refresh" aria-hidden="true" style="font-size:30px;"></i></a>
                        </div>
                    </div>
                </form>
					
                <form action="{{ route('percentage.update') }}" method="post">
                    @csrf
                    <div class="row" style="padding-left:30px;">
                        <div class="col-md-3 form-group d-flex">
                            <input type="hidden" name="id" value="{{ $gameid }}">
                            <input type="text" name="parsantage" value="{{ $bets[0]->parsantage }}" class="form-control" placeholder="Percentage">
                            <span><b>%</b></span>
                        </div>
                        <div class="col-md-2 form-group">
                            <button type="submit" class="form-control btn btn-info"><b>Submit</b></button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.6.4.min.js"></script>
    <script>
        function fetchData() {
            var gameid = {{ $gameid }};
            fetch('/fetch/' + gameid)
                .then(response => response.json())
                .then(data => {
                    console.log('Fetched data:', data);
                    updateBets(data.bets);
                    updateGameId(data.gameid);
                })
                .catch(error => console.error('Error fetching data:', error));
        }

        function updateBets(bets) {
            console.log('Updated Bets:', bets);
            var amountdetailHTML = '';
            var gmsno='';
            bets.forEach(item => {
                amountdetailHTML += '<div class="card col-md-1 ml-3 mt-4 " style="background-color:#fff;">';
                amountdetailHTML += '<div class="card-body">';
                amountdetailHTML += '<b style="font-size: 10px; ">' + item.amount + '</b>';
                amountdetailHTML += ' </div>';
                amountdetailHTML += '</div>';
                gmsno ='<b style="font-size: 50px; "> Period No :' + item.games_no + '</b>';
            });

            $('#amounts-container').html(amountdetailHTML);
            $('#gmsno').html(gmsno);
        }

        function updateGameId(gameid) {
            console.log('Updated Game ID:', gameid);
        }

        function refreshData() {
            fetchData();
            setInterval(fetchData, 5000);
        }

        document.addEventListener('DOMContentLoaded', refreshData);
    </script>
@endsection