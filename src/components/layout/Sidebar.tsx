import React from "react";

const menuItems = [
  { key: "editor", label: "字幕修改", icon: "✏️" },
  { key: "translator", label: "字幕翻译", icon: "📝" },
  { key: "splitter", label: "字幕分割", icon: "✂️" },
];

interface SidebarProps {
  active: string;
  onSelect: (key: string) => void;
  onOpenApiKey: () => void;
}

export default function Sidebar({ active, onSelect, onOpenApiKey }: SidebarProps) {
  return (
    <div className="w-56 flex-shrink-0 bg-gray-900 text-gray-300 flex flex-col select-none">
      {/* Logo area */}
      <div className="px-4 py-5 border-b border-gray-700">
        <h1 className="text-sm font-bold text-white tracking-wide">SubEditor</h1>
        <p className="text-xs text-gray-500 mt-0.5">Subtitle Editor</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                isActive
                  ? "bg-blue-600 text-white font-medium"
                  : "hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gray-700 space-y-1">
        <button
          onClick={onOpenApiKey}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors text-left"
        >
          <span>🔑</span>
          <span>设置 API Key</span>
        </button>
        <div className="px-3 text-xs text-gray-600">
          v1.0.0
        </div>
      </div>
    </div>
  );
}
