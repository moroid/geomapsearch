/**
 * モバイルUI管理モジュール（MapLibre GL JS 5）
 *
 * スマートフォン向けのUI操作を管理する
 */

import {
    getMap,
    getLocationMarker,
    getLocationCircle,
    setLocationMarker,
    setLocationCircle
} from './state.js';
import { toggleSeamlessLayer, updateSeamlessOpacity, toggleMacrostratLayer, updateMacrostratOpacity } from './layers.js';
import { showSeamlessLegend } from './legend.js';

// モバイル判定の閾値
const MOBILE_BREAKPOINT = 768;

// 現在アクティブなパネル
let activePanel = 'search';

// ボトムシートの状態
let bottomSheetMinimized = false;

/**
 * モバイルかどうかを判定
 */
export function isMobile() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
}

/**
 * モバイルUIの初期化
 */
export function initMobileUI() {
    initMobileSearchButton();
    initMobileNavigation();
    initMobileSeamlessControls();
    initMobileMacrostratControls();
    initMobileLocationButton();

    // ウィンドウリサイズ時の処理
    window.addEventListener('resize', handleResize);

    // モバイルの場合は地図のサイズ調整
    if (isMobile()) {
        setTimeout(() => {
            const map = getMap();
            if (map) {
                map.resize();
            }
        }, 100);
    }
}

/**
 * リサイズ時の処理
 */
function handleResize() {
    const map = getMap();
    if (map) {
        map.resize();
    }
}

/**
 * モバイルナビゲーションの初期化
 */
function initMobileNavigation() {
    const navItems = document.querySelectorAll('.mobile-nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const panel = item.dataset.panel;
            switchPanel(panel);

            // ナビアイテムのアクティブ状態を更新
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // ボトムシートを表示
            showBottomSheet();
        });
    });
}

/**
 * パネルの切り替え
 */
function switchPanel(panelName) {
    activePanel = panelName;

    // 全パネルを非表示
    const panels = document.querySelectorAll('.mobile-panel');
    panels.forEach(panel => panel.classList.remove('active'));

    // 選択されたパネルを表示
    const targetPanel = document.getElementById(`mobile${capitalizeFirst(panelName)}Panel`);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }
}

/**
 * 先頭文字を大文字に
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * モバイル検索ボタンの初期化
 */
function initMobileSearchButton() {
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');
    if (mobileSearchBtn) {
        mobileSearchBtn.addEventListener('click', () => {
            // window経由で呼び出し（循環参照を回避）
            if (window.searchGeologicalMaps) {
                window.searchGeologicalMaps();
            }
            // 検索後にボトムシートを表示して検索パネルを表示
            switchPanel('search');
            showBottomSheet();

            // ナビのアクティブ状態を更新
            const navItems = document.querySelectorAll('.mobile-nav-item');
            navItems.forEach(item => {
                item.classList.toggle('active', item.dataset.panel === 'search');
            });
        });
    }
}

/**
 * ボトムシートを表示
 */
function showBottomSheet() {
    const bottomSheet = document.getElementById('mobileBottomSheet');
    if (bottomSheet) {
        bottomSheet.classList.remove('minimized');
        bottomSheetMinimized = false;
    }
}

/**
 * ボトムシートを最小化（未使用だが将来用に残す）
 */
function minimizeBottomSheet() {
    const bottomSheet = document.getElementById('mobileBottomSheet');
    if (bottomSheet) {
        bottomSheet.classList.add('minimized');
        bottomSheetMinimized = true;
    }
}

/**
 * モバイルシームレスコントロールの初期化
 */
