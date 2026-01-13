/**
 * 地質情報ポップアップモジュール（MapLibre GL JS 5）
 * 地図クリック時に地質情報を取得してポップアップで表示
 */

import { SEAMLESS_LEGEND_URL, MACROSTRAT_API_URL } from './config.js';
import { getMap, getSeamlessLayer, getMacrostratLayer } from './state.js';

// 現在表示中のポップアップ
let currentPopup = null;

/**
 * 地質情報ポップアップ機能を初期化
 */
export function initGeologyPopup() {
    const map = getMap();
    if (!map) return;

    // 地図の読み込みが完了してからイベントハンドラを設定
    if (map.isStyleLoaded()) {
        map.on('click', handleMapClick);
    } else {
        map.on('load', () => {
            map.on('click', handleMapClick);
        });
    }
}

/**
 * 地図クリック時のハンドラ
 */
async function handleMapClick(e) {
    const map = getMap();
    const seamlessLayer = getSeamlessLayer();
    const macrostratLayer = getMacrostratLayer();

    // どちらのレイヤーも表示されていない場合は何もしない
    if (!seamlessLayer && !macrostratLayer) {
        return;
    }

    const lat = e.lngLat.lat;
    const lng = e.lngLat.lng;

    // 既存のポップアップを閉じる
    if (currentPopup) {
        currentPopup.remove();
    }

    // ローディングポップアップを表示
    currentPopup = new maplibregl.Popup({
        closeOnClick: true,
        maxWidth: '320px'
    })
        .setLngLat([lng, lat])
        .setHTML('<div class="geology-popup-loading"><span class="loading"></span> 地質情報を取得中...</div>')
        .addTo(map);

    try {
        // 並行してAPIを呼び出し
        const promises = [];

        if (seamlessLayer) {
            promises.push(fetchSeamlessGeology(lat, lng).then(data => ({ type: 'seamless', data })));
        }

        if (macrostratLayer) {
            promises.push(fetchMacrostratGeology(lat, lng).then(data => ({ type: 'macrostrat', data })));
        }

        const results = await Promise.allSettled(promises);
        console.log('API呼び出し結果:', results);

        // 結果を整理
        let seamlessData = null;
        let macrostratData = null;

        results.forEach(result => {
            console.log('result:', result);
            if (result.status === 'fulfilled' && result.value && result.value.data) {
                if (result.value.type === 'seamless') {
                    seamlessData = result.value.data;
                    console.log('seamlessData取得成功:', seamlessData);
                } else if (result.value.type === 'macrostrat') {
                    macrostratData = result.value.data;
                    console.log('macrostratData取得成功:', macrostratData);
                }
            }
        });

        // ポップアップの内容を生成
        const content = generatePopupContent(lat, lng, seamlessData, macrostratData);

        // ポップアップがまだ存在するか確認
        if (currentPopup) {
            currentPopup.setHTML(content);
        }

    } catch (error) {
        console.error('地質情報取得エラー:', error);
        if (currentPopup) {
            currentPopup.setHTML('<div class="geology-popup-error">地質情報の取得に失敗しました</div>');
        }
    }
}

/**
 * シームレス地質図の地質情報を取得
 */
async function fetchSeamlessGeology(lat, lng) {
    try {
        // 日本の範囲外の場合はスキップ
        if (lat < 20 || lat > 46 || lng < 122 || lng > 154) {
            console.log('シームレス: 日本の範囲外');
            return null;
        }

        const url = `${SEAMLESS_LEGEND_URL}?point=${lat},${lng}`;
        console.log('シームレスAPI URL:', url);
        const response = await fetch(url);

        if (!response.ok) {
            console.warn('シームレスAPI レスポンスエラー:', response.status);
            return null;
        }

        const data = await response.json();
        console.log('シームレスAPI レスポンス:', data);
        console.log('シームレスAPI レスポンス型:', typeof data, Array.isArray(data));

        // レスポンスが空の場合
        if (!data) {
            console.log('シームレス: データなし（null/undefined）');
            return null;
        }

        // 配列の場合
        if (Array.isArray(data)) {
            if (data.length === 0) {
                console.log('シームレス: データなし（空配列）');
                return null;
            }
            console.log('シームレス地質データ（配列）:', data[0]);
            return data[0];
        }

        // オブジェクトの場合（単一の地質データ）
        if (typeof data === 'object') {
            console.log('シームレス地質データ（オブジェクト）:', data);
            return data;
        }

        console.log('シームレス: 予期しないデータ形式');
        return null;

    } catch (error) {
        console.warn('シームレス地質図API エラー:', error);
        return null;
    }
}

