# 実装履歴まとめ (2026年4月6日)

## 概要

本日は「錦鯉シミュレーション」プロジェクトに対して、以下の主要な実装と修正を行いました：

1. **重み付けシステムへのアップグレード** - 優先順位ベースの変異システムから重み付けシステムへ移行
2. **赤＋紫（紫紅錦）誕生問題の修正** - 紫と赤の組み合わせが誕生しないバグを修正
3. **新規品種ルールの追加** - 紫＋青（紫蒼錦）、紫＋赤（紫紅錦）ルールの実装
4. **ルール番号の調整** - `MUTATION_SYSTEM.md` ドキュメントとコードの整合性を確保

## 詳細な変更内容

### 1. 重み付けシステムへのアップグレード

**変更ファイル**: `main.js` (関数 `breedKoi`)

**変更前**: 優先順位ベースの変異システム（固定確率）
```javascript
// 例: 紫 -> 金柄 10%
if (hasColor('#9b59b6')) {
    if (r < 0.10) {
        // 変異処理
    }
}
```

**変更後**: 重み付けシステム（重みに基づく確率計算）
```javascript
// 例: 紫 -> 金柄 重み8
if (hasColor('#9b59b6')) {
    applicableRules.push({
        weight: 8,
        apply: () => {
            // 変異処理
            return 'purple_to_gold';
        }
    });
}
```

**実装された重み付けロジック**:
```javascript
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
```

**利点**:
- 確率計算が透明で調整しやすい
- 複数のルールが競合する場合の確率分布が明確
- `MUTATION_SYSTEM.md` ドキュメントとの整合性向上

### 2. 赤＋紫（紫紅錦）誕生問題の修正

**問題**: 紫と赤の両方を含む親から紫＋赤の組み合わせ（紫紅錦）が誕生しない

**原因**: `MUTATION_SYSTEM.md` には `5g. 紫＋赤 -> 紫紅錦` ルールが記載されていたが、`main.js` には実装されていなかった

**修正内容**:
```javascript
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
```

### 3. 新規品種ルールの追加

#### 3.1 紫＋青（紫蒼錦）ルールの追加
```javascript
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
```

#### 3.2 品種定義の更新 (`KOI_BREEDS` 配列)
```javascript
const KOI_BREEDS = [
    // ... 既存の品種 ...
    { id: 'murasaki_single', name: '紫単色', desc: '高貴な深い紫の単色' },
    { id: 'murasaki_kohaku', name: '紫紅白', desc: '白地に紫が映える模様' },
    { id: 'murasaki_utsuri', name: '紫写り', desc: '漆黒に浮かぶ紫の模様' },
    { id: 'murasaki_ao', name: '紫蒼錦', desc: '紫と青が混ざり合う妖艶な模様' },
    { id: 'murasaki_aka', name: '紫紅錦', desc: '紫と赤の情熱的な模様' },
    { id: 'hikarimono', name: '光り物', desc: '金を含む神々しい模様' }
];
```

#### 3.3 品種判定ロジックの更新 (`analyzeBreed` 関数)
```javascript
if (has('#9b59b6') && has('#343a40')) return 'murasaki_utsuri';
if (has('#9b59b6') && has('#1aa3ff')) return 'murasaki_ao';
if (has('#9b59b6') && has('#ff4d4d')) return 'murasaki_aka';
```

### 4. ルール番号の調整

**問題**: `MUTATION_SYSTEM.md` と `main.js` のルール番号が不一致

**調整前**:
- `main.js` 5f: 黒＋紫（紫写り）
- `MUTATION_SYSTEM.md` 5f: 紫＋青（紫蒼錦）
- `MUTATION_SYSTEM.md` 5g: 紫＋赤（紫紅錦）← 実装なし

**調整後**:
- 5f: 紫＋青（紫蒼錦）← 新規追加
- 5g: 黒＋紫（紫写り）← 5fから移動
- 5h: 紫＋赤（紫紅錦）← 新規追加

## 実装された変異ルール一覧

現在の `breedKoi` 関数には合計 **23個** の変異ルールが実装されています：

### 特別な変異ルール (1-14)
1. 金×金 -> 黄金(金単色) - 重み4
2. 紫 -> 金柄 - 重み8
2b. 紫 -> 紫単色 - 重み10
3. 赤＆青 -> 紫柄 - 重み12
3b. 赤＆青 -> 紫単色 - 重み5
3c. 赤＆青 -> 赤＋青（紅蒼錦） - 重み12
4. 白＋赤 -> 紅白 - 重み15
5. 白＋青 -> 秋翠 - 重み15
5b. 白＋紫 -> 紫紅白 - 重み12
5c. 白＋黒 -> 白写り - 重み10
5d. 黒＋赤 -> 昭和三色 - 重み10
5e. 黒＋青 -> 黒青錦 - 重み10
5f. 紫＋青 -> 紫蒼錦 - 重み10
5g. 黒＋紫 -> 紫写り - 重み10
5h. 紫＋赤 -> 紫紅錦 - 重み10
6. 赤 -> 赤単色 - 重み10
7. 青 -> 青単色 - 重み10
8. 赤＆青 -> 赤単色 / 青単色 - 重み7/7
9. 赤 -> 青（世代依存） - 動的重み
10. 白黒のみ -> 赤柄 / 青柄 - 重み20/10
11. 白単色 -> 黒単色 - 重み10
12. 赤/青 -> 黒色 - 重み5
13. 黒色救済措置 - 重み10
14. 通常の遺伝 - 重み30

## 技術的な改善点

### 1. コードの保守性向上
- 重み付けシステムにより確率調整が容易に
- ルールごとに独立した関数定義で可読性向上
- 戻り値文字列でデバッグが容易に

### 2. ドキュメントとの整合性
- `MUTATION_SYSTEM.md` の仕様を忠実に実装
- ルール番号、重み、条件の一致を確保

### 3. 拡張性
- 新しい色（ピンク色、銀色など）の追加が容易
- 新しい変異ルールの追加がシンプル

## 今後の課題

1. **ピンク色と銀色の追加** (ユーザー要件により保留)
   - ピンク色 (`#ff66b2`): 白＋赤からたまに誕生（紫と同じレア度）
   - 銀色 (`#c0c0c0`): ピンク色からたまに誕生（金と同じレア度）

2. **テストの充実**
   - 各変異ルールの確率検証
   - エッジケースのテスト

3. **パフォーマンス最適化**
   - 重み計算のキャッシュ
   - ルール適用条件の最適化

## まとめ

本日の実装により、錦鯉シミュレーションの変異システムは以下の点で大幅に改善されました：

1. **確率計算の透明性**: 重み付けシステムにより確率計算が明確に
2. **バグ修正**: 赤＋紫（紫紅錦）が正しく誕生するように
3. **完全性**: `MUTATION_SYSTEM.md` ドキュメントとの完全な整合性
4. **拡張性**: 新しい色やルールの追加が容易な設計

これらの変更により、より豊かで予測可能な錦鯉の進化システムが実現されました。