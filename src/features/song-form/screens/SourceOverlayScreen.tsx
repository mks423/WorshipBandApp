import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { GestureResponderEvent } from "react-native";

import type { Segment, SectionMarker, Song } from "../../../types/song";
import {
  addChord,
  addSectionMarker,
  moveChord,
  removeSectionMarker,
  updateSectionMarker,
  updateSegment,
  type SegmentLocation,
} from "../editSong";
import { ConfirmModal } from "./ConfirmModal";
import { SectionLabelModal } from "./SectionLabelModal";

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

type LabelModalState = { mode: "new"; x: number; y: number } | { mode: "edit"; markerId: string; initialLabel: string };

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
  const [displayWidth, setDisplayWidth] = useState(0);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [textScale, setTextScale] = useState(1);
  const [addChordMode, setAddChordMode] = useState(false);
  const [newChordDraft, setNewChordDraft] = useState<NewChordDraft | null>(null);
  const [comparing, setComparing] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingChordAction | null>(null);
  const [addSectionMode, setAddSectionMode] = useState(false);
  const [labelModalState, setLabelModalState] = useState<LabelModalState | null>(null);

  // Flipping to a different page swaps in a different Song (this component
  // instance stays mounted), so any in-progress edit belongs to a segment
  // that no longer exists here — drop it rather than leaving a stale input.
  useEffect(() => {
    setEditingSegmentId(null);
    setEditingText("");
    setNewChordDraft(null);
    setComparing(false);
    setPendingAction(null);
    setAddSectionMode(false);
    setLabelModalState(null);
  }, [song.id]);

  if (!song.sourceImage) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>원본 이미지가 없는 곡입니다 (스캔이 아니라 직접 입력한 곡).</Text>
      </View>
    );
  }

  const { uri, width: sourceWidth, height: sourceHeight } = song.sourceImage;
  const scale = displayWidth > 0 ? displayWidth / sourceWidth : 0;

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

  function handleImagePress(e: GestureResponderEvent) {
    if (scale <= 0 || editingSegmentId || newChordDraft) return;
    const { locationX, locationY } = e.nativeEvent;

    if (addSectionMode) {
      setLabelModalState({ mode: "new", x: locationX / scale, y: locationY / scale });
      return;
    }

    const avgHeight =
      chordOverlays.length > 0
        ? chordOverlays.reduce((sum, o) => sum + o.segment.chordPosition.height, 0) / chordOverlays.length
        : sourceHeight * DEFAULT_CHORD_HEIGHT_RATIO;
    setNewChordDraft({ x: locationX / scale, y: locationY / scale, height: avgHeight, text: "" });
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

  function moveSectionMarker(markerId: string, currentPosition: { x: number; y: number }, deltaSourceX: number, deltaSourceY: number) {
    onSongChange(
      updateSectionMarker(song, markerId, { x: currentPosition.x + deltaSourceX, y: currentPosition.y + deltaSourceY })
    );
  }

  function confirmLabelModal(label: string) {
    if (labelModalState?.mode === "new") {
      onSongChange(addSectionMarker(song, { x: labelModalState.x, y: labelModalState.y }, label));
    } else if (labelModalState?.mode === "edit") {
      onSongChange(updateSectionMarker(song, labelModalState.markerId, { label }));
    }
    setLabelModalState(null);
  }

  function deleteLabelModalMarker() {
    if (labelModalState?.mode === "edit") {
      onSongChange(removeSectionMarker(song, labelModalState.markerId));
    }
    setLabelModalState(null);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.toolbar}>
        <Text style={styles.hint}>
          {comparing
            ? "원본 이미지 (누르고 있는 동안)"
            : addChordMode
              ? "빈 자리를 탭해 코드를 추가하세요"
              : addSectionMode
                ? "빈 자리를 탭해 섹션 라벨을 추가하세요"
                : "코드를 탭하면 수정, 드래그하면 위치를 옮길 수 있습니다"}
        </Text>
        <View style={styles.toolbarControls}>
          <Pressable
            style={[styles.compareButton, comparing && styles.compareButtonActive]}
            onPressIn={() => setComparing(true)}
            onPressOut={() => setComparing(false)}
          >
            <Text style={[styles.compareButtonText, comparing && styles.compareButtonTextActive]}>비교</Text>
          </Pressable>
          <Pressable
            style={[styles.addChordButton, addChordMode && styles.addChordButtonActive]}
            onPress={() => {
              setAddSectionMode(false);
              setAddChordMode((prev) => !prev);
            }}
          >
            <Text style={[styles.addChordButtonText, addChordMode && styles.addChordButtonTextActive]}>
              {addChordMode ? "추가 종료" : "+ 코드 추가"}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.addSectionButton, addSectionMode && styles.addSectionButtonActive]}
            onPress={() => {
              setAddChordMode(false);
              setAddSectionMode((prev) => !prev);
            }}
          >
            <Text style={[styles.addSectionButtonText, addSectionMode && styles.addSectionButtonTextActive]}>
              {addSectionMode ? "추가 종료" : "+ 섹션 라벨"}
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
      </View>
      <View
        ref={viewShotRef}
        collapsable={false}
        style={{ aspectRatio: sourceWidth / sourceHeight }}
        onLayout={(e) => setDisplayWidth(e.nativeEvent.layout.width)}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          disabled={(!addChordMode && !addSectionMode) || comparing}
          onPress={handleImagePress}
        >
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="contain" />
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
        {scale > 0 &&
          !comparing &&
          song.sectionMarkers.map((marker) => (
            <SectionMarkerBadge
              key={marker.id}
              marker={marker}
              position={{ left: marker.x * scale, top: marker.y * scale }}
              scale={scale}
              onTap={() => setLabelModalState({ mode: "edit", markerId: marker.id, initialLabel: marker.label })}
              onMove={(deltaSourceX, deltaSourceY) => moveSectionMarker(marker.id, marker, deltaSourceX, deltaSourceY)}
            />
          ))}
      </View>

      <SectionLabelModal
        visible={labelModalState !== null}
        initialLabel={labelModalState?.mode === "edit" ? labelModalState.initialLabel : undefined}
        onConfirm={confirmLabelModal}
        onDelete={labelModalState?.mode === "edit" ? deleteLabelModalMarker : undefined}
        onClose={() => setLabelModalState(null)}
      />

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
    </ScrollView>
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

