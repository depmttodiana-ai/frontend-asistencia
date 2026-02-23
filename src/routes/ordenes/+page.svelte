<script lang="ts">
  import api from "$lib/api";
  import { onMount } from "svelte";
  import { FileText, Plus, X, Loader2, Pencil, Trash2 } from "lucide-svelte";
  import { authState } from "$lib/state/auth.svelte";

  interface OrdenTrabajo {
    id?: number;
    fecha: string;
    trabajo_1_a_realizar?: string;
    trabajo_1_realizado?: string;
    trabajo_2_a_realizar?: string;
    trabajo_2_realizado?: string;
    trabajo_3_a_realizar?: string;
    trabajo_3_realizado?: string;
    trabajo_4_a_realizar?: string;
    trabajo_4_realizado?: string;
    trabajo_5_a_realizar?: string;
    trabajo_5_realizado?: string;
  }

  let ordenes = $state<OrdenTrabajo[]>([]);
  let loading = $state(false);

  // Modal State
  let showModal = $state(false);
  let isEditing = $state(false);
  let editingId = $state<number | null>(null);
  let saving = $state(false);
  let errorMsg = $state<string | null>(null);

  // Form Data
  // Inicializamos fecha con hoy
  const today = new Date().toISOString().split("T")[0];
  let formData = $state<OrdenTrabajo>({
    fecha: today,
  });

  // Lista dinámica para UI (hasta 5)
  // Mapearemos esto a los campos del backend (trabajo_1..., trabajo_2...)
  let uiTrabajos = $state<{ a_realizar: string; realizado: string }[]>([
    { a_realizar: "", realizado: "" },
  ]);

  function addUiTrabajo() {
    if (uiTrabajos.length < 5) {
      uiTrabajos = [...uiTrabajos, { a_realizar: "", realizado: "" }];
    }
  }

  function removeUiTrabajo(index: number) {
    if (uiTrabajos.length > 1) {
      uiTrabajos = uiTrabajos.filter((_, i) => i !== index);
    } else {
      // Si es el último, solo limpiar
      uiTrabajos[0] = { a_realizar: "", realizado: "" };
    }
  }

  // Cargar datos
  async function loadOrdenes() {
    loading = true;
    try {
      const res = await api.get("/ordenes-trabajo/");
      ordenes = res.data.data || [];
    } catch (e) {
      console.error(e);
      ordenes = [];
    } finally {
      loading = false;
    }
  }

  function openCreateModal() {
    isEditing = false;
    editingId = null;
    formData = { fecha: today };
    uiTrabajos = [{ a_realizar: "", realizado: "" }];
    errorMsg = null;
    showModal = true;
  }

  function openEditModal(orden: OrdenTrabajo) {
    isEditing = true;
    editingId = orden.id!;
    formData = { fecha: orden.fecha };

    // Mapear trabajos de la orden a la UI
    uiTrabajos = [];
    for (let i = 1; i <= 5; i++) {
      const a_realizar = (orden as any)[`trabajo_${i}_a_realizar`];
      const realizado = (orden as any)[`trabajo_${i}_realizado`];
      if (a_realizar || realizado) {
        uiTrabajos.push({
          a_realizar: a_realizar || "",
          realizado: realizado || "",
        });
      }
    }

    // Si no hay ninguno, poner uno vacío
    if (uiTrabajos.length === 0) {
      uiTrabajos = [{ a_realizar: "", realizado: "" }];
    }

    errorMsg = null;
    showModal = true;
  }

  async function deleteOrden(id: number) {
    if (!confirm("¿Está seguro de eliminar esta orden?")) return;
    try {
      await api.delete(`/ordenes-trabajo/${id}`);
      loadOrdenes();
    } catch (e) {
      alert("Error al eliminar la orden.");
    }
  }

  async function saveOrden() {
    try {
      // Validar que al menos el primer trabajo tenga algo
      const validTrabajos = uiTrabajos.filter(
        (t) => t.a_realizar.trim() !== "",
      );

      if (validTrabajos.length === 0) {
        errorMsg = "Debe ingresar al menos una actividad a realizar.";
        return;
      }

      saving = true;
      errorMsg = null;

      // Mapear uiTrabajos a campos de backend
      const payload: any = {
        fecha: formData.fecha,
      };

      // Inicializar todos los campos opcionales como null para asegurar limpieza
      for (let i = 1; i <= 5; i++) {
        payload[`trabajo_${i}_a_realizar`] = null;
        payload[`trabajo_${i}_realizado`] = null;
      }

      // Llenar solo los que tienen contenido
      validTrabajos.forEach((item, index) => {
        const num = index + 1;
        payload[`trabajo_${num}_a_realizar`] = item.a_realizar.trim();
        payload[`trabajo_${num}_realizado`] = item.realizado.trim() || null;
      });

      if (isEditing && editingId) {
        await api.put(`/ordenes-trabajo/${editingId}`, payload);
      } else {
        await api.post("/ordenes-trabajo/", payload);
      }

      showModal = false;
      loadOrdenes();
    } catch (e: any) {
      console.error(e);
      errorMsg = e.response?.data?.detail;
      if (Array.isArray(errorMsg)) {
        // Manejar errores de validación de Pydantic
        errorMsg = errorMsg.map((err: any) => err.msg).join(", ");
      }
      errorMsg = errorMsg || "Error al crear la orden.";
    } finally {
      saving = false;
    }
  }

  // Descargar Word
  async function downloadWord(id: number) {
    try {
      // Usar window.open o fetch blob
      // window.open con token en query (?token=...) si fuera necesario, pero api.defaults tiene el token.
      // Mejor fetch blob.
      const res = await api.post(
        `/ordenes-trabajo/${id}/generar-documento`,
        {},
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Orden_${id}.docx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert("Error descargando reporte. Verifique permisos.");
    }
  }

  onMount(loadOrdenes);
</script>

<div class="px-4 py-5 sm:px-6">
  <div class="sm:flex sm:items-center">
    <div class="sm:flex-auto">
      <h1
        class="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight"
      >
        Órdenes de Trabajo
      </h1>
      <p class="mt-2 text-sm text-gray-500">
        Gestión de órdenes diarias con generación de documentos legales.
      </p>
    </div>
    <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
      <button
        onclick={openCreateModal}
        type="button"
        class="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 transition-colors"
      >
        <Plus class="mr-1.5 h-4 w-4" />
        Nueva Orden
      </button>
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
                  >Folio</th
                >
                <th
                  scope="col"
                  class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >Fecha</th
                >
                <th
                  scope="col"
                  class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >Trabajo Principal</th
                >
                <th
                  scope="col"
                  class="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                  >Estado</th
                >
                <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6"
                  >Acciones</th
                >
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 bg-white">
              {#if loading}
                <tr
                  ><td colspan="5" class="py-4 text-center text-gray-500"
                    >Cargando...</td
                  ></tr
                >
              {:else if ordenes.length === 0}
                <tr
                  ><td colspan="5" class="py-4 text-center text-gray-500"
                    >No hay órdenes registradas.</td
                  ></tr
                >
              {:else}
                {#each ordenes as orden}
                  <tr class="hover:bg-gray-50 transition">
                    <td
                      class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6"
                      >#{orden.id}</td
                    >
                    <td
                      class="whitespace-nowrap px-3 py-4 text-sm text-gray-500"
                      >{orden.fecha}</td
                    >
                    <td
                      class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 max-w-xs truncate"
                      >{orden.trabajo_1_a_realizar || "-"}</td
                    >
                    <td
                      class="whitespace-nowrap px-3 py-4 text-sm text-gray-500"
                    >
                      <span
                        class="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
                        >Registrado</span
                      >
                    </td>
                    <td
                      class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex justify-end gap-2"
                    >
                      <button
                        onclick={() => downloadWord(orden.id!)}
                        class="text-blue-600 hover:text-blue-900 flex items-center p-1 rounded hover:bg-blue-50"
                        title="Descargar Word"
                      >
                        <FileText class="w-4 h-4 mr-1" /> DOCX
                      </button>

                      {#if authState.isAdminOrCoord}
                        <button
                          onclick={() => openEditModal(orden)}
                          class="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                          title="Editar"
                        >
                          <Pencil class="w-4 h-4" />
                        </button>
                        <button
                          onclick={() => deleteOrden(orden.id!)}
                          class="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2 class="w-4 h-4" />
                        </button>
                      {/if}
                    </td>
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
    <div
      class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
      aria-hidden="true"
    ></div>

    <div
      class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
    >
      <div
        class="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:p-6"
      >
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
              {isEditing ? "Editar Orden de Trabajo" : "Nueva Orden de Trabajo"}
            </h3>

            {#if errorMsg}
              <div class="mt-2 p-2 bg-red-100 text-red-700 text-sm rounded">
                {errorMsg}
              </div>
            {/if}

            <div class="mt-4 space-y-4">
              <!-- Fecha -->
              <div>
                <label
                  for="fecha"
                  class="block text-sm font-medium text-gray-700">Fecha</label
                >
                <input
                  type="date"
                  id="fecha"
                  bind:value={formData.fecha}
                  class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm border p-2"
                />
              </div>

              <!-- Trabajos Dinámicos -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2"
                  >Actividades (Máx 5)</label
                >
                <div class="space-y-3">
                  {#each uiTrabajos as item, i}
                    <div
                      class="flex gap-2 items-start bg-gray-50 p-2 rounded border border-gray-200"
                    >
                      <span class="text-sm font-bold text-gray-500 mt-2"
                        >#{i + 1}</span
                      >
                      <div class="flex-1 space-y-2">
                        <input
                          type="text"
                          placeholder="Trabajo a realizar"
                          bind:value={item.a_realizar}
                          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm border p-1"
                        />
                        <input
                          type="text"
                          placeholder="Labor realizada (Opcional)"
                          bind:value={item.realizado}
                          class="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm border p-1"
                        />
                      </div>
                      {#if uiTrabajos.length > 1}
                        <button
                          type="button"
                          onclick={() => removeUiTrabajo(i)}
                          class="text-red-500 hover:text-red-700 p-1"
                        >
                          <X size={16} />
                        </button>
                      {/if}
                    </div>
                  {/each}
                </div>

                {#if uiTrabajos.length < 5}
                  <button
                    type="button"
                    onclick={addUiTrabajo}
                    class="mt-2 text-sm text-green-600 hover:text-green-800 font-medium flex items-center"
                  >
                    <Plus size={16} class="mr-1" /> Agregar otra actividad
                  </button>
                {/if}
              </div>
            </div>
          </div>
        </div>
        <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
          <button
            type="button"
            class="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto disabled:opacity-50"
            onclick={saveOrden}
            disabled={saving}
          >
            {#if saving}<Loader2 class="animate-spin h-4 w-4 mr-2" />{/if}
            {isEditing ? "Guardar Cambios" : "Crear Orden"}
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
