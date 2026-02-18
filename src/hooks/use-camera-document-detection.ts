'use client'

import * as React from 'react'
import type Webcam from 'react-webcam'
import { drawDocumentOverlay, type CornerPoint } from '@/lib/camera-document-overlay'
import { getOpenCV, safeDelete, type CvMatLike, type CvMatVectorLike } from '@/lib/opencv-loader'

const NO_DETECTION_RESET_FRAMES = 5
const LERP_FACTOR = 0.4

type WebcamRef = React.RefObject<Webcam | null>
type CanvasRef = React.RefObject<HTMLCanvasElement | null>

interface UseCameraDocumentDetectionOptions {
  webcamRef: WebcamRef
  canvasRef: CanvasRef
  overlayRef: CanvasRef
  enabled: boolean
}

export function useCameraDocumentDetection({
  webcamRef,
  canvasRef,
  overlayRef,
  enabled,
}: UseCameraDocumentDetectionOptions) {
  const [detectedCorners, setDetectedCorners] = React.useState<CornerPoint[] | undefined>(undefined)
  const cornersHistory = React.useRef<CornerPoint[][]>([])
  const noDetectionCount = React.useRef(0)

  React.useEffect(() => {
    if (!enabled || !webcamRef.current?.video || !canvasRef.current || !overlayRef.current) return

    let animationFrameId = 0
    const cv = getOpenCV()
    if (!cv) return

    const video = webcamRef.current.video
    const overlayCanvas = overlayRef.current

    const processFrame = () => {
      if (video.readyState !== 4) {
        animationFrameId = requestAnimationFrame(processFrame)
        return
      }

      const width = video.videoWidth
      const height = video.videoHeight

      if (canvasRef.current && canvasRef.current.width !== width) {
        canvasRef.current.width = width
        canvasRef.current.height = height
        overlayCanvas.width = width
        overlayCanvas.height = height
      }

      let src: CvMatLike | null = null
      let dst: CvMatLike | null = null
      let contours: CvMatVectorLike | null = null
      let hierarchy: CvMatLike | null = null
      let bestContour: CvMatLike | null = null

      try {
        const canvas = canvasRef.current
        if (!canvas) return

        const context = canvas.getContext('2d')
        if (!context) return

        context.drawImage(video, 0, 0, width, height)

        src = cv.imread(canvas)
        dst = new cv.Mat()

        let dsize = new cv.Size(0, 0)
        const scale = 350 / Math.max(width, height)
        if (scale < 1) {
          const scaledWidth = Math.round(width * scale)
          const scaledHeight = Math.round(height * scale)
          dsize = new cv.Size(scaledWidth, scaledHeight)
          cv.resize(src, dst, dsize, 0, 0, cv.INTER_AREA)
        } else {
          src.copyTo(dst)
        }

        cv.cvtColor(dst, dst, cv.COLOR_RGBA2GRAY, 0)
        cv.GaussianBlur(dst, dst, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT)
        cv.threshold(dst, dst, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)

        const kernel = cv.Mat.ones(5, 5, cv.CV_8U)
        cv.morphologyEx(dst, dst, cv.MORPH_CLOSE, kernel)
        kernel.delete()

        contours = new cv.MatVector()
        hierarchy = new cv.Mat()
        cv.findContours(dst, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

        let maxArea = 0

        for (let i = 0; i < contours.size(); i += 1) {
          const contour = contours.get(i)
          const area = cv.contourArea(contour)

          if (area < dst.cols * dst.rows * 0.1) {
            contour.delete()
            continue
          }

          const perimeter = cv.arcLength(contour, true)
          const approx = new cv.Mat()
          cv.approxPolyDP(contour, approx, 0.015 * perimeter, true)

          if (approx.rows === 4 && area > maxArea && cv.isContourConvex(approx)) {
            maxArea = area
            safeDelete(bestContour)
            bestContour = approx
          } else {
            approx.delete()
          }

          contour.delete()
        }

        const overlayContext = overlayCanvas.getContext('2d')
        if (!overlayContext) return

        let displayCorners: CornerPoint[] | undefined

        if (bestContour) {
          const invScale = 1 / (scale < 1 ? scale : 1)
          const rawPoints: CornerPoint[] = []
          const pointBuffer = bestContour.data32S

          for (let i = 0; i < 4; i += 1) {
            rawPoints.push({
              x: pointBuffer[i * 2] * invScale,
              y: pointBuffer[i * 2 + 1] * invScale,
            })
          }

          rawPoints.sort((a, b) => a.y - b.y)
          const top = rawPoints.slice(0, 2).sort((a, b) => a.x - b.x)
          const bottom = rawPoints.slice(2, 4).sort((a, b) => a.x - b.x)

          const targetPoints = [top[0], top[1], bottom[1], bottom[0]]

          if (cornersHistory.current.length === 0) {
            cornersHistory.current = [targetPoints]
            displayCorners = targetPoints
          } else {
            const previousPoints = cornersHistory.current[0]
            const smoothedPoints = previousPoints.map((point, index) => ({
              x: point.x + (targetPoints[index].x - point.x) * LERP_FACTOR,
              y: point.y + (targetPoints[index].y - point.y) * LERP_FACTOR,
            }))
            cornersHistory.current = [smoothedPoints]
            displayCorners = smoothedPoints
          }

          noDetectionCount.current = 0
          safeDelete(bestContour)
        } else {
          noDetectionCount.current += 1
          if (noDetectionCount.current < NO_DETECTION_RESET_FRAMES && cornersHistory.current.length > 0) {
            displayCorners = cornersHistory.current[0]
          } else {
            cornersHistory.current = []
            displayCorners = undefined
          }
        }

        setDetectedCorners(displayCorners)
        drawDocumentOverlay(overlayContext, width, height, displayCorners)

        safeDelete(src)
        safeDelete(dst)
        safeDelete(contours)
        safeDelete(hierarchy)
      } catch {
        safeDelete(src)
        safeDelete(dst)
        safeDelete(contours)
        safeDelete(hierarchy)
      }

      animationFrameId = requestAnimationFrame(processFrame)
    }

    animationFrameId = requestAnimationFrame(processFrame)

    return () => {
      cancelAnimationFrame(animationFrameId)
      cornersHistory.current = []
      noDetectionCount.current = 0
      setDetectedCorners(undefined)
      const overlayContext = overlayCanvas.getContext('2d')
      const width = overlayCanvas.width || 0
      const height = overlayCanvas.height || 0
      if (overlayContext && width && height) {
        overlayContext.clearRect(0, 0, width, height)
      }
    }
  }, [enabled, webcamRef, canvasRef, overlayRef])

  return { detectedCorners }
}
