<?php $__env->startSection('admin'); ?>
<div class="container-fluid">
    <div class="row justify-content-center">
        <div class="col-md-10">
            <div style="padding: 30px; background: #fff; border-radius: 12px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);">

                <h4 style="font-weight: 700; margin-bottom: 25px;">🎮 Period No - <?php echo e($nextGameNo ?? 'N/A'); ?></h4>

                <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; margin-bottom: 40px;">
                    <?php
                        $cards = [
                            ['label' => '2-6', 'color' => 'linear-gradient(135deg, #8e0e00, #1f1c18)'],
                            ['label' => '7', 'color' => 'linear-gradient(135deg, #283c86, #45a247)'],
                            ['label' => '8-12', 'color' => 'linear-gradient(135deg, #42275a, #734b6d)'],

                            ['label' => '2', 'color' => 'linear-gradient(135deg, #ff512f, #dd2476)'],
                            ['label' => '3', 'color' => 'linear-gradient(135deg, #fc466b, #3f5efb)'],
                            ['label' => '4', 'color' => 'linear-gradient(135deg, #43cea2, #185a9d)'],
                            ['label' => '5', 'color' => 'linear-gradient(135deg, #ee9ca7, #ffdde1)'],
                            ['label' => '6', 'color' => 'linear-gradient(135deg, #00c6ff, #0072ff)'],

                            ['label' => '8', 'color' => 'linear-gradient(135deg, #f7971e, #ffd200)'],
                            ['label' => '9', 'color' => 'linear-gradient(135deg, #da22ff, #9733ee)'],
                            ['label' => '10', 'color' => 'linear-gradient(135deg, #ff6a00, #ee0979)'],
                            ['label' => '11', 'color' => 'linear-gradient(135deg, #56ab2f, #a8e063)'],
                            ['label' => '12', 'color' => 'linear-gradient(135deg, #2980b9, #6dd5fa)'],
                        ];
                    ?>

                    <?php $__currentLoopData = $cards; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $card): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                        <div 
                            id="card-<?php echo e(strtolower(str_replace(' ', '-', $card['label']))); ?>-<?php echo e($index); ?>"
                            onclick="selectCard('<?php echo e($card['label']); ?>')" 
                            style="width: 120px; height: 100px; border-radius: 16px; background: <?php echo e($card['color']); ?>; box-shadow: 0 6px 15px rgba(0,0,0,0.2); text-align: center; cursor: pointer; transition: all 0.3s ease; font-weight: bold; font-size: 24px; display: flex; align-items: center; justify-content: center; color: #fff;">
                            <?php echo e($card['label']); ?>

                        </div>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                </div>

                <form action="<?php echo e(route('7updown.updown_update')); ?>" method="post">
                    <?php echo csrf_field(); ?>
                    <div style="display: flex; justify-content: center; align-items: end; flex-wrap: wrap; gap: 30px; margin-top: 40px;">
                        
                        <div>
                            <label for="game_type" style="font-weight: 600;">Select Type:</label><br>
                            <select id="game_type" name="game_type"
                                style="width: 160px; padding: 6px 12px; font-size: 14px; border-radius: 6px; border: 1px solid #ced4da;">
                                <option value="">-- Select --</option>
                                <option value="2-6">2-6</option>
                                <option value="7">7</option>
                                <option value="8-12">8-12</option>

                                
                                <?php for($i = 2; $i <= 6; $i++): ?>
                                    <option value="<?php echo e($i); ?>"><?php echo e($i); ?></option>
                                <?php endfor; ?>
                                <?php for($i = 8; $i <= 12; $i++): ?>
                                    <option value="<?php echo e($i); ?>"><?php echo e($i); ?></option>
                                <?php endfor; ?>
                            </select>
                        </div>

                        <div>
                            <label for="games_no" style="font-weight: 600;">Game No:</label><br>
                            <input type="text" id="games_no" name="games_no"
                                value="<?php echo e($nextGameNo ?? ''); ?>"
                                style="width: 160px; padding: 6px 12px; font-size: 14px; font-weight: bold; border-radius: 6px; border: 1px solid #ced4da;">
                        </div>

                        <div>
                            <button type="submit"
                                style="background: linear-gradient(to right, #111, #333); color: #ffd700; font-weight: bold; border: none; border-radius: 8px; padding: 10px 24px; font-size: 14px; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 12px rgba(0,0,0,0.4);"
                                onmouseover="this.style.background='linear-gradient(to right, #222, #444)'"
                                onmouseout="this.style.background='linear-gradient(to right, #111, #333)'">
                                ✅ Submit
                            </button>
                        </div>
                    </div>
                </form>

            </div>
        </div>
    </div>
</div>

<!-- 🧠 Script for Card Selection -->
<script>
    function selectCard(value) {
        // Set the dropdown value
        const dropdown = document.getElementById('game_type');
        dropdown.value = value;

        // Reset styles for all cards
        const allCards = document.querySelectorAll('[id^="card-"]');
        allCards.forEach(card => {
            card.style.boxShadow = "0 6px 15px rgba(0,0,0,0.2)";
            card.style.transform = "scale(1)";
            card.style.border = "none";
        });

        // Highlight all cards with this label (in case same label has multiple IDs with index)
        const selectedCards = Array.from(document.querySelectorAll('[id^="card-"]')).filter(el => el.textContent.trim() === value);
        selectedCards.forEach(selectedCard => {
            selectedCard.style.boxShadow = "0 0 25px 6px #ffd700";
            selectedCard.style.transform = "scale(1.08)";
            selectedCard.style.border = "3px solid #ffd700";
        });
    }
</script>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/7UpDown/7updownadmin.blade.php ENDPATH**/ ?>