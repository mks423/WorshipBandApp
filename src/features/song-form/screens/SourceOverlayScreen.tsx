import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Image, PanResponder, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { GestureResponderEvent } from "react-native";

import type { Segment, Song } from "../../../types/song";
import { addChord, moveChord, updateSegment, type SegmentLocation } from "../editSong";
import { ConfirmModal } from "./ConfirmModal";
import { isWebImageRef, resolveWebImageUri } from "../../../utils/webImageStore";

/** A touch that moves less than this (in screen px) is treated as a tap, not a drag. */
const DRAG_THRESHOLD = 4;

interface SourceOverlayScreenProps {
  song: Song;
  onSongChange: (song: Song) => void;
  /** Ref attached to the capturable image+overlay area, so a parent screen can snapshot it for export. */
  viewShotRef?: RefObject<View | null>;
}

interface ChordOverlay {
  segment: Segment & { chordPosition: NonNullable<Segment["chordPosition"]> };
  location: SegmentLocation;
}

interface NewChordDraft {
  x: number;
  y: number;
  height: number;
  text: string;
}

interface PendingChordAction {
  kind: "edit" | "delete";
  location: SegmentLocation;
  originalChord: string | null;
  newText: string;
}

/** Bar/measure numbers OCR'd alongside real chords on the same line (e.g. a lone "16") aren't chords and don't need editing. */
const PURE_NUMBER = /^\d+$/;

const TEXT_SCALE_STEP = 0.1;
const TEXT_SCALE_MIN = 0.5;
const TEXT_SCALE_MAX = 2.5;
const DEFAULT_CHORD_HEIGHT_RATIO = 0.025;

/**
 * Shows the original scanned image with each chord's current text (after any
 * edits or transposition) redrawn at the pixel position it was recognized
 * at, so the chart looks like the original with the chords swapped in place.
 * Tapping a chord badge turns it into a text input in place, so misreads can
 * be corrected right where they appear on the chart, with a button to drop
 * the badge entirely when OCR mistook a lyric/section word for a chord.
 * Toggling "+ 코드 추가" lets a chord OCR missed completely be placed by
 * tapping the blank spot it belongs at.
 */
