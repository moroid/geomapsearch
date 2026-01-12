/**
 * 検索機能モジュール
 */

import { CKAN_API_BASE } from './config.js';
import { getMap, getActiveLayers, setSearchResults } from './state.js';
import { boundsIntersect } from './utils.js';
import { toggleMapLayer } from './layers.js';
import { showBoundsPreview, hideBoundsPreview } from './mapCore.js';
import { updateMobileSearchResults, isMobile } from './mobile.js';

// ========================================
// キャッシュ機能（検索高速化）
// ========================================
let cachedRawData = null;        // APIから取得した生データ
let cacheTimestamp = null;       // キャッシュ作成時刻
const CACHE_DURATION = 10 * 60 * 1000; // キャッシュ有効期間: 10分

/**
 * キャッシュが有効かチェック
 */
function isCacheValid() {
    return cachedRawData !== null &&
           cacheTimestamp !== null &&
           (Date.now() - cacheTimestamp) < CACHE_DURATION;
}

/**
 * キャッシュをクリア（必要に応じて外部から呼び出し可能）
 */
export function clearSearchCache() {
    cachedRawData = null;
    cacheTimestamp = null;
    console.log('検索キャッシュをクリアしました');
}

/**
 * 2点間の距離を計算（簡易版、度単位）
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    return Math.sqrt(dLat * dLat + dLon * dLon);
}

/**
 * 結果を画面中心から近い順にソート
 */
function sortByDistanceFromCenter(results, mapCenter) {
    return results.slice().sort((a, b) => {
        // 各結果のboundsの中心を計算
        const aCenterLat = (a.bounds.north + a.bounds.south) / 2;
        const aCenterLon = (a.bounds.east + a.bounds.west) / 2;
        const bCenterLat = (b.bounds.north + b.bounds.south) / 2;
        const bCenterLon = (b.bounds.east + b.bounds.west) / 2;

        const distA = calculateDistance(mapCenter.lat, mapCenter.lng, aCenterLat, aCenterLon);
        const distB = calculateDistance(mapCenter.lat, mapCenter.lng, bCenterLat, bCenterLon);

        return distA - distB;
    });
}

/**
 * 表示範囲内の地質図を検索
 */
export async function searchGeologicalMaps() {
    const map = getMap();
    const searchBtn = document.getElementById('searchBtn');
    const mobileSearchBtn = document.getElementById('mobileSearchBtn');
    const statusText = document.getElementById('searchStatus');
    const resultContainer = document.getElementById('searchResults');
    const resultCount = document.getElementById('resultCount');

    // デスクトップ検索ボタンの状態更新
    if (searchBtn) {
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<span class="loading"></span> 検索中...';
    }

    // モバイル検索ボタンの状態更新
    if (mobileSearchBtn) {
        mobileSearchBtn.disabled = true;
        mobileSearchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>検索中...</span>';
    }

    if (statusText) {
        statusText.textContent = '';
        statusText.className = 'status-text';
    }

    try {
        const bounds = map.getBounds();
        const bbox = {
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth()
        };

        const rawResults = await fetchGeologicalMaps(bbox);
        // 画面中心から近い順にソート
        const mapCenter = map.getCenter();
        const results = sortByDistanceFromCenter(rawResults, mapCenter);
        setSearchResults(results);
        window._searchResults = results;

        if (results.length === 0) {
            if (resultContainer) {
                resultContainer.innerHTML = '<p class="placeholder-text">この範囲には地質図が見つかりませんでした。</p>';
            }
            if (resultCount) {
                resultCount.textContent = '(0件)';
            }
            if (statusText) {
                statusText.textContent = '地質図が見つかりませんでした';
                statusText.className = 'status-text';
            }
            // モバイル用も更新
            updateMobileSearchResults('<p class="placeholder-text">この範囲には地質図が見つかりませんでした。</p>', 0);
        } else {
            renderSearchResults(results);
            if (resultCount) {
                resultCount.textContent = `(${results.length}件)`;
            }
            if (statusText) {
                statusText.textContent = `${results.length}件の地質図が見つかりました`;
                statusText.className = 'status-text success';
            }
            // モバイル用も更新
            renderMobileSearchResults(results);
        }
    } catch (error) {
        console.error('検索エラー:', error);
        if (resultContainer) {
            resultContainer.innerHTML = '<p class="placeholder-text">検索中にエラーが発生しました。</p>';
        }
        if (statusText) {
            statusText.textContent = 'エラー: ' + error.message;
            statusText.className = 'status-text error';
        }
        // モバイル用エラー表示
        updateMobileSearchResults('<p class="placeholder-text">検索中にエラーが発生しました。</p>', 0);
    } finally {
        // デスクトップ検索ボタンのリセット
        if (searchBtn) {
            searchBtn.disabled = false;
            searchBtn.innerHTML = '<span class="btn-icon">🔍</span> 表示範囲で検索';
        }
        // モバイル検索ボタンのリセット
        if (mobileSearchBtn) {
            mobileSearchBtn.disabled = false;
            mobileSearchBtn.innerHTML = '<i class="fas fa-search"></i><span>この範囲で検索</span>';
        }
    }
}

