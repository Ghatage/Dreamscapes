# Comfy Sketch UI - Setup & Notes

This document captures current state, what works, what doesn't, and how to set up the web UI with ComfyUI locally or on another machine/server.

## Current state (what works)
- Web UI runs via Vite (vanilla JS) in `E:\ws\openai_hackathon\webui`.
- ComfyUI is the backend, accessed via REST + WebSocket.
- Model dropdown is populated through `/api/etn/model_info/*` endpoints.
- Canvas input is uploaded to ComfyUI via `/upload/image` (no base64 decode in workflow).
- Output is streamed back via WebSocket using `ETN_SendImageWebSocket`.
- Proxy `/comfy` is used to avoid CORS/adblock issues.

## Current limitations (known gaps)
- Workflow in the web UI is a basic pipeline (not the full Krita live workflow).
- Krita-style live painting (only update touched areas, prompt weighting, live strength) is not yet mirrored.
- To mirror Krita exactly, a workflow dump (`workflow.json`) is required from Krita.

## Project structure (important files)
- Web UI: `E:\ws\openai_hackathon\webui`
  - `src/modules/workflow.js` - builds ComfyUI workflow JSON
  - `src/modules/api.js` - REST + WebSocket adapters
  - `src/modules/settings.js` - settings schema and collapsible UI
  - `src/modules/quickSettings.js` - small settings near canvas
  - `vite.config.js` - proxy to ComfyUI
- ComfyUI install: `E:\ws\ComfyUI`

## Local setup (same machine)

### 1) Start ComfyUI
Use dedicated input/output folders to avoid permission errors:
```
E:\ws\ComfyUI\venv\Scripts\python.exe E:\ws\ComfyUI\ComfyUI\main.py --listen 0.0.0.0 --port 8188 --input-directory E:\ws\ComfyUI\input --output-directory E:\ws\ComfyUI\output
```

Verify:
```
http://127.0.0.1:8188
```

### 2) Start the web UI
```
cd E:\ws\openai_hackathon\webui
npm install
npm run dev -- --host
```

Open:
```
http://localhost:5173
```

### 3) Server URL in the web UI
Use:
```
/comfy
```
This routes requests through the Vite proxy (avoids CORS/adblock issues).

## Remote setup (ComfyUI on another machine/server)

### ComfyUI machine
1) Start ComfyUI bound to all interfaces:
```
python main.py --listen 0.0.0.0 --port 8188 --input-directory D:\ComfyUI\input --output-directory D:\ComfyUI\output
```
2) Allow port 8188 through firewall.
3) Verify from another machine:
```
http://<COMFYUI_IP>:8188
```

### Web UI machine
Option A (simple, no proxy):
- In the web UI, set **Server URL** to `http://<COMFYUI_IP>:8188`
- If blocked by adblock/CORS, use Option B.

Option B (proxy via Vite):
- In `vite.config.js`, set proxy target to the ComfyUI server:
  ```
  target: 'http://<COMFYUI_IP>:8188'
  ```
- Restart Vite.
- Use `/comfy` in the UI Server URL field.

## Command cheat sheet

### ComfyUI (local)
```
E:\ws\ComfyUI\venv\Scripts\python.exe E:\ws\ComfyUI\ComfyUI\main.py --listen 0.0.0.0 --port 8188 --input-directory E:\ws\ComfyUI\input --output-directory E:\ws\ComfyUI\output
```

### ComfyUI (remote host)
```
python main.py --listen 0.0.0.0 --port 8188 --input-directory D:\ComfyUI\input --output-directory D:\ComfyUI\output
```

### Web UI (dev server)
```
cd E:\ws\openai_hackathon\webui
npm install
npm run dev -- --host
```

### Test ComfyUI model endpoint
```
curl http://127.0.0.1:8188/api/etn/model_info/checkpoints
```

### Test via Vite proxy
```
curl http://localhost:5173/comfy/api/etn/model_info/checkpoints
```

### Restart ComfyUI from scratch
```
taskkill /F /IM python.exe
E:\ws\ComfyUI\venv\Scripts\python.exe E:\ws\ComfyUI\ComfyUI\main.py --listen 0.0.0.0 --port 8188 --input-directory E:\ws\ComfyUI\input --output-directory E:\ws\ComfyUI\output
```

## Models & endpoints used
- Checkpoints (SDXL): `/api/etn/model_info/checkpoints`
- Flux UNets: `/api/etn/model_info/diffusion_models`
- Text encoders: `/api/etn/model_info/text_encoders`
- VAEs: `/api/etn/model_info/vae`

## Troubleshooting

### Model dropdown empty
- Ensure Server URL is `/comfy` (or correct direct URL).
- Check DevTools → Network for `/comfy/api/etn/model_info/checkpoints`.
- If you see `ERR_BLOCKED_BY_CLIENT`, disable adblock for localhost or use proxy.

### ComfyUI not reachable
- Ensure ComfyUI is running and listening on the right IP/port.
- Check firewall rules for port 8188.

### Image upload errors
- Ensure input directory is writable.
- Use `--input-directory` and `--output-directory` flags.

### Web UI slow or laggy
- Lower resolution and steps (defaults are 512x512, 12 steps).
- Increase live debounce (currently 900 ms).

## Krita workflow parity (future work)
To mirror Krita live painting:
1) Enable dump:
   - `C:\Users\barat\AppData\Roaming\krita\ai_diffusion\settings.json`
   - Set `"debug_dump_workflow": true`
2) Restart Krita.
3) Run a live-paint stroke with at least one visible paint layer.
4) Retrieve:
   - `C:\Users\barat\AppData\Roaming\krita\ai_diffusion\logs\workflow.json`
5) Replace `webui/src/modules/workflow.js` with the dumped graph.

If you want help wiring the dumped workflow, share the JSON and the desired SDXL model (e.g., `zavychromaxl_v80.safetensors`).
