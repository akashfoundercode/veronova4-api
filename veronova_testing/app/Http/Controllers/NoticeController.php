<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use DB;

class NoticeController extends Controller
{
    public function offer()
    {
        $notices = DB::table('Notice')->get(); 
        return view('notice.index', compact('notices'));
    }

    // Edit Function
    public function edit($id)
    {
        $notice = DB::table('Notice')->where('id', $id)->first();
        
        if (!$notice) {
            return redirect()->back()->with('error', 'Notice not found!');
        }

        return view('notice.offer', compact('notice'));
    }

    // Update Function
    public function update(Request $request, $id)
    {
        // Validate the input
        $request->validate([
            'title' => 'required|string|max:555',
            'content' => 'required|string',
            'image' => 'nullable', // Optional image upload
        ]);

        // Retrieve the notice record
        $notice = DB::table('Notice')->where('id', $id)->first();

        if (!$notice) {
            return redirect()->back()->with('error', 'Notice not found!');
        }

        // Prepare the data to update
        $data = [
            'title' => $request->title,
            'content' => $request->content,
        ];

        // Handle image upload (if a new image is provided)
        if ($request->hasFile('image')) {
            // If there was an old image, delete it (if you want to replace the image)
            if ($notice->image) {
                $oldImagePath = public_path('notice/' . basename($notice->image));
                if (file_exists($oldImagePath)) {
                    unlink($oldImagePath); // Remove the old image file
                }
            }

            // Save the new image to the public/notice folder
            $imageName = time() . '.' . $request->image->extension();
            $imagePath = $request->image->move(public_path('notice'), $imageName);

            // Construct the image URL
            $imageUrl = asset('notice/' . $imageName);
            $data['image'] = $imageUrl;
        }

        // Update the notice in the database
        DB::table('Notice')->where('id', $id)->update($data);

        // Redirect back with success message
        return redirect()->route('offer')->with('success', 'Notice updated successfully!');
    }
}
