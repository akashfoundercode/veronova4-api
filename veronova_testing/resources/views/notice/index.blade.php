@extends('admin.body.adminmaster')

@section('admin')

    <div class="container mt-4">
        <h2 class="text-center mb-4">Notices</h2>

        <!-- Table to Display Data -->
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Content</th>
                    <th>Image</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                @foreach($notices as $notice)
                    <tr>
                        <td>{{ $notice->id }}</td>
                        <td>{{ $notice->title }}</td>
                        <td>{{ Str::limit($notice->content, 500) }}</td>
                        <td>
                            @if($notice->image)
                                <!-- Display the image with the URL stored in the database -->
                                <img src="{{ $notice->image }}" alt="{{ $notice->title }}" width="100">
                            @else
                                <img src="https://via.placeholder.com/100" alt="No Image">
                            @endif
                        </td>
                        <td>
                            <!-- Redirect to edit page instead of using modal -->
                            <a href="{{ route('offer.edit', $notice->id) }}" class="btn btn-warning">Update</a>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>

@endsection
