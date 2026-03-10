import React from "react";
import { View } from "react-native";

// En web no usamos banner nativo; este spacer no hace falta.
export default function AdBannerSpacer() {
  return <View style={{ height: 0 }} />;
}