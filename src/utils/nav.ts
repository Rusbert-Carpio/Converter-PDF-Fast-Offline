import { router } from "expo-router";

/**
 * Back seguro para evitar el error:
 * "The action 'GO_BACK' was not handled by any navigator".
 */
export function safeBack(fallback: string = "/home") {
  // expo-router expone canGoBack en runtime.
  // En algunos casos (deep link, abrir desde share) no hay historial.
  // @ts-ignore
  if (typeof router.canGoBack === "function" && router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback);
}
