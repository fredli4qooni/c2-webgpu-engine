/**
 * C2 Visualizer Engine
 * Copyright (c) 2025 Fredli Fourqoni. All rights reserved.
 *
 * This source code is proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

export class GpuTexture {
  public texture: GPUTexture;
  public sampler: GPUSampler;
  public view: GPUTextureView;
  private device: GPUDevice;

  constructor(device: GPUDevice) {
    this.device = device;
    this.texture = device.createTexture({
      size: [1, 1, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
    this.view = this.texture.createView({ dimension: '2d-array' });
    this.sampler = device.createSampler();
  }

  async load(urls: string[]) {
    const promises = urls.map(async (url) => {
      const res = await fetch(url);
      const blob = await res.blob();
      return createImageBitmap(blob);
    });

    const bitmaps = await Promise.all(promises);

    const width = bitmaps[0].width;
    const height = bitmaps[0].height;
    const layers = bitmaps.length;

    const mipLevelCount = Math.floor(Math.log2(Math.max(width, height))) + 1;

    this.texture.destroy();
    this.texture = this.device.createTexture({
      label: 'Unit Texture Array',
      size: [width, height, layers],
      format: 'rgba8unorm',
      mipLevelCount: mipLevelCount,
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    });

    bitmaps.forEach((bitmap, layerIndex) => {
      this.device.queue.copyExternalImageToTexture(
        { source: bitmap },
        { texture: this.texture, origin: [0, 0, layerIndex] },
        [width, height],
      );
    });

    for (let i = 1; i < mipLevelCount; i++) {
      const resizeWidth = Math.max(1, Math.floor(width / Math.pow(2, i)));
      const resizeHeight = Math.max(1, Math.floor(height / Math.pow(2, i)));

      for (let layer = 0; layer < layers; layer++) {
        const resizedBitmap = await createImageBitmap(bitmaps[layer], {
          resizeWidth,
          resizeHeight,
          resizeQuality: 'high',
        });

        this.device.queue.copyExternalImageToTexture(
          { source: resizedBitmap },
          { texture: this.texture, origin: [0, 0, layer], mipLevel: i },
          [resizeWidth, resizeHeight],
        );
      }
    }

    this.view = this.texture.createView({
      dimension: '2d-array',
      arrayLayerCount: layers,
      baseMipLevel: 0,
      mipLevelCount: mipLevelCount,
    });

    this.sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
    });

    console.log(`Texture Array Loaded: ${layers} layers, ${mipLevelCount} mips.`);
  }
}
