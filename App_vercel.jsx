import { useState } from 'react'
import { Upload, Settings, Download } from 'lucide-react'
import { extractFrames, getVideoInfo } from './utils/videoProcessor'
import { analyzeAllFrames } from './api/client'

function App() {
  const [step, setStep] = useState('upload')
  const [videoFile, setVideoFile] = useState(null)
  const [videoInfo, setVideoInfo] = useState(null)
  const [config, setConfig] = useState({
    apiKey: '',
    videoType: 'gaming',
    model: 'claude-haiku-4-20250514',
    interval: 5,
    minScore: 7
  })
  const [progress, setProgress] = useState({ text: '', percent: 0 })
  const [results, setResults] = useState([])

  const handleVideoUpload = async (file) => {
    setVideoFile(file)
    const info = await getVideoInfo(file)
    setVideoInfo(info)
  }

  const handleAnalyze = async () => {
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
      
      setProgress({ text: 'Analyse avec Claude...', percent: 0 })
      
      const analyzed = await analyzeAllFrames(
        frames,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            🎬 Video Analyzer
          </h1>
          <p className="text-slate-600 mt-1">
            Trouvez les meilleurs moments automatiquement
          </p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        
        {step === 'upload' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm border">
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-indigo-500 transition">
                  <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-lg font-medium text-slate-700 mb-2">
                    Cliquez pour choisir une vidéo
                  </p>
                  <p className="text-sm text-slate-500">
                    MP4, MOV, WebM (max 200 MB recommandé)
                  </p>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => handleVideoUpload(e.target.files[0])}
                  />
                </div>
              </label>

              {videoInfo && (
                <div className="mt-6 p-4 bg-slate-50 rounded-lg">
                  <p className="font-medium mb-2">{videoFile.name}</p>
                  <div className="grid grid-cols-3 gap-4 text-sm text-slate-600">
                    <div>⏱️ {videoInfo.duration}s</div>
                    <div>📐 {videoInfo.width}×{videoInfo.height}</div>
                    <div>💾 {(videoInfo.size / 1024 / 1024).toFixed(1)} MB</div>
                  </div>
                </div>
              )}
            </div>

            {videoFile && (
              <div className="bg-white rounded-2xl p-8 shadow-sm border space-y-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Configuration
                </h2>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    🔑 Clé API Anthropic
                  </label>
                  <input
                    type="password"
                    value={config.apiKey}
                    onChange={(e) => setConfig({...config, apiKey: e.target.value})}
                    placeholder="sk-ant-..."
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Obtenez votre clé sur console.anthropic.com
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    🎮 Type de vidéo
                  </label>
                  <select
                    value={config.videoType}
                    onChange={(e) => setConfig({...config, videoType: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    <option value="gaming">Gaming</option>
                    <option value="sport">Sport</option>
                    <option value="action">Action</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    ⏱️ Intervalle : {config.interval}s
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    value={config.interval}
                    onChange={(e) => setConfig({...config, interval: parseInt(e.target.value)})}
                    className="w-full"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Plus c'est petit, plus c'est précis (mais plus cher)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    ⭐ Score minimum : {config.minScore}/10
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="9"
                    value={config.minScore}
                    onChange={(e) => setConfig({...config, minScore: parseInt(e.target.value)})}
                    className="w-full"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    💰 Coût estimé : ~{(videoInfo.duration / config.interval * 0.0008).toFixed(2)}€
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Environ {Math.ceil(videoInfo.duration / config.interval)} frames à analyser
                  </p>
                </div>

                <button
                  onClick={handleAnalyze}
                  disabled={!config.apiKey}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg font-medium transition"
                >
                  🚀 Lancer l'analyse
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'analyzing' && (
          <div className="bg-white rounded-2xl p-12 shadow-sm border text-center">
            <div className="animate-spin w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-6"></div>
            <p className="text-lg font-medium mb-2">{progress.text}</p>
            <div className="max-w-md mx-auto bg-slate-200 rounded-full h-3 mt-4">
              <div 
                className="bg-indigo-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              ></div>
            </div>
            <p className="text-sm text-slate-500 mt-2">{progress.percent}%</p>
          </div>
        )}

        {step === 'results' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">
                    🎉 {results.length} moments détectés
                  </h2>
                  <p className="text-slate-600 mt-1">
                    Triés du meilleur au moins bon
                  </p>
                </div>
                <button
                  onClick={downloadResults}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                >
                  <Download className="w-4 h-4" />
                  JSON
                </button>
              </div>
            </div>

            {results.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center">
                <p className="text-slate-500">
                  😕 Aucun moment trouvé avec un score ≥ {config.minScore}
                </p>
                <button
                  onClick={() => setStep('upload')}
                  className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg"
                >
                  Recommencer
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {results.map((result, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 shadow-sm border hover:shadow-md transition">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-16 h-16 bg-indigo-100 rounded-lg flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-indigo-600">
                          {result.score}
                        </span>
                        <span className="text-xs text-indigo-500">/10</span>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-slate-500">
                            ⏱️ {Math.floor(result.timestamp / 60)}:{(result.timestamp % 60).toString().padStart(2, '0')}
                          </span>
                          <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                            #{i + 1}
                          </span>
                        </div>
                        <p className="text-slate-700">{result.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => {
                setStep('upload')
                setVideoFile(null)
                setVideoInfo(null)
                setResults([])
              }}
              className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition"
            >
              ← Analyser une autre vidéo
            </button>
          </div>
        )}
      </main>

      <footer className="text-center text-sm text-slate-500 py-8">
        🎬 Video Analyzer Pro - Powered by Claude 4
      </footer>
    </div>
  )
}

export default App
