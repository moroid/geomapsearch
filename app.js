/**
 * 産総研 地質図検索ビューア
 *
 * 地質調査総合センターが公開している地質図をLeaflet上で検索・表示するアプリケーション
 */

// グローバル変数
let map;
let seamlessLayer = null;
let activeLayers = new Map(); // layerId -> { layer, data, legendData }
let searchResults = [];
let currentLegendLayerId = null;
let seamlessLegendData = null;

// 画像ビューア状態
let viewerZoom = 1;
let viewerPanning = false;
let viewerStartX = 0;
let viewerStartY = 0;
let viewerScrollLeft = 0;
let viewerScrollTop = 0;


// 凡例パネル内画像ズーム状態
let legendImageZoom = 1;
let legendImagePanning = false;
let legendImageStartX = 0;
let legendImageStartY = 0;
let legendImagePosX = 0;
let legendImagePosY = 0;
let legendImageStartPosX = 0;
let legendImageStartPosY = 0;
let currentLegendImage = null;
let legendImageNaturalWidth = 0;
let legendImageNaturalHeight = 0;

// 右サイドバーリサイズ状態
let legendSidebarResizing = false;
let legendSidebarStartX = 0;
let legendSidebarStartWidth = 0;

// ホバープレビュー用矩形レイヤー
let hoverPreviewLayer = null;

// CKAN API エンドポイント
const CKAN_API_BASE = 'https://data.gsj.jp/gkan/api/3/action';

// シームレス地質図関連URL
const SEAMLESS_TILE_URL = 'https://gbank.gsj.jp/seamless/v2/api/1.3.1/tiles/{z}/{y}/{x}.png';
const SEAMLESS_LEGEND_URL = 'https://gbank.gsj.jp/seamless/v2/api/1.3.1/legend.json';

/**
 * 初期化
 */
function init() {
    initMap();
    initEventListeners();
}

/**
 * Leaflet地図の初期化
 */
function initMap() {
    // 日本の中心付近で初期化
    map = L.map('map', {
        center: [36.0, 138.0],
        zoom: 6,
        zoomControl: true,
        attributionControl: false
    });

    // 帰属表示を追加（Leafletを除外）
    L.control.attribution({
        prefix: false
    }).addTo(map);

    // ベースマップ（OpenStreetMap）
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 18
    }).addTo(map);

    // 地理院タイル（淡色地図）も追加可能
    const gsiPale = L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png', {
        attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html">国土地理院</a>',
        maxZoom: 18
    });

    // レイヤーコントロール
    const baseMaps = {
        'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(map),
        '地理院タイル（淡色）': gsiPale
    };

    L.control.layers(baseMaps).addTo(map);
}

/**
 * イベントリスナーの設定
 */
function initEventListeners() {
    // 検索ボタン
    document.getElementById('searchBtn').addEventListener('click', searchGeologicalMaps);

    // シームレス地質図トグル
    document.getElementById('seamlessToggle').addEventListener('change', toggleSeamlessLayer);

    // シームレス地質図透明度
    document.getElementById('seamlessOpacity').addEventListener('input', updateSeamlessOpacity);

    // シームレス地質図凡例ボタン
    document.getElementById('seamlessLegendBtn').addEventListener('click', showSeamlessLegend);

    // 凡例サイドバー閉じるボタン
    document.getElementById('closeLegendBtn').addEventListener('click', closeLegendSidebar);

    // 凡例サイドバー開くボタン
    document.getElementById('legendSidebarToggle').addEventListener('click', openLegendSidebar);

    // 凡例サイドバーリサイズ
    initLegendSidebarResize();

    // 凡例パネル内画像ズームコントロール
    initLegendZoomControls();

    // 画像ビューアのイベント
    initImageViewer();
}

/**
 * 表示範囲内の地質図を検索
 */
async function searchGeologicalMaps() {
    const searchBtn = document.getElementById('searchBtn');
    const statusText = document.getElementById('searchStatus');
    const resultContainer = document.getElementById('searchResults');
    const resultCount = document.getElementById('resultCount');

    // ボタンを無効化
    searchBtn.disabled = true;
    searchBtn.innerHTML = '<span class="loading"></span> 検索中...';
    statusText.textContent = '';
    statusText.className = 'status-text';

    try {
        // 現在の表示範囲を取得
        const bounds = map.getBounds();
        const bbox = {
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth()
        };

        // CKAN APIで地質図を検索
        const results = await fetchGeologicalMaps(bbox);
        searchResults = results;

        // 結果を表示
        if (results.length === 0) {
            resultContainer.innerHTML = '<p class="placeholder-text">この範囲には地質図が見つかりませんでした。</p>';
            resultCount.textContent = '(0件)';
            statusText.textContent = '地質図が見つかりませんでした';
            statusText.className = 'status-text';
        } else {
            renderSearchResults(results);
            resultCount.textContent = `(${results.length}件)`;
            statusText.textContent = `${results.length}件の地質図が見つかりました`;
            statusText.className = 'status-text success';
        }
    } catch (error) {
        console.error('検索エラー:', error);
        resultContainer.innerHTML = '<p class="placeholder-text">検索中にエラーが発生しました。</p>';
        statusText.textContent = 'エラー: ' + error.message;
        statusText.className = 'status-text error';
    } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<span class="btn-icon">🔍</span> 表示範囲で検索';
    }
}

