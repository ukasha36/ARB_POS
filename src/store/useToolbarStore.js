import { create } from 'zustand';

export const useToolbarStore = create((set, get) => ({
  activeAction: null,
  lastActionMessage: '',
  isDeleteConfirmOpen: false,
  isExecuting: false,
  disabledActions: {
    insert: false,
    save: false,
    edit: false,
    delete: false,
    abort: false,
    query: false,
    list: false,
    execute: false,
    exit: false,
  },

  triggerAction: (actionName) => {
    const timestamp = new Date().toLocaleTimeString();
    switch (actionName) {
      case 'insert':
        set({ activeAction: 'insert', lastActionMessage: `[${timestamp}] Insert mode initiated (Ctrl + N)` });
        break;
      case 'save':
        set({ activeAction: 'save', lastActionMessage: `[${timestamp}] Record saved successfully (Ctrl + S)` });
        setTimeout(() => set({ activeAction: null }), 2000);
        break;
      case 'edit':
        set({ activeAction: 'edit', lastActionMessage: `[${timestamp}] Edit mode enabled (Ctrl + E)` });
        break;
      case 'delete':
        set({ isDeleteConfirmOpen: true });
        break;
      case 'abort':
        set({ activeAction: null, lastActionMessage: `[${timestamp}] Action cancelled (Esc)` });
        break;
      case 'query':
        set({ activeAction: 'query', lastActionMessage: `[${timestamp}] Query mode active` });
        break;
      case 'list':
        set({ activeAction: 'list', lastActionMessage: `[${timestamp}] Listing records...` });
        break;
      case 'execute':
        set({ isExecuting: true, lastActionMessage: `[${timestamp}] Executing current query...` });
        setTimeout(() => set({ isExecuting: false, activeAction: null }), 1000);
        break;
      case 'exit':
        set({ lastActionMessage: `[${timestamp}] Application Exit requested` });
        if (typeof window !== 'undefined' && window.electronAPI?.app?.close) {
          window.electronAPI.app.close();
        }
        break;
      default:
        break;
    }
  },

  confirmDelete: () => {
    const timestamp = new Date().toLocaleTimeString();
    set({
      isDeleteConfirmOpen: false,
      activeAction: null,
      lastActionMessage: `[${timestamp}] Record deleted successfully`,
    });
  },

  cancelDelete: () => {
    set({ isDeleteConfirmOpen: false });
  },

  clearMessage: () => set({ lastActionMessage: '' }),
}));
