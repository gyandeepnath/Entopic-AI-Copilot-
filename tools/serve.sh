#!/usr/bin/env sh
# Serve Entopic on http://localhost:8000
#
# You do NOT need this to use Entopic — opening index.html in a browser works,
# and that is the whole point of having no build step (docs/adr/001).
#
# Use it when you want to test something that a browser refuses to do on a
# file:// page: service workers, some clipboard APIs, or checking that the
# Content-Security-Policy behaves the way it will in a real deployment.
#
#   sh tools/serve.sh          # port 8000
#   sh tools/serve.sh 9000     # some other port
#
# Stop it with Ctrl-C.
PORT="${1:-8000}"
cd "$(dirname "$0")/.." || exit 1
echo "Entopic is at  http://localhost:$PORT"
echo "Press Ctrl-C to stop."
python3 -m http.server "$PORT"