/**
 * CKAN APIから地質図データを取得
 */
async function fetchGeologicalMaps(bbox) {
    // 空間検索用のクエリを構築
    // CKANは空間検索をサポートしていないため、全データを取得してクライアント側でフィルタリング
    const url = `${CKAN_API_BASE}/package_search?q=地質図&rows=500`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('APIリクエストに失敗しました');
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error('APIがエラーを返しました');
    }

    // タイル配信がある地質図のみフィルタリング
    const mapsWithTiles = [];

    for (const dataset of data.result.results) {
        // タイルリソースを探す
        const tileResource = dataset.resources?.find(r =>
            r.format === 'XYZ' ||
            r.name?.includes('タイル') ||
            r.url?.includes('maptile/xyz')
        );

        const tileJsonResource = dataset.resources?.find(r =>
            r.format === 'JSON' &&
            (r.name?.includes('TileJSON') || r.url?.includes('getTileJson'))
        );

        // Linked Data メタデータリソースを探す（title_j, authors_j等を含む）
        const ldResource = dataset.resources?.find(r =>
            r.format === 'JSON' &&
            r.url?.includes('/ld/resource/')
        );

        if (tileResource || tileJsonResource) {
            // 範囲情報を取得
            let mapBounds = null;

            // spatialフィールドから範囲を取得
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

            // リソースのdescriptionからBBOXを取得
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

            // 表示範囲と交差するかチェック
            if (mapBounds && boundsIntersect(bbox, mapBounds)) {
                // 凡例関連リソースを探す
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
 * 2つの矩形範囲が交差するかチェック
 */
function boundsIntersect(a, b) {
    return !(
        a.east < b.west ||
        a.west > b.east ||
        a.north < b.south ||
        a.south > b.north
    );
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

    // カテゴリ判定のキーワード
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

    // 空のカテゴリを除外
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
    container.innerHTML = '';

    // カテゴリが1つ以下または結果が少ない場合はフラット表示
    const categories = categorizeResults(results);
    const categoryCount = Object.keys(categories).length;

    if (categoryCount <= 1 || results.length <= 5) {
        // フラット表示
        renderFlatResults(container, results);
    } else {
        // カテゴリ別アコーディオン表示
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
    // アコーディオンの開閉状態を保持（初回は最初のカテゴリのみ開く）
    let isFirst = true;

    for (const [categoryName, items] of Object.entries(categories)) {
        const accordion = document.createElement('div');
        accordion.className = 'result-accordion';

        // アコーディオンヘッダー
        const header = document.createElement('div');
        header.className = 'result-accordion-header';
        if (isFirst) {
            header.classList.add('open');
        }

        // 選択中のアイテム数をカウント
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

        // アコーディオンコンテンツ
        const content = document.createElement('div');
        content.className = 'result-accordion-content';
        if (isFirst) {
            content.classList.add('open');
        }

        // カテゴリ内のアイテムを追加
        items.forEach((result, index) => {
            const item = createResultItem(result, index);
            item.dataset.resultId = result.id;
            content.appendChild(item);
        });

        // アコーディオンの開閉イベント
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
    const item = document.createElement('div');
    item.className = 'result-item';
    item.dataset.resultId = result.id;

    if (activeLayers.has(result.id)) {
        item.classList.add('selected');
    }

    // タイトルを短縮
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

    // ホバー時に範囲を地図上に表示
    item.addEventListener('mouseenter', () => showBoundsPreview(result.bounds));
    item.addEventListener('mouseleave', () => hideBoundsPreview());

    return item;
}

/**
 * 地質図の範囲をプレビュー表示
 */
function showBoundsPreview(bounds) {
    // 既存のプレビューを削除
    hideBoundsPreview();

    // 矩形を作成
    hoverPreviewLayer = L.rectangle(
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

    hoverPreviewLayer.addTo(map);
}

/**
 * 範囲プレビューを非表示
 */
function hideBoundsPreview() {
    if (hoverPreviewLayer) {
        map.removeLayer(hoverPreviewLayer);
        hoverPreviewLayer = null;
    }
}

/**
 * 地質図レイヤーの表示/非表示を切り替え
 */
async function toggleMapLayer(mapData) {
    if (activeLayers.has(mapData.id)) {
        // レイヤーを削除
        removeLayer(mapData.id);
    } else {
        // レイヤーを追加
        await addLayer(mapData);
    }

    // 検索結果の選択状態を更新
    updateSearchResultsSelection();
}

/**
 * レイヤーを追加
 */
async function addLayer(mapData) {
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

                    // webp形式のURLを優先
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

                    // 凡例URLを取得
                    if (tileJson.legend) {
                        legendUrl = tileJson.legend;
                    }

                    // 地図名と説明を取得
                    if (tileJson.name) mapName = tileJson.name;
                    if (tileJson.description) mapDescription = tileJson.description;

                    // 日本語タイトルと著者を取得
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
                    console.log('LD JSON:', ldData);  // デバッグ用
                    if (!mapTitleJ && ldData.title_j) mapTitleJ = ldData.title_j;
                    if (!mapAuthorsJ && ldData.authors_j) mapAuthorsJ = ldData.authors_j;
                    // GeoTIFF URLを取得
                    if (ldData.geotiff) geotiffUrl = ldData.geotiff;
                    if (ldData.download?.geotiff) geotiffUrl = ldData.download.geotiff;
                }
            } catch (e) {
                console.warn('LDメタデータ取得エラー:', e);
            }
        }

        if (!tileUrl) {
            console.error('タイルURLが見つかりません');
            return;
        }

        // Leafletタイルレイヤーを作成
        // maxNativeZoomを設定し、それ以上のズームではバイリニア補間で拡大表示
        const layer = L.tileLayer(tileUrl, {
            minZoom: minZoom,
            maxZoom: 18,  // 表示可能な最大ズーム
            maxNativeZoom: maxZoom,  // タイルが存在する最大ズーム
            opacity: 0.7,
            bounds: bounds ? L.latLngBounds(
                [bounds.south, bounds.west],
                [bounds.north, bounds.east]
            ) : undefined,
            attribution: '<a href="https://gbank.gsj.jp/geonavi/">産総研 地質図Navi</a>'
        });

        layer.addTo(map);

        // アクティブレイヤーに追加（凡例URL含む）
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
function removeLayer(layerId) {
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
function updateActiveLayersList() {
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
}

/**
 * 検索結果の選択状態を更新
 */
function updateSearchResultsSelection() {
    // 全てのresult-itemを更新（IDベース）
    const items = document.querySelectorAll('.result-item');
    items.forEach(item => {
        const resultId = item.dataset.resultId;
        if (resultId && activeLayers.has(resultId)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });

    // アコーディオンヘッダーの選択数バッジを更新
    updateAccordionBadges();
}

/**
 * アコーディオンヘッダーの選択数バッジを更新
 */
function updateAccordionBadges() {
    const accordions = document.querySelectorAll('.result-accordion');
    accordions.forEach(accordion => {
        const content = accordion.querySelector('.result-accordion-content');
        const header = accordion.querySelector('.result-accordion-header');
        if (!content || !header) return;

        // カテゴリ内の選択数をカウント
        const items = content.querySelectorAll('.result-item');
        let selectedCount = 0;
        items.forEach(item => {
            if (item.classList.contains('selected')) {
                selectedCount++;
            }
        });

        // 既存のバッジを削除
        const existingBadge = header.querySelector('.accordion-selected-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        // 選択があればバッジを追加
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
function toggleSeamlessLayer(e) {
    const seamlessControls = document.getElementById('seamlessControls');

    if (e.target.checked) {
        // シームレス地質図を追加
        // maxNativeZoomを設定し、それ以上のズームではバイリニア補間で拡大表示
        seamlessLayer = L.tileLayer(SEAMLESS_TILE_URL, {
            minZoom: 0,
            maxZoom: 18,  // 表示可能な最大ズーム
            maxNativeZoom: 13,  // タイルが存在する最大ズーム
            opacity: 0.7,
            attribution: '<a href="https://gbank.gsj.jp/seamless/">20万分の1日本シームレス地質図</a>'
        });
        seamlessLayer.addTo(map);
        seamlessControls.style.display = 'block';
    } else {
        // シームレス地質図を削除
        if (seamlessLayer) {
            map.removeLayer(seamlessLayer);
            seamlessLayer = null;
        }
        seamlessControls.style.display = 'none';
        // 凡例サイドバーも閉じる
        if (currentLegendLayerId === 'seamless') {
            closeLegendSidebar();
        }
    }
}

/**
 * シームレス地質図の透明度を更新
 */
function updateSeamlessOpacity(e) {
    const opacity = e.target.value / 100;
    document.getElementById('seamlessOpacityValue').textContent = e.target.value;

    if (seamlessLayer) {
        seamlessLayer.setOpacity(opacity);
    }
}

/**
 * 凡例を表示
 */
async function showLegend(layerId, mapData) {
    const sidebar = document.getElementById('legendSidebar');
    const content = document.getElementById('legendContent');
    const titleEl = document.getElementById('legendTitle');
    const toggleBtn = document.getElementById('legendSidebarToggle');

    // サイドバーを表示、トグルボタンを非表示
    sidebar.classList.remove('hidden');
    toggleBtn.classList.add('hidden');
    currentLegendLayerId = layerId;

    // タイトルを設定（TileJSONのnameを優先）
    const displayTitle = mapData.mapName || mapData.title;
    const shortTitle = displayTitle.length > 25
        ? displayTitle.substring(0, 25) + '...'
        : displayTitle;
    titleEl.textContent = shortTitle;

    // ローディング表示
    content.innerHTML = `
        <div class="legend-loading">
            <span class="loading"></span>
            <span>凡例を読み込み中...</span>
        </div>
    `;

    try {
        // 地質図の凡例情報を構築
        let legendHtml = '';

        // 説明セクション（凡例より先に表示）- title_jとauthors_jのみ表示
        // TileJSONのtitle_j/authors_jを優先、なければCKANのtitle/authorにフォールバック
        const titleText = mapData.mapTitleJ ? stripMarkdown(mapData.mapTitleJ) : (mapData.title || '');
        const authorText = mapData.mapAuthorsJ ? stripMarkdown(mapData.mapAuthorsJ) : (mapData.author || '');

        if (titleText) {
            const citationText = authorText ? `${titleText}　${authorText}` : titleText;
            const escapedCitation = citationText.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

            legendHtml += `
                <div class="legend-section">
                    <div class="legend-section-title">説明</div>
                    <div class="legend-citation-line">
                        <p class="legend-citation-text">${escapeHtml(citationText)}</p>
                        <button class="legend-copy-btn" onclick="copyToClipboard(\`${escapedCitation}\`, this)" title="コピー">📋</button>
                    </div>
                </div>
            `;
        }

        // PDF説明書へのリンク
        if (mapData.pdfUrl) {
            legendHtml += `
                <a href="${mapData.pdfUrl}" target="_blank" class="legend-link">
                    📄 説明書（PDF）を開く
                </a>
            `;
        }

        // GeoTIFFダウンロードリンク
        if (mapData.geotiffUrl) {
            legendHtml += `
                <a href="${mapData.geotiffUrl}" target="_blank" class="legend-link" download>
                    🗺️ GeoTIFFをダウンロード
                </a>
            `;
        }

        // CKANページへのリンク
        legendHtml += `
            <a href="https://data.gsj.jp/gkan/dataset/${mapData.name}" target="_blank" class="legend-link">
                🔗 詳細ページを開く（CKAN）
            </a>
        `;

        // TileJSONの凡例画像がある場合
        if (mapData.legendUrl) {
            legendHtml += `
                <div class="legend-section">
                    <div class="legend-section-title">凡例</div>
                    <div class="legend-image-container">
                        <img src="${mapData.legendUrl}" alt="凡例" class="legend-image clickable"
                             data-title="${displayTitle}"
                             onclick="openLegendImageZoom(this)"
                             onerror="this.parentElement.innerHTML='<p class=\\'placeholder-text\\'>凡例画像を読み込めませんでした</p>'" />
                        <p class="legend-image-hint">クリックで拡大表示</p>
                    </div>
                </div>
            `;
        }

        // 出版物画像がある場合（凡例URLがなければ表示）
        if (!mapData.legendUrl && mapData.imageUrl) {
            legendHtml += `
                <div class="legend-section">
                    <div class="legend-section-title">地質図画像</div>
                    <div class="legend-image-container">
                        <img src="${mapData.imageUrl}" alt="地質図" class="legend-image clickable"
                             data-title="${displayTitle}"
                             onclick="openLegendImageZoom(this)"
                             onerror="this.parentElement.innerHTML='<p class=\\'placeholder-text\\'>画像を読み込めませんでした</p>'" />
                        <p class="legend-image-hint">クリックで拡大表示</p>
                    </div>
                </div>
            `;
        }

        // 凡例がない場合のメッセージ
        if (!mapData.legendUrl && !mapData.imageUrl && !mapData.notes && !mapData.mapDescription && !mapData.pdfUrl) {
            legendHtml = `
                <div class="legend-section">
                    <p class="placeholder-text">この地質図の凡例データは利用できません。</p>
                </div>
                <a href="https://data.gsj.jp/gkan/dataset/${mapData.name}" target="_blank" class="legend-link">
                    🔗 詳細ページを開く（CKAN）
                </a>
            `;
        }

        content.innerHTML = legendHtml;

    } catch (error) {
        console.error('凡例読み込みエラー:', error);
        content.innerHTML = `
            <div class="legend-error">
                凡例の読み込みに失敗しました。
            </div>
            <a href="https://data.gsj.jp/gkan/dataset/${mapData.name}" target="_blank" class="legend-link">
                🔗 詳細ページを開く（CKAN）
            </a>
        `;
    }
}

/**
 * シームレス地質図の凡例を表示
 */
async function showSeamlessLegend() {
    const sidebar = document.getElementById('legendSidebar');
    const content = document.getElementById('legendContent');
    const titleEl = document.getElementById('legendTitle');
    const toggleBtn = document.getElementById('legendSidebarToggle');

    // サイドバーを表示、トグルボタンを非表示
    sidebar.classList.remove('hidden');
    toggleBtn.classList.add('hidden');
    currentLegendLayerId = 'seamless';

    titleEl.textContent = 'シームレス地質図';

    // ローディング表示
    content.innerHTML = `
        <div class="legend-loading">
            <span class="loading"></span>
            <span>表示範囲の凡例を取得中...</span>
        </div>
    `;

    try {
        // 表示範囲内の凡例を直接取得（APIのboxパラメータを使用）
        const filteredLegendData = await getVisibleSeamlessLegend();
        const filterMessage = `表示範囲内の凡例（${filteredLegendData.length}項目）`;

        // 凡例をグループ別に整理
        const groups = {};
        filteredLegendData.forEach(item => {
            const group = item.group_ja || '不明';
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(item);
        });

        // HTMLを構築
        let legendHtml = `
            <div class="legend-section">
                <div class="legend-section-title">${filterMessage}</div>
                <p style="font-size: 0.75rem; color: #666; margin-bottom: 10px;">
                    地図を移動して「凡例を更新」で表示範囲の凡例を取得できます
                </p>
                <button class="seamless-legend-refresh-btn" onclick="showSeamlessLegend()">
                    🔄 凡例を更新
                </button>
            </div>
        `;

        if (Object.keys(groups).length === 0) {
            legendHtml += `
                <div class="legend-section">
                    <p class="placeholder-text">この範囲には地質図データがありません。</p>
                </div>
            `;
        } else {
            for (const [groupName, items] of Object.entries(groups)) {
                legendHtml += `
                    <div class="legend-section">
                        <div class="legend-section-title">${groupName}（${items.length}件）</div>
                `;

                // 全アイテムを表示（フィルタリング済みなので制限なし）
                items.forEach(item => {
                    const color = `#${item.value || '999999'}`;
                    const title = item.lithology_ja || item.title || 'N/A';
                    const age = item.formationAge_ja || '';

                    legendHtml += `
                        <div class="legend-item">
                            <div class="legend-color" style="background-color: ${color};"></div>
                            <div class="legend-text">
                                <div class="legend-text-title">${title}</div>
                                ${age ? `<div class="legend-text-desc">${age}</div>` : ''}
                            </div>
                        </div>
                    `;
                });

                legendHtml += '</div>';
            }
        }

        legendHtml += `
            <a href="https://gbank.gsj.jp/seamless/v2/api/1.3.1/legend.html" target="_blank" class="legend-link">
                🔗 完全な凡例を開く
            </a>
        `;

        content.innerHTML = legendHtml;

    } catch (error) {
        console.error('シームレス凡例読み込みエラー:', error);
        content.innerHTML = `
            <div class="legend-error">
                凡例の読み込みに失敗しました。
            </div>
            <a href="https://gbank.gsj.jp/seamless/v2/api/1.3.1/legend.html" target="_blank" class="legend-link">
                🔗 凡例ページを開く
            </a>
        `;
    }
}

/**
 * 表示範囲内のシームレス地質図凡例を直接取得
 */
async function getVisibleSeamlessLegend() {
    const bounds = map.getBounds();

    // 日本の範囲内かチェック（シームレス地質図は日本のみ）
    const west = Math.max(bounds.getWest(), 122);
    const east = Math.min(bounds.getEast(), 154);
    const south = Math.max(bounds.getSouth(), 20);
    const north = Math.min(bounds.getNorth(), 46);

    // 範囲が日本外の場合は空を返す
    if (west >= east || south >= north) {
        return [];
    }

    try {
        // box パラメータで範囲指定して凡例を取得
        // box=緯度1,経度1,緯度2,経度2 (南西と北東の座標)
        const url = `${SEAMLESS_LEGEND_URL}?box=${south},${west},${north},${east}`;
        const response = await fetch(url);

        if (!response.ok) {
            console.warn('凡例取得失敗:', response.status);
            return [];
        }

        const data = await response.json();
        console.log(`表示範囲内の凡例: ${data.length}項目`);
        return data;
    } catch (error) {
        console.warn('凡例取得エラー:', error);
        return [];
    }
}

/**
 * 凡例サイドバーを閉じる
 */
function closeLegendSidebar() {
    const sidebar = document.getElementById('legendSidebar');
    const toggleBtn = document.getElementById('legendSidebarToggle');

    sidebar.classList.add('hidden');
    toggleBtn.classList.remove('hidden');

    // トグルボタンのアイコンを開く方向に
    toggleBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    toggleBtn.title = '凡例パネルを開く';

    // ズームコントロールも非表示に
    const zoomControls = document.getElementById('legendZoomControls');
    if (zoomControls) {
        zoomControls.classList.add('hidden');
    }
}

/**
 * 凡例サイドバーを開く
 */
function openLegendSidebar() {
    const sidebar = document.getElementById('legendSidebar');
    const toggleBtn = document.getElementById('legendSidebarToggle');

    sidebar.classList.remove('hidden');
    toggleBtn.classList.add('hidden');
}

/**
 * 凡例サイドバーリサイズ機能の初期化
 */
function initLegendSidebarResize() {
    const handle = document.getElementById('legendResizeHandle');
    const sidebar = document.getElementById('legendSidebar');

    handle.addEventListener('mousedown', (e) => {
        legendSidebarResizing = true;
        legendSidebarStartX = e.clientX;
        legendSidebarStartWidth = sidebar.offsetWidth;
        handle.classList.add('active');
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!legendSidebarResizing) return;

        const dx = legendSidebarStartX - e.clientX;
        const newWidth = Math.max(280, Math.min(window.innerWidth * 0.6, legendSidebarStartWidth + dx));
        sidebar.style.width = newWidth + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (legendSidebarResizing) {
            legendSidebarResizing = false;
            handle.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

/**
 * 画像ビューアの初期化
 */
function initImageViewer() {
    const viewer = document.getElementById('imageViewer');
    const content = document.getElementById('imageViewerContent');
    const image = document.getElementById('viewerImage');

    // 閉じるボタン
    document.getElementById('closeViewerBtn').addEventListener('click', closeImageViewer);

    // ズームボタン
    document.getElementById('zoomInBtn').addEventListener('click', () => zoomImage(0.25));
    document.getElementById('zoomOutBtn').addEventListener('click', () => zoomImage(-0.25));
    document.getElementById('zoomResetBtn').addEventListener('click', resetImageZoom);

    // マウスホイールでズーム
    content.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        zoomImage(delta);
    });

    // ドラッグでパン
    content.addEventListener('mousedown', (e) => {
        viewerPanning = true;
        viewerStartX = e.pageX - content.offsetLeft;
        viewerStartY = e.pageY - content.offsetTop;
        viewerScrollLeft = content.scrollLeft;
        viewerScrollTop = content.scrollTop;
        content.style.cursor = 'grabbing';
    });

    content.addEventListener('mousemove', (e) => {
        if (!viewerPanning) return;
        e.preventDefault();
        const x = e.pageX - content.offsetLeft;
        const y = e.pageY - content.offsetTop;
        const walkX = (x - viewerStartX) * 1.5;
        const walkY = (y - viewerStartY) * 1.5;
        content.scrollLeft = viewerScrollLeft - walkX;
        content.scrollTop = viewerScrollTop - walkY;
    });

    content.addEventListener('mouseup', () => {
        viewerPanning = false;
        content.style.cursor = 'grab';
    });

    content.addEventListener('mouseleave', () => {
        viewerPanning = false;
        content.style.cursor = 'grab';
    });

    // ESCキーで閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !viewer.classList.contains('hidden')) {
            closeImageViewer();
        }
    });
}

/**
 * 画像ビューアを開く
 */
function openImageViewer(src, title) {
    const viewer = document.getElementById('imageViewer');
    const image = document.getElementById('viewerImage');
    const titleEl = document.getElementById('imageViewerTitle');

    // 画像をロード
    image.src = src;
    titleEl.textContent = title || '凡例';

    // ズームをリセット
    viewerZoom = 1;
    updateImageZoom();

    // ビューアを表示
    viewer.classList.remove('hidden');

    // 画像読み込み完了後にスクロール位置を中央に
    image.onload = () => {
        const content = document.getElementById('imageViewerContent');
        content.scrollLeft = (content.scrollWidth - content.clientWidth) / 2;
        content.scrollTop = (content.scrollHeight - content.clientHeight) / 2;
    };
}

/**
 * 画像ビューアを閉じる
 */
function closeImageViewer() {
    const viewer = document.getElementById('imageViewer');
    viewer.classList.add('hidden');
}

/**
 * 画像のズーム
 */
function zoomImage(delta) {
    viewerZoom = Math.max(0.1, Math.min(5, viewerZoom + delta));
    updateImageZoom();
}

/**
 * ズームをリセット
 */
function resetImageZoom() {
    viewerZoom = 1;
    updateImageZoom();
}

/**
 * ズーム状態を画像に適用
 */
function updateImageZoom() {
    const image = document.getElementById('viewerImage');
    const zoomLevel = document.getElementById('zoomLevel');

    image.style.transform = `scale(${viewerZoom})`;
    zoomLevel.textContent = `${Math.round(viewerZoom * 100)}%`;
}

/**
 * 凡例サイドバー内画像ズームコントロールの初期化
 */
function initLegendZoomControls() {
    document.getElementById('legendBackBtn').addEventListener('click', exitLegendImageZoom);
    document.getElementById('legendZoomInBtn').addEventListener('click', () => zoomLegendImage(0.25));
    document.getElementById('legendZoomOutBtn').addEventListener('click', () => zoomLegendImage(-0.25));
    document.getElementById('legendZoomResetBtn').addEventListener('click', resetLegendImageZoom);
    document.getElementById('legendZoomFitBtn').addEventListener('click', fitLegendImage);
    document.getElementById('legendDownloadBtn').addEventListener('click', downloadLegendImage);
}

/**
 * 凡例画像をダウンロード
 */
function downloadLegendImage() {
    if (!currentLegendImage) {
        console.warn('ダウンロードする画像がありません');
        return;
    }

    // 画像をfetchしてBlobとしてダウンロード（CORS対策）
    fetch(currentLegendImage)
        .then(response => {
            if (!response.ok) throw new Error('画像の取得に失敗');
            return response.blob();
        })
        .then(blob => {
            // ダウンロードリンクを作成
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // ファイル名を生成（URLから抽出または凡例タイトルを使用）
            const titleEl = document.getElementById('legendTitle');
            const title = titleEl ? titleEl.textContent.replace(/[\\/:*?"<>|]/g, '_') : 'legend';
            const ext = currentLegendImage.match(/\.(png|jpg|jpeg|gif|webp)/i)?.[1] || 'png';
            a.download = `${title}_凡例.${ext}`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('ダウンロードエラー:', error);
            // フォールバック: 新しいタブで開く
            window.open(currentLegendImage, '_blank');
        });
}

/**
 * 凡例画像をズームモードで表示（パネル内拡大）
 */
function openLegendImageZoom(imgElement) {
    const content = document.getElementById('legendContent');
    const zoomControls = document.getElementById('legendZoomControls');

    // 現在の画像を保存
    currentLegendImage = imgElement.src;

    // ズームモード用のHTMLを生成
    content.innerHTML = `
        <div class="legend-zoom-mode">
            <div class="legend-zoom-container" id="legendZoomContainer">
                <img src="${currentLegendImage}" alt="凡例" id="legendZoomImage" />
            </div>
        </div>
    `;

    // ズームコントロールを表示
    zoomControls.classList.remove('hidden');

    // パネル内でのドラッグ（パン）機能を設定
    const container = document.getElementById('legendZoomContainer');
    const img = document.getElementById('legendZoomImage');

    // マウスホイールでズーム（マウス位置を中心に）
    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        zoomLegendImageAtPoint(delta, e.clientX, e.clientY);
    });

    // ドラッグでパン
    container.addEventListener('mousedown', startLegendImagePan);
    container.addEventListener('mousemove', handleLegendImagePan);
    container.addEventListener('mouseup', endLegendImagePan);
    container.addEventListener('mouseleave', endLegendImagePan);

    // 画像読み込み完了後にフィット
    img.onload = () => {
        legendImageNaturalWidth = img.naturalWidth;
        legendImageNaturalHeight = img.naturalHeight;
        legendImagePosX = 0;
        legendImagePosY = 0;
        fitLegendImage();
    };
}

/**
 * パネル内画像パンの開始
 */
function startLegendImagePan(e) {
    const container = document.getElementById('legendZoomContainer');
    if (!container) return;

    legendImagePanning = true;
    legendImageStartX = e.clientX;
    legendImageStartY = e.clientY;
    legendImageStartPosX = legendImagePosX;
    legendImageStartPosY = legendImagePosY;
    container.style.cursor = 'grabbing';
    e.preventDefault();
}

/**
 * パネル内画像パンの処理
 */
function handleLegendImagePan(e) {
    if (!legendImagePanning) return;

    const dx = e.clientX - legendImageStartX;
    const dy = e.clientY - legendImageStartY;

    legendImagePosX = legendImageStartPosX + dx;
    legendImagePosY = legendImageStartPosY + dy;

    updateLegendImagePosition();
}

/**
 * パネル内画像パンの終了
 */
function endLegendImagePan() {
    legendImagePanning = false;
    const container = document.getElementById('legendZoomContainer');
    if (container) {
        container.style.cursor = 'grab';
    }
}

/**
 * 凡例画像の位置を更新
 */
function updateLegendImagePosition() {
    const img = document.getElementById('legendZoomImage');
    if (img) {
        img.style.left = legendImagePosX + 'px';
        img.style.top = legendImagePosY + 'px';
    }
}

/**
 * 凡例画像のズーム（ボタン用、中央基点）
 */
function zoomLegendImage(delta) {
    const container = document.getElementById('legendZoomContainer');
    if (!container) {
        legendImageZoom = Math.max(0.1, Math.min(5, legendImageZoom + delta));
        updateLegendImageZoom();
        return;
    }

    // コンテナの中央を基点にズーム
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    zoomLegendImageAtPoint(delta, centerX, centerY);
}

/**
 * 凡例画像のズーム（指定ポイントを中心に）
 */
function zoomLegendImageAtPoint(delta, clientX, clientY) {
    const container = document.getElementById('legendZoomContainer');
    const img = document.getElementById('legendZoomImage');
    if (!container || !img || legendImageNaturalWidth === 0) return;

    // 現在のズーム前の状態を保存
    const oldZoom = legendImageZoom;
    const newZoom = Math.max(0.1, Math.min(5, legendImageZoom + delta));

    if (oldZoom === newZoom) return;

    // コンテナ内でのマウス位置
    const rect = container.getBoundingClientRect();
    const mouseXInContainer = clientX - rect.left;
    const mouseYInContainer = clientY - rect.top;

    // マウス位置が画像上のどの位置を指しているか（画像の左上からの相対位置）
    const imageX = (mouseXInContainer - legendImagePosX) / oldZoom;
    const imageY = (mouseYInContainer - legendImagePosY) / oldZoom;

    // ズームを適用
    legendImageZoom = newZoom;
    updateLegendImageZoom();

    // ズーム後、同じ画像上の位置がマウスの下に来るように位置を調整
    legendImagePosX = mouseXInContainer - imageX * newZoom;
    legendImagePosY = mouseYInContainer - imageY * newZoom;
    updateLegendImagePosition();
}

/**
 * 凡例画像のズームをリセット（等倍）
 */
function resetLegendImageZoom() {
    const container = document.getElementById('legendZoomContainer');
    if (!container) return;

    legendImageZoom = 1;
    updateLegendImageZoom();

    // 画像を中央に配置
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgWidth = legendImageNaturalWidth * legendImageZoom;
    const imgHeight = legendImageNaturalHeight * legendImageZoom;

    legendImagePosX = (containerWidth - imgWidth) / 2;
    legendImagePosY = (containerHeight - imgHeight) / 2;
    updateLegendImagePosition();
}

/**
 * 凡例画像をコンテナにフィット
 */
function fitLegendImage() {
    const container = document.getElementById('legendZoomContainer');
    const img = document.getElementById('legendZoomImage');
    if (!container || !img) return;

    // コンテナと画像のサイズを取得
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // 画像の自然サイズ
    const imgWidth = legendImageNaturalWidth || img.naturalWidth || img.width;
    const imgHeight = legendImageNaturalHeight || img.naturalHeight || img.height;

    if (imgWidth === 0 || imgHeight === 0) return;

    // フィットするズーム倍率を計算
    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    legendImageZoom = Math.min(scaleX, scaleY) * 0.95; // 少し余白を持たせる

    updateLegendImageZoom();

    // 画像を中央に配置
    const scaledWidth = imgWidth * legendImageZoom;
    const scaledHeight = imgHeight * legendImageZoom;
    legendImagePosX = (containerWidth - scaledWidth) / 2;
    legendImagePosY = (containerHeight - scaledHeight) / 2;
    updateLegendImagePosition();
}

/**
 * 凡例画像のズーム状態を適用
 */
function updateLegendImageZoom() {
    const img = document.getElementById('legendZoomImage');
    const zoomLevel = document.getElementById('legendZoomLevel');

    if (img && legendImageNaturalWidth > 0 && legendImageNaturalHeight > 0) {
        // transformではなく、width/heightを直接設定してスクロール可能にする
        img.style.width = (legendImageNaturalWidth * legendImageZoom) + 'px';
        img.style.height = (legendImageNaturalHeight * legendImageZoom) + 'px';
    }
    if (zoomLevel) {
        zoomLevel.textContent = `${Math.round(legendImageZoom * 100)}%`;
    }
}

/**
 * 凡例画像ズームモードを終了
 */
function exitLegendImageZoom() {
    const zoomControls = document.getElementById('legendZoomControls');
    zoomControls.classList.add('hidden');

    // 元の凡例表示に戻る
    if (currentLegendLayerId === 'seamless') {
        showSeamlessLegend();
    } else if (currentLegendLayerId && activeLayers.has(currentLegendLayerId)) {
        const layerInfo = activeLayers.get(currentLegendLayerId);
        showLegend(currentLegendLayerId, layerInfo.data);
    }

    currentLegendImage = null;
}

/**
 * マークダウン記法を除去してプレーンテキストに変換
 */
function stripMarkdown(text) {
    if (!text) return '';
    return text
        // **ラベル**: 形式を除去（名称:, 著者: など）
        .replace(/\*\*[^*]+\*\*:\s*/g, '')
        // **太字** を内容のみに
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        // *斜体* を内容のみに
        .replace(/\*([^*]+)\*/g, '$1')
        // [リンクテキスト](URL) を除去
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '')
        // (URL) 形式を除去
        .replace(/\(https?:\/\/[^)]+\)/g, '')
        // 残りのURL（https://...）を除去
        .replace(/https?:\/\/[^\s]+/g, '')
        // 見出し # を除去
        .replace(/^#{1,6}\s+/gm, '')
        // インラインコード ` を除去
        .replace(/`([^`]+)`/g, '$1')
        // 連続するスペースを1つに
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * テキストをクリップボードにコピー
 */
function copyToClipboard(text, buttonEl) {
    navigator.clipboard.writeText(text).then(() => {
        // コピー成功のフィードバック
        const originalText = buttonEl.textContent;
        buttonEl.textContent = '✓';
        buttonEl.classList.add('copied');
        setTimeout(() => {
            buttonEl.textContent = originalText;
            buttonEl.classList.remove('copied');
        }, 1500);
    }).catch(err => {
        console.error('コピーに失敗:', err);
        // フォールバック: execCommand
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);

        const originalText = buttonEl.textContent;
        buttonEl.textContent = '✓';
        buttonEl.classList.add('copied');
        setTimeout(() => {
            buttonEl.textContent = originalText;
            buttonEl.classList.remove('copied');
        }, 1500);
    });
}

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', init);
