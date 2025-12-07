import { useState } from 'react'
import { Upload, Settings, Download, Link as LinkIcon, Video } from 'lucide-react'
import { extractFrames, getVideoInfo } from './utils/videoProcessor'
import { analyzeAllFrames } from './api/client'
import axios from 'axios'

function App() {
  const [step, setStep] = useState('upload')
  const [videoFile, setVideoFile] = useState(null)
  const [videoUrl, setVideoUrl] = useState('')
  const [uploadMethod, setUploadMethod] = useState('file')
  const [videoInfo, setVideoInfo] = useState(null)
  const [config, setConfig] = useState({
    apiKey: '',
    model: 'claude-haiku-4-20250514',
    videoType: 'gaming',
    interval: 5,
    minScore: 7,
    maxFrames: 50,
    frameQuality: 0.8
  })
  const [progress, setProgress] = useState({ text: '', percent: 0 })
  const [results, setResults] = useState([])

  // Modèles disponibles
  const models = [
    { id: 'claude-haiku-4-20250514', name: 'Claude 4 Haiku (Rapide & Pas cher)', cost: '~0.0008€/frame' },
    { id: 'claude-sonnet-4-20250514', name: 'Claude 4 Sonnet (Équilibré)', cost: '~0.003€/frame' },
    { id: 'claude-opus-4-20250514', name: 'Claude 4 Opus (Meilleur)', cost: '~0.015€/frame' }
  ]

  const handleVideoUpload = async (file) => {
    setVideoFile(file)
    const info = await getVideoInfo(file)
    setVideoInfo(info)
  }

  const handleYoutubeLoad = async () => {
    if (!videoUrl) {
      alert('Veuillez entrer une URL YouTube')
      return
    }

    try {
      setProgress({ text: 'Téléchargement depuis YouTube...', percent: 0 })
      setStep('analyzing')
      
      // Appeler l'API serverless pour télécharger la vidéo YouTube
      const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:5173'
      const response = await axios.post(`${API_BASE}/api/download_youtube`, {
        url: videoUrl
      })
      
      // Convertir le base64 en blob
      const binaryString = atob(response.data.video_base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'video/mp4' })
      const file = new File([blob], response.data.title + '.mp4', { type: 'video/mp4' })
      
      await handleVideoUpload(file)
      setProgress({ text: '', percent: 0 })
      setStep('upload')
      
      alert(`✅ Vidéo téléchargée : ${response.data.title}`)
      
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du chargement depuis YouTube : ' + (error.response?.data?.error || error.message))
      setProgress({ text: '', percent: 0 })
      setStep('upload')
    }
  }

  const handleAnalyze = async () => {
    if (!videoFile) {
      alert('Veuillez d\'abord charger une vidéo')
      return
    }

    if (!config.apiKey) {
      alert('Veuillez entrer votre clé API Anthropic')
      return
    }

    setStep('analyzing')
    
    try {
      setProgress({ text: 'Extraction des frames...', percent: 0 })
      
      const frames = await extractFrames(
        videoFile, 
        config.interval,
        (percent, count) => {
          setProgress({ 
            text: `Extraction... ${count} frames`, 
            percent 
          })
        }
      )

      // Limiter le nombre de frames si configuré
      const limitedFrames = config.maxFrames > 0 
        ? frames.slice(0, config.maxFrames)
        : frames
      
      setProgress({ text: 'Analyse avec Claude...', percent: 0 })
      
      const analyzed = await analyzeAllFrames(
        limitedFrames,
        config,
        (current, total) => {
          const percent = Math.floor((current / total) * 100)
          setProgress({
            text: `Analyse ${current}/${total}`,
            percent
          })
        }
      )
      
      setResults(analyzed)
      setStep('results')
      
    } catch (error) {
      alert('Erreur : ' + error.message)
      setStep('upload')
    }
  }

  const downloadResults = () => {
    const json = JSON.stringify(results, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'moments.json'
    a.click()
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const estimateCost = () => {
    if (!videoInfo) return '—'
    const frames = Math.min(
      Math.ceil(videoInfo.duration / config.interval),
      config.maxFrames > 0 ? config.maxFrames : 999
    )
    const costPerFrame = config.model.includes('haiku') ? 0.0008 
                       : config.model.includes('sonnet') ? 0.003 
                       : 0.015
    return `~${(frames * costPerFrame).toFixed(2)}€`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            🎬 Video Analyzer Pro
          </h1>
          <p className="text-slate-600 mt-1">
            Trouvez les meilleurs moments automatiquement avec Claude 4
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        
        {step === 'upload' && (
          <div className="space-y-6">
            
            {/* Méthode d'upload */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                1. Charger une vidéo
              </h2>
              
              {/* Choix de la méthode */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setUploadMethod('file')}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition flex items-center justify-center gap-2 ${
                    uploadMethod === 'file'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Video className="w-5 h-5" />
                  Fichier local
                </button>
                <button
                  onClick={() => setUploadMethod('youtube')}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition flex items-center justify-center gap-2 ${
                    uploadMethod === 'youtube'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <LinkIcon className="w-5 h-5" />
                  YouTube
                </button>
              </div>

              {/* Upload par fichier */}
              {uploadMethod === 'file' && (
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files[0]) {
                        handleVideoUpload(e.target.files[0])
                      }
                    }}
                  />
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-indigo-500 transition">
                    <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                    <p className="text-lg font-medium text-slate-700 mb-2">
                      {videoFile ? '✅ ' + videoFile.name : 'Cliquez pour choisir une vidéo'}
                    </p>
                    <p className="text-sm text-slate-500">
                      MP4, MOV, WebM (max 200 MB recommandé)
                    </p>
                  </div>
                </label>
              )}

              {/* Upload par YouTube */}
              {uploadMethod === 'youtube' && (
                <div className="space-y-4">
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Limite : Vidéos de maximum 20 minutes (pour éviter les timeouts)
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      URL YouTube
                    </label>
                    <input
                      type="url"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                  <button
                    onClick={handleYoutubeLoad}
                    className="w-full bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition font-medium"
                  >
                    📥 Télécharger depuis YouTube
                  </button>
                </div>
              )}

              {/* Infos vidéo */}
              {videoInfo && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">
                    📹 Durée : {Math.floor(videoInfo.duration / 60)}:{(videoInfo.duration % 60).toString().padStart(2, '0')} | 
                    📐 {videoInfo.width}×{videoInfo.height} | 
                    💾 {(videoInfo.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              )}
            </div>

            {/* Configuration */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                2. Configuration
              </h2>
              
              <div className="space-y-4">
                {/* Clé API */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Clé API Anthropic *
                  </label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => setConfig({...config, apiKey: e.target.value})}
                    placeholder="sk-ant-..."
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Obtenez votre clé sur <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">console.anthropic.com</a>
                  </p>
                </div>

                {/* Modèle */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Modèle Claude
                  </label>
                  <select
                    value={config.model}
                    onChange={(e) => setConfig({...config, model: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    {models.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} - {model.cost}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Type de vidéo */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Type de vidéo
                  </label>
                  <select
                    value={config.videoType}
                    onChange={(e) => setConfig({...config, videoType: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="gaming">🎮 Gaming / Esport</option>
                    <option value="sport">⚽ Sport</option>
                    <option value="action">🎬 Action / Cinéma</option>
                  </select>
                </div>

                {/* Intervalle */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Intervalle d'extraction : {config.interval}s
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={config.interval}
                    onChange={(e) => setConfig({...config, interval: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Plus l'intervalle est court, plus l'analyse est précise (mais coûteuse)
                  </p>
                </div>

                {/* Score minimum */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Score minimum : {config.minScore}/10
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={config.minScore}
                    onChange={(e) => setConfig({...config, minScore: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Seuls les moments avec ce score ou plus seront gardés
                  </p>
                </div>

                {/* Limite de frames */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Limite de frames (0 = illimité)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="500"
                    value={config.maxFrames}
                    onChange={(e) => setConfig({...config, maxFrames: parseInt(e.target.value)})}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Limitez le nombre de frames analysées pour contrôler les coûts
                  </p>
                </div>

                {/* Estimation du coût */}
                {videoInfo && (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <p className="text-sm font-medium text-indigo-900">
                      💰 Coût estimé : {estimateCost()}
                    </p>
                    <p className="text-xs text-indigo-700 mt-1">
                      {Math.min(
                        Math.ceil(videoInfo.duration / config.interval),
                        config.maxFrames > 0 ? config.maxFrames : 999
                      )} frames à analyser
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!videoFile || !config.apiKey}
                className="w-full mt-6 bg-indigo-600 text-white py-3 px-6 rounded-lg hover:bg-indigo-700 transition font-medium disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                🚀 Lancer l'analyse
              </button>
            </div>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border text-center">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-semibold mb-2">{progress.text}</h2>
            <div className="w-full bg-slate-200 rounded-full h-3 mb-4">
              <div 
                className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              ></div>
            </div>
            <p className="text-slate-600">{progress.percent}%</p>
          </div>
        )}

        {step === 'results' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold">
                  🎯 {results.length} moment{results.length > 1 ? 's' : ''} trouvé{results.length > 1 ? 's' : ''}
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={downloadResults}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                  >
                    <Download className="w-4 h-4" />
                    Exporter JSON
                  </button>
                  <button
                    onClick={() => {
                      setStep('upload')
                      setVideoFile(null)
                      setVideoUrl('')
                      setVideoInfo(null)
                      setResults([])
                    }}
                    className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                  >
                    Nouvelle analyse
                  </button>
                </div>
              </div>

              {results.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-600 text-lg">
                    Aucun moment ne dépasse le score minimum de {config.minScore}/10
                  </p>
                  <button
                    onClick={() => setStep('upload')}
                    className="mt-4 text-indigo-600 hover:underline"
                  >
                    Réessayer avec un score minimum plus bas
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((result, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-2xl font-bold text-indigo-600">
                              #{index + 1}
                            </span>
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                              {result.score}/10
                            </span>
                            <span className="text-slate-500">
                              ⏱️ {formatTime(result.timestamp)}
                            </span>
                          </div>
                          <p className="text-slate-700">{result.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-slate-500 text-sm">
        🎬 Video Analyzer Pro - Powered by Claude 4
      </footer>
    </div>
  )
}

export default App
