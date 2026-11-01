import React, { useState } from "react";
import { Send } from "lucide-react";
import { canvasToFile, releaseCanvas } from "../lib/export";
import type { Platform } from "../lib/imageValidate";
import { useOpenPublisher, type PlatformCaptions } from "../lib/publishContext";
import { Button, type ButtonProps, useToast } from "./ui";

interface Props {
  /** Re-render the exact selected, full-resolution single-image artwork. */
  render: () => Promise<HTMLCanvasElement>;
  filename: string;
  captions: PlatformCaptions;
  sourceLabel: string;
  platforms?: Platform[];
  label?: string;
  title?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  disabled?: boolean;
  full?: boolean;
  className?: string;
}

/** Render the selected design and trigger its one-click publish; never download or copy first. */
export const PublishCanvasButton: React.FC<Props> = ({
  render,
  filename,
  captions,
  sourceLabel,
  platforms,
  label = "Publish now",
  title,
  variant = "gold",
  size = "sm",
  disabled,
  full,
  className,
}) => {
  const openPublisher = useOpenPublisher();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    setBusy(true);
    let canvas: HTMLCanvasElement | null = null;
    try {
      canvas = await render();
      const file = await canvasToFile(canvas, filename);
      openPublisher({ file, captions, platforms, sourceLabel, autoPublish: true });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not prepare this design for publishing.", "error");
    } finally {
      if (canvas) releaseCanvas(canvas);
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      loading={busy}
      disabled={disabled || busy}
      full={full}
      className={className}
      title={title ?? (platforms?.length
        ? `Publish immediately to ${platforms.map((platform) => (platform === "facebook" ? "Facebook Page" : "Instagram")).join(" + ")}.`
        : "Publish immediately to the saved Facebook Page and its linked Instagram account, when available.")}
      icon={<Send className="h-3.5 w-3.5" aria-hidden="true" />}
      onClick={() => void open()}
    >
      {busy ? "Preparing…" : label}
    </Button>
  );
};
