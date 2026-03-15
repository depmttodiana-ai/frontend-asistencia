<script lang="ts">
  import { page } from '$app/stores';
  import { ShieldCheck, Loader2 } from 'lucide-svelte';
  import api from '$lib/api';
  
  let token = $derived($page.url.searchParams.get('token'));
  let new_password = $state('');
  let confirm_password = $state('');
  
  let loading = $state(false);
  let message = $state<string | null>(null);
  let error = $state<string | null>(null);

  async function handleSubmit() {
    if (new_password !== confirm_password) {
      error = "Las contraseñas no coinciden.";
      return;
    }
    
    loading = true;
    error = null;
    message = null;
    
    try {
      const res = await api.post('/auth/reset-password', { 
        token, 
        new_password 
      });
      message = res.data.message || 'Contraseña restablecida con éxito.';
    } catch (err: any) {
      error = err.response?.data?.detail || 'Enlace inválido o ha expirado.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
  <div class="sm:mx-auto sm:w-full sm:max-w-md">
    <div class="flex justify-center text-primary-600">
      <ShieldCheck size={64} class="text-blue-600" />
    </div>
    <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
      Nueva Contraseña
    </h2>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
      
      {#if !token}
         <div class="rounded-md bg-red-50 p-4 mb-4 text-center">
            <p class="text-sm text-red-700">Token no válido o extraviado. Regresa al correo o solicita uno nuevo.</p>
         </div>
      {:else if message}
        <div class="rounded-md bg-green-50 p-4 mb-4 text-center">
          <p class="text-sm text-green-700 font-medium mb-3">{message}</p>
          <a href="/login" class="text-blue-600 font-semibold hover:underline">Ir a Iniciar Sesión</a>
        </div>
      {:else}
        {#if error}
          <div class="rounded-md bg-red-50 p-4 mb-4">
            <p class="text-sm text-red-700">{error}</p>
          </div>
        {/if}

        <form class="space-y-6" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          <div>
            <label for="new_password" class="block text-sm font-medium text-gray-700">
              Nueva Contraseña
            </label>
            <div class="mt-1">
              <input 
                id="new_password" 
                type="password" 
                required 
                bind:value={new_password}
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div>
            <label for="confirm_password" class="block text-sm font-medium text-gray-700">
              Confirmar Contraseña
            </label>
            <div class="mt-1">
              <input 
                id="confirm_password" 
                type="password" 
                required 
                bind:value={confirm_password}
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              disabled={loading}
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {#if loading}
                <Loader2 class="animate-spin mr-2 h-5 w-5" />
                Guardando...
              {:else}
                Restablecer Contraseña
              {/if}
            </button>
          </div>
        </form>
      {/if}
    </div>
  </div>
</div>
