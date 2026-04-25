import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type UsePointerReorderOptions = {
  isDisabled?: boolean;
  onCommit: (sourceDocumentId: string, targetDocumentId: string) => void;
};

type ReorderState = {
  activeDocumentId: string | null;
  targetDocumentId: string | null;
};

type ReorderTargetSnapshot = {
  bottom: number;
  documentId: string;
  middle: number;
  top: number;
};

export const usePointerReorder = ({
  isDisabled = false,
  onCommit,
}: UsePointerReorderOptions) => {
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null);
  const [targetDocumentId, setTargetDocumentId] = useState<string | null>(null);
  const isDisabledRef = useRef(isDisabled);
  const onCommitRef = useRef(onCommit);
  isDisabledRef.current = isDisabled;
  onCommitRef.current = onCommit;
  const stateRef = useRef<ReorderState>({
    activeDocumentId: null,
    targetDocumentId: null,
  });
  const cleanupListenersRef = useRef<(() => void) | null>(null);
  const targetSnapshotsRef = useRef<ReorderTargetSnapshot[]>([]);

  const syncState = useCallback((nextState: Partial<ReorderState>) => {
    stateRef.current = {
      ...stateRef.current,
      ...nextState,
    };

    if (Object.prototype.hasOwnProperty.call(nextState, "activeDocumentId")) {
      setActiveDocumentId(stateRef.current.activeDocumentId);
    }

    if (Object.prototype.hasOwnProperty.call(nextState, "targetDocumentId")) {
      setTargetDocumentId(stateRef.current.targetDocumentId);
    }
  }, []);

  const reset = useCallback(() => {
    cleanupListenersRef.current?.();
    cleanupListenersRef.current = null;
    targetSnapshotsRef.current = [];

    document.body.style.removeProperty("user-select");
    document.body.style.removeProperty("cursor");

    syncState({
      activeDocumentId: null,
      targetDocumentId: null,
    });
  }, [syncState]);

  const collectTargetSnapshots = useCallback(() => {
    targetSnapshotsRef.current = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reorder-target='true']"),
    )
      .map((element) => {
        const documentId = element.dataset.documentId;

        if (!documentId) return null;

        const rect = element.getBoundingClientRect();

        if (rect.height === 0) return null;

        return {
          bottom: rect.bottom,
          documentId,
          middle: rect.top + rect.height / 2,
          top: rect.top,
        } satisfies ReorderTargetSnapshot;
      })
      .filter((snapshot): snapshot is ReorderTargetSnapshot => snapshot !== null);
  }, []);

  useEffect(() => {
    if (isDisabled) {
      reset();
    }
  }, [isDisabled, reset]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    const targetSnapshots = targetSnapshotsRef.current;

    if (targetSnapshots.length === 0) return;

    const pointerY = event.clientY;
    const containingTarget = targetSnapshots.find(
      ({ bottom, top }) => pointerY >= top && pointerY <= bottom,
    );

    const nextTargetDocumentId = containingTarget
      ? containingTarget.documentId
      : targetSnapshots.reduce<ReorderTargetSnapshot | null>((closestSnapshot, snapshot) => {
          if (!closestSnapshot) return snapshot;

          return Math.abs(snapshot.middle - pointerY) <
            Math.abs(closestSnapshot.middle - pointerY)
            ? snapshot
            : closestSnapshot;
        }, null)?.documentId ?? null;

    if (
      nextTargetDocumentId &&
      nextTargetDocumentId !== stateRef.current.targetDocumentId
    ) {
      syncState({ targetDocumentId: nextTargetDocumentId });
    }
  }, [syncState]);

  const handlePointerUp = useCallback(() => {
    const { activeDocumentId: sourceDocumentId, targetDocumentId } = stateRef.current;

    reset();

    if (!sourceDocumentId || !targetDocumentId || sourceDocumentId === targetDocumentId) {
      return;
    }

    onCommitRef.current(sourceDocumentId, targetDocumentId);
  }, [reset]);

  const startPointerReorder = useCallback(
    (documentId: string) => (event: ReactPointerEvent<HTMLElement>) => {
      if (isDisabledRef.current) return;

      event.preventDefault();
      event.stopPropagation();

      syncState({
        activeDocumentId: documentId,
        targetDocumentId: documentId,
      });
      collectTargetSnapshots();

      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";

      const onMove = (pointerEvent: PointerEvent) => {
        handlePointerMove(pointerEvent);
      };

      const onUp = () => {
        handlePointerUp();
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
      window.addEventListener("pointercancel", onUp, { once: true });

      cleanupListenersRef.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
    },
    [collectTargetSnapshots, handlePointerMove, handlePointerUp, syncState],
  );

  useEffect(() => reset, [reset]);

  return {
    activeDocumentId,
    targetDocumentId,
    getHandleProps: (documentId: string) => ({
      onPointerDown: startPointerReorder(documentId),
    }),
    getTargetProps: (documentId: string) => ({
      "data-reorder-target": "true",
      "data-document-id": documentId,
    }),
  };
};
