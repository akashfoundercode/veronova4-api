<?php

namespace App\Http\Controllers;


use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AviatorSettingsController extends Controller
{
    // Show settings page
    public function index()
    {
        $settings = DB::table('aviator_game_settings')->first();
        return view('aviator.settings', compact('settings'));
    }
    
    // Update game type
    public function updateGameType(Request $request)
    {
        try {
            $validated = $request->validate([
                'game_type' => 'required|in:simple,advance'
            ]);
            
            DB::table('aviator_game_settings')->update([
                'game_type' => $validated['game_type'],
                'updated_by' => auth()->user()->name ?? 'Admin',
                'updated_at' => now()
            ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Game type updated to ' . ucfirst($validated['game_type']) . ' Aviator!',
                'game_type' => $validated['game_type']
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update: ' . $e->getMessage()
            ], 500);
        }
    }
    
    // Get current game type
    public function getGameType()
    {
        $settings = DB::table('aviator_game_settings')->first();
        return response()->json([
            'game_type' => $settings->game_type ?? 'simple'
        ]);
    }
}