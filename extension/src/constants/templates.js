import { MESSAGES } from './messages.js';

/**
 * Şarkı bilgisi HTML şablonu
 * @param {Object} trackInfo - Şarkı bilgisi objesi
 * @returns {string} HTML şablonu
 */
export function renderSongInfo(trackInfo = null) {
    if (trackInfo && trackInfo.title) {
        const hasThumbnail = trackInfo.thumbnail && trackInfo.thumbnail.trim() !== '';

        return `
            ${hasThumbnail ? `
            <div class="song-image">
                <img src="${trackInfo.thumbnail}" alt="${MESSAGES.UI.SONG_COVER}" onerror="this.style.display='none'">
            </div>` : ''}
            <p class="song-title">${trackInfo.title || '-'}</p>
            <p class="song-artist">${trackInfo.formatted_text || '-'} • ${trackInfo.status === 1 ? '▶️ ' + MESSAGES.MUSIC.NOW_PLAYING : '⏸️ ' + MESSAGES.MUSIC.PAUSED}</p>
        `;
    } else {
        return `
            <div class="song-image"></div>
            <p class="song-title">-</p>
            <p class="song-artist">-</p>
        `;
    }
}

/**
 * Boş şarkı bilgisi HTML şablonu
 * @returns {string} HTML şablonu
 */
export function renderEmptySongInfo() {
    return `
        <div class="song-image"></div>
        <p class="song-title">-</p>
        <p class="song-artist">-</p>
    `;
}
