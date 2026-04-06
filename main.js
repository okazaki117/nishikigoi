/**
 * 錦鯉シミュレーション - メインスクリプト
 */

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// --- UI Elements ---
const btnCollection = document.getElementById('btn-collection');
const btnBreed = document.getElementById('btn-breed');
const btnSell = document.getElementById('btn-sell');
const btnUpgrade = document.getElementById('btn-upgrade'); // 池拡張
const btnReset = document.getElementById('btn-reset'); // データリセット
const collectionModal = document.getElementById('collection-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnList = document.getElementById('btn-list');
const koiListPanel = document.getElementById('koi-list-panel');
const btnCloseList = document.getElementById('btn-close-list');
const btnListBreed = document.getElementById('btn-list-breed');
const btnListSell = document.getElementById('btn-list-sell');
const btnListDeselect = document.getElementById('btn-list-deselect');
const koiListContainer = document.getElementById('koi-list-container');

const panelAction = document.getElementById('action-panel');
const slot1 = document.getElementById('slot-parent-1');
const slot2 = document.getElementById('slot-parent-2');
const ctxParent1 = document.getElementById('canvas-parent-1').getContext('2d');
const ctxParent2 = document.getElementById('canvas-parent-2').getContext('2d');

// リサイズ対応
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const POND_CX = () => canvas.width / 2;
// アクションパネル空間を避けるため、中心を上へずらす幅を大きくしました
const POND_CY = () => (canvas.height / 2) - 60;

// --- Game State ---
let playerPoints = 1000;
const pond = [];
const BREED_COST = 300; 
let historyRed = false; // 赤色が誕生したか
let historyBlue = false; // 青色が誕生したか

// 池のステータス変数
let KOI_MAX = 5;              // 初期は5匹まで
let pondLevel = 1;
let upgradeCost = 1000;       // 池拡張の必要ポイント
let currentPondRadius = 0;    // アニメーション用（初期値0）
let targetPondRadius = 180;   // 目標となる池の半径

// パフォーマンス: 池のグラデーションキャッシュ
let cachedGradient = null;
let cachedGradientRadius = 0;
let cachedGradientCx = 0;
let cachedGradientCy = 0;

// --- 図鑑データ (Step 5) ---
let collectionData = {
    records: {
        topValue: null, // { dna, size, value, rank, generation }
        maxSize: null   // { dna, size, value, rank, generation }
    },
    breedsFound: [],    // 発見済み品種名(id)の配列
    album: []           // 名品記録の配列（最新30件）
};

// --- 品種定義 ---
const KOI_BREEDS = [
    { id: 'platinum', name: 'プラチナ', desc: '純白に輝く単色' },
    { id: 'karasu', name: '烏鯉', desc: '漆黒の単色' },
    { id: 'higoi', name: '緋鯉', desc: '鮮やかな赤単色' },
    { id: 'aogoi', name: '青鯉', desc: '美しい青の単色' },
    { id: 'ogon', name: '黄金', desc: '至高の黄金単色' },
    { id: 'kohaku', name: '紅白', desc: '白地に赤模様の王道' },
    { id: 'shiro_utsuri', name: '白写り', desc: '白黒の水墨画模様' },
    { id: 'showa', name: '昭和三色', desc: '黒と赤の力強いコントラスト' },
    { id: 'shusui', name: '秋翠', desc: '青を含む鮮やかな模様' },
    { id: 'kousou', name: '紅蒼錦', desc: '赤と青が交わる希少種' },
    { id: 'murasaki_single', name: '紫単色', desc: '高貴な深い紫の単色' },
    { id: 'murasaki_kohaku', name: '紫紅白', desc: '白地に紫が映える模様' },
    { id: 'murasaki_utsuri', name: '紫写り', desc: '漆黒に浮かぶ紫の模様' },
    { id: 'murasaki_ao', name: '紫蒼錦', desc: '紫と青が混ざり合う妖艶な模様' },
    { id: 'murasaki_aka', name: '紫紅錦', desc: '紫と赤の情熱的な模様' },
    { id: 'hikarimono', name: '光り物', desc: '金を含む神々しい模様' }
];

function analyzeBreed(dna) {
    let b = dna.baseColor;
    let p = dna.patternColor;
    // 単色判定: 同色、または密度が極端に低い/高い場合
    let isSingle = (b === p);
    let color = isSingle ? b : null;
    
    if (isSingle) {
        if (color === '#f8f9fa') return 'platinum';
        if (color === '#343a40') return 'karasu';
        if (color === '#ff4d4d') return 'higoi';
        if (color === '#1aa3ff') return 'aogoi';
        if (color === '#9b59b6') return 'murasaki_single';
        if (color === '#ffcc00') return 'ogon';
    } else {
        if (b === '#ffcc00' || p === '#ffcc00') return 'hikarimono';
        let has = (c) => b === c || p === c;
        if (has('#f8f9fa') && has('#ff4d4d')) return 'kohaku';
        if (has('#f8f9fa') && has('#343a40')) return 'shiro_utsuri';
        if (has('#343a40') && has('#ff4d4d')) return 'showa';
        if (has('#1aa3ff') && (has('#f8f9fa') || has('#343a40'))) return 'shusui';
        if (has('#1aa3ff') && has('#ff4d4d')) return 'kousou';
        if (has('#9b59b6') && has('#f8f9fa')) return 'murasaki_kohaku';
        if (has('#9b59b6') && has('#343a40')) return 'murasaki_utsuri';
        if (has('#9b59b6') && has('#1aa3ff')) return 'murasaki_ao';
        if (has('#9b59b6') && has('#ff4d4d')) return 'murasaki_aka';
    }
    return null; // 不明な組み合わせ（基本発生しない）
}

function checkCollection(koi) {
    const data = {
        dna: koi.dna,
        size: koi.size,
        value: koi.value,
        rank: koi.rank,
        generation: koi.generation,
        patternSpots: koi.patternSpots // 固有の模様配置を固定保存
    };

    let isNewRecord = false;

    // 1. 最高評価額の更新
    if (!collectionData.records.topValue || koi.value > collectionData.records.topValue.value) {
        collectionData.records.topValue = data;
        isNewRecord = true;
    }
    // 2. 最大サイズの更新
    if (!collectionData.records.maxSize || koi.size > collectionData.records.maxSize.size) {
        collectionData.records.maxSize = data;
        isNewRecord = true;
    }
    
    // 3. 品種コンプリートのチェック
    let breedId = analyzeBreed(koi.dna);
    // breedsFoundは { id, dna, size, patternSpots } のオブジェクト配列（旧データは文字列の場合あり）
    let alreadyFound = collectionData.breedsFound.some(entry => {
        if (typeof entry === 'string') return entry === breedId;
        return entry.id === breedId;
    });
    if (breedId && !alreadyFound) {
        collectionData.breedsFound.push({
            id: breedId,
            dna: koi.dna,
            size: koi.size,
            patternSpots: koi.patternSpots
        });
        showNotification(`【新種発見】新しい品種「${KOI_BREEDS.find(b=>b.id === breedId).name}」が図鑑に登録されました！`);
    }

    // 4. 名品アルバムの登録 (Aランク以上)
    if (koi.rank === 'S' || koi.rank === 'A') {
        collectionData.album.unshift(data); // 先頭に追加
        if (collectionData.album.length > 30) {
            collectionData.album.pop(); // 30件を超えたら古いものを削除
        }
    }

    if (isNewRecord) {
        showNotification(`🎉 歴代記録更新！図鑑のトップページが更新されました`);
    }
}

// --- 図鑑のUI更新 ---
function updateCollectionUI() {
    try {
        // 1. トップ展示の更新
        const updateRecord = (recordId, data) => {
            const canvas = document.getElementById(`canvas-record-${recordId}`);
            if (!canvas) return;
            const info = document.getElementById(`record-${recordId}-info`);
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            if (data && data.dna) {
                if (info) {
                    info.innerHTML = `<div>Gen ${data.generation} / Rank: <b style="color:#ffd700">${data.rank}</b></div>
                                      <div style="color:#cbd5e1">評価額: <b>${data.value}</b> 万円</div>
                                      <div style="color:#94a3b8; font-size:0.8rem;">体長: ${data.size.toFixed(1)} cm</div>`;
                }
                ctx.save();
                ctx.translate(canvas.width / 2, canvas.height / 2);
                const scale = Math.min(1.2, 45 / (data.size || 20)); 
                ctx.scale(scale, scale);
                let dummy = new Koi(0, 0, data.dna, data.generation || 1, data.size || 20);
                dummy.size = data.size || 20; 
                if (data.patternSpots) dummy.patternSpots = data.patternSpots; // 模様の完全一致
                dummy.drawStatic(ctx);
                ctx.restore();
            } else {
                if (info) info.innerHTML = 'まだ記録がありません';
            }
        };
        updateRecord('value', collectionData.records.topValue);
        updateRecord('size', collectionData.records.maxSize);

        // 2. 品種コレクションの更新
        const breedsContainer = document.getElementById('breeds-container');
        if (breedsContainer) {
            breedsContainer.innerHTML = '';
            KOI_BREEDS.forEach(b => {
                // 旧データ(文字列)と新データ(オブジェクト)の両方に対応
                const foundEntry = collectionData.breedsFound.find(entry => {
                    if (typeof entry === 'string') return entry === b.id;
                    return entry.id === b.id;
                });
                const isFound = !!foundEntry;
                const div = document.createElement('div');
                div.className = `breed-item ${isFound ? '' : 'locked'}`;
                
                // 発見済みかつ鯉データがある場合はCanvasで描画
                if (isFound && typeof foundEntry === 'object' && foundEntry.dna) {
                    const cvs = document.createElement('canvas');
                    cvs.width = 80;
                    cvs.height = 80;
                    const bCtx = cvs.getContext('2d');
                    bCtx.save();
                    bCtx.translate(40, 40);
                    const scale = Math.min(0.9, 30 / (foundEntry.size || 20));
                    bCtx.scale(scale, scale);
                    let dummy = new Koi(0, 0, foundEntry.dna, 1, foundEntry.size || 20);
                    dummy.size = foundEntry.size || 20;
                    if (foundEntry.patternSpots) dummy.patternSpots = foundEntry.patternSpots;
                    dummy.drawStatic(bCtx);
                    bCtx.restore();
                    div.appendChild(cvs);
                }
                
                const nameEl = document.createElement('div');
                nameEl.className = 'breed-name';
                nameEl.textContent = isFound ? b.name : '???';
                div.appendChild(nameEl);
                
                const descEl = document.createElement('div');
                descEl.className = 'breed-desc';
                descEl.textContent = isFound ? b.desc : '未発見';
                div.appendChild(descEl);
                
                breedsContainer.appendChild(div);
            });
        }

        // 3. 名品アルバムの更新
        const albumContainer = document.getElementById('album-container');
        if (albumContainer) {
            albumContainer.innerHTML = '';
            if (!collectionData.album || collectionData.album.length === 0) {
                albumContainer.innerHTML = '<div style="color: #cbd5e1; grid-column: 1 / -1; text-align: center;">まだSまたはAランクの鯉が生まれていません</div>';
            } else {
                collectionData.album.forEach((a) => {
                    if (!a.dna) return;
                    const div = document.createElement('div');
                    div.className = 'album-item';
                    
                    const cvs = document.createElement('canvas');
                    cvs.width = 100;
                    cvs.height = 100;
                    const ctx = cvs.getContext('2d');
                    ctx.save();
                    ctx.translate(50, 50);
                    const scale = Math.min(1.0, 35 / (a.size || 20)); 
                    ctx.scale(scale, scale);
                    let dummy = new Koi(0, 0, a.dna, a.generation || 1, a.size || 20);
                    dummy.size = a.size || 20;
                    if (a.patternSpots) dummy.patternSpots = a.patternSpots; // 模様の完全一致
                    dummy.drawStatic(ctx);
                    ctx.restore();

                    div.appendChild(cvs);
                    
                    const info = document.createElement('div');
                    info.className = 'album-item-info';
                    info.innerHTML = `Gen ${a.generation}<br>
                                      <span style="color:#ffd700">Rank ${a.rank}</span><br>
                                      ${a.value} 万円`;
                    div.appendChild(info);
                    albumContainer.appendChild(div);
                });
            }
        }
    } catch (e) {
        console.error("Collection UI Error:", e);
    }
}

// 演出用
const floatingTexts = [];
const visitors = [];
let lastVisitorTime = Date.now();

// --- Game Logic ---
function evaluateKoi(dna, size, generation) {
    let score = 100; // 基礎スコア（世代の深さでの一律加算を削除。別に世代係数があるのでそれで評価）
    
    let isSingleColor = (dna.baseColor === dna.patternColor);
    // 単色の特別な色かどうか
    let isGoldenOgon = isSingleColor && (dna.baseColor === '#ffcc00');
    let isPurpleSingle = isSingleColor && (dna.baseColor === '#9b59b6');

    // 世代係数：若い世代は加味ボーナスが低く、5世代〜10世代以降で爆発的に価値が上がる
    let genFactor = 0.3 + (generation * 0.12);

    if (isSingleColor && !isGoldenOgon && !isPurpleSingle) {
        score -= 50; // 通常の単色は低く評価される
    } else {
        if (!isGoldenOgon && !isPurpleSingle) {
            score += 200 * genFactor; // 複数色ボーナス
            
            // 模様のバランスによるボーナス
            let balance = Math.abs(0.5 - dna.patternDensity);
            score += (0.5 - balance) * 1000 * genFactor; 
        }
    }

    // 特定の組み合わせボーナス（赤と青で統一評価）
    if ((dna.baseColor === '#f8f9fa' && dna.patternColor === '#ff4d4d') || (dna.baseColor === '#ff4d4d' && dna.patternColor === '#f8f9fa')) score += 500 * genFactor; // 赤+白
    if ((dna.baseColor === '#f8f9fa' && dna.patternColor === '#1aa3ff') || (dna.baseColor === '#1aa3ff' && dna.patternColor === '#f8f9fa')) score += 500 * genFactor; // 青+白
    if ((dna.baseColor === '#343a40' && dna.patternColor === '#ff4d4d') || (dna.baseColor === '#ff4d4d' && dna.patternColor === '#343a40')) score += 400 * genFactor; // 赤+黒
    if ((dna.baseColor === '#343a40' && dna.patternColor === '#1aa3ff') || (dna.baseColor === '#1aa3ff' && dna.patternColor === '#343a40')) score += 400 * genFactor; // 青+黒

    // 紫色を含む場合のボーナス（金より少なめ）
    if (dna.baseColor === '#9b59b6' || dna.patternColor === '#9b59b6') {
        if (isPurpleSingle) {
            score += 1000 * genFactor; // 紫単色
        } else {
            score += 500 * genFactor; // 一部に紫が含まれる
        }
    }

    // 金色を含む場合の特別ボーナス
    if (dna.baseColor === '#ffcc00' || dna.patternColor === '#ffcc00') {
        if (isGoldenOgon) {
            score += 1500 * genFactor; // 単色の金（黄金）
        } else {
            score += 800 * genFactor;  // 模様の一部に金が含まれる場合
        }
    }

    // サイズボーナス (最小11.25 〜 最大45.0想定)
    let sizeBonus = Math.max(0, (size - 25) * 35); // 25cm以上からより価値が上がりやすく変更
    score += sizeBonus;

    score = Math.floor(score);

    // 古いSランク要件である1400から、インフレ加算により1600へ引き上げ
    let rank = 'C';
    if (score > 1600) rank = 'S';
    else if (score > 800) rank = 'A';
    else if (score > 350) rank = 'B';
    
    return { value: score, rank: rank };
}

function breedKoi(parentA, parentB) {
    const nextGen = Math.max(parentA.generation, parentB.generation) + 1;

    let newDna = {
        baseColor: Math.random() < 0.5 ? parentA.dna.baseColor : parentB.dna.baseColor,
        patternColor: Math.random() < 0.5 ? parentA.dna.patternColor : parentB.dna.patternColor,
        patternDensity: (parentA.dna.patternDensity + parentB.dna.patternDensity) / 2 + (Math.random() * 0.2 - 0.1)
    };

    // 親の持つ全ての色
    const parentColors = [parentA.dna.baseColor, parentA.dna.patternColor, parentB.dna.baseColor, parentB.dna.patternColor];
    const hasColor = (c) => parentColors.includes(c);

    // 突然変異（親にない色が出る、または色が変わる）の判定
    // 基本は親の色を忠実に遺伝（50%以上）するため、変異率は50%からスタート
    let mutationRate = 0.50;
    
    // 両親が白黒のみの場合は進行のため変異率を上げる
    let isOnlyBasicColors = parentColors.every(c => c === '#f8f9fa' || c === '#343a40');
    if (isOnlyBasicColors && nextGen >= 2) mutationRate = 0.8;

    // 特別な固定変異（重み付けシステム）
    let applicableRules = [];

    // 1. 金×金 -> 黄金(金単色) 重み4（2から調整、レアだが適度な確率）
    if ((parentA.dna.baseColor === '#ffcc00' || parentA.dna.patternColor === '#ffcc00') && 
        (parentB.dna.baseColor === '#ffcc00' || parentB.dna.patternColor === '#ffcc00')) {
        applicableRules.push({
            weight: 4,
            apply: () => {
                newDna.baseColor = '#ffcc00';
                newDna.patternColor = '#ffcc00';
                newDna.patternDensity = 0.5;
                return 'gold_gold_to_gold';
            }
        });
    }

    // 2. 紫（どちらかに含まれる） -> 金柄 重み8（10から変更）
    if (hasColor('#9b59b6')) {
        applicableRules.push({
            weight: 8,
            apply: () => {
                let applyBase = Math.random() < 0.5;
                newDna.baseColor = applyBase ? '#ffcc00' : newDna.baseColor;
                newDna.patternColor = !applyBase ? '#ffcc00' : newDna.patternColor;
                return 'purple_to_gold';
            }
        });
    }

    // 2b. 紫を含む鯉同士の交配で紫単色が生まれる 重み10（8から変更）
    if (hasColor('#9b59b6')) {
        applicableRules.push({
            weight: 10,
            apply: () => {
                newDna.baseColor = '#9b59b6';
                newDna.patternColor = '#9b59b6';
                newDna.patternDensity = 0.5;
                return 'purple_to_purple_single';
            }
        });
    }

    // 3. 赤＆青（両方含まれる） -> 紫柄 重み12（10から調整、赤＋青と同じ確率）
    if (hasColor('#ff4d4d') && hasColor('#1aa3ff')) {
        applicableRules.push({
            weight: 12,
            apply: () => {
                let applyBase = Math.random() < 0.5;
                newDna.baseColor = applyBase ? '#9b59b6' : newDna.baseColor;
                newDna.patternColor = !applyBase ? '#9b59b6' : newDna.patternColor;
                return 'red_blue_to_purple';
            }
        });
    }

    // 3b. 赤＆青（両方含まれる） -> 紫単色 重み5（紫単色専用ルール）
    if (hasColor('#ff4d4d') && hasColor('#1aa3ff')) {
        applicableRules.push({
            weight: 5,
            apply: () => {
                newDna.baseColor = '#9b59b6';
                newDna.patternColor = '#9b59b6';
                newDna.patternDensity = 0.5;
                return 'red_blue_to_purple_single';
            }
        });
    }

    // 3c. 赤＆青（両方含まれる） -> 赤＋青（紅蒼錦） 重み12
    if (hasColor('#ff4d4d') && hasColor('#1aa3ff')) {
        applicableRules.push({
            weight: 12,
            apply: () => {
                // 赤＋青の組み合わせを生成
                let isRedBase = Math.random() < 0.5;
                newDna.baseColor = isRedBase ? '#ff4d4d' : '#1aa3ff';
                newDna.patternColor = isRedBase ? '#1aa3ff' : '#ff4d4d';
                newDna.patternDensity = 0.3 + Math.random() * 0.4;
                return 'red_blue_to_kousou';
            }
        });
    }

    // 4. 白を含む鯉同士の交配で赤＋白（紅白）が生まれる 重み15
    if (hasColor('#f8f9fa') && hasColor('#ff4d4d')) {
        applicableRules.push({
            weight: 15,
            apply: () => {
                // 赤＋白の組み合わせを生成
                let isRedBase = Math.random() < 0.5;
                newDna.baseColor = isRedBase ? '#ff4d4d' : '#f8f9fa';
                newDna.patternColor = isRedBase ? '#f8f9fa' : '#ff4d4d';
                newDna.patternDensity = 0.3 + Math.random() * 0.4;
                return 'white_red_to_kohaku';
            }
        });
    }

    // 5. 白を含む鯉同士の交配で青＋白（秋翠）が生まれる 重み15
    if (hasColor('#f8f9fa') && hasColor('#1aa3ff')) {
        applicableRules.push({
            weight: 15,
            apply: () => {
                // 青＋白の組み合わせを生成
                let isBlueBase = Math.random() < 0.5;
                newDna.baseColor = isBlueBase ? '#1aa3ff' : '#f8f9fa';
                newDna.patternColor = isBlueBase ? '#f8f9fa' : '#1aa3ff';
                newDna.patternDensity = 0.3 + Math.random() * 0.4;
                return 'white_blue_to_shusui';
            }
        });
    }

    // 5b. 白＋紫（紫紅白）が生まれる 重み12
    if (hasColor('#f8f9fa') && hasColor('#9b59b6')) {
        applicableRules.push({
            weight: 12,
            apply: () => {
                // 白＋紫の組み合わせを生成
                let isWhiteBase = Math.random() < 0.5;
                newDna.baseColor = isWhiteBase ? '#f8f9fa' : '#9b59b6';
                newDna.patternColor = isWhiteBase ? '#9b59b6' : '#f8f9fa';
                newDna.patternDensity = 0.3 + Math.random() * 0.4;
                return 'white_purple_to_murasaki_kohaku';
            }
        });
    }

    // 5c. 白＋黒（白写り）が生まれる 重み10
    if (hasColor('#f8f9fa') && hasColor('#343a40')) {
        applicableRules.push({
            weight: 10,
            apply: () => {
                // 白＋黒の組み合わせを生成
                let isWhiteBase = Math.random() < 0.5;
                newDna.baseColor = isWhiteBase ? '#f8f9fa' : '#343a40';
                newDna.patternColor = isWhiteBase ? '#343a40' : '#f8f9fa';
                newDna.patternDensity = 0.3 + Math.random() * 0.4;
                return 'white_black_to_shiro_utsuri';
            }
        });
    }

    // 5d. 黒＋赤（昭和三色）が生まれる 重み10
    if (hasColor('#343a40') && hasColor('#ff4d4d')) {
        applicableRules.push({
            weight: 10,
            apply: () => {
                // 黒＋赤の組み合わせを生成
                let isBlackBase = Math.random() < 0.5;
                newDna.baseColor = isBlackBase ? '#343a40' : '#ff4d4d';
                newDna.patternColor = isBlackBase ? '#ff4d4d' : '#343a40';
                newDna.patternDensity = 0.3 + Math.random() * 0.4;
                return 'black_red_to_showa';
            }
        });
    }

    // 5e. 黒＋青（黒青錦）が生まれる 重み10
    if (hasColor('#343a40') && hasColor('#1aa3ff')) {
        applicableRules.push({
            weight: 10,
            apply: () => {
                // 黒＋青の組み合わせを生成
                let isBlackBase = Math.random() < 0.5;
                newDna.baseColor = isBlackBase ? '#343a40' : '#1aa3ff';
                newDna.patternColor = isBlackBase ? '#1aa3ff' : '#343a40';
                newDna.patternDensity = 0.3 + Math.random() * 0.4;
                return 'black_blue_to_kokusei';
            }
        });
    }

    // 5f. 紫＋青（紫蒼錦）が生まれる 重み10
    if (hasColor('#9b59b6') && hasColor('#1aa3ff')) {
        applicableRules.push({
            weight: 10,
            apply: () => {
                // 紫＋青の組み合わせを生成
                let isPurpleBase = Math.random() < 0.5;
                newDna.baseColor = isPurpleBase ? '#9b59b6' : '#1aa3ff';
                newDna.patternColor = isPurpleBase ? '#1aa3ff' : '#9b59b6';
                newDna.patternDensity = 0.3 + Math.random() * 0.4;
                return 'purple_blue_to_murasaki_ao';
            }
        });
    }

    // 5g. 黒＋紫（紫写り）が生まれる 重み10
    if (hasColor('#343a40') && hasColor('#9b59b6')) {
        applicableRules.push({
            weight: 10,
            apply: () => {
                // 黒＋紫の組み合わせを生成
                let isBlackBase = Math.random() < 0.5;
                newDna.baseColor = isBlackBase ? '#343a40' : '#9b59b6';
                newDna.patternColor = isBlackBase ? '#9b59b6' : '#343a40';
                newDna.patternDensity = 0.3 + Math.random() * 0.4;
                return 'black_purple_to_murasaki_utsuri';
            }
        });
    }

    // 5h. 紫＋赤（紫紅錦）が生まれる 重み10
    if (hasColor('#9b59b6') && hasColor('#ff4d4d')) {
        applicableRules.push({
            weight: 10,
            apply: () => {
                // 紫＋赤の組み合わせを生成
                let isPurpleBase = Math.random() < 0.5;
                newDna.baseColor = isPurpleBase ? '#9b59b6' : '#ff4d4d';
                newDna.patternColor = isPurpleBase ? '#ff4d4d' : '#9b59b6';
                newDna.patternDensity = 0.3 + Math.random() * 0.4;
                return 'purple_red_to_murasaki_aka';
            }
        });
    }

    // 6. 赤 -> 赤単色 重み10
    if (hasColor('#ff4d4d') && !hasColor('#1aa3ff')) {
        applicableRules.push({
            weight: 10,
            apply: () => {
                newDna.baseColor = '#ff4d4d';
                newDna.patternColor = '#ff4d4d';
                newDna.patternDensity = 0.5;
                return 'red_to_red_single';
            }
        });
    }

    // 7. 青 -> 青単色 重み10
    if (hasColor('#1aa3ff') && !hasColor('#ff4d4d')) {
        applicableRules.push({
            weight: 10,
            apply: () => {
                newDna.baseColor = '#1aa3ff';
                newDna.patternColor = '#1aa3ff';
                newDna.patternDensity = 0.5;
                return 'blue_to_blue_single';
            }
        });
    }

    // 8. 赤＆青 -> 赤単色 または 青単色 重み7（赤単色）、7（青単色）
    if (hasColor('#ff4d4d') && hasColor('#1aa3ff')) {
        applicableRules.push({
            weight: 7,
            apply: () => {
                newDna.baseColor = '#ff4d4d';
                newDna.patternColor = '#ff4d4d';
                newDna.patternDensity = 0.5;
                return 'red_blue_to_red_single';
            }
        });
        applicableRules.push({
            weight: 7,
            apply: () => {
                newDna.baseColor = '#1aa3ff';
                newDna.patternColor = '#1aa3ff';
                newDna.patternDensity = 0.5;
                return 'red_blue_to_blue_single';
            }
        });
    }

    // 9. 赤 -> 青（世代依存）動的重み Math.floor(3 + (nextGen * 2))
    if (hasColor('#ff4d4d') && !hasColor('#1aa3ff')) {
        const dynamicWeight = Math.floor(3 + (nextGen * 2));
        applicableRules.push({
            weight: dynamicWeight,
            apply: () => {
                let applyBase = Math.random() < 0.5;
                newDna.baseColor = applyBase ? '#1aa3ff' : newDna.baseColor;
                newDna.patternColor = !applyBase ? '#1aa3ff' : newDna.patternColor;
                return 'red_to_blue_generation';
            }
        });
    }

    // 10. 白黒のみ -> 赤柄 または 青柄 重み20（赤柄）、10（青柄）
    if (isOnlyBasicColors && nextGen >= 2) {
        applicableRules.push({
            weight: 20,
            apply: () => {
                let applyBase = Math.random() < 0.5;
                newDna.baseColor = applyBase ? '#ff4d4d' : newDna.baseColor;
                newDna.patternColor = !applyBase ? '#ff4d4d' : newDna.patternColor;
                return 'white_black_to_red';
            }
        });
        applicableRules.push({
            weight: 10,
            apply: () => {
                let applyBase = Math.random() < 0.5;
                newDna.baseColor = applyBase ? '#1aa3ff' : newDna.baseColor;
                newDna.patternColor = !applyBase ? '#1aa3ff' : newDna.patternColor;
                return 'white_black_to_blue';
            }
        });
    }

    // 11. 白単色 -> 黒単色 重み10
    if (parentColors.every(c => c === '#f8f9fa')) {
        applicableRules.push({
            weight: 10,
            apply: () => {
                newDna.baseColor = '#343a40';
                newDna.patternColor = '#343a40';
                newDna.patternDensity = 0.5;
                return 'white_single_to_black_single';
            }
        });
    }

    // 12. 赤/青 -> 黒色 重み5
    if ((hasColor('#ff4d4d') || hasColor('#1aa3ff')) && !hasColor('#343a40')) {
        applicableRules.push({
            weight: 5,
            apply: () => {
                let applyBase = Math.random() < 0.5;
                newDna.baseColor = applyBase ? '#343a40' : newDna.baseColor;
                newDna.patternColor = !applyBase ? '#343a40' : newDna.patternColor;
                return 'red_blue_to_black';
            }
        });
    }

    // 13. 黒色救済措置 重み10
    if (!hasColor('#343a40') && nextGen >= 3) {
        // 池内のどの鯉にも黒色が含まれないか確認
        let anyBlackInPond = pond.some(k => 
            k.dna.baseColor === '#343a40' || k.dna.patternColor === '#343a40'
        );
        if (!anyBlackInPond) {
            applicableRules.push({
                weight: 10,
                apply: () => {
                    let applyBase = Math.random() < 0.5;
                    newDna.baseColor = applyBase ? '#343a40' : newDna.baseColor;
                    newDna.patternColor = !applyBase ? '#343a40' : newDna.patternColor;
                    return 'black_rescue';
                }
            });
        }
    }

    // 14. 通常の遺伝（何も特別な変異が起こらない）重み30
    applicableRules.push({
        weight: 30,
        apply: () => {
            // 何も特別な変異が起こらない（通常の遺伝のみ）
            // 50%の確率で通常の変異が追加で発生
            if (Math.random() < 0.5) {
                // 通常の変異プール
                let pool = ['#f8f9fa', '#343a40'];
                if (nextGen >= 2) pool.push('#ff4d4d');
                if (nextGen >= 3) pool.push('#1aa3ff');
                
                let newColor = pool[Math.floor(Math.random() * pool.length)];
                if (newColor !== newDna.baseColor && newColor !== newDna.patternColor) {
                    if (Math.random() < 0.5) newDna.baseColor = newColor;
                    else newDna.patternColor = newColor;
                    
                    if (newDna.patternDensity < 0.2 || newDna.patternDensity > 0.8) {
                        newDna.patternDensity = 0.3 + Math.random() * 0.4;
                    }
                }
            }
            return 'normal_inheritance';
        }
    });

    // 重み付けシステムによるルール選択
    if (applicableRules.length > 0) {
        // 総重みを計算
        let totalWeight = applicableRules.reduce((sum, rule) => sum + rule.weight, 0);
        
        // 重みに基づいてルールを選択
        let randomValue = Math.random() * totalWeight;
        let accumulatedWeight = 0;
        let selectedRule = null;
        
        for (let rule of applicableRules) {
            accumulatedWeight += rule.weight;
            if (randomValue <= accumulatedWeight) {
                selectedRule = rule;
                break;
            }
        }
        
        if (selectedRule) {
            selectedRule.apply();
        }
    }

    // 第二世代で白黒から赤色を強制的に出す救済（念のため）
    if (nextGen === 2 && !hasColor('#ff4d4d')) {
        if (!parentColors.includes('#ff4d4d') && newDna.baseColor === newDna.patternColor) {
            newDna.patternColor = '#ff4d4d';
            newDna.patternDensity = Math.max(0.3, newDna.patternDensity);
            historyRed = true;
        }
    }

    // 密度の揺らぎ
    newDna.patternDensity += (Math.random() * 0.4 - 0.2);
    // 密度の範囲を広くとることで、単色品種も発見可能にする
    newDna.patternDensity = Math.max(0.05, Math.min(0.95, newDna.patternDensity));

    // 親の平均サイズを計算して渡す
    let pSize = (parentA.size + parentB.size) / 2;

    const child = new Koi(POND_CX(), POND_CY(), newDna, nextGen, pSize);
    child.state = 'born';
    child.stateTimer = 180; 

    // 新たな色（赤・青）の発見記録
    if (newDna.baseColor === '#ff4d4d' || newDna.patternColor === '#ff4d4d') historyRed = true;
    if (newDna.baseColor === '#1aa3ff' || newDna.patternColor === '#1aa3ff') historyBlue = true;

    // 図鑑の確認
    checkCollection(child);

    pond.push(child);

    parentA.selected = false;
    parentB.selected = false;

    showNotification(`[Gen ${nextGen} - Rank: ${child.rank}] 新しい錦鯉が誕生しました！`);
    updateHud();
}

function showNotification(text) {
    const area = document.getElementById('notification-area');
    const msg = document.createElement('div');
    msg.className = 'notification';
    msg.innerText = text;
    area.appendChild(msg);
    setTimeout(() => {
        msg.classList.add('fade-out');
        setTimeout(() => msg.remove(), 500);
    }, 4000);
}

// --- Event Listeners ---
// ポインター（マウス・タッチ共通）座標のトラッキング
let mouseX = -100;
let mouseY = -100;

canvas.addEventListener('pointermove', (e) => {
    e.preventDefault(); // スクロール防止
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
}, { passive: false });

canvas.addEventListener('pointerleave', () => {
    mouseX = -100;
    mouseY = -100;
});
canvas.addEventListener('pointerup', (e) => {
    e.preventDefault();
}, { passive: false });
canvas.addEventListener('pointercancel', () => {
    mouseX = -100;
    mouseY = -100;
});

btnCollection.addEventListener('click', () => {
    updateCollectionUI();
    collectionModal.classList.remove('hidden');
});
btnCloseModal.addEventListener('click', () => {
    collectionModal.classList.add('hidden');
});

slot1.addEventListener('click', () => {
    const parents = pond.filter(k => k.selected);
    if (parents.length > 0) { parents[0].selected = false; updateHud(); }
});
slot2.addEventListener('click', () => {
    const parents = pond.filter(k => k.selected);
    if (parents.length > 1) { parents[1].selected = false; updateHud(); }
});

canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault(); // ダブルタップズーム防止
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // タッチデバイスではポインター座標をここで更新しておく
    mouseX = x;
    mouseY = y;

    let clickedKoi = null;
    for (let i = pond.length - 1; i >= 0; i--) {
        if (pond[i].contains(x, y)) {
            clickedKoi = pond[i];
            break;
        }
    }

    if (clickedKoi) {
        clickedKoi.selected = !clickedKoi.selected;
        updateHud();
        if (!koiListPanel.classList.contains('hidden')) updateKoiListUI();
    }
}, { passive: false });