function initMobileSeamlessControls() {
    const mobileSeamlessToggle = document.getElementById('mobileSeamlessToggle');
    const mobileSeamlessOpacity = document.getElementById('mobileSeamlessOpacity');
    const mobileSeamlessLegendBtn = document.getElementById('mobileSeamlessLegendBtn');
    const mobileSeamlessControls = document.getElementById('mobileSeamlessControls');
    const mobileSeamlessOpacityValue = document.getElementById('mobileSeamlessOpacityValue');

    // デスクトップ版のコントロールと同期
    const desktopSeamlessToggle = document.getElementById('seamlessToggle');
    const desktopSeamlessOpacity = document.getElementById('seamlessOpacity');

    if (mobileSeamlessToggle) {
        mobileSeamlessToggle.addEventListener('change', (e) => {
            // デスクトップ版と同期
            if (desktopSeamlessToggle) {
                desktopSeamlessToggle.checked = e.target.checked;
            }
            toggleSeamlessLayer(e);

            // コントロール表示切り替え
            if (mobileSeamlessControls) {
                mobileSeamlessControls.style.display = e.target.checked ? 'block' : 'none';
            }
        });
    }

    if (mobileSeamlessOpacity) {
        mobileSeamlessOpacity.addEventListener('input', (e) => {
            // デスクトップ版と同期
            if (desktopSeamlessOpacity) {
                desktopSeamlessOpacity.value = e.target.value;
            }
            if (mobileSeamlessOpacityValue) {
                mobileSeamlessOpacityValue.textContent = e.target.value;
            }
            updateSeamlessOpacity(e);
        });
    }

    if (mobileSeamlessLegendBtn) {
        mobileSeamlessLegendBtn.addEventListener('click', showSeamlessLegend);
    }
}

/**
 * モバイルMacrostratコントロールの初期化
 */
function initMobileMacrostratControls() {
    const mobileMacrostratToggle = document.getElementById('mobileMacrostratToggle');
    const mobileMacrostratOpacity = document.getElementById('mobileMacrostratOpacity');
    const mobileMacrostratControls = document.getElementById('mobileMacrostratControls');
    const mobileMacrostratOpacityValue = document.getElementById('mobileMacrostratOpacityValue');

    // デスクトップ版のコントロールと同期
    const desktopMacrostratToggle = document.getElementById('macrostratToggle');
    const desktopMacrostratOpacity = document.getElementById('macrostratOpacity');

    if (mobileMacrostratToggle) {
        mobileMacrostratToggle.addEventListener('change', (e) => {
            // デスクトップ版と同期
            if (desktopMacrostratToggle) {
                desktopMacrostratToggle.checked = e.target.checked;
            }
            toggleMacrostratLayer(e);

            // コントロール表示切り替え
            if (mobileMacrostratControls) {
                mobileMacrostratControls.style.display = e.target.checked ? 'block' : 'none';
            }
        });
    }

    if (mobileMacrostratOpacity) {
        mobileMacrostratOpacity.addEventListener('input', (e) => {
            // デスクトップ版と同期
            if (desktopMacrostratOpacity) {
                desktopMacrostratOpacity.value = e.target.value;
            }
            if (mobileMacrostratOpacityValue) {
                mobileMacrostratOpacityValue.textContent = e.target.value;
            }
            updateMacrostratOpacity(e);
        });
    }

}

/**
 * モバイル用検索結果を更新
 */
export function updateMobileSearchResults(html, count) {
    const mobileSearchResults = document.getElementById('mobileSearchResults');
    const mobileResultCount = document.getElementById('mobileResultCount');

    if (mobileSearchResults) {
        mobileSearchResults.innerHTML = html;
    }
    if (mobileResultCount) {
        mobileResultCount.textContent = `(${count}件)`;
    }
}

/**
 * モバイル用レイヤーリストを更新
 */
export function updateMobileLayersList(html, count) {
    const mobileActiveLayers = document.getElementById('mobileActiveLayers');
    const mobileLayerCount = document.getElementById('mobileLayerCount');

    if (mobileActiveLayers) {
        mobileActiveLayers.innerHTML = html;
    }
    if (mobileLayerCount) {
        mobileLayerCount.textContent = `(${count}枚)`;
    }
}

/**
 * モバイル用凡例コンテンツを更新
 */
export function updateMobileLegendContent(html) {
    const mobileLegendContent = document.getElementById('mobileLegendContent');
    if (mobileLegendContent) {
        mobileLegendContent.innerHTML = html;
    }
}

/**
 * モバイル現在地ボタンの初期化
 */
function initMobileLocationButton() {
    const locationBtn = document.getElementById('mobileLocationBtn');
    if (!locationBtn) return;

    locationBtn.addEventListener('click', () => {
        locateUser();
    });
}

/**
 * 現在地を取得して表示
 */
