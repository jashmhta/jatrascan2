// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * SF Symbols to Material Icons mappings for Palitana Yatra Tracker
 */
const MAPPING = {
  // Tab bar icons
  "house.fill": "home",
  "qrcode.viewfinder": "qr-code-scanner",
  "location.fill": "location-on",
  "person.2.fill": "people",
  "chart.bar.fill": "bar-chart",
  "gearshape.fill": "settings",
  
  // Scanner icons
  "camera.fill": "camera-alt",
  "photo.fill": "photo-library",
  "keyboard": "keyboard",
  "magnifyingglass": "search",
  "square.stack.fill": "layers",
  
  // Status icons
  "wifi": "wifi",
  "wifi.slash": "wifi-off",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "exclamationmark.triangle.fill": "warning",
  "clock.fill": "schedule",
  "clock": "schedule",
  "arrow.clockwise": "refresh",
  
  // Navigation icons
  "chevron.right": "chevron-right",
  "sparkles": "auto-awesome",
  "bell.fill": "notifications",
  "xmark": "close",
  "chevron.left": "chevron-left",
  
  // Action icons
  "paperplane.fill": "send",
  "square.and.arrow.up": "share",
  "doc.text.fill": "description",
  "trash.fill": "delete",
  "arrow.down.doc.fill": "file-download",
  "doc.fill": "description",
  "pencil": "edit",
  
  // Person and contact icons
  "person.fill": "person",
  "phone.fill": "phone",
  "drop.fill": "water-drop",
  "person.fill.questionmark": "person-search",
  
  // Misc icons
  "calendar": "calendar-today",
  "flag.fill": "flag",
  "flag.checkered": "flag",
  "star.fill": "star",
  "info.circle.fill": "info",
  "questionmark.circle.fill": "help",
  "globe": "language",
  "speaker.wave.2.fill": "volume-up",
  "speaker.slash.fill": "volume-off",
  "hand.tap.fill": "touch-app",
  "list.bullet": "list",
  "checkmark": "check",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

export type { IconSymbolName };
