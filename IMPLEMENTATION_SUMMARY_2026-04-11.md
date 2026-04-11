# 実装履歴まとめ (2026年4月11日)

## 概要

本日は「錦鯉シミュレーション」プロジェクトに対して、餌やり・成長システムの実装とUI改善を行いました：

1. **餌やりシステムの実装** - 餌の購入・投与・成長促進の完全実装
2. **成長システムの実装** - 稚魚→若魚→成魚の3段階成長と視覚的表現
3. **UI/UX改善** - 通知最適化、ボタン配置、餌残数表示の強化
4. **ゲームバランス調整** - 成魚のみ交配可能制限、通知重複防止

## 詳細な実装内容

### 1. 餌やりシステムの完全実装

#### 餌クラス (`FoodPellet`) の実装
```javascript
class FoodPellet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 5;
        this.alpha = 1.0;
        this.lifetime = 450; // 約7.5秒で消滅
        this.sinkSpeed = 0.5; // 沈む速度
        this.hasSettled = false; // 底に沈んだか
    }
    
    update(dt) {
        // 沈むアニメーション
        if (!this.hasSettled) {
            this.y += this.sinkSpeed * dt;
            // 池の底に達したかチェック
            const cy = POND_CY();
            const pondBottom = cy + targetPondRadius * 0.8;
            if (this.y >= pondBottom - this.radius) {
                this.y = pondBottom - this.radius;
                this.hasSettled = true;
            }
        }
        
        // 寿命の減少
        this.lifetime -= dt;
        if (this.lifetime < 60) {
            this.alpha = this.lifetime / 60;
        }
    }
}
```

#### 餌インベントリ管理
- 初期値: `foodInventory = 0`
- 購入価格: `FOOD_PACK_COST = 30` (万円)
- 購入数量: `FOOD_PACK_AMOUNT = 30` (個)
- 購入ボタン: HUD内に「30個 30万円」ボタン配置

### 2. 鯉の餌反応システムの強化

#### 餌探知ロジック
```javascript
// 視界範囲: 200pxに拡大
if (dist < 200 && dist < nearestDist) {
    nearestDist = dist;
    nearestFood = food;
}
```

#### 積極的な追跡行動
```javascript
// 餌への接近度合い（近いほど強く反応）
const foodInterest = Math.min(1.0, (200 - nearestDist) / 200);

// 積極的に餌の方向に向かう（角度調整を強化）
const turnStrength = 0.4 + 0.3 * foodInterest; // 0.4〜0.7の範囲で調整
this.angle += diff * turnStrength * dt;

// 餌に近づくにつれて速度を大幅に上げる（通常の2.5倍まで）
targetSpeed = this.baseSpeed * (1.0 + 1.5 * foodInterest);
```

#### 餌食べ中状態管理
```javascript
// 餌に十分近づいたら食べる
if (nearestDist < 20) {
    this.isFeeding = true;
    this.feedingTimer = 30; // 約0.5秒間食べる
    this.foodTarget = nearestFood;
    
    // 餌を食べた効果（成長進捗を増加）
    this.growthProgress = Math.min(1.0, this.growthProgress + 0.2);
    
    // 餌を削除
    const foodIndex = foodPellets.indexOf(nearestFood);
    if (foodIndex > -1) {
        foodPellets.splice(foodIndex, 1);
    }
}
```

### 3. 成長システムの実装

#### 3段階成長ステージ
```javascript
// 成長ステージプロパティ
this.growthStage = 'adult'; // 'fry' (稚魚), 'juvenile' (若魚), 'adult' (成魚)
this.growthProgress = 1.0; // 0.0-1.0 (成長進捗)
this.targetSize = this.size; // 目標サイズ（最終的なサイズ）
this.displaySize = this.size; // 現在の表示サイズ
```

#### 成長進捗管理
```javascript
updateGrowthStage() {
    const oldStage = this.growthStage;
    
    // 成長進捗に基づいてステージを決定
    if (this.growthProgress < 0.33) {
        this.growthStage = 'fry'; // 稚魚
    } else if (this.growthProgress < 0.67) {
        this.growthStage = 'juvenile'; // 若魚
    } else {
        this.growthStage = 'adult'; // 成魚
    }
    
    // ステージに応じたサイズを計算
    if (this.growthStage === 'fry') {
        this.displaySize = this.targetSize * 0.4; // 稚魚は40%のサイズ
    } else if (this.growthStage === 'juvenile') {
        this.displaySize = this.targetSize * 0.7; // 若魚は70%のサイズ
    } else {
        this.displaySize = this.targetSize; // 成魚は100%のサイズ
    }
}
```

#### 視覚的成長表現
- **サイズ調整**: 稚魚40%、若魚70%、成魚100%
- **模様透明度**: 稚魚30%、若魚70%、成魚100%
- **評価額調整**: 稚魚30%、若魚60%、成魚100%

### 4. UI/UX改善

#### 餌購入ボタンの最適配置
```html
<!-- トップHUD内に配置 -->
<div id="food-display">
    <span class="label">餌の残り</span>
    <span id="food-count" class="value">0 個</span>
    <button id="btn-food" class="sys-btn" title="餌を購入する (30個 30万円)" style="margin-left: 8px; padding: 4px 8px; font-size: 0.8rem;">30個 30万円</button>
</div>
```

#### 餌残数表示の統合
```javascript
function updateHud() {
    document.getElementById('koi-count').innerText = `${pond.length} / ${KOI_MAX}`;
    document.getElementById('current-points').innerText = `${playerPoints} 万円`;
    document.getElementById('food-count').innerText = `${foodInventory} 個`;
}
```

