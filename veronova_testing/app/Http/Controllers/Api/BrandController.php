<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller; // Add this line
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class BrandController extends Controller
{
    
    public function getSubCategoryByCatId(Request $request)
    {
        $cat_id = $request->cat_id;
    
        if (!$cat_id) {
            return response()->json([
                'status' => false,
                'message' => 'cat_id is required'
            ], 400);
        }
    
        // Fetch subcategories
        $data = DB::table('subcat_list')
            ->where('cat_id', $cat_id)
            ->orderBy('sub_cat_id', 'ASC')
            ->get();
    
        if ($data->isEmpty()) {
            return response()->json([
                'status' => false,
                'message' => "No data found for cat_id: {$cat_id}"
            ], 404);
        }
    
        return response()->json([
            'status' => true,
            'cat_id' => $cat_id,
            'total'  => $data->count(),
            'data'   => $data
        ], 200);
    }
    
    
    public function getFullSubCategoryList()
    {
        $data = DB::table('subcat_list')
            ->orderBy('cat_id', 'ASC')
            ->orderBy('sub_cat_id', 'ASC')
            ->get();
    
        return response()->json([
            'status' => true,
            'total'  => $data->count(),
            'data'   => $data
        ], 200);
    }

    public function get_Brands()
    {
        $path = storage_path('app/public/brands.json');

        if (file_exists($path)) {
            $jsonData = file_get_contents($path);
            $data = json_decode($jsonData, true);

            return response()->json($data, 200);
        } else {
            return response()->json([
                'status' => false,
                'message' => 'brands.json file not found'
            ], 404);
        }
    }
    
    public function getBrandDetails($brand_id)
    {
        // Absolute path lo (Laravel base_path() se)
        $filePath = base_path("storage/app/public/brand_{$brand_id}.json");
    
        if (file_exists($filePath)) {
            $json = file_get_contents($filePath);
            $data = json_decode($json, true);
    
            return response()->json([
                'status' => true,
                'brand_id' => $brand_id,
                'data' => $data
            ]);
        } else {
            return response()->json([
                'status' => false,
                'message' => "Brand data not found for ID {$brand_id}"
            ], 404);
        }
    }

    
    
    
}
