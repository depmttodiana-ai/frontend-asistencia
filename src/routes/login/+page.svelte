
<script lang="ts">
  import { authState } from '$lib/state/auth.svelte.ts';
  import { ShieldCheck, Loader2 } from 'lucide-svelte';

  let username = $state('');
  let password = $state('');

  async function handleSubmit() {
    await authState.login(username, password);
  }
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <div class="flex justify-center text-primary-600">
      <ShieldCheck size={64} class="text-blue-600" />
    </div>
    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
      Acceso al Sistema MTTO
    </h2>
    <p class="mt-2 text-center text-sm text-gray-600">
      Palmeras Diana - Mantenimiento
    </p>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
      
      {#if authState.error}
        <div class="rounded-md bg-red-50 p-4 mb-4">
          <div class="flex">
            <div class="ml-3">
              <h3 class="text-sm font-medium text-red-800">
                Error de inicio de sesión
              </h3>
              <div class="mt-2 text-sm text-red-700">
                <p>{authState.error}</p>
              </div>
            </div>
          </div>
        </div>
      {/if}

      <form class="space-y-6" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div>
          <label for="username" class="block text-sm font-medium text-gray-700">
            Usuario
          </label>
          <div class="mt-1">
            <input 
              id="username" 
              name="username" 
              type="text" 
              autocomplete="username" 
              required 
              bind:value={username}
              class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-700">
            Contraseña
          </label>
          <div class="mt-1">
            <input 
              id="password" 
              name="password" 
              type="password" 
              autocomplete="current-password" 
              required 
              bind:value={password}
              class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <button 
            type="submit" 
            disabled={authState.loading}
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {#if authState.loading}
              <Loader2 class="animate-spin mr-2 h-5 w-5" />
              Ingresando...
            {:else}
              Iniciar Sesión
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
