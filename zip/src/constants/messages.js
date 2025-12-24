/**
 * Messages used throughout the application
 */
export const MESSAGES = {
    // Room operation messages
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
    
    // Music control messages
    MUSIC: {
        SYNC_SUCCESS: 'Music synchronized',
        SYNC_ERROR: 'An error occurred while synchronizing music',
        PLAYBACK_ERROR: 'An error occurred during playback control',
        NO_TRACK: 'No song is currently playing',
        TRACK_CHANGED: 'Song changed',
        NOW_PLAYING: 'Now playing',
        PAUSED: 'Paused',
    },
    
    // Connection messages
    CONNECTION: {
        DISCONNECTED: 'Disconnected',
        RECONNECTING: 'Reconnecting...',
        RECONNECTED: 'Connection reestablished',
        ERROR: 'Connection error',
        TIMEOUT: 'Connection timed out',
        OFFLINE: 'Offline',
        ONLINE: 'Online',
    },
    
    // General error messages
    ERROR: {
        UNKNOWN: 'An unknown error occurred',
        SERVER: 'Server error',
        PERMISSION: 'Permission error',
        AUTHENTICATION: 'Authentication error',
    },
    
    // Success messages
    SUCCESS: {
        GENERAL: 'Operation completed successfully',
        SAVED: 'Saved successfully',
    },
    
    // Info messages
    INFO: {
        LOADING: 'Loading...',
        WAITING: 'Waiting...',
    },
    
    // UI texts
    UI: {
        APP_TITLE: 'Music Together',
        CREATE_ROOM: 'Create Room',
        JOIN_ROOM: 'Join',
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
    },
};