/**
 * CKAN APIから地質図データを取得（キャッシュ対応）
 */
async function fetchGeologicalMaps(bbox) {
    // キャッシュが有効な場合はAPIリクエストをスキップ
    if (isCacheValid()) {
        console.log('キャッシュからデータを取得（APIリクエストなし）');
        return filterMapsByBounds(cachedRawData, bbox);
    }

    // キャッシュが無い場合のみAPIリクエスト
    console.log('APIからデータを取得中...');
    const url = `${CKAN_API_BASE}/package_search?q=地質図&rows=1000`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('APIリクエストに失敗しました');
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error('APIがエラーを返しました');
    }

    // 全データを処理してキャッシュに保存
    const allMapsWithTiles = processApiResults(data.result.results);

    // キャッシュを更新
    cachedRawData = allMapsWithTiles;
    cacheTimestamp = Date.now();
    console.log(`キャッシュを更新: ${allMapsWithTiles.length}件の地質図データ`);

    // 現在のbboxでフィルタリングして返す
    return filterMapsByBounds(allMapsWithTiles, bbox);
}

/**
 * APIレスポンスを処理して地質図データを抽出
 */
function processApiResults(results) {
    const mapsWithTiles = [];

    for (const dataset of results) {
        const tileResource = dataset.resources?.find(r =>
            r.format === 'XYZ' ||
            r.name?.includes('タイル') ||
            r.url?.includes('maptile/xyz')
        );

        const tileJsonResource = dataset.resources?.find(r =>
            r.format === 'JSON' &&
            (r.name?.includes('TileJSON') || r.url?.includes('getTileJson'))
        );

        const ldResource = dataset.resources?.find(r =>
            r.format === 'JSON' &&
            r.url?.includes('/ld/resource/')
        );

        if (tileResource || tileJsonResource) {
            let mapBounds = null;

            if (dataset.spatial) {
                try {
                    const spatial = typeof dataset.spatial === 'string'
                        ? JSON.parse(dataset.spatial)
                        : dataset.spatial;

                    if (spatial.type === 'Polygon' && spatial.coordinates) {
                        const coords = spatial.coordinates[0];
                        const lons = coords.map(c => c[0]);
                        const lats = coords.map(c => c[1]);
                        mapBounds = {
                            west: Math.min(...lons),
                            east: Math.max(...lons),
                            south: Math.min(...lats),
                            north: Math.max(...lats)
                        };
                    }
                } catch (e) {
                    console.warn('spatial解析エラー:', e);
                }
            }

            if (!mapBounds && tileResource?.description) {
                const bboxMatch = tileResource.description.match(/BBOX:\s*([\d.]+),([\d.]+),([\d.]+),([\d.]+)/);
                if (bboxMatch) {
                    mapBounds = {
                        west: parseFloat(bboxMatch[1]),
                        south: parseFloat(bboxMatch[2]),
                        east: parseFloat(bboxMatch[3]),
                        north: parseFloat(bboxMatch[4])
                    };
                }
            }

            if (mapBounds) {
                const imageResource = dataset.resources?.find(r =>
                    r.format === 'JPEG' || r.format === 'JPG' || r.format === 'PNG'
                );
                const pdfResource = dataset.resources?.find(r => r.format === 'PDF');

                mapsWithTiles.push({
                    id: dataset.id,
                    name: dataset.name,
                    title: dataset.title,
                    notes: dataset.notes,
                    author: dataset.author,
                    tileUrl: tileResource?.url,
                    tileJsonUrl: tileJsonResource?.url,
                    ldUrl: ldResource?.url,
                    bounds: mapBounds,
                    imageUrl: imageResource?.url,
                    pdfUrl: pdfResource?.url
                });
            }
        }
    }

    return mapsWithTiles;
}

