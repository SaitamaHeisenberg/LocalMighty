import { writable } from 'svelte/store';

interface LoadingState {
  active: boolean;
  progress: number;
  message?: string;
}

function createLoadingStore() {
  const { subscribe, set, update } = writable<LoadingState>({
    active: false,
    progress: 0,
  });

  let progressInterval: ReturnType<typeof setInterval> | null = null;

  return {
    subscribe,
    start: (message?: string) => {
      set({ active: true, progress: 10, message });

      // Simulate progress
      if (progressInterval) clearInterval(progressInterval);
      progressInterval = setInterval(() => {
        update((state) => {
          if (state.progress < 90) {
            return { ...state, progress: state.progress + Math.random() * 10 };
          }
          return state;
        });
      }, 200);
    },
    complete: () => {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      set({ active: true, progress: 100 });
      setTimeout(() => {
        set({ active: false, progress: 0 });
      }, 300);
    },
    reset: () => {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      set({ active: false, progress: 0 });
    },
  };
}

export const loadingStore = createLoadingStore();
