@extends('admin.body.adminmaster')

@section('admin')
    <div class="container-fluid">
        <div class="row">
            <div class="col-md-12">
                <div class="white_shd full margin_bottom_30">
                    <div class="full graph_head">
                        <div class="heading1 margin_0 d-flex">
                            <h2>Titli Game Result</h2>
                        </div>
                    </div>
                    <div class="table_section padding_infor_info">
                        <div class="table-responsive-sm">
                            <h4>Period No - {{ $nextGameNo ?? 'N/A' }}</h4>
                            
                            <div class="d-flex flex-wrap justify-content-center mb-3" style="max-width: 700px; margin: auto;">
                                @foreach($multiplierData as $index => $data)
                                    <div class="text-center mx-3 my-2">
                                        <img src="{{ $data->image }}" 
                                             style="width: 80px; height: 80px; cursor: pointer; border-radius: 10px; padding: 5px;" 
                                             class="card-image"
                                             data-id="{{ $data->id }}">
                                        <div style="font-size: 14px; font-weight: bold;">{{ $data->id }}</div>
                                        <div style="font-size: 12px; color: green; font-weight: bold;">
                                            ₹{{ $betsAmount[$data->id] ?? 0 }}
                                        </div>
                                    </div>
                                    @if(($index + 1) % 6 == 0)
                                        <div class="w-100"></div>
                                    @endif
                                @endforeach
                            </div>
                            <form action="{{ route('titli.add') }}" method="post" class="d-flex align-items-center justify-content-center">
                                @csrf
                                <div class="form-group mx-5">
                                    <label for="games_no" class="mr-6">Game No:</label>
                                    <input type="text" id="games_no" name="games_no" 
                                           class="form-control form-control-sm font-weight-bold" 
                                           value="{{ $nextGameNo ?? '' }}" style="width: 150px;">
                                </div>
                                <div class="form-group mx-3">
                                    <label for="card_id" class="mr-2">Card ID:</label>
                                    <select id="card_id" name="card_id" class="form-control form-control-sm font-weight-bold" style="width: 100px;">
                                        @foreach($multiplierData as $data)
                                            <option value="{{ $data->id }}">{{ $data->id }}</option>
                                        @endforeach
                                    </select>
                                </div>
                                <button type="submit" class="btn btn-primary btn-sm mx-3">Submit</button>
                            </form>
                            <form>
                                @csrf
                            <div>
                                <label></label>
                            </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script>
        $(document).ready(function() {
            $(".card-image").click(function() {
                var cardId = $(this).data("id");
                $("#card_id").val(cardId);
            });
        });
    </script>
@endsection
