<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use DB;

class FeedbackController extends Controller
{
    public function feedback_index()
    {
         $feedbacks = DB::select("SELECT feedbacks.*,users.username AS uname FROM `feedbacks` LEFT JOIN users ON feedbacks.userid=users.id;");
        return view('work_order_assign.feedback', compact('feedbacks'));
    }
    // public function feedback_store(Request $request)
    // {
        
    //      $request->validate([
    //          'data'   => 'required',
    //          'type'   => 'required',
    //          's_no'   => 'required',
    //          'latlong'   => 'required',
    //      ]);
    //         $data=[
    //          'data'=>$request->data,
    //          'type'=>$request->type,
    //          's_no'=>$request->s_no,
    //          'latlong'=>$request->latlong,
          
    //          ];
 
    //          work_report::create($data);
    //          return redirect()->route('feedback');
    //  }
    //  public function feedback_update(Request $request, $id)
    // {
    //     $reports = work_report::findOrFail($id);
       
    //         $data=[
    //           'data'=>$request->data,
    //          'type'=>$request->type,
    //          's_no'=>$request->s_no,
    //          'latlong'=>$request->latlong,
            
    //          ];
 
    //          $reports->update($data);  
         
     
    //        return redirect()->route('work_report');
        
    //   }
    // public function feedback_delete($id)
    // {
    //     $feedbacks=work_report::find($id);
    //     if(!is_null($feedbacks));
    //     {
    //     $feedbacks->delete();
    //     }
    //     return redirect()->route('feedback');
    // }
}
