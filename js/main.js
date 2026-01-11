/**
 * 産総研 地質図検索ビューア
 *
 * 地質調査総合センターが公開している地質図をLeaflet上で検索・表示するアプリケーション
 *
 * エントリーポイント
 */

import { initMap } from './mapCore.js';
import { searchGeologicalMaps } from './search.js';
import { toggleSeamlessLayer, updateSeamlessOpacity, toggleMacrostratLayer, updateMacrostratOpacity } from './layers.js';
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
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', searchGeologicalMaps);
    }

    // シームレス地質図トグル
    const seamlessToggle = document.getElementById('seamlessToggle');
    if (seamlessToggle) {
        seamlessToggle.addEventListener('change', toggleSeamlessLayer);
    }

    // シームレス地質図透明度
    const seamlessOpacity = document.getElementById('seamlessOpacity');
    if (seamlessOpacity) {
        seamlessOpacity.addEventListener('input', updateSeamlessOpacity);
    }

    // シームレス地質図凡例ボタン
    const seamlessLegendBtn = document.getElementById('seamlessLegendBtn');
    if (seamlessLegendBtn) {
        seamlessLegendBtn.addEventListener('click', showSeamlessLegend);
    }

    // Macrostrat（世界の地質図）トグル
    const macrostratToggle = document.getElementById('macrostratToggle');
    if (macrostratToggle) {
        macrostratToggle.addEventListener('change', toggleMacrostratLayer);
    }

    // Macrostrat透明度
    const macrostratOpacity = document.getElementById('macrostratOpacity');
    if (macrostratOpacity) {
        macrostratOpacity.addEventListener('input', updateMacrostratOpacity);
    }

    // 凡例サイドバー閉じるボタン
    const closeLegendBtn = document.getElementById('closeLegendBtn');
    if (closeLegendBtn) {
        closeLegendBtn.addEventListener('click', closeLegendSidebar);
    }

    // 凡例サイドバー開くボタン
    const legendSidebarToggle = document.getElementById('legendSidebarToggle');
    if (legendSidebarToggle) {
        legendSidebarToggle.addEventListener('click', openLegendSidebar);
    }

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
