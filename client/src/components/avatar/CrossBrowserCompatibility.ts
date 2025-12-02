/**
 * Cross-Browser Compatibility Testing and Polyfills
 * Ensures Avatar Builder works consistently across different browsers
 */

export interface BrowserInfo {
  name: string;
  version: string;
  engine: string;
  platform: string;
  mobile: boolean;
}

export interface CompatibilityReport {
  browser: BrowserInfo;
  supportedFeatures: string[];
  unsupportedFeatures: string[];
  polyfillsNeeded: string[];
  performanceScore: number; // 0-100
  recommendations: string[];
}

export interface FeatureSupport {
  canvas2d: boolean;
  webgl: boolean;
  fileApi: boolean;
  dragDrop: boolean;
  localStorage: boolean;
  intersectionObserver: boolean;
  resizeObserver: boolean;
  webWorkers: boolean;
  offscreenCanvas: boolean;
  imageCapture: boolean;
}

/**
 * Cross-browser compatibility manager
 */
export class CrossBrowserCompatibility {
  private static instance: CrossBrowserCompatibility;
  private browserInfo: BrowserInfo;
  private featureSupport: FeatureSupport;

  constructor() {
    this.browserInfo = this.detectBrowser();
    this.featureSupport = this.checkFeatureSupport();
    this.applyPolyfills();
  }

  static getInstance(): CrossBrowserCompatibility {
    if (!this.instance) {
      this.instance = new CrossBrowserCompatibility();
    }
    return this.instance;
  }

  /**
   * Get browser information
   */
  getBrowserInfo(): BrowserInfo {
    return this.browserInfo;
  }

  /**
   * Get feature support status
   */
  getFeatureSupport(): FeatureSupport {
    return this.featureSupport;
  }

  /**
   * Generate compatibility report
   */
  generateCompatibilityReport(): CompatibilityReport {
    const supportedFeatures: string[] = [];
    const unsupportedFeatures: string[] = [];
    const polyfillsNeeded: string[] = [];

    // Analyze feature support
    Object.entries(this.featureSupport).forEach(([feature, supported]) => {
      if (supported) {
        supportedFeatures.push(feature);
      } else {
        unsupportedFeatures.push(feature);
        
        // Determine if polyfill is available
        if (this.hasPolyfill(feature)) {
          polyfillsNeeded.push(feature);
        }
      }
    });

    const performanceScore = this.calculatePerformanceScore();
    const recommendations = this.generateRecommendations();

    return {
      browser: this.browserInfo,
      supportedFeatures,
      unsupportedFeatures,
      polyfillsNeeded,
      performanceScore,
      recommendations
    };
  }

  /**
   * Check if Avatar Builder is compatible with current browser
   */
  isCompatible(): { compatible: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check critical features
    if (!this.featureSupport.canvas2d) {
      issues.push('Canvas 2D API not supported - Avatar Builder cannot function');
    }

    if (!this.featureSupport.fileApi) {
      issues.push('File API not supported - Cannot upload sprite sheets');
    }

    if (!this.featureSupport.localStorage) {
      issues.push('localStorage not supported - Cannot save character definitions');
    }

    // Check browser-specific issues
    if (this.browserInfo.name === 'Internet Explorer') {
      issues.push('Internet Explorer is not supported - Please use a modern browser');
    }

    if (this.browserInfo.name === 'Safari' && parseFloat(this.browserInfo.version) < 14) {
      issues.push('Safari version too old - Please update to Safari 14 or later');
    }

    return {
      compatible: issues.length === 0,
      issues
    };
  }

  /**
   * Apply necessary polyfills
   */
  private applyPolyfills(): void {
    // ResizeObserver polyfill
    if (!this.featureSupport.resizeObserver) {
      this.loadResizeObserverPolyfill();
    }

    // IntersectionObserver polyfill
    if (!this.featureSupport.intersectionObserver) {
      this.loadIntersectionObserverPolyfill();
    }

    // File API polyfills for older browsers
    if (!this.featureSupport.fileApi) {
      this.loadFileApiPolyfill();
    }

    // Canvas toBlob polyfill
    this.loadCanvasToBlobPolyfill();
  }

