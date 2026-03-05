import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  },
  define: {
    global: 'globalThis'
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor: React ecosystem
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Vendor: Three.js ecosystem (largest chunk)
          'vendor-three': ['three'],
          'vendor-drei': ['@react-three/drei'],
          'vendor-fiber': ['@react-three/fiber'],
          // App: Parametric geometry builders
          'parametric': [
            './src/features/assets/parametric/conveyor/conveyorGeometry.ts',
            './src/features/assets/parametric/bend/bendGeometry.ts',
            './src/features/assets/parametric/spiral/spiralGeometry.ts',
          ],
          // App: Simulation engine + logic modules
          'simulation': [
            './src/simulation/SimulationEngine.ts',
            './src/simulation/RobotMotionController.ts',
            './src/simulation/PalletizingController.ts',
            './src/simulation/SensorLogic.ts',
            './src/simulation/StopperLogic.ts',
            './src/simulation/PusherLogic.ts',
            './src/simulation/RuleEngine.ts',
            './src/simulation/scenarios.ts',
          ],
          // App: Robot 3D models
          'robots': ['./src/components/3d/models/RobotModels.tsx'],
        },
      },
    },
  },
})
