/**
 * Messages used throughout the application
 */
const MESSAGES_BY_LANG = {
    en: {
        ROOM: {
            EMPTY_CODE: 'Please enter a room code',
            CREATE_ERROR: 'An error occurred while creating the room',
            JOIN_ERROR: 'An error occurred while joining the room',
            LEAVE_ERROR: 'An error occurred while leaving the room',
            NOT_FOUND: 'Room not found',
            PARTICIPANTS_ERROR: 'Could not retrieve participant information',
            ROOM_CLOSED: 'Room closed',
            KICKED: 'You have been removed from the room',
            HOST_LEFT: 'The host has left the room',
            COPY_SUCCESS: 'Room code copied',
        },
        MUSIC: {
            SYNC_SUCCESS: 'Music synchronized',
            SYNC_ERROR: 'An error occurred while synchronizing music',
            PLAYBACK_ERROR: 'An error occurred during playback control',
            NO_TRACK: 'No song is currently playing',
            TRACK_CHANGED: 'Song changed',
            NOW_PLAYING: 'Now playing',
            PAUSED: 'Paused',
        },
        CONNECTION: {
            DISCONNECTED: 'Disconnected',
            RECONNECTING: 'Reconnecting...',
            RECONNECTED: 'Connection reestablished',
            ERROR: 'Connection error',
            TIMEOUT: 'Connection timed out',
            OFFLINE: 'Offline',
            ONLINE: 'Online',
        },
        ERROR: {
            UNKNOWN: 'An unknown error occurred',
            SERVER: 'Server error',
            PERMISSION: 'Permission error',
            AUTHENTICATION: 'Authentication error',
        },
        SUCCESS: {
            GENERAL: 'Operation completed successfully',
            SAVED: 'Saved successfully',
        },
        INFO: {
            LOADING: 'Loading...',
            WAITING: 'Waiting...',
        },
        UI: {
            APP_TITLE: 'Music Together',
            CREATE_ROOM: 'Create Room',
            JOIN_ROOM: 'Join',
            SERVER: 'Server',
            SAVE: 'Save',
            ROOM_CODE: 'Room Code',
            ROOM_CODE_LABEL: 'Room Code:',
            LEAVE_ROOM: 'Leave Room',
            COPY_CODE: 'Copy Code',
            PARTICIPANTS: 'Participants',
            PARTICIPANTS_COUNT: '{count} People',
            ROOM_CONTROLS: 'Room Controls',
            SYNC_PLAYBACK: 'Synchronize Playback',
            CURRENT_SONG: 'Now playing',
            SONG_COVER: 'Song Cover',
            HOST: 'Host',
            LISTENER: 'Listener',
            PARTICIPANT: 'Participant',
            YOU: '(You)',
            LANGUAGE: 'Language',
            CHAT: 'Chat',
            SEND: 'Send',
            CHAT_PLACEHOLDER: 'Type a message',
        },
    },
    ko: {
        ROOM: {
            EMPTY_CODE: '방 코드를 입력하세요',
            CREATE_ERROR: '방 생성 중 오류가 발생했습니다',
            JOIN_ERROR: '방 참가 중 오류가 발생했습니다',
            LEAVE_ERROR: '방 나가기 중 오류가 발생했습니다',
            NOT_FOUND: '방을 찾을 수 없습니다',
            PARTICIPANTS_ERROR: '참가자 정보를 불러오지 못했습니다',
            ROOM_CLOSED: '방이 종료되었습니다',
            KICKED: '방에서 제거되었습니다',
            HOST_LEFT: '호스트가 방을 나갔습니다',
            COPY_SUCCESS: '방 코드가 복사되었습니다',
        },
        MUSIC: {
            SYNC_SUCCESS: '음악을 동기화했습니다',
            SYNC_ERROR: '음악 동기화 중 오류가 발생했습니다',
            PLAYBACK_ERROR: '재생 제어 중 오류가 발생했습니다',
            NO_TRACK: '재생 중인 곡이 없습니다',
            TRACK_CHANGED: '곡이 변경되었습니다',
            NOW_PLAYING: '재생 중',
            PAUSED: '일시정지',
        },
        CONNECTION: {
            DISCONNECTED: '연결 끊김',
            RECONNECTING: '재연결 중...',
            RECONNECTED: '연결이 복구되었습니다',
            ERROR: '연결 오류',
            TIMEOUT: '연결 시간 초과',
            OFFLINE: '오프라인',
            ONLINE: '온라인',
        },
        ERROR: {
            UNKNOWN: '알 수 없는 오류가 발생했습니다',
            SERVER: '서버 오류',
            PERMISSION: '권한 오류',
            AUTHENTICATION: '인증 오류',
        },
        SUCCESS: {
            GENERAL: '작업이 완료되었습니다',
            SAVED: '저장되었습니다',
        },
        INFO: {
            LOADING: '불러오는 중...',
            WAITING: '대기 중...',
        },
        UI: {
            APP_TITLE: '뮤직 투게더',
            CREATE_ROOM: '방 만들기',
            JOIN_ROOM: '참가',
            SERVER: '서버',
            SAVE: '저장',
            ROOM_CODE: '방 코드',
            ROOM_CODE_LABEL: '방 코드:',
            LEAVE_ROOM: '나가기',
            COPY_CODE: '코드 복사',
            PARTICIPANTS: '참가자',
            PARTICIPANTS_COUNT: '{count}명',
            ROOM_CONTROLS: '방 컨트롤',
            SYNC_PLAYBACK: '재동기화',
            CURRENT_SONG: '현재 곡',
            SONG_COVER: '앨범 커버',
            HOST: '호스트',
            LISTENER: '청취자',
            PARTICIPANT: '참가자',
            YOU: '(나)',
            LANGUAGE: '언어',
            CHAT: '채팅',
            SEND: '보내기',
            CHAT_PLACEHOLDER: '메시지를 입력하세요',
        },
    },
};

export const MESSAGES = { ...MESSAGES_BY_LANG.en };

let currentLanguage = 'en';

export function setLanguage(language) {
    if (!MESSAGES_BY_LANG[language]) {
        return;
    }
    currentLanguage = language;
    Object.assign(MESSAGES, MESSAGES_BY_LANG[language]);
}

export function getLanguage() {
    return currentLanguage;
}
