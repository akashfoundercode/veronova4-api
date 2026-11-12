<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Carbon\Carbon;

class IpAddressController extends Controller
{
//   public function index()
// {
//     // Fetch all IP logs ordered by login time (oldest first to maintain grouping order)
//     $rawIps = DB::table('ip_address')
//         ->select('id', 'user_id', 'ip_address', 'login_time', 'created_at', 'updated_at')
//         ->orderBy('created_at', 'asc')
//         ->get();

//     // Group same IPs together in sequence of first appearance
//     $grouped = collect();
//     $seen = [];

//     foreach ($rawIps as $ip) {
//         if (!isset($seen[$ip->ip_address])) {
//             $sameIps = $rawIps->where('ip_address', $ip->ip_address);
//             $grouped = $grouped->merge($sameIps);
//             $seen[$ip->ip_address] = true;
//         }
//     }

//     $ipAddresses = $grouped->values(); // Final list

//     // Unique color mapping for each IP
//     $uniqueIps = $ipAddresses->pluck('ip_address')->unique();

//     $colors = [
//         '#007bff', '#28a745', '#ffc107', '#dc3545', '#6610f2',
//         '#fd7e14', '#6f42c1', '#17a2b8', '#20c997', '#e83e8c',
//         '#6c757d', '#1abc9c', '#9b59b6', '#34495e', '#f39c12',
//         '#d35400', '#c0392b', '#7f8c8d'
//     ];

//     $ipColorMap = [];
//     $i = 0;
//     foreach ($uniqueIps as $ip) {
//         $ipColorMap[$ip] = $colors[$i % count($colors)];
//         $i++;
//     }

//     return view('login_user_ip_detail.index', compact('ipAddresses', 'ipColorMap'));
// }



public function index()
{
    $rawIps = DB::table('ip_address')
        ->select('id', 'user_id', 'ip_address', 'login_time', 'created_at', 'updated_at')
        ->orderBy('created_at', 'desc') // Laravel sequence maintain
        ->get();

    // Group same IPs together (first appearance order)
    $grouped = collect();
    $seen = [];

    foreach ($rawIps as $ip) {
        if (!isset($seen[$ip->ip_address])) {
            $sameIps = $rawIps->where('ip_address', $ip->ip_address);
            $grouped = $grouped->merge($sameIps);
            $seen[$ip->ip_address] = true;
        }
    }

    $ipAddresses = $grouped->values();

    // Assign color to each unique IP
    $uniqueIps = $ipAddresses->pluck('ip_address')->unique();
    $colors = [
        '#007bff', '#28a745', '#ffc107', '#dc3545', '#6610f2',
        '#fd7e14', '#6f42c1', '#17a2b8', '#20c997', '#e83e8c',
        '#6c757d', '#1abc9c', '#9b59b6', '#34495e', '#f39c12',
        '#d35400', '#c0392b', '#7f8c8d'
    ];

    $ipColorMap = [];
    $i = 0;
    foreach ($uniqueIps as $ip) {
        $ipColorMap[$ip] = $colors[$i % count($colors)];
        $i++;
    }

    return view('login_user_ip_detail.index', compact('ipAddresses', 'ipColorMap'));
}




public function todayIpLogs()
{
    $today = Carbon::today();

    $rawIps = DB::table('ip_address')
        ->select('id', 'user_id', 'ip_address', 'login_time', 'created_at', 'updated_at')
        ->whereDate('created_at', $today)
        ->orderBy('created_at', 'desc')
        ->get();

    $grouped = collect();
    $seen = [];

    foreach ($rawIps as $ip) {
        if (!isset($seen[$ip->ip_address])) {
            $sameIps = $rawIps->where('ip_address', $ip->ip_address);
            $grouped = $grouped->merge($sameIps);
            $seen[$ip->ip_address] = true;
        }
    }

    $ipAddresses = $grouped->values();

    $uniqueIps = $ipAddresses->pluck('ip_address')->unique();
    $colors = [
        '#007bff', '#28a745', '#ffc107', '#dc3545', '#6610f2',
        '#fd7e14', '#6f42c1', '#17a2b8', '#20c997', '#e83e8c',
        '#6c757d', '#1abc9c', '#9b59b6', '#34495e', '#f39c12',
        '#d35400', '#c0392b', '#7f8c8d'
    ];

    $ipColorMap = [];
    $i = 0;
    foreach ($uniqueIps as $ip) {
        $ipColorMap[$ip] = $colors[$i % count($colors)];
        $i++;
    }

    return view('login_user_ip_detail.today', compact('ipAddresses', 'ipColorMap'));
}


}
