/**
 * レイヤー管理モジュール
 */

import { SEAMLESS_TILE_URL } from './config.js';
import {
    getMap,
    getActiveLayers,
    getSeamlessLayer,
    setSeamlessLayer,
    getCurrentLegendLayerId
} from './state.js';
import { showLegend, closeLegendSidebar } from './legend.js';
import { updateMobileLayersList } from './mobile.js';

/**
 * 地質図レイヤーの表示/非表示を切り替え
 */
export async function toggleMapLayer(mapData) {
    const activeLayers = getActiveLayers();

    if (activeLayers.has(mapData.id)) {
        removeLayer(mapData.id);
    } else {
        await addLayer(mapData);
    }

    updateSearchResultsSelection();
}

/**
 * レイヤーを追加
 */
export async function addLayer(mapData) {
    const map = getMap();
    const activeLayers = getActiveLayers();

    try {
        let tileUrl = mapData.tileUrl;
        let bounds = mapData.bounds;
        let minZoom = 2;
        let maxZoom = 18;
        let legendUrl = null;
        let mapName = null;
        let mapDescription = null;
        let mapTitleJ = null;
        let mapAuthorsJ = null;

        // TileJSONから詳細情報を取得
        if (mapData.tileJsonUrl) {
            try {
                const tileJsonResponse = await fetch(mapData.tileJsonUrl);
                if (tileJsonResponse.ok) {
                    const tileJson = await tileJsonResponse.json();

                    if (tileJson.tiles) {
                        const webpUrl = tileJson.tiles.find(t => t.includes('.webp'));
                        const pngUrl = tileJson.tiles.find(t => t.includes('.png'));
                        tileUrl = webpUrl || pngUrl || tileJson.tiles[0];
                    }

                    if (tileJson.bounds) {
                        bounds = {
                            west: tileJson.bounds[0],
                            south: tileJson.bounds[1],
                            east: tileJson.bounds[2],
                            north: tileJson.bounds[3]
                        };
                    }

                    if (tileJson.minzoom !== undefined) minZoom = tileJson.minzoom;
                    if (tileJson.maxzoom !== undefined) maxZoom = tileJson.maxzoom;

                    if (tileJson.legend) legendUrl = tileJson.legend;
                    if (tileJson.name) mapName = tileJson.name;
                    if (tileJson.description) mapDescription = tileJson.description;
                    if (tileJson.title_j) mapTitleJ = tileJson.title_j;
                    if (tileJson.authors_j) mapAuthorsJ = tileJson.authors_j;
                }
            } catch (e) {
                console.warn('TileJSON取得エラー:', e);
            }
        }

        // Linked Dataメタデータからtitle_j, authors_j, geotiffUrlを取得
        let geotiffUrl = mapData.geotiffUrl;
        if (mapData.ldUrl) {
            try {
                const ldResponse = await fetch(mapData.ldUrl);
                if (ldResponse.ok) {
                    const ldData = await ldResponse.json();
                    if (!mapTitleJ && ldData.title_j) mapTitleJ = ldData.title_j;
                    if (!mapAuthorsJ && ldData.authors_j) mapAuthorsJ = ldData.authors_j;
                    if (ldData.downloadData) {
                        const geotiffData = ldData.downloadData.find(d =>
                            d.title === 'GeoTIFF' || d.data_type?.includes('GeoTiff')
                        );
                        if (geotiffData && geotiffData['@id']) {
                            geotiffUrl = geotiffData['@id'];
                        }
                    }
                }
            } catch (e) {
                console.warn('LDメタデータ取得エラー:', e);
            }
        }

        if (!tileUrl) {
            console.error('タイルURLが見つかりません');
            return;
        }

        const layer = L.tileLayer(tileUrl, {
            minZoom: minZoom,
            maxZoom: 18,
            maxNativeZoom: maxZoom,
            opacity: 0.7,
            bounds: bounds ? L.latLngBounds(
                [bounds.south, bounds.west],
                [bounds.north, bounds.east]
            ) : undefined,
            attribution: '<a href="https://gbank.gsj.jp/geonavi/">産総研 地質図Navi</a>',
            pane: 'geologicalOverlay'
        });

        layer.addTo(map);

        activeLayers.set(mapData.id, {
            layer: layer,
            data: {
                ...mapData,
                bounds,
                minZoom,
                maxZoom,
                legendUrl,
                mapName,
                mapDescription,
                mapTitleJ,
                mapAuthorsJ,
                geotiffUrl
            }
        });

        updateActiveLayersList();

    } catch (error) {
        console.error('レイヤー追加エラー:', error);
    }
}