  /**
   * Detect browser information
   */
  private detectBrowser(): BrowserInfo {
    const userAgent = navigator.userAgent;
    let name = 'Unknown';
    let version = 'Unknown';
    let engine = 'Unknown';

    // Detect browser name and version
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      name = 'Chrome';
      const match = userAgent.match(/Chrome\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    } else if (userAgent.includes('Firefox')) {
      name = 'Firefox';
      const match = userAgent.match(/Firefox\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Gecko';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      name = 'Safari';
      const match = userAgent.match(/Version\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'WebKit';
    } else if (userAgent.includes('Edg')) {
      name = 'Edge';
      const match = userAgent.match(/Edg\/(\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Blink';
    } else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
      name = 'Internet Explorer';
      const match = userAgent.match(/(?:MSIE |rv:)(\d+)/);
      version = match ? match[1] : 'Unknown';
      engine = 'Trident';
    }

    return {
      name,
      version,
      engine,
      platform: navigator.platform,
      mobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    };
  }

  /**
   * Check feature support
   */
  private checkFeatureSupport(): FeatureSupport {
    return {
      canvas2d: this.checkCanvas2DSupport(),
      webgl: this.checkWebGLSupport(),
      fileApi: this.checkFileApiSupport(),
      dragDrop: this.checkDragDropSupport(),
      localStorage: this.checkLocalStorageSupport(),
      intersectionObserver: 'IntersectionObserver' in window,
      resizeObserver: 'ResizeObserver' in window,
      webWorkers: 'Worker' in window,
      offscreenCanvas: 'OffscreenCanvas' in window,
      imageCapture: 'ImageCapture' in window
    };
  }

  private checkCanvas2DSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext && canvas.getContext('2d'));
    } catch {
      return false;
    }
  }

  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
    } catch {
      return false;
    }
  }

  private checkFileApiSupport(): boolean {
    return 'File' in window && 'FileReader' in window && 'FileList' in window && 'Blob' in window;
  }

  private checkDragDropSupport(): boolean {
    const div = document.createElement('div');
    return ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
  }

  private checkLocalStorageSupport(): boolean {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  private hasPolyfill(feature: string): boolean {
    const polyfillMap: Record<string, boolean> = {
      intersectionObserver: true,
      resizeObserver: true,
      fileApi: false, // Complex to polyfill
      webWorkers: false,
      offscreenCanvas: false,
      imageCapture: false
    };

    return polyfillMap[feature] || false;
  }

  private calculatePerformanceScore(): number {
    let score = 100;

    // Deduct points for missing features
    if (!this.featureSupport.webgl) score -= 10;
    if (!this.featureSupport.webWorkers) score -= 15;
    if (!this.featureSupport.offscreenCanvas) score -= 10;
    if (!this.featureSupport.intersectionObserver) score -= 5;
    if (!this.featureSupport.resizeObserver) score -= 5;

    // Browser-specific adjustments
    if (this.browserInfo.name === 'Internet Explorer') score = 0;
    if (this.browserInfo.name === 'Safari' && parseFloat(this.browserInfo.version) < 14) score -= 20;
    if (this.browserInfo.mobile) score -= 10;

    return Math.max(0, score);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.featureSupport.webgl) {
      recommendations.push('Enable hardware acceleration for better performance');
    }

    if (!this.featureSupport.webWorkers) {
      recommendations.push('Web Workers not supported - large operations may block UI');
    }

    if (this.browserInfo.name === 'Safari') {
      recommendations.push('Safari users may experience slower performance with large sprite sheets');
    }

    if (this.browserInfo.mobile) {
      recommendations.push('Mobile device detected - consider simplified interface for touch interactions');
    }

    if (parseFloat(this.browserInfo.version) < 90 && this.browserInfo.name === 'Chrome') {
      recommendations.push('Update Chrome for better performance and security');
    }

    return recommendations;
  }

  // Polyfill implementations

  private loadResizeObserverPolyfill(): void {
    if (!('ResizeObserver' in window)) {
      // Simple ResizeObserver polyfill
      (window as any).ResizeObserver = class {
        private callback: ResizeObserverCallback;
        private elements: Element[] = [];

        constructor(callback: ResizeObserverCallback) {
          this.callback = callback;
        }

        observe(element: Element) {
          this.elements.push(element);
          // Simple implementation - just call callback immediately
          setTimeout(() => {
            this.callback([{
              target: element,
              contentRect: element.getBoundingClientRect()
            } as any], this);
          }, 0);
        }

        unobserve(element: Element) {
          this.elements = this.elements.filter(el => el !== element);
        }

        disconnect() {
          this.elements = [];
        }
      };
    }
  }

  private loadIntersectionObserverPolyfill(): void {
    if (!('IntersectionObserver' in window)) {
      // Simple IntersectionObserver polyfill
      (window as any).IntersectionObserver = class {
        private callback: IntersectionObserverCallback;
        private elements: Element[] = [];
        public root: Element | Document | null = null;
        public rootMargin: string = '0px';
        public thresholds: ReadonlyArray<number> = [0];

        constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
          this.callback = callback;
          if (options) {
            this.root = options.root || null;
            this.rootMargin = options.rootMargin || '0px';
            this.thresholds = options.threshold ?
              (Array.isArray(options.threshold) ? options.threshold : [options.threshold]) :
              [0];
          }
        }

        observe(element: Element) {
          this.elements.push(element);
          // Simple implementation - assume element is intersecting
          setTimeout(() => {
            this.callback([{
              target: element,
              isIntersecting: true,
              intersectionRatio: 1
            } as any], this as any);
          }, 0);
        }

        takeRecords(): IntersectionObserverEntry[] {
          return [];
        }

        unobserve(element: Element) {
          this.elements = this.elements.filter(el => el !== element);
        }

        disconnect() {
          this.elements = [];
        }
      };
    }
  }

  private loadFileApiPolyfill(): void {
    // File API is too complex to polyfill effectively
    // Instead, provide fallback messaging
    console.warn('File API not supported - Avatar Builder functionality will be limited');
  }

  private loadCanvasToBlobPolyfill(): void {
    if (!HTMLCanvasElement.prototype.toBlob) {
      HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
        const dataURL = this.toDataURL(type, quality);
        const binStr = atob(dataURL.split(',')[1]);
        const len = binStr.length;
        const arr = new Uint8Array(len);

        for (let i = 0; i < len; i++) {
          arr[i] = binStr.charCodeAt(i);
        }

        callback(new Blob([arr], { type: type || 'image/png' }));
      };
    }
  }
}

