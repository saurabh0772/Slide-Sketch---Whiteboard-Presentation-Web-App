import mongoose from 'mongoose';

export const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined in environment variables.');
    }
    await mongoose.connect(uri, {
      dbName: 'slidesketch',
    });
    console.log(`[MongoDB] Connected directly via URI to database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error('[MongoDB] Direct URI connection error:', error);
    process.exit(1);
  }
};

