
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import {jwtDecode} from 'jwt-decode';
import api from '$lib/api';

/**
 * Interface para el payload decodificado del JWT y la información del usuario
 */
export interface User {
  username: string;
  role: 'admin' | 'coordinador' | 'supervisor';
  email?: string;
  exp?: number;
}

/**
 * Clase reactiva para manejar el estado de autenticación (Svelte 5 Runes)
 */
class AuthState {
  
  // Estado reactivo inicializado con lo de localStorage si existe
  token = $state<string | null>(browser ? localStorage.getItem('token') : null);
  user = $state<User | null>(browser ? JSON.parse(localStorage.getItem('user') || 'null') : null);
  loading = $state(false);
  error = $state<string | null>(null);

  constructor() {
    // Escuchar cambios y sincronizar localStorage
    $effect.root(() => {
      $effect(() => {
        if (browser) {
          if (this.token) {
            localStorage.setItem('token', this.token);
            // Decodificar token para obtener datos si no user
            if (!this.user) {
              try {
                const decoded: any = jwtDecode(this.token);
                this.user = {
                  username: decoded.sub || 'Usuario',
                  role: decoded.role || 'supervisor',
                  email: decoded.email || undefined
                };
              } catch (e) {
                this.logout();
              }
            }
            if (this.user) {
              localStorage.setItem('user', JSON.stringify(this.user));
            }
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      });
    });
  }

  /**
   * Computed property: está autenticado si hay token valido
   */
  get isAuthenticated() {
    return !!this.token;
  }

  /**
   * Computed property: Es administrador o coordinador
   */
  get isAdminOrCoord() {
    return this.user?.role === 'admin' || this.user?.role === 'coordinador';
  }

  /**
   * Iniciar sesión
   */
  async login(username: string, password: string): Promise<boolean> {
    this.loading = true;
    this.error = null;
    
    try {
      // El endpoint de FastAPI espera x-www-form-urlencoded
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const response = await api.post('/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      if (response.data.access_token) {
        const token = response.data.access_token;
        this.token = token;
        
        const decoded: any = jwtDecode(token);
        
        // Asignar datos del usuario desde el token o respuesta
        this.user = {
          username: decoded.sub || username,
          role: response.data.role || decoded.role || 'supervisor',
          email: response.data.email || undefined
        };
        
        // Redireccionar al dashboard
        if (browser) {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(this.user));
            goto('/dashboard');
        }
        return true;
      }
      return false;
    } catch (err: any) {
      console.error(err);
      if (err.message === 'Network Error' || !err.response) {
         this.error = 'No se puede conectar con el servidor. Verifica que el backend esté corriendo.';
      } else {
         this.error = err.response?.data?.detail || 'Error al iniciar sesión';
      }
      return false;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Cerrar sesión
   */
  logout() {
    this.token = null;
    this.user = null;
    goto('/login');
  }
}

// Exportar una única instancia reactiva
export const authState = new AuthState();
