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
  corners: [Point, Point, Point, Point], // TL, TR, BR, BL
  outputWidth?: number,
  outputHeight?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      try {
        let w = outputWidth || Math.max(
          distance(corners[0], corners[1]), 
          distance(corners[3], corners[2])
        )
        let h = outputHeight || Math.max(
          distance(corners[0], corners[3]), 
          distance(corners[1], corners[2])
        )

        // Safeguard
        if (!w || Number.isNaN(w) || w <= 0) w = img.width
        if (!h || Number.isNaN(h) || h <= 0) h = img.height
        
        w = Math.floor(w)
        h = Math.floor(h)

        // -----------------------------------------------------
        // 1. OpenCV Method (High Quality & Fast)
        // -----------------------------------------------------
        if (window.cv && window.cv.Mat) {
           const cv = window.cv
           
           // Create Mats
           let src = cv.imread(img)
           let dst = new cv.Mat()
           
           // Source Points (The corners from user)
           // cv.matFromArray(rows, cols, type, array)
           // Order: TL, TR, BR, BL ... Wait, perspectiveTransform needs consistent order?
           // Actually, getPerspectiveTransform expects matched pairs. 
           // Let's assume input corners are ordered TL, TR, BR, BL (Standard)
           
           let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
              corners[0].x, corners[0].y, 
              corners[1].x, corners[1].y, 
              corners[2].x, corners[2].y, 
              corners[3].x, corners[3].y
           ])

           // Dest Points (The rect [0,0] -> [w,h])
           let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
              0, 0, 
              w, 0, 
              w, h, 
              0, h
           ])
           
           // Get Matrix
           let M = cv.getPerspectiveTransform(srcTri, dstTri)
           let dsize = new cv.Size(w, h)
           
           // Warp
           cv.warpPerspective(src, dst, M, dsize, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar())
           
           // Output
           // cv.imshow needs a canvas
           const canvas = document.createElement('canvas')
           // cv.imshow(canvas, dst) -- this resizes canvas to dst size? usually yes
           // Let's manually copy if needed, but imshow is standard for opencv.js
           cv.imshow(canvas, dst)
           
           // Cleanup
           src.delete(); dst.delete(); M.delete(); srcTri.delete(); dstTri.delete();
           
           canvas.toBlob((blob) => {
              if (blob) resolve(blob)
              else reject(new Error('CV warp conversion failed'))
           }, 'image/jpeg', 0.95)
           
           return
        }

        // -----------------------------------------------------
        // 2. Fallback JS Method (Slow or Approximation)
        // -----------------------------------------------------
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Could not get 2D context'))
          return
        }
        
        const srcData = getImageData(img)
        const dstData = ctx.createImageData(w, h)
        
        const H = computeHomography(
          [0, 0], [w, 0], [w, h], [0, h],
          [corners[0].x, corners[0].y], 
          [corners[1].x, corners[1].y], 
          [corners[2].x, corners[2].y], 
          [corners[3].x, corners[3].y]
        )

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const [u, v, w_] = applyMatrix(H, x, y, 1)
            const srcX = u / w_
            const srcY = v / w_

            if (srcX >= 0 && srcX < img.width - 1 && srcY >= 0 && srcY < img.height - 1) {
              const pixel = sampleBilinear(srcData, srcX, srcY, img.width)
              const dstIdx = (y * w + x) * 4
              dstData.data[dstIdx] = pixel[0]
              dstData.data[dstIdx + 1] = pixel[1]
              dstData.data[dstIdx + 2] = pixel[2]
              dstData.data[dstIdx + 3] = 255
            }
          }
        }
        
        ctx.putImageData(dstData, 0, 0)
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob)
          else reject(new Error('Conversion to blob failed'))
        }, 'image/jpeg', 0.95)

      } catch (err) {
        reject(err)
      }
    }
    
    img.onerror = reject
    if (typeof imageSource === 'string') {
      img.src = imageSource
    } else {
      img.src = imageSource.src
    }
  })
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
          // Simple local thresholding could be better, but doing global for speed now
          // or a sophisticated adaptive threshold.
          // Let's do a slightly adaptive approach or just high contrast.
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

