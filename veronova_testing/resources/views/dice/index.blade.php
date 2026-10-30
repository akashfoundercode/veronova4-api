@extends('admin.body.adminmaster')

@section('admin')

<div class="container-fluid mt-5">
    <form action="{{ route('dice.store') }}" method="post">
        @csrf
        <input type="hidden" name="game_id" value="{{ $game_id }}">
        <input type="hidden" name="games_no" value="{{ $amounts[0]->games_no }}">

        <div class="row">
            <div class="col-md-12">
                <div class="white_shd full margin_bottom_30">
                    <div class="full graph_head">
                        <div class="">
                            <div class="row" style="padding-left:30px;" id="gmsno"></div>
                        </div>
                    </div>

                    <div class="row" style="padding-top: 30px; padding-bottom:20px;">
                        @foreach ($amounts as $key => $item)
                            @if($item->number == '1')
                                <div class="card col-md-3 ml-3 mt-4" style="background-image: linear-gradient(to right, red , purple);">
                            @elseif($item->number == '2')
                                <div class="card col-md-3 ml-3 mt-4" style="background-image: linear-gradient(to right, green , purple);">
									 @elseif($item->number == '3')
                                <div class="card col-md-3 ml-3 mt-4" style="background-image: linear-gradient(to right, green , purple);">
									 @elseif($item->number == '4')
                                <div class="card col-md-3 ml-3 mt-4" style="background-image: linear-gradient(to right, green , purple);">
									 @elseif($item->number == '5')
                                <div class="card col-md-3 ml-3 mt-4" style="background-image: linear-gradient(to right, green , purple);">
									 @elseif($item->number == '6')
                                <div class="card col-md-3 ml-3 mt-4" style="background-image: linear-gradient(to right, green , purple);">
                            @else
                                <div class="card col-md-1 ml-3 mt-4" style="background-color:#ff0000">
                            @endif
                                <?php $gamid = $item->games_no; ?>
                                <div class="card-body">
                                    <b style="font-size: 20px; margin-left:12px; color: white;">
                                        @if($item->number == 1)
                                            One
                                        @elseif($item->number == 2)
                                            Two
										@elseif($item->number == 3)
                                            Three
										@elseif($item->number == 4)
                                            Four
										@elseif($item->number == 5)
                                            FIve
										@elseif($item->number == 6)
                                            Six
                                        @else
                                            {{ $item->number }}
                                        @endif
                                    </b>
                                </div>
                            </div>
                        @endforeach
                    </div>

                    <div class="row" style="padding-bottom:20px;" id="amounts-container"></div>

                    <div class="row ml-4 d-flex" style="margin-bottom: 20px;">
                        <input type="hidden" name="game_id" value="{{ $game_id }}">

                        <div class="col-md-3 form-group d-flex">
                            <input type="text" name="game_no" class="form-control" placeholder="Period" value="{{ $gamid }}">
                        </div>

                        <div class="col-md-3 form-group d-flex">
                            <select name="number" class="form-control">
                                <option value="1"><b>One</b></option>
                                <option value="2"><b>Two</b></option>
								<option value="3"><b>Three</b></option>
								<option value="4"><b>Four</b></option>
								<option value="5"><b>FIve</b></option>
								<option value="6"><b>Six</b></option>
                            </select>
                        </div>

                        <div class="col-md-2 form-group d-flex">
                            <button type="submit" class="form-control btn btn-info"><b>Submit</b></button>
                        </div>

                        <div class="col-md-2 form-group d-flex mt-1">
                            <a href=""><i class="fa fa-refresh" aria-hidden="true" style="font-size:30px;"></i></a>
                        </div>
                    </div>
                </form>

                <form action="{{ route('dicepercentage.update') }}" method="post">
                    @csrf
                    <div class="row" style="padding-left:30px;">
                        <div class="col-md-3 form-group d-flex">
                            <input type="hidden" name="id" value="{{ $game_id }}">
                            <input type="text" name="parsantage" value="{{ $amounts[0]->parsantage }}" class="form-control" placeholder="Percentage">
                            <span><b>%</b></span>
                        </div>

                        <div class="row">
                            @error('game_no')
                                <div class="alert alert-danger col-sm-6">{{ $message }}</div>
                            @enderror
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
            var gameid = {{ $game_id }};
            fetch('/fetch/' + gameid)
                .then(response => response.json())
                .then(data => {
                    updateBets(data.bets);
                })
                .catch(error => console.error('Error fetching data:', error));
        }

        function updateBets(bets) {
            var amountdetailHTML = '';
            var gmsno = '';
            var gmssno = '';

            bets.forEach(item => {
                amountdetailHTML += '<div class="card col-md-1 ml-3 mt-4 " style="background-color:#fff;">';
                amountdetailHTML += '<div class="card-body">';
                amountdetailHTML += '<b style="font-size: 10px;">' + item.amount + '</b>';
                amountdetailHTML += '</div>';
                amountdetailHTML += '</div>';
                gmsno = '<b style="font-size: 30px;">Period No - ' + item.games_no + '</b>';
                gmssno = item.games_no;
            });

            $('#amounts-container').html(amountdetailHTML);
            $('#gmsno').html(gmsno);
            $('#gmsssno').html(gmssno);
        }

        function refreshData() {
            fetchData();
            setInterval(fetchData, 5000);
        }

        document.addEventListener('DOMContentLoaded', refreshData);
    </script>

    <script type="text/javascript">
        setInterval(() => location.reload(), 60000);
    </script>

</div>

@endsection
