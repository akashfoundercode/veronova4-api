@extends('admin.body.adminmaster')

@section('admin')
<div class="container mt-4">
    <h2 class="text-center mb-4">Update Notice</h2>

    <form action="{{ route('offer.update', $notice->id) }}" method="POST" enctype="multipart/form-data">
        @csrf
        @method('PUT')

        <div class="form-group">
            <label for="title">Title</label>
            <input type="text" class="form-control" id="title" name="title" value="{{ old('title', $notice->title) }}" required>
        </div>

        <div class="form-group">
            <label for="content">Content</label>
            <textarea class="form-control" id="content" name="content" rows="10" required>{{ old('content', $notice->content) }}</textarea>
        </div>

        <div class="form-group">
            <label for="image">Image</label>
            <input type="file" class="form-control" id="image" name="image">

            @if($notice->image)
                <img src="{{ asset('notice/' . basename($notice->image)) }}" id="imagePreview" width="100" style="display: block; margin-top: 10px;">
            @else
                <img id="imagePreview" width="100" style="display: none;">
            @endif
        </div>

        <button type="submit" class="btn btn-primary">Update</button>
    </form>
</div>
@endsection

@section('scripts')
<script src="https://cdn.ckeditor.com/4.16.2/standard/ckeditor.js"></script>
<script>
    CKEDITOR.replace('content');
</script>
@endsection
