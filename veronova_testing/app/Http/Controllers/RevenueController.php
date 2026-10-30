<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Revenue;

class RevenueController extends Controller
{
    public function revenue_create()
    {
         $revenues = Revenue::all();
        return view('revenue.index', compact('revenues'));
    }

    public function revenue_store(Request $request)
    {
        
         $request->validate([
             'rating'   => 'required',
             'discription'        => 'required',
             ]);
 
          $data=[
             'rating'=>$request->rating,
             'discription'=>$request->discription,
             'status'=>1
             ];
 
             Revenue::Create($data);
             return redirect()->route('revenue');
        
    }
    public function revenue_update(Request $request, $id)
    {
        $revenues = Revenue::findOrFail($id);
       
            $data=[
                'rating'=>$request->rating,
                'discription'=>$request->discription,
            
             ];
 
             $revenues->update($data);  
         
     
           return redirect()->route('revenue');
        
      }
    public function revenue_delete($id)
    {
        $revenues=Revenue::find($id);
        if(!is_null($revenues));
        {
        $revenues->delete();
        }
        return redirect()->route('revenue');
    }

}
