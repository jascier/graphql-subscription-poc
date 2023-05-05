import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";

export const redis = new Redis(6379, "127.0.0.1");

export const pubsub = new RedisPubSub({
  publisher: new Redis(6379, "127.0.0.1"),
  subscriber: new Redis(6379, "127.0.0.1")
});