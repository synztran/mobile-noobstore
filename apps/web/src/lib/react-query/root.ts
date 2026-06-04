import { mergeQueryKeys } from "@lukemorales/query-key-factory";
import { configQueryKeys } from "./router/config";
import { gachaQueryKeys } from "./router/gacha";
import { homeQueryKeys } from "./router/home";
import { userQueryKeys } from "./router/user";
import { productQueryKeys } from "./router/product";

export const appQueryKeys = mergeQueryKeys(
	configQueryKeys,
	homeQueryKeys,
	gachaQueryKeys,
  userQueryKeys,
  productQueryKeys,
);

export type AppQueryKeys = typeof appQueryKeys;
