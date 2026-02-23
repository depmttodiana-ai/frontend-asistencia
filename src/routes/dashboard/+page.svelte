<script lang="ts">
  import { onMount } from "svelte";
  import { authState } from "$lib/state/auth.svelte";

  import api from "$lib/api";
  import {
    Shield,
    Clock,
    Wrench,
    BarChart,
    AlertTriangle,
    Users,
    CheckCircle,
    ClipboardList,
    TrendingUp,
  } from "lucide-svelte";

  let stats = $state<any[]>([
    {
      name: "Administrativos",
      value: "-",
      icon: Shield,
      change: "Total",
      changeType: "neutral",
    },
    {
      name: "Coordinadores",
      value: "-",
      icon: Wrench,
      change: "Activos",
      changeType: "neutral",
    },
    {
      name: "Supervisores",
      value: "-",
      icon: Clock,
      change: "Activos",
      changeType: "neutral",
    },
    {
      name: "Personal Activo",
      value: "-",
      icon: BarChart,
      change: "Total",
      changeType: "positive",
    },
  ]);

  let attendanceStats = $state({
    presentes: 0,
    faltas: 0,
    total_reportados: 0,
  });

  let chartData = $state({
    attendance: [] as { date: string; p: number; f: number }[],
    workOrders: [] as { date: string; count: number }[],
  });

  let loading = $state(true);
  let error = $state<string | null>(null);

  async function loadStats() {
    try {
      loading = true;
      error = null;

      // 1. Cargar resumen administrativo
      const responseResumen = await api.get(
        "/administrativos/estadisticas/resumen",
      );
      const data = responseResumen.data;

      // 2. Cargar asistencia de hoy
      const todayStr = new Date().toISOString().split("T")[0];
      let presentes = 0;
      let faltas = 0;

      try {
        const responseAsistencia = await api.get(
          `/asistencia/fecha/${todayStr}`,
        );
        const asistenciasHoy = responseAsistencia.data.asistencias || [];
        presentes = asistenciasHoy.filter(
          (a: any) => a.estado === "Presente",
        ).length;
        faltas = asistenciasHoy.filter((a: any) => a.estado === "Falta").length;
      } catch (err) {
        console.warn("No se pudo cargar asistencia de hoy", err);
      }

      attendanceStats = {
        presentes,
        faltas,
        total_reportados: presentes + faltas,
      };

      stats = [
        {
          name: "Personal Activo",
          value: data.activos.toString(),
          icon: Users,
          change: `${data.inactivos} inactivos`,
          changeType: "neutral",
        },
        {
          name: "Asistencia Hoy",
          value: attendanceStats.presentes.toString(),
          icon: CheckCircle,
          change: `${attendanceStats.faltas} Faltas`,
          changeType: "positive",
        },
        {
          name: "Coordinadores",
          value: data.total_coordinadores.toString(),
          icon: Wrench,
          change: "En plantilla",
          changeType: "neutral",
        },
        {
          name: "Supervisores",
          value: data.total_supervisores.toString(),
          icon: Clock,
          change: "En plantilla",
          changeType: "neutral",
        },
      ];

      // 3. Cargar datos para gráficas (últimos 7 días)
      await loadTrendData();
    } catch (e: any) {
      console.error(e);
      error =
        "No se pudieron cargar las estadísticas. " +
        (e.response?.status === 403
          ? "No tienes los permisos suficientes para realizar esta acción."
          : e.response?.data?.detail || e.message);
    } finally {
      loading = false;
    }
  }

  async function loadTrendData() {
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 6);

    const desde = lastWeek.toISOString().split("T")[0];
    const hasta = today.toISOString().split("T")[0];

    try {
      // Attendance Data
      const resAsist = await api.get("/asistencia/reporte-rango/general", {
        params: { fecha_desde: desde, fecha_hasta: hasta },
      });

      const dailyAttendance: Record<string, { p: number; f: number }> = {};
      // Initialize range
      for (let i = 0; i < 7; i++) {
        const d = new Date(lastWeek);
        d.setDate(d.getDate() + i);
        dailyAttendance[d.toISOString().split("T")[0]] = { p: 0, f: 0 };
      }

      resAsist.data.data.forEach((emp: any) => {
        emp.detalles.forEach((det: any) => {
          const f = det.fecha;
          if (dailyAttendance[f]) {
            if (det.estado.includes("Presente")) dailyAttendance[f].p++;
            else if (det.estado.includes("Falta") || det.estado.includes("PVC"))
              dailyAttendance[f].f++;
          }
        });
      });

      chartData.attendance = Object.entries(dailyAttendance).map(
        ([date, counts]) => ({
          date: date.split("-").slice(2).join("/"),
          p: counts.p,
          f: counts.f,
        }),
      );

      // Work Orders Data
      const resOrders = await api.get("/ordenes-trabajo/", {
        params: { fecha_inicio: desde, fecha_fin: hasta },
      });

      const dailyOrders: Record<string, number> = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(lastWeek);
        d.setDate(d.getDate() + i);
        dailyOrders[d.toISOString().split("T")[0]] = 0;
      }

      resOrders.data.data.forEach((ord: any) => {
        if (dailyOrders[ord.fecha] !== undefined) {
          dailyOrders[ord.fecha]++;
        }
      });

      chartData.workOrders = Object.entries(dailyOrders).map(
        ([date, count]) => ({
          date: date.split("-").slice(2).join("/"),
          count,
        }),
      );
    } catch (err) {
      console.error("Error trend data", err);
    }
  }

  onMount(() => {
    loadStats();
  });

  // SVG Chart Helper
  const chartHeight = 120;
  const chartWidth = 300;
  const barPadding = 10;
