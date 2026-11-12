<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Mlmlevel;
use Illuminate\Support\Facades\Storage;
use DB;

class MlmlevelController extends Controller
{
    public function mlmlevel_create()
    {
         $mlmlevels = DB::select("SELECT * FROM `mlm_levels` WHERE 1");
        return view('mlm_level.index', compact('mlmlevels'));
    }
    
       public function mlmlevel_store(Request $request)
    {
      $name=$request->name;
      $count=$request->count;
      $commission=$request->commission;
      // $rand=rand(000000000000000,999999999999999);
         $data = DB::insert("INSERT INTO `mlm_levels`(`name`, `count`,`commission`) VALUES ('$name','$count','$commission')");
        
             return redirect()->route('mlmlevel')->with('data',$data); 
      }
      public function mlmlevel_update(Request $request, $id)
      {
        $name=$request->name;
        $count=$request->count;
        $commission=$request->commission;
        $data= DB::update("UPDATE `mlm_levels` SET `name`='$name',`count`='$count',`commission`='$commission' WHERE id=$id");
         
             return redirect()->route('mlmlevel');
          
      }
      
    public function mlmlevel_delete($id)
    {
        // $id=$request->id;
        $data=DB::delete("DELETE FROM `mlm_levels` WHERE id=$id");
       
        return redirect()->route('mlmlevel')->with('data',$data);
    }

}
