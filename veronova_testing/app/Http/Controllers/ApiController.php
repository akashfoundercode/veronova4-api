<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Validator;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class ApiController extends Controller
{



 public function login(Request $request)
        {
            $validator = validator ::make ($request->all(),
            [
             'email'=>'required',
             'password'=>'required',
             
            ]);
            if($validator->fails()){
                $response =['error'=>"400",
                'message'=>$validator->errors()];
        
                return response()->json ($response, 400);
        
               }

            $login = DB::table('users')->where('email','=', $request['email'])
            ->where('password','=', $request['password'])->first();

         if($login!=null)
            {
                $response =[ 'success'=>"200",
                'data'=>$login,
                'message'=>' login successfully'];
                 return response ()->json ($response,200);
            }
            $response =[ 'error'=>"400",
                'data'=>$login,
                'message'=>'The provided credentials do not match our records.'];
                 return response ()->json ($response,400);
        }

}