btnBreed.addEventListener('click', () => {
    const parents = pond.filter(k => k.selected);
    if (parents.length === 2 && playerPoints >= BREED_COST && pond.length < KOI_MAX) {
        playerPoints -= BREED_COST;
        breedKoi(parents[0], parents[1]);
    }
});

btnSell.addEventListener('click', () => {
    const parents = pond.filter(k => k.selected);
    if (parents.length > 0) {
        let earned = 0;
        parents.forEach(p => {
            earned += Math.floor(p.value * 0.4); 
            const index = pond.indexOf(p);
            if (index > -1) pond.splice(index, 1);
        });
        playerPoints += earned;
        showNotification(`${parents.length}匹の錦鯉とお別れしました。 (+${earned} 万円)`);
        
        // 浮遊テキストでも表示
        floatingTexts.push(new FloatingText(`+${earned} 万円`, POND_CX(), POND_CY(), '#ffd700'));
        
        updateHud();
        if (!koiListPanel.classList.contains('hidden')) updateKoiListUI();
    }
});

btnUpgrade.addEventListener('click', () => {
    if (playerPoints >= upgradeCost && KOI_MAX < 10) {
        playerPoints -= upgradeCost;
        pondLevel++;
        KOI_MAX += 1; // 鯉の最大数を拡張（+1匹）
        
        let availableHeight = canvas.height - 220;
        let maxRadius = Math.min(canvas.width, availableHeight) / 2;
        targetPondRadius = Math.min(targetPondRadius + 15, maxRadius); 
        
        let costShow = upgradeCost;
        upgradeCost += 1000; // 拡張コストは1000万円ずつ増加
        
        showNotification(`池を拡張しました！ (鯉最大数: ${KOI_MAX}) [-${costShow} 万円]`);
        
        // 浮遊テキストでも表示
        floatingTexts.push(new FloatingText(`-${costShow} 万円`, POND_CX(), POND_CY(), '#ff4d4d'));
        
        saveGame();
        updateHud();
    }
});

