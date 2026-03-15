<script lang="ts">
  import { ShieldCheck, Loader2 } from 'lucide-svelte';
  import api from '$lib/api';
  
  let email = $state('');
  let loading = $state(false);
  let message = $state<string | null>(null);
  let error = $state<string | null>(null);

  async function handleSubmit() {
    loading = true;
    error = null;
    message = null;
    try {
      const res = await api.post('/auth/forgot-password', { email });
      message = res.data.message || 'Si el correo está registrado, se ha enviado un enlace.';
    } catch (err: any) {
      error = err.response?.data?.detail || 'Ha ocurrido un error.';
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
      Recuperar Contraseña
    </h2>
    <p class="mt-2 text-center text-sm text-gray-600">
      Ingresa tu correo para recibir un enlace de recuperación.
    </p>
  </div>

  <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
    <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
      
      {#if message}
        <div class="rounded-md bg-green-50 p-4 mb-4">
          <p class="text-sm text-green-700">{message}</p>
        </div>
      {/if}

      {#if error}
        <div class="rounded-md bg-red-50 p-4 mb-4">
          <p class="text-sm text-red-700">{error}</p>
        </div>
      {/if}

      <form class="space-y-6" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">
            Correo Electrónico
          </label>
          <div class="mt-1">
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              bind:value={email}
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
              Enviando...
            {:else}
              Enviar Enlace
            {/if}
          </button>
        </div>
        <div class="text-sm text-center mt-4">
          <a href="/login" class="font-medium text-blue-600 hover:text-blue-500">
            Volver al inicio de sesión
          </a>
        </div>
      </form>
    </div>
  </div>
</div>
