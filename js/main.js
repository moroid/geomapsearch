/**
 * 産総研 地質図検索ビューア
 *
 * 地質調査総合センターが公開している地質図をLeaflet上で検索・表示するアプリケーション
 *
 * エントリーポイント
 */

import { initMap } from './mapCore.js';
import { searchGeologicalMaps } from './search.js';
import { toggleSeamlessLayer, updateSeamlessOpacity } from './layers.js';
import {
    showSeamlessLegend,
    closeLegendSidebar,
    openLegendSidebar,
    initLegendSidebarResize,
    initLegendZoomControls,
    initImageViewer,
    openLegendImageZoom
} from './legend.js';
import { copyToClipboard } from './utils.js';
import { initMobileUI } from './mobile.js';

/**
 * 初期化
 */
function init() {
    initMap();
    initEventListeners();
    initMobileUI();
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

// HTMLのonclickハンドラ用にグローバルに公開
window.copyToClipboard = copyToClipboard;
window.showSeamlessLegend = showSeamlessLegend;
window.openLegendImageZoom = openLegendImageZoom;
window.searchGeologicalMaps = searchGeologicalMaps;

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', init);
