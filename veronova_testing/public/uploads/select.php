<?php
$conn = new mysqli("localhost", "root", '', 'founde23_rummygold');


$query=mysqli_query($conn,"SELECT `id`, `number`, `actual_number`, `wining_amount`, `description` FROM `game_index` limit 37");

foreach($query as $item)
{
   
    $number=$item['actual_number'];
    // (`game_id`, `number`, `amount`, `game_no`)
    echo "('12','$number','0','1'),('13','$number','0','1'),";
}

?>