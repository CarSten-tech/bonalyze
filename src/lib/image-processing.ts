import { logger } from '@/lib/logger'
import { getOpenCV, safeDelete, type CvMatLike } from '@/lib/opencv-loader'

export interface Point {
  x: number
  y: number
}

/**
 * Applies a perspective warp to an image using 4 corner points.
 * Returns a new Blob of the cropped and warped image.
 */
export async function applyPerspectiveWarp(
  imageSource: string | HTMLImageElement,
  corners: [Point, Point, Point, Point], // User provided corners
  outputWidth?: number,
  outputHeight?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      try {
        // ------------------------------------------------------------------
        // Step A: Robust Sort (TL, TR, BR, BL)
        // ------------------------------------------------------------------
        const sortedCorners = sortPoints(corners)
        const [tl, tr, br, bl] = sortedCorners

        // ------------------------------------------------------------------
        // Step B: Dimensions & Aspect Ratio Logic
        // ------------------------------------------------------------------
        // Calculate widths and heights
        const widthTop = distance(tl, tr)
        const widthBottom = distance(bl, br)
        const heightLeft = distance(tl, bl)
        const heightRight = distance(tr, br)

        const maxWidth = Math.max(widthTop, widthBottom)
        const maxHeight = Math.max(heightLeft, heightRight)

        // Strict Aspect Ratio Handling (Step C)
        // If original image is Portrait (h > w), we WANT output to be Portrait.
        // Even if user selected a "wider" crop (unlikely for receipt), 
        // we usually want to maintain the paper flow. 
        // Actually, the user instruction is: 
        // "Wenn dstHeight > dstWidth, müssen die Zielpunkte sein: [0,0], [w,0], [w,h], [0,h]. Drehe das Bild nicht automatisch."
        // Meaning: Do not swap width/height based on corner distances if it violates natural orientation?
        
        // Let's take the logic: "If original height > width, target must be height > width".
        // But detecting "original" orientation from corners:
        // If the detected shape is tall, we output tall.
        
        let finalWidth = outputWidth || maxWidth
        let finalHeight = outputHeight || maxHeight

        // Enforce Orientation matching input image? 
        // User said: "Wenn das Originalbild im Hochformat war (height > width), muss das Ziel-Canvas auch Hochformat sein!"
        if (img.height > img.width) {
            // Original is Portrait
            if (finalWidth > finalHeight) {
                // Computed dimensions are Landscape (e.g. slight rotation or perspective distortion)
                // FORCE Portrait orientation for the output canvas to prevent 90deg rotation behavior
                // Swap
                const temp = finalWidth
                finalWidth = finalHeight
                finalHeight = temp
            }
        } 
        
        // Ensure integers
        finalWidth = Math.floor(finalWidth)
        finalHeight = Math.floor(finalHeight)

        // -----------------------------------------------------
        // 1. OpenCV Method (High Quality)
        // -----------------------------------------------------
        const cv = getOpenCV()
        if (cv) {
           
           const src = cv.imread(img)
           const dst = new cv.Mat()
           
           // Source Points: The user's corners (Sorted)
           const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
              tl.x, tl.y, 
              tr.x, tr.y, 
              br.x, br.y, 
              bl.x, bl.y
           ])

           // Dest Points: The rectangle 0,0 -> w,h
           // Correct Order for: [TopLeft, TopRight, BottomRight, BottomLeft]
           // This maps the user's TL to 0,0, TR to w,0, etc.
           const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
              0, 0, 
              finalWidth, 0, 
              finalWidth, finalHeight, 
              0, finalHeight
           ])
           
           const M = cv.getPerspectiveTransform(srcTri, dstTri)
           const dsize = new cv.Size(finalWidth, finalHeight)
           
           cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar())
           
           // Output
           const canvas = document.createElement('canvas')
           cv.imshow(canvas, dst) // writes to canvas, resizing it to dst size
           
           safeDelete(src); safeDelete(dst); safeDelete(M); safeDelete(srcTri); safeDelete(dstTri);
           
           canvas.toBlob((blob) => {
              if (blob) resolve(blob)
              else reject(new Error('CV warp conversion failed'))
           }, 'image/jpeg', 0.95)
           
           return
        }

        // -----------------------------------------------------
        // 2. Fallback JS Method
        // -----------------------------------------------------
        // Use the same sorted logic
        const canvas = document.createElement('canvas')
        canvas.width = finalWidth
        canvas.height = finalHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject('No ctx')

        const srcData = getImageData(img)
        const dstData = ctx.createImageData(finalWidth, finalHeight)
        
        const H = computeHomography(
          // Target (Rect)
          [0, 0], [finalWidth, 0], [finalWidth, finalHeight], [0, finalHeight],
          // Source (Quad) - must match order
          [tl.x, tl.y], [tr.x, tr.y], [br.x, br.y], [bl.x, bl.y]
        )

        // Inverse mapping
        for (let y = 0; y < finalHeight; y++) {
          for (let x = 0; x < finalWidth; x++) {
             // ... pixel logic ...
             // (Copy existing implementation details but use H)
             const [u, v, w_] = applyMatrix(H, x, y, 1)
             const srcX = u / w_
             const srcY = v / w_

             if (srcX >= 0 && srcX < img.width - 1 && srcY >= 0 && srcY < img.height - 1) {
               const pixel = sampleBilinear(srcData, srcX, srcY, img.width)
               const dstIdx = (y * finalWidth + x) * 4
               dstData.data[dstIdx] = pixel[0]
               dstData.data[dstIdx + 1] = pixel[1]
               dstData.data[dstIdx + 2] = pixel[2]
               dstData.data[dstIdx + 3] = 255
             }
          }
        }
        
        ctx.putImageData(dstData, 0, 0)
        canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95)

      } catch (err) {
        reject(err)
      }
    }
    img.src = typeof imageSource === 'string' ? imageSource : imageSource.src
  })
}

