import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export interface SmsTemplate {
  id: string;
  name: string;
  body: string;
  category: string;
}

const STORAGE_KEY = 'localmighty_sms_templates';

const DEFAULT_TEMPLATES: SmsTemplate[] = [
  { id: '1', name: 'OK', body: 'OK', category: 'Rapide' },
  { id: '2', name: 'J\'arrive', body: 'J\'arrive dans 5 minutes', category: 'Rapide' },
  { id: '3', name: 'Je rappelle', body: 'Je suis occupe, je te rappelle plus tard', category: 'Rapide' },
  { id: '4', name: 'Merci', body: 'Merci beaucoup !', category: 'Rapide' },
  { id: '5', name: 'RDV confirme', body: 'C\'est note, a bientot !', category: 'Pro' },
  { id: '6', name: 'En reunion', body: 'Je suis en reunion, je vous recontacte des que possible.', category: 'Pro' },
];

function loadTemplates(): SmsTemplate[] {
  if (!browser) return DEFAULT_TEMPLATES;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initialize with defaults
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
    return DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

function saveTemplates(templates: SmsTemplate[]): void {
  if (!browser) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function createTemplatesStore() {
  const { subscribe, set, update } = writable<SmsTemplate[]>(loadTemplates());

  return {
    subscribe,
    add: (template: Omit<SmsTemplate, 'id'>) => {
      update(templates => {
        const newTemplate = {
          ...template,
          id: Date.now().toString(),
        };
        const updated = [...templates, newTemplate];
        saveTemplates(updated);
        return updated;
      });
    },
    remove: (id: string) => {
      update(templates => {
        const updated = templates.filter(t => t.id !== id);
        saveTemplates(updated);
        return updated;
      });
    },
    update: (id: string, changes: Partial<SmsTemplate>) => {
      update(templates => {
        const updated = templates.map(t =>
          t.id === id ? { ...t, ...changes } : t
        );
        saveTemplates(updated);
        return updated;
      });
    },
    reset: () => {
      saveTemplates(DEFAULT_TEMPLATES);
      set(DEFAULT_TEMPLATES);
    },
    getCategories: (templates: SmsTemplate[]): string[] => {
      return [...new Set(templates.map(t => t.category))];
    },
  };
}

export const templatesStore = createTemplatesStore();
