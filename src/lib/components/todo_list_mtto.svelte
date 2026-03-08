<script lang="ts">
  import { onMount } from "svelte";
  import api from "$lib/api";
  import { authState } from "$lib/state/auth.svelte";
  import {
    Plus,
    Pencil,
    Edit,
    Trash2,
    Save,
    X,
    Calendar,
    Loader2,
    Image as ImageIcon,
    CheckCircle2,
    Clock,
    PauseCircle,
  } from "lucide-svelte";

  // --- Estados del Componente ---
  let tareas = $state<any[]>([]);
  let loading = $state(false);
  let showModal = $state(false);
  let isEditing = $state(false);
  let submitting = $state(false);
  let supervisores = $state<any[]>([]);

  // --- Formulario ---
  let form = $state({
    id: null as number | null,
    fecha: new Date().toISOString().split("T")[0],
    trabajo: "",
    estado: "en espera",
    fecha_inscripcion: new Date().toISOString().split("T")[0],
    fecha_inicio_trabajo: "",
    fecha_finalizacion: "",
    observacion_1: "",
    observacion_2: "",
    observacion_3: "",
    turno: "",
    supervisor_encargado: "",
    fotos: [] as File[],
  });

  let photoPreviews = $state<string[]>([]);

  // --- Carga de Datos ---
  async function loadTareas() {
    loading = true;
    try {
      const res = await api.get("/todo-list/");
      tareas = res.data.data;
    } catch (e) {
      console.error("Error al cargar actividades:", e);
    } finally {
      loading = false;
    }
  }

  async function loadSupervisores() {
    try {
      const res = await api.get("/administrativos/supervisores");
      supervisores = res.data.data;
    } catch (e) {
      console.error("Error al cargar supervisores:", e);
    }
  }

  onMount(() => {
    loadTareas();
    loadSupervisores();
  });

  // --- Acciones de Formulario ---
  function openCreate() {
    isEditing = false;
    resetForm();
    showModal = true;
  }

  function openEdit(tarea: any) {
    isEditing = true;
    form = {
      id: tarea.id,
      fecha: tarea.fecha,
      trabajo: tarea.trabajo,
      estado: tarea.estado,
      fecha_inscripcion: tarea.fecha_inscripcion,
      fecha_inicio_trabajo: tarea.fecha_inicio_trabajo || "",
      fecha_finalizacion: tarea.fecha_finalizacion || "",
      observacion_1: tarea.observacion_1 || "",
      observacion_2: tarea.observacion_2 || "",
      observacion_3: tarea.observacion_3 || "",
      turno: tarea.turno || "",
      supervisor_encargado: tarea.supervisor_encargado || "",
      fotos: [],
    };
    photoPreviews = [];
    showModal = true;
  }

  function resetForm() {
    form = {
      id: null,
      fecha: new Date().toISOString().split("T")[0],
      trabajo: "",
      estado: "en espera",
      fecha_inscripcion: new Date().toISOString().split("T")[0],
      fecha_inicio_trabajo: "",
      fecha_finalizacion: "",
      observacion_1: "",
      observacion_2: "",
      observacion_3: "",
      turno: "",
      supervisor_encargado: "",
      fotos: [],
    };
    photoPreviews = [];
  }

  async function handleSubmit() {
    if (!form.trabajo) return alert("El nombre del trabajo es obligatorio");

    // Rol supervisor: Si está editando, solo puede cambiar el estado (según lógica de UI bloquearemos el resto)
    submitting = true;
    try {
      if (isEditing) {
        // PATCH para actualización parcial (más eficiente)
        const updateData: any = {
          estado: form.estado,
        };

        // Solo enviamos el resto si es admin/coord
        if (authState.isAdminOrCoord) {
          updateData.fecha = form.fecha;
          updateData.trabajo = form.trabajo;
          updateData.fecha_inscripcion = form.fecha_inscripcion;
          updateData.fecha_inicio_trabajo = form.fecha_inicio_trabajo || null;
          updateData.fecha_finalizacion = form.fecha_finalizacion || null;
          updateData.observacion_1 = form.observacion_1;
          updateData.observacion_2 = form.observacion_2;
          updateData.observacion_3 = form.observacion_3;
          updateData.turno = form.turno;
          updateData.supervisor_encargado = form.supervisor_encargado;
        }

        await api.patch(`/todo-list/${form.id}`, updateData);
      } else {
        // POST mediante Form Data para manejar imágenes
        const formData = new FormData();
        formData.append("fecha", form.fecha);
        formData.append("trabajo", form.trabajo);
        formData.append("estado", form.estado);
        formData.append("fecha_inscripcion", form.fecha_inscripcion);
        if (form.fecha_inicio_trabajo)
          formData.append("fecha_inicio_trabajo", form.fecha_inicio_trabajo);
        if (form.fecha_finalizacion)
          formData.append("fecha_finalizacion", form.fecha_finalizacion);
        formData.append("observacion_1", form.observacion_1);
        formData.append("observacion_2", form.observacion_2);
        formData.append("observacion_3", form.observacion_3);
        if (form.turno) formData.append("turno", form.turno);
        if (form.supervisor_encargado) formData.append("supervisor_encargado", form.supervisor_encargado);

        form.fotos.forEach((f) => formData.append("fotos", f));

        await api.post("/todo-list/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      showModal = false;
      loadTareas();
    } catch (e) {
      console.error("Error al guardar:", e);
      alert("Error al procesar la solicitud.");
    } finally {
      submitting = false;
    }
  }

  async function eliminarTarea(id: number) {
    if (!confirm("¿Eliminar esta actividad?")) return;
    try {
      await api.delete(`/todo-list/${id}`);
      loadTareas();
    } catch (e) {
      alert("No se pudo eliminar.");
    }
  }

  function handleFileChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files) {
      const files = Array.from(target.files);
      if (form.fotos.length + files.length > 3) return alert("Máximo 3 fotos");

      form.fotos = [...form.fotos, ...files];
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result)
            photoPreviews = [...photoPreviews, e.target.result as string];
        };
        reader.readAsDataURL(file);
      });
    }
  }

  // --- Helpers de Estilo ---
  function getStatusClass(status: string) {
    switch (status) {
      case "completado":
        return "bg-green-100 text-green-700 ring-green-600/20";
      case "pausado":
        return "bg-amber-100 text-amber-700 ring-amber-600/20";
      default:
        return "bg-gray-100 text-gray-700 ring-gray-600/20";
    }
  }
