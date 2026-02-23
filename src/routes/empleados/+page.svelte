<script lang="ts">
  import { onMount } from "svelte";
  import api from "$lib/api";
  import { authState } from "$lib/state/auth.svelte.ts";
  import { UserPlus, Search, Edit2, Trash2, X, Loader2 } from "lucide-svelte";

  interface Empleado {
    id?: number;
    codigo: string;
    nombre: string;
    apellido: string;
    cargo: string;
    estado: string;
    fecha_ingreso?: string;
  }

  let empleados = $state<Empleado[]>([]);
  let loading = $state(true);
  let searchQuery = $state("");

  // Modal State
  let showModal = $state(false);
  let editingId = $state<number | null>(null);
  let formData = $state<Empleado>({
    codigo: "",
    nombre: "",
    apellido: "",
    cargo: "",
    estado: "activo",
  });
  let saving = $state(false);
  let errorMsg = $state<string | null>(null);

  // Permisos
  const canEdit = $derived(
    authState.user?.role === "admin" || authState.user?.role === "coordinador",
  );

  async function loadEmpleados() {
    try {
      loading = true;
      const res = await api.get("/empleados/");
      empleados = res.data.data || [];
    } catch (e) {
      console.error(e);
      empleados = [];
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    editingId = null;
    formData = {
      codigo: "",
      nombre: "",
      apellido: "",
      cargo: "",
      estado: "activo",
    };
    errorMsg = null;
    showModal = true;
  }

  function openEditModal(emp: Empleado) {
    editingId = emp.id!;
    formData = { ...emp };
    errorMsg = null;
    showModal = true;
  }

  async function saveEmpleado() {
    try {
      saving = true;
      errorMsg = null;

      if (!formData.codigo || !formData.nombre || !formData.apellido || !formData.cargo || !formData.estado) {
        errorMsg = "Debe completar todos los campos";
        saving = false;
        return;
      }

      const payload = { ...formData };

      if (editingId) {
        // Update
        await api.put(`/empleados/${editingId}`, payload);
      } else {
        // Create
        await api.post("/empleados/", payload);
      }

      showModal = false;
      loadEmpleados();
    } catch (e: any) {
      console.error(e);
      if (e.response?.status === 422) {
        errorMsg = "Debe completar todos los campos";
      } else if (e.response?.data?.detail && typeof e.response.data.detail === "string") {
        errorMsg = e.response.data.detail;
      } else {
        errorMsg = "Error al guardar empleado.";
      }
    } finally {
      saving = false;
    }
  }

  async function deleteEmpleado(id: number) {
    if (
      !confirm(
        "¿Está seguro de eliminar este empleado? Esta acción es irreversible.",
      )
    )
      return;

    try {
      await api.delete(`/empleados/${id}`);
      loadEmpleados();
    } catch (e: any) {
      alert("Error al eliminar: " + (e.response?.data?.detail || e.message));
    }
  }

  // Filtrado
  let filteredEmpleados = $derived(
    empleados.filter(
      (e) =>
        e.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.apellido.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.cargo.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );

  onMount(loadEmpleados);
</script>

<div class="px-4 py-5 sm:px-6">
  <div class="sm:flex sm:items-center">
    <div class="sm:flex-auto">
      <h1 class="text-2xl font-bold leading-7 text-gray-900">
        Personal de Planta
      </h1>
      <p class="mt-2 text-sm text-gray-500">
        Gestión de empleados, cargos y estados.
      </p>
    </div>
    <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
      {#if canEdit}
        <button
          onclick={openCreateModal}
          type="button"
          class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
        >
          <UserPlus class="mr-1.5 h-4 w-4" />
          Nuevo Empleado
        </button>
      {/if}
    </div>
  </div>

  <div class="mt-6 flex gap-x-4">
    <div class="relative flex-grow max-w-md">
      <div
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
      >
        <Search class="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        bind:value={searchQuery}
        class="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
        placeholder="Buscar por nombre, código o cargo..."
      />
    </div>
  </div>

  <div class="mt-8 flow-root">
    <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
        <div
          class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg"
        >
          <table class="min-w-full divide-y divide-gray-300">
            <thead class="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  class="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                  >Código</th
                >
                <th
                  scope="col"
                  class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >Nombre</th
                >
                <th
                  scope="col"
                  class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >Cargo</th
                >
                <th
                  scope="col"
                  class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >Estado</th
                >
                {#if canEdit}
                  <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6"
                    ><span class="sr-only">Acciones</span></th
                  >
                {/if}
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              {#if loading}
                <tr
                  ><td colspan="5" class="py-4 text-center text-gray-500"
                    >Cargando...</td
                  ></tr
                >
              {:else if filteredEmpleados.length === 0}
                <tr
                  ><td colspan="5" class="py-4 text-center text-gray-500"
                    >No se encontraron empleados.</td
                  ></tr
                >
              {:else}
                {#each filteredEmpleados as emp}
                  <tr class="hover:bg-gray-50 transition">
                    <td
                      class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6"
                      >{emp.codigo}</td
                    >
                    <td
                      class="whitespace-nowrap px-3 py-4 text-sm text-gray-500"
                      >{emp.nombre} {emp.apellido}</td
                    >
                    <td
                      class="whitespace-nowrap px-3 py-4 text-sm text-gray-500"
                      >{emp.cargo}</td
                    >
                    <td class="whitespace-nowrap px-3 py-4 text-sm">
                      <span
                        class={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset uppercase ${
                          emp.estado === "activo"
                            ? "bg-green-50 text-green-700 ring-green-600/20"
                            : emp.estado === "inactivo"
                              ? "bg-gray-50 text-gray-600 ring-gray-500/10"
                              : emp.estado === "vacaciones"
                                ? "bg-yellow-50 text-yellow-700 ring-yellow-600/20"
                                : emp.estado === "suspendido"
                                  ? "bg-red-50 text-red-700 ring-red-600/20"
                                  : "bg-blue-50 text-blue-700 ring-blue-600/20"
                        }`}
                      >
                        {emp.estado}
                      </span>
                    </td>
                    {#if canEdit}
                      <td
                        class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6"
                      >
                        <button
                          onclick={() => openEditModal(emp)}
                          class="text-blue-600 hover:text-blue-900 mr-3"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onclick={() => deleteEmpleado(emp.id!)}
                          class="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    {/if}
                  </tr>
                {/each}
              {/if}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Modal -->
{#if showModal}
  <div
    class="fixed inset-0 z-50 overflow-y-auto"
    aria-labelledby="modal-title"
    role="dialog"
    aria-modal="true"
  >
    <!-- Overlay -->
    <div
      class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
      aria-hidden="true"
    ></div>

    <div
      class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
    >
      <div
        class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6"
      >
        <!-- Close Button -->
        <div class="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
          <button
            type="button"
            class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
            onclick={() => (showModal = false)}
          >
            <span class="sr-only">Cerrar</span>
            <X class="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div class="sm:flex sm:items-start w-full">
          <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
            <h3
              class="text-base font-semibold leading-6 text-gray-900"
              id="modal-title"
            >
              {editingId ? "Editar Empleado" : "Nuevo Empleado"}
            </h3>

            {#if errorMsg}
              <div class="mt-2 p-2 bg-red-100 text-red-700 text-sm rounded">
                {errorMsg}
              </div>
            {/if}

            <div class="mt-4 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label
                    for="codigo"
                    class="block text-sm font-medium text-gray-700"
                    >Código</label
                  >
                  <input
                    type="text"
                    id="codigo"
                    bind:value={formData.codigo}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  />
                </div>
                <div>
                  <label
                    for="estado"
                    class="block text-sm font-medium text-gray-700"
                    >Estado</label
                  >
                  <select
                    id="estado"
                    bind:value={formData.estado}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="vacaciones">Vacaciones</option>
                    <option value="licencia">Licencia</option>
                    <option value="suspendido">Suspendido</option>
                  </select>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label
                    for="nombre"
                    class="block text-sm font-medium text-gray-700"
                    >Nombre</label
                  >
                  <input
                    type="text"
                    id="nombre"
                    bind:value={formData.nombre}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  />
                </div>
                <div>
                  <label
                    for="apellido"
                    class="block text-sm font-medium text-gray-700"
                    >Apellido</label
                  >
                  <input
                    type="text"
                    id="apellido"
                    bind:value={formData.apellido}
                    class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  />
                </div>
              </div>

              <div>
                <label
                  for="cargo"
                  class="block text-sm font-medium text-gray-700">Cargo</label
                >
                <input
                  type="text"
                  id="cargo"
                  bind:value={formData.cargo}
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            class="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:ml-3 sm:w-auto disabled:opacity-50"
            onclick={saveEmpleado}
            disabled={saving}
          >
            {#if saving}<Loader2 class="animate-spin h-4 w-4 mr-2" />{/if}
            Guardar
          </button>
          <button
            type="button"
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
            onclick={() => (showModal = false)}>Cancelar</button
          >
        </div>
      </div>
    </div>
  </div>
{/if}
