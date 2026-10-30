
<?php
namespace App\Exports;

use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;

class SalaryListExport implements FromCollection, WithHeadings
{
    public function collection()
    {
        return DB::table('salary_lists')
            ->select('id', 'userid', 'amount', 'created_at', 'updated_at')
            ->get();
    }

    public function headings(): array
    {
        return ['ID', 'User ID', 'Amount', 'Created At', 'Updated At'];
    }
}
