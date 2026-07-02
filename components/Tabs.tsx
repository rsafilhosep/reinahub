"use client";

export type Tab = {
  key: string;
  label: string;
};

export function Tabs({
  tabs,
  active,
  onChange
}: {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button
          className={`tab-btn${active === tab.key ? " active" : ""}`}
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
