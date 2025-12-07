/**
 * C2 Visualizer Engine
 * Copyright (c) 2025 Fredli Fourqoni. All rights reserved.
 *
 * This source code is proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

/// <reference lib="webworker" />

const ctx = self as unknown as DedicatedWorkerGlobalScope;

type WorkerMessage =
  | { type: 'GENERATE_SPAWN'; count: number }
  | {
      type: 'SPAWN_DATA_READY';
      pos: Float32Array;
      vel: Float32Array;
      status: Uint32Array;
      types: Uint32Array;
    };

ctx.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const msg = e.data;

  if (msg.type === 'GENERATE_SPAWN') {
    const count = msg.count;

    const posData = new Float32Array(count * 4);
    const velData = new Float32Array(count * 4);
    const statusData = new Uint32Array(count);
    const typeData = new Uint32Array(count);

    for (let i = 0; i < count; i++) {
      posData[i * 4 + 0] = (Math.random() - 0.5) * 0.1;
      posData[i * 4 + 1] = (Math.random() - 0.5) * 0.1;
      posData[i * 4 + 2] = 0;
      posData[i * 4 + 3] = 1;

      velData[i * 4 + 0] = (Math.random() - 0.5) * 0.01;
      velData[i * 4 + 1] = (Math.random() - 0.5) * 0.01;

      statusData[i] = 1;

      const rand = Math.random();
      if (rand < 0.5) {
        typeData[i] = 0;
      } else if (rand < 0.8) {
        typeData[i] = 1;
      } else if (rand < 0.95) {
        typeData[i] = 2;
      } else {
        typeData[i] = 3;
      }
    }

    ctx.postMessage(
      {
        type: 'SPAWN_DATA_READY',
        pos: posData,
        vel: velData,
        status: statusData,
        types: typeData,
      },
      [posData.buffer, velData.buffer, statusData.buffer, typeData.buffer],
    );
  }
};
