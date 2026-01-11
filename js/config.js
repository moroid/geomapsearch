/**
 * 設定・定数モジュール
 */

// CKAN API エンドポイント
export const CKAN_API_BASE = 'https://data.gsj.jp/gkan/api/3/action';

// シームレス地質図関連URL
export const SEAMLESS_TILE_URL = 'https://gbank.gsj.jp/seamless/v2/api/1.3/tiles/{z}/{y}/{x}.png';
export const SEAMLESS_LEGEND_URL = 'https://gbank.gsj.jp/seamless/v2/api/1.3/legend.json';

// Macrostrat（世界の地質図）
export const MACROSTRAT_TILE_URL = 'https://tiles.macrostrat.org/carto/{z}/{x}/{y}.png';

// Macrostrat スケール別タイル
export const MACROSTRAT_SCALES = {
    carto: {
        name: '自動（推奨）',
        url: 'https://tiles.macrostrat.org/carto/{z}/{x}/{y}.png'
    },
    tiny: {
        name: '小縮尺（世界規模）',
        url: 'https://tiles.macrostrat.org/carto-tiny/{z}/{x}/{y}.png'
    },
    small: {
        name: '中小縮尺',
        url: 'https://tiles.macrostrat.org/carto-small/{z}/{x}/{y}.png'
    },
    medium: {
        name: '中縮尺',
        url: 'https://tiles.macrostrat.org/carto-medium/{z}/{x}/{y}.png'
    },
    large: {
        name: '大縮尺（詳細）',
        url: 'https://tiles.macrostrat.org/carto-large/{z}/{x}/{y}.png'
    }
};

// OpenTopoMap（等高線入り地形図）
export const OPENTOPOMAP_URL = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';

// USGS National Map
export const USGS_IMAGERY_URL = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}';
export const USGS_TOPO_URL = 'https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}';
