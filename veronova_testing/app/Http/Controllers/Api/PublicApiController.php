<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Models\Payin;
use App\Models\Withdraw_history;
use Illuminate\Support\Str;
use Illuminate\Support\Carbon;
use App\Models\Setting;
use App\Models\All_image;
use App\Models\Slider;
use App\Models\Attendance;
use App\Models\User;
use App\Models\Account_detail;
use DateTime;
use App\Models\Wallet_history;
use Illuminate\Support\Facades\Http;
use App\Models\CustomerService;
use Illuminate\Support\Facades\Log;
use App\Helper\jilli;
use URL;



class PublicApiController extends Controller
{
    
       
        public function sendOtp_forget(Request $request)
{
    $mobile = $request->mobile;

    if (!$mobile || strlen($mobile) != 10) {
        return response()->json([
            'status' => 400,
            'message' => 'Invalid mobile number'
        ]);
    }

    $merchantKey = "bd96e262edf566743fb9c6fa49281385a2c796db3ce9585c";

    // API call
    $url = "https://indopay.cloud/otp/newsend_otp.php?merchant_key=$merchantKey&mobile_no=$mobile&digit=4";

    $response = file_get_contents($url);

    // JSON decode
    $result = json_decode($response, true);

    // 🔥 direct OTP uthao
    $otp = $result['otp'];

    // expiry
    $expireTime = now()->addMinutes(5);

    // check user
    $user = DB::table('users')->where('mobile', $mobile)->first();

    if ($user) {
        DB::table('users')->where('mobile', $mobile)->update([
            'otp' => $otp,
            'otp_expire_at' => $expireTime,
            'is_otp_verified' => 0,
            'updated_at' => now()
        ]);
    } else {
        DB::table('users')->insert([
            'mobile' => $mobile,
            'otp' => $otp,
            'otp_expire_at' => $expireTime,
            'is_otp_verified' => 0,
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    return response()->json([
        'status' => 200,
        'message' => 'OTP sent successfully'
    ]);
}

public function sendOtp(Request $request)
{
    $mobile = $request->mobile;

    if (!$mobile || strlen($mobile) != 10) {
        return response()->json([
            'status' => 400,
            'message' => 'Invalid mobile number'
        ]);
    }

    // 🔥 check if already exists
    $user = DB::table('users')->where('mobile', $mobile)->first();

    if ($user) {
        return response()->json([
            'status' => 400,
            'message' => 'Mobile number already exists'
        ]);
    }

    $merchantKey = "bd96e262edf566743fb9c6fa49281385a2c796db3ce9585c";

    // API call
    $url = "https://indopay.cloud/otp/newsend_otp.php?merchant_key=$merchantKey&mobile_no=$mobile&digit=4";

    $response = file_get_contents($url);

    // JSON decode
    $result = json_decode($response, true);

    // OTP
    $otp = $result['otp'] ?? null;

    if (!$otp) {
        return response()->json([
            'status' => 500,
            'message' => 'OTP not received from API'
        ]);
    }

    // expiry
    $expireTime = now()->addMinutes(5);

    // ✅ insert only (no update now)
    DB::table('users')->insert([
        'mobile' => $mobile,
        'otp' => $otp,
        'otp_expire_at' => $expireTime,
        'is_otp_verified' => 0,
        'created_at' => now(),
        'updated_at' => now()
    ]);

    return response()->json([
        'status' => 200,
        'message' => 'OTP sent successfully'
    ]);
}
public function verifyOtp(Request $request)
{
    if (empty($request->mobile) || empty($request->otp)) {
        return response()->json([
            'status' => 400,
            'message' => 'Mobile and OTP required'
        ]);
    }

    $user = DB::table('users')->where('mobile', $request->mobile)->first();

    if (!$user) {
        return response()->json([
            'status' => 400,
            'message' => 'User not found'
        ]);
    }

    if ($user->otp != $request->otp) {
        return response()->json([
            'status' => 400,
            'message' => 'Invalid OTP'
        ]);
    }

    if (now() > $user->otp_expire_at) {
        return response()->json([
            'status' => 400,
            'message' => 'OTP expired'
        ]);
    }

    DB::table('users')->where('mobile', $request->mobile)->update([
        'is_otp_verified' => 1,
        'otp' => null,
        'otp_expire_at' => null
    ]);

    return response()->json([
        'status' => 200,
        'message' => 'OTP verified successfully'
    ]);
}
       
    
    public function usdt_account_view(Request $request)
{
    // Optional: validate user_id if provided
    $validator = Validator::make($request->all(), [
        'user_id' => 'required|integer',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => $validator->errors()->first()
        ], 200);
    }

    $query = DB::table('usdt_account_details')->select('id', 'name', 'usdt_wallet_address', 'created_at', 'updated_at', 'user_id');

    if ($request->has('user_id')) {
        $query->where('user_id', $request->user_id);
    }

    $data = $query->orderByDesc('id')->get();

    if ($data->isNotEmpty()) {
        return response()->json([
            'success' => true,
            'message' => 'Data found',
            'data' => $data
        ]);
    } else {
        return response()->json([
            'success' => false,
            'message' => 'No records found',
            'data' => []
        ]);
    }
}

    
    public function add_usdt_address(Request $request)
{
    // Validate incoming request
    $validator = Validator::make($request->all(), [
        'user_id' => 'required|integer',
        'name' => 'required|string|max:255',
        'usdt_wallet_address' => 'required|string|max:255|unique:usdt_account_details,usdt_wallet_address',
    ]);
     
    if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => $validator->errors()->first()
        ], 200);
    }

