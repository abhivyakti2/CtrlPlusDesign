// src/components/ui/tabs.tsx

import React, { useState, ReactNode, createContext, useContext } from "react";
import clsx from "clsx";

interface TabItem {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  items?: TabItem[];
  defaultTab?: string;
  defaultValue?: string;
  variant?: "default" | "pills";
  children?: ReactNode;
  className?: string;
}

// Context for Tab components
const TabsContext = createContext<{ activeTab: string; setActiveTab: (id: string) => void } | null>(null);

const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) throw new Error('Tab components must be used within Tabs');
  return context;
};

// TabsList component
export const TabsList: React.FC<{ children: ReactNode; className?: string }> = ({ children, className }) => {
  return <div className={clsx('flex gap-2 bg-gray-800 rounded-lg p-1', className)}>{children}</div>;
};

// TabsTrigger component
export const TabsTrigger: React.FC<{ value: string; children: ReactNode; className?: string }> = ({ value, children, className }) => {
  const { activeTab, setActiveTab } = useTabsContext();
  return (
    <button
      onClick={() => setActiveTab(value)}
      className={clsx(
        'flex items-center justify-center gap-2 font-medium text-sm transition-all duration-150 px-4 py-2 rounded-md',
        activeTab === value
          ? 'bg-blue-600 text-white'
          : 'text-gray-400 hover:text-gray-200',
        className
      )}
    >
      {children}
    </button>
  );
};

// TabsContent component
export const TabsContent: React.FC<{ value: string; children: ReactNode; className?: string }> = ({ value, children, className }) => {
  const { activeTab } = useTabsContext();
  if (activeTab !== value) return null;
  return <div className={className}>{children}</div>;
};

export const Tabs: React.FC<TabsProps & { children?: ReactNode }> = ({
  items = [],
  defaultTab,
  defaultValue,
  variant = "default",
  children,
  className,
}) => {
  const activeDefau = defaultValue || defaultTab || items[0]?.id || "";
  const [activeTab, setActiveTab] = useState(activeDefau);

  // If children are provided, use context-based approach
  if (children) {
    return (
      <TabsContext.Provider value={{ activeTab, setActiveTab }}>
        <div className={clsx("w-full", className)}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }

  // Legacy items-based approach
  const activeTabItem = items.find((item) => item.id === activeTab);

  const tabTriggerStyles = {
    default: "border-b-2 pb-3 text-text-secondary hover:text-text-primary data-[active=true]:text-accent data-[active=true]:border-accent",
    pills: "rounded-md px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-hover data-[active=true]:bg-accent data-[active=true]:text-white",
  };

  return (
    <div className="w-full">
      {/* Tab Triggers */}
      <div
        className={clsx(
          "flex gap-4",
          variant === "default" && "border-b border-border"
        )}
      >
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            data-active={activeTab === item.id}
            className={clsx(
              "flex items-center gap-2 font-medium text-sm transition-all duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              tabTriggerStyles[variant]
            )}
          >
            {item.icon && <span>{item.icon}</span>}
            {item.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6 animate-in fade-in duration-200">
        {activeTabItem && activeTabItem.content}
      </div>
    </div>
  );
};

Tabs.displayName = "Tabs";
