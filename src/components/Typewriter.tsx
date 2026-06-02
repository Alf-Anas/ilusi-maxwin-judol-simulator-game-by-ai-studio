import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

interface TypewriterProps {
  text: string;
  speed?: number; // ms per character
  onComplete?: () => void;
  id?: string;
}

export const Typewriter: React.FC<TypewriterProps> = ({
  text,
  speed = 10,
  onComplete,
  id = "typewriter"
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [isDone, setIsDone] = useState(false);
  const textRef = useRef(text);
  const indexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTextRef = useRef("");

  // Reset when text changes
  useEffect(() => {
    if (lastTextRef.current === text) {
      return;
    }
    lastTextRef.current = text;

    setDisplayedText("");
    setIsDone(false);
    textRef.current = text;
    indexRef.current = 0;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!text) {
      setIsDone(true);
      onComplete?.();
      return;
    }

    intervalRef.current = setInterval(() => {
      const idx = indexRef.current;
      if (idx < textRef.current.length) {
        setDisplayedText((prev) => prev + textRef.current.charAt(idx));
        indexRef.current = idx + 1;
      } else {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsDone(true);
        onComplete?.();
      }
    }, speed);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, speed]);

  const handleSkip = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setDisplayedText(text);
    setIsDone(true);
    onComplete?.();
  };

  return (
    <div id={id} className="relative flex flex-col gap-2">
      <div className="text-stone-200 leading-relaxed text-sm sm:text-base md:text-lg selection:bg-red-500/30 markdown-container select-text">
        <ReactMarkdown
          components={{
            p: ({ node, ...props }) => <p className="mb-3.5 leading-relaxed font-sans text-stone-200 text-sm sm:text-base" {...props} />,
            blockquote: ({ node, ...props }) => (
              <blockquote className="border-l-4 border-red-500 bg-red-950/15 pl-4 py-2.5 my-4 italic text-stone-350 text-xs sm:text-sm rounded-r-xl border-dashed" {...props} />
            ),
            strong: ({ node, ...props }) => <strong className="font-extrabold text-white text-shadow-glow" {...props} />,
            em: ({ node, ...props }) => <em className="italic text-stone-300" {...props} />,
            h1: ({ node, ...props }) => <h1 className="font-sans font-black text-sm sm:text-base uppercase text-[#14f195] tracking-widest mb-2 mt-4" {...props} />,
            h2: ({ node, ...props }) => <h2 className="font-sans font-extrabold text-xs sm:text-sm uppercase text-[#14f195] tracking-widest mb-1.5 mt-3" {...props} />,
            h3: ({ node, ...props }) => <h3 className="font-sans font-bold text-xs sm:text-sm uppercase text-amber-500 tracking-wider mb-1 mt-2.5" {...props} />,
            ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-3.5 space-y-1.5 text-xs sm:text-sm text-stone-300" {...props} />,
            ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-3.5 space-y-1.5 text-xs sm:text-sm text-stone-300" {...props} />,
            li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
          }}
        >
          {displayedText}
        </ReactMarkdown>
        {!isDone && (
          <span className="inline-block w-2.5 h-4 sm:h-5 ml-1 bg-[#14f195] animate-pulse align-middle" />
        )}
      </div>
      
      {!isDone && (
        <button
          onClick={handleSkip}
          className="self-end text-xs text-[#14f195] hover:text-[#2effa4] transition-colors bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 cursor-pointer mt-2"
        >
          Lewati Ketikan (Skip) ➔
        </button>
      )}
    </div>
  );
};
