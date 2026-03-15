<script lang="ts">
  import { authState } from "$lib/state/auth.svelte";

  import { page } from "$app/state";
  import {
    LayoutDashboard,
    Users,
    UserCheck,
    Briefcase,
    FileText,
    LogOut,
    Building2,
    Menu,
    X,
    ListTodo,
  } from "lucide-svelte";
 
  let isMobileOpen = $state(false);
 
  const links = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/perfil", label: "Mi Perfil", icon: UserCheck },
    { href: "/asistencia", label: "Asistencia", icon: UserCheck },
    { href: "/empleados", label: "Empleados", icon: Users },
    { href: "/administrativos", label: "Administrativos", icon: Users },
    { href: "/trabajos", label: "Trabajos Diarios", icon: Briefcase },
    { href: "/ordenes", label: "Órdenes Trabajo", icon: FileText },
    { href: "/actividades", label: "Actividades", icon: ListTodo },
  ];

  function logout() {
    authState.logout();
    isMobileOpen = false;
  }
</script>

<!-- Mobile header (Fijo Arriba - Z-30) -->
<header
  class="md:hidden bg-white border-b border-gray-200 h-14 px-4 flex items-center justify-between sticky top-0 z-30 shadow-sm w-full"
>
  <div class="flex items-center gap-2">
    <Building2 class="text-blue-600 h-6 w-6 shrink-0" />
    <span class="font-bold text-gray-900 text-lg truncate">MTTO App</span>
  </div>
  <button
    onclick={() => (isMobileOpen = !isMobileOpen)}
    class="p-2 -mr-2 text-gray-600 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 rounded-md"
    aria-label="Menú principal"
    aria-expanded={isMobileOpen}
  >
    {#if isMobileOpen}
      <X class="h-6 w-6" />
    {:else}
      <Menu class="h-6 w-6" />
    {/if}
  </button>
</header>

<!-- Overlay (Z-40) -->
{#if isMobileOpen}
  <div
    class="fixed inset-0 bg-gray-900/50 z-40 transition-opacity md:hidden"
    onclick={() => (isMobileOpen = false)}
    onkeydown={(e) => e.key === "Escape" && (isMobileOpen = false)}
    role="button"
    tabindex="0"
    aria-label="Cerrar menú"
  ></div>
{/if}

<!-- Sidebar Drawer (Z-50 en móvil) -->
<aside
  class={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white shadow-xl transform transition-transform duration-300 ease-in-out md:translate-x-0 md:sticky md:top-0 md:h-screen md:z-auto md:shadow-none ${
    isMobileOpen ? "translate-x-0" : "-translate-x-full"
  }`}
>
  <div class="flex h-full flex-col">
    <!-- Logo Desktop / Header Drawer -->
    <div
      class="flex items-center px-4 h-16 bg-slate-800 border-b border-gray-700 shrink-0"
    >
      <Building2 class="text-blue-400 mr-3 h-6 w-6" />
      <span class="text-lg font-bold text-gray-100 truncate"
        >Palmeras Diana</span
      >
      <!-- Botón cerrar en móvil dentro del drawer -->
      <button
        onclick={() => (isMobileOpen = false)}
        class="ml-auto md:hidden text-gray-400 hover:text-white"
      >
        <X class="h-5 w-5" />
      </button>
    </div>

    <!-- User Info -->
    <div class="p-4 border-b border-gray-700 bg-slate-800/30 shrink-0">
      <p class="text-xs text-gray-400 uppercase font-semibold mb-1">Usuario</p>
      <div class="flex items-center gap-3">
        <div
          class="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white uppercase shrink-0"
        >
          {(authState.user?.username || "U")[0]}
        </div>
        <div class="overflow-hidden">
          <p class="font-medium text-sm truncate text-white">
            {authState.user?.username || "Usuario"}
          </p>
          <p class="text-xs text-blue-400 truncate capitalize">
            {authState.user?.role || "Invitado"}
          </p>
        </div>
      </div>
    </div>

    <nav class="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
      {#each links.filter((l) => {
        if (authState.user?.role === "supervisor") {
          return !["Administrativos", "Órdenes Trabajo", "Empleados"].includes(l.label);
        }
        return true;
      }) as link}
        {@const isActive = page.url.pathname.startsWith(link.href)}
        <a
          href={link.href}
          class={`group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-all ${
            isActive
              ? "bg-blue-600 text-white shadow-md"
              : "text-gray-300 hover:bg-slate-800 hover:text-white"
          }`}
          onclick={() => (isMobileOpen = false)}
        >
          <link.icon
            class={`mr-3 h-5 w-5 shrink-0 transition-colors ${isActive ? "text-white" : "text-gray-400 group-hover:text-white"}`}
          />
          <span class="truncate">{link.label}</span>
        </a>
      {/each}
      
      {#if authState.user?.role === "admin"}
        <a
          href="/usuarios"
          class={`group flex items-center px-3 py-3 text-sm font-medium rounded-md transition-all ${
            page.url.pathname.startsWith("/usuarios")
              ? "bg-blue-600 text-white shadow-md"
              : "text-gray-300 hover:bg-slate-800 hover:text-white"
          }`}
          onclick={() => (isMobileOpen = false)}
        >
          <Users class={`mr-3 h-5 w-5 shrink-0 transition-colors ${page.url.pathname.startsWith("/usuarios") ? "text-white" : "text-gray-400 group-hover:text-white"}`} />
          <span class="truncate">Gestión de Usuarios</span>
        </a>
      {/if}
    </nav>

    <!-- Footer / Logout -->
    <div class="p-4 border-t border-gray-700 shrink-0 bg-slate-900">
      <button
        onclick={logout}
        class="flex w-full items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600/90 hover:bg-red-700 rounded-md transition-colors shadow-sm"
      >
        <LogOut class="mr-2 h-4 w-4" />
        <span class="truncate">Cerrar Sesión</span>
      </button>
    </div>
  </div>
</aside>
