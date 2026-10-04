/**
 * LocalStorage Store for Relationship Memories
 * Uses key "cr:memories" matching Section 9 of PLAN.md
 */

const STORAGE_KEY = "cr:memories";

/**
 * Saves complete memories dataset to localStorage.
 * 
 * @param {{ meta: { me: string, friend: string, messageCount: number, importedAt: string }, memories: Array }} data 
 * @returns {boolean}
 */
export function saveMemoriesStore(data) {
  try {
    if (!data || !data.meta || !Array.isArray(data.memories)) {
      console.warn("Invalid data structure provided to saveMemoriesStore");
      return false;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error("Failed to save memories to localStorage:", err);
    return false;
  }
}

/**
 * Loads memories dataset from localStorage.
 * 
 * @returns {{ meta: { me: string, friend: string, messageCount: number, importedAt: string }, memories: Array } | null}
 */
export function loadMemoriesStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.meta || !Array.isArray(parsed.memories)) {
      return null;
    }
    return parsed;
  } catch (err) {
    console.error("Failed to load memories from localStorage:", err);
    return null;
  }
}

/**
 * Updates a single memory by ID and marks it as userEdited.
 * 
 * @param {string} id 
 * @param {Partial<{ memory: string, category: string, confidence: string }>} updates 
 * @returns {boolean}
 */
export function updateMemory(id, updates) {
  try {
    const store = loadMemoriesStore();
    if (!store) return false;

    const memoryIndex = store.memories.findIndex((m) => m.id === id);
    if (memoryIndex === -1) return false;

    store.memories[memoryIndex] = {
      ...store.memories[memoryIndex],
      ...updates,
      userEdited: true
    };

    return saveMemoriesStore(store);
  } catch (err) {
    console.error(`Failed to update memory ${id}:`, err);
    return false;
  }
}

/**
 * Deletes a single memory by ID.
 * 
 * @param {string} id 
 * @returns {boolean}
 */
export function deleteMemory(id) {
  try {
    const store = loadMemoriesStore();
    if (!store) return false;

    store.memories = store.memories.filter((m) => m.id !== id);
    return saveMemoriesStore(store);
  } catch (err) {
    console.error(`Failed to delete memory ${id}:`, err);
    return false;
  }
}

/**
 * Deletes all memories and meta from localStorage ("Delete Everything").
 * 
 * @returns {boolean}
 */
export function clearMemoriesStore() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (err) {
    console.error("Failed to clear memories from localStorage:", err);
    return false;
  }
}
