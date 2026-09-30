export const COMMAND_MENU_EVENT = "segundo-cerebro:command-menu";

export function openCommandMenu() {
  window.dispatchEvent(new Event(COMMAND_MENU_EVENT));
}
