import { mergeQueryKeys } from "@lukemorales/query-key-factory";
import { cartQueryKeys } from "@/modules/cart/client/react-query/query-keys";
import { communityQueryKeys } from "./router/community";
import { configQueryKeys } from "./router/config";
import { gachaQueryKeys } from "@/modules/gacha/client/query-keys";
import { homeQueryKeys } from "./router/home";
import { notificationQueryKeys } from "./router/notification";
import { orderQueryKeys } from "./router/order";
import { pointsQueryKeys } from "./router/points";
import { reviewQueryKeys } from "./router/review";
import { userQueryKeys } from "@/modules/user/client/query-keys";
import {
	productQueryKeys,
	shopQueryKeys,
} from "@/modules/products/client/query-keys";
import { serviceQueryKeys } from "./router/service";
import { supportQueryKeys } from "./router/support";
import { voucherQueryKeys } from "./router/voucher";
import { rankQueryKeys } from "./router/rank";
import { stockAlertQueryKeys } from "./router/stock-alert";
import { checkinQueryKeys } from "@/modules/checkin/client/query-keys";
import { auctionQueryKeys } from "@/modules/auction/client/query-keys";

export const appQueryKeys = mergeQueryKeys(
  auctionQueryKeys,
  cartQueryKeys,
  communityQueryKeys,
  configQueryKeys,
  homeQueryKeys,
  gachaQueryKeys,
  notificationQueryKeys,
  reviewQueryKeys,
  shopQueryKeys,
  userQueryKeys,
  productQueryKeys,
  orderQueryKeys,
  pointsQueryKeys,
  serviceQueryKeys,
  supportQueryKeys,
  voucherQueryKeys,
  rankQueryKeys,
  stockAlertQueryKeys,
  checkinQueryKeys
);

export type AppQueryKeys = typeof appQueryKeys;
