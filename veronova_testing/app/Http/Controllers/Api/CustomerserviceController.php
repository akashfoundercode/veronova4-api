<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use App\Models\Setting;
use App\Models\User;
use DateTime;
use Illuminate\Support\Facades\Http;
use App\Models\CustomerService;
use Illuminate\Support\Facades\Log;
use URL;

class CustomerserviceController extends Controller
{
    public function ifsc_modification(Request $request)
    {
          $validator = Validator::make($request->all(), [
        'user_id' => 'required',
         'account_no' => 'required',
          'ifsc_code' => 'required'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => $validator->errors()->first()
        ], 200);
    }
    $userid=$request->user_id;
    $ac_no=$request->account_no;
    $ifsc=$request->ifsc_code;
    
    try {
        // Insert IFSC modification request
        $insertId = DB::table('ifsc_modifications')->insertGetId([
            'user_id'    => $userid,
            'account_no' => $ac_no,
            'ifsc_code'  => $ifsc,
            'status'     => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Check insertion success
        if ($insertId) {
            return response()->json([
                'success' => true,
                'message' => 'IFSC modification requested successfully. Please wait for admin approval.',
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit IFSC modification request.'
            ]);
        }
    } catch (\Exception $e) {
        // Handle unexpected error
        return response()->json([
            'success' => false,
            'message' => 'Something went wrong.',
            'error'   => $e->getMessage()
        ], 500);
    }
    }
    
  public function deleteBankAccountRequest(Request $request)
{
    // Validation
    $validator = Validator::make($request->all(), [
        'user_id'              => 'required|integer',
        'account_no'           => 'required|string',
        'ifsc_code'            => 'required|string',
        'passbook_photo'       => 'required|image|mimes:jpg,jpeg,png,pdf',
        'identity_card_photo'  => 'required|image|mimes:jpg,jpeg,png,pdf',
        'last_deposit_proof'   => 'required|image|mimes:jpg,jpeg,png,pdf',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => $validator->errors()->first()
        ], 400);
    }

    try {
        // Destination Path
        $destinationPath = public_path('delete-bank-request');

        // Ensure the directory exists
        if (!file_exists($destinationPath)) {
            mkdir($destinationPath, 0777, true);
        }

        // Unique filenames
        $passbookName = time() . '_passbook.' . $request->file('passbook_photo')->getClientOriginalExtension();
        $idCardName   = time() . '_idcard.' . $request->file('identity_card_photo')->getClientOriginalExtension();
        $depositName  = time() . '_deposit.' . $request->file('last_deposit_proof')->getClientOriginalExtension();

        // Move files to public/delete-bank-request/
        $request->file('passbook_photo')->move($destinationPath, $passbookName);
        $request->file('identity_card_photo')->move($destinationPath, $idCardName);
        $request->file('last_deposit_proof')->move($destinationPath, $depositName);

        // File paths to store in DB (relative to public)
        $passbookPath = 'delete-bank-request/' . $passbookName;
        $idCardPath   = 'delete-bank-request/' . $idCardName;
        $depositPath  = 'delete-bank-request/' . $depositName;

        // Insert into DB
        $insertId = DB::table('delete_bank_accounts')->insertGetId([
            'user_id'             => $request->user_id,
            'account_no'          => $request->account_no,
            'ifsc_code'           => $request->ifsc_code,
            'passbook_photo'      => $passbookPath,
            'identity_card_photo' => $idCardPath,
            'last_deposit_proof'  => $depositPath,
            'status'              => 0,
            'created_at'          => now(),
            'updated_at'          => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Delete bank account request submitted successfully.',
            'data'    => [
                'request_id' => $insertId
            ]
        ], 200);

    } catch (\Exception $e) {
        return response()->json([
            'success' => false,
            'message' => 'Something went wrong while processing your request.',
            'error'   => $e->getMessage()
        ], 500);
    }
}


 public function Bankname_modification(Request $request){
          $validator = Validator::make($request->all(), [
        'user_id' => 'required',
         'account_no' => 'required',
          'bank_name' => 'required'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => $validator->errors()->first()
        ], 200);
    }
    $userid=$request->user_id;
    $ac_no=$request->account_no;
    $bankname=$request->bank_name;
    
