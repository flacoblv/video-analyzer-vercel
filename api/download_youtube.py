from http.server import BaseHTTPRequestHandler
import json
import os
import sys

# Installer yt-dlp à la volée si nécessaire
try:
    import yt_dlp
except ImportError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--break-system-packages", "yt-dlp"])
    import yt_dlp

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Lire les données
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            youtube_url = data.get('url')
            
            if not youtube_url:
                self.send_error(400, "URL manquante")
                return
            
            # Configuration yt-dlp avec headers pour contourner la détection
            ydl_opts = {
                'format': 'bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4][height<=720]/best',
                'outtmpl': '/tmp/%(id)s.%(ext)s',
                'quiet': True,
                'no_warnings': True,
                'extract_flat': False,
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'http_headers': {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-us,en;q=0.5',
                    'Sec-Fetch-Mode': 'navigate',
                },
                'extractor_args': {
                    'youtube': {
                        'player_client': ['android', 'web'],
                        'skip': ['hls', 'dash']
                    }
                },
            }
            
            # Télécharger les infos
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=False)
                
                # Vérifier la durée (max 20 minutes pour éviter les timeouts)
                duration = info.get('duration', 0)
                if duration > 1200:  # 20 minutes
                    self.send_response(400)
                    self.send_header('Content-Type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'error': f'Vidéo trop longue ({duration//60} min). Maximum : 20 minutes.'
                    }).encode())
                    return
                
                # Télécharger la vidéo
                ydl.download([youtube_url])
                
                # Trouver le fichier téléchargé
                video_id = info.get('id')
                video_path = f"/tmp/{video_id}.mp4"
                
                if not os.path.exists(video_path):
                    # Chercher avec d'autres extensions
                    for ext in ['webm', 'mkv']:
                        alt_path = f"/tmp/{video_id}.{ext}"
                        if os.path.exists(alt_path):
                            video_path = alt_path
                            break
                
                if not os.path.exists(video_path):
                    raise Exception("Fichier vidéo non trouvé après téléchargement")
                
                # Lire le fichier
                with open(video_path, 'rb') as f:
                    video_data = f.read()
                
                # Nettoyer
                try:
                    os.remove(video_path)
                except:
                    pass
                
                # Convertir en base64
                import base64
                video_base64 = base64.b64encode(video_data).decode('utf-8')
                
                # Envoyer la réponse
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'video_base64': video_base64,
                    'title': info.get('title', 'video'),
                    'duration': duration,
                    'size': len(video_data)
                }).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': str(e)
            }).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
