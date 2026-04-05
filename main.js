/**
 * 錦鯉シミュレーション - メインスクリプト
 */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// キャンバスのサイズをウィンドウに合わせる
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// メインループ
function gameLoop() {
    // 画面のクリア（半透明にして残像効果を出すことも可能）
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // TODO: ここに鯉の描画と更新処理を追加

    requestAnimationFrame(gameLoop);
}

// ゲーム開始
gameLoop();
