import { create } from 'zustand';

export const useNavigationStore = create((set) => ({
  activeModuleId: 'welcome',
  activeModuleTitle: 'Welcome to ARB Communication POS',
  activeCategory: 'GENERAL',
  expandedNodes: {
    SETUPS: true,
    DAILY_OPERATIONS: true,
    REPORTS: true,
  },

  setActiveModule: (id, title, category) => set({
    activeModuleId: id,
    activeModuleTitle: title,
    activeCategory: category,
  }),

  toggleNodeExpand: (nodeKey) => set((state) => ({
    expandedNodes: {
      ...state.expandedNodes,
      [nodeKey]: !state.expandedNodes[nodeKey],
    },
  })),
}));
