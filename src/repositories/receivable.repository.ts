import { redisClient } from "../app";

class ReceivableRepository {
  static addReceivableValue(value: number) {
    // add to redisClient
    return redisClient.incrByFloat("receivable_value", value);
  }
}
