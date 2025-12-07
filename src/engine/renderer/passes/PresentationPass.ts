/**
 * C2 Visualizer Engine
 * Copyright (c) 2025 Fredli Fourqoni. All rights reserved.
 *
 * This source code is proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import presentationShaderRaw from '../../shaders/presentation.wgsl?raw';
import { GpuBuffer } from '../resources/GpuBuffer';
import { GpuTexture } from '../resources/GpuTexture';

export class PresentationPass {
  private device: GPUDevice;
  private format: GPUTextureFormat;
  private pipeline: GPURenderPipeline | null = null;
  private bindGroup: GPUBindGroup | null = null;

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device;
    this.format = format;
  }

  async init(
    uniformBuffer: GpuBuffer,
    positionBuffer: GpuBuffer,
    visibleIndicesBuffer: GpuBuffer,
    typeBuffer: GpuBuffer,
    atlasTexture: GpuTexture,
  ) {
    const module = this.device.createShaderModule({
      label: 'Presentation Shader',
      code: presentationShaderRaw,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Presentation Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
        { binding: 2, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
        { binding: 3, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
        { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { viewDimension: '2d-array' } },
        { binding: 5, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      ],
    });

    this.pipeline = this.device.createRenderPipeline({
      label: 'Presentation Pipeline',
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      vertex: { module, entryPoint: 'vs_main' },
      fragment: {
        module,
        entryPoint: 'fs_main',
        targets: [
          {
            format: this.format,
            blend: {
              color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' },
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
            },
          },
        ],
      },
      primitive: { topology: 'triangle-list' },
    });

    this.bindGroup = this.device.createBindGroup({
      label: 'Presentation BindGroup',
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer.buffer } },
        { binding: 1, resource: { buffer: positionBuffer.buffer } },
        { binding: 2, resource: { buffer: visibleIndicesBuffer.buffer } },
        { binding: 3, resource: { buffer: typeBuffer.buffer } },
        { binding: 4, resource: atlasTexture.view },
        { binding: 5, resource: atlasTexture.sampler },
      ],
    });
  }

  record(
    commandEncoder: GPUCommandEncoder,
    textureView: GPUTextureView,
    indirectBuffer: GpuBuffer,
  ) {
    if (!this.pipeline || !this.bindGroup) return;

    const pass = commandEncoder.beginRenderPass({
      label: 'Main Render Pass',
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.05, g: 0.05, b: 0.1, a: 1.0 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });

    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.drawIndirect(indirectBuffer.buffer, 0);
    pass.end();
  }
}
