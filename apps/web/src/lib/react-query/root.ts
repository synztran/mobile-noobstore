import { mergeQueryKeys } from "@lukemorales/query-key-factory";
import { configQueryKeys } from "./router/config";
import { gachaQueryKeys } from "./router/gacha";
import { homeQueryKeys } from "./router/home";
import { notificationQueryKeys } from "./router/notification";
import { orderQueryKeys } from "./router/order";
import { pointsQueryKeys } from "./router/points";
import { reviewQueryKeys } from "./router/review";
import { shopQueryKeys } from "./router/shop";
import { userQueryKeys } from "./router/user";
import { productQueryKeys } from "./router/product";
import { serviceQueryKeys } from "./router/service";
import { cartQueryKeys } from "./router/cart";
import { supportQueryKeys } from "./router/support";

export const appQueryKeys = mergeQueryKeys(
  cartQueryKeys,
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
  supportQueryKeys
);

export type AppQueryKeys = typeof appQueryKeys;
