# GeoMapSearch - 地質図検索・表示アプリケーション

産総研（国立研究開発法人産業技術総合研究所）地質調査総合センターが公開している地質図を、Webブラウザ上で検索・表示・閲覧するためのWebアプリケーションです。

## 主な機能

### 地質図検索
- 地図に表示されている地域内にある地質図を自動検索
- 産総研のCKANデータベースからメタデータを取得
- 検索結果を11カテゴリに自動分類（地質図幅、火山地質図、水理地質図など）

### 地質図レイヤー表示
- XYZタイル形式の地質図を地図上に重ねて表示
- 複数レイヤーの同時表示
- 各レイヤーの透明度調整（0〜100%）
- レイヤーごとの範囲へズーム

### シームレス地質図
- 20万分の1シームレス地質図の表示
- 表示範囲内の凡例を動的に取得・表示

### 凡例・詳細情報
- 凡例画像の表示・拡大・ダウンロード
- 日本語メタデータ（title_j/authors_j）の優先表示
- 説明書PDFへのリンク

### ホバープレビュー
- 検索結果にマウスオーバーで該当範囲を地図上に表示

## 使用方法

1. ブラウザで `index.html` を開く
2. 地図を目的の地域に移動・ズーム
3. 「🔍 表示範囲で検索」ボタンをクリック
4. 検索結果から地質図をクリックして表示
5. 「表示中の地質図」セクションで透明度調整や凡例表示が可能

## 技術スタック

| 技術 | 用途 | ライセンス |
|------|------|------------|
| [Leaflet.js](https://leafletjs.com/) | インタラクティブ地図 | MIT License |
| [OpenStreetMap](https://www.openstreetmap.org/) | ベースマップ | ODbL |
| [Font Awesome](https://fontawesome.com/) | UIアイコン | SIL OFL / MIT / CC BY 4.0 |

## データソース

| データソース | 説明 |
|--------------|------|
| [産総研 CKAN](https://data.gsj.jp/gkan/) | 地質図メタデータ |
| [シームレス地質図](https://gbank.gsj.jp/seamless/) | 20万分の1日本シームレス地質図V2 |
| [国土地理院タイル](https://maps.gsi.go.jp/development/ichiran.html) | 淡色地図ベースマップ |

## ライセンス・権利関係

### 地質図データ（産総研地質調査総合センター）

本アプリケーションで表示される地質図データは、産総研地質調査総合センターが提供するものです。

- **ライセンス**: 政府標準利用規約（第2.0版）準拠 / CC BY 4.0 互換
- **出典表示**: 「出典：産総研地質調査総合センター」
- **詳細**: [産総研地質調査総合センター 利用規約](https://www.gsj.jp/license/license.html)

編集・加工して利用する場合は、その旨を記載する必要があります。

### 国土地理院タイル

淡色地図ベースマップには国土地理院タイルを使用しています。

- **ライセンス**: 国土地理院コンテンツ利用規約
- **出典表示**: 「国土地理院」または「地理院タイル」
- **詳細**: [国土地理院コンテンツ利用規約](https://www.gsi.go.jp/kikakuchousei/kikakuchousei40182.html)

### OpenStreetMap

デフォルトベースマップにはOpenStreetMapを使用しています。

- **ライセンス**: Open Database License (ODbL)
- **著作権表示**: © OpenStreetMap contributors
- **詳細**: [OpenStreetMap Copyright](https://www.openstreetmap.org/copyright/ja)

### 使用ライブラリ

| ライブラリ | ライセンス |
|------------|------------|
| Leaflet.js | [MIT License](https://github.com/Leaflet/Leaflet/blob/main/LICENSE) |
| Font Awesome Free | フォント: [SIL OFL 1.1](https://scripts.sil.org/OFL), コード: MIT, アイコン: CC BY 4.0 |

## ファイル構成

```
geomapsearch/
├── index.html          # メインHTML
├── app.js              # アプリケーションロジック
├── style.css           # スタイルシート
├── README.md           # このファイル
└── libs/               # 外部ライブラリ
    ├── leaflet/        # Leaflet.js
    └── fontawesome/    # Font Awesome
```

## 動作環境

- モダンブラウザ（Chrome, Firefox, Safari, Edge）
- インターネット接続（外部API・タイルデータへのアクセスに必要）
