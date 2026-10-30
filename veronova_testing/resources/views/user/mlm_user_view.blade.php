@extends('admin.body.adminmaster')

@section('admin')



<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Commission and Bonus Details</title>
    <style>
        table {
            border-collapse: collapse;
            width: 100%;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>

<h4>User Details</h4>

<table>
    <tr>
        <th>Total Commission</th>
        <th>Bonus</th>
        <th>Total Users</th>
    </tr>
    <tr>
        <td>{{$data->commission}}</td>
        <td>{{$data->bonus}}</td>
        <td>{{$data->totaluser}}</td>
    </tr>
</table>

<h4>Level-wise Commission</h4>

<table>
    <tr>
        <th>Level</th>
        <th>Count</th>
        <th>Commission</th>
    </tr>
    <!-- Repeat this row for each level -->
	@foreach($data->levelwisecommission as $item)
    <tr>
        <td>{{$item->name}}</td>
        <td>{{$item->count}}</td>
        <td>{{$item->commission}}</td>
    </tr>
	@endforeach
    <!-- ... Repeat for other levels ... -->
</table>

<h2>User Data</h2>

<!-- Repeat the following table for each level -->
<table>
    <tr>
        <th>User ID</th>
        <th>Username</th>
        <th>Turnover</th>
        <th>Commission</th>
    </tr>
    <!-- Repeat this row for each user at the corresponding level -->
	@foreach($data->userdata as $obj)
	    @foreach($obj as $obj1)
    <tr>
        <td>{{$obj1->user_id}}</td>
       <td>{{$obj1->username}}</td>
        <td>{{$obj1->turnover}}</td>
        <td>{{$obj1->commission}}</td>
    </tr>
	@endforeach @endforeach
    <!-- ... Repeat for other users ... -->
</table>

</body>
</html>

@endsection
