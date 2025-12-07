/**
 * C2 Visualizer Engine
 * Copyright (c) 2025 Fredli Fourqoni. All rights reserved.
 *
 * This source code is proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import simulationShaderRaw from '../../shaders/simulation.wgsl?raw';
import { GpuBuffer } from '../resources/GpuBuffer';

export class SimulationPass {
  private device: GPUDevice;
  private pipeline: GPUComputePipeline | null = null;
  private bindGroup: GPUBindGroup | null = null;

  constructor(device: GPUDevice) {
    this.device = device;
  }

  async init(
    uniformBuffer: GpuBuffer,
    positionBuffer: GpuBuffer,
    velocityBuffer: GpuBuffer,
    indirectBuffer: GpuBuffer,
    visibleIndicesBuffer: GpuBuffer,
    statusBuffer: GpuBuffer,
    pickingBuffer: GpuBuffer,
  ) {
    const module = this.device.createShaderModule({
      label: 'Simulation Shader',
      code: simulationShaderRaw,
    });

    const bindGroupLayout = this.device.createBindGroupLayout({
      label: 'Simulation Layout',
      entries: [
        { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
        { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } },
      ],
    });

    this.pipeline = this.device.createComputePipeline({
      label: 'Simulation Pipeline',
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
      compute: { module, entryPoint: 'simulate' },
    });

    this.bindGroup = this.device.createBindGroup({
      label: 'Simulation BindGroup',
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: uniformBuffer.buffer } },
        { binding: 1, resource: { buffer: positionBuffer.buffer } },
        { binding: 2, resource: { buffer: velocityBuffer.buffer } },
        { binding: 3, resource: { buffer: indirectBuffer.buffer } },
        { binding: 4, resource: { buffer: visibleIndicesBuffer.buffer } },
        { binding: 5, resource: { buffer: statusBuffer.buffer } },
        { binding: 6, resource: { buffer: pickingBuffer.buffer } },
      ],
    });
  }

  record(commandEncoder: GPUCommandEncoder, workgroupCount: number) {
    if (!this.pipeline || !this.bindGroup) return;

    const pass = commandEncoder.beginComputePass({ label: 'Simulation Pass' });
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.dispatchWorkgroups(workgroupCount);
    pass.end();
  }
}
