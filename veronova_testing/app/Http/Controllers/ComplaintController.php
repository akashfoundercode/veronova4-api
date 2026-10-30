<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Complaint;

class ComplaintController extends Controller
{
    public function complaint_index()
    {
         $complaints = Complaint::all();
        return view('complaint.index', compact('complaints'));
    }
    public function complaint_store(Request $request)
    {
         $request->validate([
             's_no' =>'required',
             'village' =>'required',
             'block' =>'required',
             'state' =>'required',
             'district' =>'required',
             'discription' =>'required',
            ]);
        $data=[
             's_no'=>$request->s_no,
             'village'=>$request->village,
             'block'=>$request->block,
             'state'=>$request->state,
             'district'=>$request->district,
             'discription'=>$request->discription,
             ];
            Complaint::create($data);
            return redirect()->route('complaint');
        
    }
    public function complaint_update(Request $request, $id)
    {
        $complaints = Complaint::findOrFail($id);
       
            $data=[
                's_no'=>$request->s_no,
             'village'=>$request->village,
             'block'=>$request->block,
             'state'=>$request->state,
             'district'=>$request->district,
             'discription'=>$request->discription,
            
             ];
 
             $complaints->update($data);  
         
     
           return redirect()->route('complaint');
        
      }
    public function complaint_delete($id)
    {
        $complaints=Complaint::find($id);
        if(!is_null($complaints));
        {
        $complaints->delete();
        }
        return redirect()->route('complaint');
    }

}
