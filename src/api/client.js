import axios from 'axios'

// URL de l'API (change automatiquement en prod/dev)
const API_BASE = import.meta.env.PROD 
  ? '' // En production, même domaine
  : 'http://localhost:5173' // En développement

/**
 * Analyser une frame avec Claude
 */
export async function analyzeFrame(frame, config) {
  try {
    const response = await axios.post(`${API_BASE}/api/analyze`, {
      frame: frame.base64,
      api_key: config.apiKey,
      model: config.model,
      video_type: config.videoType
    })
    
    return {
      ...response.data,
      timestamp: frame.timestamp
    }
  } catch (error) {
    console.error('Erreur lors de l\'analyse:', error)
    throw new Error(error.response?.data?.error || 'Erreur d\'analyse')
  }
}

/**
 * Analyser toutes les frames
 */
export async function analyzeAllFrames(frames, config, onProgress) {
  const results = []
  
  for (let i = 0; i < frames.length; i++) {
    try {
      const result = await analyzeFrame(frames[i], config)
      results.push(result)
      
      if (onProgress) {
        onProgress(i + 1, frames.length, result)
      }
      
      // Petite pause pour ne pas surcharger l'API
      await new Promise(resolve => setTimeout(resolve, 500))
      
    } catch (error) {
      console.error(`Erreur sur la frame ${i}:`, error)
      // Continuer malgré l'erreur
    }
  }
  
  // Filtrer par score minimum et trier du meilleur au moins bon
  return results
    .filter(r => r.score >= config.minScore)
    .sort((a, b) => b.score - a.score)
}