#### 通知システムの最適化
```javascript
// 通知履歴管理（重複・連続通知防止用）
let lastNotificationText = '';
let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN = 1500; // 同じ通知は1.5秒以内に出さない

function showNotification(text) {
    const now = Date.now();
    
    // 同じテキストの通知が最近出た場合はスキップ
    if (text === lastNotificationText && now - lastNotificationTime < NOTIFICATION_COOLDOWN) {
        return;
    }
    
    // 連続通知を減らすためのフィルタリング
    if (text.includes('餌を投げました') || text.includes('餌を購入しました')) {
        // 餌関連の通知は特に制限を厳しく
        if (now - lastNotificationTime < 1000) return;
    }
}
```

#### 浮遊テキスト位置の調整
```javascript
// 売却時の収益テキスト（池の中心からランダムにずらす）
floatingTexts.push(new FloatingText(`+${earned} 万円`, 
    POND_CX() + (Math.random() * 80 - 40), 
    POND_CY() - 30, // 少し上に表示
    '#ffd700'));
```

### 5. ゲームバランス調整

#### 成魚のみ交配可能制限
```javascript
// 下部の「交配する」ボタン
if (parents[0].growthStage === 'adult' && parents[1].growthStage === 'adult') {
    playerPoints -= BREED_COST;
    breedKoi(parents[0], parents[1]);
} else {
    showNotification(`成魚のみ交配できます！選択された鯉は${notAdult.map(p => stageNames[p.growthStage]).join('と')}です`);
}

// 一覧パネルの「交配する」ボタン
btnListBreed.addEventListener('click', () => {
    // 成魚チェック実装
});
```

#### 餌投げ通知の削除
```javascript
// 通知は表示しない（UIの餌残数が減るので十分）
// showNotification(`餌を投げました！ (残り: ${foodInventory}個)`);
updateHud();
```

#### 成長テキストの最適化
```javascript
// 成魚になった場合のみ浮遊テキストで成長を表示（稚魚→若魚は表示しない）
if (this.growthStage === 'adult') {
    floatingTexts.push(new FloatingText(
        `🎉 成魚になりました！`,
        this.x + Math.random() * 40 - 20, // ランダムな位置で重なり防止
        this.y - 40, 
        '#66ff66'
    ));
}
```

## 技術的実装詳細

### 主要な定数値
- **餌購入**: 30個30万円
- **成長進捗**: 餌1個で20%増加（5個で成魚）
- **視界範囲**: 200px
- **速度増加**: 通常の2.5倍まで
- **角度調整**: 0.4〜0.7の強度
- **サイズ調整**: 稚魚40%、若魚70%、成魚100%
- **模様透明度**: 稚魚30%、若魚70%、成魚100%

### 追加されたプロパティ（Koiクラス）
```javascript
// 成長システム用プロパティ
this.growthStage = 'adult'; // 'fry' (稚魚), 'juvenile' (若魚), 'adult' (成魚)
this.growthProgress = 1.0; // 0.0-1.0 (成長進捗)
this.foodTarget = null; // 追いかけている餌への参照
this.foodInterest = 0; // 餌への興味度合い
this.isFeeding = false; // 餌を食べている最中か
this.feedingTimer = 0; // 餌食べ中タイマー
this.targetSize = this.size; // 目標サイズ（最終的なサイズ）
this.displaySize = this.size; // 現在の表示サイズ
```

### 追加されたグローバル変数
```javascript
const foodPellets = []; // 池内の餌の配列
let foodInventory = 0; // 所持している餌の数
const FOOD_PACK_COST = 30; // 餌30個の価格（万円）
const FOOD_PACK_AMOUNT = 30; // 1回の購入で得られる餌の数
```

## 実装の効果

### 1. ゲームプレイの深化
- **戦略的要素**: 餌の効率的な使用と成長管理
- **リアルタイムインタラクション**: 鯉の餌への反応による没入感向上
- **長期育成**: 稚魚から成魚までの成長過程の楽しみ

### 2. 視覚的フィードバック
- **明確な成長表現**: サイズと模様透明度による直感的な理解
- **群がり行動**: 餌に積極的に寄ってくる鯉の動き
- **UIの最適化**: 重要な情報の適切な配置

### 3. バランス調整
- **成魚制限**: 交配の戦略的選択の必要性
- **通知最適化**: 過度な通知による操作妨害の防止
- **経済バランス**: 餌価格と成長速度の適切な設定

## 今後の課題

### 1. 収益システムの拡張
- **餌販売**: 餌を投げることで観客が増え、収入アップ
- **成長展示**: 成魚になった鯉を特別展示して収入増加
- **品種別収益**: 希少品種ほど高い収益を生む

### 2. 追加機能の検討
- **餌の種類**: 成長速度の異なる高級餌
- **特別な餌効果**: 一時的な速度増加や色の鮮やかさ向上
- **成長記録**: 成長過程のタイムラプス表示

### 3. パフォーマンス最適化
- **餌の数制限**: 同時に存在できる餌の最大数
- **効率的な検索**: 空間分割による餌探知の最適化

## まとめ

本日の実装により、錦鯉シミュレーションは以下の点で大幅に進化しました：

1. **ゲームプレイの多様化**: 餌やり・成長システムによる新たな戦略層の追加
2. **視覚的表現の強化**: 成長段階に応じた明確な視覚的フィードバック
3. **UI/UXの最適化**: 通知重複防止、ボタン配置改善による操作性向上
4. **ゲームバランスの調整**: 成魚制限による交配戦略の深化

これらの変更により、プレイヤーはより没入感のある錦鯉育成体験を楽しむことができます。餌を投げて鯉が群がる様子、稚魚が成長していく過程、成魚になったときの達成感など、新しいゲーム体験が実現されました。