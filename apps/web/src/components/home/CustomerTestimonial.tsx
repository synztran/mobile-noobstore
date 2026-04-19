import { AtSign } from "lucide-react";
import Image from "next/image";

const CURATORS = [
	{
		name: "ALEX R.",
		role: "KỸ SƯ TRƯỞNG",
		bgClass: "bg-primary-container",
		src: "https://lh3.googleusercontent.com/aida-public/AB6AXuBMyZg4oq8PLEevZmYBXT5QRQ-Lrcg2cbRlTX5n8AT52gv4ZoBkHQa91-_9DHf7Yb5ihp2Mb2dWlbf23SW7COy1yvmq6paXy2kcxxiiufO30oHkA_8cJAptIyxwhPiYjzksaCYqib1vHODGuzBz_-i-TwLaRPBIu8YW6ruyS_Wmw-YljACxb38Fjs2eBJSWQ67FLJHte2qhu2PWg8_h4-J3GqKudKCELTp_Of4ZXDZEidW_HOaOW7Hq9ukkgCWTSK1pqCA26xJWejo",
	},
	{
		name: "SARA M.",
		role: "THIẾT KẾ SÁNG TẠO",
		bgClass: "bg-secondary-container",
		src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDCBcW8sc6MNa0Ae0AAqcwjpsaj9IzqTVR6jgcNeAjnYlgQBk2aoZcvIGnWtxFHjBPz8BO6sZgvM2TK2_CuDkrdcttq-sQq7TaFHiMuNBjWud7EvrWFHg0qTga92WSKwTp6S312jImVz2lbUxqJDowABUMdXUw_jkOvwj8VBw9sgUGR-RfphZoYyqie7YOoL2nd9WtLk5bLIug2LGg4v8MPiePfG_BgNu3udDW918NQKhrC9D1zrBfRoYhDmwJ9jkrAKaRk",
	},
];

export function CustomerTestimonial() {
	return (
		<section className="px-6 pb-24">
			<div className="bg-surface-container-low p-8 rounded-3xl relative overflow-hidden">
				<div className="relative z-10">
					<h3 className="font-extrabold text-xl uppercase tracking-tight mb-6">
						NHỮNG NGƯỜI SÁNG TẠO
					</h3>
					<div className="flex flex-col gap-6">
						{CURATORS.map((curator) => (
							<div
								key={curator.name}
								className="flex items-center gap-4">
								<div
									className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ${curator.bgClass}`}>
									<Image
										src={curator.src}
										alt={curator.name}
										width={48}
										height={48}
										className="w-full h-full object-cover grayscale"
										unoptimized
									/>
								</div>
								<div>
									<p className="text-sm font-bold uppercase tracking-tight">
										{curator.name}
									</p>
									<p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
										{curator.role}
									</p>
								</div>
								<AtSign
									size={20}
									className="ml-auto text-primary"
								/>
							</div>
						))}
					</div>
				</div>
				<div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
			</div>
		</section>
	);
}
