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

export const useCurrentPlayerTime = (ref: React.RefObject<MediaElement | null>) => {
  const subscribe = useCallback(
    (onStoreChange: (newVal: number) => void) => {
      const { current } = ref;
      if (!current) {
        return () => undefined;
      }

      const updater = (e: Event) => {
        const target = e.target as MediaElement | null;
        onStoreChange(target?.currentTime ?? 0);
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
