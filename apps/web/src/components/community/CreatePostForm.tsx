"use client";

import { useCommunityConfig } from "@/lib/react-query/community/api/useCommunityQueries";
import { useCreatePost } from "@/lib/react-query/community/api/useCommunityMutations";
import { useAuth } from "@/lib/auth/AuthProvider";
import { AlertCircle, CheckCircle2, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { POST_TYPE_META } from "./Badges";

const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_VIDEO_SIZE = 200 * 1024 * 1024;
const MAX_FILES = 6;

const POST_TYPES = [
  { value: "knowledge", label: "Kiến thức" },
  { value: "drama", label: "Drama" },
  { value: "build", label: "Build" },
];

interface Props {
  onSuccess?: () => void;
}

export function CreatePostForm({ onSuccess }: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const { data: config, isLoading: configLoading } = useCommunityConfig();
  const createMutation = useCreatePost();

  const [title, setTitle] = useState("");
  const [postType, setPostType] = useState("knowledge");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  const isSubmitting = createMutation.isPending;
  const canPost = Boolean(config?.can_post);

  const handleFiles = useCallback(
    (selected: File[]) => {
      const next = [...files, ...selected].slice(0, MAX_FILES);
      setFiles(next);
    },
    [files]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const sizeSummary = useMemo(() => {
    const total = files.reduce((sum, f) => sum + f.size, 0);
    if (total === 0) return "";
    const mb = (total / 1024 / 1024).toFixed(1);
    return `${files.length}/${MAX_FILES} tệp · ${mb} MB`;
  }, [files]);

  const validate = useCallback((): string => {
    if (title.trim().length < 3) return "Tiêu đề phải có ít nhất 3 ký tự";
    if (files.length === 0)
      return "Vui lòng chọn ít nhất 1 hình ảnh hoặc video";
    for (const file of files) {
      const isVideo = file.type.startsWith("video/");
      if (isVideo && file.size > MAX_VIDEO_SIZE) {
        return "Video vượt quá 200 MB";
      }
      if (!isVideo && !file.type.startsWith("image/")) {
        return "Chỉ chấp nhận hình ảnh hoặc video (mp4/webm)";
      }
      if (!isVideo && file.size > MAX_IMAGE_SIZE) {
        return "Hình ảnh vượt quá 8 MB";
      }
    }
    return "";
  }, [title, files]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setError("");
    try {
      await createMutation.mutateAsync({
        title: title.trim(),
        postType,
        content: content.trim(),
        files,
      });
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/community");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    }
  }, [
    isSubmitting,
    validate,
    title,
    postType,
    content,
    files,
    createMutation,
    router,
    onSuccess,
  ]);

  // ── Gate: login
  if (!user) {
    return (
      <div className="space-y-3 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6 text-center">
        <p className="text-sm font-bold text-on-surface">
          Đăng nhập để đăng bài
        </p>
        <p className="text-xs text-on-surface-variant">
          Bạn cần đăng nhập để chia sẻ kiến thức, drama hay build của mình.
        </p>
        <Link
          href="/login"
          className="btn btn-primary btn-md inline-block w-full rounded-full text-sm font-bold text-white"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  // ── Gate: community disabled
  if (config && !config.community_enabled) {
    return (
      <div className="space-y-2 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6 text-center">
        <p className="text-sm font-black text-on-surface">
          Đăng bài đang tạm đóng
        </p>
        <p className="text-xs text-on-surface-variant">
          Tính năng đăng bài tạm thời bị tắt. Quay lại sau nhé!
        </p>
      </div>
    );
  }

  // ── Gate: insufficient rank
  if (config && !canPost) {
    return (
      <div className="space-y-3 rounded-2xl border border-outline-variant/20 bg-surface-container-low p-6 text-center">
        <p className="text-sm font-black text-on-surface">
          Chưa đủ điều kiện đăng bài
        </p>
        <p className="text-xs leading-relaxed text-on-surface-variant">
          Chỉ thành viên hạng{" "}
          <strong className="text-primary">
            {config.min_rank_level_post >= 3
              ? ["Bạc", "Vàng", "Bạch Kim", "Kim Cương"][
                  config.min_rank_level_post - 2
                ]
              : "Bạc"}
          </strong>{" "}
          trở lên mới có thể đăng bài. Hoàn thành đơn hàng để tăng hạng của bạn.
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/profile/points"
            className="btn btn-primary btn-md rounded-full text-sm font-bold text-white"
          >
            Xem hạng của tôi
          </Link>
          <Link
            href="/shop"
            className="btn btn-md rounded-full border-0 bg-surface-container text-sm font-bold text-on-surface"
          >
            Mua sắm ngay
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-error/10 px-4 py-3 text-sm font-semibold text-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Danh mục
        </label>
        <div className="flex flex-wrap gap-2">
          {POST_TYPES.map((type) => {
            const active = postType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setPostType(type.value)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                  active
                    ? POST_TYPE_META[type.value].className
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-left text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Tiêu đề
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tóm tắt nội dung bài viết"
          maxLength={150}
          className="w-full rounded-2xl border-2 border-transparent bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface outline-none transition-all focus:border-primary"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Nội dung
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Chia sẻ chi tiết về kiến thức, drama hoặc build của bạn..."
          rows={5}
          maxLength={10000}
          className="w-full resize-none rounded-2xl border-2 border-transparent bg-surface-container px-4 py-3 text-sm font-semibold text-on-surface outline-none transition-all focus:border-primary"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
          Hình ảnh / video (tối đa {MAX_FILES}, ảnh ≤ 8 MB, video ≤ 200 MB)
        </label>
        <input
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          multiple
          className="hidden"
          id="community-file-input"
          onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
        />
        <label
          htmlFor="community-file-input"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-outline-variant/40 bg-surface-container-low px-4 py-6 text-sm font-bold text-on-surface-variant transition-all active:scale-[0.99]"
        >
          <Upload size={18} />
          Chọn hình ảnh hoặc video
        </label>
        {sizeSummary && (
          <p className="text-[11px] font-semibold text-on-surface-variant">
            {sizeSummary}
          </p>
        )}
        {files.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {files.map((file, i) => (
              <div
                key={i}
                className="group relative aspect-square overflow-hidden rounded-xl bg-surface-container"
              >
                {file.type.startsWith("video/") ? (
                  <video
                    src={URL.createObjectURL(file)}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={URL.createObjectURL(file)}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
                <button
                  type="button"
                  aria-label="Xoá tệp"
                  onClick={() => removeFile(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="btn btn-primary btn-md w-full rounded-full text-xs font-bold uppercase tracking-widest text-white shadow-ambient-sm transition-transform active:scale-[0.98] disabled:scale-100 disabled:opacity-70"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span className="flex items-center gap-1">
              <CheckCircle2 size={14} />
              Đang tải lên...
            </span>
          </span>
        ) : (
          "ĐĂNG BÀI"
        )}
      </button>
    </div>
  );
}
