<script lang="ts">
  import "../app.css";
  import { authState } from "$lib/state/auth.svelte";
  import { page } from "$app/state";
  import Sidebar from "$lib/components/Sidebar.svelte";

  let { children } = $props();

  // Determinar si debemos mostrar el sidebar (si no es login)
  let showSidebar = $derived(
    authState.isAuthenticated && !page.url.pathname.startsWith("/login"),
  );
</script>

<div class="min-h-screen bg-gray-50 flex flex-col md:flex-row">
  {#if showSidebar}
    <Sidebar />
  {/if}

  <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
    <div class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      {@render children()}
    </div>
  </main>
</div>
