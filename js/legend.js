/**
 * 凡例表示モジュール
 */

import { SEAMLESS_LEGEND_URL } from './config.js';
import {
    getMap,
    getActiveLayers,
    getCurrentLegendLayerId,
    setCurrentLegendLayerId,
    viewerState,
    legendImageState,
    sidebarResizeState
} from './state.js';
import { stripMarkdown, escapeHtml } from './utils.js';

/**
 * 凡例を表示
 */
export async function showLegend(layerId, mapData) {
    const sidebar = document.getElementById('legendSidebar');
    const content = document.getElementById('legendContent');
    const titleEl = document.getElementById('legendTitle');
    const toggleBtn = document.getElementById('legendSidebarToggle');

    // サイドバーを表示、トグルボタンを非表示
    sidebar.classList.remove('hidden');
    toggleBtn.classList.add('hidden');
    setCurrentLegendLayerId(layerId);

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
                <a href="${mapData.pdfUrl}" target="_blank" rel="noopener noreferrer" class="legend-link">
                    📄 説明書（PDF）を開く
                </a>
            `;
        }

        // GeoTIFFダウンロードリンク
        if (mapData.geotiffUrl) {
            legendHtml += `
                <a href="${mapData.geotiffUrl}" target="_blank" rel="noopener noreferrer" class="legend-link" download>
                    🗺️ GeoTIFFをダウンロード
                </a>
            `;
        }

        // CKANページへのリンク
        legendHtml += `
            <a href="https://data.gsj.jp/gkan/dataset/${mapData.name}" target="_blank" rel="noopener noreferrer" class="legend-link">
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
                <a href="https://data.gsj.jp/gkan/dataset/${mapData.name}" target="_blank" rel="noopener noreferrer" class="legend-link">
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
            <a href="https://data.gsj.jp/gkan/dataset/${mapData.name}" target="_blank" rel="noopener noreferrer" class="legend-link">
                🔗 詳細ページを開く（CKAN）
            </a>
        `;
    }
}

/**
 * シームレス地質図の凡例を表示
 */
export async function showSeamlessLegend() {
    const sidebar = document.getElementById('legendSidebar');
    const content = document.getElementById('legendContent');
    const titleEl = document.getElementById('legendTitle');
    const toggleBtn = document.getElementById('legendSidebarToggle');

    // サイドバーを表示、トグルボタンを非表示
    sidebar.classList.remove('hidden');
    toggleBtn.classList.add('hidden');
    setCurrentLegendLayerId('seamless');

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
            <a href="https://gbank.gsj.jp/seamless/v2/api/1.3/legend.html" target="_blank" rel="noopener noreferrer" class="legend-link">
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
            <a href="https://gbank.gsj.jp/seamless/v2/api/1.3/legend.html" target="_blank" rel="noopener noreferrer" class="legend-link">
                🔗 凡例ページを開く
            </a>
        `;
    }
}

/**
 * 表示範囲内のシームレス地質図凡例を直接取得
 */