btnReset.addEventListener('click', () => {
    if (confirm("本当にゲームデータを完全に消去し、最初からやり直しますか？\n（この操作は取り消せません）")) {
        localStorage.removeItem('nishikigoi_save');
        location.reload();
    }
});

// --- 鯉一覧パネル ---
btnList.addEventListener('click', () => {
    koiListPanel.classList.toggle('hidden');
    if (!koiListPanel.classList.contains('hidden')) updateKoiListUI();
});
btnCloseList.addEventListener('click', () => {
    koiListPanel.classList.add('hidden');
});
btnListDeselect.addEventListener('click', () => {
    pond.forEach(k => k.selected = false);
    updateHud();
    updateKoiListUI();
});
btnListBreed.addEventListener('click', () => {
    const parents = pond.filter(k => k.selected);
    if (parents.length === 2 && playerPoints >= BREED_COST && pond.length < KOI_MAX) {
        playerPoints -= BREED_COST;
        breedKoi(parents[0], parents[1]);
        updateKoiListUI();
    }
});
btnListSell.addEventListener('click', () => {
    const selected = pond.filter(k => k.selected);
    if (selected.length > 0) {
        let earned = 0;
        selected.forEach(p => {
            earned += Math.floor(p.value * 0.4);
            const index = pond.indexOf(p);
            if (index > -1) pond.splice(index, 1);
        });
        playerPoints += earned;
        showNotification(`${selected.length}匹の錦鯉とお別れしました。 (+${earned} 万円)`);
        floatingTexts.push(new FloatingText(`+${earned} 万円`, POND_CX(), POND_CY(), '#ffd700'));
        updateHud();
        updateKoiListUI();
    }
});

