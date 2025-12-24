export class YouTubeMusicAPI {
    static _lastVideoTime = 0;
    static _lastVideoId = null;

    static getCurrentTrack() {
        const player = document.querySelector('video');
        const songInfo = document.querySelector('.title.style-scope.ytmusic-player-bar');
        const artistInfo = document.querySelector('.byline.style-scope.ytmusic-player-bar.complex-string');
        const imageElement = document.querySelector('.image.style-scope.ytmusic-player-bar');
        const linkElement = document.querySelector("a.ytp-title-link.yt-uix-sessionlink");
        const progressBar = document.querySelector('#progress-bar');

        if (!player || !songInfo || !artistInfo) {
            return null;
        }

        const videoLink = linkElement.getAttribute('href');
        const urlParams = new URLSearchParams(videoLink.split('?')[1]);
        const currentVideoId = urlParams.get('v') || null;

        let seconds = 0;

        const videoIdChanged = this._lastVideoId !== null && this._lastVideoId !== currentVideoId;
        if (videoIdChanged) {
            if (player.currentTime < 5) {
                seconds = player.currentTime;
            } else {
                seconds = 0.5;
            }

            this._lastVideoId = currentVideoId;
            this._lastVideoTime = seconds;

            seconds = parseFloat(seconds.toFixed(2));

            return {
                status: player.paused ? 0 : 1,
                title: songInfo.getAttribute('title') || songInfo.textContent,
                thumbnail: imageElement ? imageElement.src : null,
                formatted_text: artistInfo.getAttribute('title') || artistInfo.textContent,
                seconds: seconds,
                video_id: currentVideoId
            };
        }

        let isVideoChanged = false;
        let currentVideoTime = player.currentTime;

        if (Math.abs(this._lastVideoTime - currentVideoTime) > 5) {
            isVideoChanged = true;
        }

        if (isVideoChanged) {
            if (progressBar && progressBar.getAttribute('aria-valuenow') !== null) {
                const progressValue = parseFloat(progressBar.getAttribute('aria-valuenow'));
                if (!isNaN(progressValue)) {
                    seconds = progressValue;
                } else {
                    seconds = currentVideoTime;
                }
            } else {
                seconds = currentVideoTime;
            }
        } else {
            if (progressBar && progressBar.getAttribute('aria-valuenow') !== null) {
                const progressValue = parseFloat(progressBar.getAttribute('aria-valuenow'));
                if (!isNaN(progressValue)) {
                    seconds = progressValue;
                } else {
                    seconds = currentVideoTime;
                }
            } else {
                seconds = currentVideoTime;
            }
        }

        this._lastVideoTime = seconds;
        this._lastVideoId = currentVideoId;

        seconds = parseFloat(seconds.toFixed(2));

        return {
            status: player.paused ? 0 : 1,
            title: songInfo.getAttribute('title') || songInfo.textContent,
            thumbnail: imageElement ? imageElement.src : null,
            formatted_text: artistInfo.getAttribute('title') || artistInfo.textContent,
            seconds: seconds,
            video_id: currentVideoId
        };
    }

    static initializeTrackObserver(callback, wsService, isHost) {
        const playerBar = document.querySelector('ytmusic-player-bar');
        if (!playerBar) return;

        let lastTrackInfo = null;
        let lastUpdateTime = 0;
        let lastVideoTime = 0;
        let timeoutId = null;

        const handleTrackUpdate = () => {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(() => {
                const trackInfo = this.getCurrentTrack();
                if (!trackInfo) return;

                const currentTime = Date.now();
                const isSameTrack = lastTrackInfo &&
                    lastTrackInfo.title === trackInfo.title &&
                    lastTrackInfo.status === trackInfo.status;

                if (isSameTrack && currentTime - lastUpdateTime < 150) {
                    return;
                }

                const timeChanged = !lastTrackInfo || Math.abs(trackInfo.seconds - lastVideoTime) > 1.5;
                const statusChanged = !lastTrackInfo || lastTrackInfo.status !== trackInfo.status;
                const trackChanged = !lastTrackInfo || lastTrackInfo.title !== trackInfo.title;

                if (trackChanged || statusChanged || timeChanged) {
                    const isRoomOwner = wsService && wsService.roles && wsService.roles.includes('owner');

                    if (isRoomOwner && wsService && wsService.isConnected) {
                        wsService.socket.send(JSON.stringify(trackInfo));
                    }

                    callback(trackInfo);
                    lastTrackInfo = trackInfo;
                    lastVideoTime = trackInfo.seconds;
                    lastUpdateTime = currentTime;
                }

                timeoutId = null;
            }, 100);
        };

        const videoElement = document.querySelector('video');
        if (videoElement) {
            videoElement.addEventListener('play', handleTrackUpdate);
            videoElement.addEventListener('pause', handleTrackUpdate);
            videoElement.addEventListener('seeking', handleTrackUpdate);

            videoElement.addEventListener('timeupdate', () => {
                if (Math.floor(videoElement.currentTime) % 3 === 0) {
                    handleTrackUpdate();
                }
            });
        }

        const observer = new MutationObserver((mutations) => {
            const titleChanged = mutations.some(mutation =>
                mutation.target.classList.contains('title') ||
                mutation.target.classList.contains('byline')
            );

            if (titleChanged) {
                handleTrackUpdate();
            }
        });

        observer.observe(playerBar, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['title', 'src']
        });

        handleTrackUpdate();

        return observer;
    }

    static async play() {
        const player = document.querySelector('video');
        if (player) {
            await player.play();
        }
    }

    static pause() {
        const player = document.querySelector('video');
        if (player) {
            player.pause();
        }
    }

    static updateVideoState(songData) {
        if (!songData || !songData.video_id) {
            return false;
        }

        try {
            const currentVideoId = this.getCurrentVideoId();
            const isVideoChanging = currentVideoId !== songData.video_id;

            if (isVideoChanging) {
                try {
                    const newUrl = `/watch?v=${songData.video_id}`;
                    window.history.pushState({}, '', newUrl);

                    const navigationEvent = new CustomEvent('yt-navigate', {
                        detail: { endpoint: { watchEndpoint: { videoId: songData.video_id } } }
                    });
                    document.dispatchEvent(navigationEvent);

                    const videoElement = document.querySelector('video');
                    if (videoElement) {
                        const loadHandler = () => {
                            if (typeof songData.seconds === 'number') {
                                videoElement.currentTime = songData.seconds;
                            }

                            if (songData.status === 0) {
                                videoElement.pause();
                            } else if (songData.status === 1) {
                                videoElement.play().catch(e => console.error("Video oynatma hatası:", e));
                            }

                            videoElement.removeEventListener('loadeddata', loadHandler);
                        };
                        videoElement.addEventListener('loadeddata', loadHandler);
                    }

                } catch (e) {
                }

                return true;
            }

            const videoElement = document.querySelector('video');
            if (videoElement) {
                if (typeof songData.seconds === 'number' && Math.abs(videoElement.currentTime - songData.seconds) > 1.5) {
                    videoElement.currentTime = songData.seconds;
                }

                const isPlaying = !videoElement.paused;
                if (songData.status === 0 && isPlaying) {
                    videoElement.pause();
                } else if (songData.status === 1 && !isPlaying) {
                    videoElement.play().catch(e => console.error("Video oynatma hatası:", e));
                }

                return true;
            }

            return false;
        } catch (error) {
            console.error("Video güncellenirken hata:", error);
            return false;
        }
    }

    static getCurrentVideoId() {
        const linkElement = document.querySelector("a.ytp-title-link.yt-uix-sessionlink");
        if (linkElement) {
            const videoLink = linkElement.getAttribute('href');
            if (videoLink) {
                const urlParams = new URLSearchParams(videoLink.split('?')[1]);
                return urlParams.get('v');
            }
        }
        return null;
    }
}

window.YouTubeMusicAPI = YouTubeMusicAPI;
