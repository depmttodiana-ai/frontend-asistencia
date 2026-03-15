<script lang="ts">
  import { authState } from '$lib/state/auth.svelte';
  import { Users, UserPlus, Loader2 } from 'lucide-svelte';
  import api from '$lib/api';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';

  // Proteger la ruta, si no es admin, fuera.
  onMount(() => {
    if (authState.user?.role !== 'admin') {
      goto('/dashboard');
    }
  });

  let nombre = $state('');
  let apellido = $state('');
  let email = $state('');
  let role = $state('supervisor');
  
  let loading = $state(false);
  let message = $state<string | null>(null);
  let error = $state<string | null>(null);
  let newUserData = $state<any>(null);

  async function handleRegisterUser() {
    loading = true;
    error = null;
    message = null;
    newUserData = null;
    
    try {
      const res = await api.post('/auth/register', {
        nombre,
        apellido,
        email,
        role
      });
      message = res.data.message;
      newUserData = {
        username: res.data.username,
        default_password: res.data.default_password,
        role: res.data.role
      };
      
      // Limpiar el form
      nombre = '';
      apellido = '';
      email = '';
      role = 'supervisor';
    } catch (err: any) {
      error = err.response?.data?.detail || 'Error al crear el usuario. Por favor verifica. El correo podría estar en uso.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="max-w-4xl mx-auto space-y-6">
  <div>
    <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
      <Users class="text-blue-600" />
      Gestión de Usuarios
    </h1>
    <p class="text-sm text-gray-500 mt-1">Registra nuevos usuarios para el sistema (Acceso Exclusivo - Admin).</p>
  </div>

  <div class="bg-white rounded-lg shadow-sm border border-gray-200">
    <div class="p-6">
      <div class="flex items-center gap-2 mb-4 text-blue-800">
        <UserPlus size={20} />
        <h2 class="text-lg font-medium">Crear Nuevo Usuario</h2>
      </div>

      <form onsubmit={(e) => { e.preventDefault(); handleRegisterUser(); }} class="space-y-4 max-w-lg">
        {#if message}
          <div class="p-4 bg-green-50 text-green-800 rounded-md text-sm border border-green-200">
            <p class="font-semibold mb-2">{message}</p>
            {#if newUserData}
              <ul class="list-disc pl-5 mt-1">
                <li><strong>Usuario:</strong> {newUserData.username}</li>
                <li><strong>Contraseña estándar:</strong> {newUserData.default_password}</li>
                <li><strong>Rol asignado:</strong> {newUserData.role}</li>
              </ul>
              <p class="mt-2 text-xs text-green-700 italic">Por favor, copia esta información y entrégasela al usuario. Al ingresar por primera vez, el usuario podrá cambiar su contraseña si lo desea.</p>
            {/if}
          </div>
        {/if}

        {#if error}
          <div class="p-3 bg-red-50 text-red-700 rounded text-sm border border-red-200">{error}</div>
        {/if}

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="nombre" class="block text-sm font-medium text-gray-700">Nombres</label>
            <input 
              type="text" 
              id="nombre" 
              bind:value={nombre} 
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border" 
            />
          </div>
          <div>
            <label for="apellido" class="block text-sm font-medium text-gray-700">Apellidos</label>
            <input 
              type="text" 
              id="apellido" 
              bind:value={apellido} 
              required
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border" 
            />
          </div>
        </div>

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

        <div>
           <label for="role" class="block text-sm font-medium text-gray-700">Rol del Sistema</label>
           <select 
             id="role" 
             bind:value={role} 
             required
             class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
           >
             <option value="supervisor">Supervisor</option>
             <option value="coordinador">Coordinador</option>
             <option value="admin">Administrador</option>
           </select>
        </div>

        <div class="pt-2">
          <button type="submit" disabled={loading} class="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
            {#if loading} <Loader2 class="animate-spin mr-2 h-4 w-4" /> {:else} Generar Credenciales {/if}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>