/**
 * キャッシュされた地質図データをbboxでフィルタリング
 */
function filterMapsByBounds(maps, bbox) {
    return maps.filter(map => boundsIntersect(bbox, map.bounds));
}

/**
 * 検索結果をカテゴリ分類
 */
function categorizeResults(results) {
    const categories = {
        '地質図幅': [],
        '火山地質図': [],
        '水理地質図': [],
        '表層地質図': [],
        '海洋地質図': [],
        '活断層図': [],
        '環境地質図': [],
        '地熱地質図': [],
        '鉱物資源図': [],
        '重力図': [],
        'その他': []
    };

    const categoryKeywords = {
        '火山地質図': ['火山', 'volcano', '噴火'],
        '水理地質図': ['水理', '地下水', '帯水層', '水文'],
        '表層地質図': ['表層', '土地分類', '地盤'],
        '海洋地質図': ['海洋', '海底', '沿岸', '海域'],
        '活断層図': ['活断層', '断層'],
        '環境地質図': ['環境'],
        '地熱地質図': ['地熱'],
        '鉱物資源図': ['鉱物', '鉱床', '資源'],
        '重力図': ['重力'],
        '地質図幅': ['地質図幅', '万分の1地質図']
    };

    results.forEach(result => {
        const title = result.title.toLowerCase();
        let assigned = false;

        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            for (const keyword of keywords) {
                if (title.includes(keyword.toLowerCase())) {
                    categories[category].push(result);
                    assigned = true;
                    break;
                }
            }
            if (assigned) break;
        }

        if (!assigned) {
            categories['その他'].push(result);
        }
    });

    const filteredCategories = {};
    for (const [category, items] of Object.entries(categories)) {
        if (items.length > 0) {
            filteredCategories[category] = items;
        }
    }

    return filteredCategories;
}

/**
 * 検索結果を表示（カテゴリ別アコーディオン）
 */
function renderSearchResults(results) {
    const container = document.getElementById('searchResults');
    if (!container) return;

    container.innerHTML = '';

    const categories = categorizeResults(results);
    const categoryCount = Object.keys(categories).length;

    if (categoryCount <= 1 || results.length <= 5) {
        renderFlatResults(container, results);
    } else {
        renderCategorizedResults(container, categories);
    }
}

/**
 * フラット表示（従来形式）
 */
function renderFlatResults(container, results) {
    results.forEach((result, index) => {
        const item = createResultItem(result, index);
        container.appendChild(item);
    });
}

/**
 * カテゴリ別アコーディオン表示
 */
function renderCategorizedResults(container, categories) {
    const activeLayers = getActiveLayers();
    let isFirst = true;

    for (const [categoryName, items] of Object.entries(categories)) {
        const accordion = document.createElement('div');
        accordion.className = 'result-accordion';

        const header = document.createElement('div');
        header.className = 'result-accordion-header';
        if (isFirst) {
            header.classList.add('open');
        }

        const selectedCount = items.filter(item => activeLayers.has(item.id)).length;
        const selectedBadge = selectedCount > 0
            ? `<span class="accordion-selected-badge">${selectedCount}選択中</span>`
            : '';

        header.innerHTML = `
            <span class="accordion-icon">${isFirst ? '▼' : '▶'}</span>
            <span class="accordion-title">${categoryName}</span>
            <span class="accordion-count">(${items.length}件)</span>
            ${selectedBadge}
        `;

        const content = document.createElement('div');
        content.className = 'result-accordion-content';
        if (isFirst) {
            content.classList.add('open');
        }

        items.forEach((result, index) => {
            const item = createResultItem(result, index);
            item.dataset.resultId = result.id;
            content.appendChild(item);
        });

        header.addEventListener('click', () => {
            const isOpen = header.classList.contains('open');

            if (isOpen) {
                header.classList.remove('open');
                content.classList.remove('open');
                header.querySelector('.accordion-icon').textContent = '▶';
            } else {
                header.classList.add('open');
                content.classList.add('open');
                header.querySelector('.accordion-icon').textContent = '▼';
            }
        });

        accordion.appendChild(header);
        accordion.appendChild(content);
        container.appendChild(accordion);

        isFirst = false;
    }
}

