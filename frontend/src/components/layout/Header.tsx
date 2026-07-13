import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { Breadcrumb } from './Breadcrumb';
import { NotificationPanel } from './NotificationPanel';
import { UserMenu } from './UserMenu';
import { Button } from '../ui/Button';
import { Moon, Sun, Menu, Search, Cpu } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import apiClient from '@/lib/axios';
import { ApiResponse } from '@/types/api.types';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  name: string;
  deviceId: string;
  macAddress: string;
  firmware: string;
  status: string;
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const { toggleSidebar } = useUIStore();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [allItems, setAllItems] = useState<SearchResult[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounce search query input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Keyboard shortcut Ctrl+K to focus search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.key === 'k') && e.key === 'k') {
        e.preventDefault();
        const inputEl = searchRef.current?.querySelector('input');
        inputEl?.focus();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch search items when focused
  const handleFocus = async () => {
    setIsSearchFocused(true);
    if (allItems.length > 0) return;

    try {
      // Fetch machines and device health in parallel
      const [machinesRes, healthRes] = await Promise.all([
        apiClient.get<ApiResponse<any[]>>('/machines'),
        apiClient.get<ApiResponse<any[]>>('/device-health'),
      ]);

      const machines = machinesRes.data.data || [];
      const healthDevices = healthRes.data.data || [];

      const mergedList = machines.map((m) => {
        const device = healthDevices.find((h) => h.machineId === m.id);
        return {
          id: m.id,
          name: m.name,
          deviceId: device?.deviceId || `device-${m.id}`,
          macAddress: device?.macAddress || '00:1A:2B:3C:4D:00',
          firmware: device?.firmware || 'v1.0.0',
          status: m.currentStatus,
        };
      });

      setAllItems(mergedList);
    } catch (err) {
      console.error('Failed to load search index:', err);
    }
  };

  // Perform search locally on debounced query
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = debouncedQuery.toLowerCase();
    const filtered = allItems.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query) ||
        item.deviceId.toLowerCase().includes(query) ||
        item.macAddress.toLowerCase().includes(query) ||
        item.firmware.toLowerCase().includes(query)
    );
    setSearchResults(filtered.slice(0, 8)); // Cap at 8 results
  }, [debouncedQuery, allItems]);

  const handleSelectResult = (machineId: string) => {
    setIsSearchFocused(false);
    setSearchQuery('');
    router.push(`/machines/${machineId}`);
  };

  // HIGHLIGHT MATCHING SUBSTRINGS
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} className="bg-primary/30 text-primary-foreground font-bold px-0.5 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <header className="flex h-16 w-full items-center justify-between border-b px-4 md:px-6 bg-card text-card-foreground relative z-20 shadow-sm">
      {/* Left side: Mobile menu trigger + Breadcrumbs */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="lg:hidden hover:bg-accent rounded-lg"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="hidden sm:block">
          <Breadcrumb />
        </div>
      </div>

      {/* Center/Right: Actions & Search & User Panel */}
      <div className="flex items-center space-x-4 flex-1 justify-end max-w-2xl">
        {/* Global Search Input */}
        <div className="relative flex-1 max-w-sm hidden md:block" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search fleet (Ctrl+K)..."
              value={searchQuery}
              onFocus={handleFocus}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-accent/40 text-foreground placeholder-muted-foreground text-xs rounded-lg pl-9 pr-8 py-2.5 border border-border/40 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all duration-150"
            />
            <kbd className="absolute right-3 top-2.5 pointer-events-none inline-flex h-4.5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[9px] font-medium text-muted-foreground">
              <span className="text-[10px]">⌘</span>K
            </kbd>
          </div>

          {/* Search Dropdown Panel */}
          {isSearchFocused && searchQuery && (
            <div className="absolute left-0 right-0 mt-2.5 rounded-xl border border-border bg-card shadow-lg p-2 z-50 max-h-[380px] overflow-y-auto divide-y divide-border/40 animate-in fade-in slide-in-from-top-2 duration-150">
              {searchResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  No matching assets found
                </div>
              ) : (
                searchResults.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectResult(item.id)}
                    className="w-full text-left flex items-start gap-3 p-2.5 hover:bg-accent/40 rounded-lg transition-colors duration-150 first:pt-2"
                  >
                    <Cpu className="h-4.5 w-4.5 text-primary mt-0.5" />
                    <div className="flex-1 space-y-0.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-foreground">
                          {highlightMatch(item.name, debouncedQuery)}
                        </span>
                        <span
                          className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            item.status === 'RUNNING'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : item.status === 'IDLE'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        ID: {highlightMatch(item.deviceId, debouncedQuery)} • MAC: {highlightMatch(item.macAddress, debouncedQuery)}
                      </p>
                      <div className="flex items-center gap-2 pt-0.5 text-[9px] text-muted-foreground">
                        <span className="bg-muted px-1 rounded font-mono">
                          FW: {highlightMatch(item.firmware, debouncedQuery)}
                        </span>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-3.5">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-accent rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-4.5 w-4.5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4.5 w-4.5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Notifications */}
          <NotificationPanel />

          {/* Separator */}
          <div className="h-5 w-px bg-border" />

          {/* User profile dropdown */}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}


