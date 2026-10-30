<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Attendance;
use DB;
class AttendanceController extends Controller
{
    public function attendance(Request $request)
    {
		$value = $request->session()->has('id');
	
        if(!empty($value))
        {
         $attendances = DB::select("SELECT * FROM `attendances` WHERE 1 ORDER BY id DESC");
        return view('attendance.index', compact('attendances'));
			  }
        else
        {
           return redirect()->route('login');  
        }
    }

    public function attendance_store(Request $request)
    {
		$value = $request->session()->has('id');
	
        if(!empty($value))
        {
      $amount=$request->accumulated_amount;
       $amount_bonus=$request->attendance_bonus;
     
         $data = DB::insert("INSERT INTO `attendances`(`accumulated_amount`,`attendance_bonus`) VALUES ('$amount','$amount_bonus')");
        
             return redirect()->route('attendance.index')->with('data',$data); 
			  }
        else
        {
           return redirect()->route('login');  
        }
      }
	
      public function attendance_update(Request $request, $id)
      {
		  $value = $request->session()->has('id');
	
        if(!empty($value))
        {
        $amount=$request->accumulated_amount;
         $amount_bonus=$request->attendance_bonus;
       
        $data= DB::update("UPDATE `attendances` SET `accumulated_amount`='$amount',`attendance_bonus`='$amount_bonus' WHERE id=$id");
         
             return redirect()->route('attendance.index');
            }
        else
        {
           return redirect()->route('login');  
        }
      }
      
    public function deposit_delete(Request $request,$id)
    {
		$value = $request->session()->has('id');
	
        if(!empty($value))
        {
        // $id=$request->id;
        $data=DB::delete("DELETE FROM `attendances` WHERE id=$id");
       
        return redirect()->route('attendance.index')->with('data',$data);
			  }
        else
        {
           return redirect()->route('login');  
        }
    }

}