export function SourceOverlayScreen({ song, onSongChange, viewShotRef }: SourceOverlayScreenProps) {
  const hitAreaRef = useRef<View>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [textScale, setTextScale] = useState(1);
  const [addChordMode, setAddChordMode] = useState(false);
  const [newChordDraft, setNewChordDraft] = useState<NewChordDraft | null>(null);
  const [comparing, setComparing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingChordAction | null>(null);
  const [resolvedImageUri, setResolvedImageUri] = useState<string | null>(null);

  // On web, a saved image is stored as a wba-idb:// reference (see
  // webImageStore.ts) rather than something <Image> can render directly —
  // resolve it to a real blob: URL, and revoke that URL once it's no longer
  // needed. On native this resolves immediately to the URI unchanged.
  useEffect(() => {
    const sourceUri = song.sourceImage?.uri;
    if (!sourceUri) {
      setResolvedImageUri(null);
      return;
    }
    let cancelled = false;
    let objectUrlToRevoke: string | null = null;
    resolveWebImageUri(sourceUri).then((resolved) => {
      if (cancelled) return;
      setResolvedImageUri(resolved);
      if (resolved && resolved !== sourceUri && resolved.startsWith("blob:")) objectUrlToRevoke = resolved;
    });
    return () => {
      cancelled = true;
      if (objectUrlToRevoke) URL.revokeObjectURL(objectUrlToRevoke);
    };
  }, [song.sourceImage?.uri]);

  // Flipping to a different page swaps in a different Song (this component
  // instance stays mounted), so any in-progress edit belongs to a segment
  // that no longer exists here — drop it rather than leaving a stale input.
  useEffect(() => {
    setEditingSegmentId(null);
    setEditingText("");
    setNewChordDraft(null);
    setComparing(false);
    setPendingAction(null);
  }, [song.id]);

  if (!song.sourceImage) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>원본 이미지가 없는 곡입니다 (스캔이 아니라 직접 입력한 곡).</Text>
      </View>
    );
  }

  const { uri: sourceUri, width: sourceWidth, height: sourceHeight } = song.sourceImage;
  // A wba-idb:// reference isn't renderable as-is — wait for the resolve
  // effect rather than briefly handing it to <Image> and triggering a
  // failed load for an unknown URL scheme.
  const uri = resolvedImageUri ?? (isWebImageRef(sourceUri) ? undefined : sourceUri);
  // Fit the whole chart inside the available area on both axes (never just
  // width) so a tall scanned page never needs to scroll — the smaller of
  // the two ratios is what actually constrains it, the same as
  // resizeMode="contain" but computed up front so overlay badges can be
  // positioned against the same scale.
  const scale =
    containerSize.width > 0 && containerSize.height > 0
      ? Math.min(containerSize.width / sourceWidth, containerSize.height / sourceHeight)
      : 0;

  const chordOverlays: ChordOverlay[] = song.sections.flatMap((section) =>
    section.lines.flatMap((line) =>
      line.segments
        .filter((segment): segment is Segment & { chordPosition: NonNullable<Segment["chordPosition"]> } =>
          Boolean(segment.chord && segment.chordPosition && !PURE_NUMBER.test(segment.chord.trim()))
        )
        .map((segment) => ({
          segment,
          location: { sectionId: section.id, lineId: line.id, segmentId: segment.id },
        }))
    )
  );

  function closeEditing() {
    setEditingSegmentId(null);
    setEditingText("");
  }

  function requestEditConfirm(location: SegmentLocation, originalChord: string | null) {
    setPendingAction({ kind: "edit", location, originalChord, newText: editingText });
  }

  function requestDeleteConfirm(location: SegmentLocation, originalChord: string | null) {
    setPendingAction({ kind: "delete", location, originalChord, newText: editingText });
  }

  function confirmPendingAction() {
    if (!pendingAction) return;
    if (pendingAction.kind === "delete") {
      onSongChange(updateSegment(song, pendingAction.location, { chord: null }));
    } else {
      onSongChange(
        updateSegment(song, pendingAction.location, {
          chord: pendingAction.newText.length > 0 ? pendingAction.newText : null,
        })
      );
    }
    setPendingAction(null);
    closeEditing();
  }

  function moveChordBadge(
    location: SegmentLocation,
    currentPosition: NonNullable<Segment["chordPosition"]>,
    deltaSourceX: number,
    deltaSourceY: number
  ) {
    onSongChange(
      moveChord(song, location, {
        ...currentPosition,
        x: currentPosition.x + deltaSourceX,
        y: currentPosition.y + deltaSourceY,
      })
    );
  }

  // e.nativeEvent.locationX/Y is supposed to be the touch position relative
  // to the target element, but react-native-web doesn't compute it reliably
  // (it consistently reports ~0,0 regardless of where the tap actually
  // landed) — a chord/section-label placed from a web tap always ended up
  // pinned to the top-left corner of the chart instead of where the user
  // tapped. pageX/pageY (the tap's position relative to the whole page) is
  // reliable on both platforms, so this measures the hit area's own
  // page position at tap time and subtracts it to recover the same "relative
  // to the element" coordinate locationX/Y was supposed to provide.
  function handleImagePress(e: GestureResponderEvent) {
    if (scale <= 0 || editingSegmentId || newChordDraft) return;
    const { pageX, pageY } = e.nativeEvent;

    hitAreaRef.current?.measure((_x, _y, _width, _height, containerPageX, containerPageY) => {
      const x = (pageX - containerPageX) / scale;
      const y = (pageY - containerPageY) / scale;

      const avgHeight =
        chordOverlays.length > 0
          ? chordOverlays.reduce((sum, o) => sum + o.segment.chordPosition.height, 0) / chordOverlays.length
          : sourceHeight * DEFAULT_CHORD_HEIGHT_RATIO;
      setNewChordDraft({ x, y, height: avgHeight, text: "" });
    });
  }

  function commitNewChord() {
    if (newChordDraft && newChordDraft.text.trim().length > 0) {
      onSongChange(
        addChord(
          song,
          { x: newChordDraft.x, y: newChordDraft.y, width: newChordDraft.height * 3, height: newChordDraft.height },
          newChordDraft.text.trim()
        )
      );
    }
    setNewChordDraft(null);
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
          <Pressable
            style={[styles.compareButton, comparing && styles.compareButtonActive]}
            onPressIn={() => setComparing(true)}
            onPressOut={() => setComparing(false)}
          >
            <Text style={[styles.compareButtonText, comparing && styles.compareButtonTextActive]}>비교</Text>
          </Pressable>
          <Pressable
            style={[styles.addChordButton, addChordMode && styles.addChordButtonActive]}
            onPress={() => setAddChordMode((prev) => !prev)}
          >
            <Text style={[styles.addChordButtonText, addChordMode && styles.addChordButtonTextActive]}>
              {addChordMode ? "추가 종료" : "+ 코드 추가"}
            </Text>
          </Pressable>
          <View style={styles.textScaleControl}>
            <Pressable
              style={styles.textScaleButton}
              onPress={() => setTextScale((prev) => Math.max(TEXT_SCALE_MIN, +(prev - TEXT_SCALE_STEP).toFixed(2)))}
            >
              <Text style={styles.textScaleButtonText}>가－</Text>
            </Pressable>
            <Text style={styles.textScaleValue}>{Math.round(textScale * 100)}%</Text>
            <Pressable
              style={styles.textScaleButton}
              onPress={() => setTextScale((prev) => Math.min(TEXT_SCALE_MAX, +(prev + TEXT_SCALE_STEP).toFixed(2)))}
            >
              <Text style={styles.textScaleButtonText}>가＋</Text>
            </Pressable>
          </View>
      </View>

      <View style={styles.chartArea}>
        <View
          style={styles.chartAreaInner}
          onLayout={(e) => setContainerSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
        >
          <View
            ref={(node) => {
              hitAreaRef.current = node;
              if (viewShotRef) viewShotRef.current = node;
            }}
            collapsable={false}
            style={{ width: sourceWidth * scale, height: sourceHeight * scale }}
          >
          <Pressable
            style={StyleSheet.absoluteFill}
            disabled={!addChordMode || comparing}
            onPress={handleImagePress}
          >
            {uri && <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />}
          </Pressable>
          {scale > 0 &&
            !comparing &&
            chordOverlays.map(({ segment, location }) => {
              const fontSize = Math.max(11, segment.chordPosition.height * scale * 0.75) * textScale;
              const position = {
                left: segment.chordPosition.x * scale,
                top: segment.chordPosition.y * scale,
              };

              if (editingSegmentId === segment.id) {
                const inputWidth = Math.max(fontSize * 1.3, editingText.length * fontSize * 0.62 + fontSize * 0.6);
                return (
                  <View key={segment.id} style={[styles.editingGroup, position]}>
                    <TextInput
                      style={[styles.chordInput, { fontSize, width: inputWidth }]}
                      value={editingText}
                      onChangeText={setEditingText}
                      autoFocus
                      selectTextOnFocus
                      onSubmitEditing={() => requestEditConfirm(location, segment.chord)}
                    />
                    <Pressable
                      style={styles.confirmButton}
                      onPress={() => requestEditConfirm(location, segment.chord)}
                      hitSlop={8}
                    >
                      <Text style={styles.confirmButtonSmallText}>✓</Text>
                    </Pressable>
                    <Pressable
                      style={styles.cancelButton}
                      onPress={() => requestDeleteConfirm(location, segment.chord)}
                      hitSlop={8}
                    >
                      <Text style={styles.cancelButtonText}>✕</Text>
                    </Pressable>
                  </View>
                );
              }

              return (
                <ChordBadge
                  key={segment.id}
                  chord={segment.chord}
                  position={position}
                  fontSize={fontSize}
                  scale={scale}
                  onTap={() => {
                    setEditingSegmentId(segment.id);
                    setEditingText(segment.chord ?? "");
                  }}
                  onMove={(deltaSourceX, deltaSourceY) =>
                    moveChordBadge(location, segment.chordPosition, deltaSourceX, deltaSourceY)
                  }
                />
              );
            })}
          {scale > 0 &&
            !comparing &&
            newChordDraft &&
            (() => {
              const draftFontSize = Math.max(11, newChordDraft.height * scale * 0.75) * textScale;
              const draftWidth = Math.max(
                draftFontSize * 1.3,
                newChordDraft.text.length * draftFontSize * 0.62 + draftFontSize * 0.6
              );
              return (
                <TextInput
                  style={[
                    styles.chordInput,
                    styles.newChordInput,
                    { left: newChordDraft.x * scale, top: newChordDraft.y * scale, fontSize: draftFontSize, width: draftWidth },
                  ]}
                  value={newChordDraft.text}
                  onChangeText={(text) => setNewChordDraft((prev) => (prev ? { ...prev, text } : prev))}
                  placeholder="코드"
                  autoFocus
                  onBlur={commitNewChord}
                  onSubmitEditing={commitNewChord}
                />
              );
            })()}
          </View>
        </View>
      </View>

      <ConfirmModal
        visible={pendingAction !== null}
        title={pendingAction?.kind === "delete" ? "코드 삭제" : "코드 수정"}
        message={
          pendingAction?.kind === "delete"
            ? `"${pendingAction.originalChord}" 코드를 삭제할까요?`
            : `"${pendingAction?.originalChord ?? ""}" → "${pendingAction?.newText ?? ""}"로 변경할까요?`
        }
        confirmLabel={pendingAction?.kind === "delete" ? "삭제" : "변경"}
        destructive={pendingAction?.kind === "delete"}
        onConfirm={confirmPendingAction}
        onCancel={() => setPendingAction(null)}
      />
    </View>
  );
}

