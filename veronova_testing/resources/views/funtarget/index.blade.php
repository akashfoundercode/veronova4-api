@extends('admin.body.adminmaster')

@section('admin')

<div class="row">
    <div class="col-md-12">
        <div class="card">
            <div class="card-body">
          
               <div class="row" style="backgorund-color: #fff; border-radius: 5px;margin-bottom:10px; ">
                     <div class="col-md-12 ">
                        <!--<b class="city" style="font-weight:bold;font-size:18px;">Period No- <span id="period_no"></span></b>-->
						 <b class="city" style="font-weight:bold;font-size:18px;">Period No- <span id="period_no">{{ $period_no }}</span></b>

                    </div>
               

                     <div class="col-md-3">
                         <h4 id="result_announce_time"></h4>
                     </div>
                   <div class="col-md-3"></div>
                    <div class="col-md-3">
                        <h4 id="timer"></h4>
                    </div>
               </div>
 

        <div class="row" style="padding-bottom:0px;">
                <div class="card border col-md-1 mt-4" style="height: 90px; display: flex; justify-content: center; align-items: center;"  title="Tap to insert result 1" onclick="result_insert(1)">
                <img style="height: 80px; width: 80px;" src="{{asset('/assets/spin/1.png')}}"></div>
                <div class="card border col-md-1  mt-4" style="height: 90px; display: flex; justify-content: center; align-items: center;" title="Tap to insert result 2" onclick="result_insert(2)"><img style="height: 80px; width: 80px;" src="{{asset('/assets/spin/2.png')}}"></div>
                <div class="card border col-md-1  mt-4" style="height: 90px; display: flex; justify-content: center; align-items: center;" title="Tap to insert result 3" onclick="result_insert(3)"><img style="height: 80px; width: 80px;" src="{{asset('/assets/spin/3.png')}}"></div>
                <div class="card border col-md-1  mt-4" style="height: 90px; display: flex; justify-content: center; align-items: center;" title="Tap to insert result 4" onclick="result_insert(4)"><img style="height: 80px; width: 80px;" src="{{asset('/assets/spin/4.png')}}"></div>
                <div class="card border col-md-1  mt-4" style="height: 90px; display: flex; justify-content: center; align-items: center;" title="Tap to insert result 5" onclick="result_insert(5)"><img style="height: 80px; width: 80px;" src="{{asset('/assets/spin/5.png')}}"></div>
                
                <div class="card border col-md-1  mt-4" style="height: 90px; display: flex; justify-content: center; align-items: center;" title="Tap to insert result 6" onclick="result_insert(6)"><img style="height: 80px; width: 80px;" src="{{asset('/assets/spin/6.png')}}"></div>
                <div class="card border col-md-1  mt-4" style="height: 90px; display: flex; justify-content: center; align-items: center;" title="Tap to insert result 7" onclick="result_insert(7)"><img style="height: 80px; width: 80px;" src="{{asset('/assets/spin/7.png')}}"></div>
                <div class="card border col-md-1  mt-4 " style="height: 90px; display: flex; justify-content: center; align-items: center;" title="Tap to insert result 8" onclick="result_insert(8)"><img style="height: 80px; width: 80px;" src="{{asset('/assets/spin/8.png')}}"></div>
                <div class="card border col-md-1 mt-4 " style="height: 90px; display: flex; justify-content: center; align-items: center;" title="Tap to insert result 9" onclick="result_insert(9)"><img style="height: 80px; width: 80px;" src="{{asset('/assets/spin/9.png')}}"></div>
                <div class="card border col-md-1  mt-4" style="height: 90px; display: flex; justify-content: center; align-items: center;" title="Tap to insert result 0" onclick="result_insert(10)"><img style="height: 80px; width: 80px;" src="{{asset('/assets/spin/0.png')}}"></div>
          </div>

         
           
                     <div class="row">
                @for($i = 1; $i <= 9; $i++)
                    <div class="card border col-md-1">
                        <h1>{{ $i }}</h1>
                        <p id="amount-{{ $i }}">0</p> <!-- Placeholder for amount -->
                    </div>
                @endfor
                <div class="card border col-md-1">
                    <h1>0</h1>
                    <p id="amount-0">0</p> <!-- Placeholder for amount -->
                </div>
            </div>
</div>


           
           
         
               
          
            <!-- <div class="form-group" style="display: flex; justify-content: center; align-items: center;">
  <h2>Jackpot</h2>
