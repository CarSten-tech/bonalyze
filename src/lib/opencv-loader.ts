export interface CvMatLike {
  rows: number
  cols: number
  data32S: Int32Array
  copyTo(dst: CvMatLike): void
  delete(): void
  isDeleted?(): boolean
}

export interface CvMatVectorLike {
  size(): number
  get(index: number): CvMatLike
  delete(): void
  isDeleted?(): boolean
}

export interface CvSizeLike {
  width: number
  height: number
}

export interface OpenCvLike {
  Mat: {
    new (): CvMatLike
    ones(rows: number, cols: number, type: number): CvMatLike
  }
  MatVector: new () => CvMatVectorLike
  Size: new (width: number, height: number) => CvSizeLike
  Point: new (x: number, y: number) => { x: number; y: number }
  Scalar: new (...values: number[]) => unknown
  imread(source: HTMLCanvasElement | HTMLImageElement): CvMatLike
  imshow(target: HTMLCanvasElement, mat: CvMatLike): void
  resize(src: CvMatLike, dst: CvMatLike, dsize: CvSizeLike, fx: number, fy: number, interpolation: number): void
  cvtColor(src: CvMatLike, dst: CvMatLike, code: number, dstCn?: number): void
  GaussianBlur(src: CvMatLike, dst: CvMatLike, ksize: CvSizeLike, sigmaX: number, sigmaY: number, borderType: number): void
  threshold(src: CvMatLike, dst: CvMatLike, thresh: number, maxval: number, type: number): void
  morphologyEx(src: CvMatLike, dst: CvMatLike, op: number, kernel: CvMatLike): void
  findContours(image: CvMatLike, contours: CvMatVectorLike, hierarchy: CvMatLike, mode: number, method: number): void
  contourArea(contour: CvMatLike): number
  arcLength(curve: CvMatLike, closed: boolean): number
  approxPolyDP(curve: CvMatLike, approxCurve: CvMatLike, epsilon: number, closed: boolean): void
  isContourConvex(contour: CvMatLike): boolean
  matFromArray(rows: number, cols: number, type: number, data: number[]): CvMatLike
  getPerspectiveTransform(src: CvMatLike, dst: CvMatLike): CvMatLike
  warpPerspective(
    src: CvMatLike,
    dst: CvMatLike,
    M: CvMatLike,
    dsize: CvSizeLike,
    flags: number,
    borderMode: number,
    borderValue: unknown
  ): void
  adaptiveThreshold(
    src: CvMatLike,
    dst: CvMatLike,
    maxValue: number,
    adaptiveMethod: number,
    thresholdType: number,
    blockSize: number,
    C: number
  ): void
  Canny(image: CvMatLike, edges: CvMatLike, threshold1: number, threshold2: number, apertureSize?: number): void
  dilate(
    src: CvMatLike,
    dst: CvMatLike,
    kernel: CvMatLike,
    anchor: { x: number; y: number },
    iterations: number,
    borderType: number,
    borderValue: unknown
  ): void
  HoughLinesP(
    image: CvMatLike,
    lines: CvMatLike,
    rho: number,
    theta: number,
    threshold: number,
    minLineLength: number,
    maxLineGap: number
  ): void
  morphologyDefaultBorderValue(): unknown
  INTER_AREA: number
  INTER_LINEAR: number
  COLOR_RGBA2GRAY: number
  BORDER_DEFAULT: number
  BORDER_CONSTANT: number
  THRESH_BINARY: number
  THRESH_OTSU: number
  ADAPTIVE_THRESH_GAUSSIAN_C: number
  MORPH_CLOSE: number
  CV_8U: number
  CV_32FC2: number
  RETR_EXTERNAL: number
  CHAIN_APPROX_SIMPLE: number
}

declare global {
  interface Window {
    cv?: OpenCvLike
  }
}

export function getOpenCV(): OpenCvLike | null {
  if (typeof window === 'undefined') return null
  return window.cv?.Mat ? window.cv : null
}

export function safeDelete(target: { delete(): void; isDeleted?(): boolean } | null | undefined) {
  if (!target) return
  if (typeof target.isDeleted === 'function' && target.isDeleted()) return
  target.delete()
}

/**
 * Loads OpenCV.js from CDN if not already loaded.
 * Returns a promise that resolves when cv is ready.
 */
export function loadOpenCV(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.cv?.Mat) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js'
    script.async = true
    script.type = 'text/javascript'

    // OpenCV.js doesn't use standard onload, it uses Module.onRuntimeInitialized
    // However, for the CDN version, we can hook into window.cv logic
    
    // We need to setup the Module global before loading script
    // to catch the initialization.
    // BUT: polluting global window['Module'] might conflict.
    // simpler approach: Poll for window.cv
    
    script.onload = () => {
       // Script loaded, wait for WASM init
       const checkCv = setInterval(() => {
          if (window.cv?.Mat) {
             clearInterval(checkCv)
             resolve()
          }
       }, 50)
       
       // Timeout 10s
       setTimeout(() => {
          clearInterval(checkCv)
          if (window.cv?.Mat) resolve()
          else reject(new Error('OpenCV initialization timeout'))
       }, 10000)
    }

    script.onerror = () => {
      reject(new Error('Failed to load OpenCV script'))
    }

    document.body.appendChild(script)
  })
}
