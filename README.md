# Comfy Sketch UI

A lightweight web-based frontend for ComfyUI that provides real-time canvas drawing with AI image generation.

## Features

- **Canvas Drawing**: Draw directly in the browser
- **Live Generation**: Real-time image generation as you draw
- **Model Selection**: Choose from available checkpoints, UNets, VAEs, and text encoders
- **Quick Settings**: Adjustable strength, steps, and CFG scale
- **WebSocket Streaming**: Live output preview via ComfyUI's WebSocket

## Prerequisites

- [ComfyUI](https://github.com/comfyanonymous/ComfyUI) installed and running
- Node.js (for running the Vite dev server)

## Quick Start

### 1. Start ComfyUI

```bash
python main.py --listen 0.0.0.0 --port 8188 --input-directory /path/to/input --output-directory /path/to/output
```

### 2. Start the Web UI

```bash
cd webui
npm install
npm run dev -- --host
```

### 3. Open in Browser

Navigate to `http://localhost:5173`

Use `/comfy` as the Server URL (this routes through the Vite proxy to avoid CORS issues).

## Remote Setup

If ComfyUI is running on a different machine:

1. Update `webui/vite.config.js` proxy target to point to your ComfyUI server:
   ```js
   target: 'http://<COMFYUI_IP>:8188'
   ```
2. Restart the Vite dev server
3. Use `/comfy` in the UI Server URL field

Or set the Server URL directly to `http://<COMFYUI_IP>:8188` (may require disabling ad-blockers).

## Project Structure

```
├── docs/
│   └── setup.md          # Detailed setup notes and troubleshooting
├── webui/
│   ├── src/
│   │   ├── main.js       # App entry point
│   │   └── modules/
│   │       ├── api.js        # REST + WebSocket adapters
│   │       ├── canvas.js     # Canvas drawing logic
│   │       ├── output.js     # Output display
│   │       ├── quickSettings.js
│   │       ├── settings.js   # Settings schema & UI
│   │       ├── store.js      # State management
│   │       └── workflow.js   # ComfyUI workflow builder
│   ├── vite.config.js    # Vite config with proxy
│   └── package.json
└── README.md
```

## Documentation

See [docs/setup.md](docs/setup.md) for detailed setup instructions, troubleshooting, and command reference.

## License

MIT
