import { useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";

import type { Segment, Song } from "../../../types/song";

interface SourceOverlayScreenProps {
  song: Song;
}

/**
 * Shows the original scanned image with each chord's current text (after any
 * edits or transposition) redrawn at the pixel position it was recognized
 * at, so the chart looks like the original with the chords swapped in place.
 *
 * Only chords render here — lyric edits or structural changes (split/merge)
 * don't have a meaningful position to redraw at, so this is a read-only
 * companion view, not an alternative editor.
 */
export function SourceOverlayScreen({ song }: SourceOverlayScreenProps) {
  const [displayWidth, setDisplayWidth] = useState(0);

  if (!song.sourceImage) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>원본 이미지가 없는 곡입니다 (스캔이 아니라 직접 입력한 곡).</Text>
      </View>
    );
  }

  const { uri, width: sourceWidth, height: sourceHeight } = song.sourceImage;
  const scale = displayWidth > 0 ? displayWidth / sourceWidth : 0;

  const chordOverlays = song.sections.flatMap((section) =>
    section.lines.flatMap((line) =>
      line.segments
        .filter((segment): segment is Segment & { chordPosition: NonNullable<Segment["chordPosition"]> } =>
          Boolean(segment.chord && segment.chordPosition)
        )
        .map((segment) => segment)
    )
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.hint}>원본 악보 위에 현재 코드가 표시됩니다 (수정·전조 결과 반영)</Text>
      <View
        style={{ aspectRatio: sourceWidth / sourceHeight }}
        onLayout={(e) => setDisplayWidth(e.nativeEvent.layout.width)}
      >
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        {scale > 0 &&
          chordOverlays.map((segment) => (
            <View
              key={segment.id}
              style={[
                styles.chordBadge,
                {
                  left: segment.chordPosition.x * scale,
                  top: segment.chordPosition.y * scale,
                },
              ]}
            >
              <Text style={[styles.chordText, { fontSize: Math.max(11, segment.chordPosition.height * scale * 0.75) }]}>
                {segment.chord}
              </Text>
            </View>
          ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  hint: {
    fontSize: 12,
    color: "#888",
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyText: {
    color: "#888",
    textAlign: "center",
  },
  chordBadge: {
    position: "absolute",
    backgroundColor: "#fff",
    paddingHorizontal: 2,
    borderRadius: 2,
  },
  chordText: {
    color: "#2f6feb",
    fontWeight: "700",
  },
});
