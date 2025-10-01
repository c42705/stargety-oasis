import React, { useState, useEffect, useRef } from "react";
import { Card, Tabs, Checkbox, Button, Row, Col, Space, Typography } from "antd";
import { AnimationMapping, FrameDefinition } from "./AvatarBuilderTypes";

const { Text } = Typography;

// Custom hook for frame preview thumbnails (typed)
function useFramePreviewCache(frames: FrameDefinition[], imageData: string) {
  const [previewCache, setPreviewCache] = useState<{ [id: string]: string | null }>({});
  const requested = useRef<{ [id: string]: boolean }>({});

  useEffect(() => {
    setPreviewCache({});
    requested.current = {};
  }, [imageData, frames]);

  function getFramePreview(frame: FrameDefinition): string | undefined {
    if (!frame?.sourceRect || !imageData) return undefined;
    const cacheKey = frame.id;
    if (previewCache[cacheKey]) return previewCache[cacheKey] || undefined;
    if (requested.current[cacheKey]) return undefined; // Already processing

    requested.current[cacheKey] = true;
    const img = new window.Image();
    img.src = imageData;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = frame.sourceRect.width;
      canvas.height = frame.sourceRect.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(
        img,
        frame.sourceRect.x,
        frame.sourceRect.y,
        frame.sourceRect.width,
        frame.sourceRect.height,
        0,
        0,
        frame.sourceRect.width,
        frame.sourceRect.height
      );
      const url = canvas.toDataURL();
      setPreviewCache((prev: {[id: string]: string | null}) => ({ ...prev, [cacheKey]: url }));
    };
    img.onerror = () => {
      setPreviewCache((prev: {[id: string]: string | null}) => ({ ...prev, [cacheKey]: null }));
    };
    return undefined;
  }

  return getFramePreview;
}

interface AnimationEditorPanelProps {
  frames: FrameDefinition[];
  animations: AnimationMapping[];
  imageData: string;
  onUpdateAnimation: (id: string, frameIds: string[]) => void;
}

const AnimationEditorPanel: React.FC<AnimationEditorPanelProps> = ({
  frames,
  animations,
  imageData,
  onUpdateAnimation,
}) => {
  const [selectedAnimId, setSelectedAnimId] = useState(animations[0]?.id);

  const selectedAnim = animations.find((a) => a.id === selectedAnimId);

  const [selectedFrameIds, setSelectedFrameIds] = useState<string[]>(selectedAnim?.sequence.frameIds || []);

  useEffect(() => {
    setSelectedFrameIds(selectedAnim?.sequence.frameIds || []);
  }, [selectedAnimId, animations, selectedAnim?.sequence.frameIds]);

  const getFramePreview = useFramePreviewCache(frames, imageData);

  const handleToggleFrame = (frameId: string) => {
    let next: string[];
    if (selectedFrameIds.includes(frameId)) {
      next = selectedFrameIds.filter((id: string) => id !== frameId);
    } else {
      next = [...selectedFrameIds, frameId];
    }
    setSelectedFrameIds(next);
    onUpdateAnimation(selectedAnimId, next);
  };

  const moveFrame = (frameId: string, direction: "up" | "down") => {
    const idx = selectedFrameIds.indexOf(frameId);
    if (idx < 0) return;
    let next = [...selectedFrameIds];
    if (direction === "up" && idx > 0) {
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    }
    if (direction === "down" && idx < next.length - 1) {
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    }
    setSelectedFrameIds(next);
    onUpdateAnimation(selectedAnimId, next);
  };

  return (
    <Card size="small" title="Animation Editor" style={{ marginBottom: 16 }}>
      <Tabs
        activeKey={selectedAnimId}
        onChange={setSelectedAnimId}
        items={animations.map((anim) => ({
          key: anim.id,
          label: anim.name,
        }))}
      />
      <Text strong>Select frames for this animation:</Text>
      <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
        {frames.map((frame) => (
          <Col key={frame.id}>
            <Space direction="vertical" align="center">
              <Checkbox
                checked={selectedFrameIds.includes(frame.id)}
                onChange={() => handleToggleFrame(frame.id)}
              />
              <img
                src={
                  getFramePreview(frame) ||
                  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48'><rect width='100%' height='100%' fill='%23eee'/></svg>"
                }
                alt={frame.name}
                style={{
                  width: 48,
                  height: 48,
                  border: selectedFrameIds.includes(frame.id)
                    ? "2px solid #1890ff"
                    : "1px solid #ccc",
                  objectFit: "cover",
                  background: "#fff",
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {frame.name}
              </Text>
              {selectedFrameIds.includes(frame.id) && (
                <Space>
                  <Button
                    size="small"
                    disabled={selectedFrameIds.indexOf(frame.id) === 0}
                    onClick={() => moveFrame(frame.id, "up")}
                  >
                    ↑
                  </Button>
                  <Button
                    size="small"
                    disabled={
                      selectedFrameIds.indexOf(frame.id) ===
                      selectedFrameIds.length - 1
                    }
                    onClick={() => moveFrame(frame.id, "down")}
                  >
                    ↓
                  </Button>
                </Space>
              )}
            </Space>
          </Col>
        ))}
      </Row>
      <Text type="secondary" style={{ marginTop: 8, display: "block" }}>
        Use checkboxes to assign frames. Drag or use arrows to reorder frames in the animation sequence.
      </Text>
    </Card>
  );
};

export default AnimationEditorPanel;