/**
 * レイヤーを削除
 */
export function removeLayer(layerId) {
    const map = getMap();
    const activeLayers = getActiveLayers();

    const layerInfo = activeLayers.get(layerId);
    if (layerInfo) {
        map.removeLayer(layerInfo.layer);
        activeLayers.delete(layerId);
        updateActiveLayersList();
    }
}

/**
 * 表示中レイヤーリストを更新
 */
export function updateActiveLayersList() {
    const map = getMap();
    const activeLayers = getActiveLayers();
    const container = document.getElementById('activeLayers');
    const countSpan = document.getElementById('layerCount');

    countSpan.textContent = `(${activeLayers.size}枚)`;

    if (activeLayers.size === 0) {
        container.innerHTML = '<p class="placeholder-text">地質図が選択されていません。</p>';
        return;
    }

    container.innerHTML = '';

    activeLayers.forEach((layerInfo, layerId) => {
        const item = document.createElement('div');
        item.className = 'layer-item';

        const shortTitle = layerInfo.data.title.length > 40
            ? layerInfo.data.title.substring(0, 40) + '...'
            : layerInfo.data.title;

        item.innerHTML = `
            <div class="layer-item-header">
                <span class="layer-item-title">${shortTitle}</span>
                <div class="layer-item-controls">
                    <button class="layer-btn legend-btn" title="凡例を表示">📋</button>
                    <button class="layer-btn zoom-btn" title="この地質図にズーム">📍</button>
                    <button class="layer-btn remove-btn" title="削除">✕</button>
                </div>
            </div>
            <div class="layer-item-opacity">
                <span>透明度:</span>
                <input type="range" min="0" max="100" value="70" />
                <span class="opacity-value">70%</span>
            </div>
        `;

        // 凡例ボタン
        item.querySelector('.legend-btn').addEventListener('click', () => {
            showLegend(layerId, layerInfo.data);
        });

        // ズームボタン
        item.querySelector('.zoom-btn').addEventListener('click', () => {
            const bounds = layerInfo.data.bounds;
            if (bounds) {
                map.fitBounds([
                    [bounds.south, bounds.west],
                    [bounds.north, bounds.east]
                ]);
            }
        });

        // 削除ボタン
        item.querySelector('.remove-btn').addEventListener('click', () => {
            removeLayer(layerId);
            updateSearchResultsSelection();
        });

        // 透明度スライダー
        const slider = item.querySelector('input[type="range"]');
        const valueSpan = item.querySelector('.opacity-value');
        slider.value = layerInfo.layer.options.opacity * 100;
        valueSpan.textContent = `${Math.round(slider.value)}%`;

        slider.addEventListener('input', (e) => {
            const opacity = e.target.value / 100;
            layerInfo.layer.setOpacity(opacity);
            valueSpan.textContent = `${e.target.value}%`;
        });

        container.appendChild(item);
    });

    // モバイル用も更新
    updateMobileActiveLayersList();
}

/**
 * モバイル用表示中レイヤーリストを更新
 */
function updateMobileActiveLayersList() {
    const map = getMap();
    const activeLayers = getActiveLayers();

    if (activeLayers.size === 0) {
        updateMobileLayersList('<p class="placeholder-text">地質図が選択されていません。</p>', 0);
        return;
    }

    let html = '';

    activeLayers.forEach((layerInfo, layerId) => {
        const shortTitle = layerInfo.data.title.length > 40
            ? layerInfo.data.title.substring(0, 40) + '...'
            : layerInfo.data.title;

        html += `
            <div class="layer-item">
                <div class="layer-item-header">
                    <span class="layer-item-title">${shortTitle}</span>
                    <div class="layer-item-controls">
                        <button class="layer-btn legend-btn" title="凡例を表示" onclick="window.showMobileLegend('${layerId}')">📋</button>
                        <button class="layer-btn zoom-btn" title="ズーム" onclick="window.zoomToMobileLayer('${layerId}')">📍</button>
                        <button class="layer-btn remove-btn" title="削除" onclick="window.removeMobileLayer('${layerId}')">✕</button>
                    </div>
                </div>
                <div class="layer-item-opacity">
                    <span>透明度:</span>
                    <input type="range" min="0" max="100" value="${Math.round(layerInfo.layer.options.opacity * 100)}"
                           oninput="window.setMobileLayerOpacity('${layerId}', this.value)" />
                    <span class="opacity-value">${Math.round(layerInfo.layer.options.opacity * 100)}%</span>
                </div>
            </div>
        `;
    });

    updateMobileLayersList(html, activeLayers.size);
}

