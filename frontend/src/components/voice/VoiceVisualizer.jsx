import React, { useEffect, useRef } from "react";

export default function VoiceVisualizer({ state, audioStream }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let audioCtx = null;
    let analyser = null;
    let dataArray = null;

    if (audioStream && state === "listening") {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        const source = audioCtx.createMediaStreamSource(audioStream);
        source.connect(analyser);
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
      } catch (err) {
        console.warn("AudioContext setup error:", err);
      }
    }

    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      if (state === "listening" && analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        const barWidth = (width / dataArray.length) * 2;
        let x = 0;

        for (let i = 0; i < dataArray.length / 2; i++) {
          const barHeight = (dataArray[i] / 255) * (height / 2);
          ctx.fillStyle = "#06b6d4"; // cyan-500
          ctx.fillRect(x, centerY - barHeight, barWidth - 2, barHeight * 2);
          x += barWidth;
        }
      } else if (state === "speaking") {
        phase += 0.1;
        ctx.beginPath();
        ctx.strokeStyle = "#22d3ee"; // cyan-400
        ctx.lineWidth = 2.5;

        for (let x = 0; x < width; x++) {
          const y = centerY + Math.sin(x * 0.05 + phase) * 16 * Math.sin((x / width) * Math.PI);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      } else {
        phase += 0.03;
        ctx.beginPath();
        ctx.strokeStyle = "#52525b"; // zinc-600
        ctx.lineWidth = 1.5;

        for (let x = 0; x < width; x++) {
          const y = centerY + Math.sin(x * 0.03 + phase) * 4;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (audioCtx) {
        audioCtx.close().catch(() => {});
      }
    };
  }, [state, audioStream]);

  return (
    <div className="w-full flex items-center justify-center py-2">
      <canvas ref={canvasRef} width={260} height={60} className="w-full max-w-[260px] h-[60px]" />
    </div>
  );
}
