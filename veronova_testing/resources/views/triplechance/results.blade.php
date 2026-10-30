@extends('admin.body.adminmaster')

@section('admin')
    <div class="container-fluid">
        <!-- ============================================================== -->
        <!-- Start Page Content -->
        <!-- ============================================================== -->
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title">Triple Chance Results</h4>
                    </div>    
                    <form action="{{ route('triplechance.results') }}" method="post">
                        @csrf
                        <div class="card-body">
                            <div class="table-responsive">
                                <table class="table table-bordered table-striped">
                                    <thead>
                                        <tr>
                                            <th><strong>ID</strong></th>
                                            <th><strong>Game No</strong></th>
                                            <th><strong>Wheel 1 Index</strong></th>
                                            <th><strong>Wheel 1 Result</strong></th>
                                            <th><strong>Wheel 2 Index</strong></th>
                                            <th><strong>Wheel 2 Result</strong></th>
                                            <th><strong>Wheel 3 Index</strong></th>
                                            <th><strong>Wheel 3 Result</strong></th>
                                            <th><strong>Status</strong></th>
                                            <th><strong>Time</strong></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        @foreach($records as $record) <!-- Fixed: added $ before record -->
                                        <tr>
                                            <td>{{ $record->id }}</td>
                                            <td>{{ $record->games_no }}</td>
                                            <td>{{ $record->wheel1_index}}</td>
                                            <td>{{ $record->wheel1_result}}</td>
                                            <td>{{ $record->wheel2_index }}</td>
                                            <td>{{ $record->wheel2_result }}</td>
                                            <td>{{ $record->wheel3_index }}</td>
                                            <td>{{ $record->wheel2_result }}</td>
                                            <td>
                                                @if ($record->status == 1)
                                                    Pending
                                                @elseif ($record->status == 2)
                                                    Approved
                                                @elseif ($record->status == 3)
                                                    Rejected
                                                @endif
                                            </td>
                                            <td>{{ $record->time}}</td>
                                        </tr>
                                        @endforeach
                                    </tbody>
                                </table>
                            </div>
                            
                           {{-- Pagination Code --}}
                            @if ($records->hasPages())
                                <nav>
                                    <style>
                                        .pagination {
                                            display: flex;
                                            justify-content: center;
                                            list-style: none;
                                            padding: 0;
                                        }
                                        .pagination .page-item {
                                            margin: 0 5px;
                                        }
                                        .pagination .page-item .page-link {
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            width: 40px;
                                            height: 40px;
                                            border-radius: 50%;
                                            border: 1px solid #ddd;
                                            text-decoration: none;
                                            color: #333;
                                            font-weight: bold;
                                            transition: all 0.3s ease;
                                        }
                                        .pagination .page-item .page-link:hover {
                                            background-color: #e0e0e0;
                                            border-color: #ddd;
                                        }
                                        .pagination .page-item.active .page-link {
                                            background-color: #6f42c1;
                                            color: white;
                                            border-color: #6f42c1;
                                        }
                                        .pagination .page-item.disabled .page-link {
                                            color: #6c757d;
                                            pointer-events: none;
                                            background-color: #f5f5f5;
                                            border-color: #ddd;
                                        }
                                    </style>

                                    <ul class="pagination">
                                        {{-- Previous Page Link --}}
                                        @if ($records->onFirstPage())
                                            <li class="page-item disabled">
                                                <span class="page-link">&lt;</span>
                                            </li>
                                        @else
                                            <li class="page-item">
                                                <a class="page-link" href="{{ $records->previousPageUrl() }}" rel="prev">&lt;</a>
                                            </li>
                                        @endif

                                        {{-- Pagination Elements --}}
                                        @foreach ($records->links()->elements as $element)
                                            {{-- "Three Dots" Separator --}}
                                            @if (is_string($element))
                                                <li class="page-item disabled"><span class="page-link">{{ $element }}</span></li>
                                            @endif

                                            {{-- Array Of Links --}}
                                            @if (is_array($element))
                                                @foreach ($element as $page => $url)
                                                    @if ($page == $records->currentPage() || $page == 1 || $page == $records->lastPage() || ($page >= $records->currentPage() - 2 && $page <= $records->currentPage() + 2))
                                                        @if ($page == $records->currentPage())
                                                            <li class="page-item active"><span class="page-link">{{ $page }}</span></li>
                                                        @else
                                                            <li class="page-item"><a class="page-link" href="{{ $url }}">{{ $page }}</a></li>
                                                        @endif
                                                    @elseif ($page == $records->currentPage() - 3 || $page == $records->currentPage() + 3)
                                                        <li class="page-item disabled"><span class="page-link">...</span></li>
                                                    @endif
                                                @endforeach
                                            @endif
                                        @endforeach

                                        {{-- Next Page Link --}}
                                        @if ($records->hasMorePages())
                                            <li class="page-item">
                                                <a class="page-link" href="{{ $records->nextPageUrl() }}" rel="next">&gt;</a>
                                            </li>
                                        @else
                                            <li class="page-item disabled">
                                                <span class="page-link">&gt;</span>
                                            </li>
                                        @endif
                                    </ul>
                                </nav>
                            @endif
                            
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
@endsection
