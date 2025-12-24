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

        // Video ID değişti mi kontrol et - şarkı değişimini tespit et
        const videoIdChanged = this._lastVideoId !== null && this._lastVideoId !== currentVideoId;
        if (videoIdChanged) {
            console.log("Şarkı değişimi tespit edildi. Eski ID:", this._lastVideoId, "Yeni ID:", currentVideoId);

            // Yeni şarkı başladığında zamanı daha gerçekçi bir değere ayarla
            // ProgressBar değeri doğru olmayabilir, player.currentTime daha güvenilir
            if (player.currentTime < 5) {
                seconds = player.currentTime; // Zaten başındaysa mevcut zamanı kullan
            } else {
                seconds = 0.5; // Şarkının başına yakın bir değer
                console.log("Yeni şarkı, zaman sıfırlandı");
            }

            // Video ID'yi güncelle
            this._lastVideoId = currentVideoId;
            this._lastVideoTime = seconds;

            // Float olarak gönderelim
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

        // Normal durum - video değişimi yok
        // Önceki video zamanı ile şimdiki zaman arasında büyük fark olup olmadığını kontrol et
        let isVideoChanged = false;

        // Önce player.currentTime al - sonra karşılaştıracağız
        let currentVideoTime = player.currentTime;

        // Zaman farkı 5 saniyeden fazla mı? Bu durumda muhtemelen video değişti
        if (Math.abs(this._lastVideoTime - currentVideoTime) > 5) {
            isVideoChanged = true;
            console.log("Büyük zaman farkı tespit edildi, olası video değişimi, fark:", Math.abs(this._lastVideoTime - currentVideoTime));
        }

        // Eğer video değiştiyse veya zaman çok farklıysa progressBar'ı kontrol et
        if (isVideoChanged) {
            if (progressBar && progressBar.getAttribute('aria-valuenow') !== null) {
                const progressValue = parseFloat(progressBar.getAttribute('aria-valuenow'));
                if (!isNaN(progressValue)) {
                    seconds = progressValue;
                    console.log("Video değişikliği tespit edildi, progressBar değeri kullanılıyor:", seconds);
                } else {
                    seconds = currentVideoTime;
                }
            } else {
                seconds = currentVideoTime;
            }
        } else {
            // Normal durumlarda standart mantığı kullan
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

        // Son kayıtlı değerleri güncelle
        this._lastVideoTime = seconds;
        this._lastVideoId = currentVideoId;

        // Float olarak gönderelim
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
            // Zaman aşımı varsa temizle, yeni bir güncelleme yapılıyor
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // 100 ms bekle, bu süre zarfında UI güncellenebilir
            timeoutId = setTimeout(() => {
                const trackInfo = this.getCurrentTrack();
                if (!trackInfo) return;

                const currentTime = Date.now();
                const isSameTrack = lastTrackInfo &&
                    lastTrackInfo.title === trackInfo.title &&
                    lastTrackInfo.status === trackInfo.status;

                // Aynı şarkı ve son güncellemeden bu yana 150ms geçmediyse güncelleme yapma
                if (isSameTrack && currentTime - lastUpdateTime < 150) {
                    return;
                }

                // Zamanı kontrol et: Eğer şarkı aynıysa ve zaman farkı 1.5 saniyeden az ise güncelleme yapma
                const timeChanged = !lastTrackInfo || Math.abs(trackInfo.seconds - lastVideoTime) > 1.5;
                const statusChanged = !lastTrackInfo || lastTrackInfo.status !== trackInfo.status;
                const trackChanged = !lastTrackInfo || lastTrackInfo.title !== trackInfo.title;

                // Sadece şarkı, durum veya zaman değiştiyse güncelleme yap
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

            // Zaman güncellemelerini sürekli takip et
            videoElement.addEventListener('timeupdate', () => {
                // Her 5 saniyede bir kontrol et, ama sadece anlamlı bir değişiklik varsa güncelleme yap
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

        // İlk yükleme için hemen çağır
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
            console.error("Geçersiz şarkı verisi:", songData);
            return false;
        }

        try {
            const currentVideoId = this.getCurrentVideoId();
            const isVideoChanging = currentVideoId !== songData.video_id;

            if (isVideoChanging) {
                try {
                    // Şarkı değişiyor, önce yeni şarkıya geçelim
                    const newUrl = `/watch?v=${songData.video_id}`;
                    window.history.pushState({}, '', newUrl);

                    const navigationEvent = new CustomEvent('yt-navigate', {
                        detail: { endpoint: { watchEndpoint: { videoId: songData.video_id } } }
                    });
                    document.dispatchEvent(navigationEvent);

                    // Yeni video yüklendiğinde zamanı ayarlamak için bir event listener ekleyelim
                    const videoElement = document.querySelector('video');
                    if (videoElement) {
                        const loadHandler = () => {
                            // Yeni video yüklendiğinde, gelen süreyi ayarla
                            if (typeof songData.seconds === 'number') {
                                videoElement.currentTime = songData.seconds;
                            }

                            // Durumu güncelle
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
                    console.error("History API ile değiştirilemedi:", e);
                }

                return true;
            }

            // Aynı video ise, sadece zamanı ve durumu güncelle
            const videoElement = document.querySelector('video');
            if (videoElement) {
                // Zamanı güncelle - sadece anlamlı bir fark varsa
                if (typeof songData.seconds === 'number' && Math.abs(videoElement.currentTime - songData.seconds) > 1.5) {
                    videoElement.currentTime = songData.seconds;
                }

                // Durumu güncelle
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

// Global olarak erişilebilir olması için window objesine ekleyelim
window.YouTubeMusicAPI = YouTubeMusicAPI;