/**
 * Macrostrat地質情報を取得
 */
async function fetchMacrostratGeology(lat, lng) {
    try {
        const url = `${MACROSTRAT_API_URL}?lat=${lat}&lng=${lng}`;
        const response = await fetch(url);

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        // レスポンス形式に応じて解析
        let mapData = null;

        // 形式1: { success: { data: { mapData: [...] } } }
        if (data.success?.data?.mapData) {
            mapData = data.success.data.mapData;
        }
        // 形式2: { success: { data: [...] } }
        else if (data.success?.data && Array.isArray(data.success.data)) {
            mapData = data.success.data;
        }
        // 形式3: { data: [...] }
        else if (data.data && Array.isArray(data.data)) {
            mapData = data.data;
        }
        // 形式4: 直接配列
        else if (Array.isArray(data)) {
            mapData = data;
        }

        if (!mapData || mapData.length === 0) {
            return null;
        }

        // 最初の要素を整形して返す
        const item = mapData[0];
        return {
            name: item.name || item.unit_name || '',
            strat_name: item.strat_name || item.name || item.unit_name || '',
            age: item.age || item.interval_name || '',
            t_age: item.t_age ?? item.top_age,
            b_age: item.b_age ?? item.bottom_age,
            lith: item.lith || item.lithology || '',
            descrip: item.descrip || '',
            comments: item.comments || '',
            color: item.color ? (item.color.startsWith('#') ? item.color : `#${item.color}`) : '#999999'
        };

    } catch (error) {
        console.warn('Macrostrat API エラー:', error);
        return null;
    }
}

/**
 * ポップアップの内容を生成
 */
function generatePopupContent(lat, lng, seamlessData, macrostratData) {
    let html = '<div class="geology-popup">';

    // 座標表示
    html += `<div class="geology-popup-coords">${lat.toFixed(5)}, ${lng.toFixed(5)}</div>`;

    // データがない場合
    if (!seamlessData && !macrostratData) {
        html += '<div class="geology-popup-nodata">この地点の地質情報はありません</div>';
        html += '</div>';
        return html;
    }

    // シームレス地質図の情報
    if (seamlessData) {
        html += '<div class="geology-popup-section">';
        html += '<div class="geology-popup-section-title">シームレス地質図</div>';

        const color = seamlessData.value ? `#${seamlessData.value}` : '#999';
        const lithology = seamlessData.lithology_ja || seamlessData.lithology_en || '';
        const formationAge = seamlessData.formationAge_ja || seamlessData.formationAge_en || '';
        const group = seamlessData.group_ja || seamlessData.group_en || '';
        const symbol = seamlessData.symbol || '';

        html += `
            <div class="geology-popup-item">
                <div class="geology-popup-color" style="background-color: ${color};"></div>
                <div class="geology-popup-info">
                    ${lithology ? `<div class="geology-popup-name">${lithology}</div>` : ''}
                    ${formationAge ? `<div class="geology-popup-age">${formationAge}</div>` : ''}
                    ${group ? `<div class="geology-popup-detail">${group}</div>` : ''}
                    ${symbol ? `<div class="geology-popup-symbol">記号: ${symbol}</div>` : ''}
                </div>
            </div>
        `;

        html += '</div>';
    }

    // Macrostrat地質図の情報
    if (macrostratData) {
        html += '<div class="geology-popup-section">';
        html += '<div class="geology-popup-section-title">Macrostrat</div>';

        const name = macrostratData.strat_name || macrostratData.name || '';
        const age = macrostratData.age || '';
        const lith = macrostratData.lith || '';
        const ageRange = (macrostratData.t_age !== undefined && macrostratData.b_age !== undefined)
            ? `${macrostratData.t_age.toFixed(1)} - ${macrostratData.b_age.toFixed(1)} Ma`
            : '';

        html += `
            <div class="geology-popup-item">
                <div class="geology-popup-color" style="background-color: ${macrostratData.color};"></div>
                <div class="geology-popup-info">
                    ${name ? `<div class="geology-popup-name">${name}</div>` : ''}
                    ${age ? `<div class="geology-popup-age">${age}</div>` : ''}
                    ${lith ? `<div class="geology-popup-detail">${lith}</div>` : ''}
                    ${ageRange ? `<div class="geology-popup-detail geology-popup-age-range">${ageRange}</div>` : ''}
                </div>
            </div>
        `;

        html += '</div>';
    }

    html += '</div>';
    return html;
}