</script>

<div class="px-4 py-5 sm:px-6">
  <h1 class="text-3xl font-bold leading-tight text-gray-900">
    Dashboard General
  </h1>
  <p class="mt-1 text-sm text-gray-600">
    Bienvenido, <span class="font-semibold text-blue-600"
      >{authState.user?.username || "Usuario"}</span
    >.
    <span
      class="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 capitalize"
    >
      {authState.user?.role || "Invitado"}
    </span>
  </p>
</div>

{#if error}
  <div class="mx-4 mt-4 rounded-md bg-red-50 p-4">
    <div class="flex">
      <div class="shrink-0">
        <AlertTriangle class="h-5 w-5 text-red-400" aria-hidden="true" />
      </div>
      <div class="ml-3">
        <h3 class="text-sm font-medium text-red-800">
          Error cargando dashboard
        </h3>
        <p class="text-sm text-red-700 mt-1">{error}</p>
      </div>
    </div>
  </div>
{/if}

<!-- Stats -->
<div class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 px-4">
  {#if loading}
    {#each Array(4) as _}
      <div
        class="animate-pulse rounded-lg bg-white px-4 py-5 shadow sm:px-6 border border-gray-100 h-32"
      ></div>
    {/each}
  {:else}
    {#each stats as stat}
      <div
        class="relative overflow-hidden rounded-lg bg-white px-4 py-5 shadow sm:px-6 border border-gray-100 transition-all hover:shadow-md"
      >
        <dt>
          <div
            class={`absolute rounded-md p-3 ${stat.name === "Asistencia Hoy" ? "bg-green-600 shadow-sm" : "bg-blue-600 shadow-sm"}`}
          >
            <stat.icon class="h-6 w-6 text-white" aria-hidden="true" />
          </div>
          <p class="ml-16 truncate text-sm font-medium text-gray-500">
            {stat.name}
          </p>
        </dt>
        <dd class="ml-16 flex items-baseline">
          <p class="text-2xl font-bold text-gray-900">{stat.value}</p>
          <p class="ml-2 text-sm font-medium text-gray-500">{stat.change}</p>
        </dd>
      </div>
    {/each}
  {/if}
</div>

<!-- Charts Section -->
<div class="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8 px-4">
  <!-- Asistencia Chart -->
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
        <TrendingUp class="w-5 h-5 text-green-600" /> Tendencia de Asistencia
      </h3>
      <div class="flex gap-4 text-xs">
        <span class="flex items-center gap-1"
          ><span class="w-3 h-3 bg-green-500 rounded-sm"></span> Presentes</span
        >
        <span class="flex items-center gap-1"
          ><span class="w-3 h-3 bg-red-400 rounded-sm"></span> Faltas</span
        >
      </div>
    </div>

    <div class="relative h-48 w-full">
      {#if loading}
        <div
          class="absolute inset-0 flex items-center justify-center bg-gray-50 rounded"
        >
          Cargando gráfica...
        </div>
      {:else}
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          class="w-full h-full preserve-3d"
        >
          {#each chartData.attendance as item, i}
            {@const x = (chartWidth / 7) * i + 10}
            {@const maxVal = Math.max(
              ...chartData.attendance.map((d) => d.p + d.f),
              10,
            )}
            {@const h_p = (item.p / maxVal) * (chartHeight - 30)}
            {@const h_f = (item.f / maxVal) * (chartHeight - 30)}

            <!-- Bars -->
            <rect
              {x}
              y={chartHeight - 20 - h_p}
              width="12"
              height={h_p}
              rx="2"
              fill="#10b981"
            />
            <rect
              x={x + 14}
              y={chartHeight - 20 - h_f}
              width="12"
              height={h_f}
              rx="2"
              fill="#f87171"
            />

            <!-- Labels -->
            <text
              x={x + 6}
              y={chartHeight - 5}
              text-anchor="middle"
              font-size="8"
              fill="#6b7280">{item.date}</text
            >
          {/each}
        </svg>
      {/if}
    </div>
  </div>

  <!-- Work Orders Chart -->
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
    <div class="flex items-center justify-between mb-6">
      <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
        <ClipboardList class="w-5 h-5 text-blue-600" /> Órdenes Realizadas
      </h3>
      <span class="text-xs text-gray-500 italic">Última semana</span>
    </div>

    <div class="relative h-48 w-full">
      {#if loading}
        <div
          class="absolute inset-0 flex items-center justify-center bg-gray-50 rounded"
        >
          Cargando gráfica...
        </div>
      {:else}
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} class="w-full h-full">
          <!-- Horizontal Lines -->
          {#each [0, 0.5, 1] as tick}
            <line
              x1="0"
              y1={(chartHeight - 20) * tick}
              x2={chartWidth}
              y2={(chartHeight - 20) * tick}
              stroke="#f3f4f6"
              stroke-width="1"
            />
          {/each}

          {#each chartData.workOrders as item, i}
            {@const x = (chartWidth / 7) * i + 15}
            {@const maxVal = Math.max(
              ...chartData.workOrders.map((d) => d.count),
              5,
            )}
            {@const h = (item.count / maxVal) * (chartHeight - 30)}

            <rect
              {x}
              y={chartHeight - 20 - h}
              width="25"
              height={h}
              rx="3"
              fill="#3b82f6"
              class="transition-all hover:fill-blue-700"
            />
            <text
              x={x + 12.5}
              y={chartHeight - 5}
              text-anchor="middle"
              font-size="8"
              fill="#6b7280">{item.date}</text
            >
            {#if item.count > 0}
              <text
                x={x + 12.5}
                y={chartHeight - 25 - h}
                text-anchor="middle"
                font-size="9"
                font-weight="bold"
                fill="#1e40af">{item.count}</text
              >
            {/if}
          {/each}
        </svg>
      {/if}
    </div>
  </div>
</div>

<!-- Recent Activity -->
<div class="mt-8 px-4 pb-8">
  <div
    class="overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100"
  >
    <div class="p-6">
      <h3 class="text-lg font-bold text-gray-900">
        Actividad Reciente del Sistema
      </h3>
      <div class="mt-6 border-t border-gray-100">
        <dl class="divide-y divide-gray-100">
          <div class="px-0 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-blue-50 rounded-lg">
                <Wrench class="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <dt class="text-sm font-bold text-gray-900">
                  Nuevas Órdenes Registro
                </dt>
                <dd class="text-xs text-gray-500">
                  Se han actualizado las órdenes de mantenimiento diario.
                </dd>
              </div>
            </div>
            <span class="text-xs text-gray-400 font-medium">Hoy</span>
          </div>
          <div class="px-0 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2 bg-green-50 rounded-lg">
                <Users class="w-5 h-5 text-green-600" />
              </div>
              <div>
                <dt class="text-sm font-bold text-gray-900">
                  Control de Asistencia
                </dt>
                <dd class="text-xs text-gray-500">
                  Último reporte de personal cargado por supervisión.
                </dd>
              </div>
            </div>
            <span class="text-xs text-gray-400 font-medium">Reciente</span>
          </div>
        </dl>
      </div>
    </div>
  </div>
</div>
