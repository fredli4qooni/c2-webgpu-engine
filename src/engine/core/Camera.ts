/**
 * C2 Visualizer Engine
 * Copyright (c) 2025 Fredli Fourqoni. All rights reserved.
 *
 * This source code is proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import { mat4 } from 'gl-matrix';

export class Camera {
  x: number = 0;
  y: number = 0;
  zoom: number = 1.0;

  aspect: number = 1.0;

  matrix: Float32Array;
  private projectionMatrix: mat4;
  private viewMatrix: mat4;

  constructor() {
    this.matrix = new Float32Array(16);
    this.projectionMatrix = mat4.create();
    this.viewMatrix = mat4.create();

    this.updateMatrix();
  }

  updateAspect(width: number, height: number) {
    if (height === 0) return;
    this.aspect = width / height;
    this.updateMatrix();
  }

  pan(dx: number, dy: number) {
    this.x -= dx / this.zoom;
    this.y += dy / this.zoom;
    this.updateMatrix();
  }

  zoomIn(factor: number) {
    this.zoom *= factor;
    this.zoom = Math.max(0.1, Math.min(this.zoom, 100.0));
    this.updateMatrix();
  }

  updateMatrix() {
    const zoomScale = 1.0 / this.zoom;
    const left = -this.aspect * zoomScale;
    const right = this.aspect * zoomScale;
    const bottom = -1.0 * zoomScale;
    const top = 1.0 * zoomScale;

    mat4.ortho(this.projectionMatrix, left, right, bottom, top, -1, 1);

    mat4.identity(this.viewMatrix);
    mat4.translate(this.viewMatrix, this.viewMatrix, [-this.x, -this.y, 0]);

    mat4.multiply(this.matrix, this.projectionMatrix, this.viewMatrix as mat4);
  }
}
