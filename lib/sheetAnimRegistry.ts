/**
 * Global registry of BottomSheet animation controllers.
 *
 * openSheet / goBack in ModalContext call instantHide / instantShow BEFORE
 * updating React state, so the Reanimated messages reach the UI thread before
 * React's fiber commit does.  This eliminates the one-frame freeze that occurs
 * when effects fire after the render.
 */

type SheetController = {
  show: () => void;
  hide: () => void;
};

const controllers = new Map<string, SheetController>();

export function registerSheet(id: string, ctrl: SheetController) {
  controllers.set(id, ctrl);
}

/** Instantly snap a sheet to translateY=0 / opacity=1. No-op if not registered. */
export function instantShow(id: string) {
  controllers.get(id)?.show();
}

/** Instantly snap a sheet to translateY=SCREEN_HEIGHT / opacity=0. No-op if not registered. */
export function instantHide(id: string) {
  controllers.get(id)?.hide();
}
