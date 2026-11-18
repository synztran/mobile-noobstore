"use client";

import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import { DisableRatings } from "@/components/reviews/DisableRatings";
import { ReviewsList } from "@/components/reviews/ReviewsList";
import { HomeTestimonialsManager } from "@/components/reviews/HomeTestimonialsManager";

type Tab = "reviews" | "disable-ratings" | "home-testimonials";

export default function ReviewsPage() {
  const [tab, setTab] = useState<Tab>("reviews");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquareText className="h-6 w-6 text-slate-700" />
        <p className="text-2xl font-bold text-slate-900">Review & Rating</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setTab("reviews")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "reviews"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Quản lý đánh giá
        </button>
        <button
          onClick={() => setTab("disable-ratings")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "disable-ratings"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Tắt đánh giá sản phẩm
        </button>
        <button
          onClick={() => setTab("home-testimonials")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "home-testimonials"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Đánh giá trang chủ
        </button>
      </div>

      {tab === "reviews" ? (
        <ReviewsList />
      ) : tab === "disable-ratings" ? (
        <DisableRatings />
      ) : (
        <HomeTestimonialsManager />
      )}
    </div>
  );
}