// ------------------------------------------------------------------
// Helper: Sort Points Clockwise (TL, TR, BR, BL)
// ------------------------------------------------------------------
export function sortPoints(pts: Point[]): [Point, Point, Point, Point] {
    // Sort by Y-coordinate first
    // Top 2 are TL/TR, Bottom 2 are BL/BR
    const sortedY = [...pts].sort((a,b) => a.y - b.y)
    
    const top = sortedY.slice(0, 2).sort((a,b) => a.x - b.x) // TL, TR
    const bottom = sortedY.slice(2, 4).sort((a,b) => a.x - b.x) // BL, BR -- wait, strictly BL is left, BR is right

    // TL, TR, BR, BL order? 
    // OpenCV usually expects: TL, TR, BR, BL.
    // My list above: top[0]=TL, top[1]=TR, bottom[1]=BR, bottom[0]=BL
    
    return [top[0], top[1], bottom[1], bottom[0]]
}

/**
 * Applies a filter to the image blob.
 */
export async function applyFilter(
  blob: Blob,
  type: 'original' | 'grayscale' | 'bw'
): Promise<Blob> {
  if (type === 'original') return blob

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        reject(new Error('Canvas context null'))
        return
      }

      ctx.drawImage(img, 0, 0)
      
      // -----------------------------------------------------
      // OpenCV Method (High Quality Adaptive Threshold)
      // -----------------------------------------------------
      const cv = getOpenCV()
      if (type === 'bw' && cv) {
         try {
             const src = cv.imread(canvas)
             const dst = new cv.Mat()
             
             cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0)
             
             // Adaptive Thresholding: nice "Scan" look (Bleach background)
             // block size 21 or 25 usually good for documents
             // C = 10 or 15
             cv.adaptiveThreshold(src, dst, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 21, 15)
             
             cv.imshow(canvas, dst)
             safeDelete(src); safeDelete(dst)
             
             canvas.toBlob((b) => {
                 if (b) resolve(b)
                 else reject(new Error('Filter blob failed'))
             }, 'image/jpeg', 0.9)
             return
         } catch(e) {
             logger.warn("OpenCV filter failed, falling back to JS", { error: e })
         }
      }

      // -----------------------------------------------------
      // Fallback JS Method
      // -----------------------------------------------------
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imgData.data

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        
        // Grayscale (Luminance)
        const gray = 0.299 * r + 0.587 * g + 0.114 * b

        if (type === 'grayscale') {
          data[i] = gray
          data[i + 1] = gray
          data[i + 2] = gray
        } else if (type === 'bw') {
          // Fallback Binarization if OpenCV missing
          const threshold = 128
          const val = gray > threshold ? 255 : 0
          data[i] = val
          data[i + 1] = val
          data[i + 2] = val
        }
      }

      ctx.putImageData(imgData, 0, 0)
      canvas.toBlob((b) => {
        if (b) resolve(b)
        else reject(new Error('Blob failed'))
      }, 'image/jpeg', 0.9)
    }
    img.onerror = reject
    img.src = url
  })

}