interface ChordBadgeProps {
  chord: string | null;
  position: { left: number; top: number };
  fontSize: number;
  /** display-px-per-source-px, used to convert a drag's screen-space delta back into source-image coordinates. */
  scale: number;
  onTap: () => void;
  onMove: (deltaSourceX: number, deltaSourceY: number) => void;
}

/**
 * A single chord badge on the overlay. A touch that stays within
 * DRAG_THRESHOLD is treated as a tap (opens the text editor); one that moves
 * further is treated as a drag, repositioning the badge in real time and
 * committing the new position on release.
 */
function ChordBadge({ chord, position, fontSize, scale, onTap, onMove }: ChordBadgeProps) {
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const draggedRef = useRef(false);

  // PanResponder.create() only runs once (captured by the useRef below), so
  // its handlers would otherwise close over the scale/onTap/onMove values
  // from that first render forever — scale in particular starts at 0 before
  // the image has laid out, which silently turned every drag into a tap.
  // Refs updated on every render keep the handlers reading current values.
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        draggedRef.current = false;
      },
      onPanResponderMove: (_, gesture) => {
        if (Math.abs(gesture.dx) > DRAG_THRESHOLD || Math.abs(gesture.dy) > DRAG_THRESHOLD) {
          draggedRef.current = true;
        }
        setDragOffset({ dx: gesture.dx, dy: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (draggedRef.current && scaleRef.current > 0) {
          onMoveRef.current(gesture.dx / scaleRef.current, gesture.dy / scaleRef.current);
        } else {
          onTapRef.current();
        }
        setDragOffset({ dx: 0, dy: 0 });
      },
      onPanResponderTerminate: () => setDragOffset({ dx: 0, dy: 0 }),
    })
  ).current;

  return (
    <View
      {...panResponder.panHandlers}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={[styles.chordBadge, { left: position.left + dragOffset.dx, top: position.top + dragOffset.dy }]}
    >
      <Text style={[styles.chordText, { fontSize }]}>{chord}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chartArea: {
    flex: 1,
    padding: 16,
  },
  // No padding of its own — its onLayout size is exactly the space left
  // over after chartArea's padding, which is what the fit-to-screen scale
  // calculation needs.
  chartAreaInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  // Sits outside the ScrollView (see the component body) so it stays fixed
  // in place while the chart scrolls underneath — the bottom border/background
  // give it a visible edge instead of blending into whatever's behind it.
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    padding: 16,
    paddingBottom: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  compareButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#eee",
  },
  compareButtonActive: {
    backgroundColor: "#e0a800",
  },
  compareButtonText: {
    fontWeight: "700",
    fontSize: 12,
    color: "#333",
  },
  compareButtonTextActive: {
    color: "#fff",
  },
  addChordButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#eee",
  },
  addChordButtonActive: {
    backgroundColor: "#2f6feb",
  },
  addChordButtonText: {
    fontWeight: "700",
    fontSize: 12,
    color: "#333",
  },
  addChordButtonTextActive: {
    color: "#fff",
  },
  textScaleControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  textScaleButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#eee",
  },
  textScaleButtonText: {
    fontWeight: "700",
    fontSize: 12,
  },
  textScaleValue: {
    fontSize: 12,
    color: "#555",
    fontWeight: "600",
    minWidth: 36,
    textAlign: "center",
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
  editingGroup: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  chordInput: {
    paddingHorizontal: 4,
    paddingVertical: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#2f6feb",
    borderRadius: 3,
    color: "#2f6feb",
    fontWeight: "700",
  },
  newChordInput: {
    position: "absolute",
    borderColor: "#2e9e4f",
    color: "#2e9e4f",
  },
  confirmButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#2e9e4f",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmButtonSmallText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 12,
  },
  cancelButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#c0392b",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 12,
  },
});
