@extends('admin.body.adminmaster')

@section('admin')
<style>
    input:focus, select:focus, button:focus, textarea:focus {
        box-shadow: none !important;
        outline: none !important;
        border-color: black !important;
    }

    .sub-card {
        background-color: #2c2c2c;
        border-radius: 10px;
        padding: 15px;
        margin-bottom: 10px;
        color: white;
    }

    .sub-card small {
        color: #bbb;
    }

    .scrollable-subordinates {
        max-height: 350px;
        overflow-y: auto;
    }

    .copy-icon {
        cursor: pointer;
    }
</style>
<style>
.inline-divider {
    flex: 1;
    height: 2px;
    background-color: white;

}
</style>


<div class="container mt-2">
    <div class="card bg-dark text-white p-3 rounded-4 shadow">
        <h5 class="text-center mb-3">Subordinate Data</h5>

        {{-- FORM --}}
        <form action="{{ route('filterSubordinateData', ['id' => $userId]) }}" method="Post">
            @csrf

         
      <div class="d-flex gap-2 mb-3">
    <select name="mlm_level_id" class="form-select bg-dark text-white border border-black">
        <option value="">All</option>
        @foreach($tier as $item)
            <option value="{{ $item->id }}" {{ request('mlm_level_id') == $item->id ? 'selected' : '' }}>
                {{ $item->name }}
            </option>
        @endforeach
    </select>

    <input type="date" name="date" value="{{ request('date', date('Y-m-d')) }}" class="form-control bg-dark text-white border border-black">

    {{-- Filter Button --}}
    <button class="btn btn-warning" type="submit">
        <i class="fas fa-filter me-1"></i> Filter
    </button>

    {{-- Refresh Button --}}
    <a href="{{ route('filterSubordinateData', ['id' => $userId]) }}" class="btn btn-light border">
        <i class="fas fa-sync-alt me-1"></i> Refresh
    </a>
</div>


            {{-- Summary --}}
            <div class="bg-black rounded-4 p-3 text-white">
                <div class="row text-center g-3">
                    <div class="col-6">
                        <p class="mb-0 fw-bold">{{ $result['number_of_deposit'] ?? 0 }}</p>
                        <small>Deposit number</small>
                    </div>
                    <div class="col-6">
                        <p class="mb-0 fw-bold">{{ $result['payin_amount'] ?? 0 }}</p>
                        <small>Deposit amount</small>
                    </div>
                    <div class="col-6">
                        <p class="mb-0 fw-bold">{{ $result['number_of_bettor'] ?? 0 }}</p>
                        <small>Number of bettors</small>
                    </div>
                    <div class="col-6">
                        <p class="mb-0 fw-bold">{{ $result['bet_amount'] ?? 0 }}</p>
                        <small>Total bet</small>
                    </div>
                    <div class="col-6">
                        <p class="mb-0 fw-bold">{{ $result['first_deposit'] ?? 0 }}</p>
                        <small>1st Time Depositors</small>
                    </div>
                    <div class="col-6">
                        <p class="mb-0 fw-bold">{{ $result['first_deposit_amount'] ?? 0 }}</p>
                        <small>First deposit amount</small>
                    </div>
                </div>

                {{-- Scrollable Subordinates --}}
             @if (!empty($result['subordinates_data']))
    <div class="scrollable-subordinates mt-4" style="max-height: 350px; overflow-y: auto;">
        @foreach ($result['subordinates_data'] as $sub)
            <div class="sub-card">
                <div class="d-flex justify-content-between mb-2">
                    <div><strong>UID</strong></div>
                    <div>{{ $sub['u_id'] }}</div>
                </div>
                
                 <div class="inline-divider mt-3 mb-2"></div>
                 
                <div class="d-flex justify-content-between mb-2">
                    <div><strong>Level</strong></div>
                    <div>{{ $sub['level'] ?? '-' }}</div>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <div><strong>Bet</strong></div>
                    <div>{{ $sub['bet_amount'] ?? 0 }}</div>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <div><strong>Deposit</strong></div>
                    <div>{{ $sub['payin_amount'] ?? 0 }}</div>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <div><strong>Commission</strong></div>
                    <div>{{ $sub['commission'] ?? 0 }}</div>
                </div>
            </div>
        @endforeach
    </div>
@else
    <div class="text-center text-muted mt-3">No subordinate data available.</div>
@endif

            </div>
        </form>
    </div>
</div>
@endsection
