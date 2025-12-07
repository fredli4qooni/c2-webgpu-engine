# WebGPU C2 Engine (Massive Entity Simulation)

![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)
![License](https://img.shields.io/badge/license-Proprietary-red.svg)
![Tech](https://img.shields.io/badge/tech-WebGPU%20%7C%20React%20%7C%20TypeScript-green.svg)

A high-performance Command & Control (**C2**) visualization engine built directly on the **WebGPU API**.
Designed to render and simulate **1,000,000+ dynamic entities** at 60 FPS in the browser — bypassing the bottleneck of traditional WebGL/CPU pipelines.

This project follows a **data-oriented architecture (ECS)** with Compute Shaders handling physics, culling, and interactions.

---

## Tech

* **Core:** WebGPU (Raw API), WGSL
* **Language:** TypeScript
* **Frontend:** React 19, Vite
* **UI:** Shadcn/UI, Tailwind CSS
* **Math:** gl-matrix

---

## Controls

* **Left Click + Drag** — Pan camera
* **Scroll Wheel** — Zoom (with adaptive mipmaps)
* **Hover** — Highlight entity
* **Left Click** — Select entity & show telemetry
* **UI Button:** *“Ingest Data (+10k)”* — Simulates WebSocket data via Web Worker

---

## Project Structure

```bash
src/
├── api/               # Web Workers for data ingestion/parsing
├── components/        # React UI overlay (HUD, panels)
├── engine/            # Core WebGPU logic
│   ├── core/          # Camera & math utilities
│   ├── renderer/      # Render passes & GPU resource wrappers
│   │   ├── passes/    # Simulation & presentation passes
│   │   └── resources/ # GpuBuffer & GpuTexture abstractions
│   └── shaders/       # WGSL compute/vertex shaders
└── App.tsx            # Entry point
```

---

## System Requirements

A GPU compatible with **DirectX 12, Vulkan, or Metal** is required.
Older devices limited to WebGL **are not supported**.

---

## License

**Copyright (c) 2025
Fredli Fourqoni.**
This project is *proprietary*. Unauthorized copying or distribution is prohibited.

---