/**
 * Detects document edges using a simple brightness threshold.
 * best suited for: Light document on Dark background.
 */
/**
 * Detects document edges using a Connected Component Analysis + Convex Hull approach.
 * 1. Downscale
 * 2. Threshold (Adaptive-ish)
 * 3. Find Largest Connected Component
 * 4. Convex Hull
 * 5. Fit Quad
 */
export async function detectDocumentEdges(
  imageSource: string | HTMLImageElement
): Promise<[Point, Point, Point, Point]> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      try {
        // 1. Downscale for performance (max 512px)
        const maxDim = 512
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
        const w = Math.floor(img.width * scale)
        const h = Math.floor(img.height * scale)

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('No ctx')
        
        ctx.drawImage(img, 0, 0, w, h)
        const imgData = ctx.getImageData(0, 0, w, h)
        const data = imgData.data

        // 2. Binarization (Simple Threshold)
        // Receipts are usually lighter than background.
        // Let's find the average brightness, then threshold.
        // Actually, adaptive threshold is better but expensive in JS.
        // Let's stick to a robust global threshold with a "center weight" heuristic?
        // No, let's use a fixed percentile or Otsu.
        // For MVP: Simple threshold 128 often works if flash is used.
        // Better: Iterate and find min/max intensity, then (min+max)/2.
        
        // Convert to Grayscale & finding min/max
        const gray = new Uint8Array(w * h)
        let minVal = 255, maxVal = 0
        for (let i = 0; i < w * h; i++) {
            const r = data[i*4]
            const g = data[i*4+1]
            const b = data[i*4+2]
            const lum = 0.299 * r + 0.587 * g + 0.114 * b
            gray[i] = lum
            if (lum < minVal) minVal = lum
            if (lum > maxVal) maxVal = lum
        }

        const threshold = minVal + (maxVal - minVal) * 0.45 // Slightly below middle
        const binary = new Uint8Array(w * h) // 1 = object, 0 = bg
        for (let i = 0; i < w * h; i++) {
           binary[i] = gray[i] > threshold ? 1 : 0
        }

        // 3. Find Largest Connected Component (CCL)
        // Simple Union-Find or Two-Pass algorithm?
        // A simple flood fill from every non-visited pixel is easiest to write.
        const visited = new Uint8Array(w * h)
        let maxComponent: number[] = [] 
        
        // Optimization: Checking center first usually finds the receipt
        const checkPoints = [
            (h/2 * w) + w/2, // Center
            (h/3 * w) + w/3,
            (h/2 * w) + w/4
        ]

        // Flood fill helper (iterative using stack to avoid recursion limit)
        const getComponent = (startIndex: number) => {
            if (binary[startIndex] === 0 || visited[startIndex]) return []
            
            const component = []
            const stack = [startIndex]
            visited[startIndex] = 1
            
            while(stack.length > 0) {
               const idx = stack.pop()!
               component.push(idx)
               
               const cx = idx % w
               const cy = Math.floor(idx / w)
               
               // 4-connectivity
               const neighbors = []
               if (cx > 0) neighbors.push(idx - 1)
               if (cx < w - 1) neighbors.push(idx + 1)
               if (cy > 0) neighbors.push(idx - w)
               if (cy < h - 1) neighbors.push(idx + w) // Bottom
               
               for(const n of neighbors) {
                   if (binary[n] === 1 && !visited[n]) {
                       visited[n] = 1
                       stack.push(n)
                   }
               }
            }
            return component
        }
        
        // Scan for components
        for (let i = 0; i < w * h; i+= 4) { // Skip-scan for speed
            if (binary[i] === 1 && !visited[i]) {
                const comp = getComponent(i)
                if (comp.length > maxComponent.length) {
                    maxComponent = comp
                }
            }
        }
        
        // If max component is too small (< 5% of screen), return default
        if (maxComponent.length < (w * h * 0.05)) {
             // Fallback
             const padX = img.width * 0.15
             const padY = img.height * 0.15
             resolve([
               { x: padX, y: padY },
               { x: img.width - padX, y: padY },
               { x: img.width - padX, y: img.height - padY },
               { x: padX, y: img.height - padY },
             ])
             return
        }

        // 4. Compute Convex Hull (Monotone Chain algorithm)
        // First convert indices to Points
        const points: Point[] = []
        // taking a subset to reduce hull time?
        const step = Math.ceil(maxComponent.length / 1000) 
        for(let i=0; i<maxComponent.length; i+=step) {
             const idx = maxComponent[i]
             points.push({ x: idx % w, y: Math.floor(idx / w) })
        }
        
        const hull = convexHull(points)

        // 5. Simplify Hull to Quad (4 corners)
        // Find the 4 points that approximate the hull best (largest area quad)
        const corners = findQuadFromHull(hull, w, h)
        
        // Scale back up
        const invScale = 1 / scale
        const finalCorners: [Point, Point, Point, Point] = [
            { x: corners[0].x * invScale, y: corners[0].y * invScale },
            { x: corners[1].x * invScale, y: corners[1].y * invScale },
            { x: corners[2].x * invScale, y: corners[2].y * invScale },
            { x: corners[3].x * invScale, y: corners[3].y * invScale },
        ]
        
        resolve(finalCorners)

      } catch (err) {
        console.error("Detection error:", err)
        // Safe fallback
        const padX = img.width * 0.2
        const padY = img.height * 0.2
        resolve([
           { x: padX, y: padY },
           { x: img.width - padX, y: padY },
           { x: img.width - padX, y: img.height - padY },
           { x: padX, y: img.height - padY },
        ])
      }
    }
    
    img.onerror = () => reject(new Error('Image failed to load'))
    
    if (typeof imageSource === 'string') {
      img.src = imageSource
    } else {
      img.src = imageSource.src
    }
  })
}

