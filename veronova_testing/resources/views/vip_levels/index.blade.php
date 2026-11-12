@extends('admin.body.adminmaster')

@section('admin')
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">

<style>
    body {
        font-family: 'Poppins', sans-serif;
        background-color: #f4f6f9;
        margin: 0;
        padding: 20px;
    }

    .vip-container {
        background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
        padding: 25px 30px;
        border-radius: 12px;
        color: #fff;
        margin-bottom: 30px;
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .vip-container h2 {
        font-size: 32px;
        font-weight: 600;
        margin: 0;
        letter-spacing: 1px;
    }

    .vip-table {
        width: 100%;
        border-collapse: collapse;
        background-color: #fff;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
        animation: fadeIn 0.5s ease-in-out;
    }

    .vip-table th {
        background: linear-gradient(to right, #43cea2, #185a9d);
        color: #fff;
        padding: 16px 20px;
        text-align: left;
        font-weight: 600;
        font-size: 15px;
    }

    .vip-table td {
        padding: 14px 20px;
        border-bottom: 1px solid #eee;
        color: #333;
        font-size: 14px;
    }

    .vip-table tr:hover {
        background-color: #f9f9f9;
        transition: background 0.3s ease;
    }

    .btn-edit {
        background-color: #00b09b;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        text-decoration: none;
        font-size: 13px;
        font-weight: 500;
        transition: background 0.3s;
    }

    .btn-edit:hover {
        background-color: #019786;
    }

    .alert-success {
        background-color: #e6fffa;
        color: #0f5132;
        padding: 14px 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        border-left: 6px solid #00b09b;
        font-weight: 500;
        animation: fadeIn 0.4s ease-in-out;
    }

    @keyframes fadeIn {
        0% {
            opacity: 0;
            transform: translateY(-10px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>

<div class="vip-container">
    <h2>🎖️ VIP Levels Dashboard</h2>
</div>

@if(session('success'))
    <div class="alert-success">
        {{ session('success') }}
    </div>
@endif

<table class="vip-table">
    <thead>
        <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Betting Range</th>
            <th>Level Up Rewards</th>
            <th>Monthly Rewards</th>
            <th>Action</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($vipLevels as $level)
            <tr>
                <td>{{ $level->id }}</td>
                <td>{{ $level->name }}</td>
                <td>{{ $level->betting_range }}</td>
                <td>{{ $level->level_up_rewards }}</td>
                <td>{{ $level->monthly_rewards }}</td>
                <td>
                    <a href="{{ route('vip-levels.edit', $level->id) }}" class="btn-edit">✏️ Edit</a>
                </td>
            </tr>
        @endforeach
    </tbody>
</table>

@endsection
