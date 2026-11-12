<?php $__env->startSection('admin'); ?>
<div class="container-fluid">
    <div class="row justify-content-center">
        <div class="col-md-10">
            <div style="padding: 30px; background: #ffffff; border-radius: 10px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                <h4 style="font-weight: 700; margin-bottom: 25px;">🎮 Period No - <?php echo e($nextGameNo ?? 'N/A'); ?></h4>
                <form action="<?php echo e(route('adminWinner.adds')); ?>" method="post">
                    <?php echo csrf_field(); ?>
                    <div style="text-align: center; margin-bottom: 30px;">
                        <p style="font-size: 16px; font-weight: 600;">Choose Card</p>
                        <div id="card-selection" style="display: flex; justify-content: center; gap: 30px; flex-wrap: wrap; perspective: 1000px;">

                            
                            <div onclick="selectCard('High')" id="card-high"
                                style="width: 150px; height: 220px; cursor: pointer; transform-style: preserve-3d; transition: transform 0.8s ease; position: relative; border-radius: 12px;">
                                <!-- Back Side -->
                                <div style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 12px;
                                    background-image: url('https://magicwinner.motug.com/public/rb/cardback.png'); background-size: cover;
                                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);">
                                </div>
                                <!-- Front Side -->
                                <div style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; transform: rotateY(180deg);
                                    display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 26px; border-radius: 12px;
                                    background: linear-gradient(135deg, #00c9ff, #92fe9d); color: #0a0a0a;
                                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3); border: 2px solid #ffffff;">
                                    HIGH
                                </div>
                            </div>

                            
                            <div onclick="selectCard('Low')" id="card-low"
                                style="width: 150px; height: 220px; cursor: pointer; transform-style: preserve-3d; transition: transform 0.8s ease; position: relative; border-radius: 12px;">
                                <!-- Back Side -->
                                <div style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; border-radius: 12px;
                                    background-image: url('https://magicwinner.motug.com/public/rb/cardback.png'); background-size: cover;
                                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);">
                                </div>
                                <!-- Front Side -->
                                <div style="position: absolute; width: 100%; height: 100%; backface-visibility: hidden; transform: rotateY(180deg);
                                    display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 26px; border-radius: 12px;
                                    background: linear-gradient(135deg, #f85032, #e73827); color: #fff;
                                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3); border: 2px solid #ffffff;">
                                    LOW
                                </div>
                            </div>

                        </div>
                    </div>

                    <div style="display: flex; justify-content: center; align-items: end; flex-wrap: wrap; gap: 30px;">
                        <div style="text-align: left;">
                            <label for="game_type" style="font-weight: 600;">Select Type:</label><br>
                            <select id="game_type" name="game_type"
                                style="width: 160px; padding: 5px 10px; font-size: 14px; border-radius: 5px; border: 1px solid #ced4da;">
                                <option value="">-- Select --</option>
                                <option value="High">High</option>
                                <option value="Low">Low</option>
                            </select>
                        </div>

                        <div style="text-align: left;">
                            <label for="games_no" style="font-weight: 600;">Game No:</label><br>
                            <input type="text" id="games_no" name="games_no"
                                value="<?php echo e($nextGameNo ?? ''); ?>"
                                style="width: 160px; padding: 5px 10px; font-size: 14px;
                                font-weight: bold; border-radius: 5px; border: 1px solid #ced4da;">
                        </div>

                        <div>
                            <button type="submit"
                                style="background-color: #28a745; color: white; font-weight: 600;
                                border: none; border-radius: 6px; padding: 8px 20px;
                                font-size: 14px; margin-top: 10px; cursor: pointer; transition: all 0.3s ease;">
                                ✅ Submit
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>

<script>
    function selectCard(value) {
        document.getElementById('game_type').value = value;

        const highCard = document.getElementById('card-high');
        const lowCard = document.getElementById('card-low');

        // Reset
        highCard.style.transform = 'rotateY(0deg)';
        lowCard.style.transform = 'rotateY(0deg)';

        // Flip selected
        if (value === 'High') {
            highCard.style.transform = 'rotateY(180deg)';
        } else {
            lowCard.style.transform = 'rotateY(180deg)';
        }
    }
</script>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('admin.body.adminmaster', \Illuminate\Support\Arr::except(get_defined_vars(), ['__data', '__path']))->render(); ?><?php /**PATH /var/www/vhosts/fun-zone.co.in/veronova.co.in/root.veronova.co.in/resources/views/hilo/hiloadmin.blade.php ENDPATH**/ ?>