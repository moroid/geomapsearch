/**
 * モバイルUI管理モジュール
 *
 * スマートフォン向けのUI操作を管理する
 */

import { getMap } from './state.js';
import { toggleSeamlessLayer, updateSeamlessOpacity } from './layers.js';
import { showSeamlessLegend } from './legend.js';

// モバイル判定の閾値
const MOBILE_BREAKPOINT = 768;

// 現在アクティブなパネル
let activePanel = 'search';

// ボトムシートの状態
let bottomSheetMinimized = false;
let currentSheetHeight = 45; // vh単位

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
    initBottomSheet();
    initMobileSeamlessControls();

    // ウィンドウリサイズ時の処理
    window.addEventListener('resize', handleResize);

    // モバイルの場合は地図のサイズ調整
    if (isMobile()) {
        setTimeout(() => {
            const map = getMap();
            if (map) {
                map.invalidateSize();
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
        map.invalidateSize();
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
 * ボトムシートの初期化
 */
function initBottomSheet() {
    const bottomSheet = document.getElementById('mobileBottomSheet');
    const handle = bottomSheet?.querySelector('.bottom-sheet-handle');
    const content = bottomSheet?.querySelector('.bottom-sheet-content');
    const searchBtn = document.getElementById('mobileSearchBtn');

    if (!bottomSheet || !handle) return;

    let startY = 0;
    let startHeight = 0;
    let isDragging = false;

    const updateSearchBtnPosition = (height) => {
        if (searchBtn) {
            const navHeight = 56;
            searchBtn.style.bottom = `calc(${navHeight}px + ${height}vh + 10px)`;
        }
    };

    // タッチ操作でのドラッグ
    handle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        startHeight = currentSheetHeight;
        isDragging = true;
        bottomSheet.style.transition = 'none';
    }, { passive: true });

    handle.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        const currentY = e.touches[0].clientY;
        const diffPx = startY - currentY;
        const diffVh = (diffPx / window.innerHeight) * 100;

        // 高さを計算（5vh〜70vhの範囲）
        let newHeight = Math.max(5, Math.min(70, startHeight + diffVh));
        currentSheetHeight = newHeight;

        bottomSheet.style.maxHeight = `${newHeight}vh`;
        if (content) {
            content.style.maxHeight = `calc(${newHeight}vh - 24px)`;
        }
        updateSearchBtnPosition(newHeight);
    }, { passive: true });

    handle.addEventListener('touchend', () => {
        isDragging = false;
        bottomSheet.style.transition = 'max-height 0.3s ease';

        // 小さすぎたら最小化、大きすぎたら制限
        if (currentSheetHeight < 10) {
            minimizeBottomSheet();
        } else {
            bottomSheetMinimized = false;
            bottomSheet.classList.remove('minimized');
        }
    });

    // タップで表示/最小化切り替え
    let tapStartTime = 0;
    handle.addEventListener('touchstart', () => {
        tapStartTime = Date.now();
    }, { passive: true });

    handle.addEventListener('touchend', (e) => {
        const tapDuration = Date.now() - tapStartTime;
        const moved = Math.abs(startY - e.changedTouches[0].clientY) > 10;

        // 短いタップでドラッグしていない場合のみトグル
        if (tapDuration < 200 && !moved) {
            if (bottomSheetMinimized) {
                showBottomSheet();
            } else {
                minimizeBottomSheet();
            }
        }
    });
}

/**
 * ボトムシートを表示
 */
function showBottomSheet() {
    const bottomSheet = document.getElementById('mobileBottomSheet');
    const content = bottomSheet?.querySelector('.bottom-sheet-content');
    const searchBtn = document.getElementById('mobileSearchBtn');

    if (bottomSheet) {
        bottomSheet.classList.remove('minimized');
        currentSheetHeight = 45;
        bottomSheet.style.maxHeight = `${currentSheetHeight}vh`;
        if (content) {
            content.style.maxHeight = `calc(${currentSheetHeight}vh - 24px)`;
        }
        if (searchBtn) {
            searchBtn.style.bottom = `calc(56px + ${currentSheetHeight}vh + 10px)`;
        }
        bottomSheetMinimized = false;
    }
}

/**
 * ボトムシートを最小化
 */
function minimizeBottomSheet() {
    const bottomSheet = document.getElementById('mobileBottomSheet');
    const searchBtn = document.getElementById('mobileSearchBtn');

    if (bottomSheet) {
        bottomSheet.classList.add('minimized');
        currentSheetHeight = 0;
        if (searchBtn) {
            searchBtn.style.bottom = `calc(56px + 20px)`;
        }
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