export async function detectDocumentEdges(imageSource: string | HTMLImageElement): Promise<[Point, Point, Point, Point] | undefined> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      // 1. Check for OpenCV
      const cv = getOpenCV()
      if (cv) {
          try {
              const maxDim = 500
              const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
              const w = Math.floor(img.width * scale)
              const h = Math.floor(img.height * scale)

              const canvas = document.createElement('canvas')
              canvas.width = w
              canvas.height = h
              const ctx = canvas.getContext('2d')
              if (!ctx) throw new Error('No ctx')
              ctx.drawImage(img, 0, 0, w, h)

              const src = cv.imread(canvas)
              const dst = new cv.Mat()
              
              // Preprocess
              cv.cvtColor(src, dst, cv.COLOR_RGBA2GRAY, 0)
              cv.GaussianBlur(dst, dst, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT)
              
              // Use Canny + Dilate OR Threshold? 
              // For high contrast (receipt on table), Threshold (Otsu) is often better to find the "blob".
              // Let's try Canny with Dilate first as it handles gradients well.
              cv.Canny(dst, dst, 75, 200)
              
              // Dilate to close gaps (text lines etc)
              const M = cv.Mat.ones(3, 3, cv.CV_8U)
              cv.dilate(dst, dst, M, new cv.Point(-1, -1), 2, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue())
              
              // Find Contours
              const contours = new cv.MatVector()
              const hierarchy = new cv.Mat()
              cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

              let maxArea = 0
              let bestBlock: CvMatLike | null = null

              for (let i = 0; i < contours.size(); ++i) {
                  const cnt = contours.get(i)
                  const area = cv.contourArea(cnt)
                  
                  if (area < (w * h * 0.05)) { // Min 5% area
                      cnt.delete()
                      continue
                  }

                  const peri = cv.arcLength(cnt, true)
                  const approx = new cv.Mat()
                  cv.approxPolyDP(cnt, approx, 0.02 * peri, true)

                  if (approx.rows === 4 && area > maxArea) {
                      maxArea = area
                      safeDelete(bestBlock)
                      bestBlock = approx
                  } else {
                      approx.delete()
                  }
                  cnt.delete()
              }

              if (bestBlock) {
                  const invScale = 1 / scale
                  // Extract and Sort Corners (TL, TR, BR, BL)
                  const ptr = bestBlock.data32S
                  const pts: Point[] = [
                      { x: ptr[0], y: ptr[1] },
                      { x: ptr[2], y: ptr[3] },
                      { x: ptr[4], y: ptr[5] },
                      { x: ptr[6], y: ptr[7] }
                  ]
                  
                  // Sort Logic
                  // 1. Sort by Y (top 2 vs bottom 2)
                  pts.sort((a,b) => a.y - b.y)
                  const top = pts.slice(0, 2).sort((a,b) => a.x - b.x) // TL, TR
                  const bottom = pts.slice(2, 4).sort((a,b) => a.x - b.x) // BL, BR (Wait, BL should be smaller X)
                  // BL is bottom[0], BR is bottom[1]
                  
                  const sorted = [top[0], top[1], bottom[1], bottom[0]] // TL, TR, BR, BL
                  
                  const finalCorners: [Point, Point, Point, Point] = [
                      { x: sorted[0].x * invScale, y: sorted[0].y * invScale },
                      { x: sorted[1].x * invScale, y: sorted[1].y * invScale },
                      { x: sorted[2].x * invScale, y: sorted[2].y * invScale },
                      { x: sorted[3].x * invScale, y: sorted[3].y * invScale }
                  ]

                  safeDelete(src); safeDelete(dst); safeDelete(M); safeDelete(contours); safeDelete(hierarchy); safeDelete(bestBlock)
                  resolve(finalCorners)
                  return
              }
              
              // Cleanup if no detection
              safeDelete(src); safeDelete(dst); safeDelete(M); safeDelete(contours); safeDelete(hierarchy)

          } catch (e) {
              logger.error("OpenCV Detect Error", e)
          }
      }

      // --- Fallback (Simple Padding) ---
      // If OpenCV is missing or fails, return undefined (let caller handle or use default)
      logger.warn("Falling back to default crop")
      const padX = img.width * 0.15
      const padY = img.height * 0.15
      resolve([
         { x: padX, y: padY },
         { x: img.width - padX, y: padY },
         { x: img.width - padX, y: img.height - padY },
         { x: padX, y: img.height - padY },
      ])
    }
    
    img.onerror = () => resolve(undefined)
    
    if (typeof imageSource === 'string') {
      img.src = imageSource
    } else {
      img.src = imageSource.src
    }
  })
}

