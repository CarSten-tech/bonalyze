export interface CornerPoint {
  x: number
  y: number
}

export function drawDocumentOverlay(
  overlayCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  displayCorners?: CornerPoint[]
) {
  overlayCtx.clearRect(0, 0, width, height)

  if (!displayCorners) {
    return
  }

  overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.5)'
  overlayCtx.fillRect(0, 0, width, height)

  overlayCtx.globalCompositeOperation = 'destination-out'
  overlayCtx.beginPath()
  overlayCtx.moveTo(displayCorners[0].x, displayCorners[0].y)
  overlayCtx.lineTo(displayCorners[1].x, displayCorners[1].y)
  overlayCtx.lineTo(displayCorners[2].x, displayCorners[2].y)
  overlayCtx.lineTo(displayCorners[3].x, displayCorners[3].y)
  overlayCtx.closePath()
  overlayCtx.fill()
  overlayCtx.globalCompositeOperation = 'source-over'

  overlayCtx.strokeStyle = 'white'
  overlayCtx.lineWidth = 12
  overlayCtx.lineCap = 'round'
  overlayCtx.lineJoin = 'round'

  const cornerLength = 50

  const drawCorner = (
    corner: CornerPoint,
    previousCorner: CornerPoint,
    nextCorner: CornerPoint
  ) => {
    const dxToPrevious = previousCorner.x - corner.x
    const dyToPrevious = previousCorner.y - corner.y
    const lengthToPrevious = Math.sqrt(dxToPrevious * dxToPrevious + dyToPrevious * dyToPrevious)

    const dxToNext = nextCorner.x - corner.x
    const dyToNext = nextCorner.y - corner.y
    const lengthToNext = Math.sqrt(dxToNext * dxToNext + dyToNext * dyToNext)

    if (lengthToPrevious < 1 || lengthToNext < 1) return

    overlayCtx.beginPath()
    overlayCtx.moveTo(
      corner.x + (dxToPrevious / lengthToPrevious) * Math.min(cornerLength, lengthToPrevious),
      corner.y + (dyToPrevious / lengthToPrevious) * Math.min(cornerLength, lengthToPrevious)
    )
    overlayCtx.lineTo(corner.x, corner.y)
    overlayCtx.lineTo(
      corner.x + (dxToNext / lengthToNext) * Math.min(cornerLength, lengthToNext),
      corner.y + (dyToNext / lengthToNext) * Math.min(cornerLength, lengthToNext)
    )
    overlayCtx.stroke()
  }

  drawCorner(displayCorners[0], displayCorners[3], displayCorners[1])
  drawCorner(displayCorners[1], displayCorners[0], displayCorners[2])
  drawCorner(displayCorners[2], displayCorners[1], displayCorners[3])
  drawCorner(displayCorners[3], displayCorners[2], displayCorners[0])
}
