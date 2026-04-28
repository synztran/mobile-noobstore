"use client";

import type { HeroCampaign } from "@/app/api/home/hero/route";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const SLIDE_DURATION = 5000;

export function HeroSection() {
	const [current, setCurrent] = useState(0);
	const [isPaused, setIsPaused] = useState(false);
	const touchStartX = useRef<number | null>(null);

	const { data: slides = [], isLoading } = useQuery({
		queryKey: ["home-hero-campaigns"],
		queryFn: async (): Promise<HeroCampaign[]> => {
			const res = await fetch("/api/home/hero");
			if (!res.ok) return [];
			const data = await res.json();
			return Array.isArray(data) ? data : [];
		},
	});

	const goTo = useCallback(
		(idx: number) => {
			setCurrent((idx + slides.length) % slides.length);
		},
		[slides.length],
	);

	// Auto-advance
	useEffect(() => {
		if (slides.length <= 1 || isPaused) return;
		const timer = setInterval(() => {
			setCurrent((c) => (c + 1) % slides.length);
		}, SLIDE_DURATION);
		return () => clearInterval(timer);
	}, [slides.length, isPaused]);

	// Touch / swipe
	const handleTouchStart = (e: React.TouchEvent) => {
		touchStartX.current = e.touches[0].clientX;
		setIsPaused(true);
	};
	const handleTouchEnd = (e: React.TouchEvent) => {
		if (touchStartX.current === null) return;
		const delta = e.changedTouches[0].clientX - touchStartX.current;
		if (Math.abs(delta) > 40) goTo(current + (delta < 0 ? 1 : -1));
		touchStartX.current = null;
		setIsPaused(false);
	};

	if (isLoading) {
		return (
			<section className="relative h-[680px] overflow-hidden bg-surface-container animate-pulse">
				<div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-surface-container-high" />

				<div className="absolute inset-0 flex flex-col justify-end p-8 z-10">
					<div className="flex flex-col gap-4">
						<div className="flex items-center gap-2">
							<div className="w-1 h-5 rounded-full bg-primary/40" />
							<div className="h-3 w-40 rounded bg-surface-container-high" />
						</div>

						<div className="space-y-3">
							<div className="h-10 w-5/6 rounded bg-surface-container-high" />
							<div className="h-10 w-2/3 rounded bg-surface-container-high" />
						</div>

						<div className="space-y-2">
							<div className="h-3 w-3/4 rounded bg-surface-container-high" />
							<div className="h-3 w-2/3 rounded bg-surface-container-high" />
						</div>

						<div className="mt-2 h-12 w-full rounded-xl bg-surface-container-high" />
					</div>

					<div className="flex items-center justify-center gap-2 mt-6">
						<div className="w-6 h-1.5 rounded-full bg-surface-container-high" />
						<div className="w-1.5 h-1.5 rounded-full bg-surface-container-high" />
						<div className="w-1.5 h-1.5 rounded-full bg-surface-container-high" />
					</div>
				</div>
			</section>
		);
	}

	if (slides.length === 0) return null;

	const slide = slides[current];

	return (
		<section
			className="relative h-[680px] overflow-hidden select-none"
			onTouchStart={handleTouchStart}
			onTouchEnd={handleTouchEnd}>
			{/* Slides */}
			{slides.map((s, i) => (
				<div
					key={s.id}
					className={`absolute inset-0 transition-opacity duration-700 ${
						i === current
							? "opacity-100"
							: "opacity-0 pointer-events-none"
					}`}>
					<Image
						src={s.image_url || ""}
						alt={s.title}
						fill
						className="object-cover"
						priority={i === 0}
						unoptimized
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/35 to-transparent" />
				</div>
			))}

			{/* Content */}
			<div className="absolute inset-0 flex flex-col justify-end p-8 z-10">
				<div
					key={current}
					className="flex flex-col gap-4 animate-[fadeSlideUp_0.5s_ease_forwards]">
					<div className="flex items-center gap-2">
						<div className="w-1 h-5 bg-primary rounded-full" />
						<p className="text-[10px] tracking-[0.2em] text-primary font-black uppercase">
							{slide.subtitle}
						</p>
					</div>
					<h1 className="text-5xl font-black tracking-tighter uppercase leading-none text-on-surface">
						{slide.title}
					</h1>
					<p className="text-sm text-on-surface-variant max-w-xs leading-relaxed">
						{slide.description}
					</p>
					<Link
						href={slide.cta_link}
						className="mt-2 bg-primary text-on-primary px-6 py-4 font-black text-xs tracking-widest shadow-lg flex items-center justify-between w-full rounded-xl active:scale-95 transition-transform">
						<span>{slide.cta_text}</span>
						<ArrowRight size={16} />
					</Link>
				</div>

				{/* Dot indicators */}
				{slides.length > 1 && (
					<div className="flex items-center justify-center gap-2 mt-6">
						{slides.map((_, i) => (
							<button
								key={i}
								aria-label={`Go to slide ${i + 1}`}
								onClick={() => goTo(i)}
								className={`rounded-full transition-all duration-300 ${
									i === current
										? "w-6 h-1.5 bg-primary"
										: "w-1.5 h-1.5 bg-on-surface/30"
								}`}
							/>
						))}
					</div>
				)}
			</div>
		</section>
	);
}
