import type { AuctionLevel, AuctionOrder } from "../types";

const AUCTION_LEVEL_WEIGHT: Record<AuctionLevel, number> = {
  limit: 3,
  aggressive: 2,
  normal: 1,
  weak: 0.5
};

export function resolveAuctionPressure(orders: AuctionOrder[]): number {
  return orders.reduce((pressure, order) => {
    if (order.cancelled || order.side === "neutral") {
      return pressure;
    }

    const weight = AUCTION_LEVEL_WEIGHT[order.level];
    return order.side === "buy" ? pressure + weight : pressure - weight;
  }, 0);
}
