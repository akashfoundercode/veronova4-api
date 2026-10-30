@extends('admin.body.adminmaster')

@section('admin')
<div class="container-fluid">
    <div class="row justify-content-center">
        <div class="col-md-10">
            <div class="white_shd full margin_bottom_30" style="padding: 30px; background: #fff; border-radius: 12px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);">
                <h4 style="font-weight: 700; margin-bottom: 25px;">🎮 Period No - {{ $nextGameNo ?? 'N/A' }}</h4>

                <form action="{{ route('DiceadminWinner.dice_win') }}" method="post">
                    @csrf
                    @php
                        $cards = [
                            ['type' => 'One', 'img' => 'https://admin.gameon.deals/public/Dice/dice1.png'],
                            ['type' => 'Two', 'img' => 'https://admin.gameon.deals/public/Dice/dice2.png'],
                            ['type' => 'Three', 'img' => 'https://admin.gameon.deals/public/Dice/dice3.png'],
                            ['type' => 'Four', 'img' => 'https://admin.gameon.deals/public/Dice/dice4.png'],
                            ['type' => 'Five', 'img' => 'https://admin.gameon.deals/public/Dice/dice5.png'],
                            ['type' => 'Six', 'img' => 'https://admin.gameon.deals/public/Dice/dice6.png'],
                        ];
                    @endphp

                    <!-- Card Grid -->
                    <div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;">
                        @foreach($cards as $card)
                            <div onclick="selectCard('{{ $card['type'] }}')"
                                 id="card-{{ strtolower(str_replace(' ', '-', $card['type'])) }}"
                                 style="flex: 1 1 calc(30% - 20px); max-width: 240px; height: 180px; cursor: pointer; border-radius: 20px; overflow: hidden;
                                        transition: transform 0.3s, box-shadow 0.3s; border: 2px solid transparent; display: flex; align-items: center;
                                        justify-content: center; background: #fff; padding: 10px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
                                <img src="{{ $card['img'] }}"
                                     alt="{{ $card['type'] }}"
                                     style="max-width: 100%; max-height: 100%; object-fit: contain; background-color: #fff;">
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
                                    <option value="{{ $card['type'] }}">{{ $card['type'] }}</option>
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

<!-- JS: Handle Card Selection -->
<script>
    function selectCard(value) {
        document.getElementById('game_type').value = value;

        const allCards = document.querySelectorAll('[id^="card-"]');
        allCards.forEach(card => {
            card.style.boxShadow = "none";
            card.style.transform = "scale(1)";
            card.style.border = "2px solid transparent";
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
<!-- JS: Auto Refresh Every 3 Seconds -->
<!--<script>
    setInterval(function() {
        location.reload();
    }, 3000);
</script>-->

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

<script>
    setInterval(function() {
        $.ajax({
            url: "{{ route('dice.nextGameNo') }}",
            type: 'GET',
            success: function(response) {
                if (response.nextGameNo) {
                    $('#games_no').val(response.nextGameNo);
                    $('h4').html('🎮 Period No - ' + response.nextGameNo);
                }
            },
            error: function() {
                console.error('Failed to fetch next game no.');
            }
        });
    }, 3000);
</script>


@endsection
