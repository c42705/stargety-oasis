/**
 * Type declarations for gifler library
 * https://github.com/themadcreator/gifler
 * 
 * Gifler is a library for parsing and rendering animated GIFs to canvas.
 */

declare module 'gifler' {
  /**
   * Frame data from GIF animation
   */
  interface GifFrame {
    /** Frame buffer (ImageData or canvas) */
    buffer: HTMLCanvasElement | ImageData;
    /** Frame width in pixels */
    width: number;
    /** Frame height in pixels */
    height: number;
    /** Frame delay in milliseconds */
    delay: number;
    /** Frame disposal method */
    disposal: number;
    /** Transparent color index */
    transparentIndex: number | null;
  }

  /**
   * Callback function called for each frame
   */
  type OnFrameCallback = (
    ctx: CanvasRenderingContext2D,
    frame: GifFrame
  ) => void;

  /**
   * Gifler animator instance
   */
  interface GiflerAnimator {
    /** Start the animation */
    start(): GiflerAnimator;
    /** Stop the animation */
    stop(): GiflerAnimator;
    /** Reset to first frame */
    reset(): GiflerAnimator;
    /** Check if animation is running */
    running(): boolean;
    /** Width of the GIF */
    width: number;
    /** Height of the GIF */
    height: number;
    /** Internal frame index (private but accessible) */
    _frameIndex: number;
    /** Internal frames array (private but accessible) */
    _frames: GifFrame[];
    /** Callback for drawing each frame */
    onDrawFrame?: (ctx: CanvasRenderingContext2D, frame: GifFrame, frameIndex: number) => void;
    /** Callback for each frame */
    onFrame?: (frame: GifFrame, frameIndex: number) => void;
    /** Animate in a canvas element */
    animateInCanvas(canvas: HTMLCanvasElement, setDimensions?: boolean): GiflerAnimator;
  }

  /**
   * Gifler instance
   */
  interface Gifler {
    /**
     * Parse GIF and render frames to canvas
     * @param canvas - Target canvas element
     * @param onFrame - Callback called for each frame
     * @param setDimensions - Optional flag to set canvas dimensions
     * @returns Gifler instance (for chaining)
     */
    frames(
      canvas: HTMLCanvasElement,
      onFrame: OnFrameCallback,
      setDimensions?: boolean
    ): Gifler;

    /**
     * Animate GIF in canvas with default rendering
     * @param canvas - Target canvas element or selector
     * @returns Promise that resolves with animator
     */
    animate(canvas: HTMLCanvasElement | string): Promise<GiflerAnimator>;

    /**
     * Get animator instance
     * @returns Promise that resolves with animator
     */
    get(): Promise<GiflerAnimator>;
  }

  /**
   * Create a gifler instance from a GIF source
   * @param source - GIF source (URL or data URL)
   * @returns Gifler instance
   */
  function gifler(source: string): Gifler;

  export = gifler;
}

