/**
 * Performance Optimization Utilities
 * Optimizes canvas operations, memory usage, and rendering performance for large sprite sheets
 */

export interface PerformanceMetrics {
  memoryUsage: number; // MB
  renderTime: number; // ms
  canvasCount: number;
  imageCount: number;
  cacheHitRate: number; // 0-1
}

export interface OptimizationSettings {
  enableImageCache: boolean;
  enableCanvasPooling: boolean;
  enableLazyLoading: boolean;
  maxCacheSize: number; // MB
  maxCanvasPoolSize: number;
  compressionQuality: number; // 0-1
  enableWebWorkers: boolean;
}

/**
 * Performance optimization manager for Avatar Builder
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private imageCache = new Map<string, HTMLImageElement>();
  private canvasPool: HTMLCanvasElement[] = [];
  private metrics: PerformanceMetrics = {
    memoryUsage: 0,
    renderTime: 0,
    canvasCount: 0,
    imageCount: 0,
    cacheHitRate: 0
  };
  private cacheHits = 0;
  private cacheMisses = 0;

  private settings: OptimizationSettings = {
    enableImageCache: true,
    enableCanvasPooling: true,
    enableLazyLoading: true,
    maxCacheSize: 50, // 50MB
    maxCanvasPoolSize: 10,
    compressionQuality: 0.9,
    enableWebWorkers: false // Disabled by default for compatibility
  };

  static getInstance(): PerformanceOptimizer {
    if (!this.instance) {
      this.instance = new PerformanceOptimizer();
    }
    return this.instance;
  }

  /**
   * Update optimization settings
   */
  updateSettings(newSettings: Partial<OptimizationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    // Apply settings immediately
    if (!newSettings.enableImageCache) {
      this.clearImageCache();
    }
    
    if (!newSettings.enableCanvasPooling) {
      this.clearCanvasPool();
    }
  }

  /**
   * Optimized image loading with caching
   */
  async loadImageOptimized(src: string): Promise<HTMLImageElement> {
    const startTime = performance.now();
    
    // Check cache first
    if (this.settings.enableImageCache && this.imageCache.has(src)) {
      this.cacheHits++;
      this.updateCacheHitRate();
      return this.imageCache.get(src)!;
    }

    this.cacheMisses++;
    this.updateCacheHitRate();

    // Load image
    const img = await this.loadImage(src);
    
    // Cache if enabled and within limits
    if (this.settings.enableImageCache && this.getCurrentCacheSize() < this.settings.maxCacheSize) {
      this.imageCache.set(src, img);
      this.metrics.imageCount = this.imageCache.size;
    }

    this.metrics.renderTime = performance.now() - startTime;
    return img;
  }

  /**
   * Get optimized canvas from pool or create new one
   */
  getOptimizedCanvas(width: number, height: number): HTMLCanvasElement {
    let canvas: HTMLCanvasElement;

    // Try to reuse from pool
    if (this.settings.enableCanvasPooling && this.canvasPool.length > 0) {
      canvas = this.canvasPool.pop()!;
      canvas.width = width;
      canvas.height = height;
    } else {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
    }

    this.metrics.canvasCount++;
    return canvas;
  }

  /**
   * Return canvas to pool for reuse
   */
  returnCanvasToPool(canvas: HTMLCanvasElement): void {
    if (!this.settings.enableCanvasPooling) return;
    
    if (this.canvasPool.length < this.settings.maxCanvasPoolSize) {
      // Clear canvas before returning to pool
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      this.canvasPool.push(canvas);
    }
    
    this.metrics.canvasCount--;
  }

  /**
   * Optimized canvas operations with batching
   */
  batchCanvasOperations(
    canvas: HTMLCanvasElement,
    operations: Array<() => void>
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const startTime = performance.now();

    // Batch operations to minimize context switches
    ctx.save();
    
    try {
      operations.forEach(operation => operation());
    } finally {
      ctx.restore();
    }

    this.metrics.renderTime += performance.now() - startTime;
  }

  /**
   * Compress image data for storage
   */
  compressImageData(canvas: HTMLCanvasElement, format: 'png' | 'jpeg' | 'webp' = 'png'): string {
    if (format === 'jpeg') {
      return canvas.toDataURL('image/jpeg', this.settings.compressionQuality);
    } else if (format === 'webp') {
      return canvas.toDataURL('image/webp', this.settings.compressionQuality);
    }
    
    return canvas.toDataURL('image/png');
  }

  /**
   * Lazy load images with intersection observer
   */
  setupLazyLoading(
    container: HTMLElement,
    imageElements: HTMLImageElement[],
    loadCallback: (img: HTMLImageElement) => void
  ): void {
    if (!this.settings.enableLazyLoading || !('IntersectionObserver' in window)) {
      // Fallback: load all images immediately
      imageElements.forEach(loadCallback);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            loadCallback(img);
            observer.unobserve(img);
          }
        });
      },
      { rootMargin: '50px' } // Start loading 50px before entering viewport
    );

    imageElements.forEach(img => observer.observe(img));
  }

  /**
   * Optimize large sprite sheet processing
   */
  async processLargeSpriteSheet(
    imageData: string,
    frameDefinitions: Array<{ x: number; y: number; width: number; height: number }>,
    onProgress?: (progress: number) => void
  ): Promise<HTMLCanvasElement[]> {
    const startTime = performance.now();
    const results: HTMLCanvasElement[] = [];
    
    // Load source image
    const sourceImg = await this.loadImageOptimized(imageData);
    
    // Process frames in chunks to avoid blocking UI
    const chunkSize = 10;
    const chunks = this.chunkArray(frameDefinitions, chunkSize);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      // Process chunk
      const chunkResults = await this.processFrameChunk(sourceImg, chunk);
      results.push(...chunkResults);
      
      // Update progress
      const progress = (i + 1) / chunks.length;
      onProgress?.(progress);
      
      // Yield to browser for UI updates
      await this.yieldToMain();
    }

    this.metrics.renderTime = performance.now() - startTime;
    return results;
  }

  /**
   * Memory usage monitoring
   */
  getMemoryUsage(): number {
    // Estimate memory usage
    let totalMemory = 0;
    
    // Image cache memory
    this.imageCache.forEach(img => {
      totalMemory += img.width * img.height * 4; // RGBA bytes
    });
    
    // Canvas pool memory
    this.canvasPool.forEach(canvas => {
      totalMemory += canvas.width * canvas.height * 4;
    });
    
    this.metrics.memoryUsage = totalMemory / (1024 * 1024); // Convert to MB
    return this.metrics.memoryUsage;
  }

  /**
   * Clean up resources to free memory
   */
  cleanup(): void {
    this.clearImageCache();
    this.clearCanvasPool();
    this.resetMetrics();
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    this.getMemoryUsage(); // Update memory usage
    return { ...this.metrics };
  }

  /**
   * Optimize canvas for GPU acceleration
   */
  optimizeCanvasForGPU(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Enable hardware acceleration hints
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Use willReadFrequently for canvases that will be read often
    const readFrequentlyCtx = canvas.getContext('2d', { willReadFrequently: false });
  }

  /**
   * Debounced operation executor
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  // Private helper methods

  private async loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    });
  }

  private getCurrentCacheSize(): number {
    let size = 0;
    this.imageCache.forEach(img => {
      size += img.width * img.height * 4; // RGBA bytes
    });
    return size / (1024 * 1024); // Convert to MB
  }

  private updateCacheHitRate(): void {
    const total = this.cacheHits + this.cacheMisses;
    this.metrics.cacheHitRate = total > 0 ? this.cacheHits / total : 0;
  }

  private clearImageCache(): void {
    this.imageCache.clear();
    this.metrics.imageCount = 0;
  }

  private clearCanvasPool(): void {
    this.canvasPool = [];
    this.metrics.canvasCount = 0;
  }

  private resetMetrics(): void {
    this.metrics = {
      memoryUsage: 0,
      renderTime: 0,
      canvasCount: 0,
      imageCount: 0,
      cacheHitRate: 0
    };
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async processFrameChunk(
    sourceImg: HTMLImageElement,
    frameDefinitions: Array<{ x: number; y: number; width: number; height: number }>
  ): Promise<HTMLCanvasElement[]> {
    const results: HTMLCanvasElement[] = [];
    
    frameDefinitions.forEach(frame => {
      const canvas = this.getOptimizedCanvas(frame.width, frame.height);
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        ctx.drawImage(
          sourceImg,
          frame.x, frame.y, frame.width, frame.height,
          0, 0, frame.width, frame.height
        );
      }
      
      results.push(canvas);
    });
    
    return results;
  }

  private async yieldToMain(): Promise<void> {
    return new Promise(resolve => {
      if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
        // Use Scheduler API if available
        (window as any).scheduler.postTask(resolve, { priority: 'user-blocking' });
      } else {
        // Fallback to setTimeout
        setTimeout(resolve, 0);
      }
    });
  }
}

/**
 * Performance monitoring hook for React components
 */
export const usePerformanceMonitoring = () => {
  const optimizer = PerformanceOptimizer.getInstance();
  
  const startMeasurement = (name: string) => {
    performance.mark(`${name}-start`);
  };
  
  const endMeasurement = (name: string) => {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name, 'measure')[0];
    console.log(`${name}: ${measure.duration.toFixed(2)}ms`);
  };
  
  return {
    startMeasurement,
    endMeasurement,
    getMetrics: () => optimizer.getMetrics(),
    cleanup: () => optimizer.cleanup()
  };
};
