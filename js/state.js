/**
 * グローバル状態管理モジュール
 */

// 地図関連状態
let map = null;
let seamlessLayer = null;
let activeLayers = new Map(); // layerId -> { layer, data, legendData }
let searchResults = [];
let currentLegendLayerId = null;
let seamlessLegendData = null;
let hoverPreviewLayer = null;

// 画像ビューア状態
export const viewerState = {
    zoom: 1,
    panning: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0
};

// 凡例パネル内画像ズーム状態
export const legendImageState = {
    zoom: 1,
    panning: false,
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
    startPosX: 0,
    startPosY: 0,
    currentImage: null,
    naturalWidth: 0,
    naturalHeight: 0
};

// 右サイドバーリサイズ状態
export const sidebarResizeState = {
    resizing: false,
    startX: 0,
    startWidth: 0
};

// Getters
export function getMap() {
    return map;
}

export function getSeamlessLayer() {
    return seamlessLayer;
}

export function getActiveLayers() {
    return activeLayers;
}

export function getSearchResults() {
    return searchResults;
}

export function getCurrentLegendLayerId() {
    return currentLegendLayerId;
}

export function getSeamlessLegendData() {
    return seamlessLegendData;
}

export function getHoverPreviewLayer() {
    return hoverPreviewLayer;
}

// Setters
export function setMap(value) {
    map = value;
}

export function setSeamlessLayer(value) {
    seamlessLayer = value;
}

export function setSearchResults(value) {
    searchResults = value;
}

export function setCurrentLegendLayerId(value) {
    currentLegendLayerId = value;
}

export function setSeamlessLegendData(value) {
    seamlessLegendData = value;
}

export function setHoverPreviewLayer(value) {
    hoverPreviewLayer = value;
}