async function getVisibleSeamlessLegend() {
    const map = getMap();
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
export function closeLegendSidebar() {
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
export function openLegendSidebar() {
    const sidebar = document.getElementById('legendSidebar');
    const toggleBtn = document.getElementById('legendSidebarToggle');

    sidebar.classList.remove('hidden');
    toggleBtn.classList.add('hidden');
}

/**
 * 凡例サイドバーリサイズ機能の初期化
 */
export function initLegendSidebarResize() {
    const handle = document.getElementById('legendResizeHandle');
    const sidebar = document.getElementById('legendSidebar');

    handle.addEventListener('mousedown', (e) => {
        sidebarResizeState.resizing = true;
        sidebarResizeState.startX = e.clientX;
        sidebarResizeState.startWidth = sidebar.offsetWidth;
        handle.classList.add('active');
        document.body.style.cursor = 'ew-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!sidebarResizeState.resizing) return;

        const dx = sidebarResizeState.startX - e.clientX;
        const newWidth = Math.max(280, Math.min(window.innerWidth * 0.6, sidebarResizeState.startWidth + dx));
        sidebar.style.width = newWidth + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (sidebarResizeState.resizing) {
            sidebarResizeState.resizing = false;
            handle.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

/**
 * 画像ビューアの初期化
 */
export function initImageViewer() {
    const viewer = document.getElementById('imageViewer');
    const content = document.getElementById('imageViewerContent');

    // 要素が存在しない場合はスキップ
    if (!viewer || !content) return;

    // 閉じるボタン
    const closeViewerBtn = document.getElementById('closeViewerBtn');
    if (closeViewerBtn) {
        closeViewerBtn.addEventListener('click', closeImageViewer);
    }

    // ズームボタン
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const zoomResetBtn = document.getElementById('zoomResetBtn');

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => zoomImage(0.25));
    }
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => zoomImage(-0.25));
    }
    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', resetImageZoom);
    }

    // マウスホイールでズーム
    content.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        zoomImage(delta);
    });

    // ドラッグでパン
    content.addEventListener('mousedown', (e) => {
        viewerState.panning = true;
        viewerState.startX = e.pageX - content.offsetLeft;
        viewerState.startY = e.pageY - content.offsetTop;
        viewerState.scrollLeft = content.scrollLeft;
        viewerState.scrollTop = content.scrollTop;
        content.style.cursor = 'grabbing';
    });

    content.addEventListener('mousemove', (e) => {
        if (!viewerState.panning) return;
        e.preventDefault();
        const x = e.pageX - content.offsetLeft;
        const y = e.pageY - content.offsetTop;
        const walkX = (x - viewerState.startX) * 1.5;
        const walkY = (y - viewerState.startY) * 1.5;
        content.scrollLeft = viewerState.scrollLeft - walkX;
        content.scrollTop = viewerState.scrollTop - walkY;
    });

    content.addEventListener('mouseup', () => {
        viewerState.panning = false;
        content.style.cursor = 'grab';
    });

    content.addEventListener('mouseleave', () => {
        viewerState.panning = false;
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

    image.src = src;
    titleEl.textContent = title || '凡例';

    viewerState.zoom = 1;
    updateImageZoom();

    viewer.classList.remove('hidden');

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
    viewerState.zoom = Math.max(0.1, Math.min(5, viewerState.zoom + delta));
    updateImageZoom();
}

/**
 * ズームをリセット
 */
function resetImageZoom() {
    viewerState.zoom = 1;
    updateImageZoom();
}

/**
 * ズーム状態を画像に適用
 */
function updateImageZoom() {
    const image = document.getElementById('viewerImage');
    const zoomLevel = document.getElementById('zoomLevel');

    image.style.transform = `scale(${viewerState.zoom})`;
    zoomLevel.textContent = `${Math.round(viewerState.zoom * 100)}%`;
}

/**
 * 凡例サイドバー内画像ズームコントロールの初期化
 */
export function initLegendZoomControls() {
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
    if (!legendImageState.currentImage) {
        console.warn('ダウンロードする画像がありません');
        return;
    }

    fetch(legendImageState.currentImage)
        .then(response => {
            if (!response.ok) throw new Error('画像の取得に失敗');
            return response.blob();
        })
        .then(blob => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const titleEl = document.getElementById('legendTitle');
            const title = titleEl ? titleEl.textContent.replace(/[\\/:*?"<>|]/g, '_') : 'legend';
            const ext = legendImageState.currentImage.match(/\.(png|jpg|jpeg|gif|webp)/i)?.[1] || 'png';
            a.download = `${title}_凡例.${ext}`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
        .catch(error => {
            console.error('ダウンロードエラー:', error);
            window.open(legendImageState.currentImage, '_blank');
        });
}

/**
 * 凡例画像をズームモードで表示（パネル内拡大）
 */
export function openLegendImageZoom(imgElement) {
    const content = document.getElementById('legendContent');
    const zoomControls = document.getElementById('legendZoomControls');

    legendImageState.currentImage = imgElement.src;

    content.innerHTML = `
        <div class="legend-zoom-mode">
            <div class="legend-zoom-container" id="legendZoomContainer">
                <img src="${legendImageState.currentImage}" alt="凡例" id="legendZoomImage" />
            </div>
        </div>
    `;

    zoomControls.classList.remove('hidden');

    const container = document.getElementById('legendZoomContainer');
    const img = document.getElementById('legendZoomImage');

    container.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        zoomLegendImageAtPoint(delta, e.clientX, e.clientY);
    });

    container.addEventListener('mousedown', startLegendImagePan);
    container.addEventListener('mousemove', handleLegendImagePan);
    container.addEventListener('mouseup', endLegendImagePan);
    container.addEventListener('mouseleave', endLegendImagePan);

    img.onload = () => {
        legendImageState.naturalWidth = img.naturalWidth;
        legendImageState.naturalHeight = img.naturalHeight;
        legendImageState.posX = 0;
        legendImageState.posY = 0;
        fitLegendImage();
    };
}

/**
 * パネル内画像パンの開始
 */
function startLegendImagePan(e) {
    const container = document.getElementById('legendZoomContainer');
    if (!container) return;

    legendImageState.panning = true;
    legendImageState.startX = e.clientX;
    legendImageState.startY = e.clientY;
    legendImageState.startPosX = legendImageState.posX;
    legendImageState.startPosY = legendImageState.posY;
    container.style.cursor = 'grabbing';
    e.preventDefault();
}

/**
 * パネル内画像パンの処理
 */
function handleLegendImagePan(e) {
    if (!legendImageState.panning) return;

    const dx = e.clientX - legendImageState.startX;
    const dy = e.clientY - legendImageState.startY;

    legendImageState.posX = legendImageState.startPosX + dx;
    legendImageState.posY = legendImageState.startPosY + dy;

    updateLegendImagePosition();
}

/**
 * パネル内画像パンの終了
 */
function endLegendImagePan() {
    legendImageState.panning = false;
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
        img.style.left = legendImageState.posX + 'px';
        img.style.top = legendImageState.posY + 'px';
    }
}

/**
 * 凡例画像のズーム（ボタン用、中央基点）
 */
function zoomLegendImage(delta) {
    const container = document.getElementById('legendZoomContainer');
    if (!container) {
        legendImageState.zoom = Math.max(0.1, Math.min(5, legendImageState.zoom + delta));
        updateLegendImageZoom();
        return;
    }

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
    if (!container || !img || legendImageState.naturalWidth === 0) return;

    const oldZoom = legendImageState.zoom;
    const newZoom = Math.max(0.1, Math.min(5, legendImageState.zoom + delta));

    if (oldZoom === newZoom) return;

    const rect = container.getBoundingClientRect();
    const mouseXInContainer = clientX - rect.left;
    const mouseYInContainer = clientY - rect.top;

    const imageX = (mouseXInContainer - legendImageState.posX) / oldZoom;
    const imageY = (mouseYInContainer - legendImageState.posY) / oldZoom;

    legendImageState.zoom = newZoom;
    updateLegendImageZoom();

    legendImageState.posX = mouseXInContainer - imageX * newZoom;
    legendImageState.posY = mouseYInContainer - imageY * newZoom;
    updateLegendImagePosition();
}

/**
 * 凡例画像のズームをリセット（等倍）
 */
function resetLegendImageZoom() {
    const container = document.getElementById('legendZoomContainer');
    if (!container) return;

    legendImageState.zoom = 1;
    updateLegendImageZoom();

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgWidth = legendImageState.naturalWidth * legendImageState.zoom;
    const imgHeight = legendImageState.naturalHeight * legendImageState.zoom;

    legendImageState.posX = (containerWidth - imgWidth) / 2;
    legendImageState.posY = (containerHeight - imgHeight) / 2;
    updateLegendImagePosition();
}

/**
 * 凡例画像をコンテナにフィット
 */
function fitLegendImage() {
    const container = document.getElementById('legendZoomContainer');
    const img = document.getElementById('legendZoomImage');
    if (!container || !img) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const imgWidth = legendImageState.naturalWidth || img.naturalWidth || img.width;
    const imgHeight = legendImageState.naturalHeight || img.naturalHeight || img.height;

    if (imgWidth === 0 || imgHeight === 0) return;

    const scaleX = containerWidth / imgWidth;
    const scaleY = containerHeight / imgHeight;
    legendImageState.zoom = Math.min(scaleX, scaleY) * 0.95;

    updateLegendImageZoom();

    const scaledWidth = imgWidth * legendImageState.zoom;
    const scaledHeight = imgHeight * legendImageState.zoom;
    legendImageState.posX = (containerWidth - scaledWidth) / 2;
    legendImageState.posY = (containerHeight - scaledHeight) / 2;
    updateLegendImagePosition();
}

/**
 * 凡例画像のズーム状態を適用
 */
function updateLegendImageZoom() {
    const img = document.getElementById('legendZoomImage');
    const zoomLevel = document.getElementById('legendZoomLevel');

    if (img && legendImageState.naturalWidth > 0 && legendImageState.naturalHeight > 0) {
        img.style.width = (legendImageState.naturalWidth * legendImageState.zoom) + 'px';
        img.style.height = (legendImageState.naturalHeight * legendImageState.zoom) + 'px';
    }
    if (zoomLevel) {
        zoomLevel.textContent = `${Math.round(legendImageState.zoom * 100)}%`;
    }
}

/**
 * 凡例画像ズームモードを終了
 */
function exitLegendImageZoom() {
    const zoomControls = document.getElementById('legendZoomControls');
    zoomControls.classList.add('hidden');

    const currentLegendLayerId = getCurrentLegendLayerId();
    const activeLayers = getActiveLayers();

    // 元の凡例表示に戻る
    if (currentLegendLayerId === 'seamless') {
        showSeamlessLegend();
    } else if (currentLegendLayerId && activeLayers.has(currentLegendLayerId)) {
        const layerInfo = activeLayers.get(currentLegendLayerId);
        showLegend(currentLegendLayerId, layerInfo.data);
    }

    legendImageState.currentImage = null;
}
