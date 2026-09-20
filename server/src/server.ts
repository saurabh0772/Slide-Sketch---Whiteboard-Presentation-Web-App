import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from server root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { createApp } from './app';
import { connectDB } from './config/db';

const PORT = parseInt(process.env.PORT || '5000', 10);

const startServer = async () => {
  try {
    await connectDB();
    const app = createApp();

    app.listen(PORT, () => {
      console.log(`[Server] SlideSketch backend listening on port ${PORT}`);
      console.log(`[Server] API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('[Server] Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
