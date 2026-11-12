                      @php
                        
                          $trx = DB::select("SELECT CASE WHEN id = 6 THEN 6 WHEN id = 7 THEN 7 WHEN id = 8 THEN 8 WHEN id = 9 THEN 9 ELSE id END AS id, game_settings.name as name FROM game_settings WHERE game_settings.id IN (6,7, 8, 9)");
                      
                     @endphp
                     
                     <li>
                        <a href="#appss" data-toggle="collapse" aria-expanded="false" class="dropdown-toggle"><i class='fa fa-gamepad' style='font-size:28px;color:red'></i> <span>Trx Game</span></a>
                        <ul class="collapse list-unstyled" id="appss">
                           @foreach($trx as $item)
                           <li><a href="{{route('trx',$item->id)}}"> <span>{{$item->name}}</span></a></li>
                           @endforeach
                        </ul>
                     </li>