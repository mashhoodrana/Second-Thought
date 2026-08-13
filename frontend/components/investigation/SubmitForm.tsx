"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Search, AlertCircle, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitInvestigation } from "@/lib/api-client";
import { ApiError } from "@/lib/types";

const submitSchema = z.object({
  raw_text: z
    .string()
    .max(10000, "Text must be 10,000 characters or fewer")
});

type SubmitFormValues = z.infer<typeof submitSchema>;

export function SubmitForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SubmitFormValues>({
    resolver: zodResolver(submitSchema),
    defaultValues: { raw_text: "" },
  });

  const rawText = watch("raw_text") || "";
  const charCount = rawText.length;
  const isFormEmpty = !rawText.trim() && !imagePreview;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    setServerError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageError("Please upload a valid image file");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setImageError("Image size must not exceed 8MB");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleClearImage = () => {
    setImagePreview(null);
    setImageError(null);
  };

  const onSubmit = async (values: SubmitFormValues) => {
    setServerError(null);
    const typedText = values.raw_text.trim();

    if (!typedText && !imagePreview) {
      setServerError("Please enter some text or upload an image to investigate.");
      return;
    }

    try {
      let finalContentType: "text" | "image" = "text";
      let finalRawText = "";

      if (imagePreview && typedText) {
        finalContentType = "image";
        finalRawText = `${typedText}|||${imagePreview}`;
      } else if (imagePreview) {
        finalContentType = "image";
        finalRawText = imagePreview;
      } else {
        finalContentType = "text";
        finalRawText = typedText;
      }

      const response = await submitInvestigation({
        content_type: finalContentType,
        raw_text: finalRawText,
      });
      router.push(`/investigate/${response.session_id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setServerError("Your session has expired. Please sign in again.");
        } else {
          setServerError(err.message);
        }
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-3">
        <div className="space-y-2">
          <label
            htmlFor="investigation-text"
            className="block text-xs font-semibold uppercase tracking-wider text-muted"
          >
            What would you like to investigate?
          </label>
          <textarea
            id="investigation-text"
            rows={4}
            placeholder="Paste a claim, headline, social media post, or write your own question/context..."
            className="w-full resize-none rounded-xl border border-border-default bg-[#FAF8F5] px-5 py-4 text-sm md:text-base leading-relaxed text-foreground placeholder-muted/40 outline-none transition-all focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/20 disabled:opacity-50"
            disabled={isSubmitting}
            {...register("raw_text")}
          />
        </div>

        {imagePreview && (
          <div className="relative border border-border-default rounded-xl bg-[#FAF8F5] p-3 flex items-center gap-4 max-w-md animate-in zoom-in duration-200 shadow-2xs">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-16 w-16 rounded-lg object-contain border border-border-default bg-white shadow-3xs shrink-0"
            />
            <div className="flex-1 min-w-0">
              <span className="block text-[11px] font-bold text-foreground">Image attached</span>
              <span className="block text-[10px] text-muted truncate">Multimodal context will be extracted</span>
            </div>
            <button
              type="button"
              onClick={handleClearImage}
              disabled={isSubmitting}
              className="p-1.5 bg-white hover:bg-red-50 text-muted hover:text-signal-danger border border-border-default rounded-full transition-all cursor-pointer shadow-3xs flex items-center justify-center shrink-0"
              title="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            {imageError ? (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-signal-danger">
                <AlertCircle className="h-4 w-4" />
                {imageError}
              </p>
            ) : errors.raw_text ? (
              <p className="flex items-center gap-1.5 text-xs font-semibold text-signal-danger">
                <AlertCircle className="h-4 w-4" />
                {errors.raw_text.message}
              </p>
            ) : !imagePreview ? (
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border-default rounded-xl bg-[#FAF8F5] text-xs font-bold text-muted hover:text-foreground hover:bg-surface-soft transition-all cursor-pointer shadow-2xs">
                <Upload className="h-3.5 w-3.5" />
                Attach Image
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={isSubmitting}
                />
              </label>
            ) : null}
          </div>

          <p
            className={`text-xs font-semibold ${charCount > 9000 ? "text-signal-warning" : "text-muted/50"}`}
          >
            {charCount.toLocaleString()} / 10,000
          </p>
        </div>
      </div>

      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-2.5 rounded-xl border border-signal-danger/20 bg-red-50 px-5 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-signal-danger" />
          <p className="text-sm font-semibold text-signal-danger">{serverError}</p>
        </div>
      )}

      <button
        id="investigation-submit-btn"
        type="submit"
        disabled={isSubmitting || isFormEmpty}
        className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover px-6 py-3.5 text-sm font-bold text-white shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Taking a second look…
          </>
        ) : (
          <>
            <Search className="h-4 w-4" />
            Take a second look
          </>
        )}
      </button>
    </form>
  );
}
