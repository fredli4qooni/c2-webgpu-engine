/**
 * C2 Visualizer Engine
 * Copyright (c) 2025 Fredli Fourqoni. All rights reserved.
 *
 * This source code is proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

export class GpuBuffer {
  public buffer: GPUBuffer;
  public size: number;
  public usage: number;
  private device: GPUDevice;
  private label: string;

  constructor(
    device: GPUDevice,
    label: string,
    sizeOrData: number | Float32Array | Uint32Array,
    usage: number,
  ) {
    this.device = device;
    this.label = label;
    this.usage = usage;

    const isDataProvided = sizeOrData instanceof Float32Array || sizeOrData instanceof Uint32Array;

    this.size = isDataProvided ? (sizeOrData as Float32Array).byteLength : (sizeOrData as number);

    this.buffer = device.createBuffer({
      label: this.label,
      size: this.size,
      usage: this.usage,
      mappedAtCreation: isDataProvided,
    });

    if (isDataProvided) {
      const arrayBuffer = this.buffer.getMappedRange();
      if (sizeOrData instanceof Float32Array) {
        new Float32Array(arrayBuffer).set(sizeOrData);
      } else if (sizeOrData instanceof Uint32Array) {
        new Uint32Array(arrayBuffer).set(sizeOrData);
      }
      this.buffer.unmap();
    }
  }

  update(data: Float32Array | Uint32Array, offsetBytes: number = 0) {
    this.device.queue.writeBuffer(this.buffer, offsetBytes, data as BufferSource);
  }

  destroy() {
    this.buffer.destroy();
  }
}
