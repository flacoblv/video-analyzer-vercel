from http.server import BaseHTTPRequestHandler
import json
from anthropic import Anthropic

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Lire les données envoyées
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Récupérer les paramètres
            frame_base64 = data.get('frame')
            api_key = data.get('api_key')
            model = data.get('model', 'claude-haiku-4-20250514')
            video_type = data.get('video_type', 'gaming')
            
            # Vérifier que tout est là
            if not frame_base64 or not api_key:
                self.send_error(400, "Il manque la frame ou la clé API")
                return
            
            # Créer le client Claude
            client = Anthropic(api_key=api_key)
            
            # Prompts selon le type de vidéo
            prompts = {
                'gaming': """Tu analyses une vidéo de gaming. 
Évalue l'intérêt de ce moment sur 10 en cherchant :
- Kills impressionnants
- Comebacks épiques
- Plays techniques
- Moments drôles

Réponds EXACTEMENT dans ce format :
Score: X/10
Description: [ta description en 1-2 phrases]""",

                'sport': """Tu analyses une vidéo de sport.
Évalue l'intérêt de ce moment sur 10 en cherchant :
- Actions spectaculaires
- Buts ou points
- Exploits techniques
- Moments décisifs

Réponds EXACTEMENT dans ce format :
Score: X/10
Description: [ta description en 1-2 phrases]""",

                'action': """Tu analyses une vidéo d'action.
Évalue l'intérêt de ce moment sur 10 en cherchant :
- Scènes dynamiques
- Moments de suspense
- Actions impactantes

Réponds EXACTEMENT dans ce format :
Score: X/10
Description: [ta description en 1-2 phrases]"""
            }
            
            prompt = prompts.get(video_type, prompts['gaming'])
            
            # Analyser avec Claude
            response = client.messages.create(
                model=model,
                max_tokens=1024,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": frame_base64
                            }
                        },
                        {
                            "type": "text",
                            "text": prompt
                        }
                    ]
                }]
            )
            
            # Récupérer le texte
            analysis_text = response.content[0].text
            
            # Parser le score et la description
            score = 5  # Par défaut
            description = analysis_text
            
            # Extraire le score
            if "Score:" in analysis_text:
                try:
                    lines = analysis_text.split('\n')
                    score_line = [line for line in lines if 'Score:' in line][0]
                    score_part = score_line.split('/')[0]
                    score = int(score_part.split(':')[1].strip())
                except:
                    pass
            
            # Extraire la description
            if "Description:" in analysis_text:
                try:
                    parts = analysis_text.split('Description:')
                    if len(parts) > 1:
                        description = parts[1].strip()
                except:
                    pass
            
            # Préparer le résultat
            result = {
                'score': score,
                'description': description,
                'raw': analysis_text
            }
            
            # Envoyer la réponse
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            # En cas d'erreur
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'error': str(e)
            }).encode())
    
    def do_OPTIONS(self):
        # Pour les requêtes CORS
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
