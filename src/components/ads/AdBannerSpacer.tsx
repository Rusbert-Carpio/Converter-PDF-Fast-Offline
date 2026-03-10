import React from "react";
import { View } from "react-native";

// Altura típica de banner:
// - 50dp (teléfonos)
// - 90dp (tablets / large banner)
// Usamos 60 para dar margen y evitar que tape contenido.
export default function AdBannerSpacer({ height = 64 }: { height?: number }) {
  return <View style={{ height }} />;
}