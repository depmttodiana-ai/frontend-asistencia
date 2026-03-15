<script lang="ts">
  import { authState } from '$lib/state/auth.svelte';
  import { ShieldCheck, User, Mail, Lock, Loader2 } from 'lucide-svelte';
  import api from '$lib/api';

  let email = $state(authState.user?.email || '');
  let emailLoading = $state(false);
  let emailMessage = $state<string | null>(null);
  let emailError = $state<string | null>(null);

  let current_password = $state('');
  let new_password = $state('');
  let pwdLoading = $state(false);
  let pwdMessage = $state<string | null>(null);
  let pwdError = $state<string | null>(null);

  async function handleUpdateEmail() {
    emailLoading = true;
    emailMessage = null;
    emailError = null;
    try {
      const res = await api.post('/auth/update-email', { email });
      emailMessage = res.data.message;
      if (authState.user) {
        authState.user.email = res.data.email;
        // Optionally update localStorage manually here if needed
        localStorage.setItem('user', JSON.stringify(authState.user));
      }
    } catch (err: any) {
      emailError = err.response?.data?.detail || 'Error al actualizar el correo.';
    } finally {
      emailLoading = false;
    }
  }

  async function handleChangePassword() {
    if (!current_password || !new_password) return;
    pwdLoading = true;
    pwdMessage = null;
    pwdError = null;
    try {
      const res = await api.post('/auth/change-password', { 
        current_password, 
        new_password 
      });
      pwdMessage = res.data.message;
      current_password = '';
      new_password = '';
    } catch (err: any) {
      pwdError = err.response?.data?.detail || 'Error al cambiar la contraseña.';
    } finally {
      pwdLoading = false;
    }
  }
</script>

<div class="max-w-3xl mx-auto space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
      <User class="text-blue-600" />
      Mi Perfil
    </h1>
    <p class="text-sm text-gray-500 mt-1">Administra tu cuenta, correo de recuperación y contraseña.</p>
  </div>

  <div class="bg-white rounded-lg shadow-sm border border-gray-200">
    <div class="p-6 border-b border-gray-200">
      <div class="flex items-center gap-2 mb-4">
        <Mail class="text-gray-400" size={20} />
        <h2 class="text-lg font-medium text-gray-900">Correo de Recuperación</h2>
      </div>
      <p class="text-sm text-gray-500 mb-6">
        Establece un correo electrónico para poder recuperar tu contraseña si la olvidas en el futuro.
      </p>

      <form onsubmit={(e) => { e.preventDefault(); handleUpdateEmail(); }} class="max-w-md space-y-4">
        {#if emailMessage}
          <div class="p-3 bg-green-50 text-green-700 rounded text-sm">{emailMessage}</div>
        {/if}
        {#if emailError}
          <div class="p-3 bg-red-50 text-red-700 rounded text-sm">{emailError}</div>
        {/if}
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700">Correo Electrónico</label>
          <input 
            type="email" 
            id="email" 
            bind:value={email} 
            required
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border" 
          />
        </div>
        <button type="submit" disabled={emailLoading} class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
          {#if emailLoading} <Loader2 class="animate-spin mr-2 h-4 w-4" /> {:else} Guardar Correo {/if}
        </button>
      </form>
    </div>

    <div class="p-6">
      <div class="flex items-center gap-2 mb-4">
        <Lock class="text-gray-400" size={20} />
        <h2 class="text-lg font-medium text-gray-900">Cambiar Contraseña</h2>
      </div>
      
      <form onsubmit={(e) => { e.preventDefault(); handleChangePassword(); }} class="max-w-md space-y-4">
        {#if pwdMessage}
          <div class="p-3 bg-green-50 text-green-700 rounded text-sm">{pwdMessage}</div>
        {/if}
        {#if pwdError}
          <div class="p-3 bg-red-50 text-red-700 rounded text-sm">{pwdError}</div>
        {/if}
        <div>
          <label for="current_password" class="block text-sm font-medium text-gray-700">Contraseña Actual</label>
          <input 
            type="password" 
            id="current_password" 
            bind:value={current_password} 
            required 
            minlength="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border" 
          />
        </div>
        <div>
          <label for="new_password" class="block text-sm font-medium text-gray-700">Nueva Contraseña</label>
          <input 
            type="password" 
            id="new_password" 
            bind:value={new_password} 
            required 
            minlength="4"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border" 
          />
        </div>
        <button type="submit" disabled={pwdLoading} class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
          {#if pwdLoading} <Loader2 class="animate-spin mr-2 h-4 w-4" /> {:else} Actualizar Contraseña {/if}
        </button>
      </form>
    </div>
  </div>
</div>