/**
 * 検索結果アイテムを作成
 */
function createResultItem(result, index) {
    const activeLayers = getActiveLayers();
    const item = document.createElement('div');
    item.className = 'result-item';
    item.dataset.resultId = result.id;

    if (activeLayers.has(result.id)) {
        item.classList.add('selected');
    }

    const shortTitle = result.title.length > 50
        ? result.title.substring(0, 50) + '...'
        : result.title;

    item.innerHTML = `
        <div class="result-item-title">${shortTitle}</div>
        <div class="result-item-info">
            範囲: ${result.bounds.south.toFixed(2)}°N - ${result.bounds.north.toFixed(2)}°N,
            ${result.bounds.west.toFixed(2)}°E - ${result.bounds.east.toFixed(2)}°E
        </div>
    `;

    item.addEventListener('click', () => toggleMapLayer(result));
    item.addEventListener('mouseenter', () => showBoundsPreview(result.bounds));
    item.addEventListener('mouseleave', () => hideBoundsPreview());

    return item;
}

/**
 * モバイル用検索結果アイテムのHTMLを生成
 */
function createMobileResultItemHtml(result) {
    const activeLayers = getActiveLayers();
    const shortTitle = result.title.length > 50
        ? result.title.substring(0, 50) + '...'
        : result.title;
    const selectedClass = activeLayers.has(result.id) ? ' selected' : '';

    return `
        <div class="result-item${selectedClass}" data-result-id="${result.id}" onclick="window.toggleMobileMapLayer('${result.id}')">
            <div class="result-item-title">${shortTitle}</div>
            <div class="result-item-info">
                範囲: ${result.bounds.south.toFixed(2)}°N - ${result.bounds.north.toFixed(2)}°N
            </div>
        </div>
    `;
}

/**
 * モバイル用検索結果を描画（カテゴリ別アコーディオン対応）
 */
function renderMobileSearchResults(results) {
    const categories = categorizeResults(results);
    const categoryCount = Object.keys(categories).length;

    let html = '';

    // カテゴリが1つ以下、または結果が5件以下の場合はフラット表示
    if (categoryCount <= 1 || results.length <= 5) {
        results.forEach((result) => {
            html += createMobileResultItemHtml(result);
        });
    } else {
        // カテゴリ別アコーディオン表示
        const activeLayers = getActiveLayers();
        let isFirst = true;

        for (const [categoryName, items] of Object.entries(categories)) {
            const selectedCount = items.filter(item => activeLayers.has(item.id)).length;
            const selectedBadge = selectedCount > 0
                ? `<span class="accordion-selected-badge">${selectedCount}選択中</span>`
                : '';

            html += `
                <div class="result-accordion">
                    <div class="result-accordion-header${isFirst ? ' open' : ''}" onclick="window.toggleMobileAccordion(this)">
                        <span class="accordion-icon">${isFirst ? '▼' : '▶'}</span>
                        <span class="accordion-title">${categoryName}</span>
                        <span class="accordion-count">(${items.length}件)</span>
                        ${selectedBadge}
                    </div>
                    <div class="result-accordion-content${isFirst ? ' open' : ''}">
            `;

            items.forEach((result) => {
                html += createMobileResultItemHtml(result);
            });

            html += `
                    </div>
                </div>
            `;

            isFirst = false;
        }
    }

    updateMobileSearchResults(html, results.length);
}

// モバイル用アコーディオン切り替え関数をグローバルに公開
window.toggleMobileAccordion = function(header) {
    const isOpen = header.classList.contains('open');
    const content = header.nextElementSibling;

    if (isOpen) {
        header.classList.remove('open');
        content.classList.remove('open');
        header.querySelector('.accordion-icon').textContent = '▶';
    } else {
        header.classList.add('open');
        content.classList.add('open');
        header.querySelector('.accordion-icon').textContent = '▼';
    }
};

// モバイル用のレイヤートグル関数をグローバルに公開
window.toggleMobileMapLayer = function(resultId) {
    const results = getSearchResults();
    const result = results.find(r => r.id === resultId);
    if (result) {
        toggleMapLayer(result);
    }
};

// 検索結果を取得する関数を追加
function getSearchResults() {
    return window._searchResults || [];
}

// setSearchResultsをラップして検索結果を保持
const originalSetSearchResults = setSearchResults;
window._searchResults = [];
