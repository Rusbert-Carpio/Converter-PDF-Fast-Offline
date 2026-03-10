import mobileAds, { MaxAdContentRating, TestIds } from "react-native-google-mobile-ads";

let inited = false;

/**
 * Inicializa Google Mobile Ads.
 * Usamos Test IDs por defecto (safe para pruebas).
 */
export async function initAds() {
  if (inited) return;
  inited = true;

  try {
    // Configuración opcional: rating.
    await mobileAds().setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.PG,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      testDeviceIdentifiers: ["EMULATOR"],
    });

    await mobileAds().initialize();
  } catch (e) {
    // No bloqueamos la app si falla ads init.
    console.log("Ads init error", e);
  }
}

export const TestAdUnitIds = {
  banner: TestIds.BANNER,
  interstitial: TestIds.INTERSTITIAL,
  rewarded: TestIds.REWARDED,
};
