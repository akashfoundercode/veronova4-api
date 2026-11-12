<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use DB;

class SettingController extends Controller
{
    public function setting_index()
    {
         $settings = DB::select("SELECT * FROM `settings` WHERE 1");
        return view('work_order_assign.setting', compact('settings'));
    }
    
     public function view($id)
    {
        //  $views = DB::select("SELECT * FROM `setting` WHERE `id`='$id'");
         $views = DB::table('settings')->where('id',$id)->first();
         
        return view('work_order_assign.view')->with('views',$views);
    }
    public function setting_update(Request $request,$id)
    {
        $discription=$request->description;
    
         $views = DB::table('settings')->where('id',$id)->update(['description' => $discription]);
        
  
        //  DB::update("UPDATE `setting` SET `disc`='$discription' WHERE id=$id");
         
             return redirect()->route('setting');
    }
	
	    public function support_setting()
    {
         $settings = DB::select("SELECT * FROM `customer_services`  ");
        return view('work_order_assign.support_setting', compact('settings'));
    }
	  public function supportsetting_update(Request $request,$id)
    {
        $socialmedia=$request->socialmedia;
    
         $views = DB::table('customer_services')->where('id',$id)->update(['link' => $socialmedia]);
        
  
        //  DB::update("UPDATE `setting` SET `disc`='$discription' WHERE id=$id");
         
             return redirect()->route('support_setting');
    }
	    public function notification()
    {
			    
			
         $settings = DB::select("SELECT * FROM `notifications` WHERE `status`=1
");
        return view('work_order_assign.notification', compact('settings'));
    }
	
	  public function view_notification($id)
    {
        //  $views = DB::select("SELECT * FROM `setting` WHERE `id`='$id'");
         $views = DB::table('notifications')->where('id',$id)->first();
         
        return view('work_order_assign.view_notification')->with('views',$views);
    }
	
	    public function notification_update(Request $request,$id)
    {
        $discription=$request->disc;
    
         $views = DB::table('notifications')->where('id',$id)->update(['disc' => $discription]);
        
  
  
         
             return redirect()->route('notification');
    }
	
	
	    public function notification_store(Request $request)
    {
		$name=$request->name;	
        $discription=$request->disc;
     
         $query =  DB::table('notifications')->insert([
            'name' => $name,
            'disc' => $discription,
			 'status'=>1
        ]);
             return redirect()->route('notification');
    }
	
	    public function add_notification()
    {
			    
			
         $settings = DB::select("SELECT * FROM `notifications` WHERE `status`=1
");
        return view('work_order_assign.add_notification');
    }
   
}
