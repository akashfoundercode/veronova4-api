@extends('admin.body.adminmaster')

@section('admin')
<div class="container-fluid">
    <div class="row">
        <div class="col-md-12">
            <div class="white_shd full margin_bottom_30" style="padding: 30px; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
                
                <div class="table_section padding_infor_info">
                    <div class="table-responsive-sm">
                        <h4 style="font-weight: 700; margin-bottom: 30px; font-size: 22px; color: #343a40;">🎮 Period No - {{ $nextGameNo ?? 'N/A' }}</h4>
                        
                        <!-- First Row: 2,4,6,8,10,12 -->
                        <div class="d-flex justify-content-center mb-2 flex-wrap">
                            @foreach([2, 4, 6, 8, 10, 12] as $num)
                                <div class="number-box" data-number="{{ $num }}"
                                     style="width: 55px; height: 55px; line-height: 55px;
                                            text-align: center; font-size: 18px; font-weight: bold;
                                            color: #fff; border-radius: 50%; margin: 5px;
                                            background: {{ in_array($num, [8,10,12]) ? 'red' : 'black' }};
                                            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                                            cursor: pointer; transition: all 0.3s ease;">
                                    {{ $num }}
                                </div>
                            @endforeach
                        </div>

                        <!-- Second Row: 1,3,5,7,9,11 -->
                        <div class="d-flex justify-content-center mb-2 flex-wrap">
                            @foreach([1, 3, 5, 7, 9, 11] as $num)
                                <div class="number-box" data-number="{{ $num }}"
                                     style="width: 55px; height: 55px; line-height: 55px;
                                            text-align: center; font-size: 18px; font-weight: bold;
                                            color: #fff; border-radius: 50%; margin: 5px;
                                            background: {{ in_array($num, [1,3,5]) ? 'red' : 'black' }};
                                            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                                            cursor: pointer; transition: all 0.3s ease;">
                                    {{ $num }}
                                </div>
                            @endforeach
                        </div>

                        <!-- Form Section -->
                        <form action="{{ route('MiniRoulete.adminwinresult') }}" method="post" class="d-flex align-items-end justify-content-center mt-4 flex-wrap">
                            @csrf

                            <div class="form-group mx-4" style="min-width: 180px;">
                                <label for="games_no" style="font-weight: 600;">Game No:</label>
                                <input type="text" id="games_no" name="games_no" 
                                       class="form-control form-control-sm" 
                                       value="{{ $nextGameNo ?? '' }}"
                                       style="padding: 8px; font-weight: bold; border-radius: 6px; border: 1px solid #ced4da;">
                            </div>

                            <div class="form-group mx-4" style="min-width: 240px;">
                                <label for="selections" style="font-weight: 600;">Selected Number:</label>
                                <select id="selections" name="selections[]" class="form-control" multiple 
                                    style="height: 55px; font-weight: bold; border-radius: 6px; border: 1px solid #ced4da;">
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

<!-- jQuery for single selection behavior -->
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<script>
$(document).ready(function () {
    let selectedNumber = null;

    $(".number-box").click(function () {
        let num = $(this).text().trim();

        $(".number-box").css("box-shadow", "0 4px 8px rgba(0,0,0,0.2)");

        if (selectedNumber === num) {
            selectedNumber = null;
            $("#selections").html('');
        } else {
            selectedNumber = num;

            // Reset all colors to original
            $(".number-box").each(function () {
                let boxNum = parseInt($(this).data("number"));
                if ([1, 3, 5, 8, 10, 12].includes(boxNum)) {
                    $(this).css("background", "red");
                } else {
                    $(this).css("background", "black");
                }
            });

            // Highlight selected
            $(this).css("background", "linear-gradient(135deg, #FFD700, #FFA500)")
                   .css("box-shadow", "0 0 15px rgba(255, 165, 0, 0.7)");

            $("#selections").html(`<option value="${num}" selected>${num}</option>`);
        }
    });
});
</script>
@endsection
