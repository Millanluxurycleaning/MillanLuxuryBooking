import { X, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { useAnnouncement } from "@/contexts/AnnouncementContext";

const typeStyles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  info: {
    bg: "bg-blue-600",
    text: "text-white",
    icon: <Info className="h-4 w-4 shrink-0" />,
  },
  warning: {
    bg: "bg-amber-500",
    text: "text-white",
    icon: <AlertTriangle className="h-4 w-4 shrink-0" />,
  },
  success: {
    bg: "bg-emerald-600",
    text: "text-white",
    icon: <CheckCircle className="h-4 w-4 shrink-0" />,
  },
};

export function AnnouncementBanner() {
  const { announcement, isVisible, dismiss } = useAnnouncement();

  if (!isVisible || !announcement) return null;

  const style = typeStyles[announcement.type] ?? typeStyles.info;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] ${style.bg} ${style.text} flex items-center justify-center px-4 py-2 text-sm font-medium`}
    >
      <div className="flex items-center gap-2 max-w-4xl w-full justify-center">
        {style.icon}
        <span className="text-center leading-snug">{announcement.message}</span>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss notice"
        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
