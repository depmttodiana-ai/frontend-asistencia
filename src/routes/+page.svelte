<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { authState } from "$lib/state/auth.svelte";

  onMount(() => {
    if (authState.isAuthenticated) {
      goto("/dashboard");
    } else {
      goto("/login");
    }
  });
</script>

<div class="flex h-screen items-center justify-center">
  <div class="animate-pulse flex flex-col items-center">
    <div class="h-12 w-12 bg-blue-400 rounded-full mb-4"></div>
    <div class="h-4 w-32 bg-gray-200 rounded"></div>
  </div>
</div>
