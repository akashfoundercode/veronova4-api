@extends('admin.body.adminmaster')

@section('admin')
<div class="container-fluid">
    <div class="row justify-content-center">
        <div class="col-md-10">
            <div class="white_shd full margin_bottom_30" style="padding: 30px; background: #fff; border-radius: 12px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);">
                <h4 style="font-weight: 700; margin-bottom: 25px;">🎮 Period No -{{ $nextGameNo ?? 'N/A' }}</h4>

                <form action="{{ route('jackpot.jackpotadminWinner') }}" method="post">
                    @csrf

                    <!-- Card Options -->
                    <div style="display: flex; justify-content: center; gap: 18px; flex-wrap: wrap; margin-top: 25px;">
                        @php
                            $cards = [
                                ['name' => 'SET', 'amount' => '₹0', 'multiplier' => '20X'],
                                ['name' => 'PURE SEQ', 'amount' => '₹0', 'multiplier' => '10X'],
                                ['name' => 'SEQ', 'amount' => '₹0', 'multiplier' => '6X'],
                                ['name' => 'COLOR', 'amount' => '₹0', 'multiplier' => '5X'],
                                ['name' => 'PAIR', 'amount' => '₹0', 'multiplier' => '4X'],
                                ['name' => 'HIGH CARD', 'amount' => '₹0', 'multiplier' => '3X'],
                            ];
                        @endphp

                        @foreach($cards as $card)
                        <div onclick="selectCard('{{ $card['name'] }}')" 
                            id="card-{{ str_replace(' ', '-', strtolower($card['name'])) }}"
                            style="cursor:pointer;width:110px;text-align:center;padding:16px 10px;border-radius:14px;background:linear-gradient(145deg,#b22222,#8b0000);color:#fff;box-shadow:0 5px 15px rgba(0,0,0,0.25);transition:all 0.25s ease;">
                            <div style="font-weight:700;font-size:15px;">{{ $card['name'] }}</div>
                            <div style="font-size:13px;margin:5px 0;">{{ $card['amount'] }}</div>
                            <div style="display:inline-block;padding:3px 8px;font-size:12px;background:gold;color:#000;border-radius:8px;font-weight:600;box-shadow:inset 0 0 5px #fff700;">{{ $card['multiplier'] }}</div>
                        </div>
                        @endforeach
                    </div>

                    <!-- Form Inputs -->
                    <div style="display: flex; justify-content: center; align-items: end; flex-wrap: wrap; gap: 30px; margin-top: 40px;">
                        <div>
                            <label for="game_type" style="font-weight: 600;">Select Type:</label><br>
                            <select id="game_type" name="game_type" style="width: 160px; padding: 6px 12px; font-size: 14px; border-radius: 6px; border: 1px solid #ced4da;">
                                <option value="">-- Select --</option>
                                @foreach($cards as $card)
                                    <option value="{{ $card['name'] }}">{{ $card['name'] }}</option>
                                @endforeach
                            </select>
                        </div>

                        <div>
                            <label for="games_no" style="font-weight: 600;">Game No:</label><br>
                            <input type="text" id="games_no" name="games_no"
                                value="{{ $nextGameNo ?? '' }}"
                                style="width: 160px; padding: 6px 12px; font-size: 14px; font-weight: bold; border-radius: 6px; border: 1px solid #ced4da;">
                        </div>

                        <!-- Submit Button -->
                        <div>
                            <button type="submit"
                                style="background: linear-gradient(to right, #111, #333); color: #ffd700; font-weight: bold; border: none; border-radius: 8px; padding: 10px 24px; font-size: 14px; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.4);"
                                onmouseover="this.style.background='linear-gradient(to right, #222, #444)'"
                                onmouseout="this.style.background='linear-gradient(to right, #111, #333)'">
                                ✅ Submit
                            </button>
                        </div>
                    </div>

                </form>
            </div>
        </div>
    </div>
</div>

<script>
    function selectCard(value) {
        document.getElementById('game_type').value = value;

        const allCards = document.querySelectorAll('[id^="card-"]');
        allCards.forEach(card => {
            card.style.boxShadow = "0 5px 15px rgba(0,0,0,0.25)";
            card.style.transform = "scale(1)";
            card.style.border = "none";
        });

        const selectedCardId = 'card-' + value.toLowerCase().replace(/\s+/g, '-');
        const selectedCard = document.getElementById(selectedCardId);

        if (selectedCard) {
            selectedCard.style.boxShadow = "0 0 20px 4px gold";
            selectedCard.style.transform = "scale(1.08)";
            selectedCard.style.border = "2px solid gold";
        }
    }
</script>
@endsection