interface SectionMarkerBadgeProps {
  marker: SectionMarker;
  position: { left: number; top: number };
  /** display-px-per-source-px, used to convert a drag's screen-space delta back into source-image coordinates. */
  scale: number;
  onTap: () => void;
  onMove: (deltaSourceX: number, deltaSourceY: number) => void;
}

/** A Verse/Chorus/Bridge-style tag on the overlay. Same tap-vs-drag behavior as ChordBadge: a short touch opens the label picker, a drag repositions it. */
function SectionMarkerBadge({ marker, position, scale, onTap, onMove }: SectionMarkerBadgeProps) {
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const draggedRef = useRef(false);

  // See ChordBadge for why these need to be refs, not the closed-over props directly.
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
      style={[styles.sectionMarker, { left: position.left + dragOffset.dx, top: position.top + dragOffset.dy }]}
    >
      <Text style={styles.sectionMarkerText}>{marker.label}</Text>
    </View>
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
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  hint: {
    fontSize: 12,
    color: "#888",
    flexShrink: 1,
  },
  toolbarControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  addSectionButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#eee",
  },
  addSectionButtonActive: {
    backgroundColor: "#6b3fd4",
  },
  addSectionButtonText: {
    fontWeight: "700",
    fontSize: 12,
    color: "#333",
  },
  addSectionButtonTextActive: {
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
  sectionMarker: {
    position: "absolute",
    backgroundColor: "#6b3fd4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sectionMarkerText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
  },
});