function updateKoiListUI() {
    koiListContainer.innerHTML = '';
    
    // 評価額の高い順にソートして表示
    const sorted = [...pond].sort((a, b) => b.value - a.value);
    
    sorted.forEach(koi => {
        const card = document.createElement('div');
        card.className = `koi-list-card${koi.selected ? ' selected' : ''}`;
        
        // サムネイル用canvas
        const cvs = document.createElement('canvas');
        cvs.width = 50;
        cvs.height = 50;
        const cCtx = cvs.getContext('2d');
        cCtx.save();
        cCtx.translate(25, 25);
        const scale = Math.min(0.7, 20 / (koi.size || 20));
        cCtx.scale(scale, scale);
        koi.drawStatic(cCtx);
        cCtx.restore();
        card.appendChild(cvs);
        
        // 情報
        const info = document.createElement('div');
        info.className = 'koi-list-info';
        
        const breedId = analyzeBreed(koi.dna);
        const breedDef = breedId ? KOI_BREEDS.find(b => b.id === breedId) : null;
        const breedName = breedDef ? breedDef.name : '不明';
        
        info.innerHTML = `<span class="koi-gen">Gen ${koi.generation} 「${breedName}」</span>
                          <span class="koi-rank">Rank ${koi.rank} / ${koi.size.toFixed(1)} cm</span>
                          <span class="koi-val">評価額 ${koi.value} 万円 (売却 +${Math.floor(koi.value * 0.4)})</span>`;
        card.appendChild(info);
        
        card.addEventListener('click', () => {
            koi.selected = !koi.selected;
            updateHud();
            updateKoiListUI();
        });
        
        koiListContainer.appendChild(card);
    });
    
    // パネル内ボタンの状態更新
    const parents = pond.filter(k => k.selected);
    const sellVal = parents.reduce((sum, p) => sum + Math.floor(p.value * 0.4), 0);
    
    btnListBreed.disabled = !(parents.length === 2 && playerPoints >= BREED_COST && pond.length < KOI_MAX);
    btnListBreed.innerText = parents.length === 2 ? `交配する (${BREED_COST} 万円)` : `交配 (${parents.length}/2匹選択)`;
    
    btnListSell.disabled = parents.length === 0;
    btnListSell.innerText = parents.length > 0 ? `お別れ ${parents.length}匹 (+${sellVal} 万円)` : 'お別れする';
}

