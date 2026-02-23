<script lang="ts">
  import { onMount } from "svelte";
  import api from "$lib/api";
  import {
    FileSpreadsheet,
    FileText,
    Calendar,
    Loader2,
    Download,
    Plus,
    X,
    Image as ImageIcon,
    Edit,
  } from "lucide-svelte";
  import { authState } from "$lib/state/auth.svelte";

  // --- Estado ---
  let loading = $state(false);
  let error = $state<string | null>(null);

  // Fechas (Por defecto: Semana Actual Lunes a Domingo)
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Ajustar al Lunes
  const monday = new Date(today.setDate(diff));
  const sunday = new Date(today.setDate(diff + 6));

  let fechaDesde = $state(monday.toISOString().split("T")[0]);
  let fechaHasta = $state(sunday.toISOString().split("T")[0]);

  let empleados = $state<any[]>([]);
  let supervisores = $state<any[]>([]);

  // Modal State
  let showModal = $state(false);
  let showEditModal = $state(false);
  let editingEmpleado = $state<any>(null);

  let empleadosActivos = $state<any[]>([]);
  let selectedIds = $state<number[]>([]);
  let searchQueryModal = $state("");

  let submitting = $state(false);
  let submitMessage = $state<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Forms Data
  let formAsistencia = $state({
    fecha: new Date().toISOString().split("T")[0],
    estado: "Presente", // Presente, Falta, Vacaciones
    turno_id: 1, // 1: Mañana, 2: Tarde, 3: Noche
    observacion: "",
    he_diurnas: 0,
    he_nocturnas: 0,
    es_feriado: false,
  });

  function getDayLetter(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr + "T12:00:00Z");
    const days = ["D", "L", "M", "M", "J", "V", "S"];
    return days[d.getUTCDay()];
  }

  let filteredEmpleadosModal = $derived(
    empleadosActivos
      .filter((e) => {
        // Si es supervisor, no puede registrar asistencia a coordinadores
        if (authState.user?.role === "supervisor") {
          const cargo = (e.cargo || "").toLowerCase();
          if (cargo.includes("coordinador")) return false;
        }
        return true;
      })
      .filter((e) =>
        `${e.nombre} ${e.apellido} ${e.codigo}`
          .toLowerCase()
          .includes(searchQueryModal.toLowerCase()),
      ),
  );

  // --- Carga de Datos ---
  async function loadData() {
    try {
      loading = true;
      error = null;

      const response = await api.get("/asistencia/reporte-rango/general", {
        params: {
          fecha_desde: fechaDesde,
          fecha_hasta: fechaHasta,
        },
      });

      const todos = response.data.data;

      // Clasificar
      empleados = [];
      supervisores = [];

      todos.forEach((emp: any) => {
        const cargo = (emp.cargo || "").toUpperCase();
        if (
          cargo.includes("COORDINADOR") ||
          cargo.includes("SUPERVISOR") ||
          cargo.includes("DIRECTOR")
        ) {
          supervisores.push(emp);
        } else {
          empleados.push(emp);
        }
      });
    } catch (e: any) {
      console.error(e);
      error = e.response?.data?.detail || "Error al cargar reporte.";
    } finally {
      loading = false;
    }
  }

  async function loadEmpleadosList() {
    try {
      const res = await api.get("/empleados/activos");
      empleadosActivos = res.data.data;
    } catch (e) {
      console.error("Error cargando empleados activos", e);
    }
  }

  function openModal() {
    loadEmpleadosList();
    editingEmpleado = null;
    submitMessage = null;
    selectedIds = [];
    searchQueryModal = "";
    // Resetear campos adicionales de asistencia
    formAsistencia.he_diurnas = 0;
    formAsistencia.he_nocturnas = 0;
    formAsistencia.es_feriado = false;
    showModal = true;
  }

  function openEditModal(emp: any) {
    editingEmpleado = emp;
    selectedIds = [emp.empleado_id];
    submitMessage = null;
    showModal = true;
  }

  async function handleSubmit() {
    if (selectedIds.length === 0) {
      submitMessage = {
        type: "error",
        text: "Debe seleccionar al menos un empleado",
      };
      return;
    }

    submitting = true;
    submitMessage = null;
    try {
      const promises = selectedIds.map((id) =>
        api.post("/asistencia/", {
          empleado_id: id,
          fecha: formAsistencia.fecha,
          estado: formAsistencia.estado,
          turno_id: formAsistencia.turno_id,
          observacion: formAsistencia.observacion,
          he_diurnas: formAsistencia.he_diurnas,
          he_nocturnas: formAsistencia.he_nocturnas,
          es_feriado: formAsistencia.es_feriado,
        }),
      );

      await Promise.all(promises);

      submitMessage = {
        type: "success",
        text: `Novedad y asistencia registrada para ${selectedIds.length} empleados`,
      };

      // Limpiar selección después de éxito
      selectedIds = [];
      // Recargar datos fondo
      loadData();
    } catch (e: any) {
      submitMessage = {
        type: "error",
        text: e.response?.data?.detail || "Error al guardar",
      };
    } finally {
      submitting = false;
    }
  }

  // --- Exportación ---
  let selectedLogo = $state<File | null>(null);

  async function exportarExcel(
    tipo: "empleados" | "jefes" | "resumen_empleados" | "resumen_jefes",
  ) {
    let endpoint = "";
    if (tipo === "empleados") endpoint = "/reportes/reporte-excel/empleados";
    if (tipo === "jefes") endpoint = "/reportes/reporte-excel/jefes";
    if (tipo === "resumen_empleados")
      endpoint = "/reportes/reporte-excel/resumen-he/empleados";
    if (tipo === "resumen_jefes")
      endpoint = "/reportes/reporte-excel/resumen-he/jefes";

    try {
      const formData = new FormData();
      formData.append("fecha_desde", fechaDesde);
      formData.append("fecha_hasta", fechaHasta);
      if (selectedLogo) {
        formData.append("logo", selectedLogo);
      }

      const res = await api.post(endpoint, formData, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Reporte_${tipo}_${fechaDesde}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      alert("Error descargando reporte Excel");
    }
  }

  async function exportarPDF(
    tipo: "empleados" | "jefes" | "resumen_empleados" | "resumen_jefes",
  ) {
    let endpoint = "";
    if (tipo === "empleados") endpoint = "/pdf-reportes/reporte-pdf/empleados";
    if (tipo === "jefes") endpoint = "/pdf-reportes/reporte-pdf/jefes";
    if (tipo === "resumen_empleados")
      endpoint = "/pdf-reportes/reporte-pdf/resumen-he/empleados";
    if (tipo === "resumen_jefes")
      endpoint = "/pdf-reportes/reporte-pdf/resumen-he/jefes";

    try {
      const formData = new FormData();
      formData.append("fecha_desde", fechaDesde);
      formData.append("fecha_hasta", fechaHasta);
      if (selectedLogo) {
        formData.append("logo", selectedLogo);
      }

      const res = await api.post(endpoint, formData, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `Reporte_PDF_${tipo}_${fechaDesde}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error(e);
      alert("Error descargando reporte PDF. Verifique permisos o conexión.");
    }
  }

  onMount(loadData);
</script>

<div class="px-4 py-6 sm:px-6 space-y-8">
  <!-- Header y Filtros -->
  <div
    class="sm:flex sm:items-center sm:justify-between border-b border-gray-200 pb-4"
  >
    <div>
      <h1 class="text-2xl font-bold leading-7 text-gray-900">
        Reporte de Asistencia Semanal
      </h1>
      <p class="mt-1 text-sm text-gray-500">
        Visualización detallada de horas y asistencia por rango de fechas.
      </p>
    </div>
    <div class="mt-4 sm:ml-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
      <div class="flex items-center gap-2">
        <label for="desde" class="text-sm font-medium text-gray-700"
          >Desde:</label
        >
        <input
          type="date"
          id="desde"
          bind:value={fechaDesde}
          class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>
      <div class="flex items-center gap-2">
        <label for="hasta" class="text-sm font-medium text-gray-700"
          >Hasta:</label
        >
        <input
          type="date"
          id="hasta"
          bind:value={fechaHasta}
          class="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>
      <div class="flex items-center gap-2">
        <label
          for="logo-upload"
          class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 cursor-pointer"
        >
          <ImageIcon class="mr-1.5 h-4 w-4 text-gray-400" />
          {selectedLogo ? "Logo Seleccionado" : "Añadir Logo"}
        </label>
        <input
          id="logo-upload"
          type="file"
          accept="image/*"
          class="sr-only"
          onchange={(e) => {
            const files = e.currentTarget.files;
            if (files && files[0]) selectedLogo = files[0];
          }}
        />
        {#if selectedLogo}
          <button
            onclick={() => (selectedLogo = null)}
            class="text-xs text-red-600 hover:text-red-800"
          >
            Quitar
          </button>
        {/if}
      </div>
      <button
        onclick={openModal}
        class="inline-flex items-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
      >
        <Plus class="mr-1.5 h-4 w-4" />
        Registrar
      </button>

      <button
        onclick={loadData}
        class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
        disabled={loading}
      >
        {#if loading}
          <Loader2 class="animate-spin mr-2 h-4 w-4" />
        {/if}
        Filtrar
      </button>
    </div>
  </div>

  {#if error}
    <div class="bg-red-50 p-4 rounded-md text-red-700">{error}</div>
  {/if}

  <!-- TABLA SUPERVISORES -->
  {#if supervisores.length > 0}
    <div
      class="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200"
    >
      <div
        class="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center"
      >
        <h3
          class="text-base font-semibold leading-6 text-gray-900 flex items-center gap-2"
        >
          <Calendar class="h-5 w-5 text-gray-500" /> Personal de Dirección y Supervisión
        </h3>
        <span
          class="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
          >{supervisores.length} Registros</span
        >
      </div>
      <!-- Desktop Table -->
      <div class="overflow-x-auto hidden md:block">
        <table class="min-w-full divide-y divide-gray-300 text-xs">
          <thead class="bg-gray-50">
            <tr>
              <th
                class="py-2 pl-3 text-left font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10 w-48"
                >Empleado</th
              >
              <th class="px-1 text-center font-semibold text-gray-900">COD</th>
              <!-- Días Dinámicos -->
              {#each supervisores[0]?.detalles || [] as dia}
                <th
                  class="px-1 text-center font-semibold text-gray-900 bg-blue-50/50 w-8"
                  >{getDayLetter(dia.fecha)}</th
                >
              {/each}
              <th
                class="px-1 text-center font-semibold text-gray-900 w-8 border-l border-gray-200"
                >H.E.D</th
              >
              <th class="px-1 text-center font-semibold text-gray-900 w-8"
                >H.E.N</th
              >
              <th
                class="px-1 text-center font-semibold text-gray-900 w-8 border-l border-gray-200"
                >Total</th
              >
              {#if authState.isAdminOrCoord}
                <th
                  class="px-2 text-center font-semibold text-gray-900 w-10 border-l border-gray-200"
                  >Acciones</th
                >
              {/if}
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 bg-white">
            {#each supervisores as emp}
              <tr class="hover:bg-gray-50">
                <td
                  class="py-2 pl-3 font-medium text-gray-900 sticky left-0 bg-white"
                  >{emp.nombre_completo}</td
                >
                <td class="px-1 text-center text-gray-500">{emp.codigo}</td>

                {#each emp.detalles as dia}
                  <td
                    class={`px-1 text-center border-l border-gray-100 ${dia.es_feriado ? "bg-yellow-50" : ""}`}
                  >
                    <div
                      class="flex flex-col items-center justify-center h-full space-y-0.5"
                    >
                      <!-- Estado asistencia -->
                      <span
                        class={`font-bold ${
                          dia.estado.includes("Presente")
                            ? "text-green-600"
                            : dia.estado.includes("Falta")
                              ? "text-red-600"
                              : dia.estado.includes("Vacaciones")
                                ? "text-orange-500"
                                : dia.es_feriado
                                  ? "text-yellow-600"
                                  : "text-gray-300"
                        }`}
                      >
                        {dia.estado.includes("Presente")
                          ? "X"
                          : dia.estado.includes("Falta")
                            ? "PVC"
                            : dia.estado.includes("Vacaciones")
                              ? "V"
                              : dia.es_feriado
                                ? "F"
                                : "•"}
                      </span>
                      <!-- Horas Extras (Pequeño) -->
                      {#if dia.horas_extras_diurnas > 0 || dia.horas_extras_nocturnas > 0}
                        <span class="text-[10px] text-blue-600 font-medium">
                          {dia.horas_extras_diurnas > 0
                            ? `D${dia.horas_extras_diurnas}`
                            : ""}
                          {dia.horas_extras_nocturnas > 0
                            ? `N${dia.horas_extras_nocturnas}`
                            : ""}
                        </span>
                      {/if}
                    </div>
                  </td>
                {/each}
                <!-- Totales -->
                <td class="px-1 text-center font-medium bg-gray-50 border-l"
                  >{emp.total_horas_extras_diurnas ?? 0}</td
                >
                <td class="px-1 text-center font-medium bg-gray-50"
                  >{emp.total_horas_extras_nocturnas ?? 0}</td
                >
                <td class="px-1 text-center font-bold bg-blue-50 border-l"
                  >{emp.total_horas_extras_global ?? 0}</td
                >
                {#if authState.isAdminOrCoord}
                  <td class="px-2 text-center border-l border-gray-100">
                    <button
                      onclick={() => openEditModal(emp)}
                      class="text-blue-600 hover:text-blue-800 transition"
                      title="Editar Asistencia"
                    >
                      <Edit class="h-4 w-4" />
                    </button>
                  </td>
                {/if}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards -->
      <div class="md:hidden divide-y divide-gray-200">
        {#each supervisores as emp}
          <div class="p-4 bg-white">
            <div class="flex justify-between items-start mb-2">
              <div class="flex flex-col">
                <span class="font-bold text-gray-900 text-sm"
                  >{emp.nombre_completo}</span
                >
                <span class="text-xs text-gray-500">{emp.codigo}</span>
              </div>
              <div class="flex items-center gap-2">
                {#if authState.isAdminOrCoord}
                  <button
                    onclick={() => openEditModal(emp)}
                    class="p-1.5 text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition"
                  >
                    <Edit size={14} />
                  </button>
                {/if}
                <span
                  class="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded"
                >
                  HE: {emp.total_horas_extras_global}
                </span>
              </div>
            </div>

            <!-- Grid Dias -->
            <div
              class="grid gap-1 mb-2 border-t border-b border-gray-100 py-2 text-center"
              style="grid-template-columns: repeat({emp.detalles.length ||
                7}, minmax(0, 1fr));"
            >
              {#each emp.detalles as d}
                <div class="text-[10px] text-gray-400 font-bold">
                  {getDayLetter(d.fecha)}
                </div>
              {/each}
              {#each emp.detalles as dia}
                <div class="flex flex-col items-center justify-start h-8">
                  <span
                    class={`text-xs font-bold leading-none ${
                      dia.estado.includes("Presente")
                        ? "text-green-600"
                        : dia.estado.includes("Falta")
                          ? "text-red-600"
                          : "text-gray-400"
                    }`}
                  >
                    {dia.estado.includes("Presente")
                      ? "X"
                      : dia.estado.includes("Falta")
                        ? "PVC"
                        : "•"}
                  </span>
                  {#if dia.horas_extras_diurnas > 0 || dia.horas_extras_nocturnas > 0}
                    <span
                      class="text-[9px] text-blue-600 leading-none mt-0.5 scale-90"
                    >
                      {dia.horas_extras_diurnas > 0
                        ? "D" + dia.horas_extras_diurnas
                        : ""}
                      {dia.horas_extras_nocturnas > 0
                        ? "N" + dia.horas_extras_nocturnas
                        : ""}
                    </span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- TABLA EMPLEADOS -->
  <div
    class="bg-white shadow sm:rounded-lg overflow-hidden border border-gray-200"
  >
    <div
      class="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center"
    >
      <h3
        class="text-base font-semibold leading-6 text-gray-900 flex items-center gap-2"
      >
        <Calendar class="h-5 w-5 text-gray-500" /> Personal Operativo
      </h3>
      <span
        class="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded-full text-center min-w-12"
      >
        {empleados.length}
      </span>
    </div>
    <!-- Desktop Table -->
    <div class="overflow-x-auto hidden md:block">
      <table class="min-w-full divide-y divide-gray-300 text-xs">
        <thead class="bg-gray-50">
          <tr>
            <th
              class="py-2 pl-3 text-left font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10 w-48"
              >Empleado</th
            >
            <th class="px-1 text-center font-semibold text-gray-900">COD</th>
            <!-- Días -->
            {#each empleados[0]?.detalles || [] as dia}
              <th
                class="px-1 text-center font-semibold text-gray-900 bg-green-50/50 w-8"
                >{getDayLetter(dia.fecha)}</th
              >
            {/each}
            <th
              class="px-1 text-center font-semibold text-gray-900 w-8 border-l border-gray-200"
              >H.E.D</th
            >
            <th class="px-1 text-center font-semibold text-gray-900 w-8"
              >H.E.N</th
            >
            <th
              class="px-1 text-center font-semibold text-gray-900 w-8 border-l border-gray-200"
              >Total</th
            >
            {#if authState.isAdminOrCoord}
              <th
                class="px-2 text-center font-semibold text-gray-900 w-10 border-l border-gray-200"
                >Acciones</th
              >
            {/if}
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white">
          {#if loading && empleados.length === 0}
            <tr><td colspan="12" class="py-4 text-center">Cargando...</td></tr>
          {:else}
            {#each empleados as emp}
              <tr class="hover:bg-gray-50">
                <td
                  class="py-2 pl-3 font-medium text-gray-900 sticky left-0 bg-white"
                  >{emp.nombre_completo}</td
                >
                <td class="px-1 text-center text-gray-500">{emp.codigo}</td>

                {#each emp.detalles as dia}
                  <td
                    class={`px-1 text-center border-l border-gray-100 ${dia.es_feriado ? "bg-yellow-50" : ""}`}
                  >
                    <div
                      class="flex flex-col items-center justify-center h-full space-y-0.5"
                    >
                      <span
                        class={`font-bold ${
                          dia.estado.includes("Presente")
                            ? "text-green-600"
                            : dia.estado.includes("Falta")
                              ? "text-red-600"
                              : dia.estado.includes("Vacaciones")
                                ? "text-orange-500"
                                : dia.es_feriado
                                  ? "text-yellow-600"
                                  : "text-gray-300"
                        }`}
                      >
                        {dia.estado.includes("Presente")
                          ? "X"
                          : dia.estado.includes("Falta")
                            ? "PVC"
                            : dia.estado.includes("Vacaciones")
                              ? "V"
                              : dia.es_feriado
                                ? "F"
                                : "•"}
                      </span>
                      {#if dia.horas_extras_diurnas > 0 || dia.horas_extras_nocturnas > 0}
                        <span
                          class="text-[10px] text-blue-600 font-medium whitespace-nowrap"
                        >
                          {dia.horas_extras_diurnas > 0
                            ? `${dia.horas_extras_diurnas}D`
                            : ""}
                          {dia.horas_extras_nocturnas > 0
                            ? `${dia.horas_extras_nocturnas}N`
                            : ""}
                        </span>
                      {/if}
                    </div>
                  </td>
                {/each}
                <td class="px-1 text-center font-medium bg-gray-50 border-l"
                  >{emp.total_horas_extras_diurnas ?? 0}</td
                >
                <td class="px-1 text-center font-medium bg-gray-50"
                  >{emp.total_horas_extras_nocturnas ?? 0}</td
                >
                <td class="px-1 text-center font-bold bg-green-50 border-l"
                  >{emp.total_horas_extras_global ?? 0}</td
                >
                {#if authState.isAdminOrCoord}
                  <td class="px-2 text-center border-l border-gray-100">
                    <button
                      onclick={() => openEditModal(emp)}
                      class="text-blue-600 hover:text-blue-800 transition"
                      title="Editar Asistencia"
                    >
                      <Edit class="h-4 w-4" />
                    </button>
                  </td>
                {/if}
              </tr>
            {/each}
          {/if}
        </tbody>
      </table>
    </div>

    <!-- Mobile Cards (Empleados) -->
    <div class="md:hidden divide-y divide-gray-200">
      {#if loading && empleados.length === 0}
        <div class="p-4 text-center">Cargando...</div>
      {:else}
        {#each empleados as emp}
          <div class="p-4 bg-white">
            <!-- Card Header -->
            <div class="flex justify-between items-start mb-2">
              <div class="flex flex-col">
                <span class="font-bold text-gray-900 text-sm"
                  >{emp.nombre_completo}</span
                >
                <span class="text-xs text-gray-500">{emp.codigo}</span>
              </div>
              <div class="flex items-center gap-2">
                {#if authState.isAdminOrCoord}
                  <button
                    onclick={() => openEditModal(emp)}
                    class="p-1.5 text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition"
                  >
                    <Edit size={14} />
                  </button>
                {/if}
                <span
                  class="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded"
                >
                  HE: {emp.total_horas_extras_global}
                </span>
              </div>
            </div>

            <!-- Grid Dias -->
            <div
              class="grid gap-1 mb-2 border-t border-b border-gray-100 py-2 text-center"
              style="grid-template-columns: repeat({emp.detalles.length ||
                7}, minmax(0, 1fr));"
            >
              {#each emp.detalles as d}
                <div class="text-[10px] text-gray-400 font-bold">
                  {getDayLetter(d.fecha)}
                </div>
              {/each}
              {#each emp.detalles as dia}
                <div class="flex flex-col items-center justify-start h-8">
                  <span
                    class={`text-xs font-bold leading-none ${
                      dia.estado.includes("Presente")
                        ? "text-green-600"
                        : dia.estado.includes("Falta")
                          ? "text-red-600"
                          : "text-gray-400"
                    }`}
                  >
                    {dia.estado.includes("Presente")
                      ? "X"
                      : dia.estado.includes("Falta")
                        ? "PVC"
                        : "•"}
                  </span>
                  {#if dia.horas_extras_diurnas > 0 || dia.horas_extras_nocturnas > 0}
                    <span
                      class="text-[9px] text-blue-600 leading-none mt-0.5 scale-90"
                    >
                      {dia.horas_extras_diurnas > 0
                        ? "D" + dia.horas_extras_diurnas
                        : ""}
                      {dia.horas_extras_nocturnas > 0
                        ? "N" + dia.horas_extras_nocturnas
                        : ""}
                    </span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <!-- Botones de Acción -->
  <div
    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200"
  >
    <!-- EXCEL -->
    <button
      type="button"
      onclick={() => exportarExcel("empleados")}
      class="flex items-center justify-center gap-2 px-4 py-2 border border-green-600 text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition font-medium text-sm shadow-sm"
    >
      <FileSpreadsheet size={16} /> Excel Nomina Empleados
    </button>
    <button
      type="button"
      onclick={() => exportarExcel("jefes")}
      class="flex items-center justify-center gap-2 px-4 py-2 border border-blue-600 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition font-medium text-sm shadow-sm"
    >
      <FileSpreadsheet size={16} /> Excel Nomina Jefes
    </button>
    <button
      type="button"
      onclick={() => exportarExcel("resumen_empleados")}
      class="flex items-center justify-center gap-2 px-4 py-2 border border-orange-400 text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-md transition font-medium text-sm shadow-sm"
    >
      <FileText size={16} /> Excel Resumen HE Emp
    </button>
    <button
      type="button"
      onclick={() => exportarExcel("resumen_jefes")}
      class="flex items-center justify-center gap-2 px-4 py-2 border border-gray-400 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition font-medium text-sm shadow-sm"
    >
      <FileText size={16} /> Excel Resumen HE Jefes
    </button>

    <!-- PDF -->
    <button
      type="button"
      onclick={() => exportarPDF("empleados")}
      class="flex items-center justify-center gap-2 px-4 py-2 border border-red-600 text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition font-medium text-sm shadow-sm"
    >
      <Download size={16} /> PDF Nomina Empleados
    </button>
    <button
      type="button"
      onclick={() => exportarPDF("jefes")}
      class="flex items-center justify-center gap-2 px-4 py-2 border border-red-600 text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition font-medium text-sm shadow-sm"
    >
      <Download size={16} /> PDF Nomina Jefes
    </button>
    <button
      type="button"
      onclick={() => exportarPDF("resumen_empleados")}
      class="flex items-center justify-center gap-2 px-4 py-2 border border-red-600 text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition font-medium text-sm shadow-sm"
    >
      <Download size={16} /> PDF Resumen HE Emp
    </button>
    <button
      type="button"
      onclick={() => exportarPDF("resumen_jefes")}
      class="flex items-center justify-center gap-2 px-4 py-2 border border-red-600 text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition font-medium text-sm shadow-sm"
    >
      <Download size={16} /> PDF Resumen HE Jefes
    </button>
  </div>
</div>

<!-- Modal Inserción -->
{#if showModal}
  <div
    class="fixed inset-0 z-50 overflow-y-auto"
    aria-labelledby="modal-title"
    role="dialog"
    aria-modal="true"
  >
    <div
      class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
      onclick={() => (showModal = false)}
    ></div>

    <div
      class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
    >
      <div
        class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
      >
        <!-- Header -->
        <div
          class="bg-gray-50 px-4 py-3 sm:px-6 flex justify-between items-center"
        >
          <h3
            class="text-base font-semibold leading-6 text-gray-900"
            id="modal-title"
          >
            {editingEmpleado
              ? `Editar Novedad - ${editingEmpleado.nombre_completo}`
              : "Registrar Novedad"}
          </h3>

          <button
            onclick={() => (showModal = false)}
            class="text-gray-400 hover:text-gray-500"
            ><X class="h-5 w-5" /></button
          >
        </div>

        <div class="px-4 py-5 sm:p-6 space-y-4">
          {#if submitMessage}
            <div
              class={`p-2 rounded text-sm ${submitMessage.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
            >
              {submitMessage.text}
            </div>
          {/if}

          <!-- REGISTRO UNIFICADO -->
          {#if !editingEmpleado}
            <div class="space-y-2">
              <label
                for="search-empleados"
                class="block text-sm font-medium text-gray-700"
                >Empleados ({selectedIds.length} seleccionados)</label
              >
              <div class="flex gap-2">
                <input
                  id="search-empleados"
                  type="text"
                  bind:value={searchQueryModal}
                  placeholder="Buscar empleado..."
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm border p-2 text-sm"
                />
                <button
                  type="button"
                  onclick={() => {
                    if (selectedIds.length === filteredEmpleadosModal.length) {
                      selectedIds = [];
                    } else {
                      selectedIds = filteredEmpleadosModal.map((e) => e.id);
                    }
                  }}
                  class="text-xs text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap"
                >
                  {selectedIds.length === filteredEmpleadosModal.length
                    ? "Desmarcar todos"
                    : "Marcar todos"}
                </button>
              </div>
              <div
                class="mt-1 block w-full rounded-md border border-gray-300 bg-white max-h-40 overflow-y-auto"
              >
                {#each filteredEmpleadosModal as emp}
                  <label
                    class="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                  >
                    <input
                      type="checkbox"
                      value={emp.id}
                      bind:group={selectedIds}
                      class="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                    />
                    <span class="ml-3 text-sm text-gray-700"
                      >{emp.nombre}
                      {emp.apellido}
                      <span class="text-xs text-gray-400">({emp.codigo})</span>
                    </span>
                  </label>
                {/each}
                {#if filteredEmpleadosModal.length === 0}
                  <div class="p-3 text-sm text-gray-500 text-center">
                    No se encontraron empleados.
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <div>
            <label
              for="fecha-asistencia"
              class="block text-sm font-medium text-gray-700">Fecha</label
            >
            <input
              id="fecha-asistencia"
              type="date"
              bind:value={formAsistencia.fecha}
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm border p-2"
            />
          </div>
          <div class="flex gap-4">
            <div class="w-1/2">
              <label for="turno" class="block text-sm font-medium text-gray-700"
                >Turno</label
              >
              <select
                id="turno"
                bind:value={formAsistencia.turno_id}
                class="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm border"
              >
                <option value={1}>Diurno</option>
                <option value={2}>Nocturno</option>
              </select>
            </div>
            <div class="w-1/2">
              <label
                for="estado"
                class="block text-sm font-medium text-gray-700">Estado</label
              >
              <select
                id="estado"
                bind:value={formAsistencia.estado}
                class="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm border"
              >
                <option value="Presente">Presente</option>
                <option value="Falta">Falta</option>
                <option value="Vacaciones">Vacaciones</option>
                <option value="Licencia">Licencia</option>
                <option value="Suspendido">Suspendido</option>
              </select>
            </div>
          </div>
          <div class="flex gap-4">
            <div class="w-1/2">
              <label
                for="he-diurnas-asist"
                class="block text-sm font-medium text-gray-700"
                >Horas Extra Diurnas</label
              >
              <input
                id="he-diurnas-asist"
                type="number"
                step="0.5"
                min="0"
                bind:value={formAsistencia.he_diurnas}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm border p-2"
              />
            </div>
            <div class="w-1/2">
              <label
                for="he-nocturnas-asist"
                class="block text-sm font-medium text-gray-700"
                >Horas Extra Nocturnas</label
              >
              <input
                id="he-nocturnas-asist"
                type="number"
                step="0.5"
                min="0"
                bind:value={formAsistencia.he_nocturnas}
                class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm border p-2"
              />
            </div>
          </div>
          <div class="flex items-center">
            <input
              id="es-feriado-asist"
              type="checkbox"
              bind:checked={formAsistencia.es_feriado}
              class="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label
              for="es-feriado-asist"
              class="ml-2 block text-sm font-medium text-gray-700"
              >¿Es Día Feriado?</label
            >
          </div>
          <div>
            <label
              for="obs-asistencia"
              class="block text-sm font-medium text-gray-700">Observación</label
            >

            <textarea
              id="obs-asistencia"
              bind:value={formAsistencia.observacion}
              rows="2"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm border p-2"
            ></textarea>
          </div>
        </div>

        <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
          <button
            type="button"
            class="inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm sm:ml-3 sm:w-auto disabled:opacity-50 bg-green-600 hover:bg-green-500"
            onclick={handleSubmit}
            disabled={submitting}
          >
            {#if submitting}<Loader2
                class="animate-spin -ml-1 mr-2 h-4 w-4"
              />{/if}
            Guardar
          </button>
          <button
            type="button"
            class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
            onclick={() => (showModal = false)}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
