import http.server
import socketserver
import os

PORT = 8000

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers if needed (for cross-origin requests, though usually not on localhost)
        # self.send_header('Access-Control-Allow-Origin', '*')
        # self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        # self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        super().end_headers()

    # Override the guess_type method or define a custom one
    def guess_type(self, path):
        if path.endswith(".mjs"):
            return "text/javascript" # This is the key fix
        return super().guess_type(path)

# You can also add more types if needed
# MyHandler.extensions_map['.mjs'] = 'text/javascript'
# MyHandler.extensions_map['.js'] = 'text/javascript' # Ensure .js is also correct

with socketserver.TCPServer(("", PORT), MyHandler) as httpd:
    print("Serving at port", PORT)
    httpd.serve_forever()