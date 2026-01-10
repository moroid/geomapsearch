/**
 * 地図初期化モジュール
 */

import { setMap, getMap, setHoverPreviewLayer, getHoverPreviewLayer } from './state.js';

/**
 * Leaflet地図の初期化
 */
export function initMap() {
    // 日本の中心付近で初期化
    const map = L.map('map', {
        center: [36.0, 138.0],
        zoom: 6,
        zoomControl: true,
        attributionControl: false
    });

    // 帰属表示を追加（Leafletを除外）
    L.control.attribution({
        prefix: false
    }).addTo(map);

    // 地質図オーバーレイ用のカスタムペインを作成（ベースマップより上に表示）
    map.createPane('geologicalOverlay');
    map.getPane('geologicalOverlay').style.zIndex = 450;

    // ベースマップ（OpenStreetMap）- デフォルトで表示
    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    });

    // 地理院タイル（淡色地図）
    const gsiPale = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
        maxZoom: 18
    });

    // デフォルトのベースマップを追加
    osmLayer.addTo(map);

    // レイヤーコントロール
    const baseMaps = {
        'OpenStreetMap': osmLayer,
        '地理院タイル（淡色）': gsiPale
    };

    L.control.layers(baseMaps).addTo(map);

    // スケールバーを追加
    L.control.scale({
        metric: true,
        imperial: false,
        position: 'bottomleft',
        maxWidth: 150
    }).addTo(map);

    // 状態に保存
    setMap(map);
}

/**
 * 地質図の範囲をプレビュー表示
 */
export function showBoundsPreview(bounds) {
    const map = getMap();

    // 既存のプレビューを削除
    hideBoundsPreview();

    // 矩形を作成
    const previewLayer = L.rectangle(
        [
            [bounds.south, bounds.west],
            [bounds.north, bounds.east]
        ],
        {
            color: '#2c5f2d',
            weight: 2,
            opacity: 0.8,
            fillColor: '#2c5f2d',
            fillOpacity: 0.15,
            dashArray: '5, 5'
        }
    );

    previewLayer.addTo(map);
    setHoverPreviewLayer(previewLayer);
}

/**
 * 範囲プレビューを非表示
 */
export function hideBoundsPreview() {
    const map = getMap();
    const hoverPreviewLayer = getHoverPreviewLayer();

    if (hoverPreviewLayer) {
        map.removeLayer(hoverPreviewLayer);
        setHoverPreviewLayer(null);
    }
}
