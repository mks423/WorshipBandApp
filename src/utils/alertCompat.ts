import { Alert, Platform } from "react-native";

/**
 * react-native-web's Alert.alert is a complete no-op (see its source:
 * `static alert() {}`), so any Alert.alert call is silently swallowed
 * whenever the app runs on web — permission errors, missing-config
 * warnings, and scan failures all fail silently with no on-screen sign
 * anything went wrong. This falls back to window.alert on web so the
 * same call site works everywhere.
 */
export function alertCompat(title: string, message?: string): void {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