</div>
   
 <form action="/bonus-settings/update" method="POST">
  @csrf
  <div class="container">
    <div class="row">
      <div class="form-group col-md-4">
        <label for="bonus-duration">Bonus Fun Duration (Seconds)</label>
        <input type="number" id="bonus-duration" name="jackpot_duration" value="{{$jackpot->jackpot_duration}}">
      </div>

      <div class="form-group col-md-4">
        <label for="bonus-count">Bonus Fun Count</label>
        <input type="number" id="bonus-count" name="jackpot_count" value="{{$jackpot->jackpot_count}}">
      </div>

      <div class="form-group col-md-4">
        <label for="bonus-left">Bonus Fun Left</label>
        <input type="number" id="bonus-left" name="jackpot_left" value="{{$jackpot->jackpot_left}}" readonly>
      </div>
    </div>



<div class="row">
  <div class="form-group col-md-5">
    <label>Active Bonus</label>
     @php
         $a = json_decode($jackpot->active_jackpot)
       @endphp
    <div class="checkbox-group">
    @php
        $a = is_array($a) ? $a : explode(',', $a);
    @endphp

    @foreach($jackpot_multiplier as $jack)
        <label>
            <input type="checkbox" name="active_jackpot[]" value="{{ $jack->multiplier }}"
                {{ in_array($jack->multiplier, $a) ? 'checked' : '' }}>
            {{ $jack->multiplier }} x
        </label>
    @endforeach
    </div>
  </div>
</div>

    <div class="form-group">
      <button type="submit" class="btn btn-primary" style="padding: 6px 30px; font-size: 17px; border-radius: 5px;">
        Save
      </button>
    </div>
  </div>
</form>
-->
       <style>
           body {
  font-family: Arial, sans-serif;
  margin: 20px;
  background-color: #f9f9f9;
}

.container {
  max-width: 1200px;
  background: white;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

input[type="number"],
select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
}

input[type="checkbox"] {
  margin-right: 5px;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

#continuous {
  transform: scale(1.2);
}

       </style> 
       
       <script>
           document.getElementById('bonus-duration').addEventListener('input', function () {
  console.log(`Bonus Duration updated to: ${this.value} seconds`);
});

document.getElementById('bonus-count').addEventListener('input', function () {
  console.log(`Bonus Spin Count updated to: ${this.value}`);
});

document.getElementById('bonus-value').addEventListener('change', function () {
  console.log(`Selected Bonus Value: ${this.value}`);
});

document.getElementById('continuous').addEventListener('change', function () {
  console.log(`Continuous mode: ${this.checked ? 'Enabled' : 'Disabled'}`);
});

       </script>

  <!--end jakpot-->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
<script>
    $(document).ready(function() {
        // Function to fetch the latest bet logs
        function fetchLatestBetLogs() {
            $.ajax({
                url: '/api/fun-betlogs', // Your API route
                method: 'GET',
                success: function(response) {
                    // Update your dashboard with the latest data
                   
                    $('#period_no').text(response.period_no);
                    //$('#period_no_input').val(response.period_no);
         
                },
                error: function() {
                    console.log('Error fetching bet logs');
                }
            });
        }

        // Call the function when the page loads
        fetchLatestBetLogs();

        // Set an interval to fetch data every 5 seconds (or as needed)
        setInterval(fetchLatestBetLogs, 5000);
    });
</script>


<script>
    $(document).ready(function() {
        // Function to fetch the latest bet logs
        function fetchLatestBetLogs() {
            $.ajax({
                url: '/api/fun-betlogs-amount', // Your API route
                method: 'GET',
                success: function(response) {
                    // Loop through the response and display amount for each matching number
                    response.forEach(function(betLog) {
                        $('#amount-' + betLog.number).text(betLog.amount);
                    });
                },
                error: function() {
                    console.log('Error fetching bet logs');
                }
            });
        }

        // Call the function when the page loads
        fetchLatestBetLogs();

        // Set an interval to fetch data every 5 seconds (or as needed)
        setInterval(fetchLatestBetLogs, 5000);
    });
    
    //// onclick function ///
    
    function result_insert(card_number){
        //alert(`card number is ${card_number}`);
        let period_num = document.getElementById('period_no').textContent;
        // alert(`card number is ${card_number}  and period number is - ${period_num}`);
            fetch('api/auto_fun_ad_result_insert', {
                  method: 'POST',
                    headers: {
                    'Content-Type': 'application/json',
                    },
                 body: JSON.stringify({
                     // Add the data you want to send in the body here, for example:
                    card_number:card_number,
                    period_num: period_num
                  }),
                 })
                .then(response => response.json())  // Assuming the response is JSON
                .then(data =>{
                   if(data.status==200){
                       alert(data.message);
                   }else{
                       alert(data.message);
                   }
                   
                   })
                .catch(error => console.error('Error:', error));

    }

</script>

<script type="text/javascript">    
    setInterval(page_refresh, 1*60000); //NOTE: period is passed in milliseconds
</script>
 
        </div>
        </div>
        </div>
     </div>

@endsection