    try {
        // Insert IFSC modification request
        $insertId = DB::table('bank_name_modification')->insertGetId([
            'user_id'    => $userid,
            'account_no' => $ac_no,
            'bank_name'  => $bankname,
            'status'     => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Check insertion success
        if ($insertId) {
            return response()->json([
                'success' => true,
                'message' => 'Bank name modification requested successfully. Please wait for admin approval.',
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit Bank name modification request.'
            ]);
        }
    } catch (\Exception $e) {
        // Handle unexpected error
        return response()->json([
            'success' => false,
            'message' => 'Something went wrong.',
            'error'   => $e->getMessage()
        ], 500);
    }
    }
    
public function game_problem(Request $request){
    // Step 1: Validate input
    $validator = Validator::make($request->all(), [
        'user_id'     => 'required|exists:users,id',
        'description' => 'required|string',
        'image'       => 'required|string' // base64 image
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json([
            'status'  => 400,
            'message' => $validator->errors()->first(),
        ], 400);
    }

    // Step 2: Inputs
    $userId      = $request->user_id;
    $description = $request->description;
    $screenshot  = $request->image;
    $now         = now();
    $imageUrl    = null;

    // Step 3: Decode and save base64 image
    if (!empty($screenshot)) {
        try {
            // Remove base64 header if present
            $base64Data = preg_replace('#^data:image/\w+;base64,#i', '', $screenshot);
            $imageData  = base64_decode($base64Data);

            // Generate unique file name
            $fileName   = 'game_problem_' . time() . '_' . rand(1000, 9999) . '.jpg';
            $uploadPath = public_path('uploads/' . $fileName);

            // Save the file
            file_put_contents($uploadPath, $imageData);

            // Relative URL
            $imageUrl = 'uploads/' . $fileName;
        } catch (\Exception $e) {
            return response()->json([
                'status'  => 500,
                'message' => 'Image upload failed: ' . $e->getMessage()
            ], 500);
        }
    }

    // Step 4: Insert into DB
    DB::table('game_issue_complaint')->insert([
        'user_id'    => $userId,
        'description'=> $description,
        'image'      => $imageUrl,
        'status'     => 0,
        'created_at' => $now,
        'updated_at' => $now,
    ]);

    // Step 5: Final Response
    return response()->json([
        'status'  => true,
        'message' => 'Your complaint has been submitted successfully.',
        'data'    => [
            'image_url' => asset($imageUrl)
        ]
    ], 200);
}
    
    
          
 
public function change_login_password(Request $request){
    $validator = Validator::make($request->all(), [
        'user_id'                         => 'required|integer|exists:users,id',
        'password'                        => 'required|string|min:8',
        'bdg_win_id'                      => 'required|string|max:55',
        'latest_deposit_receipt'         => 'required|image|mimes:jpeg,png,jpg|max:2048',
        'photo_selfie_hold_passbook'     => 'required|image|mimes:jpeg,png,jpg|max:2048',
        'photo_selfie_hold_identity_card'=> 'required|image|mimes:jpeg,png,jpg|max:2048',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => $validator->errors()->first()
        ], 400);
    }

    try {
        $uploadPath = public_path('uploads');
        if (!file_exists($uploadPath)) {
            mkdir($uploadPath, 0755, true);
        }

        // Generate short unique names
        $img1Name = Str::random(10).'.'.$request->file('latest_deposit_receipt')->getClientOriginalExtension();
        $request->file('latest_deposit_receipt')->move($uploadPath, $img1Name);

        $img2Name = Str::random(10).'.'.$request->file('photo_selfie_hold_passbook')->getClientOriginalExtension();
        $request->file('photo_selfie_hold_passbook')->move($uploadPath, $img2Name);

        $img3Name = Str::random(10).'.'.$request->file('photo_selfie_hold_identity_card')->getClientOriginalExtension();
        $request->file('photo_selfie_hold_identity_card')->move($uploadPath, $img3Name);

        $insertId = DB::table('request_change_login_password')->insertGetId([
            'user_id'                         => $request->user_id,
            'password'                        => $request->password,
            'bdg_win_id'                      => $request->bdg_win_id,
            'latest_deposit_receipt'          => 'uploads/' . $img1Name,
            'photo_selfie_hold_passbook'      => 'uploads/' . $img2Name,
            'photo_selfie_hold_Identity_card' => 'uploads/' . $img3Name,
            'status'                          => 0,
            'created_at'                      => time(),
        ]);

        return response()->json([
            'status' => 200,
            'message' => 'Request submitted successfully.'
        ], 200);

    } catch (\Exception $e) {
        return response()->json([
            'status' => 500,
            'message' => 'Something went wrong. Please try again later.'
        ], 500);
    }
}

    public function UsdtstoreUserDocument(Request $request){
    $validator = Validator::make($request->all(), [
        'user_id' => 'required|integer',
        'region_status' => 'required|in:1,2',
        'wallet_type' => 'required|string',
        'exchange_name' => 'required|string',
        'screenshot_bdgwin_id' => 'required|image',
        'photo_government_card' => 'required|image',
        'photo_adhaar_card' => $request->region_status == 1 ? 'required|image' : 'nullable|image',
        'photo_deposit_proof1' => 'required|image',
        'photo_deposit_proof2' => 'required|image',
        'photo_usdt_bind_bdgwin' => 'required|image',
        'photo_new_usdt_address' => 'required|image',
    ]);

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'errors' => $validator->errors()]);
    }

    // Handle image uploads with small, unique names
    $uploadPath = public_path('uploads/user_documents/');
    if (!file_exists($uploadPath)) {
        mkdir($uploadPath, 0755, true);
    }

    $fieldsToUpload = [
        'screenshot_bdgwin_id', 'photo_government_card', 'photo_adhaar_card',
        'photo_deposit_proof1', 'photo_deposit_proof2',
        'photo_usdt_bind_bdgwin', 'photo_new_usdt_address'
    ];

    $data = $request->only([
        'user_id', 'region_status', 'wallet_type', 'exchange_name'
    ]);

    foreach ($fieldsToUpload as $field) {
        if ($request->hasFile($field)) {
            $file = $request->file($field);
            $name = strtolower($field) . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $file->move($uploadPath, $name);
            $data[$field] = 'uploads/user_documents/' . $name;
        }
    }

    $data['created_at'] = now();
    $data['updated_at'] = now();

    DB::table('usdt_verifications')->insert($data);

    return response()->json(['status' => 200, 'message' => 'Document uploaded successfully']);
}
    
    
       public function submitOldUsdtAddressRequest(Request $request){
        $validator = Validator::make($request->all(), [
            'user_id'              => 'required|integer|exists:users,id',
            'depositProof'   => 'required|image|mimes:jpeg,png,jpg|max:2048',
            'selfieId'  => 'required|image|mimes:jpeg,png,jpg|max:2048',
            'selfieUsdt'=> 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);
    
        if ($validator->fails()) {
            return response()->json([
                'status' => 400,
                'message' => $validator->errors()->first()
            ], 400);
        }
    
        try {
            $uploadPath = public_path('uploads');
            if (!file_exists($uploadPath)) {
                mkdir($uploadPath, 0755, true);
            }
    
            // Upload files with unique names
            $usdtImg = Str::random(10).'.'.$request->file('depositProof')->getClientOriginalExtension();
            $request->file('depositProof')->move($uploadPath, $usdtImg);
    
            $idImg = Str::random(10).'.'.$request->file('selfieId')->getClientOriginalExtension();
            $request->file('selfieId')->move($uploadPath, $idImg);
    
            $receiptImg = Str::random(10).'.'.$request->file('selfieUsdt')->getClientOriginalExtension();
            $request->file('selfieUsdt')->move($uploadPath, $receiptImg);
    
            DB::table('delete_old_usdt_address')->insert([
                'user_id'              => $request->user_id,
                'photo_usdt_address'   => 'uploads/' . $usdtImg,
                'photo_identity_card'  => 'uploads/' . $idImg,
                'deposit_receipt_proof'=> 'uploads/' . $receiptImg,
                'status'               => 'pending',
                'created_at'           => now(),
                'updated_at'           => now(),
            ]);
    
            return response()->json([
                'status' => 200,
                'message' => 'Request submitted successfully.'
            ], 200);
    
        } catch (\Exception $e) {
            return response()->json([
                'status' => 500,
                'message' => 'Something went wrong. Please try again later.'
            ], 500);
        }
    }
    
      
      
     public function aviator_lucky_bonus(Request $request) {
    $validator = Validator::make($request->all(), [
        'user_id'   => 'required|integer|exists:users,id',
        'bdg_u_id'  => 'required|string',
    ]);
    if ($validator->fails()) {
        return response()->json([
            'status'  => 400,
            'message' => $validator->errors()->first()
        ], 400);
    }

    $user_id   = $request->user_id;
    $user_name = $request->bdg_u_id;
    $insert = DB::table('aviator_lucky_bonus')->insert([
        "user_id"    => $user_id,
        "user_name"  => $user_name,
        "created_at" => now(),
        "updated_at" => now()
    ]);
    if ($insert) {
        return response()->json([
            "status"  => 200,
            "message" => "Request submitted successfully"
        ], 200);
    } else {
        return response()->json([
            "status"  => 400,
            "message" => "Something went wrong"
        ],200);
    }
}
  
  
    public function fetchDataByTypeId(Request $request)
{
    $typeId = $request->query('typeid');
    $userId = $request->query('userid'); // User ID लेना

    $typeTableMap = [
        1 => 'delete_bank_accounts',
        2 => 'request_change_login_password',
        3 => 'ifsc_modifications',
        4 => 'usdt_verifications',
        5 => 'delete_old_usdt_address',
        6 => 'bank_name_modification',
        7 => 'game_issue_complaint',
    ];

    // Check if valid typeId
    if (!isset($typeTableMap[$typeId])) {
        return response()->json([
            'status' => false,
            'message' => 'Invalid typeid provided.',
        ], 400);
    }

    // Check if userId provided
    if (empty($userId)) {
        return response()->json([
            'status' => false,
            'message' => 'userid is required.',
        ], 400);
    }

    $tableName = $typeTableMap[$typeId];

    // Fetch only matching user_id data
    $data = DB::table($tableName)
        ->where('user_id', $userId)
        ->get();

    return response()->json([
        'status' => true,
        'message' => 'Data fetched successfully.',
        'table' => $tableName,
        'data' => $data,
    ]);
}

	public function depositProblem(Request $request)
{
    // Validation
    $validator = Validator::make($request->all(), [
        'user_id'                 => 'required|integer|exists:users,id',
        'order_number'            => 'required|string',
        'order_amount'            => 'required|numeric',
        'upi_id'                  => 'required|string',
        'utr_number'              => 'required|string',
        'pdf_password'            => 'required|string',
        'deposit_proof_recipt'    => 'required|mimes:jpeg,png,jpg|max:20480', // 20MB image
        'bank_transaction_video'  => 'required|mimes:mp4,mov,avi,wmv|max:51200', // 50MB video
        'pdf_bank_statement'      => 'required|mimes:pdf|max:20480', // 20MB PDF
    ]);

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => 'Validation failed',
            'errors' => $validator->errors()->first()
        ], 400);
    }

    try {
        // Base upload path
        $uploadBasePath = public_path('uploads/deposit_problem/');
        if (!file_exists($uploadBasePath)) {
            mkdir($uploadBasePath, 0755, true);
        }

        // Create subfolders for images, videos, pdfs
        $folders = [
            'images' => $uploadBasePath . 'images/',
            'videos' => $uploadBasePath . 'videos/',
            'pdfs'   => $uploadBasePath . 'pdfs/'
        ];
        foreach ($folders as $folder) {
            if (!file_exists($folder)) {
                mkdir($folder, 0755, true);
            }
        }

        // Files to upload
        $fieldsToUpload = [
            'deposit_proof_recipt'   => 'images',
            'bank_transaction_video' => 'videos',
            'pdf_bank_statement'     => 'pdfs'
        ];

        // Collect normal form data
        $data = $request->only([
            'user_id', 'order_number', 'order_amount', 'upi_id', 'utr_number', 'pdf_password'
        ]);

        // File upload processing
        foreach ($fieldsToUpload as $field => $folderKey) {
            if ($request->hasFile($field)) {
                $file = $request->file($field);
                $name = strtolower($field) . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                $file->move($folders[$folderKey], $name);
                $data[$field] = 'uploads/deposit_problem/' . $folderKey . '/' . $name;
            }
        }

        // Prepare DB insert data
        $insertData = [
            'user_id'                => $data['user_id'],
            'order_id'               => $data['order_number'],
            'amount'                 => $data['order_amount'],
            'upi_id'                 => $data['upi_id'],
            'utr_number'             => $data['utr_number'],
            'pdf_password'           => $data['pdf_password'],
            'deposit_proof_recipt'   => $data['deposit_proof_recipt'],
            'bank_transaction_video' => $data['bank_transaction_video'],
            'pdf_bank_statement'     => $data['pdf_bank_statement'],
            'status'                 => 0,
            'created_at'             => now(),
            'updated_at'             => now(),
        ];

        $inserted = DB::table('deposit_problem')->insert($insertData);

        if ($inserted) {
            return response()->json([
                'status'  => 200,
                'message' => 'Deposit problem request submitted successfully.'
            ], 200);
        } else {
            return response()->json([
                'status'  => 500,
                'message' => 'Failed to submit deposit problem request.'
            ], 500);
        }

    } catch (\Exception $e) {
        return response()->json([
            'status' => 500,
            'message' => 'Something went wrong while processing your request.',
            'error'   => $e->getMessage()
        ], 500);
    }
}

	public function withdraw_pending_list(Request $request)
{
    $validator = Validator::make($request->all(), [
        'user_id' => 'required',
        'type' => 'nullable',
        'created_at' => 'nullable|date', // Ensure date is valid
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ], 400);
    }

    $user_id = $request->user_id;
    $status = 1;
    $type = $request->type;
    $created_at = $request->created_at;
    $where = [];

    // User ID condition
    if (!empty($user_id)) {
        $where[] = "withdraw_histories.`user_id` = '$user_id'";
    }

    // Status condition
    if (!empty($status)) {
        $where[] = "`withdraw_histories`.`status` = '$status'";
    }

    // Type condition including type = 0
    if ($type !== null && $type !== '') {
        $where[] = "`withdraw_histories`.`type` = '$type'";
    }
    

    // Date filter condition
    if (!empty($created_at)) {
        $newDateString = date("Y-m-d", strtotime($created_at));
        $where[] = "DATE(`withdraw_histories`.`created_at`) = '$newDateString'";
    }
   $query = "SELECT `id`, `user_id`, `rejectmsg`, `amount`, `type`, `status`, `typeimage`, `order_id`, `created_at` FROM withdraw_histories";

    // $query = "SELECT `id`, `user_id`,'rejectmsg', `amount`, `type`, `status`, `typeimage`, `order_id`, `created_at` FROM withdraw_histories";
   
    if (!empty($where)) {
        $query .= " WHERE " . implode(" AND ", $where);
    }

    $query .= " ORDER BY withdraw_histories.id DESC";

    $payin = DB::select($query);
  
    if ($payin) {
        $response = [
            'message' => 'Successfully',
            'status' => 200,
            'data' => $payin
        ];
        return response()->json($response, 200);
    } else {
        return response()->json(['message' => 'No record found', 'status' => 200, 'data' => []], 400);
    }
}

	
	public function withdrawProblem(Request $request)
{
    // Validation
    $validator = Validator::make($request->all(), [
        'user_id'                 => 'required|integer|exists:users,id',
        'order_number'            => 'required|string',
        'order_amount'            => 'required|numeric',
        'upi_id'                  => 'required|string',
        'pdf_password'            => 'required|string',
        'deposit_proof_recipt'    => 'required|mimes:jpeg,png,jpg|max:20480', // 20MB image
        'bank_transaction_video'  => 'required|mimes:mp4,mov,avi,wmv|max:51200', // 50MB video
        'pdf_bank_statement'      => 'required|mimes:pdf|max:20480', // 20MB PDF
    ]);

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => 'Validation failed',
            'errors' => $validator->errors()->first()
        ], 400);
    }

    try {
        // Base upload path
        $uploadBasePath = public_path('uploads/deposit_problem/');
        if (!file_exists($uploadBasePath)) {
            mkdir($uploadBasePath, 0755, true);
        }

        // Create subfolders for images, videos, pdfs
        $folders = [
            'images' => $uploadBasePath . 'images/',
            'videos' => $uploadBasePath . 'videos/',
            'pdfs'   => $uploadBasePath . 'pdfs/'
        ];
        foreach ($folders as $folder) {
            if (!file_exists($folder)) {
                mkdir($folder, 0755, true);
            }
        }

        // Files to upload
        $fieldsToUpload = [
            'deposit_proof_recipt'   => 'images',
            'bank_transaction_video' => 'videos',
            'pdf_bank_statement'     => 'pdfs'
        ];

        // Collect normal form data
        $data = $request->only([
            'user_id', 'order_number', 'order_amount', 'upi_id', 'pdf_password'
        ]);

        // File upload processing
        foreach ($fieldsToUpload as $field => $folderKey) {
            if ($request->hasFile($field)) {
                $file = $request->file($field);
                $name = strtolower($field) . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
                $file->move($folders[$folderKey], $name);
                $data[$field] = 'uploads/widthdraw_problem/' . $folderKey . '/' . $name;
            }
        }

        // Prepare DB insert data
        $insertData = [
            'user_id'                => $data['user_id'],
            'order_id'               => $data['order_number'],
            'amount'                 => $data['order_amount'],
            'upi_id'                 => $data['upi_id'],
            'pdf_password'           => $data['pdf_password'],
            'deposit_proof_recipt'   => $data['deposit_proof_recipt'],
            'bank_transaction_video' => $data['bank_transaction_video'],
            'pdf_bank_statement'     => $data['pdf_bank_statement'],
            'status'                 => 0,
            'created_at'             => now(),
            'updated_at'             => now(),
        ];

        $inserted = DB::table('widthdraw_problem')->insert($insertData);

        if ($inserted) {
            return response()->json([
                'status'  => 200,
                'message' => 'widthdraw problem request submitted successfully.'
            ], 200);
        } else {
            return response()->json([
                'status'  => 500,
                'message' => 'Failed to submit widthdraw problem request.'
            ], 500);
        }

    } catch (\Exception $e) {
        return response()->json([
            'status' => 500,
            'message' => 'Something went wrong while processing your request.',
            'error'   => $e->getMessage()
        ], 500);
    }
}

	public function deposit_pending_list(Request $request)
{
    $validator = Validator::make($request->all(), [
        'user_id' => 'required',
        // 'type' is now optional
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ], 400);
    }

    // Extract parameters
    $user_id = $request->user_id;
    $status = 1;
    $type = $request->type;
    $date = $request->created_at;

    // Start building the query
    $query = DB::table('payins')
                ->select('cash', 'type', 'status', 'order_id', 'typeimage', 'created_at')
                ->orderByDesc('payins.id');

    // Apply filters based on parameters provided
    if (!empty($user_id)) {
        $query->where('payins.user_id', '=', $user_id);
    }

    if (!empty($status)) {
        $query->where('payins.status', '=', $status);
    }

    // Apply the 'type' filter only if it's provided
    if (isset($type)) {
        // If 'type' is provided, apply the filter
        if (is_numeric($type)) {
            $query->where('payins.type', '=', (int)$type);
        } else {
            // You can handle this in case 'type' is a string
            $query->where('payins.type', '=', $type);
        }
    }

    if (!empty($date)) {
        $newDateString = date("Y-m-d", strtotime($date));
        $query->whereDate('payins.created_at', '=', $newDateString);
    }

    // Execute the query
    $payin = $query->get();

    if ($payin->isNotEmpty()) {
        return response()->json([
            'message' => 'Successfully',
            'status' => 200,
            'data' => $payin
        ], 200);
    } else {
        return response()->json([
            'message' => 'No record found',
            'status' => 400,
            'data' => []
        ], 400);
    }
}


    
}