
// Declare global cv type to avoid TS errors
declare global {
  interface Window {
    cv: any
  }
}

/**
 * Loads OpenCV.js from CDN if not already loaded.
 * Returns a promise that resolves when cv is ready.
 */
export function loadOpenCV(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.cv) {
      if (window.cv.Mat) {
         resolve()
      } else {
         // CV loaded but not initialized (rare with 4.x but possible)
         // Wait a bit or resolve if it has onRuntimeInitialized
         // Usually 4.8.0 resolves immediately if script is present.
         // Let's rely on onRuntimeInitialized hook if defined in script.
         // But since we are lazy loading, we control the script tag.
         resolve()
      }
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
          if (window.cv && window.cv.Mat) {
             clearInterval(checkCv)
             resolve()
          }
       }, 50)
       
       // Timeout 10s
       setTimeout(() => {
          clearInterval(checkCv)
          if (window.cv && window.cv.Mat) resolve()
          else reject(new Error('OpenCV initialization timeout'))
       }, 10000)
    }

    script.onerror = () => {
      reject(new Error('Failed to load OpenCV script'))
    }

    document.body.appendChild(script)
  })
}