// --- Koi Class ---
class Koi {
    constructor(x, y, dna, generation = 1, parentSize = null) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.angle = Math.atan2(this.vy, this.vx);
        // スピードを一律で従来の8割に下げる（0.4 -> 0.32）
        this.baseSpeed = (1.0 + Math.random() * 1.5) * 0.32;
        this.currentSpeed = this.baseSpeed; 
        
        let sizeRand = (Math.random() + Math.random() + Math.random()) / 3;
        
        if (parentSize !== null) {
            // 親のサイズを基準に、±8程度の幅でランダムに変動させる（確率的に親に近いサイズが出やすい）
            let sizeVariation = (sizeRand - 0.5) * 16;
            this.size = parentSize + sizeVariation;
            // 最小11.25と最大45程度の範囲に収める
            this.size = Math.max(11.25, Math.min(45.0, this.size));
        } else {
            // 初期状態のサイズ分布
            this.size = 11.25 + sizeRand * 23.25; 
        }
        
        this.wiggle = Math.random() * Math.PI * 2; 

        this.dna = dna;
        this.generation = generation; 
        this.patternSpots = this.generatePatternSpots();
        
        this.selected = false;
        const appraisal = evaluateKoi(this.dna, this.size, this.generation);
        this.rank = appraisal.rank;
        this.value = appraisal.value;

