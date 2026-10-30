<?php

namespace App\Http\Controllers;

use App\Models\Lucky12;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\View\View;


class Lucky12Controller extends Controller
{
    
    public function bets(){
        $records = DB::table('lucky12_bets')->paginate(10);
        return view('lucky12.bets', compact('records'));
    }

    public function results(){
        $records = DB::table('lucky12_results')->paginate(10);
        return view('lucky12.results', compact('records'));
    }
   
    public function lucky12_update(Request $request)
{
    // Fetch the game number (period_no) from the ab_bet_logs table
    $gamesno = DB::select("SELECT period_no FROM lucky12_betlogs ORDER BY period_no ASC LIMIT 1");
    $game_no = $gamesno[0]->period_no;

   
        // Get the jackpot value from the request
        $jackpot = $request->jackpot;

        // Update the jackpot in the ab_admin_winner_result table for the corresponding period_no
        DB::update("UPDATE lucky12admin_winner_result SET jackpot = ? WHERE period_no = ?", [$jackpot, $game_no]);
        
        // Redirect back to the previous page
        return redirect()->back();
   
}
    
    // public function lucky12AdminResult(): View
    // {
    //     $game_settings = DB::table('lucky12_game_settings')->where('id', 1)->first();
    //     return view('lucky12.index')->with('game_settings', $game_settings);
    // }
    
    // public function game_setting(Request $req){
    //     $site_message = $req->site_message;
    //     $percentage = $req->percentage;
    //     $result = $req->result;
    //     $status = $req->status;
    //     $a =   DB::table('game_settings')->where('id',1)->update([
    //       'site_message'=>$site_message,
    //       'winning_per'=>$percentage,
    //       'result_type'=>$result,
    //       'status'=>$status,
    //       ]);
           
    //       if($a){
    //       return redirect()->back()->with('success','Updated successfully..');   
    //       }else{
    //          return redirect()->back()->with('error','Failed to  update..');   
    //       }
    // }
    
    public function index()
    {
        $game_settings = DB::table('game_settings')->where('id', 1)->first();
        return view('lucky12.index')->with('game_settings', $game_settings);
    }
    
    
     public function admin_prediction(Request $request){
           date_default_timezone_set('Asia/Kolkata');
           $datetime = date('Y-m-d H:i:s');
           $currentTime = time();
           $adjustment = $currentTime % 300;
           
                if($adjustment==0){
                     $periodStart = $currentTime;
                     $max_result_time = date('Y-m-d H:i:00', $periodStart);
                }else{
                      $periodStart = $currentTime - $adjustment;
                      $max_result_time = date('Y-m-d H:i:00', $periodStart + 300);
                }
                
            if($request->custom_result_date_time){
                          $result_time =$request->custom_result_date_time;
                          $uinx_result_time = strtotime($result_time);
                          $adjustment = $uinx_result_time % 300;
                          
                     if($adjustment==0){
                         $min_result_time = date('Y-m-d H:i:s', $uinx_result_time);
                         $max_result_time = $min_result_time;
                     }else{
                         $min_result_time = date('Y-m-d H:i:s', $uinx_result_time - $adjustment);
                         $max_result_time = date('Y-m-d H:i:s', $uinx_result_time + (300 - $adjustment));
                     }
                     }

          $number = $request->number;
          $prediction_insert = DB::table('admin_results')->insert(['card_number'=>$number,'result_time'=>$max_result_time]);
          
          if($prediction_insert){
              return redirect()->back()->with('success','Result Inserted Successfully');
          }else{
              return redirect()->back()->with('error','Result Inserted Successfully');
          }
          
    }
    

}

