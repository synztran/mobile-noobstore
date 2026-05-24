import { mergeQueryKeys } from "@lukemorales/query-key-factory";
import { configQueryKeys } from "./router/config";
import { gachaQueryKeys } from "./router/gacha";
import { homeQueryKeys } from "./router/home";

export const appQueryKeys = mergeQueryKeys(
	configQueryKeys,
	homeQueryKeys,
	gachaQueryKeys,
);

export type AppQueryKeys = typeof appQueryKeys;