// モバイル用グローバル関数
window.showMobileLegend = function(layerId) {
    const activeLayers = getActiveLayers();
    const layerInfo = activeLayers.get(layerId);
    if (layerInfo) {
        showLegend(layerId, layerInfo.data);
    }
};

window.zoomToMobileLayer = function(layerId) {
    const map = getMap();
    const activeLayers = getActiveLayers();
    const layerInfo = activeLayers.get(layerId);
    if (layerInfo && layerInfo.data.bounds) {
        const bounds = layerInfo.data.bounds;
        map.fitBounds([
            [bounds.south, bounds.west],
            [bounds.north, bounds.east]
        ]);
    }
};

window.removeMobileLayer = function(layerId) {
    removeLayer(layerId);
    updateSearchResultsSelection();
};

window.setMobileLayerOpacity = function(layerId, value) {
    const activeLayers = getActiveLayers();
    const layerInfo = activeLayers.get(layerId);
    if (layerInfo) {
        layerInfo.layer.setOpacity(value / 100);
    }
}

/**
 * 検索結果の選択状態を更新
 */
export function updateSearchResultsSelection() {
    const activeLayers = getActiveLayers();

    const items = document.querySelectorAll('.result-item');
    items.forEach(item => {
        const resultId = item.dataset.resultId;
        if (resultId && activeLayers.has(resultId)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });

    updateAccordionBadges();
}

/**
 * アコーディオンヘッダーの選択数バッジを更新
 */
export function updateAccordionBadges() {
    const accordions = document.querySelectorAll('.result-accordion');
    accordions.forEach(accordion => {
        const content = accordion.querySelector('.result-accordion-content');
        const header = accordion.querySelector('.result-accordion-header');
        if (!content || !header) return;

        const items = content.querySelectorAll('.result-item');
        let selectedCount = 0;
        items.forEach(item => {
            if (item.classList.contains('selected')) {
                selectedCount++;
            }
        });

        const existingBadge = header.querySelector('.accordion-selected-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        if (selectedCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'accordion-selected-badge';
            badge.textContent = `${selectedCount}選択中`;
            header.appendChild(badge);
        }
    });
}

/**
 * シームレス地質図の表示/非表示を切り替え
 */
export function toggleSeamlessLayer(e) {
    const map = getMap();
    const seamlessControls = document.getElementById('seamlessControls');
    const currentLegendLayerId = getCurrentLegendLayerId();

    if (e.target.checked) {
        const seamlessLayer = L.tileLayer(SEAMLESS_TILE_URL, {
            minZoom: 0,
            maxZoom: 18,
            maxNativeZoom: 13,
            opacity: 0.7,
            attribution: '<a href="https://gbank.gsj.jp/seamless/">20万分の1日本シームレス地質図</a>',
            pane: 'geologicalOverlay'
        });
        seamlessLayer.addTo(map);
        setSeamlessLayer(seamlessLayer);
        seamlessControls.style.display = 'block';
    } else {
        const seamlessLayer = getSeamlessLayer();
        if (seamlessLayer) {
            map.removeLayer(seamlessLayer);
            setSeamlessLayer(null);
        }
        seamlessControls.style.display = 'none';
        if (currentLegendLayerId === 'seamless') {
            closeLegendSidebar();
        }
    }
}

/**
 * シームレス地質図の透明度を更新
 */
export function updateSeamlessOpacity(e) {
    const opacity = e.target.value / 100;
    document.getElementById('seamlessOpacityValue').textContent = e.target.value;

    const seamlessLayer = getSeamlessLayer();
    if (seamlessLayer) {
        seamlessLayer.setOpacity(opacity);
    }
}
