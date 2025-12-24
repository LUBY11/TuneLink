export class Alert {
    constructor(container) {
        this.container = container;
        this.alertElement = null;
        this.timeout = null;
        
        // Container stilini ayarla
        this.setupContainer();
    }
    
    /**
     * Container stilini ayarlar
     */
    setupContainer() {
        if (this.container) {
            this.container.style.position = 'relative';
            this.container.style.width = '100%';
            this.container.style.minHeight = '40px';
            this.container.style.display = 'flex';
            this.container.style.flexDirection = 'column';
            this.container.style.alignItems = 'center';
        }
    }

    /**
     * Uyarı mesajı gösterir
     * @param {string} message - Gösterilecek mesaj
     * @param {string} type - Uyarı tipi: 'error', 'success', 'warning', 'info'
     * @param {number} duration - Uyarının ekranda kalma süresi (ms), 0 ise süresiz kalır
     */
    show(message, type = 'error', duration = 3000) {
        // Tüm mevcut uyarıları temizle
        this.clearAllAlerts();
        
        // Yeni uyarı elementi oluştur
        this.alertElement = document.createElement('div');
        this.alertElement.className = `mt-alert mt-alert-${type}`;
        
        // Uyarı içeriği
        this.alertElement.innerHTML = `
            <div class="mt-alert-content">
                <span class="mt-alert-icon">${this.getIcon(type)}</span>
                <span class="mt-alert-message">${message}</span>
                <span class="mt-alert-close">×</span>
            </div>
        `;
        
        // Stil ekle
        this.applyStyles(this.alertElement, type);
        
        // Kapatma düğmesi için event listener
        const closeBtn = this.alertElement.querySelector('.mt-alert-close');
        closeBtn.addEventListener('click', () => this.hide());
        
        // Uyarıyı container'a ekle
        this.container.appendChild(this.alertElement);
        
        // Animasyon için setTimeout kullan
        setTimeout(() => {
            this.alertElement.style.opacity = '1';
            this.alertElement.style.transform = 'translateY(0)';
        }, 10);
        
        // Eğer süre belirtilmişse, otomatik kapat
        if (duration > 0) {
            this.timeout = setTimeout(() => {
                this.hide();
            }, duration);
        }
        
        return this.alertElement;
    }
    
    /**
     * Tüm uyarıları temizler
     */
    clearAllAlerts() {
        // Zamanlayıcıyı temizle
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        
        // Container içindeki tüm uyarıları temizle
        if (this.container) {
            const alerts = this.container.querySelectorAll('.mt-alert');
            alerts.forEach(alert => {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            });
        }
        
        this.alertElement = null;
    }
    
    /**
     * Uyarıyı gizler
     */
    hide() {
        if (this.alertElement) {
            // Önce animasyonla kaybolmasını sağla
            this.alertElement.style.opacity = '0';
            this.alertElement.style.transform = 'translateY(-10px)';
            
            // Sonra DOM'dan kaldır
            setTimeout(() => {
                if (this.alertElement && this.alertElement.parentNode) {
                    this.alertElement.parentNode.removeChild(this.alertElement);
                }
                this.alertElement = null;
            }, 300);
            
            // Zamanlayıcıyı temizle
            if (this.timeout) {
                clearTimeout(this.timeout);
                this.timeout = null;
            }
        }
    }
    
    /**
     * Uyarı tipine göre ikon döndürür
     * @param {string} type - Uyarı tipi
     * @returns {string} - HTML ikon string'i
     */
    getIcon(type) {
        switch (type) {
            case 'error':
                return '❌';
            case 'success':
                return '✅';
            case 'warning':
                return '⚠️';
            case 'info':
                return 'ℹ️';
            default:
                return '';
        }
    }
    
    /**
     * Uyarı elementine stil uygular
     * @param {HTMLElement} element - Stil uygulanacak element
     * @param {string} type - Uyarı tipi
     */
    applyStyles(element, type) {
        // Temel stiller
        element.style.opacity = '0';
        element.style.transform = 'translateY(-10px)';
        element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        element.style.margin = '10px 0';
        element.style.padding = '10px 15px';
        element.style.borderRadius = '4px';
        element.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.2)';
        element.style.fontSize = '14px';
        element.style.width = '100%';
        element.style.boxSizing = 'border-box';
        element.style.position = 'absolute';
        element.style.top = '0';
        element.style.left = '0';
        element.style.zIndex = '1000';
        
        // İçerik container stili
        const content = element.querySelector('.mt-alert-content');
        content.style.display = 'flex';
        content.style.alignItems = 'center';
        
        // İkon stili
        const icon = element.querySelector('.mt-alert-icon');
        icon.style.marginRight = '10px';
        icon.style.fontSize = '16px';
        
        // Mesaj stili
        const message = element.querySelector('.mt-alert-message');
        message.style.flex = '1';
        
        // Kapatma düğmesi stili
        const closeBtn = element.querySelector('.mt-alert-close');
        closeBtn.style.marginLeft = '10px';
        closeBtn.style.cursor = 'pointer';
        closeBtn.style.fontSize = '18px';
        closeBtn.style.fontWeight = 'bold';
        
        // Tip bazlı stiller
        switch (type) {
            case 'error':
                element.style.backgroundColor = '#ffebee';
                element.style.color = '#d32f2f';
                element.style.border = '1px solid #ffcdd2';
                break;
            case 'success':
                element.style.backgroundColor = '#e8f5e9';
                element.style.color = '#388e3c';
                element.style.border = '1px solid #c8e6c9';
                break;
            case 'warning':
                element.style.backgroundColor = '#fff8e1';
                element.style.color = '#f57c00';
                element.style.border = '1px solid #ffe082';
                break;
            case 'info':
                element.style.backgroundColor = '#e3f2fd';
                element.style.color = '#1976d2';
                element.style.border = '1px solid #bbdefb';
                break;
        }
    }
    
    /**
     * Hata uyarısı gösterir
     * @param {string} message - Gösterilecek mesaj
     * @param {number} duration - Uyarının ekranda kalma süresi (ms)
     */
    error(message, duration = 3000) {
        return this.show(message, 'error', duration);
    }
    
    /**
     * Başarı uyarısı gösterir
     * @param {string} message - Gösterilecek mesaj
     * @param {number} duration - Uyarının ekranda kalma süresi (ms)
     */
    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    }
    
    /**
     * Uyarı mesajı gösterir
     * @param {string} message - Gösterilecek mesaj
     * @param {number} duration - Uyarının ekranda kalma süresi (ms)
     */
    warning(message, duration = 3000) {
        return this.show(message, 'warning', duration);
    }
    
    /**
     * Bilgi uyarısı gösterir
     * @param {string} message - Gösterilecek mesaj
     * @param {number} duration - Uyarının ekranda kalma süresi (ms)
     */
    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    }
} 