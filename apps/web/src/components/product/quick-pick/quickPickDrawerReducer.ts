import type { ConfiguratorGroup } from "@/app/api/products/[slug]/configurator/route";
import type { ShopProduct } from "@/app/api/products/route";

export type DrawerView = "product-list" | "configurator";

export interface DrawerState {
	view: DrawerView;
	products: ShopProduct[];
	activeProduct: ShopProduct | null;
	configuratorByProductId: Record<string, ConfiguratorGroup[]>;
	groups: ConfiguratorGroup[];
	selections: Record<string, string>;
	loadingProducts: boolean;
	loadingConfigurator: boolean;
	submitting: boolean;
}

export type DrawerAction =
	| { type: "RESET" }
	| { type: "LOAD_QUICK_PICK_START"; view: DrawerView }
	| {
			type: "LOAD_QUICK_PICK_DONE";
			products: ShopProduct[];
			configuratorByProductId: Record<string, ConfiguratorGroup[]>;
			activeProduct: ShopProduct | null;
			view: DrawerView;
	  }
	| { type: "SELECT_PRODUCT"; product: ShopProduct }
	| { type: "BACK_TO_LIST" }
	| { type: "SELECT"; group: string; variantId: string }
	| { type: "SUBMIT_START" }
	| { type: "SUBMIT_DONE" };

export const INITIAL_STATE: DrawerState = {
	view: "product-list",
	products: [],
	activeProduct: null,
	configuratorByProductId: {},
	groups: [],
	selections: {},
	loadingProducts: false,
	loadingConfigurator: false,
	submitting: false,
};

export function reduce(state: DrawerState, action: DrawerAction): DrawerState {
	switch (action.type) {
		case "RESET":
			return { ...INITIAL_STATE };
		case "LOAD_QUICK_PICK_START":
			return {
				...state,
				products: action.view === "product-list" ? [] : state.products,
				activeProduct:
					action.view === "configurator" ? state.activeProduct : null,
				groups: action.view === "configurator" ? state.groups : [],
				loadingProducts: action.view === "product-list",
				loadingConfigurator: action.view === "configurator",
				view: action.view,
			};
		case "LOAD_QUICK_PICK_DONE": {
			const resolvedGroups = action.activeProduct
				? (action.configuratorByProductId[action.activeProduct.id] ??
					[])
				: [];
			return {
				...state,
				products: action.products,
				configuratorByProductId: action.configuratorByProductId,
				activeProduct: action.activeProduct,
				groups: resolvedGroups,
				selections: {},
				loadingProducts: false,
				loadingConfigurator: false,
				view: action.view,
			};
		}
		case "SELECT_PRODUCT":
			return {
				...state,
				activeProduct: action.product,
				groups: state.configuratorByProductId[action.product.id] ?? [],
				selections: {},
				loadingConfigurator: false,
				view: "configurator",
			};
		case "BACK_TO_LIST":
			return {
				...state,
				view: "product-list",
				activeProduct: null,
				groups: [],
				selections: {},
			};
		case "SELECT": {
			const isAlreadySelected =
				state.selections[action.group] === action.variantId;
			const group = state.groups.find(
				(g) => g.component_group === action.group,
			);
			const isRequired = group?.is_required ?? true;

			if (isAlreadySelected && !isRequired) {
				const next = { ...state.selections };
				delete next[action.group];
				return { ...state, selections: next };
			}

			return {
				...state,
				selections: {
					...state.selections,
					[action.group]: action.variantId,
				},
			};
		}
		case "SUBMIT_START":
			return { ...state, submitting: true };
		case "SUBMIT_DONE":
			return { ...state, submitting: false };
		default:
			return state;
	}
}
