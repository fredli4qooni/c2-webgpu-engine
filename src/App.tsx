/**
 * C2 Visualizer Engine
 * Copyright (c) 2025 Fredli Fourqoni. All rights reserved.
 *
 * This source code is proprietary and confidential.
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 */

import C2Canvas from './components/C2Canvas';

function App() {
  return (
    <div className='w-screen h-screen bg-black overflow-hidden relative'>
      <C2Canvas />
    </div>
  );
}

export default App;
