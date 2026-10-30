<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use App\Models\User;
use DB;
use Validator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;


class LoginController extends Controller
{
    use AuthorizesRequests, ValidatesRequests;

    public function register_create()
    {
        return view ('admin.register');
    }
    
       public function register_store(Request $request)
    {
         $request->validate([
             'name'   => 'required | max:45',
             'email'  => 'required',
             'mobile'  =>'required',
             'user_name' =>'required',
             'password'  =>'required',
                  
         ]);
        $data=[
             'name'=>$request->name,
             'email'=>$request->email,
             'mobile'=>$request->mobile,
             'user_name'=>$request->user_name,
             'password'=>$request->password,
             'status'=>1
             ];
 
             User::create($data);
            return redirect()->route('login');
        
      }
      
    public function login()
    {
        return view('admin.login');
    }

	
	
    public function auth_login(Request $request) 
    {
        $request->validate([
            'email'=>'required',
            'password'=>'required',
		
            ]);
        //$login = DB::table('user')->where('email','=',$request['email'])->
       // where('password','=', $request['password'])->first();
		$login = DB::table('users')->where('email','=',$request['email'])->
        where('password','=', $request['password'])->where('verification','=','2')->where('role_id','=','1')->where('id','=','1')->first();
		// $otp=DB::table('otp_sms')->where('mobile','=','9167027770')->where('otp','=', $request['otp'])->first();
	
        if($login == NULL)
        {
		
            session()->flash('msg_class','danger');
            session()->flash('msg','The provided Admin do not match our records.');
            return redirect()->route('login');
		}
			
		else{
			 $request->session()->put('id', $login->id);

            return redirect()->route('dashboard'); 
			}
			 
        }

//comment by Rk sharma	
// 	public function dashboard(Request $request) 
// {
//     $userId = $request->session()->get('id');

//     if (!empty($userId)) {
//         date_default_timezone_set("Asia/Calcutta"); 
//         $date = date('Y-m-d');

//         $startdate = $request->input('start_date');
//         $enddate = $request->input('end_date');

//         if (empty($startdate) && empty($enddate)) {
//              $users = DB::select("SELECT
//                 (SELECT COUNT(id) FROM users WHERE account_type = 0) as totaluser,
//                 (SELECT COUNT(id) FROM users WHERE users.created_at LIKE '$date%' AND account_type = 0) as todayuser,
//                 (SELECT COUNT(id) FROM users WHERE users.status = '1' AND account_type = 0) as activeuser,
//                 (SELECT COUNT(id) FROM game_settings WHERE game_settings.status = 0) as totalgames,
//                 (SELECT COUNT(b.id) FROM bets b INNER JOIN users u ON b.userid = u.id WHERE u.account_type = 0) as totalbet,
//                 (SELECT COUNT(id) FROM feedbacks) as totalfeedback,
//                 (SELECT SUM(p.cash) FROM payins p INNER JOIN users u ON p.user_id = u.id WHERE p.status = '2' AND u.account_type = 0) as totaldeposit,
//                 COALESCE((SELECT SUM(w.amount) FROM withdraw_histories w INNER JOIN users u ON w.user_id = u.id WHERE w.status = 2 AND w.created_at LIKE '$date%' AND u.account_type = 0), 0) as tamount,
//                 COALESCE((SELECT SUM(w.amount) FROM withdraw_histories w INNER JOIN users u ON w.user_id = u.id WHERE w.status = 2 AND u.account_type = 0), 0) as totalwithdraw,
//                 COALESCE((SELECT SUM(p.cash) FROM payins p INNER JOIN users u ON p.user_id = u.id WHERE p.status = '2' AND p.created_at LIKE '$date%' AND u.account_type = 0), 0) as tdeposit,
//                 SUM(commission) as commissions,
//                 COALESCE((SELECT SUM(b.amount) FROM bets b INNER JOIN users u ON b.userid = u.id WHERE b.created_at LIKE '$date%' AND u.account_type = 0), 0) as todayturnover,
//                 COUNT(id) as users,
//                 (SELECT SUM(b.amount) FROM bets b INNER JOIN users u ON b.userid = u.id WHERE u.account_type = 0) as total_turnover
//             FROM users WHERE account_type = 0;");
//         } else {
//             $users = DB::select("
//                 SELECT
//                     (SELECT COUNT(id) FROM users WHERE created_at BETWEEN '$startdate' AND '$enddate' AND account_type = 0) as totaluser,
//                     (SELECT COUNT(id) FROM users WHERE users.created_at LIKE '$date%' AND account_type = 0) as todayuser,
//                     (SELECT COUNT(id) FROM users WHERE created_at BETWEEN '$startdate' AND '$enddate' AND users.status = '1' AND account_type = 0) as activeuser,
//                     (SELECT COUNT(id) FROM game_settings WHERE created_at BETWEEN '$startdate' AND '$enddate') as totalgames,
//                     (SELECT COUNT(b.id) FROM bets b INNER JOIN users u ON b.userid = u.id WHERE b.created_at BETWEEN '$startdate' AND '$enddate' AND u.account_type = 0) as totalbet,
//                     (SELECT COUNT(id) FROM feedbacks WHERE created_at BETWEEN '$startdate' AND '$enddate') as totalfeedback,
//                     COALESCE((SELECT SUM(p.cash) FROM payins p INNER JOIN users u ON p.user_id = u.id WHERE p.status = 2 AND DATE(p.created_at) BETWEEN '$startdate' AND '$enddate' AND u.account_type = 0), 0) as totaldeposit,
//                     COALESCE((SELECT SUM(w.amount) FROM withdraw_histories w INNER JOIN users u ON w.user_id = u.id WHERE w.status = 2 AND DATE(w.created_at) BETWEEN '$startdate' AND '$enddate' AND u.account_type = 0), 0) as tamount,
//                     COALESCE((SELECT SUM(w.amount) FROM withdraw_histories w INNER JOIN users u ON w.user_id = u.id WHERE w.status = 2 AND u.account_type = 0), 0) as totalwithdraw,
//                     COALESCE((SELECT SUM(p.cash) FROM payins p INNER JOIN users u ON p.user_id = u.id WHERE p.status = 2 AND DATE(p.created_at) BETWEEN '$startdate' AND '$enddate' AND u.account_type = 0), 0) as tdeposit,
//                     SUM(commission) as commissions,
//                     COALESCE((SELECT SUM(b.amount) FROM bets b INNER JOIN users u ON b.userid = u.id WHERE b.created_at LIKE '$date%' AND u.account_type = 0), 0) as todayturnover,
//                     COUNT(id) as users,
//                     SUM(turnover) as total_turnover
//                 FROM users
//                 WHERE created_at BETWEEN '$startdate' AND '$enddate' AND account_type = 0
//             ");
//         }

//         session()->flash('msg_class','success');
//         session()->flash('msg','Login Successfully ..!');
//         return view('admin.index', ['users' => $users]);
//     } else {
//         return redirect()->route('login');  
//     }
// }

//end by rk sharma
	
//updated by rk sharma	
	
public function dashboard(Request $request) 
{
    $userId = $request->session()->get('id');

    if (!empty($userId)) {
        date_default_timezone_set("Asia/Calcutta"); 
        $date = date('Y-m-d');
		//dd($date);
       
        $start_raw = $request->input('start_date');
        $end_raw = $request->input('end_date');

       
        $startdate = $start_raw ? $start_raw . ' 00:00:00' : null;
        $enddate = $end_raw ? $end_raw . ' 23:59:59' : null;

       
        if (empty($startdate) && empty($enddate)) {
            $users = DB::select("
                SELECT
                    (SELECT COUNT(id) FROM users WHERE account_type = 0) as totaluser,
                    (SELECT COUNT(id) FROM users WHERE created_at LIKE '$date%' AND account_type = 0) as todayuser,
                    (SELECT COUNT(id) FROM users WHERE status = '1' AND account_type = 0) as activeuser,
                    (SELECT COUNT(id) FROM game_settings WHERE status = 0) as totalgames,
                    (SELECT COUNT(b.id) FROM bets b INNER JOIN users u ON b.userid = u.id WHERE u.account_type = 0) as totalbet,
                    (SELECT COUNT(id) FROM feedbacks) as totalfeedback,
                    (SELECT SUM(p.cash) FROM payins p INNER JOIN users u ON p.user_id = u.id WHERE p.status = 2 AND u.account_type = 0) as totaldeposit,
                    COALESCE((SELECT SUM(w.amount) FROM withdraw_histories w INNER JOIN users u ON w.user_id = u.id WHERE w.status = 2 AND w.created_at LIKE '$date%' AND u.account_type = 0), 0) as tamount,
                    COALESCE((SELECT SUM(w.amount) FROM withdraw_histories w INNER JOIN users u ON w.user_id = u.id WHERE w.status = 2 AND u.account_type = 0), 0) as totalwithdraw,
                    COALESCE((SELECT SUM(p.cash) FROM payins p INNER JOIN users u ON p.user_id = u.id WHERE p.status = 2 AND p.created_at LIKE '$date%' AND u.account_type = 0), 0) as tdeposit,
                    (SELECT SUM(commission) FROM users WHERE account_type = 0) as commissions,
                    COALESCE((SELECT SUM(b.amount) FROM bets b INNER JOIN users u ON b.userid = u.id WHERE b.created_at LIKE '$date%' AND u.account_type = 0), 0) as todayturnover,
                    COUNT(id) as users,
                    (SELECT SUM(b.amount) FROM bets b INNER JOIN users u ON b.userid = u.id WHERE u.account_type = 0) as total_turnover,

                    -- Chicken Game
                    (SELECT SUM(amount) FROM chicken_bets) AS chicken_total_amt,
                    (SELECT SUM(win_amount) FROM chicken_bets) AS chicken_total_win_amt,
                    (SELECT SUM(amount) - SUM(win_amount) FROM chicken_bets) AS chicken_total_admin_profit,

                    -- Aviator Game
                    (SELECT SUM(amount) FROM aviator_bet) AS aviator_total_amt,
                    (SELECT SUM(win) FROM aviator_bet) AS aviator_total_win_amt,
                    (SELECT SUM(amount) - SUM(win) FROM aviator_bet) AS aviator_total_admin_profit

                FROM users
                WHERE account_type = 0
                LIMIT 1
            ");
        } 
        
        else {
           $users = DB::select("
    SELECT
        -- Total users in date range
        (SELECT COUNT(id) FROM users WHERE created_at BETWEEN '$startdate' AND '$enddate' AND account_type = 0) as totaluser,

        -- Today's new users (filtered)
        (SELECT COUNT(id) FROM users WHERE created_at BETWEEN '$startdate' AND '$enddate' AND account_type = 0) as todayuser,

        -- Active users
        (SELECT COUNT(id) FROM users WHERE created_at BETWEEN '$startdate' AND '$enddate' AND status = '1' AND account_type = 0) as activeuser,

        -- Total games created
        (SELECT COUNT(id) FROM game_settings WHERE created_at BETWEEN '$startdate' AND '$enddate') as totalgames,

        -- Total bets placed (filtered)
        (SELECT COUNT(b.id) FROM bets b 
         INNER JOIN users u ON b.userid = u.id 
         WHERE b.created_at BETWEEN '$startdate' AND '$enddate' AND u.account_type = 0) as totalbet,

        -- Total feedbacks
        (SELECT COUNT(id) FROM feedbacks WHERE created_at BETWEEN '$startdate' AND '$enddate') as totalfeedback,

        -- Total deposits (filtered)
        COALESCE((SELECT SUM(p.cash) FROM payins p 
                  INNER JOIN users u ON p.user_id = u.id 
                  WHERE p.status = 2 AND p.created_at BETWEEN '$startdate' AND '$enddate' AND u.account_type = 0), 0) as totaldeposit,

        -- Total approved withdrawals (filtered)
        COALESCE((SELECT SUM(w.amount) FROM withdraw_histories w 
                  INNER JOIN users u ON w.user_id = u.id 
                  WHERE w.status = 2 AND w.created_at BETWEEN '$startdate' AND '$enddate' AND u.account_type = 0), 0) as tamount,

        -- Total withdrawals (filtered)
        COALESCE((SELECT SUM(w.amount) FROM withdraw_histories w 
                  INNER JOIN users u ON w.user_id = u.id 
                  WHERE w.status = 2 AND w.created_at BETWEEN '$startdate' AND '$enddate' AND u.account_type = 0), 0) as totalwithdraw,

        -- Total deposits again (redundant, but included)
        COALESCE((SELECT SUM(p.cash) FROM payins p 
                  INNER JOIN users u ON p.user_id = u.id 
                  WHERE p.status = 2 AND p.created_at BETWEEN '$startdate' AND '$enddate' AND u.account_type = 0), 0) as tdeposit,

        -- Commissions (filtered)
        COALESCE((SELECT SUM(commission) FROM users 
                  WHERE created_at BETWEEN '$startdate' AND '$enddate' AND account_type = 0), 0) as commissions,

        -- Today's turnover (filtered)
        COALESCE((SELECT SUM(b.amount) FROM bets b 
                  INNER JOIN users u ON b.userid = u.id 
                  WHERE b.created_at BETWEEN '$startdate' AND '$enddate' AND u.account_type = 0), 0) as todayturnover,

        -- Users again (filtered)
        (SELECT COUNT(id) FROM users WHERE created_at BETWEEN '$startdate' AND '$enddate' AND account_type = 0) as users,

        -- Total turnover (filtered)
        (SELECT SUM(b.amount) FROM bets b 
         INNER JOIN users u ON b.userid = u.id 
         WHERE b.created_at BETWEEN '$startdate' AND '$enddate' AND u.account_type = 0) as total_turnover,

        -- Chicken Game Stats
        (SELECT SUM(amount) FROM chicken_bets WHERE created_at BETWEEN '$startdate' AND '$enddate') AS chicken_total_amt,
        (SELECT SUM(win_amount) FROM chicken_bets WHERE created_at BETWEEN '$startdate' AND '$enddate') AS chicken_total_win_amt,
        (SELECT SUM(amount) - SUM(win_amount) FROM chicken_bets WHERE created_at BETWEEN '$startdate' AND '$enddate') AS chicken_total_admin_profit,

        -- Aviator Game Stats
        (SELECT SUM(amount) FROM aviator_bet WHERE created_at BETWEEN '$startdate' AND '$enddate') AS aviator_total_amt,
        (SELECT SUM(win) FROM aviator_bet WHERE created_at BETWEEN '$startdate' AND '$enddate') AS aviator_total_win_amt,
        (SELECT SUM(amount) - SUM(win) FROM aviator_bet WHERE created_at BETWEEN '$startdate' AND '$enddate') AS aviator_total_admin_profit

    FROM (SELECT 1) AS temp
");
        }

      
        session()->flash('msg_class', 'success');
        session()->flash('msg', 'Login Successfully ..!');
        return view('admin.index', ['users' => $users]);
    } else {
        return redirect()->route('login');  
    }
}

	
// 	public function dashboard(Request $request) 
// {
//     $userId = $request->session()->get('id');

//     if (!empty($userId)) {
//         date_default_timezone_set("Asia/Calcutta"); 
//         $date = date('Y-m-d');

//         $startdate = $request->input('start_date');
//         $enddate = $request->input('end_date');

       

//         if (empty($startdate) && empty($enddate)) {
//              $users = DB::select("SELECT
//     (SELECT COUNT(id) FROM users) as totaluser,
// 	 (SELECT COUNT(id) FROM users WHERE users.created_at LIKE '$date%' ) as todayuser,
// 	(select count(id) from users where users.status='1')as activeuser,
//     (SELECT COUNT(id) FROM game_settings WHERE game_settings.status = 0) as totalgames,
//     (SELECT COUNT(id) FROM bets) as totalbet,
//     (SELECT COUNT(id) FROM feedbacks) as totalfeedback,
//     (SELECT SUM(cash) FROM payins  WHERE status='2') as totaldeposit,
//   COALESCE  ((SELECT SUM(amount) FROM withdraw_histories WHERE withdraw_histories.status = 2 AND withdraw_histories.created_at LIKE '$date%'),0)as tamount,
//   COALESCE  ((SELECT SUM(amount) FROM withdraw_histories WHERE withdraw_histories.status = 2 ),0)as totalwithdraw,
//     COALESCE((SELECT SUM(cash) FROM payins WHERE status = '2' AND payins.created_at LIKE '$date%'), 0) as tdeposit,
//   SUM(commission) as commissions,
//     COALESCE( (SELECT SUM(amount) FROM `bets` WHERE bets.created_at LIKE '$date%'),0 )as todayturnover,
//     COUNT(id) as users,
//     (SELECT SUM(amount) FROM `bets`) as total_turnover
// FROM users;");
			
//         } else {
//             $users = DB::select("
//                 SELECT
//                     (SELECT COUNT(id) FROM users WHERE created_at BETWEEN '$startdate' AND '$enddate') as totaluser,
// 					(SELECT COUNT(id) FROM users WHERE users.created_at LIKE '$date%' ) as todayuser,
// 					(select count(id) from users where created_at BETWEEN '$startdate' and '$enddate' and users.status='1')as activeuser,
//                     (SELECT COUNT(id) FROM game_settings WHERE created_at BETWEEN '$startdate' AND '$enddate') as totalgames,
//                     (SELECT COUNT(id) FROM bets WHERE created_at BETWEEN '$startdate' AND '$enddate') as totalbet,
//                     (SELECT COUNT(id) FROM feedbacks WHERE created_at BETWEEN '$startdate' AND '$enddate') as totalfeedback,
//                     COALESCE((SELECT SUM(cash) FROM payins WHERE status = 2 AND DATE(created_at) BETWEEN '$startdate' AND '$enddate'), 0) as totaldeposit,
//                     COALESCE((SELECT SUM(amount) FROM withdraw_histories WHERE status = 2 AND DATE(created_at) BETWEEN '$startdate' AND '$enddate'), 0) as tamount,
//                     COALESCE((SELECT SUM(amount) FROM withdraw_histories WHERE status = 2), 0) as totalwithdraw,
//                     COALESCE((SELECT SUM(cash) FROM payins WHERE status = 2 AND DATE(created_at) BETWEEN '$startdate' AND '$enddate'), 0) as tdeposit,
//                     SUM(commission) as commissions,
//                     COALESCE((SELECT SUM(amount) FROM `bets` WHERE bets.created_at LIKE '$date%'), 0) as todayturnover,
//                     COUNT(id) as users,
//                     SUM(turnover) as total_turnover
//                 FROM users
//                 WHERE created_at BETWEEN '$startdate' AND '$enddate'
//             ");
//         }
		
		
//         session()->flash('msg_class','success');
//         session()->flash('msg','Login Successfully ..!');
//         return view('admin.index', ['users' => $users]);
//     } else {
//         return redirect()->route('login');  
//     }
// }

	




	

    public function logout(Request $request): RedirectResponse
    {
        
           $request->session()->forget('id');
		 session()->flash('msg_class','success');
            session()->flash('msg','Logout Successfully ..!');
     
         return redirect()->route('login')->with('success','Logout Successfully ..!');
    }
	
	   public function password_index()
    {
        return view('change_password');
    }
	

   public function password_change(Request $request)
{
    $validator = Validator::make($request->all(), [
        'email' => 'required|email',
        'password' => 'required',
        'npassword' => 'required|min:6',
    ]);

    if ($validator->fails()) {
        return redirect()->route('change_password')
            ->withErrors($validator)
            ->withInput();
    }

    $user = DB::table('users')->where('email', $request->input('email'))->first();

    if ($user) {
        if ($request->input('password') === $user->password) {
            DB::table('users')
                ->where('email', $request->input('email'))
                ->update(['password' => $request->input('npassword')]);

            // Session clear and logout
            $request->session()->forget('id'); // remove user session
            $request->session()->flush(); // optional: clear all session data

            // Flash logout message
            session()->flash('msg_class', 'success');
            session()->flash('msg', 'Password changed successfully. Please login again.');

            // Redirect to login
            return redirect()->route('login');
        } else {
            session()->flash('msg_class', 'danger');
            session()->flash('msg', 'Current password is incorrect.');
        }
    } else {
        session()->flash('msg_class', 'danger');
        session()->flash('msg', 'The provided email does not match our records.');
    }

    return redirect()->route('change_password')->withInput();
}

}