function locateUser() {
    const locationBtn = document.getElementById('mobileLocationBtn');
    const map = getMap();

    if (!map) return;

    // Geolocation APIがサポートされているか確認
    if (!navigator.geolocation) {
        showLocationError('この端末では位置情報を取得できません');
        return;
    }

    // ローディング状態にする
    setLocationButtonState('loading');

    // 現在地を取得
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude, accuracy } = position.coords;
            showUserLocation(latitude, longitude, accuracy);
            setLocationButtonState('active');
        },
        (error) => {
            let message = '位置情報を取得できませんでした';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message = '位置情報の使用が許可されていません';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = '位置情報を取得できませんでした';
                    break;
                case error.TIMEOUT:
                    message = '位置情報の取得がタイムアウトしました';
                    break;
            }
            showLocationError(message);
            setLocationButtonState('error');

            // 3秒後にエラー状態をリセット
            setTimeout(() => {
                setLocationButtonState('default');
            }, 3000);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

/**
 * 現在地を地図上に表示
 */
function showUserLocation(lat, lng, accuracy) {
    const map = getMap();

    // 既存のマーカーと円を削除
    clearLocationMarkers();

    // 精度範囲の円を追加（GeoJSONソースとレイヤー）
    const circleSourceId = 'location-accuracy-source';
    const circleFillLayerId = 'location-accuracy-fill';
    const circleLineLayerId = 'location-accuracy-line';

    // 円を近似するポリゴンを作成
    const circleGeoJSON = createCircleGeoJSON(lng, lat, accuracy);

    map.addSource(circleSourceId, {
        type: 'geojson',
        data: circleGeoJSON
    });

    map.addLayer({
        id: circleFillLayerId,
        type: 'fill',
        source: circleSourceId,
        paint: {
            'fill-color': '#2c5f2d',
            'fill-opacity': 0.15
        }
    });

    map.addLayer({
        id: circleLineLayerId,
        type: 'line',
        source: circleSourceId,
        paint: {
            'line-color': '#2c5f2d',
            'line-width': 2
        }
    });

    setLocationCircle({ sourceId: circleSourceId, fillLayerId: circleFillLayerId, lineLayerId: circleLineLayerId });

    // 現在地マーカーを追加（カスタムDOM要素）
    const markerEl = document.createElement('div');
    markerEl.className = 'location-marker';
    markerEl.innerHTML = '<div class="location-marker-dot"></div><div class="location-marker-pulse"></div>';

    const marker = new maplibregl.Marker({ element: markerEl })
        .setLngLat([lng, lat])
        .addTo(map);

    setLocationMarker(marker);

    // 地図を現在地に移動
    map.flyTo({
        center: [lng, lat],
        zoom: 14
    });
}

/**
 * 円を近似するGeoJSONポリゴンを作成
 */
function createCircleGeoJSON(lng, lat, radiusMeters) {
    const points = 64;
    const coordinates = [];

    // 緯度1度あたりのメートル数（約111km）
    const latPerMeter = 1 / 111320;
    // 経度1度あたりのメートル数（緯度によって変わる）
    const lngPerMeter = 1 / (111320 * Math.cos(lat * Math.PI / 180));

    for (let i = 0; i <= points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const dx = radiusMeters * Math.cos(angle) * lngPerMeter;
        const dy = radiusMeters * Math.sin(angle) * latPerMeter;
        coordinates.push([lng + dx, lat + dy]);
    }

    return {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [coordinates]
        }
    };
}

/**
 * 現在地マーカーをクリア
 */
function clearLocationMarkers() {
    const map = getMap();
    const marker = getLocationMarker();
    const circle = getLocationCircle();

    if (marker) {
        marker.remove();
        setLocationMarker(null);
    }

    if (circle) {
        // MapLibreのレイヤーとソースを削除
        if (map.getLayer(circle.fillLayerId)) {
            map.removeLayer(circle.fillLayerId);
        }
        if (map.getLayer(circle.lineLayerId)) {
            map.removeLayer(circle.lineLayerId);
        }
        if (map.getSource(circle.sourceId)) {
            map.removeSource(circle.sourceId);
        }
        setLocationCircle(null);
    }
}

/**
 * 現在地ボタンの状態を設定
 */
function setLocationButtonState(state) {
    const btn = document.getElementById('mobileLocationBtn');
    if (!btn) return;

    btn.classList.remove('loading', 'active', 'error');
    if (state !== 'default') {
        btn.classList.add(state);
    }
}

/**
 * 位置情報エラーを表示
 */
function showLocationError(message) {
    // 簡易的なアラート表示
    alert(message);
}
