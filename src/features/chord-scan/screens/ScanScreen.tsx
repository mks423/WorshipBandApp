import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { buildSongFromOcr } from "../buildSongFromOcr";
import { getGoogleVisionApiKey, recognizeTextWithGoogleVision } from "../ocrProviders";
import type { Song } from "../../../types/song";

interface ScanScreenProps {
  onSongScanned: (song: Song) => void;
}

interface PickedImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
}

export function ScanScreen({ onSongScanned }: ScanScreenProps) {
  const [image, setImage] = useState<PickedImage | null>(null);
  const [title, setTitle] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  async function pickFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("권한 필요", "악보 이미지를 불러오려면 사진 보관함 접근을 허용해주세요.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      base64: true,
      quality: 0.7,
    });
    applyPickerResult(result);
  }

  async function pickFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("권한 필요", "악보를 촬영하려면 카메라 접근을 허용해주세요.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 });
    applyPickerResult(result);
  }

  function applyPickerResult(result: ImagePicker.ImagePickerResult) {
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      Alert.alert("오류", "이미지를 읽어오지 못했습니다. 다시 시도해주세요.");
      return;
    }
    setImage({ uri: asset.uri, base64: asset.base64, width: asset.width, height: asset.height });
  }

  async function scan() {
    if (!image) return;

    const apiKey = getGoogleVisionApiKey();
    if (!apiKey) {
      Alert.alert(
        "설정 필요",
        "EXPO_PUBLIC_GOOGLE_VISION_API_KEY 환경변수가 설정되어 있지 않습니다. .env.example을 참고해 API 키를 설정해주세요."
      );
      return;
    }

    setIsScanning(true);
    try {
      const tokens = await recognizeTextWithGoogleVision(image.base64, apiKey);
      if (tokens.length === 0) {
        Alert.alert("인식 실패", "이미지에서 텍스트를 찾지 못했습니다. 더 선명한 이미지로 다시 시도해주세요.");
        return;
      }
      const song = buildSongFromOcr(tokens, title.trim() || "제목 없는 곡", {
        uri: image.uri,
        width: image.width,
        height: image.height,
      });
      onSongScanned(song);
    } catch (error) {
      Alert.alert("스캔 실패", error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>악보 스캔</Text>

      {image ? (
        <Image source={{ uri: image.uri }} style={styles.preview} resizeMode="contain" />
      ) : (
        <View style={[styles.preview, styles.previewPlaceholder]}>
          <Text style={styles.placeholderText}>악보 이미지를 선택해주세요</Text>
        </View>
      )}

      <View style={styles.row}>
        <Pressable style={styles.button} onPress={pickFromLibrary}>
          <Text style={styles.buttonText}>사진 보관함에서 선택</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={pickFromCamera}>
          <Text style={styles.buttonText}>촬영</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.titleInput}
        placeholder="곡 제목"
        value={title}
        onChangeText={setTitle}
      />

      <Pressable
        style={[styles.scanButton, (!image || isScanning) && styles.scanButtonDisabled]}
        onPress={scan}
        disabled={!image || isScanning}
      >
        {isScanning ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.scanButtonText}>스캔하기</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
  },
  preview: {
    width: "100%",
    height: 260,
    borderRadius: 12,
    backgroundColor: "#f0f0f0",
  },
  previewPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#888",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#e6e6e6",
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "600",
  },
  titleInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  scanButton: {
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#2f6feb",
    alignItems: "center",
  },
  scanButtonDisabled: {
    backgroundColor: "#a8bee8",
  },
  scanButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
