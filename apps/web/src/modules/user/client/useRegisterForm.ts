"use client";

import { useAuth } from "@/modules/user/client/AuthProvider";
import { toast } from "@/lib/toast";
import { useFormik } from "formik";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
import { isCaptchaEnabled } from "@/components/ui/CaptchaWidget";

const registerSchema = Yup.object({
  fullName: Yup.string()
    .trim()
    .min(2, "Họ tên phải có ít nhất 2 ký tự")
    .required("Vui lòng nhập họ và tên"),
  email: Yup.string()
    .trim()
    .email("Email không hợp lệ")
    .required("Vui lòng nhập email"),
  password: Yup.string()
    .min(8, "Mật khẩu phải có ít nhất 8 ký tự")
    .required("Vui lòng nhập mật khẩu"),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Mật khẩu không khớp")
    .required("Vui lòng xác nhận mật khẩu"),
  agreed: Yup.boolean()
    .oneOf([true], "Vui lòng đồng ý với Điều khoản & Điều kiện")
    .required(),
});

export type RegisterFormValues = Yup.InferType<typeof registerSchema>;

export function useRegisterForm(captchaToken?: string, resetCaptcha?: () => void) {
  const router = useRouter();
  const { signUp } = useAuth();

  const formik = useFormik<RegisterFormValues>({
    initialValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      agreed: false,
    },
    validationSchema: registerSchema,
    validateOnBlur: true,
    validateOnChange: false,
    onSubmit: async (values, { setSubmitting }) => {
      if (isCaptchaEnabled && !captchaToken) {
        toast.error("Vui lòng hoàn thành xác thực captcha");
        return;
      }

      const { error } = await signUp(
        values.email,
        values.password,
        values.fullName,
        captchaToken ?? undefined
      );

      setSubmitting(false);
      resetCaptcha?.();

      if (error) {
        const lower = error.toLowerCase();
        if (
          lower.includes("sending confirmation email") ||
          lower.includes("unexpected_failure")
        ) {
          toast.error("Không thể gửi email xác nhận. Vui lòng thử lại sau.");
        } else if (
          lower.includes("already registered") ||
          lower.includes("user already")
        ) {
          toast.error("Email này đã được đăng ký. Vui lòng đăng nhập.");
        } else {
          toast.error(error);
        }
        return;
      }

      toast.success("Vui lòng kiểm tra email để xác nhận.");

      // Fire-and-forget — do not block the redirect on notification delivery
      fetch("/api/notifications/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName,
          email: values.email,
        }),
      }).catch(() => {
        // Notification failure must never break the registration flow
      });

      router.push("/login");
    },
  });

  return formik;
}
