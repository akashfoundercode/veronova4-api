<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Created_order;
use Illuminate\Support\Facades\Storage;

class CreateorderController extends Controller
{
    public function createorder_index()
    {
         $createorders = Created_order::all();
        return view('order.create_orderlist', compact('createorders'));
    }

    public function createorder_store(Request $request)
    {
        
         $request->validate([
             'quentity'   => 'required',
             'location'        => 'required',
             ]);
 
          $data=[
             'quentity'=>$request->quentity,
             'location'=>$request->location,
             'status'=>1
             ];
 
             Created_order::Create($data);
             return redirect()->route('create_orderlist');
        
    }
    public function createorder_update(Request $request, $id)
    {
        $createorders = Created_order::findOrFail($id);
       
            $data=[
              'quentity'=>$request->quentity,
             'location'=>$request->location,
            
             ];
 
             $createorders->update($data);  
         
     
           return redirect()->route('create_orderlist');
        
      }
      public function createorder_delete($id)
    {
        $createorders=Created_order::find($id);
        if(!is_null($createorders));
        {
        $createorders->delete();
        }
        return redirect()->route('create_orderlist');
    }
    public function create_order_active($id)
      {
        Created_order::where("id",$id)->update(['status'=>0]);
          
          return redirect()->route('create_orderlist');
      }
      public function create_order_inactive($id)
    {
        Created_order::where("id",$id)->update(['status'=>1]);
         
          return redirect()->route('create_orderlist');
    }
}
