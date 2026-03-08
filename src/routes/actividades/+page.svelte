<script lang="ts">
  import TodoListMtto from "$lib/components/todo_list_mtto.svelte";
  import { authState } from "$lib/state/auth.svelte";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  onMount(() => {
    if (!authState.isAuthenticated) {
      goto("/login");
    }
  });
</script>

<svelte:head>
  <title>Actividades | MTTO App</title>
</svelte:head>

<div class="min-h-screen bg-gray-50/50">
  <TodoListMtto />
</div>
