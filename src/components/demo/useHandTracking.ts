import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker, HandLandmarkerResult } from '@mediapipe/tasks-vision';

export interface HandGesture {
  isPinching: boolean;
  cursorX: number; // 0-1 normalized
  cursorY: number; // 0-1 normalized
  handedness: 'Left' | 'Right';
}

export const useHandTracking = (videoRef: React.RefObject<HTMLVideoElement>, isActive: boolean) => {
  const [landmarker, setLandmarker] = useState<HandLandmarker | null>(null);
  const [results, setResults] = useState<HandLandmarkerResult | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  
  // Gesture states
  const [gesture, setGesture] = useState<HandGesture>({
    isPinching: false,
    cursorX: 0.5,
    cursorY: 0.5,
    handedness: 'Right'
  });

  const requestRef = useRef<number>(0);
  const lastVideoTimeRef = useRef<number>(-1);

  // 1. Initialize Model
  useEffect(() => {
    const initLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        
        const newLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });
        
        setLandmarker(newLandmarker);
        setIsModelLoading(false);
      } catch (err) {
        console.error("MediaPipe Init Error:", err);
        setIsModelLoading(false);
      }
    };

    if (isActive) {
      initLandmarker();
    }
  }, [isActive]);

  // 2. Analyze Frame Loop
  useEffect(() => {
    if (!landmarker || !videoRef.current || !isActive) return;

    const detect = () => {
      const video = videoRef.current;
      if (video && video.currentTime !== lastVideoTimeRef.current && video.readyState >= 2) {
        lastVideoTimeRef.current = video.currentTime;
        
        const handResults = landmarker.detectForVideo(video, performance.now());
        setResults(handResults);

        // Process Gestures (Simple Logic)
        if (handResults.landmarks.length > 0) {
           const landmarks = handResults.landmarks[0]; // Use first hand for control
           const handedness = handResults.handedness[0][0].categoryName as 'Left' | 'Right';
           
           // Index finger tip (8) and Thumb tip (4)
           const indexTip = landmarks[8];
           const thumbTip = landmarks[4];
           
           // Distance for pinch
           const distance = Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y);
           const isPinching = distance < 0.1; // Threshold

           // Cursor position (inverted X because webcam is mirrored)
           const cursorX = 1 - indexTip.x;
           const cursorY = indexTip.y;

           setGesture({
               isPinching,
               cursorX,
               cursorY,
               handedness
           });
        }
      }
      requestRef.current = requestAnimationFrame(detect);
    };

    detect();

    return () => cancelAnimationFrame(requestRef.current);
  }, [landmarker, videoRef, isActive]);

  return { results, isModelLoading, gesture };
};
