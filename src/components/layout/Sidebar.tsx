import React from "react";

const menuItems = [
  { key: "editor", label: "字幕修改" },
  { key: "translator", label: "字幕翻译" },
  { key: "splitter", label: "字幕分割" },
  { key: "social-post", label: "标题和贴文" },
];

interface SidebarProps {
  active: string;
  onSelect: (key: string) => void;
  onOpenApiKey: () => void;
}

export default function Sidebar({ active, onSelect, onOpenApiKey }: SidebarProps) {
  return (
    <div className="w-48 flex-shrink-0 bg-gray-50 border-r border-gray-200 flex flex-col select-none">
      {/* Logo area */}
      <div className="px-4 py-4 border-b border-gray-200">
        <h1 className="text-sm font-semibold text-gray-800">SubEditor</h1>
        <p className="text-xs text-gray-400 mt-0.5">字幕翻译工具</p>
      </div>

      {/* Menu */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {menuItems.map((item) => {
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={`w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                isActive
                  ? "bg-blue-600 text-white font-medium"
                  : "text-gray-600 hover:bg-gray-200/60 hover:text-gray-900"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-gray-200 space-y-1">
        <button
          onClick={onOpenApiKey}
          className="w-full flex items-center px-3 py-2 rounded-lg text-xs text-gray-500 hover:bg-gray-200/60 hover:text-gray-700 transition-colors text-left"
        >
          API Key
        </button>
        <div className="px-3 text-xs text-gray-400">
          v1.1.0
        </div>
      </div>
    </div>
  );
}
