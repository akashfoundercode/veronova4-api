@extends('admin.body.adminmaster')

@section('admin')

<div class="container-fluid mt-3" style="margin-bottom: 60px;">
 <form action="{{route('dragon.store') }}" method="post">
        @csrf
	 
    <div class="row">
        <div class="col-md-12">
            <div class="white_shd full margin_bottom_30">
                <div class="full graph_head">
                    <div class="">
					<div class="row" style=" padding-left:30px;" id="gmsno">                       
                    </div>
                </div>
                <div class="row" style="padding-top: 30px;  padding-bottom:20px;">
                  
                        <div class="card col-md-3 ml-3 mt-4 " style="background-image:url('https://kingclub.co.in/admin/uploads/banner/tie.png'); height:300px;">
                            <div class="card-body" style="margin-top:120px">
                                <b style="font-size: 25px; margin-left:70px; "> {{$amounts[0]->tie}} </b>
                            </div>
                        </div>
					 <div class="card col-md-3 ml-3 mt-4 " style="background-image:url('https://kingclub.co.in/admin/uploads/banner/tiger.png'); height:300px;">
                            <div class="card-body" style="margin-top:120px">
                                <b style="font-size: 25px; margin-left:70px;">{{$amounts[0]->tiger}} </b>
                            </div>
                        </div>
					 <div class="card col-md-3 ml-3 mt-4 " style="background-image:url('https://kingclub.co.in/admin/uploads/banner/dragon.png'); height:300px; width:200px;">
                            <div class="card-body" style="margin-top:120px">
                                <b style="font-size: 25px; margin-left:70px; ">{{$amounts[0]->dragon}} </b>
                            </div>
                        </div>
                   
                </div>
             
					
                <div class="row ml-4 d-flex" style="margin-bottom: 20px;">
		<div class="col-md-3 form-group d-flex">
           <input type="text" name="gamesno" class="form-control" value="{{$amounts[0]->gamesno}}">
        </div>
		<div class="col-md-3 form-group d-flex">
           <input type="text" name="number" class="form-control" placeholder="Result">
        </div>
        <div class="col-md-2 form-group d-flex">
          <button type="submit" class="form-control btn btn-info"><b>Submit</b></button>
        </div>

       
					
			
                </div>
				
	 
            </div>
				
        </div>
    </div>
	</div>
	</form>
</div>

<script src="https://code.jquery.com/jquery-3.6.4.min.js"></script>
<script>
    function fetchData() {
         console.log('Updated Bets:');
        fetch('/dragon_fetch' )
            .then(response => response.json())
            .then(data => {
                console.log('Fetched data:', data);
                // Assuming data has 'bets' and 'gameid' properties
                updateBets(data.bets);
                updateGameId(data.gameid);
            })
            .catch(error => console.error('Error fetching data:', error));
    }

   function updateBets(bets) {
    console.log('Updated Bets:');
    var amountdetailHTML = '';
	   var gmsno='';
console.log(bets)
    bets.forEach(item => {
        amountdetailHTML += '<div class="card col-md-1 ml-3 mt-4 " style="background-color:#fff;">';
        amountdetailHTML += '<div class="card-body">';
        amountdetailHTML += '<b style="font-size: 10px; ">' + item.amount + '</b>';
        amountdetailHTML += ' </div>';
        amountdetailHTML += '</div>';
		gmsno ='<b style="font-size: 25px; ">' + item.gamesno + '</b>';
    });
    $('#amounts-container').html(amountdetailHTML);
	 $('#gmsno').html(gmsno);
}
    function updateGameId(gameid) {
        // Replace the following line with your actual DOM update logic
        // For example, you may update an element with id 'gameid'
        // $('#gameid').html(...);

        // For now, let's just log the gameid to the console
        console.log('Updated Game ID:', gameid);
    }

    function refreshData() {
        fetchData();
        setInterval(fetchData, 5000); // 5000 milliseconds = 5 seconds
    }

    document.addEventListener('DOMContentLoaded', refreshData);
</script>

@endsection

