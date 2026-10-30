<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Banner;
use Illuminate\Support\Facades\Storage;
use  Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BannerController extends Controller
{
    public function index()
    {
         //$banner = Banner::where('status','=','1')->get();
			 
			 
		//	 ->toRawSql();
		//return $banner;
		
		 $banner = DB::select("SELECT * FROM `sliders` WHERE `status` = 1  ORDER BY id DESC");

        return view('banner.index', compact('banner'));
    }
    
// Store banner
    public function banner_store(Request $request)
    {
        try {
            // Debug code - check if files are coming
            Log::info('=== BANNER STORE DEBUG ===');
            Log::info('All request data:', $request->all());
            Log::info('Has file? image: ' . ($request->hasFile('image') ? 'Yes' : 'No'));
            Log::info('Has file? activity_image: ' . ($request->hasFile('activity_image') ? 'Yes' : 'No'));
            
            if ($request->hasFile('image')) {
                Log::info('Image file name: ' . $request->file('image')->getClientOriginalName());
                Log::info('Image file size: ' . $request->file('image')->getSize());
            }
            
            // Validate
            $request->validate([
                'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
                'title' => 'required|string|max:255',
                'activity_image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:2048'
            ]);

            // Get the uploaded files
            $imageFile = $request->file('image');
            $activityImageFile = $request->file('activity_image');
            $title = $request->title;

            // Define the destination path
            $destinationPath = 'uploads/sliders';
            
            // Create directory if not exists
            if (!file_exists(public_path($destinationPath))) {
                mkdir(public_path($destinationPath), 0777, true);
            }

            // Create unique filenames
            $timestamp = time();
            $random = uniqid();
            $imageFileName = $timestamp . '_' . $random . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $imageFile->getClientOriginalName());
            $activityImageFileName = $timestamp . '_activity_' . $random . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $activityImageFile->getClientOriginalName());

            // Move files
            $imageFile->move(public_path($destinationPath), $imageFileName);
            $activityImageFile->move(public_path($destinationPath), $activityImageFileName);

            // Store relative paths (not full URLs)
            $imagePath = $destinationPath . '/' . $imageFileName;
            $activityImagePath = $destinationPath . '/' . $activityImageFileName;

            // Prepare data for database
            $data = [
                'image' => $imagePath,
                'title' => $title,
                'activity_image' => $activityImagePath,
                'activity_image_url' => null,  // NULL value
                'status' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            Log::info('Data to insert:', $data);

            // Insert directly using DB facade (temporary solution)
            $inserted = \DB::table('sliders')->insert($data);
            
            if ($inserted) {
                Log::info('Banner inserted successfully');
                return redirect()->route('banner')->with('success', 'Banner added successfully');
            } else {
                throw new \Exception('Failed to insert data');
            }
            
        } catch (\Exception $e) {
            Log::error('Banner store error: ' . $e->getMessage());
            Log::error('Stack trace: ' . $e->getTraceAsString());
            return redirect()->back()->with('error', 'Error: ' . $e->getMessage())->withInput();
        }
    }


 public function banner_update(Request $request, $id)
{
    // Validate the incoming request data
    $request->validate([
        // 'title' => 'required|string|max:255',
        // 'image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        // 'activity_image' => 'nullable|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
    ]);

    // Find the banner by ID or fail if not found
    $banner = Banner::findOrFail($id);

    // Initialize the data array with the title
    $data = [
        'title' => $request->title,
    ];
	 
	 //add//
	  if ($request->file('activity_image_url')) {
        $file = $request->file('activity_image_url');
        
        // Define the destination path within the public directory
        $destinationPath = 'uploads/sliders';

        // Create a unique filename for the image
        $fileName = time() . '_' . $file->getClientOriginalName();

        // Move the file to the desired location in the public directory
        $file->move(public_path($destinationPath), $fileName);

        // Generate the URL for the stored image
        $imageURL = url($destinationPath . '/' . $fileName);

        // Add the image URL to the data array
        $data['activity_image_url'] = $imageURL;
    }

	 //end_add///

    // Check if the image is present in the request
    if ($request->file('image')) {
        $file = $request->file('image');
        
        // Define the destination path within the public directory
        $destinationPath = 'uploads/sliders';

        // Create a unique filename for the image
        $fileName = time() . '_' . $file->getClientOriginalName();

        // Move the file to the desired location in the public directory
        $file->move(public_path($destinationPath), $fileName);

        // Generate the URL for the stored image
        $imageURL = url($destinationPath . '/' . $fileName);

        // Add the image URL to the data array
        $data['image'] = $imageURL;
    }

    // Check if the activity_image is present in the request
    if ($request->file('activity_image')) {
        $file = $request->file('activity_image');
        
        // Define the destination path within the public directory
        $destinationPath = 'uploads/activity_images';

        // Create a unique filename for the activity_image
        $fileName = time() . '_' . $file->getClientOriginalName();

        // Move the file to the desired location in the public directory
        $file->move(public_path($destinationPath), $fileName);

        // Generate the URL for the stored activity_image
        $activityImageURL = url($destinationPath . '/' . $fileName);

        // Add the activity_image URL to the data array
        $data['activity_image'] = $activityImageURL;
    }

    // Update the banner with the new data
    $banner->update($data);

    // Redirect to the banner route
    return redirect()->route('banner');
}


     
     
      public function banner_delete($id)
    {
    
      $banner = Banner::find($id);
      $banner->delete();
      return redirect()->route('banner')
        ->with('success', 'Banner deleted successfully');
    }

 
}
