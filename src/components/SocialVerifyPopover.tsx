import React, { useState, useRef, useEffect } from "react";
import { SocialVerificationResult } from "../services/socialPostService";

interface SocialVerifyPopoverProps {
  content: string;
  onVerify: () => Promise<SocialVerificationResult>;
  onClose: () => void;
}

export default function SocialVerifyPopover({ content, onVerify, onClose }: SocialVerifyPopoverProps) {
  const [phase, setPhase] = useState<"loading" | "result">("loading");
  const [result, setResult] = useState<SocialVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await onVerify();
        setResult(res);
        setPhase("result");
      } catch (e: any) {
        setError(e.message ?? String(e));
        setPhase("result");
      }
    })();
  }, [onVerify]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  const sectionClass = (text: string) => {
    if (!text) return "bg-gray-50 text-gray-500";
    if (text.includes("无") && !text.includes("-")) return "bg-green-50 text-green-700";
    return "bg-red-50 text-red-700";
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-1 z-50 w-[420px] max-h-[70vh] bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">
          {phase === "loading" ? "正在核校…" : "核校结果"}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-sm leading-none">✕</button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto max-h-[50vh]">
        {phase === "loading" && (
          <div className="px-4 py-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm text-gray-500">正在核校…</p>
          </div>
        )}

        {phase === "result" && result && (
          <div className="px-4 py-3 space-y-3">
            {error && (
              <div className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
            )}
            {(result.naturalness || result.grammar || result.backTranslation) ? (
              <>
                <Section title="是否地道" text={result.naturalness} colorClass={sectionClass(result.naturalness)} />
                <Section title="是否有语病" text={result.grammar} colorClass={sectionClass(result.grammar)} />
                <Section title="回译" text={result.backTranslation || "（未返回）"} colorClass="bg-gray-50 text-gray-800" />
                {result.extra && (
                  <div className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed">
                    {result.extra.split("\n").map((line, i) => {
                      const m = line.match(/^【(.+)】$/);
                      if (m) {
                        return <div key={i} className="text-xs font-medium text-gray-500 mt-2 first:mt-0 mb-1">{line}</div>;
                      }
                      return <div key={i} className="text-sm text-gray-700">{line || " "}</div>;
                    })}
                  </div>
                )}
                {result.suggestion && !result.suggestion.includes("无需优化") && (
                  <Section title="优化建议" text={result.suggestion} colorClass="bg-green-50 text-green-700" />
                )}
              </>
            ) : (
              <div className="text-sm text-red-500">解析核校结果失败，请重试</div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 flex justify-end bg-gray-50/50">
        <button onClick={onClose} className="px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          关闭
        </button>
      </div>
    </div>
  );
}

function Section({ title, text, colorClass }: { title: string; text: string; colorClass: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-1">{title}</div>
      <div className={`text-sm rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed ${colorClass}`}>
        {text || "（未返回）"}
      </div>
    </div>
  );
}