        this.state = 'normal'; // 'born' または 'normal'
        this.stateTimer = 0;

        // 遊泳ステートマシン用
        this.fsmState = 'swimming'; // 'swimming' or 'idling'
        this.fsmTimer = 100 + Math.random() * 200;
    }

    generatePatternSpots() {
        const spots = [];
        const numSpots = Math.floor(this.dna.patternDensity * 8); 
        for (let i = 0; i < numSpots; i++) {
            spots.push({
                ox: (Math.random() - 0.5) * this.size * 2.2,  
                oy: (Math.random() - 0.5) * this.size * 0.8,  
                r: 3 + Math.random() * this.size * 0.6        
            });
        }
        return spots;
    }

    contains(px, py) {
        const dx = px - this.x;
        const dy = py - this.y;
        return (dx * dx + dy * dy) <= (this.size * 1.8) * (this.size * 1.8);
    }

    update(width, height, dt) {
        // --- 誕生時の中央エフェクト ---
        if (this.state === 'born') {
            this.stateTimer -= dt;
            this.wiggle += 0.1 * dt;
            if (this.stateTimer <= 0) {
                this.state = 'normal';
                this.fsmState = 'swimming';
                this.fsmTimer = 100;
            }
            return;
        }

        const cx = POND_CX();
        const cy = POND_CY();
        const distToCenter = Math.sqrt((this.x - cx) ** 2 + (this.y - cy) ** 2);
        
        let targetSpeed = this.baseSpeed;

        // --- ステートマシンの更新 (止まる・動くの管理) ---
        this.fsmTimer -= dt;
        if (this.fsmState === 'swimming') {
            if (this.fsmTimer <= 0) {
                this.fsmState = 'idling';
                this.fsmTimer = 100 + Math.random() * 100; 
            }
            if (Math.random() < 0.02 * dt) this.angle += (Math.random() - 0.5) * 0.4;

        } else if (this.fsmState === 'idling') {
            targetSpeed = 0;
            if (this.fsmTimer <= 0) {
                this.fsmState = 'swimming';
                this.fsmTimer = 80 + Math.random() * 160; 
                this.angle += (Math.random() - 0.5) * 1.0; 
            }
        }

        // --- 池の境界判定 ---
        const safeRadius = targetPondRadius - this.size * 2.0; 
        
        if (distToCenter > safeRadius) {
            const angleToCenter = Math.atan2(cy - this.y, cx - this.x);
            let diff = angleToCenter - this.angle;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            const urgency = Math.min((distToCenter - safeRadius) / 20.0, 1.0);
            this.angle += diff * 0.08 * urgency * dt;
            
            if (this.fsmState === 'idling') {
                this.fsmState = 'swimming';
                this.fsmTimer = 60;
            }
        }

        // 速度を滑らかに加減速させる
        let lerpFactor = 1.0 - Math.pow(1.0 - 0.05, dt); // dt対応の補間
        this.currentSpeed += (targetSpeed - this.currentSpeed) * lerpFactor;

        // 座標更新
        this.vx = Math.cos(this.angle) * this.currentSpeed;
        this.vy = Math.sin(this.angle) * this.currentSpeed;
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // ヒレの運動量
        if (this.currentSpeed > 0.1) {
            this.wiggle += 0.15 * this.currentSpeed * 2.0 * dt;
        } else {
            this.wiggle += 0.03 * dt; 
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        let displayScale = 1.0;

        if (this.state === 'born') {
            let progress = (180 - this.stateTimer) / 180;
            displayScale = 1.0 + Math.sin(progress * Math.PI) * 1.0;
            ctx.rotate(-Math.PI / 2);
            ctx.scale(displayScale, displayScale);

            ctx.fillStyle = `rgba(255, 255, 255, ${Math.sin(progress * Math.PI) * 0.5})`;
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.rotate(this.angle);
        }

        if (this.selected) {
            // 半透明+線描画で選択状態を表現
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        } else if (this.state !== 'born') {
            // 影の代わりに黒い楕円を後ろに描画する
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(5, 10, this.size * 1.4, this.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.fillStyle = this.dna.baseColor;
        ctx.globalAlpha = 0.8; 
        
        ctx.beginPath();
        let tailX = -this.size * 1.2;
        let tailY = Math.sin(this.wiggle) * this.size * 0.6;
        ctx.moveTo(-this.size * 0.5, 0);
        ctx.lineTo(tailX - this.size * 0.5, tailY - this.size * 0.6);
        ctx.lineTo(tailX - this.size * 0.8, tailY);
        ctx.lineTo(tailX - this.size * 0.5, tailY + this.size * 0.6);
        ctx.closePath();
        ctx.fill();

        let finAngle = Math.sin(this.wiggle * 0.5) * 0.2; 
        ctx.save(); 
        ctx.translate(this.size * 0.3, -this.size * 0.4);
        ctx.rotate(-0.5 + finAngle);
        ctx.beginPath();
        ctx.ellipse(0, -this.size * 0.4, this.size * 0.4, this.size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        ctx.save(); 
        ctx.translate(this.size * 0.3, this.size * 0.4);
        ctx.rotate(0.5 - finAngle);
        ctx.beginPath();
        ctx.ellipse(0, this.size * 0.4, this.size * 0.4, this.size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.globalAlpha = 1.0;

        // 体の楕円を描画しつつ、模様描画のクリップにも使う（パス生成1回で済む）
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 1.4, this.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill(); // 体を描画
        ctx.clip(); // 同じパスでクリップ

        ctx.fillStyle = this.dna.patternColor;
        this.patternSpots.forEach(spot => {
            ctx.beginPath();
            ctx.arc(spot.ox, spot.oy, spot.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(this.size * 1.0, -this.size * 0.25, this.size * 0.12, 0, Math.PI * 2);
        ctx.arc(this.size * 1.0,  this.size * 0.25, this.size * 0.12, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // draw()冒頭のsave()に対応
    }

    // テキストラベル描画（池のフチより上に描画するため分離）
    drawLabel(ctx) {
        let isHovered = this.contains(mouseX, mouseY);

        if (this.selected || this.state === 'born' || isHovered) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.textAlign = 'center';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 3;
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            
            let displayScale = 1.0;
            if (this.state === 'born') {
                let progress = (180 - this.stateTimer) / 180;
                displayScale = 1.0 + Math.sin(progress * Math.PI) * 1.0;
                ctx.fillStyle = '#ffffff';
                ctx.font = '24px bold Inter';
                let yPos = -this.size * 3 * displayScale;
                const txt = `Gen ${this.generation} Rank: ${this.rank} / ${this.size.toFixed(1)} cm / 評価額 ${this.value} 万円`;
                ctx.strokeText(txt, 0, yPos);
                ctx.fillText(txt, 0, yPos);
            } else if (this.selected) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '14px bold Inter';
                let yPos = -this.size * 2;
                const txt = `Gen ${this.generation} Rank: ${this.rank} / ${this.size.toFixed(1)} cm / ${this.value} 万円`;
                ctx.strokeText(txt, 0, yPos);
                ctx.fillText(txt, 0, yPos);
            } else if (isHovered) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.font = '11px normal Inter';
                ctx.lineWidth = 2;
                let yPos = -this.size * 1.8;
                const txt = `Gen ${this.generation} | Rank ${this.rank}`;
                ctx.strokeText(txt, 0, yPos);
                ctx.fillText(txt, 0, yPos);
            }
            ctx.restore();
        }
    }

    drawStatic(ctx) {
        ctx.save();
        ctx.rotate(-Math.PI / 2); 
        
        ctx.fillStyle = this.dna.baseColor;
        ctx.beginPath();
        let tailX = -this.size * 1.2;
        ctx.moveTo(-this.size * 0.5, 0);
        ctx.lineTo(tailX - this.size * 0.5, -this.size * 0.4);
        ctx.lineTo(tailX - this.size * 0.8, 0);
        ctx.lineTo(tailX - this.size * 0.5, this.size * 0.4);
        ctx.closePath();
        ctx.fill();

        ctx.save(); 
        ctx.translate(this.size * 0.3, -this.size * 0.4);
        ctx.rotate(-0.5);
        ctx.beginPath();
        ctx.ellipse(0, -this.size * 0.2, this.size * 0.4, this.size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        ctx.save(); 
        ctx.translate(this.size * 0.3, this.size * 0.4);
        ctx.rotate(0.5);
        ctx.beginPath();
        ctx.ellipse(0, this.size * 0.2, this.size * 0.4, this.size * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 1.4, this.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size * 1.4, this.size * 0.6, 0, 0, Math.PI * 2);
        ctx.clip(); 

        ctx.fillStyle = this.dna.patternColor;
        this.patternSpots.forEach(spot => {
            ctx.beginPath();
            ctx.arc(spot.ox, spot.oy, spot.r, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore(); 

        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.arc(this.size * 1.0, -this.size * 0.25, this.size * 0.12, 0, Math.PI * 2);
        ctx.arc(this.size * 1.0,  this.size * 0.25, this.size * 0.12, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// --- 演出用クラス ---
class FloatingText {
    constructor(text, x, y, color = '#ffd700') {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.timer = 90; // 約1.5秒表示
        this.vy = -1.0;
        this.alpha = 1.0;
    }
    update(dt) {
        this.y += this.vy * dt;
        this.timer -= dt;
        if (this.timer < 30) this.alpha = this.timer / 30; 
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = this.color;
        ctx.lineJoin = 'round';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

class Visitor {
    constructor(angle) {
        this.angle = angle;
        const dist = targetPondRadius + 40; 
        this.x = POND_CX() + Math.cos(angle) * dist;
        this.y = POND_CY() + Math.sin(angle) * dist;
        this.timer = 120; 
        this.alpha = 0.0;
        this.state = 'fadein';
    }
    update(dt) {
        if (this.state === 'fadein') {
            this.alpha += 0.05 * dt;
            if (this.alpha >= 1.0) { this.alpha = 1.0; this.state = 'watching'; }
        } else if (this.state === 'watching') {
            this.timer -= dt;
            if (this.timer <= 0) this.state = 'fadeout';
        } else if (this.state === 'fadeout') {
            this.alpha -= 0.05 * dt;
        }
    }
    draw(ctx) {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        // 池の中心を向く
        ctx.rotate(this.angle - Math.PI/2);
        
        // 影を描画（shadowBlurの代替）
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.arc(3, 8, 20, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(3, -7, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        
        // 体
        ctx.beginPath();
        ctx.arc(0, 5, 20, Math.PI, Math.PI * 2);
        ctx.fill();
        
        // 頭
        ctx.beginPath();
        ctx.arc(0, -10, 12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

// --- セーブ＆ロード (Step 5) ---
function saveGame() {
    // 既存の池の鯉から色実績を再確認（お別れしていても、記録として残す）
    pond.forEach(koi => {
        if (koi.dna.baseColor === '#ff4d4d' || koi.dna.patternColor === '#ff4d4d') historyRed = true;
        if (koi.dna.baseColor === '#1aa3ff' || koi.dna.patternColor === '#1aa3ff') historyBlue = true;
    });

    const data = {
        playerPoints,
        KOI_MAX,
        pondLevel,
        upgradeCost,
        targetPondRadius,
        historyRed,
        historyBlue,
        collectionData,
        pond: pond.map(k => ({
            x: k.x - POND_CX(),   // 画面サイズに依存しないよう相対座標で保存
            y: k.y - POND_CY(),
            dna: k.dna,
            generation: k.generation,
            size: k.size,
            patternSpots: k.patternSpots // 配置データも保存
        }))
    };
    localStorage.setItem('nishikigoi_save', JSON.stringify(data));
}

function loadGame() {
    const saved = localStorage.getItem('nishikigoi_save');
    if (!saved) return false;

    try {
        const data = JSON.parse(saved);
        playerPoints = data.playerPoints || 1000;
        KOI_MAX = data.KOI_MAX || 5;
        pondLevel = data.pondLevel || 1;
        upgradeCost = data.upgradeCost || 1000;
        targetPondRadius = data.targetPondRadius || 180;
        currentPondRadius = targetPondRadius; // 読み込み時は即座に池を開く
        
        historyRed = data.historyRed || false;
        historyBlue = data.historyBlue || false;
        if (data.collectionData) collectionData = data.collectionData;
        
        pond.length = 0; 
        if (data.pond && Array.isArray(data.pond)) {
            data.pond.forEach(p => {
                let k = new Koi(POND_CX() + p.x, POND_CY() + p.y, p.dna, p.generation);
                k.size = p.size; // サイズだけは保存されたものを強制上書きして復元
                if (p.patternSpots) k.patternSpots = p.patternSpots; // 模様も完全に復元
                pond.push(k);
            });
        }
        // ロード後に既存の鯉の品種を図鑑に登録（旧データからの移行対応）
        pond.forEach(k => checkCollection(k));
        return true;
    } catch (e) {
        console.error("Save data loading failed", e);
        return false;
    }
}

// --- 初期化 ---
function initGame() {
    if (loadGame()) {
        updateHud();
        return;
    }

    // 初回プレイ時
    const basicColors = ['#f8f9fa', '#343a40'];
    
    // 最初は半径が狭い。3匹で始める
    targetPondRadius = 180;

    for (let i = 0; i < 3; i++) {
        let baseCol = basicColors[i % 2];
        let genDna = {
            baseColor: baseCol,
            patternColor: baseCol, 
            patternDensity: 0.1 
        };
        // 池の中心付近に配置
        let spawnR = Math.random() * 50;
        let spawnTheta = Math.random() * Math.PI * 2;
        
        let koi = new Koi(
            POND_CX() + Math.cos(spawnTheta) * spawnR,
            POND_CY() + Math.sin(spawnTheta) * spawnR,
            genDna,
            1 
        );
        pond.push(koi);
        checkCollection(koi); // 初期鯉もプラチナ・烏鯉として図鑑登録
    }
    updateHud();
}

// UI更新
function updateHud() {
    // 詰むのを防ぐ無限ループ防止用のフラグを使わずにシンプルに判定
    document.getElementById('koi-count').innerText = `${pond.length} / ${KOI_MAX}`;
    document.getElementById('current-points').innerText = `${playerPoints} 万円`;
    
    // 詰み救済システム評価（ポイントがいくらあっても、池に鯉が2匹未満だと交配できずに詰む）
    if (pond.length < 2) {
        if (pond.length === 0) {
            // リストを空にして初期鯉を追加
            const basicColors = ['#f8f9fa', '#343a40'];
            for (let i = 0; i < 3; i++) {
                let baseCol = basicColors[i % 2];
                let genDna = { baseColor: baseCol, patternColor: baseCol, patternDensity: 0.1 };
                pond.push(new Koi(POND_CX() + (Math.random()-0.5)*10, POND_CY() + (Math.random()-0.5)*10, genDna, 1));
            }
            if (playerPoints < BREED_COST) playerPoints += 300; // 資金もないなら補助
            
            showNotification("池が空になってしまいました…！ご近所さんから稚魚を分けてもらいました。");
            document.getElementById('koi-count').innerText = `${pond.length} / ${KOI_MAX}`;
            document.getElementById('current-points').innerText = `${playerPoints} 万円`;
        } else if (pond.length === 1) {
            const defaultDna = { baseColor: '#f8f9fa', patternColor: '#f8f9fa', patternDensity: 0.2 };
            pond.push(new Koi(POND_CX(), POND_CY(), defaultDna, 1));
            
            if (playerPoints < BREED_COST) playerPoints += 300; // お金がないなら補助
            
            showNotification("寂しそうな池に、川から野良の錦鯉が1匹迷い込んできました！");
            document.getElementById('koi-count').innerText = `${pond.length} / ${KOI_MAX}`;
            document.getElementById('current-points').innerText = `${playerPoints} 万円`;
        }
    }
    
    const parents = pond.filter(k => k.selected);
    
    // アップグレードボタンの制御
    if (KOI_MAX >= 10) {
        btnUpgrade.disabled = true;
        btnUpgrade.innerText = `池拡張 (最大到達)`;
    } else {
        if (playerPoints >= upgradeCost) {
            btnUpgrade.disabled = false;
            btnUpgrade.innerText = `池を拡張する (${upgradeCost} 万円)`;
        } else {
            btnUpgrade.disabled = true;
            btnUpgrade.innerText = `池拡張 (${upgradeCost} 万円)`;
        }
    }

    if (parents.length > 0) {
        btnSell.disabled = false;
        let sellVal = parents.reduce((sum, p) => sum + Math.floor(p.value * 0.4), 0);
        btnSell.innerText = `お別れ (+${sellVal} 万円)`;
    } else {
        btnSell.disabled = true;
        btnSell.innerText = 'お別れする';
    }

    if (parents.length > 0) {
        panelAction.classList.remove('hidden');
        ctxParent1.clearRect(0,0,60,60);
        ctxParent2.clearRect(0,0,60,60);
        
        ctxParent1.save();
        ctxParent1.translate(30, 30);
        ctxParent1.scale(0.6, 0.6);
        parents[0].drawStatic(ctxParent1);
        ctxParent1.restore();

        if (parents.length > 1) {
            slot2.style.visibility = 'visible';
            ctxParent2.save();
            ctxParent2.translate(30, 30);
            ctxParent2.scale(0.6, 0.6);
            parents[1].drawStatic(ctxParent2);
            ctxParent2.restore();
        } else {
            slot2.style.visibility = 'hidden';
        }
    } else {
        panelAction.classList.add('hidden');
    }

    if (parents.length === 2 && playerPoints >= BREED_COST && pond.length < KOI_MAX) {
        btnBreed.disabled = false;
        btnBreed.innerText = `交配する (${BREED_COST} 万円)`;
    } else {
        btnBreed.disabled = true;
        if (pond.length >= KOI_MAX) {
            btnBreed.innerText = '池が満杯です';
        } else if (playerPoints < BREED_COST) {
            btnBreed.innerText = `資金不足 (あと ${BREED_COST - playerPoints} 万円)`;
        } else {
            btnBreed.innerText = `交配する (2匹選択: ${parents.length}/2)`;
        }
    }
    
    // UIが更新されるタイミング（アクション後など）でオートセーブを実行
    saveGame();
}

// メインループ（deltaTimeベース: リフレッシュレートに依存しない）
let lastFrameTime = 0;

function gameLoop(timestamp) {
    // dtを計算（60fpsで dt=1.0 となるよう正規化）
    if (lastFrameTime === 0) lastFrameTime = timestamp;
    let deltaMs = timestamp - lastFrameTime;
    lastFrameTime = timestamp;
    // 極端なスパイクを防止（タブ復帰時など）
    if (deltaMs > 100) deltaMs = 16.67;
    let dt = deltaMs / 16.67; // 60fps基準で正規化

    // 画面全体を暗い石畳・地面に見立てた色で塗る
    ctx.fillStyle = '#0b1115';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // アニメーションで半径を目標値に近づける
    let pondLerp = 1.0 - Math.pow(1.0 - 0.05, dt);
    currentPondRadius += (targetPondRadius - currentPondRadius) * pondLerp;

    const cx = POND_CX();
    const cy = POND_CY();

    if (currentPondRadius > 10) {
        // 池のグラデーションをキャッシュ（半径が変わらない限り再利用）
        let radiusInt = Math.round(currentPondRadius);
        if (!cachedGradient || cachedGradientRadius !== radiusInt || cachedGradientCx !== cx || cachedGradientCy !== cy) {
            cachedGradient = ctx.createRadialGradient(cx, cy, radiusInt * 0.2, cx, cy, radiusInt);
            cachedGradient.addColorStop(0, '#2b5c7a');
            cachedGradient.addColorStop(1, '#153243');
            cachedGradientRadius = radiusInt;
            cachedGradientCx = cx;
            cachedGradientCy = cy;
        }

        // 池の水面を描画
        ctx.beginPath();
        ctx.arc(cx, cy, currentPondRadius, 0, Math.PI * 2);
        ctx.fillStyle = cachedGradient;
        ctx.fill();

        // 鯉の更新・描画（clip()を使わない軽量方式）
        pond.forEach(koi => {
            koi.update(canvas.width, canvas.height, dt);
            koi.draw(ctx);
        });

        // 池のフチを後から上書き描画して、はみ出た鯉を隠す
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, currentPondRadius + 15, 0, Math.PI * 2);
        ctx.arc(cx, cy, currentPondRadius, 0, Math.PI * 2, true); // 内側を反転して穴にする
        ctx.fillStyle = '#0b1115';
        ctx.fill();
        // 池の枠線
        ctx.beginPath();
        ctx.arc(cx, cy, currentPondRadius, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#04080a';
        ctx.stroke();
        ctx.restore();

        // 鯉のテキストラベルを池のフチの上に描画
        pond.forEach(koi => {
            koi.drawLabel(ctx);
        });
    }

    // 観客と浮遊テキストの更新・描画（池の外側）
    visitors.forEach(v => { v.update(dt); v.draw(ctx); });
    for (let i = visitors.length - 1; i >= 0; i--) {
        if (visitors[i].state === 'fadeout' && visitors[i].alpha <= 0) {
            visitors.splice(i, 1);
        }
    }

    floatingTexts.forEach(t => { t.update(dt); t.draw(ctx); });
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        if (floatingTexts[i].timer <= 0) floatingTexts.splice(i, 1);
    }

    // 放置収入（画面フレッシュレートに依存しないよう、実時間で必ず約5秒ごとに判定）
    let now = Date.now();
    if (pond.length > 0) {
        if (now - lastVisitorTime >= 5000) {
            lastVisitorTime = now;
            
            // 収入の計算 (池全体の価値の 1~2%程度 ＋ ランダム固定額 ＋ ランクボーナス)
            let totalValue = pond.reduce((sum, p) => sum + p.value, 0);
            let rankBonus = pond.reduce((sum, p) => {
                if (p.rank === 'S') return sum + 40;
                if (p.rank === 'A') return sum + 15;
                if (p.rank === 'B') return sum + 5;
                return sum;
            }, 0);
            let income = Math.floor(Math.random() * 3 + 2) + Math.floor(totalValue * 0.015) + rankBonus;
            
            playerPoints += income;
            updateHud();

            // 観客の生成
            let angle = Math.random() * Math.PI * 2;
            let visitor = new Visitor(angle);
            visitors.push(visitor);
            
            // 少し遅れてお金が浮かぶ（文字が画面上端で見切れないように調整）
            setTimeout(() => {
                let textY = visitor.y - 30;
                // 画面上部に見学者がいる場合、上に浮かぶと見切れるため下側に表示する
                if (textY < 40) textY = visitor.y + 40;
                
                floatingTexts.push(new FloatingText(`+${income} 万円`, visitor.x, textY, '#ffd700'));
            }, 600);
        }
    } else {
        lastVisitorTime = now;
    }

    requestAnimationFrame(gameLoop);
}

// ゲーム実行
initGame();
requestAnimationFrame(gameLoop);
