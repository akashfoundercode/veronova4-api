@extends('admin.body.adminmaster')

@section('admin')

<div class="container-fluid">

    <div class="row" style="background-color: #fff; border-radius: 5px; margin-bottom: 0px;">
    
        <div class="col-sm-6 d-flex align-items-center">
            <b class="city" style="font-weight: bold; font-size: 16px; margin-right: 5px;">Instant Prediction Period Number -</b>
            <h4 style="font-size: 16px; margin-bottom: 15px;" id="game_period_number"></h4>
        </div>
    
        <div class="col-sm-3"></div>
    
        <div class="col-sm-3 d-flex align-items-center">
            <b style="font-weight: bold; font-size: 16px; margin-right: 5px;">Total Bet Amount -</b>
            <h4 style="font-size: 16px; margin-bottom: 15px;" id="total_bet_amount">0</h4> 
        </div>
    </div>

    <div class="card p-2 mt-2">
    <div class="table-responsive mt-5">
        <table class="table table-bordered" style="width: 100%; text-align: center;">
            <thead>
                <tr>
                    
                    <th><img style="height:70px; width:100px;" src="{{ asset('assets/card.png') }}" alt="Card" /> </th>
                    <th><span class="h1 text-danger">&#9829;</span><span class=" d-block">Hearts</span></th>
                    <th><span class="h1">&#9824;</span><span class=" d-block">Spades</span></th>
                    <th><span class="h1 text-danger">&#9830;</span><span class=" d-block">Diamonds</span></th>
                    <th><span class="h1">&#9827;</span><span class=" d-block">Clubs</span></th>
                </tr>
            </thead>
            <tbody>
                
                <tr>
                    <td><span class="h1">A</span><span class="d-block">Ace</span></td>
                    <td class="bg-danger-hover" onclick="point_details(1)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color: red;">1</span>
                            <h5 class="p-3" id="ah" style="text-align: center;">43</h5>
                        </div>
                    </td>
                        
                    <td class="bg-danger-hover" onclick="point_details(2)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color:red;">2</span>
                            <h5 class="p-3" id="as"style="text-align: center;">69</h5>
                        </div>
                    </td>
                    <td class="bg-danger-hover" onclick="point_details(3)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color:red;">3</span>
                            <h5 class="p-3" id="ad"style="text-align: center;">69</h5>
                        </div>
                    </td>
                    <td class="bg-danger-hover" onclick="point_details(4)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color:red;">4</span>
                            <h5 class="p-3" id="ac"style="text-align: center;">56</h5>
                        </div>
                    </td>
                </tr>
                
                <tr>
                    <td><span class="h1">K</span><span class="d-block">King</span></td>
                    <td class="bg-danger-hover" onclick="point_details(5)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color: red;">5</span>
                            <h5 class="p-3" id="kh" style="text-align: center;">10</h5>
                        </div>
                    </td>
                        
                    <td class="bg-danger-hover" onclick="point_details(6)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color:red;">6</span>
                            <h5 class="p-3" id="ks"style="text-align: center;">25</h5>
                        </div>
                    </td>
                    <td class="bg-danger-hover" onclick="point_details(7)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color:red;">7</span>
                            <h5 class="p-3" id="kd"style="text-align: center;">39</h5>
                        </div>
                    </td>
                    <td class="bg-danger-hover" onclick="point_details(8)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color:red;">8</span>
                            <h5 class="p-3" id="kc"style="text-align: center;">43</h5>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td><span class="h1">Q</span><span class="d-block">Queen</span></td>
                    <td class="bg-danger-hover" onclick="point_details(9)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color:red;">9</span>
                            <h5 class="p-3" id="qh"style="text-align: center;">99</h5>
                        </div>
                    </td>
                    <td class="bg-danger-hover" onclick="point_details(10)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color:red;">10</span>
                            <h5 class="p-3" id="qs"style="text-align: center;">30</h5>
                        </div>
                    </td>
                    <td class="bg-danger-hover" onclick="point_details(11)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color:red;">11</span>
                            <h5 class="p-3" id="qd"style="text-align: center;">90</h5>
                        </div>
                    </td>
                    <td class="bg-danger-hover" onclick="point_details(12)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color:red;">12</span>
                            <h5 class="p-3" id="qc"style="text-align: center;">78</h5>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td><span class="h1">J</span><span class="d-block">Jack</span></td>
                    <td class="bg-danger-hover" onclick="point_details(13)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color:red;">13</span>
                            <h5 class="p-3" id="jh"style="text-align: center;">89</h5>
                        </div>
                    </td>
                    <td class="bg-danger-hover" onclick="point_details(14)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color:red;">14</span>
                            <h5 class="p-3" id="js"style="text-align: center;">51</h5>
                        </div>
                    </td>
                    <td class="bg-danger-hover" onclick="point_details(15)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color:red;">15</span>
                            <h5 class="p-3" id="jd"style="text-align: center;">67</h5>
                        </div>
                    </td>
                    <td class="bg-danger-hover" onclick="point_details(16)" data-bs-toggle="modal" data-bs-target="#myModal">
                        <div style="position: relative;">
                            <span style="position: absolute; top: 0; left: 0; font-weight: bold; color:red;">16</span>
                            <h5 class="p-3" id="jc"style="text-align: center;">69</h5>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</div>

</div>

