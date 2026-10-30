<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class IfscApiController extends Controller
{
    public function index()
    {
        return view('ifsc'); // Return the Blade view
    }

    public function getIfscDetails(Request $request)
{
    $ifsc = $request->query('ifsc'); // Get IFSC code from the query parameters

    // Call Razorpay API to get IFSC details
    $json = @file_get_contents('https://ifsc.razorpay.com/' . $ifsc);
    $arr = json_decode($json);

    if (isset($arr->BRANCH)) {
        // If the API returns valid data, return it as JSON with success status
        return response()->json([
            'status' => 'success',
            'message' => 'IFSC details found.',
            'data' => [
                'branch' => $arr->BRANCH,
                'address' => $arr->ADDRESS,
                'city' => $arr->CITY,
                'state' => $arr->STATE,
                'bank' => $arr->BANK,
            ]
        ], 200); // HTTP Status 200 for success
    } else {
        // If no valid data, return an error response
        return response()->json([
            'status' => 'error',
            'message' => 'Invalid IFSC Code',
            'data' => []
        ], 400); // HTTP Status 400 for bad request
    }
}

}
