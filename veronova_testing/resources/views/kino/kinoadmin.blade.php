@extends('admin.body.adminmaster')

@section('admin')
<div class="container-fluid">
    <div class="row">
        <div class="col-md-12">
            <div class="white_shd full margin_bottom_30" style="padding: 30px; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                
                <div class="table_section padding_infor_info">
                    <div class="table-responsive-sm">
                        <h4 style="font-weight: 700; margin-bottom: 30px; font-size: 22px; color: #343a40;">🎮 Period No - {{ $nextGameNo ?? 'N/A' }}</h4>
                        
                        @for($row = 0; $row < 4; $row++)
                            <div class="d-flex justify-content-center mb-2">
                                @for($col = 1; $col <= 10; $col++) 
                                    @php $num = $row * 10 + $col; @endphp
                                    <div class="number-box" style="
                                        width: 55px; height: 55px; line-height: 55px;
                                        text-align: center; font-size: 18px; font-weight: bold;
                                        color: #fff; border-radius: 50%; margin: 5px;
                                        background: linear-gradient(135deg, #006800, #32CD32);
                                        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                                        cursor: pointer;
                                        transition: all 0.3s ease;">
                                        {{ $num }}
                                    </div>
                                @endfor
                            </div>
                        @endfor

                        <!-- Form Section -->
                   <form action="{{ route('adminWinner.addkino') }}" method="post" class="d-flex align-items-end justify-content-center mt-4 flex-wrap">
                            @csrf

                            <div class="form-group mx-4" style="min-width: 180px;">
                                <label for="games_no" style="font-weight: 600;">Game No:</label>
                                <input type="text" id="games_no" name="games_no" 
                                       class="form-control form-control-sm" 
                                       value="{{ $nextGameNo ?? '' }}"
                                       style="padding: 8px; font-weight: bold; border-radius: 6px; border: 1px solid #ced4da;">
                            </div>

                            <div class="form-group mx-4" style="min-width: 240px;">
                                <label for="selections" style="font-weight: 600;">Selected Numbers:</label>
                                <select id="selections" name="selections[]" class="form-control" multiple 
                                    style="height: 120px; font-weight: bold; border-radius: 6px; border: 1px solid #ced4da; overflow-y: auto;">
                                </select>
                            </div>

                            <div class="mx-4">
                                <button type="submit" class="btn btn-success" style="
                                    padding: 8px 18px; font-weight: 600; font-size: 14px;
                                    border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.2);">
                                    ✅ Submit
                                </button>
                            </div>
                        </form>

                    </div>
                </div>

            </div>
        </div>
    </div>
</div>

<!-- jQuery for selection behavior -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
$(document).ready(function () {
    let selectedNumbers = [];

    $(".number-box").click(function () {
        let num = $(this).text().trim();

        if (selectedNumbers.includes(num)) {
            selectedNumbers = selectedNumbers.filter(n => n !== num);
            $(this).css("background", "linear-gradient(135deg, #006800, #32CD32)");
            $(this).css("box-shadow", "0 4px 8px rgba(0,0,0,0.2)");
        } else {
            if (selectedNumbers.length < 10) {
                selectedNumbers.push(num);
                $(this).css("background", "linear-gradient(135deg, #FFD700, #FFA500)");
                $(this).css("box-shadow", "0 0 15px rgba(255, 165, 0, 0.7)");
            }
        }

        // Update the select box
        $("#selections").html('');
        selectedNumbers.forEach(number => {
            $("#selections").append(`<option value="${number}" selected>${number}</option>`);
        });
    });
});
</script>
@endsection