/**
 * Browser compatibility utilities
 */
export const BrowserUtils = {
  /**
   * Check if current browser supports Avatar Builder
   */
  isSupported(): boolean {
    const compat = CrossBrowserCompatibility.getInstance();
    return compat.isCompatible().compatible;
  },

  /**
   * Get compatibility issues
   */
  getCompatibilityIssues(): string[] {
    const compat = CrossBrowserCompatibility.getInstance();
    return compat.isCompatible().issues;
  },

  /**
   * Get browser-specific optimizations
   */
  getOptimizations(): Record<string, any> {
    const compat = CrossBrowserCompatibility.getInstance();
    const browser = compat.getBrowserInfo();
    const features = compat.getFeatureSupport();

    return {
      useWebWorkers: features.webWorkers,
      useOffscreenCanvas: features.offscreenCanvas,
      enableHardwareAcceleration: features.webgl,
      useLazyLoading: features.intersectionObserver,
      optimizeForMobile: browser.mobile,
      browserSpecific: {
        safari: browser.name === 'Safari',
        chrome: browser.name === 'Chrome',
        firefox: browser.name === 'Firefox',
        edge: browser.name === 'Edge'
      }
    };
  },

  /**
   * Apply browser-specific CSS classes
   */
  applyBrowserClasses(): void {
    const compat = CrossBrowserCompatibility.getInstance();
    const browser = compat.getBrowserInfo();
    const features = compat.getFeatureSupport();

    const classes = [
      `browser-${browser.name.toLowerCase()}`,
      `browser-version-${browser.version}`,
      `engine-${browser.engine.toLowerCase()}`,
      browser.mobile ? 'mobile' : 'desktop'
    ];

    // Feature-based classes
    if (!features.webgl) classes.push('no-webgl');
    if (!features.webWorkers) classes.push('no-webworkers');
    if (!features.offscreenCanvas) classes.push('no-offscreen-canvas');

    document.body.classList.add(...classes);
  }
};