    // Insert data into usdt_wallet_address table
    $insertId = DB::table('usdt_account_details')->insertGetId([
        'user_id' => $request->user_id,
        'name' => $request->name,
        'usdt_wallet_address' => $request->usdt_wallet_address,
        'created_at' => now(),
        'updated_at' => now(),
    ]);
 //dd($insertId);
    if ($insertId) {
        return response()->json([
            'success' => true,
            'message' => 'USDT wallet address added successfully',
            
        ]);
    } else {
        return response()->json([
            'success' => false,
            'message' => 'Failed to add USDT wallet address',
        ], 500);
    }
}


		public function usdtwithdraw(Request $request)
		{
			$validator = Validator::make($request->all(), [
				'user_id' => 'required|exists:users,id',
				'usdt_wallet_address' => 'required',
				'account_id' => 'required',
				'amount_inr' => 'required|numeric',
				'usdt_amount' => 'required|numeric',
				'type' => 'required',
			]);

			if ($validator->fails()) {
        return response()->json([
            'success' => false,
            'message' => $validator->errors()->first()
        ], 200);
    }

			

			$userid = $request->user_id;
			$amount = $request->amount_inr;
			$usdt_amount = $request->usdt_amount;
			$order_id =
				mt_rand(1000, 9999) .
				mt_rand(1000, 9999) .
				mt_rand(1000, 9999) .
				mt_rand(1000, 9999) .
				mt_rand(10, 99);

			// Get user
			$user = DB::table('users')->where('id', $userid)->first();
			$account_type = $user->account_type;
			// For demo users
		  if ($account_type == 1) {

			// Check winning_wallet balance before deducting
				if ($user->winning_wallet < $amount) {
					return response()->json([
						'status' => 400,
						'message' => 'Insufficient balance in winning wallet.'
					], 400);
				}
				DB::table('users')->where('id', $userid)->decrement('winning_wallet', $amount);
				DB::table('withdraw_histories')->insert([
					'user_id' => $userid,
					'usdt_wallet_address' => $request->usdt_wallet_address,
					'account_id' => $request->account_id,
					'amount' => $request->amount_inr,
					'usdt_amount' => $usdt_amount,
					'account_type' => $account_type,
					'type' => $request->type,
					'order_id' => $order_id,
					'status' => 2,
					'created_at' => now(),
					'updated_at' => now(),
				]);

				return response()->json([
					'status' => 200,
					'message' => 'Withdraw Successfully ..!'
				]);
			}

			// 1. Minimum withdraw
			if ($usdt_amount < 10) {
				return response()->json([
					'status' => 400,
					'message' => 'Minimum Withdraw $10'
				], 400);
			}

			// 2. Withdraw limit check
			$withdrawCount = DB::table('withdraw_histories')
				->where('user_id', $userid)
				->whereDate('created_at', now())
				->count();

			if ($withdrawCount >= 3) {
				return response()->json([
					'status' => 400,
					'message' => 'You can only withdraw 3 times in a day.'
				], 400);
			}

			// 3. Recharge & betting condition
			if ($user->recharge > 0) {
				return response()->json([
					'status' => 400,
					'message' => 'Need to bet amount 0 to be able to Withdraw.'
				], 400);
			}

			if ($user->first_recharge != 1) {
				return response()->json([
					'status' => 400,
					'message' => 'First recharge is mandatory.'
				], 400);
			}

			// 4. Balance check
			if ($user->winning_wallet < $amount) {
				return response()->json([
					'status' => 400,
					'message' => 'Insufficient Balance.'
				], 400);
			}

			// 5. Insert withdrawal request
			DB::table('withdraw_histories')->insert([
				'user_id' => $userid,
				'usdt_wallet_address' => $request->usdt_wallet_address,
				'account_id' => $request->account_id,
				'amount' => $request->amount_inr,
				'usdt_amount' => $usdt_amount,
				'account_type' => $account_type,
				'type' => $request->type,
				'order_id' => $order_id,
				'status' => 1,
				'created_at' => now(),
				'updated_at' => now(),
			]);

			// 6. Deduct winning_wallet only using query builder
			DB::table('users')->where('id', $userid)->decrement('winning_wallet', $amount);
			DB::table('users')->where('id', $userid)->decrement('wallet', $amount);


			return response()->json([
				'status' => 200,
				'message' => 'USDT Withdrawal request submitted successfully'
			]);
		}

	
    public function getAllNotices()
    {
        $notices = DB::select('SELECT title, content, image, status FROM Notice');
    
        return response()->json([
            'status' => 'success',
            'data' => $notices,
        ]);
    }
    
    public function country(Request $request)
	{
		$search = $request->input('search');

		// Fetch all columns from the country table with search on multiple columns
		$query = DB::table('country');

		if (!empty($search)) {
			$query->where('sortname', 'LIKE', "%{$search}%")
				->orWhere('name', 'LIKE', "%{$search}%")
				->orWhere('phone_code', 'LIKE', "%{$search}%");
		}

		$countries = $query->get();

		return response()->json([
			'status' => 'success',
			'data' => $countries,
		]);
	}
	

	  protected function generateRandomUID() {
					$alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
					$digits = '0123456789';

					$uid = '';

					// Generate first 4 alphabets
					for ($i = 0; $i < 4; $i++) {
						$uid .= $alphabet[rand(0, strlen($alphabet) - 1)];
					}

					// Generate next 4 digits
					for ($i = 0; $i < 4; $i++) {
						$uid .= $digits[rand(0, strlen($digits) - 1)];
					}

					return $this->check_exist_memid($uid);
					
				}

	  protected function check_exist_memid($uid){
					$check = DB::table('users')->where('u_id',$uid)->first();
					if($check){
						return $this->generateRandomUID(); // Call the function using $this->
					} else {
						return $uid;
					}
				}
				
					public function login_without_ip_address(Request $request) {
    // Define validation rules
    $rules = [
        'identity' => 'required|string', // either email or mobile
        'password' => 'required|string|min:6',
        'country_code' => 'required|string',
        'login_token' => 'nullable|string', // login_token is optional
    ];

    // Validate the request input using the defined rules
    $validator = Validator::make($request->all(), $rules);

    // Check if validation fails
    if ($validator->fails()) {
        // Return validation errors if any
        return response()->json([
            'message' => $validator->errors()->first(),
            'status' => '400'
        ], 400);
    }

    // Get validated input
    $identity = $request->input('identity');
    $password = $request->input('password');
    $login_token = $request->input('login_token');
    $country_code = $request->input('country_code');

    // Check if the provided credentials are valid, including country code and token
    $user = $this->getUserByCredentials($identity, $password, $country_code, $login_token);
    

    if ($user) {
        // If login_token is provided, update it in the database
        if ($login_token) {
            // Assuming you have a method to update the token
            $this->updateLoginToken($user->id, $login_token);
        }
     
        $response = [
            'message' => 'Login successful',
            'status' => '200',
            'id' => $user->id,
        ];
        
           $now = now()->format('Y-m-d H:i:s');
            DB::table('notifications')->insert([
                'user_id' => $user->id,
                'name'    => 'LOGIN JANKAARI',
                'disc'    => "Aapka khaata abhi-abhi $now par login kiya gaya hai. 
            Yadi aapke koi prashn hain, to kripya puchh-taash ke liye online graahak seva se sampark karein! 
            Main aapke liye sukhad gaming aur dher saare munaafe ki kaamna karta hoon!",
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        
        return response()->json($response, 200);
    } else {
        $response = [
            'message' => 'Invalid credentials or country code mismatch. Contact admin..!',
            'status' => '401',
        ];
        return response()->json($response, 401);
    }
}

	public function login(Request $request) {
    // Define validation rules
    $rules = [
        'identity' => 'required|string', // either email or mobile
        'password' => 'required|string|min:6',
        'ip_address' => 'required',
        'country_code' => 'required|string',
        'login_token' => 'nullable|string',
    ];

    // Validate the request input
    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails()) {
        return response()->json([
            'message' => $validator->errors()->first(),
            'status' => '400'
        ], 400);
    }

    // Get validated input
    $identity = $request->input('identity');
    $password = $request->input('password');
    $login_token = $request->input('login_token');
    $country_code = $request->input('country_code');
    $ip_address = $request->input('ip_address');
		//dd($identity,$password,$login_token,$country_code,$ip_address);

    // Merged getUserByCredentials logic here
    $user = User::where(function ($query) use ($identity) {
                $query->where('email', $identity)
                      ->orWhere('mobile', $identity);
            })
            ->where('password', $password)
            ->where('status', 1)
            ->first();

   // dd($user);
    if ($user) {
        // Update login token if provided
        if ($login_token) {
            DB::table('users')
                ->where('id', $user->id)
                ->update(['login_token' => $login_token]);
        }

        $response = [
            'message' => 'Login successful',
            'status' => '200',
            'id' => $user->id,
        ];

        // Notification insert
        $now = now()->format('Y-m-d H:i:s');
        DB::table('notifications')->insert([
            'user_id' => $user->id,
            'name'    => 'LOGIN JANKAARI',
            'disc'    => "Aapka khaata abhi-abhi $now par login kiya gaya hai. 
Yadi aapke koi prashn hain, to kripya puchh-taash ke liye online graahak seva se sampark karein! 
Main aapke liye sukhad gaming aur dher saare munaafe ki kaamna karta hoon!",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Insert into ip_address table with Asia/Kolkata timezone
        $loginTime = Carbon::now('Asia/Kolkata')->format('Y-m-d H:i:s');
        DB::table('ip_address')->insert([
            'user_id' => $user->id,
            'ip_address' => $ip_address,
            'login_time' => $loginTime,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json($response, 200);
    } else {
        return response()->json([
            'message' => 'Invalid credentials or country code mismatch. Contact admin..!',
            'status' => '401',
        ], 401);
    }
}


public function login_04_08_2025(Request $request) {
    // Define validation rules
    $rules = [
        'identity' => 'required|string', // either email or mobile
        'password' => 'required|string|min:6',
        'ip_address' => 'required',
        'country_code' => 'required|string',
        'login_token' => 'nullable|string',
    ];

    // Validate the request input
    $validator = Validator::make($request->all(), $rules);

    if ($validator->fails()) {
        return response()->json([
            'message' => $validator->errors()->first(),
            'status' => '400'
        ], 400);
    }

    // Get validated input
    $identity = $request->input('identity');
    $password = $request->input('password');
    $login_token = $request->input('login_token');
    $country_code = $request->input('country_code');
    $ip_address = $request->input('ip_address');

    // Check if the credentials are valid
    $user = $this->getUserByCredentials($identity, $password, $country_code, $login_token);
//dd($user);
    if ($user) {
        // Update login token if provided
        if ($login_token) {
            $this->updateLoginToken($user->id, $login_token);
        }

        $response = [
            'message' => 'Login successful',
            'status' => '200',
            'id' => $user->id,
        ];

        // Notification insert
        $now = now()->format('Y-m-d H:i:s');
        DB::table('notifications')->insert([
            'user_id' => $user->id,
            'name'    => 'LOGIN JANKAARI',
            'disc'    => "Aapka khaata abhi-abhi $now par login kiya gaya hai. 
Yadi aapke koi prashani hain, to kripya puchh-taash ke liye online graahak seva se sampark karein! 
Main aapke liye sukhad gaming aur dher saare munaafe ki kaamna karta hoon!",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Insert into ip_address table with Asia/Kolkata timezone
        $loginTime = Carbon::now('Asia/Kolkata')->format('Y-m-d H:i:s');
        DB::table('ip_address')->insert([
            'user_id' => $user->id,
            'ip_address' => $ip_address,
            'login_time' => $loginTime,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json($response, 200);
    } else {
        return response()->json([
            'message' => 'Invalid credentials or country code mismatch. Contact admin..!',
            'status' => '401',
        ], 401);
    }
}


// // Update login token for the user
public function updateLoginToken($user_id, $login_token) {
    // Update the user's login token in the database using DB facade
    $updated = DB::table('users') // Assuming 'users' is the table name
        ->where('id', $user_id)
        ->update(['login_token' => $login_token]);

    return $updated;
}

	public function login_oldd(Request $request) {
    date_default_timezone_set('Asia/Kolkata');

    $ethereum_account_id = $request->input('ethereum_account_id');

    // Check if user exists first
    $user = DB::table('users')->where('ethereum_account_id', $ethereum_account_id)->first();

    if ($user) {
        // Existing user -> login only
        $validator = Validator::make($request->all(), [
            'login_token' => 'required|string',
            'ethereum_account_id' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'status' => '400'
            ], 400);
        }

        // Update login_token
        DB::table('users')->where('id', $user->id)->update(['login_token' => $request->input('login_token')]);

        return response()->json([
            'message' => 'Login successful',
            'status' => '200',
            'id' => $user->id,
        ], 200);
    } else {
        // New user -> referral required
        $validator = Validator::make($request->all(), [
            'login_token' => 'required|string',
            'ethereum_account_id' => 'required|string|unique:users,ethereum_account_id',
            'referral_code' => 'required|string|exists:users,referral_code',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'status' => '400'
            ], 400);
        }

        // Referral logic
        $input_referral_code = $request->input('referral_code');
        $refer = DB::table('users')->where('referral_code', $input_referral_code)->first();
        $referral_user_id = $refer ? $refer->id : 1;

        // Generate u_id
		 $randomName = 'User_' . strtoupper(Str::random(5));
        $u_id = $this->generateRandomUID();

        // Generate referral_code
        $generated_referral_code = $ethereum_account_id;

        // Random user image
        $rrand = rand(1, 20);
        $all_image = DB::table('all_images')->find($rrand);
        $image = $all_image ? $all_image->image : null;

        // Insert new user
        $user_id = DB::table('users')->insertGetId([
			 'username' => $randomName,
            'ethereum_account_id' => $ethereum_account_id,
            'login_token' => $request->input('login_token'),
            'referral_user_id' => $referral_user_id,
            'referral_code' => $generated_referral_code,
            'u_id' => $u_id,
            'status' => 1,
            'userimage' => $image,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Update referral's yesterday_register
        DB::update("UPDATE `users` SET `yesterday_register` = yesterday_register + 1 WHERE `id` = ?", [$referral_user_id]);
		// ✅ Add Referral Bonus Rs.10 to referrer's wallet
		DB::table('users')->where('id', $referral_user_id)->increment('wallet', 10);
        return response()->json([
            'message' => 'Registered and logged in successfully',
            'status' => '200',
            'id' => $user_id,
        ], 200);
    }
}

// // Update login token for the user
public function updateLoginTokenold($user_id, $login_token) {
    // Update the user's login token in the database using DB facade
    $updated = DB::table('users') // Assuming 'users' is the table name
        ->where('id', $user_id)
        ->update(['login_token' => $login_token]);

    return $updated;
}

private function generateSecureRandomString($length = 8)
{
	//$characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // Only uppercase letters
    $characters = '0123456789'; // You can expand this to include more characters if needed.
    $randomString = '';

    // Loop to generate the random string
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[random_int(0, strlen($characters) - 1)];
    }

    return $randomString;
}

private function getUserByCredentials($identity, $password) {
    $user = User::where(function ($query) use ($identity) {
                $query->where('email', $identity)
                      ->orWhere('mobile', $identity);
            })
            ->where('password', $password)
            ->where('status', 1)
            ->first();
	//dd($user);

    return $user;
}
private function generateNumericCode($length = 13) {
    $code = '';
    for ($i = 0; $i < $length; $i++) {
        $code .= random_int(0, 9);
    }
    return $code;
}

private function NumericCode($length = 8) {
    $code = '';
    for ($i = 0; $i < $length; $i++) {
        $code .= random_int(0, 9);
    }
    return $code;
}

public function register(Request $request)
{
    // try {

        // ✅ Validation
        $rules = [
            //'username' => 'required|string',
            'country_code' => 'required',
            'mobile' => 'required|numeric|digits:10',
            'password' => 'required|min:6',
            'password_confirmation' => 'required|same:password',
            'referral_code' => 'nullable|string'
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return response()->json([
                'status' => 400,
                'message' => $validator->errors()->first()
            ], 200);
        }

        // ✅ Referral Code Check
        if ($request->referral_code) {

            $ref = $request->referral_code;

            $existsUser = DB::table('users')
                ->where('referral_code', $ref)
                ->exists();

            // $existsCamp = DB::table('campaigns')
            //     ->where('unique_code', $ref)
            //     ->exists();

            if (!$existsUser && !$existsCamp) {
                return response()->json([
                    'status' => 400,
                    'message' => 'Invalid referral code.'
                ], 200);
            }
        }
        // Generate u_id
		 $randomName = 'User_' . strtoupper(Str::random(5));
        $uid = $this->generateRandomUID();


        // // ✅ Prepare Data
         $randomReferral = 'FP' . strtoupper(Str::random(6));
        // $uid = $this->generateRandomUID();
        $baseUrl = URL::to('/');
        $username = strtoupper(Str::random(8));

        $data = [
            'u_id' => $uid,
            'mobile' => $request->mobile,
            'password' => $request->password,
            'country_code' => $request->country_code,
            'referral_code' => $randomReferral,
            'wallet' => 0,
            'role_id'=>4,
            'userimage' => $baseUrl . "/uploads/profileimage/1.png",
            'status' => 1,
            'created_at' => now(),
            'username' => $randomName,
        ];

        // ================= REFERRAL LOGIC =================

        $campaignToIncrement = null;

        if ($request->filled('referral_code')) {

            $refCode = $request->referral_code;

            // 👉 USER referral
            $referrerUser = DB::table('users')
                ->where('referral_code', $refCode)
                ->first();

            if ($referrerUser) {

                $data['referral_user_id'] = $referrerUser->id;

            } else {

                // 👉 CAMPAIGN referral
                $campaign = DB::table('campaigns')
                    ->where('unique_code', $refCode)
                    ->first();

                if ($campaign) {

                    $data['campaign_id'] = $campaign->id;
                    $data['campaign_user_id'] = $campaign->user_id;
                    $data['referral_user_id'] = $campaign->user_id;

                    $campaignToIncrement = $campaign->id;
                }
            }

        } else {
            $data['referral_user_id'] = 2;
        }

        // ================= INSERT OR UPDATE =================

        $existingUser = DB::table('users')
            ->where('mobile', $request->mobile)
            ->first();

        if ($existingUser) {

            // 👉 UPDATE
            DB::table('users')
                ->where('id', $existingUser->id)
                ->update($data);

            $userId = $existingUser->id;
            $type = 'update';

        } else {

            // 👉 INSERT
            $userId = DB::table('users')->insertGetId($data);
            $type = 'register';
        }

        // ✅ Increment campaign count (only on new user)
        // if (!$existingUser && $campaignToIncrement) {
        //     DB::table('campaigns')
        //         ->where('id', $campaignToIncrement)
        //         ->increment('registration_count');
        // }

        // ✅ Create Token
        $user = User::find($userId);
        $token = $user->createToken('UserApp')->plainTextToken;

        // ✅ Save Token
        DB::table('users')->where('id', $userId)->update([
            'login_token' => $token
        ]);

        return response()->json([
            'status' => 200,
            'message' => $existingUser ? 'User Registration successfully' : 'Registration successful',
            'data' => [
                'userId' => $userId,
                'token' => $token,
                'type' => $type
            ]
        ], 200);

    // } catch (\Throwable $e) {

    //     Log::error('Registration Error:', [
    //         'error' => $e->getMessage()
    //     ]);

    //     return response()->json([
    //         'status' => 500,
    //         'message' => 'Something went wrong, please try again later.'
    //     ], 500);
    // }
}

// public function register(Request $request)
// {
//     // Step 1: Validate Input
//     $validator = Validator::make($request->all(), [
//         'email' => 'required|email|unique:users,email',
//         'country_code' => 'required',
//         'mobile' => 'required|numeric|digits:10|unique:users,mobile',
//         'password' => 'required|min:8',
//         'password_confirmation' => 'required|min:8|same:password',
//         'referral_code' => 'nullable|string|exists:users,referral_code',
//     ]);

//     if ($validator->fails()) {
//         return response()->json([
//             'status'  => 400,
//             'message' => $validator->errors()->first()
//         ], 200);
//     }

//     // Step 2: Generate Required Data
//     $randomName = 'User_' . strtoupper(Str::random(5));
//     //$randomReferralCode = 'ZUP' . strtoupper(Str::random(6));
//     $randomReferralCode =$this-> generateNumericCode(13);

//     $baseUrl = URL::to('/');
//   // $uid = $this->generateSecureRandomString(6); // Custom method for UID
// 	$uid = $this->NumericCode(8);
//     $randomNumber = rand(1, 20);
//     // Step 3: Prepare User Data
//     $data = [
//         'username'       => $randomName,
//         'u_id'           => $uid,
//         'mobile'         => $request->mobile,
//         'email'          => $request->email,
//         'password'       => $request->password,
//          'userimage'      => $baseUrl . "/uploads/profileimage/" . $randomNumber . ".png",
//         'status'         => 1,
//         'referral_code'  => $randomReferralCode,
//         'wallet'         => 0,
//         'country_code'   => $request->country_code,
//         'created_at'     => now(),
//         'updated_at'     => now(),
//     ];

//     // Step 4: Add Referrer
//     if ($request->filled('referral_code')) {
//         $referrer = DB::table('users')->where('referral_code', $request->referral_code)->first();
//         $data['referral_user_id'] = $referrer ? $referrer->id : null;
//     } else {
//         $data['referral_user_id'] = 1;
//     }

//     // Step 5: Insert User via DB Facade
//     try {
//         $userId = DB::table('users')->insertGetId($data);

//         // Step 6: Retrieve User model instance to create token
//         $user = User::find($userId);
//         $token = $user->createToken('UserApp')->plainTextToken;

//         return response()->json([
//             'status'  => 200,
//             'message' => 'Registration successful',
//             'data'    => [
//                 'userId' => $userId,
//                 'token'  => $token
//             ]
//         ], 200);
//     } catch (\Exception $e) {
//         Log::error('Registration Error:', ['error' => $e->getMessage()]);

//         return response()->json([
//             'status'  => 400,
//             'message' => 'Internal Server Error',
//             'error'   => $e->getMessage()
//         ], 400);
//     }
// }

//// Bank Details List by userid ///

 public function Account_view(Request $request){
       
         $validator = Validator::make($request->all(), [
            'user_id' => 'required',
        ]);

        $validator->stopOnFirstFailure();
	
    if($validator->fails()){
         $response = [
                        'status' => 400,
                       'message' => $validator->errors()->first()
                      ]; 
		
		return response()->json($response,400);
		
    }
    
    $userid=$request->user_id;
       $accountDetails = DB::select("SELECT * FROM `account_details` WHERE user_id=$userid
");



        if ($accountDetails) {
            $response = [
                'message' => 'Successfully',
                'status' => 200,
                'data' => $accountDetails
            ];

            return response()->json($response,200);
        } else {
            return response()->json(['message' => 'No record found','status' => 400,
                'data' => []], 400);
        }
    }
///// Add Bank details ///
// public function add_account(Request $request)
// {
//     if ($request->isMethod('post')) {
//         // Validate the input
//         $validator = Validator::make($request->all(), [
//             'user_id' => 'required',
//             'name' => 'required',
//             'account_number' => 'required',
//             'ifsc_code' => 'required',
//             'bank_name' => 'required',
//             'branch' => 'required'
//         ]);

//         $validator->stopOnFirstFailure();

//         if ($validator->fails()) {
//             return response()->json([
//                 'status' => 400,
//                 'message' => $validator->errors()->first()
//             ], 400);
//         }

//         // Fetch user account details
//         $user_id = $request->user_id;
//         $user_details = DB::table('account_details')->where('user_id', $user_id)->first();

//         // Check if user details exist
//         if (empty($user_details)) {
//             // Insert new account details
//             $data = [
//                 'user_id' => $request->input('user_id'),
//                 'name' => $request->input('name'),
//                 'account_number' => $request->input('account_number'),
//                 'ifsc_code' => $request->input('ifsc_code'),
//                 'bank_name' => $request->input('bank_name'),
//                 'branch' => $request->input('branch'),
//                 'status' => 1,
//                 'created_at' => now(),
//                 'updated_at' => now(),
//             ];
//             $inserted = DB::table('account_details')->insert($data);

//             if ($inserted) {
//                 return response()->json([
//                     'status' => 200,
//                     'message' => 'Account added successfully!'
//                 ], 200);
//             } else {
//                 return response()->json([
//                     'status' => 400,
//                     'message' => 'Internal error!'
//                 ], 400);
//             }
//         } else {
//             // Update existing account details
//             $updated = DB::table('account_details')
//                 ->where('user_id', $user_id)
//                 ->update([
//                     //  'upi_id' => $upi_id,
//                     'updated_at' => now()
//                     ]);

//             if ($updated) {
//                 return response()->json([
//                     'status' => 200,
//                     'message' => 'Account updated successfully!'
//                 ], 200);
//             } else {
//                 return response()->json([
//                     'status' => 400,
//                     'message' => 'Internal error during update!'
//                 ], 400);
//             }
//         }
//     } else {
//         return response()->json(['error' => 'Unsupported request method'], 405);
//     }
// }

public function add_account(Request $request)
{
    if ($request->isMethod('post')) {

        // Validate input
        $validator = Validator::make($request->all(), [
            'user_id' => 'required|integer',
            'name' => 'required|string',
            'account_number' => 'required|string|unique:account_details,account_number',
            'ifsc_code' => 'required|string',
            'bank_name' => 'required|string',
            'branch' => 'required|string'
        ]);

        $validator->stopOnFirstFailure();

        if ($validator->fails()) {
            return response()->json([
                'status' => 400,
                'message' => $validator->errors()->first()
            ], 400);
        }

        $user_id = $request->input('user_id');

        // Check if user already has an account
        $existingAccount = DB::table('account_details')
            ->where('user_id', $user_id)
            ->first();

        if ($existingAccount) {
            return response()->json([
                'status' => 409,
                'message' => 'You cannot add more than one account.'
            ], 409);
        }

        // Prepare insert data
        $data = [
            'user_id' => $user_id,
            'name' => $request->input('name'),
            'account_number' => $request->input('account_number'),
            'ifsc_code' => $request->input('ifsc_code'),
            'bank_name' => $request->input('bank_name'),
            'branch' => $request->input('branch'),
            'status' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ];
    
        // Insert new account
        $inserted = DB::table('account_details')->insert($data);

        if ($inserted) {
            return response()->json([
                'status' => 200,
                'message' => 'Account added successfully!'
            ], 200);
        } else {
            return response()->json([
                'status' => 500,
                'message' => 'Internal error!'
            ], 500);
        }

    } else {
        return response()->json([
            'error' => 'Unsupported request method'
        ], 405);
    }
}



	
	public function withdraw_ethrum(Request $request)
{
    $validator = Validator::make($request->all(), [
        'user_id' => 'required|integer',
        'ethereum_account_id' => 'required|string',
        'amount' => 'required|numeric',
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first(),
        ], 400);
    }

    $userId = $request->input('user_id');
    $ethereumAccountId = $request->input('ethereum_account_id');
    $amount = $request->input('amount');

    // Get user wallet balance
    $user = DB::table('users')->where('id', $userId)->first();

    if (!$user) {
        return response()->json([
            'status' => 400,
            'message' => 'User not found.',
        ], 400);
    }

    $userWallet = $user->wallet;

    if ($userWallet >= $amount) {
        $inserted = DB::table('withdraw_histories')->insert([
            'user_id' => $userId,
            'amount' => $amount,
            'ethereum_account_id' => $ethereumAccountId,
            'status' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if ($inserted) {
            DB::table('users')
                ->where('id', $userId)
                ->decrement('wallet', $amount);

            return response()->json([
                'status' => 200,
                'message' => 'Withdraw Request Successfully!',
            ], 200);
        } else {
            return response()->json([
                'status' => 400,
                'message' => 'Internal error while inserting.',
            ], 400);
        }
    } else {
        return response()->json([
            'status' => 400,
            'message' => 'Insufficient wallet balance.',
        ], 400);
    }
}

////// Withdraw /////
public function withdraw(Request $request)
{
    $validator = Validator::make($request->all(), [
        'user_id' => 'required',
        'account_id' => 'required',
        'type' => 'required',
        'amount' => 'required|numeric'
    ]);

    $validator->stopOnFirstFailure();
    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ], 400);
    }

    $userid = $request->input('user_id');
    $accountid = $request->input('account_id');
    $amount = $request->input('amount');
    $type = $request->input('type');

    $rand = rand(11111, 99999);
    $date = date('Ymd');
    $orderid = $date . $rand;

    // Get user manually via query
    $user = DB::table('users')->where('id', $userid)->first();
    $account_type = $user->account_type;

    if ($account_type == 1) {
        // ✅ Check if winning_wallet has sufficient balance
        if ($user->winning_wallet < $amount) {
            return response()->json([
                'status' => 400,
                'message' => 'Insufficient winning wallet balance.'
            ], 400);
        }

        // ✅ Deduct only from winning_wallet
       // DB::select("UPDATE `users` SET `winning_wallet`=`winning_wallet`-$amount WHERE id=$userid");
		
		DB::update("UPDATE `users` SET `winning_wallet` = `winning_wallet` - ?, `wallet` = `wallet` - ? WHERE id = ?", [$amount, $amount, $userid]);


        DB::table('withdraw_histories')->insert([
            'user_id' => $userid,
            'amount' => $amount,
            'account_id' => $accountid,
            'type' => $type,
            'order_id' => $orderid,
            'status' => 2,
            'typeimage' => "https://root.veronova.co.in/uploads/fastpay_image.png",
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'status' => 200,
            'message' => 'Withdraw Successfully ..!'
        ], 200);
    }

    // Check if user has added account
    $user_details = DB::table('account_details')->where('user_id', $userid)->first();
    if ($user_details == null) {
        return response()->json([
            "status" => "400",
            "message" => "First please add a bank account."
        ], 200);
    }

    // Limit to three withdrawals per day
    $withdrawCount = DB::table('withdraw_histories')
        ->where('user_id', $userid)
        ->whereDate('created_at', now())->count();

    if ($withdrawCount >= 3) {
        return response()->json([
            'status' => 400,
            'message' => 'You can only withdraw 3 times in a day.'
        ], 200);
    }

    $date = date('YmdHis');
    if ($amount >= 110 && $amount <= 50000) {
        $wallet = DB::select("SELECT `wallet`,`recharge`,`first_recharge`,`winning_wallet` FROM `users` WHERE id=$userid");
        $user_wallet = $wallet[0]->wallet;
        $user_recharge = $wallet[0]->recharge;
		//dd($user_recharge);
        $first_recharge = $wallet[0]->first_recharge;
        $winning_wallet = $wallet[0]->winning_wallet;
     
        if ($user_recharge == 0) {
            if ($first_recharge == 1) {
                // ✅ Check winning_wallet only
                if ($winning_wallet >= $amount) {

                    $data = DB::table('withdraw_histories')->insert([
                        'user_id' => $userid,
                        'amount' => $amount,
                        'account_id' => $accountid,
                        'type' => $type,
                        'order_id' => $orderid,
                        'status' => 1,
                        'typeimage' => "https://root.veronova.co.in/uploads/fastpay_image.png",
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    // ✅ Deduct only from winning_wallet
                    
				//DB::select("UPDATE `users` SET `winning_wallet`=`winning_wallet`-$amount WHERE id=$userid");
					DB::update("UPDATE `users` SET `winning_wallet` = `winning_wallet` - ?, `wallet` = `wallet` - ? WHERE id = ?", [$amount, $amount, $userid]);

                    if ($data) {
                        return response()->json([
                            'status' => 200,
                            'message' => 'Withdraw Request Successfully ..!'
                        ], 200);
                    } else {
                        return response()->json([
                            'status' => 400,
                            'message' => 'Internal error..!'
                        ], 200);
                    }

                } else {
                    return response()->json([
                        'status' => 400,
                        'message' => 'Insufficient winning wallet balance..!'
                    ], 200);
                }
            } else {
                return response()->json([
                    'status' => 400,
                    'message' => 'First recharge is mandatory..!'
                ], 200);
            }
        } else {
            return response()->json([
                'status' => 400,
                'message' => 'You need to bet your deposited amount before withdrawing.'
            ], 200);
        }
    } else {
        return response()->json([
            'status' => 400,
            'message' => 'Minimum withdrawal is 110 and maximum is 5000.'
        ], 200);
    }
}

///// Gift Claim List ////

 public function claim_list(Request $request)
       {
       
         $validator = Validator::make($request->all(), [
            'userid' => 'required',
        ]);

        $validator->stopOnFirstFailure();
	
    if($validator->fails()){
         $response = [
                        'status' => 400,
                       'message' => $validator->errors()->first()
                      ]; 
		
		return response()->json($response,400);
		
    }
    
    $userid=$request->userid;
       $accountDetails = DB::select("SELECT * FROM `gift_claim` WHERE `userid`=$userid order by id DESC");



        if ($accountDetails) {
            $response = [
                'message' => 'Successfully',
                'status' => 200,
                'data' => $accountDetails
            ];

            return response()->json($response,200);
        } else {
            return response()->json(['message' => 'No record found','status' => 400,
                'data' => []], 400);
        }
    }

//// Gift Card Apply ///

public function giftCartApply(Request $request)
{
	
    $validator = Validator::make($request->all(), [
        'userid' => 'required',
        'code' => 'required',
    ]);

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ], 400);
    }

    $userid = $request->userid;
    $code = $request->code;

    $gift = DB::table('gift_cart')
        ->where('code', $code)
        ->where('status', 1)
        ->first();

    if (!$gift) {
        return response()->json([
            'status' => 400,
            'message' => "Invalid Gift Code!"
        ], 400);
    }

    // Check if user already claimed
    $alreadyClaimed = DB::table('gift_claim')
        ->where('userid', $userid)
        ->where('gift_code', $code)
        ->exists();

    if ($alreadyClaimed) {
        return response()->json([
            'status' => 400,
            'message' => "You have already availed this offer!"
        ], 400);
    }

	$today = Carbon::today()->toDateString();
    $claimedTodayCount = DB::table('gift_claim')
        ->where('userid', $userid)
        ->whereDate('created_at', $today)
        ->count();
    if ($claimedTodayCount > 0) {
        return response()->json([
            'status' => false,
            'message' => 'You can only claim the gift once per day.'
        ], 200);
    }
	
    // Gift availability
    if ($gift->availed_num >= $gift->number_people) {
        return response()->json([
            'status' => 400,
            'message' => "No longer available this offer."
        ], 400);
    }

    // ✅ Check today's total deposited amount
    $today = date('Y-m-d');
    $todayDeposit = DB::table('payins')
        ->where('user_id', $userid)
        ->where('status', 2)
        ->whereDate('created_at', $today)
        ->sum('cash');

    if ($todayDeposit < $gift->deposit_amount) {
        return response()->json([
            'status' => 400,
            'message' => "You are not eligible! Deposit ₹" . $gift->deposit_amount . " today to claim the gift."
        ], 400);
    }

    // ✅ Add gift to wallet
    $giftAmount = $gift->amount;
    $datetime = now();

    DB::table('users')
        ->where('id', $userid)
        ->update([
            'wallet' => DB::raw("wallet + $giftAmount"),
            'bonus' => DB::raw("bonus + $giftAmount")
        ]);

    DB::table('gift_cart')
        ->where('id', $gift->id)
        ->update([
            'availed_num' => DB::raw("availed_num + 1")
        ]);

    DB::table('gift_claim')->insert([
        'userid' => $userid,
        'gift_code' => $code,
        'amount' => $giftAmount,
        'created_at' => $datetime,
        'datetime' => $datetime,
    ]);

    DB::table('wallet_history')->insert([
        'userid' => $userid,
        'amount' => $giftAmount,
        'subtypeid' => 20,
        'created_at' => $datetime,
        'updated_at' => $datetime
    ]);

    return response()->json([
        'status' => 200,
        'message' => "Gift of ₹$giftAmount added to your wallet successfully!"
    ], 200);
}


///// FeedBack ////

 public function feedback(Request $request)
{
 
        $validator = Validator::make($request->all(), [
            'userid' => 'required',
            'description' => 'required',
        ]);

        $validator->stopOnFirstFailure();

        if ($validator->fails()) {
            $response = [
                'status' => 400,
                'message' => $validator->errors()->first()
            ];

            return response()->json($response,400);
        }

        $data = array(
            'userid' => $request->input('userid'),
            'description' => $request->input('description'),
            'status' => 1,
            'created_at' => now(),
             'updated_at' => now(),
        );

        $data1 = DB::table('feedbacks')->insert($data);

        if ($data1) {
            $response = [
                'message' => 'Successfully',
                'status' => 200,
                'data' => $data1
            ];

            return response()->json($response,200);
        } else {
            return response()->json(['message' => 'Failed','status' => 400], 400);
        }
}

////Pay Modes ////


public function pay_modes(Request $request)
{
    if ($request->isMethod('get')) {
        $userid = $request->input('userid');
		$type = $request->input('type');
		if($type == ''){
        $check = DB::table('users')->where('first_recharge', '1')->where('id', $userid)->first();

        $pay_modes = DB::table('pay_modes')->where('status', '1')->get();

        if ($pay_modes->isNotEmpty()) {
            $response['msg'] = "Successfully";
            $response['data'] = $pay_modes->toArray();

            if ($check && $check->first_recharge == '1') {
                $response['minimum'] = 500;
                $response['status'] = "200";
            } else {
                $response['minimum'] = 100;
                $response['status'] = "400";
            }

            return response()->json($response);
        } else {
            // If no data is found, set an appropriate response
            $response['msg'] = "No record found";
            $response['status'] = "400";
            return response()->json($response);
        }
	 } else {
        $check = DB::table('users')->where('first_recharge', '1')->where('id', $userid)->first();

        $pay_modes = DB::table('pay_modes')->where('status', '1')->where('type', $type)->get();

        if ($pay_modes->isNotEmpty()) {
            $response['msg'] = "Successfully";
            $response['data'] = $pay_modes->toArray();

            if ($check && $check->first_recharge == '1') {
                $response['minimum'] = 500;
                $response['status'] = "200";
            } else {
                $response['minimum'] = 100;
                $response['status'] = "400";
            }

            return response()->json($response);
        } else {
            // If no data is found, set an appropriate response
            $response['msg'] = "No record found";
            $response['status'] = "400";
            return response()->json($response);
        }
    }
    } else {
        return response()->json(['error' => 'Unsupported request method'], 400);
    }
}

/// transaction_history_list Api ///
	public function transaction_history_list()
{
    $ids = [23,3,2,31,32,5,7,8,9,10,14,20,24,26,27,36,37,33,34,38,40];

    $subtype = DB::select("
        SELECT `id`, `name` 
        FROM `subtype` 
        WHERE id IN (" . implode(',', $ids) . ")
    ");

    if ($subtype) {
        $response = [
            'message' => 'Successfully',
            'status' => 200,
            'data' => $subtype
        ];
        return response()->json($response);
    } else {
        return response()->json([
            'message' => 'No record found',
            'status' => 400,
            'data' => []
        ], 400);
    }
}

	
      public function transaction_history_list_old()
      {
      $subtype=DB::select("SELECT `id`,`name` FROM `subtype` WHERE 1");

        if ($subtype) {
            $response = [
                'message' => 'Successfully',
                'status' => 200,
                'data' => $subtype
            ];

            return response()->json($response);
        } else {
            return response()->json(['message' => 'No record found','status' => 400,
                'data' => []], 400);
        }
    }
    
////// Result Api ////
public function transaction_history(Request $request)
{
    $validator = Validator::make($request->all(), [
        'userid' => 'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()]);
    }
    
    $userid = $request->userid;
    $subtype = $request->subtypeid;
  
     //$offset = $request->offset ?? 0;
    $from_date = $request->created_at;
    //$to_date = $request->created_at;
    //$status = $request->status;

// $status=DB::SELECT("SELECT `status` FROM `users` WHERE id=$userid"); 
// //dd($status);
// 	$ddd=$status[0]->status;
// 	//dd($ddd);
// if($ddd == 1){hea
    $where = [];

    if (!empty($userid)) {
        $where[] = "wallet_history.`userid` = '$userid'";
    }

    if (!empty($from_date)) {
		$newDateString = date("Y-m-d", strtotime($from_date));
		
        $where[] = "DATE(`wallet_history`.`created_at`) = '$newDateString'";
		
    }
    if (!empty($subtype)) {
        $where[] = "`wallet_history`.`subtypeid` = '$subtype'";
    }
    //
    //
    
    $query = "
       SELECT subtype.name as type , wallet_history.amount as amount, wallet_history.created_at as datetime FROM `wallet_history` LEFT JOIN `subtype` on wallet_history.subtypeid = subtype.id
    ";

    if (!empty($where)) {
        $query .= " WHERE " . implode(" AND ", $where);
    }

    $query .= " ORDER BY wallet_history.id DESC";

    $results = DB::select($query);
    //dd($results);
if(!empty($results)){
    return response()->json([
        'status' => 200,
        'message' => 'Data found',
        'data' => $results
    ]);
}else{
     return response()->json(['message' => 'No record found','status' => 400,
                'data' => []], 400);
}
// }else{
    
//  $response['message'] = "User block by admin..!";
//                 $response['status'] = "401";
//                 return response()->json($response,401);
    
// }
    
}

public function image_all(){
      
         $user = DB::select("SELECT `image` FROM `all_images`
");
          if($user){
          $response =[ 'success'=>"200",'data'=>$user,'message'=>'Successfully'];return response ()->json ($response,200);
      }
      else{
       $response =[ 'success'=>"400",'data'=>[],'message'=>'Not Found Data'];return response ()->json ($response,400); 
      } 
    }

      public function forget_pass(Request $request)
      {
		
		   $validator = Validator::make($request->all(), [
          'mobile' => ['required', 'string', 'regex:/^\d{10}$/','exists:users,mobile'], // Ensure 10 digits
	      'password' => 'required|string|min:6'
    ]);

	    $validator->stopOnFirstFailure();
	   
    if($validator->fails()){
		
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ]);
    }
	   
			
	  $user = DB::table('users')->where('mobile',$request->mobile)
		  ->update([
		   'password'=>$request->password
		  ]);
	  
	   return response()->json([
	      'status'=>200,
		  'message'=>'Password reset successfully.',
	   ]);
	   
	   
		
	}

public function profile(Request $request) 
{
    $ldate = new DateTime('now');
  
    $uid = $request->id;

    if (empty($uid)) {
        return response()->json([
            'status' => 400,
            'message' => 'ID is Required'
        ]);
    }
    
    

    // Fetch user data with the necessary join and data
    $data = DB::table('users as u')
        ->select('u.*', 'a1.longtext as minimum_withdraw', 'a2.longtext as maximum_withdraw')
        ->leftJoin('admin_settings as a1', function ($join) {
            $join->on('a1.id', '=', DB::raw(15));
        })
        ->leftJoin('admin_settings as a2', function ($join) {
            $join->on('a2.id', '=', DB::raw(16));
        })
        ->where('u.id', $uid)
        ->limit(1)
        ->first();

    if ($data === null) {
        return response()->json([
            'status' => 400,
            'message' => 'No data found'
        ]);
    }

    // If the user is not blocked (status is 1)
    $status = $data->status;
    if ($status == 1) {

        // Process the wallets
        $thirdpartywallet = isset($data->third_party_wallet) ? $data->third_party_wallet : 0;
        $main_wallet = isset($data->wallet) ? $data->wallet : 0;
        $total_wallet = $thirdpartywallet + $main_wallet;

        // Create the response data array
        $responseData = [
            'id' => $data->id,
            'mobile' => $data->mobile,
            'email' => $data->email,
            'username' => $data->username,
            'userimage' => $data->userimage,
            'recharge' => $data->recharge,
            'u_id' => $data->u_id,
            'login_token' => $data->login_token,
            'referral_code' => $data->referral_code,
            'illegal_count' => $data->illegal_count,
            'wallet' => $main_wallet,
            'third_party_wallet' => $thirdpartywallet,
            'total_wallet' => $total_wallet,
            'winning_amount' => $data->winning_wallet,
            'minimum_withdraw' => $data->minimum_withdraw,
            'maximum_withdraw' => $data->maximum_withdraw,
            'last_login_time' => $ldate->format('Y-m-d H:i:s'),
            'apk_link' => "https://root.veronova.co.in/bdgcossino.apk",
            //'referral_code_url' => "https://root.globalbet24.club/registerwithref/" . $data->referral_code,
			'referral_code_url' => "https://veronova.co.in/register/" . $data->referral_code,
            'aviator_link' => "https://aviatorudaan.com/",
            'aviator_event_name' => "bigcasino_aviator",
            'wingo_socket_url' => "https://aviatorudaan.com/",
            'wingo_socket_event_name' => "bigcasino_wingo",
            'status' => "1",
            'type' => "0"
        ];

        return response()->json([
            'success' => 200,
            'message' => 'Data found',
            'data' => $responseData
        ]);
    } else {
        // If the user is blocked
        return response()->json([
            'status' => 401,
            'message' => 'User blocked by admin'
        ]);
    }
}


public function Status_list(){
      
      $status= array(
           array(
        'id' => '0',
        'name' => 'All'
    ),
    array(
        'id' => '1',
        'name' => 'Processing'
    ),
    array(
        'id' => '2',
        'name' => 'Completed'
    ),
    array(
        'id' => '3',
        'name' => 'Reject'
    )
);
      
        //  $status = DB::select("SELECT `id`,`name` FROM `status` WHERE 1");
          if($status){
          $response =[ 'success'=>"200",'data'=>$status,'message'=>'Successfully'];return response ()->json ($response,200);
      }
      else{
       $response =[ 'success'=>"400",'data'=>[],'message'=>'Not Found Data'];return response ()->json ($response,400); 
      } 
    }

 public function deposit_history(Request $request)
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
    $status = $request->status;
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


public function withdraw_history(Request $request)
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
    $status = $request->status;
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


////notification ////

 public function notification()
       {
       

       $notification = DB::select("SELECT `name`,`disc` FROM `notifications` WHERE `status`=1
");



        if ($notification) {
            $response = [
                'message' => 'Successfully',
                'status' => 200,
                'data' => $notification
            ];

            return response()->json($response,200);
        } else {
            return response()->json(['message' => 'No record found','status' => 400,
                'data' => []], 400);
        }
    }

      public function Privacy_Policy()
       {
      
       $privacyPolicy = Setting::where('id', 1)
          ->where('status', 1)
          ->select('name', 'description')
          ->first();



        if ($privacyPolicy) {
            $response = [
                'message' => 'Successfully',
                'status' => 200,
                'data' => $privacyPolicy
            ];

            return response()->json($response,200);
        } else {
            return response()->json(['message' => 'No record found','status' => 400,
                'data' => []], 400);
        }
    }

	/// About us Api ///
	
      public function about_us(Request $request)
      {
		  $validator = Validator::make($request->all(), [
        'type' => 'required|numeric'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        $response = [
            'status' => 400,
            'message' => $validator->errors()->first()
        ];
        return response()->json($response, 400);
    }

    $type = $request->type;
 
		  
		  
        $about_us = DB::select("SELECT `name`,`description` FROM `settings` WHERE `type`=$type;
");

        if ($about_us) {
            $response = [
                'message' => 'Successfully',
                'status' => 200,
                'data' => $about_us
            ];

            return response()->json($response);
        } else {
            return response()->json(['message' => 'No record found', 'status' => 400,
                'data' => []], 400);
        }
    }
	
	////Customer Service /////
	  public function customer_service()
      {
        $customer_service = DB::select("SELECT `name`, `Image`, `link`
FROM `customer_services`
WHERE `status` = 1");


        if ($customer_service) {
            $response = [
                'message' => 'Successfully',
                'status' => 200,
                'data' => $customer_service
            ];

            return response()->json($response);
        } else {
            return response()->json(['message' => 'No record found', 'status' => 400,
                'data' => []], 400);
        }
    }
	
	
	/// Contact us Api ///
	
      public function contact_us()
      {
        $contact = Setting::where('id', 4)
             ->where('status', 1)
             ->select('name', 'description', 'link')
             ->first();


        if ($contact) {
            $response = [
                'message' => 'Successfully',
                'status' => 200,
                'data' => $contact
            ];

            return response()->json($response);
        } else {
            return response()->json(['message' => 'No record found','status' => 400,
                'data' => []], 400);
        }
    }
	
    /// Support Api ///
    	
          public function support()
          {
            $support = Setting::where('id', 5)
                      ->where('status', 1)
                      ->select('name', 'link')
                      ->first();
    
    
            if ($support) {
                $response = [
                    'message' => 'Successfully',
                    'status' => 200,
                    'data' => $support
                ];
    
                return response()->json($response);
            } else {
                return response()->json(['message' => 'No record found','status' => 400,
                    'data' => []], 400);
            }
        }
    	
    	// profile Update Api //
    public function update_profile(Request $request)
    {
         $validator = Validator::make($request->all(), [
        'id' => 'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        $response = [
            'status' => 400,
            'message' => $validator->errors()->first()
        ];
        return response()->json($response, 400);
    }
        
        $id = $request->id;
        
        $value = User::findOrFail($id);
        $status=$value->status;
        
        	if($status == 1)
        {
        if (!empty($request->username)) {
            $value->username = $request->username;
        }
        
        if (!empty($request->userimage) && $request->userimage != "null") {
            $value->userimage = $request->userimage;
        }
    
        // Save the changes
        $value->save();
    
        $response = [
            'status' => 200,
            'message' => "Successfully updated"
        ];
    
        return response()->json($response, 200);
        }else{
             $response['message'] = "User block by admin..!";
                    $response['status'] = "401";
                    return response()->json($response,401);
        }
    }
    
    
    ///// main wallet transfer //
    
    public function main_wallet_transfer(Request $request)
    {
        $request->validate([
            'id' => 'required|exists:users,id'
        ]);
        
        $id = $request->id;
        
        $user = User::findOrFail($id);
        $status = $user->status;
        $main_wallet = $user->wallet;
        $thirdpartywallet = $user->third_party_wallet;
        $add_main_wallet = $main_wallet + $thirdpartywallet;
        
        if ($status == 1) {
            $user->wallet = $add_main_wallet;
            $user->third_party_wallet = 0;
            $user->save();
    
            $response = [
                'status' => 200,
                'message' => "Wallet transfer Successfully ....!"
            ];
    
            return response()->json($response, 200);
        } else {
            $response = [
                'status' => 401,
                'message' => "User blocked by admin..!"
            ];
            return response()->json($response, 401);
        }
    }
	
	 public function total_bet_details_old(Request $request)
{
    // Validate incoming data
    $validator = Validator::make($request->all(), [
        'userid' => 'required|exists:users,id',
        'type' => 'required|in:1,2,3,4'
		
    ]);

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ], 200);
    }

    $userid = $request->userid;
    $type = $request->type;
	
	

    // Prepare the SQL query based on the 'type' parameter
    switch ($type) {
        case 1:
            // For today
            $betDetails = DB::select("SELECT 
                                        COALESCE(SUM(`amount`), 0) AS total_bet_amount, 
                                        COALESCE(COUNT(`id`), 0) AS total_bet_count, 
                                        COALESCE(SUM(`win_amount`), 0) AS total_win_amount 
                                      FROM `bets` 
                                      WHERE `userid` = ? AND DATE(`created_at`) = CURDATE()", [$userid]);
            break;

        case 2:
            // For yesterday
            $betDetails = DB::select("SELECT 
                                        COALESCE(SUM(`amount`), 0) AS total_bet_amount, 
                                        COALESCE(COUNT(`id`), 0) AS total_bet_count, 
                                        COALESCE(SUM(`win_amount`), 0) AS total_win_amount 
                                      FROM `bets` 
                                      WHERE `userid` = ? AND DATE(`created_at`) = CURDATE() - INTERVAL 1 DAY", [$userid]);
            break;

        case 3:
            // For the past week
            $betDetails = DB::select("SELECT 
                                        COALESCE(SUM(`amount`), 0) AS total_bet_amount, 
                                        COALESCE(COUNT(`id`), 0) AS total_bet_count, 
                                        COALESCE(SUM(`win_amount`), 0) AS total_win_amount 
                                      FROM `bets` 
                                      WHERE `userid` = ? AND DATE(`created_at`) >= CURDATE() - INTERVAL 1 WEEK", [$userid]);
            break;

        case 4:
            // For the past month
            $betDetails = DB::select("SELECT 
                                        COALESCE(SUM(`amount`), 0) AS total_bet_amount, 
                                        COALESCE(COUNT(`id`), 0) AS total_bet_count, 
                                        COALESCE(SUM(`win_amount`), 0) AS total_win_amount 
                                      FROM `bets` 
                                      WHERE `userid` = ? AND DATE(`created_at`) >= CURDATE() - INTERVAL 1 MONTH", [$userid]);
            break;

        default:
            return response()->json([
                'status' => 400,
                'message' => 'Invalid type provided'
            ], 200);
    }
	
	
	$grand_total=$betDetails[0]->total_bet_amount;

    // If no bets found, send response with 0 values
    if (empty($betDetails)) {
        return response()->json([
            'status' => 200,
            'message' => 'No bets found',
            'lottery_data' => [
                'total_bet_amount' => 0,
                'total_bet_count' => 0,
                'total_win_amount' => 0
            ]
        ], 200);
    }

    // Return the bet details
    return response()->json([
        'status' => 200,
        'message' => 'Bet details fetched successfully',
		'grand_total' => $grand_total,
        'lottery_data' => $betDetails[0] // Assuming only one record is returned
		
    ], 200);
}



    
public function total_bet_details(Request $request)
{
    // Validate incoming data
    $validator = Validator::make($request->all(), [
        'userid' => 'required|exists:users,id',
        'type' => 'required|in:1,2,3,4'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ], 200);
    }

    $userid = $request->userid;
    $type = $request->type;

    // Date filter
    $dateCondition = '';
    switch ($type) {
        case 1: // today
            $dateCondition = "DATE(`created_at`) = CURDATE()";
            break;
        case 2: // yesterday
            $dateCondition = "DATE(`created_at`) = CURDATE() - INTERVAL 1 DAY";
            break;
        case 3: // last 7 days
            $dateCondition = "DATE(`created_at`) >= CURDATE() - INTERVAL 7 DAY";
            break;
        case 4: // last 30 days
            $dateCondition = "DATE(`created_at`) >= CURDATE() - INTERVAL 1 MONTH";
            break;
    }

    $tables = [
        ['name' => 'Wingo Game', 'table' => 'bets', 'user_col' => 'userid', 'win_column' => 'win_amount'],
        ['name' => 'chicken Road Game', 'table' => 'chicken_bets', 'user_col' => 'user_id', 'win_column' => 'win_amount'],
        ['name' => 'aviator Game', 'table' => 'aviator_bet', 'user_col' => 'uid', 'win_column' => 'win']
    ];

    $results = [];
    $overall_count = 0;

    foreach ($tables as $entry) {
        $table = $entry['table'];
        $userCol = $entry['user_col'];
        $winCol = $entry['win_column'];

        $query = "SELECT 
                    COALESCE(SUM(`amount`), 0) AS total_bet_amount, 
                    COALESCE(COUNT(`id`), 0) AS total_bet_count, 
                    COALESCE(SUM(`$winCol`), 0) AS total_win_amount 
                  FROM `$table` 
                  WHERE `$userCol` = ? AND $dateCondition";

        $data = DB::select($query, [$userid]);

        $count = $data[0]->total_bet_amount ?? 0;
        $overall_count += $count;

        $results[] = [
            'game' => $entry['name'],
            'total_bet_amount' => $data[0]->total_bet_amount ?? 0,
            'total_bet_count' => $count,
            'total_win_amount' => $data[0]->total_win_amount ?? 0
        ];
    }

    return response()->json([
        'status' => 200,
        'message' => 'All bet details fetched successfully',
        'grand_total' => $overall_count,
        'data' => $results
    ]);
}


    
    ///// Change Password ////
    
    
    public function changePassword(Request $request)
    {
            $validator = Validator::make($request->all(), [
                'userid' => 'required',
                'old_password' => 'required',
                'new_password' => 'required',
                'confirm_password' => 'required|same:new_password',
            ]);
    
            $validator->stopOnFirstFailure();
    	   
        if($validator->fails()){
    		
            return response()->json([
                'status' => 400,
                'msg' => $validator->errors()->first()
            ],400);
        }
            $userid = $request->input('userid');
            $oldPassword = $request->input('old_password');
            $newPassword = $request->input('new_password');
    
            $user = User::find($userid);
    
            if (!$user) {
                return response()->json([
                    'msg' => 'User not found',
                    'status' => 404
                ], 404);
            }
    
            if ($oldPassword != $user->password) {
                return response()->json([
                    'msg' => 'Incorrect old password',
                    'status' => 400
                ], 400);
            }
    
            $user->password = $newPassword;
            $user->save();
    
            return response()->json([
                'msg' => 'Password changed successfully!',
                'status' => 200
            ], 200);
        
    }
    
    // 	Slider Image Policy //
	
  public function slider_image_view()
    {
       

       $slider = DB::select("SELECT sliders.title as name,sliders.image as image,sliders.activity_image as activity_image,activity_image_url as activity_image_url FROM `sliders` WHERE `status`=1");
           
  //dd($slider);
        if ($slider) {
            $response = [
                'message' => 'Successfully',
                'status' => 200,
                'data' => $slider
            ];

            return response()->json($response,200);
        } else {
            return response()->json(['message' => 'No record found','status' => 400,
                'data' => []], 400);
        }
    }
    
    public function attendance_List(Request $request)
    {
           $validator = Validator::make($request->all(), [
         'userid' => 'required|numeric'
    ]);

	
	$validator->stopOnFirstFailure();
	
    if($validator->fails()){
		
		        		     $response = [
                        'status' => 400,
                       'message' => $validator->errors()->first()
                      ]; 
		
		return response()->json($response,400);
		
    }
     $userid = $request->userid;  
       // $userid = $request->input('userid');
      $list = DB::select("SELECT COALESCE(COUNT(at_claim.`userid`),0) AS attendances_consecutively , COALESCE(SUM(attendances.attendance_bonus),0) AS accumulated FROM `at_claim` LEFT JOIN attendances ON at_claim.attendance_id =attendances.id WHERE at_claim.userid=$userid");

    $day = $list[0]->attendances_consecutively;
    $bonus_amt = $list[0]->accumulated;


        $attendanceList = DB::select("
   SELECT a.`id` AS `id`, a.`accumulated_amount` as accumulated_amount ,a.`attendance_bonus` as attendance_bonus, COALESCE(c.`status`, '1') AS `status`, COALESCE(a.`created_at`, 'Not Found') AS `created_at` FROM `attendances` a LEFT JOIN `at_claim` c ON a.`id` = c.`attendance_id` AND c.`userid` =$userid  ORDER BY a.`id` ASC LIMIT 7
");
  

        if (!empty($attendanceList)) {
            $response = [
                'message' => 'Attendance List',
                'status' => 200,
                'attendances_consecutively' => $day,
                'accumulated' =>$bonus_amt,
                'data' => $attendanceList,
            ];
            return response()->json($response);
        } else {
            return response()->json(['message' => 'Not found..!','status' => 400,
                'data' => []], 400);
        }
    }
    
    public function attendance_history(Request $request)
    {
           $validator = Validator::make($request->all(), [
         'userid' => 'required|numeric'
    ]);

	
	$validator->stopOnFirstFailure();
	
    if($validator->fails()){
		
		        		     $response = [
                        'status' => 400,
                       'message' => $validator->errors()->first()
                      ]; 
		
		return response()->json($response,400);
		
    }
     $userid = $request->userid;  
       // $userid = $request->input('userid');
      $list1 = DB::select("SELECT at_claim.id AS id,attendances.attendance_bonus AS attendance_bonus,at_claim.created_at FROM attendances LEFT JOIN at_claim ON at_claim.attendance_id=attendances.id WHERE at_claim.userid=$userid");

    
  

        if (!empty($list1)) {
            $response = [
                'message' => 'Attendance History',
                'status' => 200,
                'data' => $list1,
            ];
            return response()->json($response);
        } else {
            return response()->json(['message' => 'Not found..!','status' => 400,
                'data' => []], 400);
        }
    }
    
    //// Attendance Claim ////
    	public function attendance_claim_01_08_2025(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'userid' => 'required|numeric'
        ]);
    
        if ($validator->fails()) {
            $response = [
                'status' => 400,
                'message' => $validator->errors()->first()
            ];
            return response()->json($response, 400);
        }
    
        $userid = $request->userid;
    
        $results = DB::select("SELECT a.`id` AS `id`, a.`accumulated_amount` AS accumulated_amount, a.`attendance_bonus` AS attendance_bonus, COALESCE(c.`status`, '1') AS `status`, COALESCE(a.`created_at`, 'Not Found') AS `created_at`, u.`wallet` FROM `attendances` a LEFT JOIN `at_claim` c ON a.`id` = c.`attendance_id` AND c.`userid` = $userid JOIN `users` u ON u.id = $userid WHERE COALESCE(c.`status`, '1') = '1' ORDER BY a.`id` ASC LIMIT 7");
    //dd($results);
        if (count($results) > 0) {
            $bonus = $results[0]->attendance_bonus;
            $id = $results[0]->id;
            $accumulated_amount =$results[0]->accumulated_amount;
            $wallet = $results[0]->wallet;
    if($wallet >= $accumulated_amount){
            $count = DB::select("SELECT COALESCE(COUNT(userid), 0) AS userid FROM `at_claim` WHERE userid = $userid AND DATE(created_at) = CURDATE()");
		//dd($count);
        
       // dd($count);
            $datetime = now();
            if ($count[0]->userid == 0) {
				//dd("hii");
                DB::table('at_claim')->insert([      
                    'userid' => $userid,
                    'attendance_id' => $id,   
                    'status' => '0',
                    'created_at' => $datetime,
                    'updated_at' => $datetime    
                ]);
    
                // Assuming you have `$datetime` defined somewhere
                // DB::table('users')->where('id', $userid)->increment('wallet', $bonus);
             DB::table('users')
    ->where('id', $userid)
    ->increment('wallet', $bonus);  // Increments wallet by $bonus

DB::table('users')
    ->where('id', $userid)
    ->increment('recharge', $bonus);  // Increments recharge by $bonus



                DB::table('wallet_history')->insert([
                    'userid' => $userid,
                    'amount' => $bonus,
                    'subtypeid' => 14,
                    'created_at' => $datetime,
                    'updated_at' => $datetime
                ]);
    
                $response = [
                    'message' => 'Today Claimed Successfully ...!',
                    'status' => 200,
                ];
                return response()->json($response, 200);
            } else {
                return response()->json(['message' => 'Today You Have Already Claimed', 'status' => 400], 400); 
            }
    }else{
      return response()->json(['message' => 'You can not claim due to insufficient Balance...!', 'status' => 400], 400);  
    }
            
        } else {
            return response()->json(['message' => 'User Not Found!', 'status' => 400], 400);
        }
    }
	
	public function attendance_claim(Request $request)
{
    $validator = Validator::make($request->all(), [
        'userid' => 'required|numeric'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ], 400);
    }

    $userid = $request->userid;

    // ✅ Step 1: Check if user has a successful payin (status = 2) today
    $todayPayin = DB::table('payins')
        ->where('user_id', $userid)
        ->whereDate('created_at', now()->toDateString())
        ->where('status', 2)
        ->exists();

    if (!$todayPayin) {
        return response()->json([
            'message' => 'You can only claim after today Deposit.',
            'status' => 400
        ], 400);
    }

    // ✅ Step 2: Get attendance info
    $results = DB::select("
        SELECT 
            a.`id` AS `id`, 
            a.`accumulated_amount` AS accumulated_amount, 
            a.`attendance_bonus` AS attendance_bonus, 
            COALESCE(c.`status`, '1') AS `status`, 
            COALESCE(a.`created_at`, 'Not Found') AS `created_at`, 
            u.`wallet` 
        FROM `attendances` a 
        LEFT JOIN `at_claim` c 
            ON a.`id` = c.`attendance_id` AND c.`userid` = $userid 
        JOIN `users` u 
            ON u.id = $userid 
        WHERE COALESCE(c.`status`, '1') = '1' 
        ORDER BY a.`id` ASC 
        LIMIT 7
    ");

    if (count($results) > 0) {
        $bonus = $results[0]->attendance_bonus;
        $id = $results[0]->id;
        $accumulated_amount = $results[0]->accumulated_amount;
        $wallet = $results[0]->wallet;

        // ✅ Step 3: Check if user has sufficient balance
        if ($wallet >= $accumulated_amount) {

            // ✅ Step 4: Check if already claimed today
            $count = DB::table('at_claim')
                ->where('userid', $userid)
                ->whereDate('created_at', now()->toDateString())
                ->count();

            $datetime = now();

            if ($count == 0) {
                // ✅ Step 5: Insert claim
                DB::table('at_claim')->insert([
                    'userid' => $userid,
                    'attendance_id' => $id,
                    'status' => '0',
                    'created_at' => $datetime,
                    'updated_at' => $datetime
                ]);

                // ✅ Step 6: Update user wallet & recharge
                DB::table('users')->where('id', $userid)->increment('wallet', $bonus);
                DB::table('users')->where('id', $userid)->increment('recharge', $bonus);

                // ✅ Step 7: Insert wallet history
                DB::table('wallet_history')->insert([
                    'userid' => $userid,
                    'amount' => $bonus,
                    'subtypeid' => 14,
                    'created_at' => $datetime,
                    'updated_at' => $datetime
                ]);

                return response()->json([
                    'message' => 'Today Claimed Successfully ...!',
                    'status' => 200
                ], 200);
            } else {
                return response()->json([
                    'message' => 'Today You Have Already Claimed',
                    'status' => 400
                ], 400);
            }

        } else {
            return response()->json([
                'message' => 'You can not claim due to insufficient Balance...!',
                'status' => 400
            ], 400);
        }

    } else {
        return response()->json([
            'message' => 'User Not Found!',
            'status' => 400
        ], 400);
    }
}

    
public function activity_rewards(Request $request)
{
    date_default_timezone_set('Asia/Kolkata');
    $date = now()->format('Y-m-d');

    $validator = Validator::make($request->all(), [
        'userid' => 'required|numeric'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ], 400);
    }

    $userid = $request->userid;  

    // Calculate total bet amount for the user on the given date
    $bet_amount = DB::table('bets')
        ->where('userid', $userid)
        ->whereDate('created_at', '=', $date)
        ->sum('amount');

    // Retrieve activity rewards for the user
    $invite_bonus = DB::select("
        SELECT 
            a.id AS activity_id,
            a.amount,
            a.range_amount,
            a.name,
            COALESCE(c.status, '1') AS status,
            COALESCE(a.created_at, 'Not Found') AS created_at
        FROM 
            activity_rewards a
        LEFT JOIN 
            activity_rewards_claim c 
        ON 
            a.id = c.acyivity_reward_id 
        AND 
            c.userid = ?
        ORDER BY 
            a.id ASC
    ", [$userid]);

    if (!empty($invite_bonus)) {
        foreach ($invite_bonus as $bonus) {
            if ($bet_amount >= $bonus->range_amount) {
                // Check if already claimed but still status is 0
                $claim = DB::table('activity_rewards_claim')
                    ->where('userid', $userid)
                    ->where('acyivity_reward_id', $bonus->activity_id)
                    ->first();

                if ($claim && $claim->status == 0) {
                    $bonus->status = 0; // already eligible and pending claim
                } else {
                    $bonus->status = 2; // eligible to claim
                }
            }
        }

        return response()->json([
            'message' => 'Activity rewards list',
            'status' => 200,
            'bet_amount' => $bet_amount,
            'data' => $invite_bonus
        ]);
    } else {
        return response()->json([
            'message' => 'Not found..!',
            'status' => 400,
            'data' => []
        ], 400);
    }
}

    ///// activity_rewards history ////
    
     public function activity_rewards_history(Request $request)
    {
           $validator = Validator::make($request->all(), [
         'userid' => 'required|numeric',
         'subtypeid'=>'required',
         
    ]);

	
	$validator->stopOnFirstFailure();
	
    if($validator->fails()){
		
		        		     $response = [
                        'status' => 400,
                       'message' => $validator->errors()->first()
                      ]; 
		
		return response()->json($response,400);
		
    }
     $userid = $request->userid;  
     $subtypeid = $request->subtypeid;  
       // $userid = $request->input('userid');

       $act_reward_hist=DB::select("SELECT wallet_history.*,subtype.name as name FROM `wallet_history` LEFT JOIN subtype ON wallet_history.subtypeid=subtype.id WHERE wallet_history.userid=$userid && wallet_history.subtypeid=$subtypeid");
       
  

        if (!empty($act_reward_hist)) {
            $response = [
                'message' => 'activity rewards List',
                'status' => 200,
                'data' => $act_reward_hist,
            ];
            return response()->json($response);
        } else {
            return response()->json(['message' => 'Not found..!','status' => 400,
                'data' => []], 400);
        }
    }
    
        public function activity_rewards_claim(Request $request)
    {
         $validator = Validator::make($request->all(), [
            'userid' => 'required|numeric',
            'amount' => 'required',
            'activity_id'=>'required'
        ]);
    
        $validator->stopOnFirstFailure();
    
        if ($validator->fails()) {
            $response = [
                'status' => 400,
                'message' => $validator->errors()->first()
            ];
            return response()->json($response, 400);
        }
    
        $userid = $request->userid;
        $amount = $request->amount;
        $activity_id=$request->activity_id;
        $bonusClaim = DB::table('activity_rewards_claim')
                    ->where('userid', $userid)
                    ->where('acyivity_reward_id', $activity_id)
                    ->get();
                    // dd($bonusClaim);
                    
    if($bonusClaim->isEmpty()){
    $user = DB::table('users')->where('id', $userid)->first();
    if (!empty($user)) {
       $usser= DB::table('users')->where('id', $userid)->update([
            'wallet' => $user->wallet + $amount, // Add amount to wallet
        ]);
    }else{
     return response()->json([
    				'message' => 'user not found ..!',
    				'status' => 400,
                    ], 400);
     }
     if (!empty($usser)) {
        // Insert into wallet_histories
        $bonuss=DB::table('wallet_history')->insert([
            'userid'     => $userid,
            'amount'      => $amount,
            'description' => 'Invitation Bonus',
            'subtypeid'     => 11, // Define type_id as 1 for bonus claim
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
        
         $bonuss=DB::table('activity_rewards_claim')->insert([
            'userid'     => $userid,
            'acyivity_reward_id' => $activity_id,
            'status' => 0,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
     }else{
     
     }
         if (!empty($bonuss)) {
                $response = [
                    'message' => 'invitation bonus claimed successfully!',
                    'status' => 200,
                ];
                return response()->json($response,200);
            } else {
                return response()->json([
    				'message' => 'Bonus not claimed ..!',
    				'status' => 400,
                    ], 400);
            }
            
           } else{
             return response()->json([
    				'message' => 'Already claimed ..!',
    				'status' => 400,
                    ], 400);  
           }
    	}
        
        /// invitation Bonus List/////
        
   	public function invitation_bonus_list(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'userid' => 'required|numeric'
        ]);
    
        $validator->stopOnFirstFailure();
    
        if ($validator->fails()) {
            $response = [
                'status' => 400,
                'message' => $validator->errors()->first()
            ];
            return response()->json($response, 400);
        }
    
        $userid = $request->userid;
       $total_refer = DB::table('users')->where('referral_user_id', $userid)->count();
      
    // Fetch all users referred by the user with the given $userid
    $refer_users = DB::table('users')->where('referral_user_id', $userid)->get();
    
    $count_users = 0; // Initialize the count of users whose total deposit > 500
    
    // Loop through each referred user to calculate the total deposit sum
    foreach ($refer_users as $refer_user) {
        $user_id = $refer_user->id;
        
        // Calculate the total deposit amount for this user from the 'payins' table
        $deposit_count = DB::select("SELECT SUM(`cash`) as total_amount FROM `payins` WHERE `user_id` = :user_id", ['user_id' => $user_id]);
        
        // Get the total deposit amount for the user (or 0 if null or no rows)
        $total_deposit = $deposit_count[0]->total_amount ?? 0;
    
        // Only count users whose total deposit is greater than 500
        if ($total_deposit >= 500) {
            $count_users++; // Increment the count of users whose total deposit > 500
        }
    }
    
    
    $invite_bonus = DB::select("
        SELECT 
            a.id AS bonus_id,
            a.amount,
            a.claim_amount,
            a.no_of_user,
            CASE 
                WHEN c.userid = ? AND c.invite_id = a.id AND a.no_of_user <= ? THEN 0
                WHEN a.no_of_user <= ? THEN 2 
                ELSE COALESCE(c.status, '1') 
            END AS status,
            COALESCE(a.created_at, 'Not Found') AS created_at
        FROM 
            invite_bonus a
        LEFT JOIN 
            invite_bonus_claim c 
        ON 
            a.id = c.invite_id 
        AND 
            c.userid = ?
        ORDER BY 
            a.id ASC
    ", [$userid, $count_users, $count_users, $userid]);
    
    
    
        if (!empty($invite_bonus)) {
            $response = [
                'message' => 'invitation_bonus_list',
                'status' => 200,
                'data' => collect($invite_bonus)->map(function ($bonus) use ($total_refer, $count_users) {
                    return [
                        'bonus_id' => $bonus->bonus_id,
                        'amount' => $bonus->amount,
                        'claim_amount' => $bonus->claim_amount,
                        'no_of_user' => $bonus->no_of_user,
                        'status' => $bonus->status,
                        'created_at' => $bonus->created_at,
                        'no_of_invitees' => $total_refer,
                        'refer_invitees' => $count_users
                    ];
                })
            ];
            return response()->json($response);
        } else {
            return response()->json([
                'message' => 'Not found..!',
                'status' => 400,
                'data' => []
            ], 400);
        }
    }
    
    
    public function invitation_bonus_list_old(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'userid' => 'required|numeric'
        ]);
    
        $validator->stopOnFirstFailure();
    
        if ($validator->fails()) {
            $response = [
                'status' => 400,
                'message' => $validator->errors()->first()
            ];
            return response()->json($response, 400);
        }
    
        $userid = $request->userid;
       $total_refer = DB::table('users')->where('referral_user_id', $userid)->count();
      
    // Fetch all users referred by the user with the given $userid
    $refer_users = DB::table('users')->where('referral_user_id', $userid)->get();
    
    $count_users = 0; // Initialize the count of users whose total deposit > 500
    
    // Loop through each referred user to calculate the total deposit sum
    foreach ($refer_users as $refer_user) {
        $user_id = $refer_user->id;
        
        // Calculate the total deposit amount for this user from the 'payins' table
        $deposit_count = DB::select("SELECT SUM(`cash`) as total_amount FROM `payins` WHERE `user_id` = :user_id", ['user_id' => $user_id]);
        
        // Get the total deposit amount for the user (or 0 if null or no rows)
        $total_deposit = $deposit_count[0]->total_amount ?? 0;
    
        // Only count users whose total deposit is greater than 500
        if ($total_deposit >= 500) {
            $count_users++; // Increment the count of users whose total deposit > 500
        }
    }
    
    
    $invite_bonus = DB::select("
        SELECT 
            a.id AS bonus_id,
            a.amount,
            a.claim_amount,
            a.no_of_user,
            CASE 
                WHEN c.userid = ? AND c.invite_id = a.id AND a.no_of_user <= ? THEN 0
                WHEN a.no_of_user <= ? THEN 2 
                ELSE COALESCE(c.status, '1') 
            END AS status,
            COALESCE(a.created_at, 'Not Found') AS created_at
        FROM 
            invite_bonus a
        LEFT JOIN 
            invite_bonus_claim c 
        ON 
            a.id = c.invite_id 
        AND 
            c.userid = ?
        ORDER BY 
            a.id ASC
    ", [$userid, $count_users, $count_users, $userid]);
    
    
    
        if (!empty($invite_bonus)) {
            $response = [
                'message' => 'invitation_bonus_list',
                'status' => 200,
                'data' => collect($invite_bonus)->map(function ($bonus) use ($total_refer, $count_users) {
                    return [
                        'bonus_id' => $bonus->bonus_id,
                        'amount' => $bonus->amount,
                        'claim_amount' => $bonus->claim_amount,
                        'no_of_user' => $bonus->no_of_user,
                        'status' => $bonus->status,
                        'created_at' => $bonus->created_at,
                        'no_of_invitees' => $total_refer,
                        'refer_invitees' => $count_users
                    ];
                })
            ];
            return response()->json($response);
        } else {
            return response()->json([
                'message' => 'Not found..!',
                'status' => 400,
                'data' => []
            ], 400);
        }
    }
    
    ///// Invitation_reward_rule ////
    
     public function Invitation_reward_rule(Request $request)
    {
          

       $rule=DB::select("SELECT * FROM `invite_bonus`");
       
  

        if (!empty($rule)) {
            $response = [
                'message' => 'Invitation rewards rule',
                'status' => 200,
                'data' => $rule,
            ];
            return response()->json($response);
        } else {
            return response()->json(['message' => 'Not found..!','status' => 400,
                'data' => []], 400);
        }
    }
    
	public function Invitation_records(Request $request)
{
    $validator = Validator::make($request->all(), [
        'userid' => 'required|numeric'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ], 400);
    }

    $userid = $request->userid;

    // Query with LEFT JOIN on payins
    $records = DB::select("
        SELECT 
            u.username,
            u.u_id,
            -- Get first successful recharge (status=2) from payins
            (
                SELECT p.cash 
                FROM payins p 
                WHERE p.user_id = u.id AND p.status = 2
                ORDER BY p.created_at ASC 
                LIMIT 1
            ) AS first_recharge_amount,
            u.created_at
        FROM users u
        WHERE u.referral_user_id = ?
    ", [$userid]);

    if (!empty($records)) {
        return response()->json([
            'message' => 'Invitation rewards rule',
            'status'  => 200,
            'data'    => $records,
        ]);
    } else {
        return response()->json([
            'message' => 'Not found..!',
            'status'  => 400,
            'data'    => []
        ], 400);
    }
}

	
    //// Invitation record ////
    
    public function Invitation_records_old(Request $request)
    {
         
         $validator = Validator::make($request->all(), [
        'userid' => 'required|numeric'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        $response = [
            'status' => 400,
            'message' => $validator->errors()->first()
        ];
        return response()->json($response, 400);
    }

    $userid = $request->userid;
 

       $records=DB::select("SELECT `username`,`u_id`,`first_recharge_amount`,`created_at` FROM `users` WHERE `referral_user_id`=$userid");
       
  

        if (!empty($records)) {
            $response = [
                'message' => 'Invitation rewards rule',
                'status' => 200,
                'data' => $records,
            ];
            return response()->json($response);
        } else {
            return response()->json(['message' => 'Not found..!','status' => 400,
                'data' => []], 400);
        }
    }
    
    //// Extra First Deposit bonus history ///
    
  
     public function extra_first_payin(Request $request)
    {
       
         $validator = Validator::make($request->all(), [
            'user_id' => 'required|exists:users,id',
            'cash' => 'required',
            'type' => 'required',
        ]);
        $validator->stopOnFirstFailure();

        if ($validator->fails()) {
            $response = [
                'status' => 400,
                'message' => $validator->errors()->first()
            ];

            return response()->json($response);
        }

        
        
	$cash = $request->cash;
    // $extra_amt = $request->extra_cash;
     $type = $request->type;
    $userid = $request->user_id;
	   //	$total_amt=$cash+$extra_amt+$bonus;
		 
               $date = date('YmdHis');
        $rand = rand(11111, 99999);
        $orderid = $date . $rand;

        $check_id = DB::table('users')->where('id',$userid)->first();
        if($type == 1){
        if ($check_id) {
            $redirect_url = env('APP_URL')."api/checkPayment?order_id=$orderid";
            //dd($redirect_url);
            $insert_payin = DB::table('payins')->insert([
                'user_id' => $request->user_id,
                'cash' => $request->cash,
                'type' => $request->type,
                'order_id' => $orderid,
                'redirect_url' => $redirect_url,
                'status' => 1 // Assuming initial status is 0
            ]);
         // dd($redirect_url);
            if (!$insert_payin) {
                return response()->json(['status' => 400, 'message' => 'Failed to store record in payin history!']);
            }
 
            $postParameter = [
                'merchantid' => "INDIANPAY00INDIANPAY0033",
                'orderid' => $orderid,
                'amount' => $request->cash,
                'name' => $check_id->u_id,
                'email' => "abc@gmail.com",
                'mobile' => $check_id->mobile,
                'remark' => 'payIn',
                'type'=>$request->cash,
                'redirect_url' => env('APP_URL')."api/checkPayment?order_id=$orderid"
               // 'redirect_url' => config('app.base_url') ."/api/checkPayment?order_id=$orderid"
            ];


            $curl = curl_init();

            curl_setopt_array($curl, array(
                CURLOPT_URL => 'https://indianpay.co.in/admin/paynow',
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_ENCODING => '',
                CURLOPT_MAXREDIRS => 10,
                CURLOPT_TIMEOUT => 0, 
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
                CURLOPT_CUSTOMREQUEST => 'POST',
                CURLOPT_POSTFIELDS => json_encode($postParameter),
                CURLOPT_HTTPHEADER => array(
                    'Content-Type: application/json',
                    'Cookie: ci_session=1ef91dbbd8079592f9061d5df3107fd55bd7fb83'
                ),
            ));

            $response = curl_exec($curl);
            curl_close($curl);
             
			echo $response;
		//	dd($response);
        } else {
            return response()->json([
                'status' => 400,
                'message' => 'Internal error!'
            ]);
        }
            
        }else{
           return response()->json([
                'status' => 400,
                'message' => 'USDT is Not Supported ....!'
            ]); 
        }
    }

    public function checkPayment1(Request $request)
    {
       // dd($request);
        $orderid = $request->input('order_id');
	//dd($orderid);
     //bonus = gift_cash
        if ($orderid == "") {
            return response()->json(['status' => 400, 'message' => 'Order Id is required']);
        } else {
            $match_order = DB::table('payins')->where('order_id', $orderid)->where('status', 1)->first();
//dd($match_order);
            if ($match_order) {
                $uid = $match_order->user_id;
            
                $cash = $match_order->cash;
                $type = $match_order->type;
               
                $orderid = $match_order->order_id;
                
                $datetime=now();
               // dd("UPDATE payins SET status = 2 WHERE order_id = $orderid AND status = 1 AND user_id = $uid");

              $update_payin = DB::table('payins')->where('order_id', $orderid)->where('status', 1)->where('user_id', $uid)->update(['status' => 2]);
    
                if ($update_payin) {
                    
                    // $wallet = $cash + $bonus + $extra_cash;
                    // $bonusToAdd = $bonus;
                    //dd($uid);
    $referid=DB::select("SELECT referral_user_id,first_recharge FROM `users` WHERE id=$uid");
    //dd($referid);
    $first_recharge=$referid[0]->first_recharge;
    $referuserid=$referid[0]->referral_user_id;
   // dd($first_recharge);
if($first_recharge == 0){
    
    $extra=DB::select("SELECT * FROM `extra_first_deposit_bonus` WHERE `first_deposit_ammount`=$cash"); 
    $id=$extra[0]->id;
    $first_deposit_ammount=$extra[0]->first_deposit_ammount;
    $bonus=$extra[0]->bonus;
    
    $amount=$bonus+$first_deposit_ammount;

    DB::INSERT("INSERT INTO `extra_first_deposit_bonus_claim`( `userid`, `extra_fdb_id`, `amount`, `bonus`, `status`, `created_at`, `updated_at`) VALUES ('$uid','$id','$first_deposit_ammount','$bonus','0','$datetime','$datetime')");
   
                    $updateUser =DB::update("UPDATE users 
    SET 
    wallet = wallet + $amount,
    first_recharge = first_recharge + $cash,
    first_recharge_amount = first_recharge_amount + $cash,
    recharge = recharge + $cash,
    total_payin = total_payin + $cash,
    no_of_payin = no_of_payin + 1,
    deposit_balance = deposit_balance + $cash
    WHERE id = $uid;
    ");
    //dd("hiii");
    // dd("UPDATE users SET yesterday_payin = yesterday_payin + $cash,yesterday_no_of_payin  = yesterday_no_of_payin + 1,yesterday_first_deposit = yesterday_first_deposit + $cash WHERE id=$referuserid");
    //dd($referuserid);
    DB::UPDATE("UPDATE users SET yesterday_payin = yesterday_payin + $cash,yesterday_no_of_payin  = yesterday_no_of_payin + 1,yesterday_first_deposit = yesterday_first_deposit + $cash WHERE id=$referuserid");
     return redirect()->away(env('APP_URL').'uploads/payment_success.php');
}else{
    
      $updateUser =DB::update("UPDATE users 
    SET 
    wallet = wallet + $cash,
    recharge = recharge + $cash,
    total_payin = total_payin + $cash,
    no_of_payin = no_of_payin + 1,
    deposit_balance = deposit_balance + $cash
    WHERE id = $uid;
    ");
    
    //dd("hello");
     //dd($referuserid);
    DB::select("UPDATE users SET yesterday_payin = yesterday_payin + $cash,yesterday_no_of_payin  = yesterday_no_of_payin + 1 WHERE id=$referuserid");
     return redirect()->away(env('APP_URL').'uploads/payment_success.php');
}

     
    
                    if ($updateUser) {
                        // Redirect to success page
                        //dd("hello");
                        return redirect()->away(env('APP_URL').'uploads/payment_success.php');
                    } else {
                        return response()->json(['status' => 400, 'message' => 'User balance update failed!']);
                    }
                } else {
                    return response()->json(['status' => 400, 'message' => 'Failed to update payment status!']);
                }
            } else {
                return response()->json(['status' => 400, 'message' => 'Order id not found or already processed']);
            }
        }
    }
	
    
    
        public function extra_first_deposit_bonus_old(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'userid' => 'required|numeric'
        ]);
    
        $validator->stopOnFirstFailure();
    
        if ($validator->fails()) {
            $response = [
                'status' => 400,
                'message' => $validator->errors()->first()
            ];
            return response()->json($response, 400);
        }
    
        $userid = $request->userid;
     
    
            
            $rowCount = DB::table('extra_first_deposit_bonus_claim')->where('userid', $userid)->count();
            
            if ($rowCount > 0) {
                $checkDate = DB::select("SELECT extra_first_deposit_bonus.first_deposit_ammount as first_deposit_ammount, extra_first_deposit_bonus.bonus as bonus, extra_first_deposit_bonus.bonus + extra_first_deposit_bonus.bonus as totalamount, COALESCE(extra_first_deposit_bonus_claim.status, 1) as status FROM extra_first_deposit_bonus LEFT JOIN extra_first_deposit_bonus_claim ON extra_first_deposit_bonus.first_deposit_ammount = extra_first_deposit_bonus_claim.amount AND extra_first_deposit_bonus_claim.userid = ? ORDER BY COALESCE(extra_first_deposit_bonus_claim.status, 1) DESC", [$userid]); 
               
                if (!empty($checkDate)) {
                    return response()->json([
                        'msg' => 'Successfully...!',
                        'status' => '200',
                        'data' => $checkDate
                    ]);
                } else {
                    return response()->json([
                        'msg' => 'Internal error...',
                        'status' => '400'
                    ]);
                }
            } else {
               
                $checkDate = DB::table('extra_first_deposit_bonus')->select('first_deposit_ammount', 'bonus', DB::raw('first_deposit_ammount + bonus as totalamount'), 'status','created_at')->get(); 
               
                
                if (!empty($checkDate)) {
                    return response()->json([
                        'msg' => 'Successfully...!',
                        'status' => '200',
                        'data' => $checkDate
                    ]);
                }
            }
        
    }
     
	
	public function extra_first_deposit_bonus(Request $request)
{
    $validator = Validator::make($request->all(), [
        'userid' => 'required|numeric'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'message' => $validator->errors()->first()
        ]);
    }

    $userid = $request->userid;

    $claims = DB::table('extra_first_deposit_bonus_claim')
        ->where('userid', $userid)
        ->orderBy('created_at', 'asc')
        ->get();

    if ($claims->count() > 0) {
        $labels = ['first_deposit_bonus', 'second_deposit_bonus', 'third_deposit_bonus', 'fourth_deposit_bonus'];
        $data = [];

        foreach ($claims as $index => $claim) {
            $bonusInfo = DB::table('extra_first_deposit_bonus')
                ->where('first_deposit_ammount', $claim->amount)
                ->first();

            if ($bonusInfo) {
                $data[] = [
                    'first_deposit_ammount' => $claim->amount,
                    'bonus' => rtrim(rtrim(number_format($bonusInfo->bonus, 2), '0'), '.') . '%',
                    'status' => $claim->status,
                    'created_at' => $claim->created_at,
                    'label' => $labels[$index] ?? "bonus_" . ($index + 1)
                ];
            }
        }

        return response()->json([
            'msg' => 'Successfully...!',
            'status' => 200,
            'data' => $data
        ]);
    }

    // No claims found — return base bonus list
    $bonusList = DB::table('extra_first_deposit_bonus')
        ->select('first_deposit_ammount', 'bonus', 'status', 'created_at')
        ->get();

    if ($bonusList->count() > 0) {
        $labels = ['first_deposit_bonus', 'second_deposit_bonus', 'third_deposit_bonus', 'fourth_deposit_bonus'];

        foreach ($bonusList as $index => $row) {
            $row->label = $labels[$index] ?? "bonus_" . ($index + 1);
            $row->bonus = rtrim(rtrim(number_format($row->bonus, 2), '0'), '.') . '%';
            unset($row->totalamount); // just in case
        }

        return response()->json([
            'msg' => 'Successfully...!',
            'status' => 200,
            'data' => $bonusList
        ]);
    }

    return response()->json([
        'msg' => 'No data found...',
        'status' => 404
    ]);
}

    ////// MLM Level/////
    
    public function  level_getuserbyrefid(Request $request)
    {
    
        
        $validator = Validator::make($request->all(), [
            'id' => 'required|integer'
        ]);
    
        $validator->stopOnFirstFailure();
    
        if ($validator->fails()) {
            $response = [
                'status' => 400,
                'message' => $validator->errors()->first()
            ];
            return response()->json($response, 400);
        }
    
        date_default_timezone_set('Asia/Kolkata');
        $datetime = date('Y-m-d H:i:s');
    
        $userId = $request->input('id');
        $refer_code = User::where('id', $userId)->value('referral_code');
        $user_data = User::select('id','username', 'today_turnover', 'total_payin', 'no_of_payin', 'referral_user_id', 'yesterday_payin','yesterday_register','referral_code','yesterday_first_deposit','yesterday_no_of_payin','deposit_balance','yesterday_total_commission','u_id','totalbet','first_recharge','turnover')->get()->toArray();
        $mlm_level_data = DB::table('mlm_levels')->get()->toArray();
    
        $alldata = [];
        $lastlevelname = 'Tier 6';
        foreach ($mlm_level_data as $mlm_level) {
            $name = $mlm_level->name;
            $commission = $mlm_level->commission;
            $usermlm = [];
    
            if ($name == 'Tier 1') {
                $usermlm[] = $userId;
            } else {
                $data = $mlm_level_data[array_search($mlm_level, $mlm_level_data) - 1]->name;
                foreach ($alldata[$data] as $itemss) {
                    $usermlm[] = $itemss['user_id'];
                }
            }
    
            $filtered_users = array_filter($user_data, function($item) use ($usermlm) {
                return in_array($item['referral_user_id'], $usermlm);
            });
    
            $level = [];
            foreach ($filtered_users as $item) {
                $todays = $item['today_turnover'] * $commission * 0.01 ;
                $level[] = [
                    "user_id" => $item['id'],
                     "u_id" => $item['u_id'],
                     'totalbet'=> $item['totalbet'],
                    "username" => $item['username'],
                    "first_recharge"=>$item['first_recharge'],
                     "deposit_amount" => $item['deposit_balance'],
                    "turnover" => $item['turnover'],
                    'today_turnover'=>$item['today_turnover'],
                    "commission" => number_format((float)$todays, 2, '.', ''),
                    'total_payin'=> $item['total_payin'],
                    'no_of_payin'=>$item['no_of_payin'],
                    'yesterday_payin'=>$item['yesterday_payin'],
                    'yesterday_register'=>$item['yesterday_register'],
                    'yesterday_no_of_payin'=>$item['yesterday_no_of_payin'],
                    'yesterday_first_deposit'=>$item['yesterday_first_deposit']
                ];
            }
    
            $alldata[$name] = $level;
            $lastlevelname = $name;
        }
    
        $totalcommission = 0;
        $totaluser = 0;
        $datalevelcome = [];
        $indirectTeam = 0;
        $numofpayindirect = 0;
        $numofpayteam = 0;
        $payinAmountDirect = 0;
        $payinAmountTeam = 0;
        $noUserDirect = 0;
        $noUserTeam = 0;
        $noOfFristPayinDirect = 0;
        $noOfFristPayinTeam = 0;
        
        $yesterday_total_commission = 0;
        
        $yesterday_payin_direct = 0;
        $yesterday_register_direct = 0;
        $yesterday_no_of_payin_direct = 0;
        $yesterday_first_deposit_direct = 0;
    
        $yesterday_payin_team = 0;
        $yesterday_register_team = 0;
        $yesterday_no_of_payin_team = 0;
        $yesterday_first_deposit_team = 0;
    
       
            $deposit_number_all=0;
            $deposit_amount_all=0;
            $first_recharge_all=0;
            $no_of_firstrechage_all=0;
            $total_bet_all=0;
            $total_bet_amount_all=0;   
       
       
    
        foreach ($mlm_level_data as $mlm_level) {
            $name = $mlm_level->name;
            $levelcom = 0;
            $deposit_number=0;
            $deposit_amount=0;
            $first_recharge=0;
            $no_of_firstrechage=0;
            $total_bet=0;
            $total_bet_amount=0;
    
            foreach ($alldata[$name] as $obj) {
                $totalcommission += $obj['commission'];
                $deposit_number_all+=$obj['total_payin'];
            $deposit_amount_all+=$obj['no_of_payin'];
            $first_recharge_all+=$obj['first_recharge'];
            $no_of_firstrechage_all+=$no_of_firstrechage;
            $total_bet_all+=$total_bet;
            $total_bet_amount_all+=$total_bet_amount; 
            
            
            
                $totaluser++;
                $levelcom += $obj['commission'];
                if ($name == 'Tier 1') {
                    $payinAmountDirect += $obj['total_payin'];
                    $noUserDirect++;
                    if ($obj['yesterday_payin'] != '0') {
                         $numofpayindirect++;
                        $noOfFristPayinDirect++;
                    }
                    if ($obj['no_of_payin'] != '0') {
                      //  $numofpayindirect++;
                    }
                    
                    $yesterday_payin_direct += $obj['yesterday_payin'];
                    $yesterday_register_direct = $obj['yesterday_register'];
                   // $yesterday_no_of_payin_direct += $obj['yesterday_no_of_payin'];
                    $yesterday_first_deposit_direct += $obj['yesterday_first_deposit'];
    
                } else {
                    $payinAmountTeam += $obj['total_payin'];
                    $noUserTeam++;
                    $indirectTeam++;
                    if ($obj['total_payin'] != '0') {
                        $noOfFristPayinTeam++;
                    }
                    if ($obj['no_of_payin'] != '0') {
                        $numofpayteam++;
                    }
                    if ($name != $lastlevelname) {
                        if($obj['first_recharge'] > 0){
                            
                       $first_recharge += $obj['first_recharge'];
    
                           $no_of_firstrechage++;
                        }
                        $total_bet_amount += $obj['today_turnover']+$obj['turnover'];
                        $total_bet += $obj['totalbet'];
                        
                        
                        
                        $deposit_number += $obj['no_of_payin'];
                        $deposit_amount +=$obj['total_payin'];
                        $yesterday_payin_team += $obj['yesterday_payin'];
                        $yesterday_register_team += $obj['yesterday_register'];
                        $yesterday_no_of_payin_team += $obj['yesterday_no_of_payin'];
                        $yesterday_first_deposit_team += $obj['yesterday_first_deposit'];
                    }
                }
            }
    
            $datalevelcome[] = [
                'count' => count($alldata[$name]),
                'name' => $name,
                'commission' => number_format($levelcom, 2, '.', ''),
                'total_payin'=>$deposit_amount,
                'no_of_payin' =>$deposit_number,
                'first_recharge' =>$first_recharge,
                'no_of_people'=>$no_of_firstrechage,
                'totalbet'=>$total_bet,
                'total_bet_amount'=>$total_bet_amount
                
            ];
          
        }
      $datalevelcome[]=[
            'count' => $totaluser,
            'name' => "all",
            'commission' => number_format($totalcommission, 2, '.', ''),
            'total_payin'=>$deposit_number_all,
            'no_of_payin' =>$deposit_amount_all,
            'first_recharge' =>$first_recharge_all,
            'no_of_people'=>$no_of_firstrechage_all,
            'totalbet'=>$total_bet_all,
            'total_bet_amount'=>$total_bet_amount_all
                ];
        return response()->json([
            'direct_user_count' => $yesterday_register_direct ?? 0,
            'numofpayindirect' => $yesterday_no_of_payin_direct ?? 0,
            'noUserDirect' => $yesterday_register_direct ?? 0,
            'noOfFristPayinDirect' => $numofpayindirect ?? 0,
            'payinAmountDirect' => $yesterday_payin_direct ?? 0,
            'indirect_user_count' => $yesterday_register_team ?? 0,
            'numofpayteam' => $yesterday_no_of_payin_team ?? 0,
            'payinAmountTeam' => $yesterday_payin_team ?? 0,
            'noUserTeam' => $yesterday_register_team ?? 0,
            'noOfFristPayinTeam' => $yesterday_first_deposit_team ?? 0,
            'total_payin_direct'=> $payinAmountDirect ?? 0,
            'total_register_direct'=>$noUserDirect ?? 0,
            'total_no_of_payin_direct'=>$numofpayindirect ?? 0,
            'total_first_deposit_direct'=>$noOfFristPayinDirect ?? 0,
            'total_payin_team'=>$payinAmountTeam ?? 0,
            'total_register_team'=>$noUserTeam ?? 0,
            'total_no_of_payin_team'=>$numofpayteam ?? 0,
            'total_first_deposit_team'=>$noOfFristPayinTeam ?? 0,      
            'totaluser' => "$totaluser" ?? 0,
            'totalcommission' => number_format($totalcommission, 2, '.', ''),
            'yesterday_totalcommission' => number_format($yesterday_total_commission, 2, '.', ''),
            'user_refer_code' => $refer_code,
            'levelwisecommission' => $datalevelcome ?? 0,
            'user_id' => $userId ?? 0,
            'userdata' => $alldata ?? 0,
            ///
            // 'all_total_payin'=>$deposit_number_all,
            // 'all_no_of_payin' =>$deposit_amount_all,
            // 'all_first_recharge' =>$first_recharge_all,
            // 'all_no_of_people'=>$no_of_firstrechage_all,
            // 'all_totalbet'=>$total_bet_all,
            // 'all_total_bet_amount'=>$total_bet_amount_all
        ]);
    }
      
    
    // commission details //////
    
     public function commission_details(Request $request)
        {
             $validator = Validator::make($request->all(), [
            'userid' => 'required|integer',
            'subtypeid'=>'required|integer',
            'date'=>'required'
        ]);
    
        $validator->stopOnFirstFailure();
    
        if ($validator->fails()) {
            $response = [
                'status' => 400,
                'message' => $validator->errors()->first()
            ];
            return response()->json($response, 400);
        }
             $userid = $request->userid;
             $subtypeid= $request->subtypeid;
             $date=$request->created_at;
    
           $commission=DB::select("SELECT * FROM `wallet_history` WHERE `userid`=$userid && `subtypeid`=$subtypeid &&`created_at` LIKE '%$date%'");
           
          $data=[];
    foreach ($commission as $item){
        
           
           $amount=$item->amount;
           $description=$item->description;
           $description2=$item->description_2;
           $created_at=$item->created_at;
           $updated_at=$item->updated_at;
        }
        
        
         $data[] = [
             'number_of_bettors'=>$description2,
             'bet_amount'=>$description,
             'commission_payout'=>$amount,
             'date'=>$created_at,    
             'settlement_date'=>$updated_at       
             ];
              
    
            if (!empty($data)) {
                $response = [
                    'message' => 'commission_details',
                    'status' => 200,
                    'data' => $data,
                ];
                return response()->json($response);
            } else {
                return response()->json(['message' => 'Not found..!','status' => 400,
                    'data' => []], 400);
            }
        }
        
     //// All Rules ////
    
    public function all_rules(Request $request)
    {
         
         $validator = Validator::make($request->all(), [
        'type' => 'required|numeric'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        $response = [
            'status' => 400,
            'message' => $validator->errors()->first()
        ];
        return response()->json($response, 400);
    }

    $type = $request->type;
 

      $records=DB::select("SELECT name,list FROM `rules` WHERE `type`=$type");
       
 
        if (!empty($records)) {
            $response = [
                'message' => 'rules list',
                'status' => 200,
                'data' =>$records,
            ];
            return response()->json($response,200);
        } else {
            return response()->json(['message' => 'Not found..!','status' => 400,
                'data' => []], 400);
        }
    }
    
     public function subordinate_userlist(Request $request)
    {
         
         $validator = Validator::make($request->all(), [
        'id' => 'required|numeric',
        'type' => 'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        $response = [
            'status' => 400,
            'message' => $validator->errors()->first()
        ];
        return response()->json($response, 400);
    }

    $userid = $request->id;
    $type = $request->type;
 
if($type == 1){
       $list=DB::select("SELECT `u_id` AS user_name, `mobile` AS mobile, `created_at` AS datetime 
FROM `users` 
WHERE referral_user_id =$userid  
AND DATE(`created_at`) = CURDATE();
");
}elseif ($type == 2) {
    $list=DB::select("SELECT `u_id` AS user_name, `mobile` AS mobile, `created_at` AS datetime 
FROM `users` 
WHERE referral_user_id = $userid 
AND DATE(`created_at`) = DATE_SUB(CURDATE(), INTERVAL 1 DAY);
");
}else{
    $list=DB::select("SELECT `u_id` AS user_name, `mobile` AS mobile, `created_at` AS datetime 
FROM `users` 
WHERE referral_user_id = $userid 
AND `created_at` BETWEEN DATE_SUB(CURDATE(), INTERVAL 1 MONTH) AND CURDATE();
");
}
  

        if (!empty($list)) {
            $response = [
                'message' => 'Invitation rewards rule',
                'status' => 200,
                'data' => $list,
            ];
            return response()->json($response);
        } else {
            return response()->json(['message' => 'Not found..!','status' => 400,
                'data' => []], 400);
        }
    }
    
       public function commission_distribution()
    {
        $datetime = now();
        $user_data = User::select('id', 'today_turnover', 'referral_user_id', 'u_id', 'first_recharge', 'turnover')
            ->where('first_recharge', '!=', 0)
            ->get()
            ->toArray();
       
        $mlm_level_data = DB::table('mlm_levels')->get()->toArray();
        
        $userIds = [];
        $bonusWalletIncrement = 0;
    
        $inserts = [];
    
        foreach ($user_data as $item) {
            $user_id = $item['id'];
    
            $commission = $this->commission_distribute_mlm($mlm_level_data, $user_data, $user_id);
            $no_of_bet = $commission['no_of_bet'];
            $betamount = $commission['betamount'];
            $commissions = $commission['commission'];
    
            // Collect user IDs for bulk update
            $userIds[] = $user_id;
    
            // Build insert query
            if($commissions>0){
            $inserts[] = [
                'userid' => $user_id,
                'amount' => $commissions,
                'subtypeid'=>23,
                'description' => $betamount,
                'description_2' => $no_of_bet,
                'created_at' => $datetime
            ];
            }
            // Increment bonus wallet
            $bonusWalletIncrement += $commissions;
        }
    //dd($userIds);
        // Bulk update
        if (!empty($userIds)) {
            $userIdsString = implode(',', $userIds);
            
            $updateQuery = "
                UPDATE users 
                SET 
                    turnover = CASE 
                        " . implode(' ', array_map(function ($userId) {
                            return "WHEN $userId THEN turnover + today_turnover";
                        }, $userIds)) . "
                        ELSE today_turnover 
                    END,
                    today_turnover = 0,
                    bonus_wallet = bonus_wallet + $bonusWalletIncrement,
                    yesterday_payin = 0,
                    today_turnover=0,
                    yesterday_no_of_payin = 0,
                    yesterday_first_deposit = 0,
                    yesterday_total_commission = 0,
                    yesterday_register = 0,
                    recharge = recharge + $bonusWalletIncrement 
                WHERE 
                    id IN ($userIdsString)
            ";
            //dd($updateQuery);
    
            // Execute update query
            DB::statement($updateQuery);
        }
    
        // Bulk insert
        if (!empty($inserts)) {
            DB::table('wallet_history')->insert($inserts);
        }
    }
    	
    private function commission_distribute_mlm($mlm_level_data,$user_data,$user_id)
    {
          $all_data = [];
        $last_level_name = 'Tier 6';  
         $total_commission = 0;
        $user_id = $user_id;
        $no_of_bet=0;
        $betamount=0;
        
    
        foreach ($mlm_level_data as $mlm_level) {
            $name = $mlm_level->name;
            $commission = $mlm_level->commission;
            $user_mlm = [];
    
            if ($name == 'Tier 1') {
                $user_mlm[] = $user_id;
             }
            // else {
            //     $data = $mlm_level_data[array_search($mlm_level, $mlm_level_data) - 1]->name;
            //     foreach ($all_data[$data] as $item) {
            //         $user_mlm[] = $item['user_id'];
            //     }
            // }
            
            $index = array_search($mlm_level, $mlm_level_data);
    if ($index !== false && $index > 0) {
        $data = $mlm_level_data[$index - 1]->name;
        foreach ($all_data[$data] as $item) {
            $user_mlm[] = $item['user_id'];
        }
    }
    
            // Filter users based on MLM structure
            $filtered_users = array_filter($user_data, function ($item) use ($user_mlm) {
                return in_array($item['referral_user_id'], $user_mlm);
            });
    
            // Calculate commission for each user at this level
            $level = [];
            foreach ($filtered_users as $item) {
                if($item['today_turnover']){
                    $no_of_bet++;
                    $betamount+=$item['today_turnover'];
                }
                $todays = $item['today_turnover'] * $commission * 0.01;
              
                $level[] = [
                    "user_id" => $item['id'],
                    "turnover" => $item['turnover'],
                    'today_turnover' => $item['today_turnover'],
                    "commission" => number_format((float)$todays, 2, '.', ''),
                ];
            }
    
            // Store commission data for this level
            $all_data[$name] = $level;
            $last_level_name = $name;
        }
    
        foreach ($mlm_level_data as $mlm_level) {
            $name = $mlm_level->name;
            foreach ($all_data[$name] as $obj) {
                $total_commission += $obj['commission'];
              
            }
        }
          $user_id = $user_id;
        $no_of_bet=0;
        $betamount=0;
        $finaldatas=array(
            'id'=>$user_id,
            'no_of_bet'=>$no_of_bet,
           'betamount'=> $betamount,
           'commission'=>$total_commission
            );
        return $finaldatas;
    }
    
    public function betting_rebate(){
        
        $currentDate = date('Y-m-d');
    		 
    		 $a = DB::select("SELECT sum(amount) as betamount, userid FROM bets WHERE created_at like '$currentDate %' AND status= '2' GROUP BY userid;");
    
    		
    		//$a = DB::select("SELECT `today_turnover` FROM `users` WHERE `id`=$userid ");
    		
    		foreach($a as $item){
    		
    		   $betamount = $item->betamount;
    		   $userid = $item->userid;
    			
    			DB::select("UPDATE users SET wallet = wallet + $betamount * 0.01 WHERE id = $userid");
    		$rebate_rate=0.01;
    		  $insert= DB::table('wallet_history')->insert([
            'userid' => $userid,
            'amount' => $betamount*$rebate_rate,
            'description'=>$betamount,
            'description_2'=>$rebate_rate,
            'subtypeid' => 25,
    		'created_at'=> now(),
            'updated_at' => now()
    		
            ]);
    		
    	   }
    		
    	}		
    	
    	
     public function betting_rebate_history(Request $request)
        {
             
             $validator = Validator::make($request->all(), [
            'userid' => 'required|numeric',
            'subtypeid' => 'required'
        ]);
    
        $validator->stopOnFirstFailure();
    
        if ($validator->fails()) {
            $response = [
                'status' => 400,
                'message' => $validator->errors()->first()
            ];
            return response()->json($response, 400);
        }
    
        $userid = $request->userid;
        $subtypeid = $request->subtypeid;
        
        $value=DB::select("SELECT 
        COALESCE(SUM(amount), 0) as total_rebet,
        COALESCE(SUM(description), 0) as total_amount,
        COALESCE(SUM(CASE WHEN DATE(CURDATE()) = CURDATE() THEN amount ELSE 0 END), 0) as today_rebet 
    FROM 
        wallet_history 
    WHERE 
        userid = $userid && subtypeid =$subtypeid");
        
        $records=DB::select("SELECT 
        `amount` as rebate_amount,description_2 as rebate_rate,created_at as datetime,
        COALESCE((SELECT SUM(description) FROM wallet_history WHERE `userid` = $userid AND subtypeid = $subtypeid), 0) as betting_rebate 
    FROM 
        `wallet_history` 
    WHERE 
        `userid` = $userid AND subtypeid = $subtypeid;");
    
    
           
     
            if (!empty($records)) {
                $response = [
                    'message' => 'Betting Rebet List',
                    'status' => 200,
                    'data1' =>$records,
                    'data' =>$value,
                ];
                return response()->json($response,200);
            } else {
                return response()->json(['message' => 'Not found..!','status' => 400,
                    'data' => []], 400);
            }
     
    
        }	
	
	
	 public function versionApkLink(Request $request)
    {
        
            $data = DB::SELECT("SELECT * FROM `versions` WHERE `id`=1"); // Assuming you have a Version model with 'id' field

            if ($data) {
                
                $response = [
                 'msg' => 'Successfully',
                    'status' => 200,
                    'version' => $data[0]->version,
                    'link' => $data[0]->link
            ];
            return response()->json($response,200);
                
            } else {
                // If no data is found, set an appropriate response
                return response()->json([
                    'msg' => 'No record found',
                    'status' => 400
                ], 400);
            }
        
    }
	
    public function sendSMS(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'mobile' => 'required'
        ]);
    
        $validator->stopOnFirstFailure();
    
        if ($validator->fails()) {
            $response = [
                'status' => 400,
                'message' => $validator->errors()->first()
            ];
            return response()->json($response, 400);
        }
        $mobile = $request->mobile;
    
        $apikey = 'Vml2ZWtvdHA6OFljNEhDeHo=';
        $type = 'TEXT';
        $sender = 'NSLSMS';
        $entityId = '1201164562188563646';
        $templateId = '1207170323851947619';
    
        $otp = rand(1000, 9999);
    
        $message = "Dear user, the OTP for $otp for Money Makers NSL LIFE";
    
        $existingOTP = DB::table('otp_sms')->where('mobile', $mobile)->first();
    
        if ($existingOTP) {
           
            DB::table('otp_sms')
                ->where('mobile', $mobile)
                ->update([
                    'otp' => $otp,
                    'status' => 1, 
                    'datetime' => now(),
                ]);
        } else {
            // Insert a new record into otp_sms table
            DB::table('otp_sms')->insert([
                'mobile' => $mobile,
                'otp' => $otp,
                'status' => 1, // Assuming 1 for successful status
                'datetime' => now(),
            ]);
        }
    
        // Make the API call
        $response = Http::get('http://login.swarajinfotech.com/domestic/sendsms/bulksms_v2.php', [
            'apikey' => $apikey,
            'type' => $type,
            'sender' => $sender,
            'entityId' => $entityId,
            'templateId' => $templateId,
            'mobile' => $mobile,
            'message' => $message,
        ]);
    
        // Validate the response
        if ($response->successful()) {
            return response()->json(['status' => 200,'message' => 'OTP sent successfully'], 200);
        } else {
            return response()->json(['status' => 400,'message' => 'Failed to send OTP'], 400);
        }
    }
    
    public function verifyOTP_old(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'mobile' => 'required',
            'otp' => 'required|numeric'
        ]);
    
        $validator->stopOnFirstFailure();
    
        if ($validator->fails()) {
            $response = [
                'status' => 400,
                'message' => $validator->errors()->first()
            ];
            return response()->json($response, 400);
        }
    
        $mobile = $request->mobile;
        $otp = $request->otp;
    
        $existingOTP = DB::table('otp_sms')->where('mobile', $mobile)->first();
    
        if ($existingOTP) {
            
            if ($existingOTP->otp == $otp) {
             
              
    
                return response()->json(['status' => 200, 'message' => 'OTP verified successfully'], 200);
            } else {
                return response()->json(['status' => 400, 'message' => 'Invalid OTP'], 400);
            }
        } else {
            return response()->json(['status' => 400, 'message' => 'No OTP found for the provided mobile number'], 400);
        }
    }
    	
    public function updatePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
         
            'mobile' => 'required',
            'password' => 'required',
            'confirm_password' => 'required|same:password',
        ]);
    
        $validator->stopOnFirstFailure();
    
        if ($validator->fails()) {
            $response = [
                'status' => 400,
                'message' => $validator->errors()->first()
            ];
            return response()->json($response, 400);
        }
    
        $user = DB::table('users')
                    ->where('mobile', $request->mobile)
                    ->first();
    
        if (!$user) {
            return response()->json(['status' => 400,'message' => 'User not found'], 400);
        }
    
        $updated = DB::table('users')
                    ->where('mobile', $request->mobile)
                    ->update([
                        'password' => $request->password 
                    ]);
    
            return response()->json(['status' => 200,'message' => 'Password updated successfully'], 200);
       
    }
    
    	public function invitation_bonus_claim(Request $request)
    {
         $validator = Validator::make($request->all(), [
            'userid' => 'required|numeric',
            'amount' => 'required',
            'invite_id'=>'required'
        ]);
    
        $validator->stopOnFirstFailure();
    
        if ($validator->fails()) {
            $response = [
                'status' => 400,
                'message' => $validator->errors()->first()
            ];
            return response()->json($response, 400);
        }
    
        $userid = $request->userid;
        $amount = $request->amount;
        $invite_id=$request->invite_id;
        $bonusClaim = DB::table('invite_bonus_claim')
                    ->where('userid', $userid)
                    ->where('invite_id', $invite_id)
                    ->get();
                    // dd($bonusClaim);
                    
    if($bonusClaim->isEmpty()){
    $user = DB::table('users')->where('id', $userid)->first();
    if (!empty($user)) {
       $usser= DB::table('users')->where('id', $userid)->update([
            'wallet' => $user->wallet + $amount, // Add amount to wallet
		   'recharge' => $user->recharge + $amount,
        ]);
    }else{
     return response()->json([
    				'message' => 'user not found ..!',
    				'status' => 400,
                    ], 400);
     }
     if (!empty($usser)) {
        // Insert into wallet_histories
        $bonuss=DB::table('wallet_history')->insert([
            'userid'     => $userid,
            'amount'      => $amount,
            'description' => 'Invitation Bonus',
            'subtypeid'     => 26, // Define type_id as 1 for bonus claim
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
        
         $bonuss=DB::table('invite_bonus_claim')->insert([
            'userid'     => $userid,
            'invite_id' => $invite_id,
            'status' => 0,
            'created_at'  => now(),
            'updated_at'  => now(),
        ]);
     }else{
     
     }
         if (!empty($bonuss)) {
                $response = [
                    'message' => 'invitation bonus claimed successfully!',
                    'status' => 200,
                ];
                return response()->json($response,200);
            } else {
                return response()->json([
    				'message' => 'Bonus not claimed ..!',
    				'status' => 400,
                    ], 400);
            }
            
           } else{
             return response()->json([
    				'message' => 'Already claimed ..!',
    				'status' => 400,
                    ], 400);  
           }
    	}
	
	public function getPaymentLimits()
{
    $details = DB::select("SELECT `name`, `amount` FROM `payment_limits` WHERE 1");
    //dd($details);

    if ($details) {
        $formattedData = [];
        foreach ($details as $detail) {
            $formattedData[$detail->name] = $detail->amount;
        }
        //dd($formattedData);
//return $formattedData;
        return response()->json([
            'status' => 200,
            'message' => 'Data found',
            'data' => $formattedData
        ]);
    } else {
        return response()->json([
            'message' => 'No record found',
            'status' => 400,
            'data' => []
        ], 400);
    }
}

	
	public function payin_usdt(Request $request){
    // Validation
    $validator = Validator::make($request->all(), [
        'user_id' => 'required|exists:users,id',
        'amount' => 'required|numeric|gt:0',
        'type' => 'required|in:1',
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 200);
    }

    // Get input data
    $user_id = $request->user_id;
    $amount = $request->amount;
    $type = $request->type;
    $inr_amt = $amount * 94;
    
    // Get client IP address
   // $clientIp = $request->ip();

    // Dump and die to see IP address
    //dd('Client IP Address:', $clientIp); // Here, you can see the IP

    $email = 'Globalbettech@gmail.com'; 
    $token = '58839776549046321236110964258208'; // Replace with a secure token or config value
    $apiUrl = "https://cryptofit.biz/Payment/coinpayments_api_call";
    $coin = 'USDT.BEP20';

    // Generate unique order ID
    do {
        $orderId = str_pad(mt_rand(1000000000, 9999999999), 10, '0', STR_PAD_LEFT);
    } while (DB::table('payins')->where('order_id', $orderId)->exists());

    // User validation
    $user_exist = DB::table('users')->where('id', $user_id)->first();

    // Prepare API data
    $formData = [
        'txtamount' => $amount,
        'coin' => $coin,
        'UserID' => $email,
        'Token' => $token,
        'TransactionID' => $orderId,
    ];

    try {
        // Make API request
        $response = Http::asForm()->post($apiUrl, $formData);

        Log::info('PayIn API Response:', ['response' => $response->body()]);
        Log::info('PayIn API Status Code:', ['status' => $response->status()]);

        // Decode the response
        $apiResponse = json_decode($response->body());
		//dd($apiResponse);
        //dd($apiResponse); // You can dump API response here
        // Check if the API response is successful
        if ($response->successful() && isset($apiResponse->error) && $apiResponse->error === 'ok') {
            // Insert data into payins table
            $inserted_id = DB::table('payins')->insertGetId([
                'user_id' => $user_id,
                'status' => 1,
                'order_id' => $orderId,
                'cash' => $inr_amt,
                'usdt_amount' => $amount,
                'type' => $type,
            ]);
             //dd($inserted_id);
            return response()->json([
                'status' => 200,
                'message' => 'Payment initiated successfully.',
                'data' => $apiResponse,
            ], 200);
        }

        return response()->json([
            'status' => 400,
            'message' => 'Failed to initiate payment.'
        ], 400);
    } catch (\Exception $e) {
        Log::error('PayIn API Error:', ['error' => $e->getMessage()]);
        return response()->json(['status' => 400, 'message' => 'Internal Server Error'], 400);
    }
}

  

public function payin_call_back(Request $request)
{
    // Validation
    $validator = Validator::make($request->all(), [
        'invoice' => 'required',
        'status_text' => 'required',
        'amount' => 'required'
    ]);

    $validator->stopOnFirstFailure();

    if ($validator->fails()) {
        return response()->json(['status' => 400, 'message' => $validator->errors()->first()], 200);
    }

    // Get input data
    $invoice = $request->invoice;
    $status_text = $request->status_text;
    $amount = $request->amount;

    // Get client IP address
    $clientIp = $request->ip();

    // Dump and die to see IP address
   // dd('Client IP Address:', $clientIp); // Here, you can see the IP

    if ($status_text == 'complete') {
        // Update payment status
        $a = DB::table('payins')->where('order_id', $invoice)->update(['status' => 2]);

        if ($a) {
            // Get user details
            $user_detail = Payin::where('order_id', $invoice)
                ->where('status', 2)
                ->first();

            $user_id = $user_detail->user_id;
            $amount1 = $user_detail->cash;

            // Update wallet balance
            $update = User::where('id', $user_id)->update(['wallet' => $amount1]);

            return response()->json(['status' => 200, 'message' => 'Payment successful.'], 200);
        } else {
            return response()->json(['status' => 400, 'message' => 'Failed to update!'], 400);
        }
    } else {
        return response()->json(['status' => 400, 'message' => 'Something went wrong!'], 400);
    }
}

	
	public function getUrlIp()
{
    $url = 'root.globalbet24.live'; // Aapko full URL ke bajaye sirf domain name use karna hoga

    // Get the IPv4 address of the URL using gethostbyname
    $ipv4_address = gethostbyname($url);

    // Dump the IPv4 address to check
    dd('The IPv4 address of ' . $url . ' is: ' . $ipv4_address);
}
    
    
	
	public function forget_reset_password(Request $request){
    // Manual Validator for JSON response
    $validator = Validator::make($request->all(), [
        'mobile' => 'required',
        'password' => 'required|min:6'
    ]);

    if ($validator->fails()) {
        return response()->json([
            'status' => 400,
            'errors' => $validator->errors()
        ],200);
    }

    $mobile = $request->input('mobile');
    $password = $request->input('password');

    // Check if user exists
    $user = DB::table('users')->where('mobile', $mobile)->first();

    if (!$user) {
        return response()->json([
            'status' => 400,
            'message' => 'User with this mobile number not found.'
        ],200);
    }

    // Update password
    DB::table('users')->where('mobile', $mobile)->update([
        'password' => $password,
        'updated_at' => now()
    ]);

    return response()->json([
        'status' => 200,
        'message' => 'Password reset successfully.'
    ]);
}
	
	
	

}