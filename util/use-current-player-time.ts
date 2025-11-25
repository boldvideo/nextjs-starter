import { useCallback, useSyncExternalStore } from "react";

interface MediaElement {
  currentTime: number;
  addEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject
  ) => void;
  removeEventListener: (
    type: string,
    listener: EventListenerOrEventListenerObject
  ) => void;
}

interface TimeUpdateEvent {
  currentTime: number;
}

export const useCurrentPlayerTime = (ref: React.RefObject<MediaElement | null>) => {
  const subscribe = useCallback(
    (onStoreChange: (newVal: number) => void) => {
      const { current } = ref;
      if (!current) {
        return () => undefined;
      }

      const updater = (e: Event | TimeUpdateEvent) => {
        const time = "currentTime" in e ? e.currentTime : ((e.target as unknown) as MediaElement)?.currentTime ?? 0;
        onStoreChange(time);
      };
      current.addEventListener("timeupdate", updater);
      return () => {
        current.removeEventListener("timeupdate", updater);
      };
    },
    [ref]
  );

  const data = useSyncExternalStore<number>(
    subscribe,
    () => ref.current?.currentTime ?? 0,
    () => 0
  );

  return data;
};
