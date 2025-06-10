export class ReceivableRepository {
  redisClient: any;
  constructor(redisClient: any) {
    this.redisClient = redisClient;
  }
  async addReceivableValue(value: number): Promise<void> {
    // add to redisClient
    try {
      await this.redisClient.incrByFloat("receivable_value", value);
    } catch (error) {
      console.error(`[error]: Error on adding receivable value ${error}`);
      throw error;
    }
  }

  async getReceivableValue(): Promise<number> {
    const value = await this.redisClient.get("receivable_value");
    if (value === null) {
      return 0; // Return 0 if no value is set
    } else {
      return Number(value);
    }
  }
}
