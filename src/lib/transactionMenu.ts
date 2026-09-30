export const OPEN_TRANSACTION_EVENT = "segundo-cerebro:new-transaction";
export const openTransactionMenu = () => window.dispatchEvent(new Event(OPEN_TRANSACTION_EVENT));