</script>

<div class="px-4 py-8 sm:px-6 lg:px-8">
  <!-- Header -->
  <div class="sm:flex sm:items-center">
    <div class="sm:flex-auto">
      <h1 class="text-2xl font-bold leading-6 text-gray-900">
        Actividades de Mantenimiento
      </h1>
      <p class="mt-2 text-sm text-gray-700">
        Lista detallada de tareas diarias, seguimiento de estados y evidencias
        de trabajo.
      </p>
    </div>
    <div class="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
      <button
        type="button"
        onclick={openCreate}
        class="block rounded-md bg-blue-600 px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
      >
        <Plus class="inline-block mr-1 h-4 w-4" /> Nueva Actividad
      </button>
    </div>
  </div>

  <!-- Tabla -->
  <div class="mt-8 flow-root transition-all">
    <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
      <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
        <div
          class="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg"
        >
          <table class="min-w-full divide-y divide-gray-300 bg-white">
            <thead class="bg-gray-50">
              <tr>
                <th
                  class="py-3.5 pl-4 pr-3 text-left text-sm font-bold text-gray-900 sm:pl-6"
                  >#</th
                >
                <th
                  class="px-3 py-3.5 text-left text-sm font-bold text-gray-900"
                  >Inscripción</th
                >
                <th
                  class="px-3 py-3.5 text-left text-sm font-bold text-gray-900"
                  >Inicio / Fin Labores</th
                >
                <th
                  class="px-3 py-3.5 text-left text-sm font-bold text-gray-900"
                  >Trabajo</th
                >
                <th
                  class="px-3 py-3.5 text-left text-sm font-bold text-gray-900"
                  >Turno / Supervisor</th
                >
                <th
                  class="px-3 py-3.5 text-left text-sm font-bold text-gray-900"
                  >Estado</th
                >
                <th
                  class="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right font-bold text-sm text-gray-900"
                  >Acciones</th
                >
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#if loading}
                <tr>
                  <td colspan="7" class="py-10 text-center text-gray-500">
                    <Loader2 class="inline-block animate-spin mr-2" /> Cargando actividades...
                  </td>
                </tr>
              {:else if tareas.length === 0}
                <tr>
                  <td colspan="7" class="py-10 text-center text-gray-500 italic"
                    >No hay actividades registradas.</td
                  >
                </tr>
              {:else}
                {#each tareas as tarea, i}
                  <tr class="hover:bg-gray-50 transition-colors">
                    <td
                      class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6"
                      >{i + 1}</td
                    >
                    <td
                      class="whitespace-nowrap px-3 py-4 text-sm text-gray-500 font-medium"
                    >
                      {tarea.fecha_inscripcion}
                    </td>
                    <td
                      class="px-3 py-4 text-sm text-gray-500 whitespace-nowrap"
                    >
                      <div class="flex flex-col">
                        <span class="flex items-center gap-1 text-xs"
                          ><Clock size={12} class="text-blue-500" />
                          {tarea.fecha_inicio_trabajo || "---"}</span
                        >
                        <span class="flex items-center gap-1 text-xs"
                          ><CheckCircle2 size={12} class="text-green-500" />
                          {tarea.fecha_finalizacion || "---"}</span
                        >
                      </div>
                    </td>
                    <td
                      class="px-3 py-4 text-sm text-gray-900 max-w-xs truncate font-semibold"
                      title={tarea.trabajo}
                    >
                      {tarea.trabajo}
                    </td>
                    <td class="px-3 py-4 text-sm text-gray-500">
                      <div class="flex flex-col">
                        <span class="font-medium text-gray-900">{tarea.turno || "N/A"}</span>
                        <span class="text-xs text-blue-600">{tarea.supervisor_encargado || "No asignado"}</span>
                      </div>
                    </td>
                    <td class="whitespace-nowrap px-3 py-4 text-sm">
                      <span
                        class={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${getStatusClass(tarea.estado)}`}
                      >
                        {#if tarea.estado === "completado"}
                          <CheckCircle2 class="mr-1 h-3 w-3" />
                        {:else if tarea.estado === "pausado"}
                          <PauseCircle class="mr-1 h-3 w-3" />
                        {:else}
                          <Clock class="mr-1 h-3 w-3" />
                        {/if}
                        {tarea.estado}
                      </span>
                    </td>
                    <td
                      class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6"
                    >
                      <div class="flex justify-end gap-2">
                        <button
                          onclick={() => openEdit(tarea)}
                          class="text-blue-600 hover:text-blue-900 bg-blue-50 p-1.5 rounded-md transition-colors"
                          title="Modificar"
                        >
                          <Edit class="h-4 w-4" />
                        </button>
                        {#if authState.isAdminOrCoord}
                          <button
                            onclick={() => eliminarTarea(tarea.id)}
                            class="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-md transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 class="h-4 w-4" />
                          </button>
                        {/if}
                      </div>
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

  <!-- Modal -->
  {#if showModal}
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        class="fixed inset-0 bg-gray-500 bg-opacity-75"
        onclick={() => (showModal = false)}
      ></div>

      <div
        class="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-2xl transition-all flex flex-col max-h-[90vh]"
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between px-6 py-4 border-b border-gray-100"
        >
          <h3 class="text-xl font-bold text-gray-900">
            {isEditing ? "Gestionar Actividad" : "Nueva Actividad"}
          </h3>
          <button
            onclick={() => (showModal = false)}
            class="text-gray-400 hover:text-gray-500"
          >
            <X class="h-6 w-6" />
          </button>
        </div>

        <!-- Body -->
        <div class="flex-1 px-6 py-4 overflow-y-auto space-y-5 bg-gray-50/50">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <!-- Solo Admin/Coord pueden cambiar fechas base -->
            <div
              class={!authState.isAdminOrCoord && isEditing
                ? "opacity-60 pointer-events-none"
                : ""}
            >
              <label class="block text-sm font-bold text-gray-700 mb-1"
                >Fecha de la Tarea</label
              >
              <input
                type="date"
                bind:value={form.fecha}
                class="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div
              class={!authState.isAdminOrCoord && isEditing
                ? "opacity-60 pointer-events-none"
                : ""}
            >
              <label
                class="block text-sm font-bold text-gray-700 mb-1 text-blue-600"
                >Fecha Inscripción (Lista)</label
              >
              <input
                type="date"
                bind:value={form.fecha_inscripcion}
                class="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <!-- Turno y Supervisor -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class={!authState.isAdminOrCoord && isEditing ? "opacity-60 pointer-events-none" : ""}>
              <label class="block text-sm font-bold text-gray-700 mb-1">Turno</label>
              <select bind:value={form.turno} class="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option value="">Seleccione un turno</option>
                <option value="Diurno">Diurno</option>
                <option value="Nocturno">Nocturno</option>
              </select>
            </div>
            <div class={!authState.isAdminOrCoord && isEditing ? "opacity-60 pointer-events-none" : ""}>
              <label class="block text-sm font-bold text-gray-700 mb-1">Supervisor Encargado</label>
              <select bind:value={form.supervisor_encargado} class="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option value="">Seleccione supervisor</option>
                {#each supervisores as sup}
                  <option value={sup.nombre + ' ' + sup.apellido}>{sup.nombre} {sup.apellido}</option>
                {/each}
              </select>
            </div>
          </div>

          <div
            class={!authState.isAdminOrCoord && isEditing
              ? "opacity-60 pointer-events-none"
              : ""}
          >
            <label class="block text-sm font-bold text-gray-700 mb-1"
              >Nombre del Trabajo / Actividad</label
            >
            <textarea
              bind:value={form.trabajo}
              rows="3"
              class="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Ej: Mantenimiento preventivo al compresor de aire..."
            ></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1"
                >Estado Actual</label
              >
              <select
                bind:value={form.estado}
                class="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 capitalize"
              >
                <option value="en espera">En espera</option>
                <option value="pausado">Pausado</option>
                <option value="completado">Completado</option>
              </select>
            </div>

            <div
              class={!authState.isAdminOrCoord && isEditing
                ? "opacity-60 pointer-events-none"
                : ""}
            >
              <label
                class="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1"
                ><Calendar size={14} class="text-blue-500" /> Fecha Inicio</label
              >
              <input
                type="date"
                bind:value={form.fecha_inicio_trabajo}
                class="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div
              class={!authState.isAdminOrCoord && isEditing
                ? "opacity-60 pointer-events-none"
                : ""}
            >
              <label
                class="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1"
                ><Calendar size={14} class="text-green-500" /> Fecha Fin</label
              >
              <input
                type="date"
                bind:value={form.fecha_finalizacion}
                class="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div
            class={`grid grid-cols-1 gap-4 ${!authState.isAdminOrCoord && isEditing ? "opacity-60 pointer-events-none" : ""}`}
          >
            <div>
              <label class="block text-sm font-bold text-gray-700 mb-1"
                >Observaciones</label
              >
              <div class="space-y-2">
                <input
                  type="text"
                  bind:value={form.observacion_1}
                  placeholder="Observación 1"
                  class="w-full text-xs rounded-md border-gray-300 py-1"
                />
                <input
                  type="text"
                  bind:value={form.observacion_2}
                  placeholder="Observación 2"
                  class="w-full text-xs rounded-md border-gray-300 py-1"
                />
                <input
                  type="text"
                  bind:value={form.observacion_3}
                  placeholder="Observación 3"
                  class="w-full text-xs rounded-md border-gray-300 py-1"
                />
              </div>
            </div>
          </div>

          {#if !isEditing}
            <div class="space-y-2">
              <label class="block text-sm font-bold text-gray-700"
                >Evidencias Fotográficas (Máx 3)</label
              >
              <div
                class="mt-2 flex justify-center rounded-lg border border-dashed border-gray-300 px-6 py-4 bg-white hover:bg-gray-50 transition-colors cursor-pointer relative"
              >
                <div class="text-center">
                  <ImageIcon class="mx-auto h-10 w-10 text-gray-300" />
                  <div class="mt-2 flex text-sm text-gray-600">
                    <label
                      class="relative cursor-pointer rounded-md font-semibold text-blue-600 hover:text-blue-500"
                    >
                      <span>Seleccionar archivos</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        class="sr-only"
                        onchange={handleFileChange}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {#if photoPreviews.length > 0}
                <div class="grid grid-cols-3 gap-2 py-2">
                  {#each photoPreviews as preview, i}
                    <div
                      class="relative h-20 bg-gray-100 rounded-md overflow-hidden border"
                    >
                      <img
                        src={preview}
                        alt="Preview"
                        class="h-full w-full object-cover"
                      />
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Footer -->
        <div class="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t">
          <button
            onclick={() => (showModal = false)}
            class="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onclick={handleSubmit}
            disabled={submitting}
            class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 flex items-center"
          >
            {#if submitting}
              <Loader2 size={16} class="animate-spin mr-2" /> Procesando...
            {:else}
              <Save size={16} class="mr-2" />
              {isEditing ? "Guardar Cambios" : "Crear Actividad"}
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
