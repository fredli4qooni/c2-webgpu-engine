/**
 * UI Component for C2 Visualizer
 * Copyright (c) 2025 Fredli Fourqoni.
 */

import React, { useEffect, useRef, useState } from 'react';
import { C2Engine } from '../engine/C2Engine';
import { ShieldAlert, Activity, X } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const UnitDetailPanel = ({ id, onClose }: { id: number; onClose: () => void }) => (
  <Card className='absolute top-4 right-4 w-72 bg-zinc-950/90 border-zinc-800 text-zinc-100 backdrop-blur-md shadow-2xl animate-in fade-in slide-in-from-right-10 pointer-events-auto'>
    <CardHeader className='pb-3 border-b border-zinc-800/50'>
      <div className='flex justify-between items-start'>
        <div className='space-y-1'>
          <CardTitle className='text-sm font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-2'>
            <ShieldAlert className='w-4 h-4 text-orange-500' />
            Unit Data
          </CardTitle>
          <CardDescription className='text-xs text-zinc-500'>Real-time Telemetry</CardDescription>
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='h-6 w-6 text-zinc-500 hover:text-white -mt-1 -mr-2'
          onClick={onClose}
        >
          <X className='w-4 h-4' />
        </Button>
      </div>
    </CardHeader>

    <CardContent className='pt-4 space-y-4'>
      <div className='flex items-center justify-between'>
        <span className='text-xs font-medium text-zinc-400 uppercase'>Unit ID</span>
        <Badge
          variant='outline'
          className='font-mono text-amber-400 border-amber-400/30 bg-amber-400/10 tracking-wider'
        >
          #{id.toString().padStart(6, '0')}
        </Badge>
      </div>

      <div className='flex items-center justify-between'>
        <span className='text-xs font-medium text-zinc-400 uppercase'>Status</span>
        <div className='flex items-center gap-2'>
          <span className='relative flex h-2 w-2'>
            <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
            <span className='relative inline-flex rounded-full h-2 w-2 bg-emerald-500'></span>
          </span>
          <span className='text-xs font-bold text-emerald-500'>ACTIVE SIGNAL</span>
        </div>
      </div>
    </CardContent>
  </Card>
);

const C2Canvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<C2Engine | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unitCount, setUnitCount] = useState(0);

  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new C2Engine(canvasRef.current);
    const worker = new Worker(new URL('../api/data.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    const handleResize = () => {
      if (canvasRef.current && engineRef.current) {
        const { clientWidth, clientHeight } = canvasRef.current;
        const dpr = window.devicePixelRatio || 1;
        const displayWidth = Math.round(clientWidth * dpr);
        const displayHeight = Math.round(clientHeight * dpr);
        if (
          canvasRef.current.width !== displayWidth ||
          canvasRef.current.height !== displayHeight
        ) {
          engineRef.current.resize(displayWidth, displayHeight);
        }
      }
    };

    const startEngine = async () => {
      try {
        await engine.init();
        engineRef.current = engine;
        handleResize();

        engine.onEntitySelected = (id) => setSelectedUnit(id);

        worker.onmessage = (e) => {
          const msg = e.data;
          if (msg.type === 'SPAWN_DATA_READY' && engineRef.current) {
            engineRef.current.ingestEntities(msg.pos, msg.vel, msg.status, msg.types);
            setUnitCount((prev) => prev + msg.pos.length / 4);
          }
        };

        const loop = () => {
          engine.render();
          requestAnimationFrame(loop);
        };
        loop();
      } catch (err: unknown) {
        if (err instanceof Error) setError(err.message);
      }
    };

    startEngine();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      worker.terminate();
      engineRef.current?.destroy();
    };
  }, []);

  if (error)
    return (
      <div className='h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center text-red-500 space-y-4'>
        <ShieldAlert className='w-12 h-12' />
        <p className='font-mono text-sm'>{error}</p>
      </div>
    );

  return (
    <div className='relative w-full h-full bg-zinc-950 overflow-hidden select-none font-sans'>
      <canvas ref={canvasRef} className='w-full h-full block touch-none' />

      <div className='absolute top-4 left-4 pointer-events-none flex flex-col gap-1'>
        <Badge
          variant='outline'
          className='w-fit border-blue-500/30 text-blue-400 bg-blue-500/5 font-mono text-[10px] uppercase tracking-widest'
        >
          <Activity className='w-3 h-3 mr-1 animate-pulse' /> System Online
        </Badge>
        <h1 className='text-zinc-100 font-bold text-xl tracking-tight'>
          C2 VISUALIZER <span className='text-zinc-500 font-mono text-sm ml-1'>v0.1.0</span>
        </h1>
        <p className='text-zinc-500 text-xs font-mono'>
          ENTITIES: <span className='text-zinc-300'>{unitCount.toLocaleString()}</span>
        </p>
      </div>

      <div className='absolute bottom-3 right-4 pointer-events-none opacity-20'>
        <p className='text-[10px] text-zinc-400 font-mono tracking-widest'>
          CONFIDENTIAL // FREDLI FOURQONI © 2025
        </p>
      </div>

      <div className='absolute bottom-8 left-8 flex gap-4 pointer-events-auto'>
        <Button
          onClick={() => workerRef.current?.postMessage({ type: 'GENERATE_SPAWN', count: 10000 })}
          className='bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20 font-semibold transition-all active:scale-95'
        >
          <Activity className='w-4 h-4 mr-2' />
          Ingest Data (+10k)
        </Button>
      </div>

      {selectedUnit !== null && (
        <UnitDetailPanel id={selectedUnit} onClose={() => setSelectedUnit(null)} />
      )}
    </div>
  );
};

export default C2Canvas;
