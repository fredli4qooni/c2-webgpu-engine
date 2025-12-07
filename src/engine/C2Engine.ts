/**
 * C2 Visualizer Engine
 * Copyright (c) 2025 Fredli Fourqoni. All rights reserved.
 *
 * This source code is proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import { GpuBuffer } from './renderer/resources/GpuBuffer';
import { GpuTexture } from './renderer/resources/GpuTexture';
import { SimulationPass } from './renderer/passes/SimulationPass';
import { PresentationPass } from './renderer/passes/PresentationPass';
import { Camera } from './core/Camera';

export class C2Engine {
  public canvas: HTMLCanvasElement;
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';

  private readonly NUM_PARTICLES = 1_000_000;

  private positionBuffer: GpuBuffer | null = null;
  private velocityBuffer: GpuBuffer | null = null;
  private uniformBuffer: GpuBuffer | null = null;
  private indirectBuffer: GpuBuffer | null = null;
  private visibleIndicesBuffer: GpuBuffer | null = null;
  private statusBuffer: GpuBuffer | null = null;
  private typeBuffer: GpuBuffer | null = null;
  private pickingBuffer: GpuBuffer | null = null;
  private stagingBuffer: GPUBuffer | null = null;

  private atlasTexture: GpuTexture | null = null;

  private simulationPass: SimulationPass | null = null;
  private presentationPass: PresentationPass | null = null;

  private camera: Camera;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private clickTriggered = false;
  private isReadingBack = false;

  private nextFreeSlot = 0;
  private mouseWorldX = 0;
  private mouseWorldY = 0;

  public onEntitySelected: ((id: number | null) => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.camera = new Camera();
    this.setupInput();
    this.printSignature();
  }

  private printSignature() {
    console.log(
      '%c C2 ENGINE v1.0 %c \nPowered by WebGPU \n© 2025 Fredli Dev',
      'background: #222; color: #bada55; font-size: 14px; padding: 4px; border-radius: 4px;',
      'color: #888; font-size: 12px;',
    );
  }

  private setupInput() {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();

      if (this.isDragging) {
        const sensitivity = 2.0;
        const dx = ((e.clientX - this.lastMouseX) / rect.height) * sensitivity;
        const dy = ((e.clientY - this.lastMouseY) / rect.height) * sensitivity;
        this.camera.pan(dx, -dy);
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const ndcX = (x / rect.width) * 2 - 1;
      const ndcY = -((y / rect.height) * 2 - 1);

      this.mouseWorldX = this.camera.x + (ndcX * this.camera.aspect) / this.camera.zoom;
      this.mouseWorldY = this.camera.y + ndcY / this.camera.zoom;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.canvas.style.cursor = 'grabbing';
      if (e.button === 0) this.clickTriggered = true;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
      this.canvas.style.cursor = 'default';
    });

    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        const factor = 1 + -e.deltaY * 0.001;
        this.camera.zoomIn(factor);
      },
      { passive: false },
    );
  }

  public async init() {
    if (!navigator.gpu) throw new Error('WebGPU not supported');
    const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!adapter) throw new Error('No adapter found');
    this.device = await adapter.requestDevice();
    this.context = this.canvas.getContext('webgpu');
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context?.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied',
    });

    this.resize(this.canvas.width, this.canvas.height);
    this.initResources();

    this.atlasTexture = new GpuTexture(this.device!);

    const baseUrl = import.meta.env.BASE_URL;

    await this.atlasTexture.load([
      `${baseUrl}assets/friendly1.png`,
      `${baseUrl}assets/hostile.png`,
      `${baseUrl}assets/neutral1.png`,
      `${baseUrl}assets/unknown.png`,
    ]);

    this.simulationPass = new SimulationPass(this.device!);
    this.presentationPass = new PresentationPass(this.device!, this.format);

    await this.simulationPass.init(
      this.uniformBuffer!,
      this.positionBuffer!,
      this.velocityBuffer!,
      this.indirectBuffer!,
      this.visibleIndicesBuffer!,
      this.statusBuffer!,
      this.pickingBuffer!,
    );

    await this.presentationPass.init(
      this.uniformBuffer!,
      this.positionBuffer!,
      this.visibleIndicesBuffer!,
      this.typeBuffer!,
      this.atlasTexture!,
    );
  }

  private initResources() {
    if (!this.device) return;

    const particleCount = this.NUM_PARTICLES;
    const storageUsage = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST;

    this.positionBuffer = new GpuBuffer(
      this.device,
      'Pos',
      new Float32Array(particleCount * 4),
      storageUsage,
    );
    this.velocityBuffer = new GpuBuffer(
      this.device,
      'Vel',
      new Float32Array(particleCount * 4),
      storageUsage,
    );
    this.visibleIndicesBuffer = new GpuBuffer(
      this.device,
      'Vis',
      particleCount * 4,
      GPUBufferUsage.STORAGE,
    );
    this.statusBuffer = new GpuBuffer(
      this.device,
      'Stat',
      new Uint32Array(particleCount),
      storageUsage,
    );
    this.typeBuffer = new GpuBuffer(
      this.device,
      'Type',
      new Uint32Array(particleCount),
      storageUsage,
    );

    this.indirectBuffer = new GpuBuffer(
      this.device,
      'Indirect',
      new Uint32Array([6, 0, 0, 0]),
      storageUsage | GPUBufferUsage.INDIRECT,
    );

    this.uniformBuffer = new GpuBuffer(
      this.device,
      'Uniform',
      96,
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    );

    this.pickingBuffer = new GpuBuffer(
      this.device,
      'Pick',
      new Uint32Array([0xffffffff]),
      storageUsage | GPUBufferUsage.COPY_SRC,
    );

    this.stagingBuffer = this.device.createBuffer({
      size: 4,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });
  }

  public render() {
    if (
      !this.device ||
      !this.context ||
      !this.simulationPass ||
      !this.presentationPass ||
      !this.uniformBuffer ||
      !this.indirectBuffer
    )
      return;

    if (this.clickTriggered) {
      this.pickingBuffer!.update(new Uint32Array([0xffffffff]));
    }

    this.uniformBuffer.update(this.camera.matrix, 0);
    const params = new Float32Array([
      0.016,
      this.canvas.width,
      this.canvas.height,
      0.0,
      this.mouseWorldX,
      this.mouseWorldY,
      0.05 / this.camera.zoom,
      this.clickTriggered ? 1.0 : 0.0,
    ]);
    this.uniformBuffer.update(params, 64);

    this.indirectBuffer.update(new Uint32Array([0]), 4);

    const commandEncoder = this.device.createCommandEncoder();
    const workgroups = Math.ceil(this.NUM_PARTICLES / 64);

    this.simulationPass.record(commandEncoder, workgroups);

    if (this.clickTriggered && !this.isReadingBack) {
      commandEncoder.copyBufferToBuffer(this.pickingBuffer!.buffer, 0, this.stagingBuffer!, 0, 4);
    }

    const textureView = this.context.getCurrentTexture().createView();
    this.presentationPass.record(commandEncoder, textureView, this.indirectBuffer);

    this.device.queue.submit([commandEncoder.finish()]);

    if (this.clickTriggered && !this.isReadingBack) {
      this.readPickingResult();
      this.clickTriggered = false;
    }
  }

  private async readPickingResult() {
    if (!this.stagingBuffer) return;
    this.isReadingBack = true;
    await this.stagingBuffer.mapAsync(GPUMapMode.READ);
    const range = this.stagingBuffer.getMappedRange();
    const pickedId = new Uint32Array(range)[0];
    this.stagingBuffer.unmap();
    this.isReadingBack = false;

    if (this.onEntitySelected) {
      this.onEntitySelected(pickedId !== 0xffffffff ? pickedId : null);
    }
  }

  public resize(width: number, height: number) {
    this.canvas.width = Math.max(1, width);
    this.canvas.height = Math.max(1, height);
    this.camera.updateAspect(this.canvas.width, this.canvas.height);
  }

  public ingestEntities(
    pos: Float32Array,
    vel: Float32Array,
    status: Uint32Array,
    types: Uint32Array,
  ) {
    if (!this.positionBuffer || !this.velocityBuffer || !this.statusBuffer || !this.typeBuffer)
      return;

    const count = status.length;
    const spawnCount = Math.min(count, this.NUM_PARTICLES - this.nextFreeSlot);
    if (spawnCount <= 0) return;

    const startSlot = this.nextFreeSlot;
    this.positionBuffer.update(pos.subarray(0, spawnCount * 4), startSlot * 16);
    this.velocityBuffer.update(vel.subarray(0, spawnCount * 4), startSlot * 16);
    this.statusBuffer.update(status.subarray(0, spawnCount), startSlot * 4);
    this.typeBuffer.update(types.subarray(0, spawnCount), startSlot * 4);

    this.nextFreeSlot += spawnCount;
  }

  public destroy() {
    this.positionBuffer?.destroy();
    this.velocityBuffer?.destroy();
    this.uniformBuffer?.destroy();
    this.indirectBuffer?.destroy();
    this.visibleIndicesBuffer?.destroy();
    this.statusBuffer?.destroy();
    this.typeBuffer?.destroy();
    this.pickingBuffer?.destroy();
    this.stagingBuffer?.destroy();
    this.atlasTexture?.texture.destroy();
  }
}
