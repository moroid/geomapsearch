/**
 * 地図初期化モジュール（MapLibre GL JS 5）
 */

import { setMap, getMap, setHoverPreviewLayer, getHoverPreviewLayer } from './state.js';
import { OPENTOPOMAP_URL, USGS_IMAGERY_URL, USGS_TOPO_URL } from './config.js';

// 現在のベースマップID
let currentBaseMapId = 'osm';

// ベースマップの定義
const BASE_MAPS = {
    osm: {
        name: 'OpenStreetMap',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxzoom: 19
    },
    gsi_pale: {
        name: '地理院タイル（淡色）',
        tiles: ['https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png'],
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
        maxzoom: 18
    },
    opentopomap: {
        name: 'OpenTopoMap（地形図）',
        tiles: [OPENTOPOMAP_URL.replace('{s}', 'a')],
        attribution: '© <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
        maxzoom: 17
    },
    usgs_imagery: {
        name: 'USGS 衛星画像',
        tiles: [USGS_IMAGERY_URL],
        attribution: '<a href="https://www.usgs.gov/">USGS</a>',
        maxzoom: 16
    },
    usgs_topo: {
        name: 'USGS 地形図',
        tiles: [USGS_TOPO_URL],
        attribution: '<a href="https://www.usgs.gov/">USGS</a>',
        maxzoom: 16
    }
};

/**
 * MapLibre GL JS地図の初期化
 */
export function initMap() {
    // 日本の中心付近で初期化
    const map = new maplibregl.Map({
        container: 'map',
        style: {
            version: 8,
            sources: {
                'basemap': {
                    type: 'raster',
                    tiles: BASE_MAPS.osm.tiles,
                    tileSize: 256,
                    attribution: BASE_MAPS.osm.attribution,
                    maxzoom: BASE_MAPS.osm.maxzoom
                }
            },
            layers: [
                {
                    id: 'basemap-layer',
                    type: 'raster',
                    source: 'basemap'
                }
            ]
        },
        center: [138.0, 36.0],
        zoom: 5,
        attributionControl: true,
        doubleClickZoom: false
    });

    // 地図読み込み完了時の処理
    map.on('load', () => {
        // スケールバーを追加
        map.addControl(new maplibregl.ScaleControl({
            maxWidth: 150,
            unit: 'metric'
        }), 'bottom-left');

        // ナビゲーションコントロールを追加
        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        // レイヤーコントロールを追加（カスタム）
        addLayerControl(map);

        // プレビュー用のソースとレイヤーを準備
        map.addSource('bounds-preview', {
            type: 'geojson',
            data: {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[]]
                }
            }
        });

        map.addLayer({
            id: 'bounds-preview-fill',
            type: 'fill',
            source: 'bounds-preview',
            paint: {
                'fill-color': '#2c5f2d',
                'fill-opacity': 0.15
            }
        });

        map.addLayer({
            id: 'bounds-preview-line',
            type: 'line',
            source: 'bounds-preview',
            paint: {
                'line-color': '#2c5f2d',
                'line-width': 2,
                'line-opacity': 0.8,
                'line-dasharray': [5, 5]
            }
        });
    });

    // 状態に保存
    setMap(map);
}

/**
 * カスタムレイヤーコントロールを追加
 */
function addLayerControl(map) {
    const container = document.createElement('div');
    container.className = 'maplibregl-ctrl maplibregl-ctrl-group basemap-control';

    const button = document.createElement('button');
    button.className = 'basemap-control-button';
    button.type = 'button';
    button.title = 'ベースマップを変更';
    button.innerHTML = '<i class="fas fa-layer-group"></i>';

    const dropdown = document.createElement('div');
    dropdown.className = 'basemap-dropdown';
    dropdown.style.display = 'none';

    // ベースマップ選択肢を追加
    for (const [id, config] of Object.entries(BASE_MAPS)) {
        const option = document.createElement('div');
        option.className = 'basemap-option' + (id === currentBaseMapId ? ' active' : '');
        option.dataset.baseMapId = id;
        option.textContent = config.name;
        option.addEventListener('click', () => {
            switchBaseMap(map, id);
            dropdown.querySelectorAll('.basemap-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            dropdown.style.display = 'none';
        });
        dropdown.appendChild(option);
    }

    button.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    });

    // クリック外で閉じる
    document.addEventListener('click', () => {
        dropdown.style.display = 'none';
    });

    container.appendChild(button);
    container.appendChild(dropdown);
    map.getContainer().appendChild(container);
}

/**
 * ベースマップを切り替え
 */
function switchBaseMap(map, baseMapId) {
    const config = BASE_MAPS[baseMapId];
    if (!config) return;

    currentBaseMapId = baseMapId;

    // ソースのタイルURLを更新
    const source = map.getSource('basemap');
    if (source) {
        // MapLibre v5ではsetTilesメソッドを使用
        source.setTiles(config.tiles);
    }
}

/**
 * 地質図の範囲をプレビュー表示
 */
export function showBoundsPreview(bounds) {
    const map = getMap();
    if (!map || !map.getSource('bounds-preview')) return;

    // 矩形のGeoJSONを作成
    const geojson = {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [[
                [bounds.west, bounds.south],
                [bounds.east, bounds.south],
                [bounds.east, bounds.north],
                [bounds.west, bounds.north],
                [bounds.west, bounds.south]
            ]]
        }
    };

    map.getSource('bounds-preview').setData(geojson);
    setHoverPreviewLayer(true);
}

/**
 * 範囲プレビューを非表示
 */
export function hideBoundsPreview() {
    const map = getMap();
    if (!map || !map.getSource('bounds-preview')) return;

    // 空のGeoJSONで非表示に
    map.getSource('bounds-preview').setData({
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [[]]
        }
    });

    setHoverPreviewLayer(null);
}

/**
 * ベースマップ情報を取得（外部からアクセス用）
 */
export function getBaseMaps() {
    return BASE_MAPS;
}

/**
 * 現在のベースマップIDを取得
 */
export function getCurrentBaseMapId() {
    return currentBaseMapId;
}
