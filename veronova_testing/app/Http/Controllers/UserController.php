<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use DB;
use Illuminate\Support\Str;
use App\Models\All_image;
use Carbon\Carbon;

use Illuminate\Support\Facades\URL;


class UserController extends Controller
{
    
    
    // app/Http/Controllers/AdminController.php
public function illegalUsers()
{
    $illegalUsers = User::where('illegal_count', '>', 0)
        ->orderBy('id', 'desc')
        ->get();

    return view('user.illegal_bet', compact('illegalUsers'));
}

 public function illegal_single_Users($userid){
    $data = DB::table('bets')
        ->where('userid', $userid)
        ->where('status', 1)
        ->orderBy('id', 'desc')
        ->paginate(10); // 10 records per page
    return view('user.wingoSingleillegal', compact('data'));
}

  
 public function illegal_user_active(Request $request,$id)
    {
		$value = $request->session()->has('id');
	
        if(!empty($value))
        {
    //   Order::where("id",$id)->update(['status'=>0]);
    DB::update("UPDATE `users` SET `status`='1' WHERE id=$id;");
        
        return redirect()->route('admin.illegalUsers');
			  }
        else
        {
           return redirect()->route('login');  
        }
    }
	
    public function illegal_user_inactive(Request $request,$id)
  {
		$value = $request->session()->has('id');
	
        if(!empty($value))
        {
    //   Order::where("id",$id)->update(['status'=>1]);
      DB::update("UPDATE `users` SET `status`='0' WHERE id=$id;");
        return redirect()->route('admin.illegalUsers');
			  }
        else
        {
           return redirect()->route('login');  
        }
  }

//     public function user_create(Request $request)
//     {
// 		$value = $request->session()->has('id');
	
//         if(!empty($value))
//         {

// 			$users = DB::select("
//     SELECT e.*, m.username AS sname 
//     FROM users e 
//     LEFT JOIN users m ON e.referral_user_id = m.id 
//     WHERE e.account_type = 0
// 	 AND e.id != 1
	 
// ");

// 		//$users = DB::table('user')->latest()->get();
        
//         return view ('user.index', compact('users'));
//         }
//         else
//         {
//           return redirect()->route('login');  
//         }
        
//     }

public function user_create(Request $request)
{
    $value = $request->session()->has('id');

    if (!empty($value))
    {
        $users = DB::select("
            SELECT e.*, m.username AS sname
            FROM users e
            LEFT JOIN users m ON e.referral_user_id = m.id
            WHERE e.account_type = 0
              AND e.id != 1
            ORDER BY e.id DESC
        ");

        return view('user.index', compact('users'));
    }
    else
    {
        return redirect()->route('login');
    }
}
	
    public function user_details(Request $request,$id)
    {
		$value = $request->session()->has('id');
	
        if(!empty($value))
        {
        $users = DB::select("SELECT * FROM `bets` WHERE `userid`='$id' ORDER BY id DESC ");
        $withdrawal = DB::select("SELECT * FROM `withdraw_histories` WHERE `user_id`='$id' ORDER BY id DESC ");
        $dipositess = DB::select("SELECT * FROM `payins` WHERE `user_id`='$id' ORDER BY id DESC ");
       return view ('user.user_detail',compact('dipositess','users','withdrawal')); 
			  }
        else
        {
           return redirect()->route('login');  
        }
    }

    public function user_active(Request $request,$id)
    {
		$value = $request->session()->has('id');
	
        if(!empty($value))
        {
    //   Order::where("id",$id)->update(['status'=>0]);
    DB::update("UPDATE `users` SET `status`='1' WHERE id=$id;");
        
        return redirect()->route('users');
			  }
        else
        {
           return redirect()->route('login');  
        }
    }
	
    public function user_inactive(Request $request,$id)
  {
		$value = $request->session()->has('id');
	
        if(!empty($value))
        {
    //   Order::where("id",$id)->update(['status'=>1]);
      DB::update("UPDATE `users` SET `status`='0' WHERE id=$id;");
        return redirect()->route('users');
			  }
        else
        {
           return redirect()->route('login');  
        }
  }

	 public function password_update(Request $request, $id)
      {
		 $value = $request->session()->has('id');
	
        if(!empty($value))
        {
        $password=$request->password;
               $data= DB::update("UPDATE `users` SET `password`='$password' WHERE id=$id");
         
             return redirect()->route('users')->with('success', 'Password updated successfully!');
			  }
        else
        {
           return redirect()->route('login');  
        }
          
      }
      	public function refer_id_store(Request $request ,$id)
    {
		date_default_timezone_set('Asia/Kolkata');
		$date=date('Y-m-d H:i:s');
		$value = $request->session()->has('id');
	
        if(!empty($value))
        {
      $refer=$request->referral_user_id;
     //dd($wallet);
         $data = DB::update("UPDATE `users` SET `referral_user_id` = $refer WHERE id = $id;");
			
             return redirect()->route('users');
			  }
        else
        {
           return redirect()->route('login');  
        }
      }
	
	public function wallet_store_old(Request $request, $id)
{
    date_default_timezone_set('Asia/Kolkata');
    $date = date('Y-m-d H:i:s');
    $value = $request->session()->has('id');

    if (!empty($value)) {
        $wallet = $request->wallet;
        $remark = $request->remark; // get remark from request

        // Update user's wallet
        DB::update("
            UPDATE `users` 
            SET 
                `wallet` = `wallet` + ?, 
                `deposit_balance` = `deposit_balance` + ?, 
                `total_payin` = `total_payin` + ? 
            WHERE id = ?
        ", [$wallet, $wallet, $wallet, $id]);

        // Insert into payins
        DB::insert("
            INSERT INTO `payins`(`user_id`, `cash`, `order_id`, `type`, `status`, `created_at`) 
            VALUES (?, ?, 'via Admin', '2', '2', ?)
        ", [$id, $wallet, $date]);

        // Insert into wallet_history
        DB::insert("
            INSERT INTO `wallet_history`(`userid`, `amount`, `subtypeid`, `description`, `created_at`, `updated_at`) 
            VALUES (?, ?, '2', ?, ?, ?)
        ", [$id, $wallet, $remark, $date, $date]);

        return redirect()->route('users');
    } else {
        return redirect()->route('login');
    }
}

	
	public function wallet_store(Request $request ,$id)
    {
		date_default_timezone_set('Asia/Kolkata');
		$date=date('Y-m-d H:i:s');
		$value = $request->session()->has('id');
	
        if(!empty($value))
        {
      $wallet=$request->wallet;
     //dd($wallet);
         $data = DB::update("UPDATE `users` SET `wallet` = `wallet` + $wallet,`deposit_balance`=`deposit_balance`+$wallet,`total_payin`=`total_payin`+$wallet WHERE id = $id;");
			$insert=DB::insert("INSERT INTO `payins`(`user_id`, `cash`, `order_id`, `type`, `status`,`created_at`) VALUES ('$id','$wallet','via Admin','2','2','$date')");
		
             return redirect()->route('users');
			  }
        else
        {
           return redirect()->route('login');  
        }
      }
	public function wallet_subtract(Request $request, $id)
{
    date_default_timezone_set('Asia/Kolkata');
    $ammount = $request->wallet;

    // Check if the request has a wallet amount
    if ($request->has('wallet')) {
        // Retrieve the user using Eloquent
        $user = User::find($id);

        // Check if user exists
        if (!$user) {
            return redirect()->back()->with('error', 'User not found.');
        }

        // Check if the wallet amount is sufficient
        if ($user->wallet < $ammount) {
            return redirect()->back()->with('error', 'Insufficient wallet balance.');
        }

        // Subtract the amount from the wallet
        $user->wallet -= $ammount;
        $user->save();

        return redirect()->route('users')->with('success', 'Amount subtracted successfully!');
    }

    return redirect()->back()->with('error', 'No amount specified.');
}

// Need to Bet amount controller

public function betamount_store(Request $request ,$id)
    {
		date_default_timezone_set('Asia/Kolkata');
		$date=date('Y-m-d H:i:s');
		$value = $request->session()->has('id');
	
        if(!empty($value))
        {
      $wallet=$request->recharge;
     //dd($wallet);
         $data = DB::update("UPDATE `users` SET `recharge` = `recharge` + $wallet WHERE id = $id;");
// 			$insert=DB::insert("INSERT INTO `payins`(`user_id`, `cash`, `order_id`, `type`, `status`,`created_at`) VALUES ('$id','$wallet','via Admin','2','2','$date')");
		
             return redirect()->route('users');
			  }
        else
        {
           return redirect()->route('login');  
        }
      }
	public function betamount_subtract(Request $request, $id)
{
    date_default_timezone_set('Asia/Kolkata');
    $ammount = $request->recharge;

    // Check if the request has a wallet amount
    if ($request->has('recharge')) {
        // Retrieve the user using Eloquent
        $user = User::find($id);

        // Check if user exists
        if (!$user) {
            return redirect()->back()->with('error', 'User not found.');
        }

        // Check if the wallet amount is sufficient
        if ($user->recharge < $ammount) {
            return redirect()->back()->with('error', 'Insufficient Betting Amount.');
        }

        // Subtract the amount from the wallet
        $user->recharge -= $ammount;
        $user->save();

        return redirect()->route('users')->with('success', 'Betting Amount subtracted successfully!');
    }

    return redirect()->back()->with('error', 'No amount specified.');
}

		public function user_mlm(Request $request,$id)
    {
			
$value = $request->session()->has('id');
	
        if(!empty($value))
        {

$curl = curl_init();

curl_setopt_array($curl, array(
  CURLOPT_URL => "https://mahajong.club/admin/index.php/Mahajongapi/level_getuserbyrefid?id=$id",
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_ENCODING => '',
  CURLOPT_MAXREDIRS => 10,
  CURLOPT_TIMEOUT => 0,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
  CURLOPT_CUSTOMREQUEST => 'GET',
  CURLOPT_HTTPHEADER => array(
    'Cookie: ci_session=itqv6s6aqactjb49n7ui88vf7o00ccrf'
  ),
));

$response = curl_exec($curl);

curl_close($curl);
$data= json_decode($response);

             return view ('user.mlm_user_view')->with('data', $data);
			
			  }
        else
        {
           return redirect()->route('login');  
        }
      }
      
      
    public function registerwithref($id){
         
         $ref_id = User::where('referral_code',$id)->first();
        //  $country=DB::select("SELECT `phone_code` FROM `country` WHERE 1;");
        $country = DB::table("country")->select("phone_code")->get();
       
         return view('user.newregister')->with('ref_id',$ref_id)->with('country',$country);
         
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
      
        public function register_store(Request $request,$referral_code)
      {
          $validatedData = $request->validate([
            'mobile' => 'required|unique:users,mobile|regex:/^\d{10}$/',
            'password' => 'required',
            'email' => 'required|unique:users,email',
        ]);
          //dd($ref_id);

       $refer = DB::table('users')->where('referral_code', $referral_code)->first();
	 	if ($refer !== null) {
			$referral_user_id = $refer->id;

    // $username = Str::upper(Str::random(6, 'alpha'));
    $username = Str::random(6, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
	    $u_id = $this->generateRandomUID();
	     
	     $referral_code = Str::upper(Str::random(6, 'alpha'));
	     
	      $rrand = rand(1,20);
          $all_image = All_image::find($rrand);
          
    $image = $all_image->image;
	
    $userId = DB::table('users')->insertGetId([
        'mobile' => $request->mobile,
        'email' => $request->email,
        'username' => $username,
        'password' =>$request->password,
        'referral_user_id' =>$referral_user_id,
        'referral_code' => $referral_code,
		'u_id' => $u_id,
		'status' => 1,
		'userimage' => $image,
    ]);
  // $refid= isset($referral_user_id)? $referral_user_id : '8';
     DB::select("UPDATE `users` SET `yesterday_register`=yesterday_register+1 WHERE `id`=$referral_user_id");
	
return redirect(str_replace('https://admin.', 'http://', "https://webbdgcassino.apponrent.com/"));

		
}
}

     public function updatereferral(Request $request, $id){
         //dd($request->all(), $id );
        $request->validate([
            'referral_user_id' => 'required|string|max:255',
        ]);

        DB::table('users')
            ->where('id', $id)
            ->update(['referral_user_id' => $request->input('referral_user_id')]);
        return redirect()->back()->with('success', 'Sponser ID updated successfully!');
    }
    
    
    ///// Demo User //////
    // public function create()
    // {
    //     return view('user.demo_user');
    // }
    public function demoUser(Request $request)
{
    if ($request->session()->has('id')) {
        $demo_users = DB::select(" SELECT * FROM `users` WHERE `account_type`=1 ORDER BY id DESC");

        return view('user.demo_user', compact('demo_users'));
    } else {
        return redirect()->route('login');
    }
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

   
public function store(Request $request)
{
    // Step 1: Validate Request Data
    $request->validate([
        'email' => 'required|email|unique:users,email',
        'mobile' => 'required',
        'password' => 'required|min:6',
    ]);
    
    // Step 2: Generate Required Data
    $randomName = 'User_' . strtoupper(Str::random(5));
    $randomReferralCode = $this->generateNumericCode(13);
    $baseUrl = URL::to('/');
    $uid = $this->NumericCode(8);
    $randomNumber = rand(1, 20);

    // Step 3: Prepare User Data
    $data = [
        'username' => $randomName,
        'u_id' => $uid,
        'mobile' => $request->mobile,
        'email' => $request->email,
        'password' => $request->password,
        'userimage' => $baseUrl . "/uploads/profileimage/" . $randomNumber . ".png",
        'status' => 1,
        'referral_code' => $randomReferralCode,
        'wallet' => 0,
        'account_type'=>1,
        'country_code' => $request->country_code ?? '', // Default to empty if not provided
        'created_at' => now(),
        'updated_at' => now(),
    ];

    // Step 4: Add Referrer
    if ($request->filled('referral_code')) {
        $referrer = DB::table('users')->where('referral_code', $request->referral_code)->first();
        $data['referral_user_id'] = $referrer ? $referrer->id : null;
    } else {
        $data['referral_user_id'] = 1;
    }

    // Step 5: Store User Data
    DB::table('users')->insert($data);

    // Step 6: Redirect with Success Message
    return redirect()->route('register.create')->with('success', 'User registered successfully!');
}
    
      public function fund_transfer(){
    $data = DB::table('subtype')
          ->whereBetween('id', [36, 42])
          ->get();

    $fund_user_details = DB::table('fund_user_details')
        ->orderByDesc('id')
        ->paginate(10); // 10 records per page

    return view('user.fund_transfer_by_admin', compact('data', 'fund_user_details'));
}
 
 
    public function getUsername($id)
{
    $user = DB::table('users')->where('id', $id)->first();

    if ($user) {
        return response()->json([
            'success' => true,
            'username' => $user->username
        ]);
    } else {
        return response()->json(['success' => false]);
    }
}

  public function giveBonus(Request $request)
{
	
    // ✅ Validate inputs
    $request->validate([
        'user_id' => 'required|exists:users,u_id',
        'bonus'   => 'required|numeric|min:0.1',
        'remark'  => 'required|string',
        'type'    => 'required'
    ]);
 
    // ✅ Extract values
    $user_id = $request->user_id;
    $bonus   = $request->bonus;
    $remark  = $request->remark;
    $type    = $request->type;

    // ✅ Get fund subtype name
    $name = DB::table('subtype')->where('id', $type)->value('name');
    // ✅ Insert into fund_user_details
	  
    DB::table('fund_user_details')->insert([
        'user_id'    => $user_id,
        'remark'     => $remark,
        'amount'     => $bonus,
        'type'       => $type,
        'description'=> $name,
        'created_at' => now(),
        'updated_at' => now(),
    ]);

    // ✅ Update user's recharge and wallet
    DB::table('users')
        ->where('u_id', $user_id)
        ->incrementEach([
            'recharge'        => $bonus,
            'wallet'  => $bonus,
        ]);

    // ✅ Insert into wallet history
    DB::table('wallet_history')->insert([
        'userid'      => $user_id,
        'subtypeid'   => $type, // You can replace 30 with a dynamic value if needed
        'description' => 'Fund Transfer from Admin',
        'amount'      => $bonus,
        'created_at'  => now(),
        'updated_at'  => now(),
    ]);

    return back()->with('success', 'Bonus added successfully to user wallet.');
}

    
    

   public function filterSubordinateData(Request $request, $id)
{
    $userId = $id;
    $tier = $request->mlm_level_id ?? 0;
    $searchUid = $request->search_uid ?? null;
    $currentDate = $request->date ? Carbon::parse($request->date) : Carbon::now()->subDay();
    $filterDate = $currentDate->format('Y-m-d');

    $subordinateMap = collect();

    $currentLevelUsers = User::where('referral_user_id', $userId)
        ->where('account_type', 0)
        ->get()
        ->map(function ($user) {
            $user->level = 1;
            return $user;
        });

    $currentLevel = 1;

    while ($currentLevelUsers->isNotEmpty() && ($tier == 0 || $currentLevel <= $tier)) {
        foreach ($currentLevelUsers as $user) {
            $subordinateMap->push(['id' => $user->id, 'level' => $user->level]);
        }

        $nextLevelUsers = User::whereIn('referral_user_id', $currentLevelUsers->pluck('id'))
            ->where('account_type', 0)
            ->get()
            ->map(function ($user) use ($currentLevel) {
                $user->level = $currentLevel + 1;
                return $user;
            });

        $currentLevelUsers = $nextLevelUsers;
        $currentLevel++;
    }

    if ($tier > 0) {
        $subordinateMap = $subordinateMap->where('level', $tier)->values();
    }

    $subordinateIds = $subordinateMap->pluck('id');

    if (!empty($searchUid)) {
        $filteredIds = User::whereIn('id', $subordinateIds)
            ->where('u_id', 'like', $searchUid . '%')
            ->pluck('id');

        $subordinateMap = $subordinateMap->whereIn('id', $filteredIds)->values();
        $subordinateIds = $filteredIds;
    }

    if ($subordinateIds->isEmpty()) {
        $tierList = DB::table('mlm_levels')->get();
        return view('user.viewSubordinateData', [
            'tier' => $tierList,
            'userId' => $userId,
            "result" => [
                'number_of_deposit' => 0,
                'payin_amount' => 0,
                'number_of_bettor' => 0,
                'bet_amount' => 0,
                'first_deposit' => 0,
                'first_deposit_amount' => 0,
                'subordinates_data' => [],
            ]
        ]);
    }

    $levelCases = [];
    foreach ($subordinateMap as $item) {
        $levelCases[] = "SELECT {$item['id']} as id, {$item['level']} as level";
    }
    $levelTable = implode(" UNION ALL ", $levelCases);

    $subordinatesData = DB::table('users')
        ->join(DB::raw("($levelTable) as level_map"), 'users.id', '=', 'level_map.id')
        ->leftJoin('mlm_levels', 'users.role_id', '=', 'mlm_levels.id')
        ->leftJoin(DB::raw("(
            SELECT userid, SUM(amount) as total_bet 
            FROM bets 
            WHERE DATE(created_at) = '{$filterDate}'
            GROUP BY userid
        ) as bet_data"), 'users.id', '=', 'bet_data.userid')
        ->leftJoin(DB::raw("(
            SELECT user_id, SUM(cash) as total_payin, COUNT(id) as deposit_count 
            FROM payins 
            WHERE DATE(created_at) = '{$filterDate}'
            AND status = 2 
            GROUP BY user_id
        ) as payin_data"), 'users.id', '=', 'payin_data.user_id')
        ->leftJoin(DB::raw("(
            SELECT p1.user_id, COUNT(p1.id) as total_first_recharge, SUM(p1.cash) as total_first_deposit_amount 
            FROM payins p1 
            WHERE p1.status = 2 
            AND DATE(p1.created_at) = '{$filterDate}'
            AND p1.created_at = (
                SELECT MIN(p2.created_at) 
                FROM payins p2 
                WHERE p2.user_id = p1.user_id 
                AND p2.status = 2
                AND DATE(p2.created_at) = '{$filterDate}'
            )
            GROUP BY p1.user_id
        ) as first_deposit_data"), 'users.id', '=', 'first_deposit_data.user_id')
        ->whereIn('users.id', $subordinateIds)
        ->select([
            'users.id',
            'users.u_id',
            'level_map.level',
            'mlm_levels.commission as commission_percentage',
            DB::raw('COALESCE(bet_data.total_bet, 0) as bet_amount'),
            DB::raw('COALESCE(payin_data.total_payin, 0) as payin_amount'),
            DB::raw('COALESCE(payin_data.deposit_count, 0) as number_of_deposit'),
            DB::raw('(COALESCE(bet_data.total_bet, 0) * COALESCE(mlm_levels.commission, 0)) / 100 as commission'),
            DB::raw('COALESCE(first_deposit_data.total_first_recharge, 0) as total_first_recharge'),
            DB::raw('COALESCE(first_deposit_data.total_first_deposit_amount, 0) as total_first_deposit_amount')
        ])
        ->get();

    $result = [
        'number_of_deposit' => 0,
        'payin_amount' => 0,
        'number_of_bettor' => 0,
        'bet_amount' => 0,
        'first_deposit' => 0,
        'first_deposit_amount' => 0,
        'subordinates_data' => [],
    ];

    foreach ($subordinatesData as $user) {
        $betAmount = $user->bet_amount;
        $payinAmount = $user->payin_amount;
        $depositCount = $user->number_of_deposit;
        $commission = $user->commission;
        $firstDeposit = $user->total_first_recharge;
        $firstDepositAmount = $user->total_first_deposit_amount;

        $result['bet_amount'] += $betAmount;
        $result['payin_amount'] += $payinAmount;
        $result['number_of_deposit'] += $depositCount;
        $result['first_deposit'] += $firstDeposit;
        $result['first_deposit_amount'] += $firstDepositAmount;

        if ($betAmount > 0) {
            $result['number_of_bettor']++;
        }

        $result['subordinates_data'][] = [
            'id' => $user->id,
            'u_id' => $user->u_id,
            'level' => $user->level,
            'bet_amount' => $betAmount,
            'payin_amount' => $payinAmount,
            'number_of_deposit' => $depositCount,
            'commission' => $commission,
            'first_deposit' => $firstDeposit,
            'first_deposit_amount' => $firstDepositAmount,
        ];
    }

    $tierList = DB::table('mlm_levels')->get();
    return view('user.viewSubordinateData', [
        'tier' => $tierList,
        'userId' => $userId,
        "result" => $result
    ]);
}


     public function all_details(Request $request, $user_id){
        $status = $request->status ?? 1;
       // dd($status, $request->all());
        if ($request->status == 1) {
            $data = DB::table('bets')->where('userid', $user_id)->orderBy('id', 'desc')->get();
        } elseif ($request->status == 2) {
            $data = DB::table('chicken_bets')->where('user_id', $user_id)->orderBy('id', 'desc')->get();
        } elseif ($request->status == 3) {
            $data = DB::table('aviator_bet')->where('uid', $user_id)->orderBy('id', 'desc')->get();
        } elseif ($request->status == 4) {
            $data = DB::table('payins')->where('user_id', $user_id)->orderBy('id', 'desc')->get();
        } elseif ($request->status == 5) {
            $data = DB::table('withdraws')->where('user_id', $user_id)->orderBy('id', 'desc')->get();
        } elseif ($request->status == 6) {
            $data = DB::table('gift_claim')->where('userid', $user_id)->orderBy('id', 'desc')->get();
        } else {
            $data = DB::table('aviator_bet')->where('uid', $user_id)->orderBy('id', 'desc')->get();
        }
    return view('user.activityInfo', compact('data', 'status'));
}

    public function bank_details(){
		//dd("hii");
		$data = DB::table('account_details')
    ->orderBy('id', 'desc')
    ->get();
		
	}
    
    
      
}