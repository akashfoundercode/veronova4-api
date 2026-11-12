<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Order;
use Illuminate\Support\Facades\Storage;

class OrderController extends Controller
{
    public function order_create()
    {
         $orders = Order::all();
        return view('order.orderlist', compact('orders'));
    }
    public function order_store(Request $request)
    {
        
         $request->validate([
             'quentity'   => 'required',
             'description'        => 'required',
                  
         ]);
 
       
          $data=[
             'quentity'=>$request->quentity,
             'description'=>$request->description,
             'status'=>1
             ];
 
             Order::create($data);
             return redirect()->route('order.list');
        
    }
    public function order_update(Request $request, $id)
    {
        $orders = Order::findOrFail($id);
       
            $data=[
              'quentity'=>$request->quentity,
             'description'=>$request->description,
            
             ];
 
             $orders->update($data);  
         
     
           return redirect()->route('order.list');
        
      }
    public function order_active($id)
      {
        Order::where("id",$id)->update(['status'=>0]);
          
          return redirect()->route('order.list');
      }
      public function order_inactive($id)
    {
        Order::where("id",$id)->update(['status'=>1]);
         
          return redirect()->route('order.list');
    }
    public function order_delete($id)
    {
        $orders=Order::find($id);
        if(!is_null($orders));
        {
        $orders->delete();
        }
        return redirect()->route('order.list');
    }
}
