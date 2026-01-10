/**
 * ユーティリティ関数モジュール
 */

/**
 * 2つの矩形範囲が交差するかチェック
 */
export function boundsIntersect(a, b) {
    return !(
        a.east < b.west ||
        a.west > b.east ||
        a.north < b.south ||
        a.south > b.north
    );
}

/**
 * マークダウン記法を除去してプレーンテキストに変換
 */
export function stripMarkdown(text) {
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
export function escapeHtml(text) {
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
export function copyToClipboard(text, buttonEl) {
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
