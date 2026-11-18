import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {},
	},
	daisyui: {
		themes: [
			{
				light: {
					primary: "#2563eb",
					"primary-content": "#ffffff",
					secondary: "#64748b",
					"secondary-content": "#ffffff",
					accent: "#64748b",
					"accent-content": "#ffffff",
					neutral: "#181e26",
					"neutral-content": "#ffffff",
					"base-100": "#ffffff",
					"base-200": "#f9fafb",
					"base-300": "#e4e7ec",
					"base-content": "#181e26",
					info: "#2563eb",
					success: "#059669",
					warning: "#d97706",
					error: "#dc2626",
					rounded: "0.5rem",
				},
			},
		],
	},
	plugins: [require("daisyui")],
};

export default config;