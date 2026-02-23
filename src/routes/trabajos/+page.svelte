<script lang="ts">
  import api from "$lib/api";
  import { onMount } from "svelte";
  import {
    Plus,
    Search,
    Image as ImageIcon,
    FileText,
    X,
    Download,
    Calendar,
    MapPin,
    Wrench,
    Loader2,
    Pencil,
    Trash2,
  } from "lucide-svelte";
  import { authState } from "$lib/state/auth.svelte";

  let trabajos = $state<any[]>([]);
  let loading = $state(false);
  let selectedJob = $state<any>(null); // Trabajo seleccionado para el modal
  let downloading = $state(false);

  // Cargar datos
  async function loadTrabajos() {
    loading = true;
    try {
      const res = await api.get("/trabajos-diarios/");
      trabajos = res.data.data;
    } catch (e) {
      console.error("Error cargando trabajos", e);
    } finally {
      loading = false;
    }
  }

  // Filtrado simple (cliente)
  let searchTerm = $state("");
  let filteredTrabajos = $derived(
    trabajos.filter(
      (t) =>
        t.sitio_trabajo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.maquinaria_trabajada || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        t.trabajo_realizado.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );

  // Helpers
  function getImageUrl(fullPath: string) {
    if (!fullPath) return "";

    // Si la ruta ya es una URL completa (como las de Cloudinary), la devolvemos directamente
    if (fullPath.startsWith("http://") || fullPath.startsWith("https://")) {
      return fullPath;
    }

    // Para compatibilidad con imágenes antiguas almacenadas localmente
    const filename = fullPath.split("/").pop();
    return `http://localhost:8000/uploads/trabajos_diarios/${filename}`;
  }

  function getPhotos(job: any) {
    const photos = [];
    for (let i = 1; i <= 8; i++) {
      if (job[`foto_${i}`]) photos.push(job[`foto_${i}`]);
    }
    return photos;
  }

  function openModal(job: any) {
    selectedJob = job;
  }

  function closeModal() {
    selectedJob = null;
  }

  // Descargar Word
  async function downloadWord(job: any) {
    try {
      downloading = true;
      // Endpoint POST para generar word
      const response = await api.post(
        `/trabajos-diarios/reportes/word/${job.id}`,
        {},
        {
          responseType: "blob",
        },
      );

      // Crear link de descarga
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      // Intenta obtener nombre del header o usa uno por defecto
      const contentDisposition = response.headers["content-disposition"];
      let fileName = `Reporte_${job.fecha}.docx`;
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (fileNameMatch.length === 2) fileName = fileNameMatch[1];
      }

      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("Error descargando reporte", e);
      alert("Error al descargar el reporte Word.");
    } finally {
      downloading = false;
    }
  }

  // Estado para Crear/Editar Trabajo
  let showCreateModal = $state(false);
  let isEditing = $state(false);
  let editingId = $state<number | null>(null);
  let submitting = $state(false);
  let newWork = $state({
    fecha: new Date().toISOString().split("T")[0],
    sitio_trabajo: "",
    maquinaria_trabajada: "",
    trabajo_realizado: "",
    fotos: [] as File[],
  });
  let photoPreviews = $state<string[]>([]);

  function openCreate() {
    isEditing = false;
    editingId = null;
    newWork = {
      fecha: new Date().toISOString().split("T")[0],
      sitio_trabajo: "",
      maquinaria_trabajada: "",
      trabajo_realizado: "",
      fotos: [],
    };
    photoPreviews = [];
    showCreateModal = true;
  }

  function openEdit(trabajo: any) {
    isEditing = true;
    editingId = trabajo.id;
    newWork = {
      fecha: trabajo.fecha,
      sitio_trabajo: trabajo.sitio_trabajo,
      maquinaria_trabajada: trabajo.maquinaria_trabajada || "",
      trabajo_realizado: trabajo.trabajo_realizado,
      fotos: [], // No editamos fotos por ahora vía JSON
    };
    photoPreviews = [];
    showCreateModal = true;
  }

  async function deleteTrabajo(id: number) {
    if (
      !confirm(
        "¿Está seguro de eliminar este registro? Esta acción no se puede deshacer.",
      )
    )
      return;
    try {
      await api.delete(`/trabajos-diarios/${id}`);
      loadTrabajos();
    } catch (e) {
      alert("Error al eliminar el trabajo.");
    }
  }

  function handleFileChange(e: Event) {
    if (isEditing) {
      alert(
        "La edición de fotos no está disponible en este momento. Solo puede editar los datos del reporte.",
      );
      return;
    }
    const target = e.target as HTMLInputElement;
    if (target.files) {
      const files = Array.from(target.files);
      if (newWork.fotos.length + files.length > 8) {
        alert("Solo se permiten hasta 8 fotos.");
        return;
      }
      newWork.fotos = [...newWork.fotos, ...files];

      // Generar previews
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

  function removePhoto(index: number) {
    newWork.fotos = newWork.fotos.filter((_, i) => i !== index);
    photoPreviews = photoPreviews.filter((_, i) => i !== index);
  }

  async function handleCreate() {
    if (!newWork.sitio_trabajo || !newWork.trabajo_realizado) {
      alert("Por favor rellene los campos obligatorios.");
      return;
    }

    submitting = true;
    try {
      if (isEditing && editingId) {
        await api.put(`/trabajos-diarios/${editingId}`, {
          fecha: newWork.fecha,
          sitio_trabajo: newWork.sitio_trabajo,
          maquinaria_trabajada: newWork.maquinaria_trabajada,
          trabajo_realizado: newWork.trabajo_realizado,
        });
      } else {
        const formData = new FormData();
        formData.append("fecha", newWork.fecha);
        formData.append("sitio_trabajo", newWork.sitio_trabajo);
        formData.append("maquinaria_trabajada", newWork.maquinaria_trabajada);
        formData.append("trabajo_realizado", newWork.trabajo_realizado);

        newWork.fotos.forEach((foto) => {
          formData.append("fotos", foto);
        });

        await api.post("/trabajos-diarios/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      showCreateModal = false;
      loadTrabajos();
    } catch (e) {
      console.error("Error guardando trabajo", e);
      alert("Error al guardar el trabajo.");
    } finally {
      submitting = false;
    }
  }

  onMount(loadTrabajos);
</script>

<div class="px-4 py-6 sm:px-6 relative">
  <!-- Header -->
  <div class="sm:flex sm:items-center sm:justify-between">
    <div>
      <h1
        class="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight"
      >
        Trabajos Diarios
      </h1>
      <p class="mt-2 text-sm text-gray-500">
        Registro de mantenimientos y labores con evidencia fotográfica.
      </p>
    </div>
    <div class="mt-4 sm:ml-4 sm:mt-0">
      <button
        type="button"
        onclick={openCreate}
        class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <Plus class="mr-1.5 h-5 w-5" />
        Nuevo Trabajo
      </button>
    </div>
  </div>

  <!-- Filtros -->
  <div class="mt-6 flex gap-x-4">
    <div class="relative flex-grow max-w-md">
      <div
        class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
      >
        <Search class="h-5 w-5 text-gray-400" aria-hidden="true" />
      </div>
      <input
        type="text"
        bind:value={searchTerm}
        class="block w-full rounded-md border-0 py-1.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
        placeholder="Buscar por sitio, maquinaria o descripción..."
      />
    </div>
  </div>

  <!-- Grid -->
  <div class="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    {#if loading}
      <div class="col-span-full py-12 text-center text-gray-500">
        Cargando registros...
      </div>
    {:else if filteredTrabajos.length === 0}
      <div
        class="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-lg dashed border border-gray-200"
      >
        No se encontraron trabajos.
      </div>
    {:else}
      {#each filteredTrabajos as trabajo}
        <div
          class="overflow-hidden bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow flex flex-col h-full"
        >
          <div class="p-5 flex-1">
            <div class="flex items-center justify-between mb-2">
              <span
                class="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10"
              >
                {trabajo.fecha}
              </span>
              {#if getPhotos(trabajo).length > 0}
                <div
                  class="flex items-center text-gray-400"
                  title="Contiene fotos"
                >
                  <ImageIcon size={16} />
                  <span class="text-xs ml-1">{getPhotos(trabajo).length}</span>
                </div>
              {/if}
            </div>

            <h3 class="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
              {trabajo.sitio_trabajo}
            </h3>
            <p class="text-sm text-gray-500 mb-3 flex items-center gap-1">
              <Wrench size={14} />
              {trabajo.maquinaria_trabajada || "Sin maquinaria"}
            </p>
            <p class="text-sm text-gray-600 line-clamp-3 mb-4">
              {trabajo.trabajo_realizado}
            </p>
          </div>

          <div
            class="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-2"
          >
            <div class="flex gap-2">
              <button
                onclick={() => downloadWord(trabajo)}
                class="text-gray-600 hover:text-blue-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                title="Descargar Word"
              >
                <FileText size={18} />
              </button>
              {#if authState.isAdminOrCoord}
                <button
                  onclick={() => openEdit(trabajo)}
                  class="text-gray-600 hover:text-green-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  title="Editar"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onclick={() => deleteTrabajo(trabajo.id)}
                  class="text-gray-600 hover:text-red-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={18} />
                </button>
              {/if}
            </div>
            <button
              onclick={() => openModal(trabajo)}
              class="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Ver detalle
            </button>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- MODAL DETALLE -->
  {#if selectedJob}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onclick={closeModal}
      ></div>

      <!-- Modal Panel -->
      <div
        class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col"
      >
        <!-- Header Modal -->
        <div
          class="bg-gray-50 px-4 py-3 sm:px-6 border-b border-gray-200 flex items-center justify-between"
        >
          <h3
            class="text-lg font-semibold leading-6 text-gray-900"
            id="modal-title"
          >
            Detalle del Trabajo
          </h3>
          <button
            type="button"
            class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
            onclick={closeModal}
          >
            <span class="sr-only">Cerrar</span>
            <X class="h-6 w-6" />
          </button>
        </div>

        <!-- Content Scrollable -->
        <div class="px-4 py-5 sm:p-6 overflow-y-auto">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div class="flex items-start gap-3">
              <div class="bg-blue-100 p-2 rounded-lg text-blue-600">
                <Calendar size={20} />
              </div>
              <div>
                <p class="text-xs text-gray-500 font-medium uppercase">Fecha</p>
                <p class="font-semibold text-gray-900">{selectedJob.fecha}</p>
              </div>
            </div>
            <div class="flex items-start gap-3">
              <div class="bg-blue-100 p-2 rounded-lg text-blue-600">
                <MapPin size={20} />
              </div>
              <div>
                <p class="text-xs text-gray-500 font-medium uppercase">Sitio</p>
                <p class="font-semibold text-gray-900">
                  {selectedJob.sitio_trabajo}
                </p>
              </div>
            </div>
            <div class="flex items-start gap-3 sm:col-span-2">
              <div class="bg-blue-100 p-2 rounded-lg text-blue-600">
                <Wrench size={20} />
              </div>
              <div>
                <p class="text-xs text-gray-500 font-medium uppercase">
                  Maquinaria
                </p>
                <p class="font-semibold text-gray-900">
                  {selectedJob.maquinaria_trabajada || "N/A"}
                </p>
              </div>
            </div>
          </div>

          <div class="mb-6">
            <h4 class="text-sm font-medium text-gray-900 mb-2">
              Trabajo Realizado
            </h4>
            <div
              class="bg-gray-50 p-4 rounded-md text-sm text-gray-700 whitespace-pre-wrap border border-gray-200"
            >
              {selectedJob.trabajo_realizado}
            </div>
          </div>

          <!-- Galería -->
          {#if getPhotos(selectedJob).length > 0}
            <div class="mb-4">
              <h4
                class="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2"
              >
                <ImageIcon size={16} /> Evidencia Fotográfica
              </h4>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {#each getPhotos(selectedJob) as photoPath}
                  <a
                    href={getImageUrl(photoPath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="group relative block aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200"
                  >
                    <img
                      src={getImageUrl(photoPath)}
                      alt="Evidencia"
                      class="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div
                      class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"
                    ></div>
                  </a>
                {/each}
              </div>
            </div>
          {/if}
        </div>

        <!-- Footer Modal -->
        <div
          class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 gap-2"
        >
          <button
            type="button"
            class="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:w-auto"
            onclick={() => downloadWord(selectedJob)}
            disabled={downloading}
          >
            {#if downloading}
              Descargando...
            {:else}
              <Download class="mr-1.5 h-4 w-4" /> Descargar Word
            {/if}
          </button>
          <button
            type="button"
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
            onclick={closeModal}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- MODAL NUEVO TRABAJO -->
  {#if showCreateModal}
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onclick={() => (showCreateModal = false)}
      ></div>

      <div
        class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:w-full sm:max-w-2xl max-h-[90vh] flex flex-col"
      >
        <div
          class="bg-gray-50 px-4 py-3 sm:px-6 border-b border-gray-200 flex items-center justify-between"
        >
          <h3 class="text-lg font-semibold leading-6 text-gray-900">
            {isEditing ? "Editar Trabajo" : "Registrar Nuevo Trabajo"}
          </h3>
          <button
            type="button"
            class="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
            onclick={() => (showCreateModal = false)}
          >
            <X class="h-6 w-6" />
          </button>
        </div>

        <div class="px-4 py-5 sm:p-6 overflow-y-auto">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label
                for="fecha"
                class="block text-sm font-medium leading-6 text-gray-900"
                >Fecha</label
              >
              <input
                type="date"
                id="fecha"
                bind:value={newWork.fecha}
                class="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
              />
            </div>
            <div>
              <label
                for="sitio"
                class="block text-sm font-medium leading-6 text-gray-900"
                >Sitio de Trabajo</label
              >
              <input
                type="text"
                id="sitio"
                bind:value={newWork.sitio_trabajo}
                placeholder="Ej. Planta de Purificación"
                class="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
              />
            </div>
          </div>

          <div class="mb-4">
            <label
              for="maquinaria"
              class="block text-sm font-medium leading-6 text-gray-900"
              >Maquinaria Trabajada</label
            >
            <input
              type="text"
              id="maquinaria"
              bind:value={newWork.maquinaria_trabajada}
              placeholder="Ej. Bomba de agua centrífuga"
              class="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            />
          </div>

          <div class="mb-4">
            <label
              for="descripcion"
              class="block text-sm font-medium leading-6 text-gray-900"
              >Trabajo Realizado</label
            >
            <textarea
              id="descripcion"
              rows="4"
              bind:value={newWork.trabajo_realizado}
              placeholder="Describa la labor realizada..."
              class="mt-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 px-3"
            ></textarea>
          </div>

          <!-- Fotos Upload (Solo en creación) -->
          {#if !isEditing}
            <div class="mb-4">
              <label class="block text-sm font-medium leading-6 text-gray-900"
                >Fotografías (Máx. 8)</label
              >
              <div
                class="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-4"
              >
                <div class="text-center">
                  <ImageIcon
                    class="mx-auto h-12 w-12 text-gray-300"
                    aria-hidden="true"
                  />
                  <div class="mt-4 flex text-sm leading-6 text-gray-600">
                    <label
                      for="file-upload"
                      class="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500"
                    >
                      <span>Subir archivos</span>
                      <input
                        id="file-upload"
                        name="file-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        class="sr-only"
                        onchange={handleFileChange}
                      />
                    </label>
                    <p class="pl-1">o arrastrar y soltar</p>
                  </div>
                  <p class="text-xs leading-5 text-gray-600">
                    PNG, JPG, GIF hasta 10MB
                  </p>
                </div>
              </div>

              <!-- Previews -->
              {#if photoPreviews.length > 0}
                <div class="mt-4 grid grid-cols-4 gap-2">
                  {#each photoPreviews as preview, i}
                    <div class="relative group aspect-square">
                      <img
                        src={preview}
                        alt="Preview"
                        class="h-full w-full object-cover rounded-md"
                      />
                      <button
                        type="button"
                        onclick={() => removePhoto(i)}
                        class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X class="h-3 w-3" />
                      </button>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <div
          class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 gap-2"
        >
          <button
            type="button"
            class="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 sm:w-auto"
            onclick={handleCreate}
            disabled={submitting}
          >
            {#if submitting}
              <Loader2 class="animate-spin -ml-1 mr-2 h-4 w-4" /> Guardando...
            {:else}
              Guardar Trabajo
            {/if}
          </button>
          <button
            type="button"
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
            onclick={() => (showCreateModal = false)}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
