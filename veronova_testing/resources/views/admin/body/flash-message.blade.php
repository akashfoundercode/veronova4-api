@if ($message = Session::get('success'))  
<div class="alert alert-success alert-block mt-3">  
    <button type="button" class="close" data-dismiss="alert">X</button>   
        <strong>{{ $message }}</strong>  
</div>  
@endif  
  
@if ($message = Session::get('error'))  
<div class="alert alert-danger alert-block mt-3">  
    <button type="button" class="close" data-dismiss="alert">X</button>   
        <strong>{{ $message }}</strong>  
</div>  
@endif  
  
@if ($message = Session::get('warning'))  
<div class="alert alert-warning alert-block mt-3">  
    <button type="button" class="close" data-dismiss="alert">X</button>   
    <strong>{{ $message }}</strong>  
</div>  
@endif  
  
@if ($message = Session::get('info'))  
<div class="alert alert-info alert-block mt-3">  
    <button type="button" class="close" data-dismiss="alert">X</button>   
    <strong>{{ $message }}</strong>  
</div>  
@endif  
  
@if ($errors->any())  
<div class="alert alert-danger mt-3">  
    <button type="button" class="close" data-dismiss="alert">X</button>   
    Please check the form below for errors  
</div>  
@endif  