// --- Line Detection for Magnetic Snap ---
export async function detectStrongLines(imageSource: string | HTMLImageElement): Promise<{ horizontal: number[], vertical: number[] }> {
    return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
             const cv = getOpenCV()
             if (!cv) {
                 resolve({ horizontal: [], vertical: [] })
                 return
             }
             try {
                 const canvas = document.createElement('canvas')
                 // Downscale for performance
                 const scale = 500 / Math.max(img.width, img.height)
                 const w = Math.round(img.width * scale)
                 const h = Math.round(img.height * scale)
                 canvas.width = w
                 canvas.height = h
                 const ctx = canvas.getContext('2d')
                 if(!ctx) return resolve({ horizontal: [], vertical: [] })
                 ctx.drawImage(img, 0, 0, w, h)
                 
                 const src = cv.imread(canvas)
                 const dst = new cv.Mat()
                 cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0)
                 cv.Canny(src, dst, 50, 200, 3)
                 
                 const lines = new cv.Mat()
                 // Threshold = 80, MinLineLength = 30, MaxLineGap = 10
                 cv.HoughLinesP(dst, lines, 1, Math.PI / 180, 80, 30, 10)
                 
                 const horizontal: number[] = []
                 const vertical: number[] = []
                 const invScale = 1/scale

                 for (let i = 0; i < lines.rows; ++i) {
                     const startPoint = { x: lines.data32S[i * 4], y: lines.data32S[i * 4 + 1] }
                     const endPoint = { x: lines.data32S[i * 4 + 2], y: lines.data32S[i * 4 + 3] }
                     
                     // Check angle
                     const dx = Math.abs(endPoint.x - startPoint.x)
                     const dy = Math.abs(endPoint.y - startPoint.y)
                     
                     if (dx > dy * 5) { // Horizontal-ish
                         const y = (startPoint.y + endPoint.y) / 2
                         horizontal.push(y * invScale)
                     } else if (dy > dx * 5) { // Vertical-ish
                         const x = (startPoint.x + endPoint.x) / 2
                         vertical.push(x * invScale)
                     }
                 }

                 safeDelete(src); safeDelete(dst); safeDelete(lines)
                 resolve({ horizontal, vertical })
             } catch (e) {
                 logger.error("Line detection failed", e)
                 resolve({ horizontal: [], vertical: [] })
             }
        }
        img.src = typeof imageSource === 'string' ? imageSource : imageSource.src
    })
}

// --- Helpers ---

function distance(p1: Point, p2: Point) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
}

function getImageData(img: HTMLImageElement) {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No ctx')
  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, img.width, img.height)
}

function sampleBilinear(imgData: ImageData, x: number, y: number, width: number) {
  const x1 = Math.floor(x)
  const y1 = Math.floor(y)
  const x2 = Math.min(x1 + 1, width - 1)
  const y2 = Math.min(y1 + 1, imgData.height - 1)
  
  const dx = x - x1
  const dy = y - y1
  
  const p11 = getPixel(imgData, x1, y1, width)
  const p21 = getPixel(imgData, x2, y1, width)
  const p12 = getPixel(imgData, x1, y2, width)
  const p22 = getPixel(imgData, x2, y2, width)
  
  const r = (1 - dx) * (1 - dy) * p11[0] + dx * (1 - dy) * p21[0] + (1 - dx) * dy * p12[0] + dx * dy * p22[0]
  const g = (1 - dx) * (1 - dy) * p11[1] + dx * (1 - dy) * p21[1] + (1 - dx) * dy * p12[1] + dx * dy * p22[1]
  const b = (1 - dx) * (1 - dy) * p11[2] + dx * (1 - dy) * p21[2] + (1 - dx) * dy * p12[2] + dx * dy * p22[2]
  
  return [r, g, b]
}

