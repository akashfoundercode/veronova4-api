@extends('admin.body.adminmaster')

@section('admin')

<div class="container mt-5">
    <div class="row">
        <div class="col-md-6">
            <div class="white_shd full margin_bottom_30">
                <div class="full graph_head">
                    <div class="heading1 margin_0 d-flex">
                        <h2>Results</h2>
                        <div class="row" style="padding-left:30px;" id="gmsno"></div>
                    </div>
                </div>

                <div class="container">
                    {{-- Form 1 --}}
                    <form action="{{ route('hotairballoon.stores', 23) }}" method="POST" enctype="multipart/form-data">
                        @csrf
                        <div class="row">
                            <div class="col-md-5">
                                <div class="form-group">
                                    <label for="parsantage">Game Period</label>
                                    <input type="hidden" name="game_id" value="23">
                                    <input type="number" class="form-control" name="game_sr_num"
                                        value="{{ $results->game_sr_num }}">
                                </div>
                            </div>

                            <div class="col-md-4">
                                <div class="form-group">
                                    <label for="multiplier">Multiplier</label>
                                    <input type="number" step="any" class="form-control" name="multiplier">
                                </div>
                            </div>

                            <div class="col-md-3" style="margin-top:28px;">
                                <div class="form-group">
                                    <label></label>
                                    <button type="submit" class="btn btn-primary btn-sm">Submit</button>
                                </div>
                            </div>
                        </div>
                    </form>

                    {{-- Form 2 --}}
                    <form action="{{ route('hotair_percentage.update', 23) }}" method="POST"
                        enctype="multipart/form-data">
                        @csrf
                        <div class="row">
                            <div class="col-md-5">
                                <div class="form-group">
                                    <label for="parsantage">Percentage %</label>
                                    <input type="hidden" name="game_id" value="23">
                                    <input type="number" step="any" class="form-control" name="winning_percentage"
                                        value="{{$win_per}}">
                                </div>
                            </div>

                            <div class="col-md-3" style="margin-top:28px;">
                                <div class="form-group">
                                    <label></label>
                                    <button type="submit" class="btn btn-primary btn-sm">Submit</button>
                                </div>
                            </div>

                            <div class="col-md-2" style="margin-top:28px;">
                                <label></label>
                                <a href=""><i class="fa fa-refresh" aria-hidden="true" style="font-size:30px;"></i></a>
                            </div>

                            <div class="col-md-2"></div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</div>

{{-- JavaScript --}}
<script src="https://code.jquery.com/jquery-3.6.4.min.js"></script>
<script>
    function fetchData() {
        var gameid = {{ isset($results) ? $results -> game_sr_num : 0  }};
  

    fetch('/hotair/' + gameid)
        .then(response => response.json())
        .then(data => {
            updateBets(data.bets);
            updateGameId(data.gameid);
        })
        .catch(error => console.error('Error fetching data:', error));
    }

    function updateBets(bets) {
        var amountdetailHTML = '';
        var gmsno = '';
        var gmssno = '';

        bets.forEach(item => {
            amountdetailHTML += `
                <div class="card col-md-1 ml-3 mt-4" style="background-color:#fff;">
                    <div class="card-body">
                        <b style="font-size: 10px;">${item.amount}</b>
                    </div>
                </div>`;
            gmsno = `<b style="font-size: 30px;">Period No - ${item.game_sr_num}</b>`;
            gmssno = item.game_sr_num;
        });

        $('#amounts-container').html(amountdetailHTML);
        $('#gmsno').html(gmsno);
        $('#gmsssno').html(gmssno);
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

<script type="text/javascript">
</script>

@endsection