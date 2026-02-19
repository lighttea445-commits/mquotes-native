import { useState, useCallback, useRef } from 'react';
import {
  fetchMultipleRandomQuotes,
  fetchQuotesByMood,
  fetchQuotesByCategory,
  fetchQuotesByTopic,
  ApiQuote,
  convertApiQuote,
  Quote,
} from '../lib/quotesApi';

const BUFFER_SIZE = 8;
const PREFETCH_THRESHOLD = 3;

interface UseQuotesOptions {
  mode: 'random' | 'mood' | 'category' | 'topic' | 'mix';
  moodId?: string;
  categoryId?: string;
  topicId?: string;
  mixLoader?: () => Promise<ApiQuote[]>;
}

export function useQuotes(options: UseQuotesOptions) {
  const [buffer, setBuffer] = useState<ApiQuote[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ApiQuote[]>([]);
  const historyIndexRef = useRef(-1);
  const isFetching = useRef(false);

  const fetchQuotes = useCallback(async (): Promise<ApiQuote[]> => {
    switch (options.mode) {
      case 'mood':
        return options.moodId
          ? fetchQuotesByMood(options.moodId)
          : fetchMultipleRandomQuotes(20);
      case 'category':
        return options.categoryId
          ? fetchQuotesByCategory(options.categoryId)
          : fetchMultipleRandomQuotes(20);
      case 'topic':
        return options.topicId
          ? fetchQuotesByTopic(options.topicId)
          : fetchMultipleRandomQuotes(20);
      case 'mix':
        return options.mixLoader ? options.mixLoader() : fetchMultipleRandomQuotes(20);
      default:
        return fetchMultipleRandomQuotes(20);
    }
  }, [options]);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const quotes = await fetchQuotes();
      setBuffer(quotes);
      setCurrentIndex(0);
      if (quotes.length > 0) {
        setHistory([quotes[0]]);
        historyIndexRef.current = 0;
      }
    } finally {
      setLoading(false);
    }
  }, [fetchQuotes]);

  const prefetch = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    try {
      const more = await fetchMultipleRandomQuotes(BUFFER_SIZE);
      setBuffer(prev => [...prev, ...more]);
    } finally {
      isFetching.current = false;
    }
  }, []);

  const getCurrentQuote = useCallback((): ApiQuote | null => {
    return buffer[currentIndex] ?? null;
  }, [buffer, currentIndex]);

  const getNextQuote = useCallback(async (): Promise<ApiQuote | null> => {
    const nextIndex = currentIndex + 1;

    // Prefetch when buffer is running low
    if (buffer.length - nextIndex <= PREFETCH_THRESHOLD) {
      prefetch();
    }

    if (nextIndex >= buffer.length) {
      // Need to load more
      setLoading(true);
      const more = await fetchQuotes();
      setLoading(false);
      if (more.length === 0) return null;
      setBuffer(prev => [...prev, ...more]);
      const quote = more[0];
      setCurrentIndex(nextIndex);
      setHistory(prev => {
        const trimmed = prev.slice(0, historyIndexRef.current + 1);
        historyIndexRef.current = trimmed.length;
        return [...trimmed, quote];
      });
      return quote;
    }

    const quote = buffer[nextIndex];
    setCurrentIndex(nextIndex);
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndexRef.current + 1);
      historyIndexRef.current = trimmed.length;
      return [...trimmed, quote];
    });
    return quote;
  }, [buffer, currentIndex, fetchQuotes, prefetch]);

  const getPreviousQuote = useCallback((): ApiQuote | null => {
    const prevHistoryIndex = historyIndexRef.current - 1;
    if (prevHistoryIndex < 0) return null;
    historyIndexRef.current = prevHistoryIndex;
    return history[prevHistoryIndex] ?? null;
  }, [history]);

  const currentQuote = getCurrentQuote();
  const currentConverted: Quote | null = currentQuote
    ? convertApiQuote(currentQuote)
    : null;

  return {
    currentQuote,
    currentConverted,
    loading,
    loadInitial,
    getNextQuote,
    getPreviousQuote,
    bufferSize: buffer.length - currentIndex,
  };
}