function getPixel(imgData: ImageData, x: number, y: number, width: number) {
  const i = (y * width + x) * 4
  return [imgData.data[i], imgData.data[i + 1], imgData.data[i + 2]]
}

// Compute Homography Matrix
// Solves h using Gaussian elimination for the 8 DOF
function computeHomography(
  srcP1: number[], srcP2: number[], srcP3: number[], srcP4: number[],
  dstP1: number[], dstP2: number[], dstP3: number[], dstP4: number[]
) {
  // src are the points in the DESTINATION image (rectangular)
  // dst are the points in the SOURCE image (quadrilateral)
  // Why? Because we inverse map: for every pixel in TARGET, find SOURCE.
  
  // Actually, usually you map Source -> Dest.
  // But for pixel filling, we iterate Dest pixels and look up Source.
  // So we calculate the transform from Dest -> Source.
  
  const sx1 = srcP1[0], sy1 = srcP1[1]
  const sx2 = srcP2[0], sy2 = srcP2[1]
  const sx3 = srcP3[0], sy3 = srcP3[1]
  const sx4 = srcP4[0], sy4 = srcP4[1]
  
  const dx1 = dstP1[0], dy1 = dstP1[1]
  const dx2 = dstP2[0], dy2 = dstP2[1]
  const dx3 = dstP3[0], dy3 = dstP3[1]
  const dx4 = dstP4[0], dy4 = dstP4[1]
  
  // Construct 8x8 matrix A and 8x1 vector B for Ah = B
  // Then solve for h
  // ... This is complex to write from scratch.
  // Let's use a simplified logical homography solver for 4 points.
  
  // To keep this file not HUGE, I'll use a very compact gaussian elimination.
  const source = [sx1, sy1, sx2, sy2, sx3, sy3, sx4, sy4]
  const target = [dx1, dy1, dx2, dy2, dx3, dy3, dx4, dy4]
  
  return solveHomography(source, target)
}

function solveHomography(src: number[], dst: number[]) {
  // src: x1,y1... dst: x1,y1...
  const A = []
  const B = []
  
  for(let j=0; j<4; j++) {
    const x = src[j*2]
    const y = src[j*2+1]
    const u = dst[j*2]
    const v = dst[j*2+1]
    
    A.push([x, y, 1, 0, 0, 0, -x*u, -y*u])
    A.push([0, 0, 0, x, y, 1, -x*v, -y*v])
    B.push(u)
    B.push(v)
  }
  
  const h = gaussianElimination(A, B)
  // h is only 8 elements, h33 is 1
  return [ 
    h[0], h[1], h[2], 
    h[3], h[4], h[5], 
    h[6], h[7], 1 
  ]
}

function gaussianElimination(A: number[][], B: number[]) {
  const n = A.length
  
  for (let i=0; i<n; i++) {
    // Pivot
    let maxEl = Math.abs(A[i][i])
    let maxRow = i
    for (let k=i+1; k<n; k++) {
      if (Math.abs(A[k][i]) > maxEl) {
        maxEl = Math.abs(A[k][i])
        maxRow = k
      }
    }
    
    // Swap
    for (let k=i; k<n; k++) {
      const tmp = A[maxRow][k]
      A[maxRow][k] = A[i][k]
      A[i][k] = tmp
    }
    const tmp = B[maxRow]
    B[maxRow] = B[i]
    B[i] = tmp
    
    // Eliminate
    for (let k=i+1; k<n; k++) {
      const c = -A[k][i] / A[i][i]
      for (let j=i; j<n; j++) {
        if (i===j) A[k][j] = 0
        else A[k][j] += c * A[i][j]
      }
      B[k] += c * B[i]
    }
  }
  
  const x = new Array(n).fill(0)
  for (let i=n-1; i>=0; i--) {
    let sum = 0
    for (let j=i+1; j<n; j++) {
      sum += A[i][j] * x[j]
    }
    x[i] = (B[i] - sum) / A[i][i]
  }
  return x
}

function applyMatrix(m: number[], x: number, y: number, w: number) {
  const X = m[0]*x + m[1]*y + m[2]*w
  const Y = m[3]*x + m[4]*y + m[5]*w
  const W = m[6]*x + m[7]*y + m[8]*w
  return [X, Y, W]
}
