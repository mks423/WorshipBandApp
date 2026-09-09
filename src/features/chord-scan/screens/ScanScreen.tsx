import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { buildSongsFromPages } from "../buildSongFromOcr";
import { getGoogleVisionApiKey, recognizeTextWithGoogleVision } from "../ocrProviders";
import { PdfPageRenderer } from "../pdf/PdfPageRenderer";
import type { PdfPageRendererHandle } from "../pdf/types";
import { alertCompat } from "../../../utils/alertCompat";
import { detectOriginalKey } from "../../transpose";
import type { Song } from "../../../types/song";

interface ScanScreenProps {
  /** May persist the scanned songs (e.g. to the library) before resolving — always await/catch it here so a failure surfaces instead of leaving the screen stuck. */
  onSongsScanned: (songs: Song[]) => void | Promise<void>;
}

interface PendingFile {
  id: string;
  uri: string;
  base64: string;
  width: number;
  height: number;
  title: string;
  /** Shared across every page rasterized from the same PDF, so they can stay grouped as one document downstream. */
  groupId?: string;
  pageNumber?: number;
}

export function ScanScreen({ onSongsScanned }: ScanScreenProps) {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<{ done: number; total: number } | null>(null);
  const pdfRendererRef = useRef<PdfPageRendererHandle>(null);

  async function pickFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      alertCompat("권한 필요", "악보를 촬영하려면 카메라 접근을 허용해주세요.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 1 });
    if (result.canceled) return;
    const asset = result.assets[0];
    const base64 = asset.base64;
    if (!base64) {
      alertCompat("오류", "사진을 읽어오지 못했습니다. 다시 시도해주세요.");
      return;
    }
    setPendingFiles((prev) => [
      ...prev,
      {
        id: createLocalId(),
        uri: asset.uri,
        base64,
        width: asset.width,
        height: asset.height,
        title: `사진 ${prev.length + 1}`,
      },
    ]);
  }

  async function pickFiles() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      multiple: true,
      base64: true,
    });
    if (result.canceled) return;

    setIsImporting(true);
    try {
      const newFiles: PendingFile[] = [];
      for (const asset of result.assets) {
        const isPdf = asset.mimeType === "application/pdf" || /\.pdf$/i.test(asset.name);
        if (isPdf) {
          newFiles.push(...(await rasterizePdf(asset, pdfRendererRef.current)));
        } else {
          const base64 = await readAsBase64(asset);
          const { width, height } = await getImageSize(asset.uri);
          newFiles.push({
            id: createLocalId(),
            uri: asset.uri,
            base64,
            width,
            height,
            title: stripExtension(asset.name),
          });
        }
      }
      if (newFiles.length > 0) {
        setPendingFiles((prev) => [...prev, ...newFiles]);
      }
    } catch (error) {
      alertCompat("파일을 불러오지 못했습니다", error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsImporting(false);
    }
  }

  function removeFile(id: string) {
    setPendingFiles((prev) => prev.filter((file) => file.id !== id));
  }

  async function scan() {
    if (pendingFiles.length === 0) return;

    const apiKey = getGoogleVisionApiKey();
    if (!apiKey) {
      alertCompat(
        "설정 필요",
        "EXPO_PUBLIC_GOOGLE_VISION_API_KEY 환경변수가 설정되어 있지 않습니다. .env.example을 참고해 API 키를 설정해주세요."
      );
      return;
    }

    setIsScanning(true);
    try {
      const ocrPages = [];
      for (let i = 0; i < pendingFiles.length; i++) {
        setScanProgress({ done: i, total: pendingFiles.length });
        const file = pendingFiles[i];
        const tokens = await recognizeTextWithGoogleVision(file.base64, apiKey);
        ocrPages.push({
          tokens,
          title: file.title.trim() || "제목 없는 곡",
          sourceImage: { uri: file.uri, width: file.width, height: file.height },
          groupId: file.groupId,
          pageNumber: file.pageNumber,
        });
      }

      const songs = buildSongsFromPages(ocrPages).map((song) => ({
        ...song,
        originalKey: detectOriginalKey(song),
      }));

      if (songs.length === 0) {
        alertCompat("인식 실패", "이미지에서 텍스트를 찾지 못했습니다. 더 선명한 이미지로 다시 시도해주세요.");
        return;
      }
      await onSongsScanned(songs);
    } catch (error) {
      alertCompat("스캔 실패", error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsScanning(false);
      setScanProgress(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>악보 스캔</Text>

      {pendingFiles.length > 0 ? (
        <Image source={{ uri: pendingFiles[0].uri }} style={styles.preview} resizeMode="contain" />
      ) : (
        <View style={[styles.preview, styles.previewPlaceholder]}>
          <Text style={styles.placeholderText}>악보 이미지 또는 PDF를 선택해주세요</Text>
        </View>
      )}

      {pendingFiles.length > 0 && (
        <View style={styles.fileList}>
          {pendingFiles.map((file, index) => {
            const groupSize = file.groupId ? pendingFiles.filter((f) => f.groupId === file.groupId).length : 1;
            const label = file.groupId ? `${file.title} (${file.pageNumber}/${groupSize})` : file.title;
            return (
              <View key={file.id} style={styles.fileRow}>
                <Text style={styles.fileRowText} numberOfLines={1}>
                  {index + 1}. {label}
                </Text>
                <Pressable onPress={() => removeFile(file.id)}>
                  <Text style={styles.fileRowRemove}>삭제</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.row}>
        <Pressable style={styles.button} onPress={pickFromCamera}>
          <Text style={styles.buttonText}>촬영</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={pickFiles} disabled={isImporting}>
          {isImporting ? <ActivityIndicator /> : <Text style={styles.buttonText}>파일 가져오기 (사진/PDF)</Text>}
        </Pressable>
      </View>

      <Pressable
        style={[styles.scanButton, (pendingFiles.length === 0 || isScanning) && styles.scanButtonDisabled]}
        onPress={scan}
        disabled={pendingFiles.length === 0 || isScanning}
      >
        {isScanning ? (
          <Text style={styles.scanButtonText}>
            {scanProgress ? `스캔 중... (${scanProgress.done + 1}/${scanProgress.total})` : "스캔 중..."}
          </Text>
        ) : (
          <Text style={styles.scanButtonText}>
            {pendingFiles.length > 1 ? `${pendingFiles.length}장 스캔하기` : "스캔하기"}
          </Text>
        )}
      </Pressable>

      <PdfPageRenderer ref={pdfRendererRef} />
    </View>
  );
}

interface RasterizedPage {
  id: string;
  uri: string;
  base64: string;
  width: number;
  height: number;
  title: string;
  groupId?: string;
  pageNumber?: number;
}

/**
 * Rasterizes every page of a PDF into its own image, tagged with a shared
 * `groupId` (and a 1-based `pageNumber`) so the library can later show them
 * as a single document — like ForScore's PDF entries — instead of as
 * unrelated songs. A single-page PDF gets no groupId; there's nothing to
 * group it with.
 */
async function rasterizePdf(
  asset: DocumentPicker.DocumentPickerAsset,
  renderer: PdfPageRendererHandle | null
): Promise<RasterizedPage[]> {
  const base64Pdf = await readAsBase64(asset);
  const rendered = await renderer?.renderPages(base64Pdf);
  if (!rendered || rendered.length === 0) {
    alertCompat("오류", `${asset.name}에서 페이지를 읽지 못했습니다.`);
    return [];
  }
  const baseName = stripExtension(asset.name);
  const groupId = rendered.length > 1 ? createLocalId() : undefined;
  return rendered.map((page, index) => ({
    id: createLocalId(),
    uri: `data:image/png;base64,${page.base64}`,
    base64: page.base64,
    width: page.width,
    height: page.height,
    title: baseName,
    groupId,
    pageNumber: groupId ? index + 1 : undefined,
  }));
}

async function readAsBase64(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (asset.base64) return stripDataUriPrefix(asset.base64);
  const file = new File(asset.uri);
  return stripDataUriPrefix(await file.base64());
}

/**
 * expo-document-picker's web implementation reads files via
 * FileReader.readAsDataURL, so asset.base64 on web comes back as a full data
 * URI ("data:image/png;base64,xxxx"), not a bare base64 payload — sending
 * that straight to Google Vision's `image.content` field gets rejected with
 * a 400. Strips the prefix when present; a no-op on an already-bare string.
 */
function stripDataUriPrefix(base64: string): string {
  const commaIndex = base64.indexOf(",");
  return base64.startsWith("data:") && commaIndex !== -1 ? base64.slice(commaIndex + 1) : base64;
}

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error instanceof Error ? error : new Error(String(error)))
    );
  });
}

function stripExtension(name: string): string {
  return name.replace(/\.[^./]+$/, "");
}

function createLocalId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
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
  fileList: {
    gap: 4,
    marginTop: -8,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fileRowText: {
    flex: 1,
    color: "#333",
  },
  fileRowRemove: {
    fontSize: 12,
    color: "#c0392b",
    marginLeft: 12,
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
