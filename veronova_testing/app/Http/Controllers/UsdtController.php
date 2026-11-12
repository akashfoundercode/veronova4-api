<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use Illuminate\Support\Facades\Storage;
use  Illuminate\Support\Facades\DB;

class UsdtController extends Controller
{
    public function usdt_view()
    {
                 $usdt = DB::select("SELECT * FROM `usdt_qr` ORDER BY id DESC");

        return view('usdt_qr.usdt_qr', compact('usdt'));
        }

public function usdt_address_view()
    {
                 $usdt = DB::select("SELECT * FROM `usdt_account_details` ORDER BY id DESC");

        return view('usdt_qr.usdt_address', compact('usdt'));
        }

   
  public function updateStatus(Request $request, $id)
{
    $request->validate([
        'status' => 'required|in:0,1,2',
    ]);

    $updated = DB::table('usdt_account_details')
        ->where('id', $id)
        ->update([
            'status' => $request->status,
            'updated_at' => now()
        ]);

    if ($updated) {
        return redirect()->back()->with('success', 'Status updated successfully');
    } else {
        return redirect()->back()->with('error', 'Status update failed or no changes made');
    }
}

   
	public function updateUSDT(Request $request) 
{
    $request->validate([
        'id' => 'required|exists:usdt_account_details,id',
        'name' => 'required|string|max:255',
        'usdt_wallet_address' => 'required|string|max:255'
    ]);

    DB::table('usdt_account_details')
        ->where('id', $request->id)
        ->update([
            'name' => $request->name,
            'usdt_wallet_address' => $request->usdt_wallet_address,
            'updated_at' => now() // optional, if timestamps are used
        ]);

    return redirect()->back()->with('success', 'USDT account updated successfully.');
}

	
	
	
	
	
	
	
	
   
        public function update_usdtqr(Request $request, $id){
		 //dd($id);
                // Validate the request to ensure an image file is provided
            
                // Handle the uploaded image
                $image = $request->file('image');
                $wallet_address = $request->wallet_address;
			    $originalName = $image->getClientOriginalName();
                $path = 'uploads/' . $originalName;
				//dd($image,$wallet_address,$originalName,$path);
                // Save the image to the public disk
                if (!file_put_contents(public_path($path), file_get_contents($image->getRealPath()))) {
                        return redirect()->back()->with('message', 'Failed to update image!');
                }

                // Update the database record
               DB::table('usdt_qr')->where('id', $id)->update([
                        'qr_code' => 'https://admin.funplay.world/' . $path,
                        'wallet_address' => $wallet_address
                    ]);

                return redirect()->back()->with('message', 'updated successfully!');
        }




 
}