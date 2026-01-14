<script lang="ts">
  import '../app.scss';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import ThemeToggle from '$components/ThemeToggle.svelte';

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 1,
      },
    },
  });

  // Theme management
  let theme: 'light' | 'dark' | 'system' = 'system';

  onMount(() => {
    // Get saved theme or default to system
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    theme = saved || 'system';
    applyTheme(theme);
  });

  function applyTheme(newTheme: 'light' | 'dark' | 'system') {
    if (!browser) return;
    
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    
    if (newTheme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(newTheme);
    }
    
    localStorage.setItem('theme', newTheme);
    theme = newTheme;
  }
</script>

<QueryClientProvider client={queryClient}>
  <div class="app">
    <header class="app-header">
      <a href="/" class="logo">
        <span class="gradient-text">SUIPIC</span>
      </a>
      <nav class="nav">
        <ThemeToggle {theme} on:change={(e) => applyTheme(e.detail)} />
      </nav>
    </header>
    
    <main class="main">
      <slot />
    </main>
  </div>
</QueryClientProvider>

<style lang="scss">
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  .app-header {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 2rem;
    background: var(--surface-overlay);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--border-muted);
  }
  
  .logo {
    font-family: var(--font-heading);
    font-size: 1.5rem;
    letter-spacing: 0.1em;
    text-decoration: none;
  }
  
  .nav {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .main {
    flex: 1;
    padding: 2rem;
  }
</style>
