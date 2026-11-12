@extends('admin.body.adminmaster')

@section('admin')

<div class="container-fluid">
  <div class="row">
<div class="col-md-12">
  <div class="white_shd full margin_bottom_30">
     <div class="full graph_head">
        <div class="heading1 margin_0 d-flex">
           <h2>Gift List</h2>
        
        </div>
     </div>
     <div class="table_section padding_infor_info">
        <div class="table-responsive-sm">
           <table id="example" class="table table-striped" style="width:100%">
              <thead class="thead-dark">
                 <tr>
                    <th>Id</th>
					<th>Username</th> 
                    <th>Code</th>
                    <th>Amount</th>
                
                    <th>Date</th>
                 </tr>
              </thead>
              <tbody>
                @foreach($gifts as $item)
                 <tr>
                    <td>{{$item->id}}</td>
					 <td><?php if(!empty($item->username)){echo $item->username;}else{echo $item->userid;}?></td>
                    <td>{{$item->gift_code}}</td>
                    
                    <td>{{$item->amount}}</td>
                    
                    
                    <td>
                      {{$item->datetime}}
               
                    </td>
                    
                 </tr>
                 @endforeach
              </tbody>
           </table>
        </div>
     </div>
  </div>
</div>
</div>
</div> 

<div class="modal fade" id="exampleModalCenter" tabindex="-1" role="dialog" aria-labelledby="exampleModalCenterTitle" aria-hidden="true">
   <div class="modal-dialog modal-dialog-centered" role="document">
     <div class="modal-content">
       <div class="modal-header">
         <h5 class="modal-title" id="exampleModalLongTitle">Add Gift</h5>
         <button type="button" class="close" data-dismiss="modal" aria-label="Close">
           <span aria-hidden="true">&times;</span>
         </button>
       </div>
       <form action="{{route('gift.store')}}" method="POST" enctype="multipart/form-data">
         @csrf
       <div class="modal-body">
         <div class="container-fluid">
           <div class="row">
             <div class="form-group col-md-6">
               <label for="amount">Amount</label>
               <input type="text" class="form-control" id="amount" name="amount" placeholder="Enter amount">
             </div>
             <div class="form-group col-md-6">
               <label for="number_people">Number People</label>
               <input  type="text" class="form-control" id="number_people" name="number_people" placeholder="Enter number_people">
             </div>
           </div>
         </div>
		   </div>
      
       <div class="modal-footer">
         <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
         <button type="submit" class="btn btn-primary">Submit</button>
       </div>
		    </form>
     </div>
   </div>
 </div>

 
 
 <script>
     $('#myModal').on('shown.bs.modal', function () {
   $('#myInput').trigger('focus')
    })
 </script>


@endsection