@extends('admin.body.adminmaster')

@section('admin')
<div class="container-fluid">
    <div class="row justify-content-center">
        <div class="col-md-10">
            <div style="padding: 30px; background: #fff; border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.12);">
                <h4 style="font-weight: 700; margin-bottom: 25px;">🎮 Period No - {{ $nextGameNo ?? 'N/A' }}</h4>

                <form action="{{ route('jm.jm1') }}" method="post">
                    @csrf
                    @php
                        $cards = [
                            ['type' => 'Heart', 'img' => 'https://root.gameon.deals/public/rb/heart.png'],
                            ['type' => 'Spades', 'img' => 'https://root.gameon.deals/public/rb/dic_spade.png'],
                            ['type' => 'Diamond', 'img' => 'https://root.gameon.deals/public/rb/dic_diamond.png'],
                            ['type' => 'Club', 'img' => 'https://root.gameon.deals/public/rb/dic_club.png'],
                            ['type' => 'Face', 'img' => 'https://root.gameon.deals/public/rb/face.png'],
                            ['type' => 'Flag', 'img' => 'https://root.gameon.deals/public/rb/flag.png'],
                        ];
                    @endphp

                    <!-- Cards -->
                    <div style="display: flex; flex-wrap: wrap; gap: 20px; justify-content: center;">
                        @foreach($cards as $card)
                            <div onclick="selectCard('{{ $card['type'] }}')" id="card-{{ strtolower(str_replace(' ', '-', $card['type'])) }}"
                                 style="flex: 1 1 calc(30% - 20px); max-width: 200px; height: 150px; cursor: pointer; border-radius: 16px; overflow: hidden; transition: 0.3s; border: 2px solid transparent; display: flex; align-items: center; justify-content: center; background: #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.08);"
                                 onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.15)'"
                                 onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'">
                                <img src="{{ $card['img'] }}" alt="{{ $card['type'] }}" style="width: 80%; height: 80%; object-fit: contain; border-radius: 12px;">
                            </div>
                        @endforeach
                    </div>

                    <!-- Inputs -->
                    <div style="display: flex; justify-content: center; align-items: end; flex-wrap: wrap; gap: 30px; margin-top: 40px;">
                        <div>
                            <label style="font-weight: 600;">Select Type:</label><br>
                            <select id="game_type" name="game_type" style="width: 160px; padding: 6px 12px; font-size: 14px; border-radius: 6px; border: 1px solid #ccc;">
                                <option value="">-- Select --</option>
                                @foreach($cards as $card)
                                    <option value="{{ $card['type'] }}">{{ $card['type'] }}</option>
                                @endforeach
                            </select>
                        </div>
                        <div>
                            <label style="font-weight: 600;">Game No:</label><br>
                            <input type="text" name="games_no" value="{{ $nextGameNo ?? '' }}" style="width: 160px; padding: 6px 12px; font-weight: bold; font-size: 14px; border-radius: 6px; border: 1px solid #ccc;">
                        </div>
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

<!-- JS -->
<script>
    function selectCard(value) {
        document.getElementById('game_type').value = value;
        document.querySelectorAll('[id^="card-"]').forEach(c => {
            c.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
            c.style.transform = "scale(1)";
            c.style.border = "2px solid transparent";
        });
        const selected = document.getElementById('card-' + value.toLowerCase().replace(/\s+/g, '-'));
        if (selected) {
            selected.style.boxShadow = "0 0 25px 6px rgba(255,215,0,0.7)";
            selected.style.transform = "scale(1.08)";
            selected.style.border = "2px solid gold";
        }
    }
</script>
@endsection
