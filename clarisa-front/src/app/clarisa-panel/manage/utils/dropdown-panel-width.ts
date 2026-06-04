/** Syncs PrimeNG dropdown overlay width to its trigger (used with appendTo="body"). */
export function matchDropdownPanelToTrigger(event?: {
  originalEvent?: Event;
}): void {
  setTimeout(() => {
    const panels = document.querySelectorAll(
      '.admin-dropdown-panel.p-dropdown-panel',
    );
    const panel = panels[panels.length - 1] as HTMLElement | undefined;
    if (!panel) {
      return;
    }

    let trigger: HTMLElement | null = null;
    if (event?.originalEvent?.target) {
      trigger = (event.originalEvent.target as HTMLElement).closest(
        '.p-dropdown',
      );
    }
    if (!trigger) {
      trigger =
        document.activeElement?.closest('.p-dropdown') ??
        document.querySelector('.p-dropdown.p-dropdown-open') ??
        null;
    }
    if (!trigger) {
      return;
    }

    const width = trigger.getBoundingClientRect().width;
    panel.style.width = `${width}px`;
    panel.style.minWidth = `${width}px`;
    panel.style.maxWidth = `${width}px`;
  }, 0);
}
