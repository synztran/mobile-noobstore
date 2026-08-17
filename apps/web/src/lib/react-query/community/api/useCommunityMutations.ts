import {
  createDocumentDraft,
  createPostDraft,
  finalizeDocument,
  finalizePost,
  uploadToSignedUrl,
  type DraftFileInput,
} from "@/lib/community/api-client";
import { appQueryKeys } from "@/lib/react-query/root";
import { toast } from "@/lib/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      postType,
      content,
      files,
    }: {
      title: string;
      postType: string;
      content: string;
      files: File[];
    }) => {
      const draft = await createPostDraft(
        title,
        postType,
        files.map<DraftFileInput>((f) => ({
          name: f.name,
          mime: f.type,
          size: f.size,
          kind: f.type.startsWith("video/") ? "video" : "image",
        })),
      );

      for (let i = 0; i < draft.uploads.length; i++) {
        await uploadToSignedUrl(draft.uploads[i].url, files[i]);
      }

      await finalizePost({
        post_id: draft.post_id,
        title,
        post_type: postType,
        content,
        uploads: draft.uploads,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: appQueryKeys.community.posts._def,
      });
      toast.success("Bài viết đã được gửi, chờ phê duyệt");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
    },
  });
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      keyboardName,
      version,
      notes,
      files,
    }: {
      title: string;
      keyboardName: string;
      version: string;
      notes: string;
      files: File[];
    }) => {
      const draft = await createDocumentDraft({
        title,
        keyboard_name: keyboardName,
        version,
        notes,
        files: files.map((f) => ({
          name: f.name,
          mime: f.type || "application/octet-stream",
          size: f.size,
        })),
      });

      for (let i = 0; i < draft.files.length; i++) {
        await uploadToSignedUrl(draft.files[i].url, files[i]);
      }

      await finalizeDocument({
        document_id: draft.document_id,
        title,
        keyboard_name: keyboardName,
        version,
        notes,
        files: draft.files.map((f) => ({
          name: f.name,
          mime: f.mime,
          size: f.size,
          path: f.path,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: appQueryKeys.community.documents._def,
      });
      toast.success("Tài liệu đã được gửi, chờ phê duyệt");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
    },
  });
}
