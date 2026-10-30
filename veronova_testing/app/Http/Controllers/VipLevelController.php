<?php
// app/Http/Controllers/VipLevelController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VipLevelController extends Controller
{
    public function index()
    {
        // SELECT * FROM vip_levels
        $vipLevels = DB::table('vip_levels')->get();
        return view('vip_levels.index', compact('vipLevels'));
    }

    public function edit($id)
    {
        // SELECT * FROM vip_levels WHERE id = ?
        $vipLevel = DB::table('vip_levels')->where('id', $id)->first();
        return view('vip_levels.edit', compact('vipLevel'));
    }

    public function update(Request $request, $id)
    {
        DB::table('vip_levels')->where('id', $id)->update([
            'name' => $request->input('name'),
            'betting_range' => $request->input('betting_range'),
            'level_up_rewards' => $request->input('level_up_rewards'),
            'monthly_rewards' => $request->input('monthly_rewards'),
        ]);

        return redirect()->route('vip-levels.index')->with('success', 'VIP Level updated!');
    }
}
