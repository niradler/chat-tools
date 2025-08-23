import { useState, useEffect, useCallback } from "react";

export interface CompletionItem {
  text: string;
  description?: string;
  insertText?: string;
  category?: string;
  priority?: number;
}

export interface UseCompletionOptions {
  minQueryLength?: number;
  maxSuggestions?: number;
  debounceMs?: number;
  caseSensitive?: boolean;
}

export interface UseCompletionReturn {
  suggestions: CompletionItem[];
  isLoading: boolean;
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  acceptSuggestion: (index?: number) => void;
  clearSuggestions: () => void;
}

export const useCompletion = (
  query: string,
  completionItems: CompletionItem[],
  onAccept: (item: CompletionItem) => void,
  options: UseCompletionOptions = {}
): UseCompletionReturn => {
  const {
    minQueryLength = 1,
    maxSuggestions = 10,
    debounceMs = 300,
    caseSensitive = false,
  } = options;

  const [suggestions, setSuggestions] = useState<CompletionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Debounced search function
  const searchSuggestions = useCallback(
    (searchQuery: string) => {
      if (searchQuery.length < minQueryLength) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);

      const normalizedQuery = caseSensitive
        ? searchQuery
        : searchQuery.toLowerCase();

      const filtered = completionItems
        .filter((item) => {
          const text = caseSensitive ? item.text : item.text.toLowerCase();
          const description = caseSensitive
            ? item.description
            : item.description?.toLowerCase();

          return (
            text.includes(normalizedQuery) ||
            (description && description.includes(normalizedQuery))
          );
        })
        .sort((a, b) => {
          // Sort by priority first, then by relevance
          const priorityDiff = (b.priority || 0) - (a.priority || 0);
          if (priorityDiff !== 0) return priorityDiff;

          // Prefer exact matches at the start
          const aText = caseSensitive ? a.text : a.text.toLowerCase();
          const bText = caseSensitive ? b.text : b.text.toLowerCase();

          const aStartsWith = aText.startsWith(normalizedQuery);
          const bStartsWith = bText.startsWith(normalizedQuery);

          if (aStartsWith && !bStartsWith) return -1;
          if (!aStartsWith && bStartsWith) return 1;

          return aText.localeCompare(bText);
        })
        .slice(0, maxSuggestions);

      setSuggestions(filtered);
      setSelectedIndex(0);
      setIsLoading(false);
    },
    [completionItems, minQueryLength, maxSuggestions, caseSensitive]
  );

  // Debounce the search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchSuggestions(query);
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [query, searchSuggestions, debounceMs]);

  const acceptSuggestion = useCallback(
    (index?: number) => {
      const suggestionIndex = index ?? selectedIndex;
      const suggestion = suggestions[suggestionIndex];
      if (suggestion) {
        onAccept(suggestion);
        setSuggestions([]);
      }
    },
    [suggestions, selectedIndex, onAccept]
  );

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setSelectedIndex(0);
  }, []);

  return {
    suggestions,
    isLoading,
    selectedIndex,
    setSelectedIndex,
    acceptSuggestion,
    clearSuggestions,
  };
};

// Hook for command completion specifically
export const useCommandCompletion = (
  query: string,
  commands: string[],
  onAccept: (command: string) => void,
  options?: UseCompletionOptions
) => {
  const completionItems: CompletionItem[] = commands.map((cmd) => ({
    text: cmd,
    insertText: cmd,
    category: "command",
  }));

  return useCompletion(
    query,
    completionItems,
    (item) => onAccept(item.insertText || item.text),
    options
  );
};

// Hook for slash command completion
export const useSlashCompletion = (
  query: string,
  slashCommands: Array<{ command: string; description: string }>,
  onAccept: (command: string) => void,
  options?: UseCompletionOptions
) => {
  // Only trigger when query starts with "/"
  const isSlashQuery = query.startsWith("/");
  const slashQuery = isSlashQuery ? query.slice(1) : "";

  const completionItems: CompletionItem[] = slashCommands.map((cmd) => ({
    text: `/${cmd.command}`,
    description: cmd.description,
    insertText: `/${cmd.command}`,
    category: "slash-command",
    priority: 10,
  }));

  return useCompletion(
    isSlashQuery ? slashQuery : "",
    completionItems,
    (item) => onAccept(item.insertText || item.text),
    { ...options, minQueryLength: 0 }
  );
};
