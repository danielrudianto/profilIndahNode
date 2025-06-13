import { RedisClient } from "bullmq";

export class StockRepository {
  private redis: RedisClient;

  constructor(redis: RedisClient) {
    this.redis = redis;
  }

  initialize = async () => {};

  update = async (itemID: number, quantity: number) => {
    const key = "stock:current";

    // Atomically increment the stock
    const newStock = await this.redis.hincrby(key, itemID.toString(), quantity);

    // Optional: validate if stock goes negative
    if (newStock < 0) {
      console.warn(
        `⚠️ Stock for item ${itemID} dropped below zero: ${newStock}`
      );
      // You might want to alert, reverse, or tag the item here
    }
  };

  updateMany = async (items: { itemID: number; quantity: number }[]) => {
    const key = "stock:current";
    const multi = this.redis.multi();

    items.forEach(({ itemID, quantity }) => {
      multi.hincrby(key, itemID.toString(), quantity);
    });

    const results = await multi.exec();
    return results;
  };
}
