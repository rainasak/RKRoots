import { createClient } from 'redis';
import * as dotenv from 'dotenv';
import { createLogger } from '../common/logger';

dotenv.config();

const logger = createLogger('redis');

export const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
});

redisClient.on('error', (err) => logger.error({ err }, 'Redis error'));

export const connectRedis = async () => {
  await redisClient.connect();
  logger.info('Redis connected');
};

export class CacheService {
  private ttl = 3600;

  async get<T>(key: string): Promise<T | null> {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    await redisClient.setEx(key, ttl || this.ttl, JSON.stringify(value));
  }

  async del(key: string): Promise<void> {
    await redisClient.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  }
}
