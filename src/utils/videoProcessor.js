/**
 * Extrait les frames d'une vidéo directement dans le navigateur
 * (pas besoin de serveur !)
 */
export async function extractFrames(videoFile, interval = 5, onProgress = null) {
  return new Promise((resolve, reject) => {
    // Créer les éléments HTML
    const video = document.createElement('video')
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    // Charger la vidéo
    video.src = URL.createObjectURL(videoFile)
    video.muted = true
    video.playsInline = true
    
    const frames = []
    let currentTime = 0
    
    // Gérer les erreurs
    video.onerror = () => {
      reject(new Error('Erreur de chargement de la vidéo'))
    }
    
    // Quand la vidéo est chargée
    video.onloadedmetadata = () => {
      // Limiter la résolution (économise de la bande passante)
      const maxWidth = 640
      const maxHeight = 360
      
      const scale = Math.min(
        maxWidth / video.videoWidth,
        maxHeight / video.videoHeight,
        1
      )
      
      canvas.width = Math.floor(video.videoWidth * scale)
      canvas.height = Math.floor(video.videoHeight * scale)
      
      // Commencer l'extraction
      captureFrame()
    }
    
    // Fonction pour capturer une frame
    function captureFrame() {
      // Si on a fini
      if (currentTime >= video.duration) {
        URL.revokeObjectURL(video.src)
        resolve(frames)
        return
      }
      
      // Aller au bon moment
      video.currentTime = currentTime
      
      // Quand on est au bon moment
      video.onseeked = () => {
        // Dessiner la vidéo sur le canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        
        // Convertir en image base64
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
        
        // Sauvegarder
        frames.push({
          timestamp: Math.floor(currentTime),
          base64
        })
        
        // Notifier la progression
        if (onProgress) {
          const progress = Math.floor((currentTime / video.duration) * 100)
          onProgress(progress, frames.length)
        }
        
        // Frame suivante
        currentTime += interval
        captureFrame()
      }
    }
  })
}

/**
 * Obtenir les informations d'une vidéo
 */
export async function getVideoInfo(videoFile) {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.src = URL.createObjectURL(videoFile)
    
    video.onloadedmetadata = () => {
      resolve({
        duration: Math.floor(video.duration),
        width: video.videoWidth,
        height: video.videoHeight,
        size: videoFile.size
      })
      URL.revokeObjectURL(video.src)
    }
  })
}
