import { createContext, useContext, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Announcement } from "@shared/types";

interface AnnouncementContextValue {
  announcement: Announcement | null;
  isVisible: boolean;
  dismiss: () => void;
}

const AnnouncementContext = createContext<AnnouncementContextValue>({
  announcement: null,
  isVisible: false,
  dismiss: () => {},
});

export function AnnouncementProvider({ children }: { children: React.ReactNode }) {
  const [dismissedId, setDismissedId] = useState<number | null>(() => {
    const stored = localStorage.getItem("dismissedAnnouncementId");
    return stored ? parseInt(stored, 10) : null;
  });

  const { data: announcement = null } = useQuery<Announcement | null>({
    queryKey: ["/api/announcements/active"],
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const isVisible = Boolean(announcement && announcement.id !== dismissedId);

  const dismiss = useCallback(() => {
    if (announcement) {
      localStorage.setItem("dismissedAnnouncementId", String(announcement.id));
      setDismissedId(announcement.id);
    }
  }, [announcement]);

  return (
    <AnnouncementContext.Provider value={{ announcement, isVisible, dismiss }}>
      {children}
    </AnnouncementContext.Provider>
  );
}

export function useAnnouncement() {
  return useContext(AnnouncementContext);
}
