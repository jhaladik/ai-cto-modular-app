import { onRequestOptions as __api_auth_login_js_onRequestOptions } from "C:\\Users\\jhala\\OneDrive\\APPS\\ai-cto-modular-app\\Pages\\functions\\api\\auth\\login.js"
import { onRequestPost as __api_auth_login_js_onRequestPost } from "C:\\Users\\jhala\\OneDrive\\APPS\\ai-cto-modular-app\\Pages\\functions\\api\\auth\\login.js"
import { onRequestPost as __api_auth_logout_js_onRequestPost } from "C:\\Users\\jhala\\OneDrive\\APPS\\ai-cto-modular-app\\Pages\\functions\\api\\auth\\logout.js"
import { onRequestGet as __api_auth_validate_js_onRequestGet } from "C:\\Users\\jhala\\OneDrive\\APPS\\ai-cto-modular-app\\Pages\\functions\\api\\auth\\validate.js"
import { onRequestPost as __api_auth_validate_js_onRequestPost } from "C:\\Users\\jhala\\OneDrive\\APPS\\ai-cto-modular-app\\Pages\\functions\\api\\auth\\validate.js"
import { onRequest as __api_kam__path__js_onRequest } from "C:\\Users\\jhala\\OneDrive\\APPS\\ai-cto-modular-app\\Pages\\functions\\api\\kam\\[path].js"
import { onRequest as __api_orchestrator__path__js_onRequest } from "C:\\Users\\jhala\\OneDrive\\APPS\\ai-cto-modular-app\\Pages\\functions\\api\\orchestrator\\[path].js"
import { onRequestGet as __api_key_account_manager_js_onRequestGet } from "C:\\Users\\jhala\\OneDrive\\APPS\\ai-cto-modular-app\\Pages\\functions\\api\\key-account-manager.js"
import { onRequestOptions as __api_key_account_manager_js_onRequestOptions } from "C:\\Users\\jhala\\OneDrive\\APPS\\ai-cto-modular-app\\Pages\\functions\\api\\key-account-manager.js"
import { onRequestPost as __api_key_account_manager_js_onRequestPost } from "C:\\Users\\jhala\\OneDrive\\APPS\\ai-cto-modular-app\\Pages\\functions\\api\\key-account-manager.js"
import { onRequestPut as __api_key_account_manager_js_onRequestPut } from "C:\\Users\\jhala\\OneDrive\\APPS\\ai-cto-modular-app\\Pages\\functions\\api\\key-account-manager.js"

export const routes = [
    {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_auth_login_js_onRequestOptions],
    },
  {
      routePath: "/api/auth/login",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_login_js_onRequestPost],
    },
  {
      routePath: "/api/auth/logout",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_logout_js_onRequestPost],
    },
  {
      routePath: "/api/auth/validate",
      mountPath: "/api/auth",
      method: "GET",
      middlewares: [],
      modules: [__api_auth_validate_js_onRequestGet],
    },
  {
      routePath: "/api/auth/validate",
      mountPath: "/api/auth",
      method: "POST",
      middlewares: [],
      modules: [__api_auth_validate_js_onRequestPost],
    },
  {
      routePath: "/api/kam/:path",
      mountPath: "/api/kam",
      method: "",
      middlewares: [],
      modules: [__api_kam__path__js_onRequest],
    },
  {
      routePath: "/api/orchestrator/:path",
      mountPath: "/api/orchestrator",
      method: "",
      middlewares: [],
      modules: [__api_orchestrator__path__js_onRequest],
    },
  {
      routePath: "/api/key-account-manager",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_key_account_manager_js_onRequestGet],
    },
  {
      routePath: "/api/key-account-manager",
      mountPath: "/api",
      method: "OPTIONS",
      middlewares: [],
      modules: [__api_key_account_manager_js_onRequestOptions],
    },
  {
      routePath: "/api/key-account-manager",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_key_account_manager_js_onRequestPost],
    },
  {
      routePath: "/api/key-account-manager",
      mountPath: "/api",
      method: "PUT",
      middlewares: [],
      modules: [__api_key_account_manager_js_onRequestPut],
    },
  ]