// --- Geometry Helpers ---

function crossProduct(o: Point, a: Point, b: Point) {
   return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)
}

function convexHull(points: Point[]): Point[] {
   points.sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x)
   
   const lower: Point[] = []
   for (const p of points) {
       while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
           lower.pop()
       }
       lower.push(p)
   }
   
   const upper: Point[] = []
   for (let i = points.length - 1; i >= 0; i--) {
       const p = points[i]
        while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
           upper.pop()
       }
       upper.push(p)
   }
   
   upper.pop()
   lower.pop()
   return lower.concat(upper)
}

// Find 4 extreme points
function findQuadFromHull(hull: Point[], w: number, h: number): [Point, Point, Point, Point] {
    if (hull.length < 4) return [{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}]
    
    // Heuristic: Points closest to the 4 corners of the image bounds
    // This assumes the receipt is somewhat centered and not rotated 45deg
    // Robust "Rotating Calipers" is better but harder.
    // Let's use: max dist sum to corners (TL, TR, BR, BL).
    
    // Actually, to handle rotation:
    // 1. Find centroid
    // 2. Find points in 4 quadrants relative to centroid?
    // 
    // Simplest robust method for document:
    // Sum of x+y (max = BR), x-y (max = TR), -x+y (max=BL), -x-y (max=TL)
    
    let tl = hull[0], tr = hull[0], br = hull[0], bl = hull[0]
    let minSum = Infinity, maxSum = -Infinity, minDiff = Infinity, maxDiff = -Infinity
    
    for(const p of hull) {
        const sum = p.x + p.y
        const diff = p.x - p.y
        
        if (sum < minSum) { minSum = sum; tl = p }
        if (sum > maxSum) { maxSum = sum; br = p }
        if (diff < minDiff) { minDiff = diff; bl = p }
        if (diff > maxDiff) { maxDiff = diff; tr = p }
    }
    
    // Ensure they are distinct (e.g. if diamond shape)
    // If not, just return image bounds with padding.
    
    return [tl, tr, br, bl]
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
  let i = 0
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
