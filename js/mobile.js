/**
 * モバイルUI管理モジュール
 *
 * スマートフォン向けのUI操作を管理する
 */

import { getMap } from './state.js';
import { searchGeologicalMaps } from './search.js';
import { toggleSeamlessLayer, updateSeamlessOpacity } from './layers.js';
import { showSeamlessLegend, openLegendSidebar } from './legend.js';

// モバイル判定の閾値
const MOBILE_BREAKPOINT = 768;

// 現在アクティブなパネル
let activePanel = 'search';

// ボトムシートの状態
let bottomSheetState = 'collapsed'; // 'collapsed' | 'expanded' | 'minimized'

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
    if (!isMobile()) return;

    initMobileNavigation();
    initMobileSearchButton();
    initMobileMenuButton();
    initBottomSheet();
    initMobileSeamlessControls();
    initMobileOverlay();

    // ウィンドウリサイズ時の処理
    window.addEventListener('resize', handleResize);

    // 地図のサイズ調整
    setTimeout(() => {
        const map = getMap();
        if (map) {
            map.invalidateSize();
        }
    }, 100);
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

            // ボトムシートを展開
            expandBottomSheet();
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

    // 凡例パネルの場合は凡例サイドバーを開く
    if (panelName === 'legend') {
        openLegendSidebar();
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
            searchGeologicalMaps();
            // 検索後にボトムシートを展開して検索パネルを表示
            switchPanel('search');
            expandBottomSheet();

            // ナビのアクティブ状態を更新
            const navItems = document.querySelectorAll('.mobile-nav-item');
            navItems.forEach(item => {
                item.classList.toggle('active', item.dataset.panel === 'search');
            });
        });
    }
}

/**
 * モバイルメニューボタンの初期化
 */
function initMobileMenuButton() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('mobileOverlay');

    if (mobileMenuBtn && sidebar) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('mobile-open');
            overlay?.classList.toggle('active');

            // アイコンを切り替え
            const icon = mobileMenuBtn.querySelector('i');
            if (sidebar.classList.contains('mobile-open')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
}

/**
 * ボトムシートの初期化
 */
function initBottomSheet() {
    const bottomSheet = document.getElementById('mobileBottomSheet');
    const handle = bottomSheet?.querySelector('.bottom-sheet-handle');

    if (!bottomSheet || !handle) return;

    let startY = 0;
    let startTransform = 0;

    // タッチ操作でのドラッグ
    handle.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
        const transform = getComputedStyle(bottomSheet).transform;
        if (transform !== 'none') {
            const matrix = new DOMMatrix(transform);
            startTransform = matrix.m42;
        }
        bottomSheet.style.transition = 'none';
    });

    handle.addEventListener('touchmove', (e) => {
        const currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        const newTransform = Math.max(0, startTransform + diff);
        bottomSheet.style.transform = `translateY(${newTransform}px)`;
    });

    handle.addEventListener('touchend', (e) => {
        bottomSheet.style.transition = 'transform 0.3s ease';
        const currentY = e.changedTouches[0].clientY;
        const diff = currentY - startY;

        if (diff > 50) {
            // 下にスワイプ -> 折りたたむ
            collapseBottomSheet();
        } else if (diff < -50) {
            // 上にスワイプ -> 展開
            expandBottomSheet();
        } else {
            // 元の状態に戻す
            if (bottomSheetState === 'expanded') {
                expandBottomSheet();
            } else {
                collapseBottomSheet();
            }
        }
    });

    // タップで展開/折りたたみ切り替え
    handle.addEventListener('click', () => {
        if (bottomSheetState === 'expanded') {
            collapseBottomSheet();
        } else {
            expandBottomSheet();
        }
    });
}

/**
 * ボトムシートを展開
 */
function expandBottomSheet() {
    const bottomSheet = document.getElementById('mobileBottomSheet');
    if (bottomSheet) {
        bottomSheet.classList.add('expanded');
        bottomSheet.classList.remove('minimized');
        bottomSheet.style.transform = '';
        bottomSheetState = 'expanded';
    }
}

/**
 * ボトムシートを折りたたむ
 */
function collapseBottomSheet() {
    const bottomSheet = document.getElementById('mobileBottomSheet');
    if (bottomSheet) {
        bottomSheet.classList.remove('expanded');
        bottomSheet.classList.remove('minimized');
        bottomSheet.style.transform = '';
        bottomSheetState = 'collapsed';
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
 * モバイルオーバーレイの初期化
 */
function initMobileOverlay() {
    const overlay = document.getElementById('mobileOverlay');
    const sidebar = document.getElementById('sidebar');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');

    if (overlay) {
        overlay.addEventListener('click', () => {
            // サイドバーを閉じる
            sidebar?.classList.remove('mobile-open');
            overlay.classList.remove('active');

            // メニューボタンのアイコンを戻す
            const icon = mobileMenuBtn?.querySelector('i');
            if (icon) {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
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