<form action="{{route('lucky16.update')}}" method="post">
            @csrf
               <!--important input box hidden for prediction insert and also works for custom date selection-->
             <input type="hidden" class="form-control" id="result_time" style="  font-size: 16px;color:#333;border:none" name="result_time" value="">
                   <div class="row ml-4 d-flex" style="margin-bottom: 20px;"> 
                  
                        <div class="col-md-4 form-group d-flex">
                           
                           
                         </div>
                         
                            <!--add code by sudhir-->
                            
                            <div class="col-md-2 form-group d-flex">
                             <input type="number" name="jackpot" class="form-control" min="1" max="12" placeholder="Jackpot Multiplier" id="result-number" >
                             
                         </div>
                            <!--end add code -->
                            
                            
                         <div class="col-md-2 form-group d-flex">
                            <button type="submit" class="form-control btn btn-info" id="submit-button"><b>Submit</b></button>
                         </div>
                         <div class="col-md-2 form-group d-flex mt-1">
                            <a href=""> <i class="fa fa-refresh" aria-hidden="true" style="font-size:30px;"></i></a>
                         </div>
                   </div>
           </form>


          <!--<form action="{{route('admin_prediction')}}" method="post">-->
          <!--  @csrf-->
               <!--important input box hidden for prediction insert and also works for custom date selection-->
          <!--   <input type="hidden" class="form-control" id="result_time" style="  font-size: 16px;color:#333;border:none" name="result_time" value="">-->
          <!--         <div class="row ml-4 d-flex" style="margin-bottom: 20px;"> -->
          <!--         <div class="col-md-3 form-group d-flex">-->
          <!--            <b>Enter Future Period Number - (Future Period Number Is Greater Than Current Period Number)</b>-->
          <!--         </div>-->
          <!--              <div class="col-md-3 form-group d-flex">-->
          <!--                  <input type="hidden" name="games_no" class="form-control" value=""  id="games_no_input">-->
          <!--                  <input type="text" name="games_num"  placeholder="Enter Future Period Number" class="form-control" value="">-->
          <!--               </div>-->
                          
          <!--                  @error('games_no')-->
          <!--                      <div class="alert alert-danger">{{ $message }}</div>-->
          <!--                  @enderror-->
                         
          <!--               <div class="col-md-2 form-group d-flex">-->
          <!--                   <input type="number" name="number" class="form-control" min="1" max="12" placeholder="Result" id="result-number" required>-->
                             
          <!--               </div>-->
          <!--               @error('number')-->
          <!--                      <div class="alert alert-danger">{{ $message }}</div>-->
          <!--                  @enderror-->
          <!--               <div class="col-md-2 form-group d-flex">-->
          <!--                  <button type="submit" class="form-control btn btn-info" id="submit-button"><b>Submit</b></button>-->
          <!--               </div>-->
          <!--               <div class="col-md-2 form-group d-flex mt-1">-->
          <!--                  <a href=""> <i class="fa fa-refresh" aria-hidden="true" style="font-size:30px;"></i></a>-->
          <!--               </div>-->
          <!--         </div>-->
          <!-- </form>-->







<!--<script src="https://code.jquery.com/jquery-3.6.4.min.js"></script>-->
<script>
document.addEventListener('DOMContentLoaded', () => {
    refreshData();
});

function refreshData() {
    fetchData();
    setInterval(fetchData, 2000); // Refresh every 3 seconds
}

function fetchData() {
    fetch('api/lucky_16_admin', {
            method: 'GET', // Keep as GET method
            headers: {
                'Content-Type': 'application/json', // Set content type as JSON
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Fetched data:', data);
            if (data && data.bet_log) {
                //console.log(data.bet_log);
                // Update the bets with the fetched data 
                updateBets(data.bet_log,data.amount);
            } else {
                console.error('Data format is incorrect or bet_log is missing:', data);
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}


function updateBets(bet_log,amount) {
    console.log('Updating Bets:', bet_log);
    var amountdetailHTML = '';
    var winningdetailHTML = '';

    document.getElementById('ah').textContent = bet_log[0].amount;
    document.getElementById('as').textContent = bet_log[1].amount;
    document.getElementById('ad').textContent = bet_log[2].amount;
    document.getElementById('ac').textContent = bet_log[3].amount;
    document.getElementById('kh').textContent = bet_log[4].amount;
    document.getElementById('ks').textContent = bet_log[5].amount;
    document.getElementById('kd').textContent = bet_log[6].amount;
    document.getElementById('kc').textContent = bet_log[7].amount;
    document.getElementById('qh').textContent = bet_log[8].amount;
    document.getElementById('qs').textContent = bet_log[9].amount;
    document.getElementById('qd').textContent = bet_log[10].amount;
    document.getElementById('qc').textContent = bet_log[11].amount;
    document.getElementById('jh').textContent = bet_log[12].amount;
    document.getElementById('js').textContent = bet_log[13].amount;
    document.getElementById('jd').textContent = bet_log[14].amount;
    document.getElementById('jc').textContent = bet_log[15].amount;

    document.getElementById('game_period_number').textContent = bet_log[0].period_no;
    document.getElementById('total_bet_amount').textContent = amount;
}

function point_details(card_number) {
    const period_number = document.getElementById('game_period_number').textContent;
    console.log(`akhil rrtgyth ${card_number}  ${period_number} `)

    fetch('api/point_detail', {
            method: 'POST', // Change to POST
            headers: {
                'Content-Type': 'application/json', // Set the content type
            },
            body: JSON.stringify({
                card_number: card_number,
                period_no: period_number,
            }) // Include the parameter in the body
        })
        .then(response => response.json())
        .then(data => {
            console.log('Fetched data:', data);
            if (data && data.message) {
                alert(data.message);
            } 
        })
        .catch(error => console.error('Error fetching data:', error));
}


</script>

</div>
@endsection