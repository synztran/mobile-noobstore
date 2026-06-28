import { mergeQueryKeys } from "@lukemorales/query-key-factory";
import { configQueryKeys } from "./router/config";
import { gachaQueryKeys } from "./router/gacha";
import { homeQueryKeys } from "./router/home";
import { notificationQueryKeys } from "./router/notification";
import { orderQueryKeys } from "./router/order";
import { pointsQueryKeys } from "./router/points";
import { reviewQueryKeys } from "./router/review";
import { userQueryKeys } from "./router/user";
import { productQueryKeys } from "./router/product";
import { serviceQueryKeys } from "./router/service";

export const appQueryKeys = mergeQueryKeys(
  configQueryKeys,
  homeQueryKeys,
  gachaQueryKeys,
  notificationQueryKeys,
  reviewQueryKeys,
  userQueryKeys,
  productQueryKeys,
  orderQueryKeys,
  pointsQueryKeys,
  serviceQueryKeys
);

export type AppQueryKeys = typeof appQueryKeys;
