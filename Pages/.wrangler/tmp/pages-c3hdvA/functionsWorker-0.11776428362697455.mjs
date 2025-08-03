var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/auth/login.js
async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { username, password, loginType = "admin" } = await request.json();
    let sessionData = null;
    let clientData = null;
    switch (loginType) {
      case "admin":
      case "user":
        try {
          const kamResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
            new Request("https://kam.internal/auth/validate-user", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.WORKER_SHARED_SECRET}`,
                "X-Worker-ID": "pages-auth-proxy"
              },
              body: JSON.stringify({
                email: username,
                // For all users, username is email
                password,
                expected_role: loginType
                // 'admin' or 'user'
              })
            })
          );
          if (!kamResponse.ok) {
            const error = await kamResponse.json();
            return new Response(JSON.stringify({
              success: false,
              error: error.error || "Authentication failed"
            }), {
              status: 401,
              headers: { "Content-Type": "application/json" }
            });
          }
          const userData = await kamResponse.json();
          sessionData = {
            username: userData.user.email,
            role: userData.user.role,
            userType: "internal",
            userId: userData.user.user_id,
            fullName: userData.user.full_name,
            department: userData.user.department || "General",
            // ✅ FIXED: Direct access + fallback
            created: Date.now(),
            expires: Date.now() + 24 * 60 * 60 * 1e3
            // 24 hours
          };
        } catch (error) {
          console.error("Authentication service error:", error);
          return new Response(JSON.stringify({
            success: false,
            error: "Authentication service unavailable"
          }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
          });
        }
        break;
      case "client":
        try {
          const kamResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
            new Request("https://kam.internal/auth/validate-user", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.WORKER_SHARED_SECRET}`,
                "X-Worker-ID": "pages-auth-proxy"
              },
              body: JSON.stringify({
                email: username,
                // For all users, username is email
                password,
                expected_role: "client"
              })
            })
          );
          if (!kamResponse.ok) {
            const error = await kamResponse.json();
            return new Response(JSON.stringify({
              success: false,
              error: error.error || "Authentication failed"
            }), {
              status: 401,
              headers: { "Content-Type": "application/json" }
            });
          }
          const userData = await kamResponse.json();
          sessionData = {
            username: userData.user.email,
            role: userData.user.role,
            userType: "client",
            userId: userData.user.user_id,
            clientId: userData.client_profile?.client_id,
            companyName: userData.client_profile?.company_name,
            subscriptionTier: userData.client_profile?.subscription_tier,
            fullName: userData.user.full_name,
            created: Date.now(),
            expires: Date.now() + 24 * 60 * 60 * 1e3
            // 24 hours
          };
        } catch (error) {
          console.error("Authentication service error:", error);
          return new Response(JSON.stringify({
            success: false,
            error: "Authentication service unavailable"
          }), {
            status: 503,
            headers: { "Content-Type": "application/json" }
          });
        }
        break;
      default:
        return new Response(JSON.stringify({
          success: false,
          error: "Invalid login type"
        }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
    }
    const sessionToken = crypto.randomUUID();
    await env.BITWARE_SESSION_STORE.put(
      `session:${sessionToken}`,
      JSON.stringify(sessionData),
      {
        expirationTtl: 24 * 60 * 60
        // 24 hours in seconds
      }
    );
    try {
      await env.KEY_ACCOUNT_MANAGER.fetch(
        new Request("https://kam.internal/session/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.WORKER_SHARED_SECRET}`,
            "X-Worker-ID": "pages-auth-proxy"
          },
          body: JSON.stringify({
            sessionToken,
            userId: sessionData.userId,
            clientId: sessionData.clientId || null,
            loginMethod: "dashboard",
            expiresAt: new Date(sessionData.expires).toISOString()
          })
        })
      );
    } catch (error) {
      console.error("Session registration failed:", error);
    }
    return new Response(JSON.stringify({
      success: true,
      sessionToken,
      user: {
        username: sessionData.username,
        role: sessionData.role,
        userType: sessionData.userType,
        userId: sessionData.userId,
        fullName: sessionData.fullName,
        ...sessionData.role === "client" ? {
          clientId: sessionData.clientId,
          companyName: sessionData.companyName,
          subscriptionTier: sessionData.subscriptionTier
        } : {},
        ...sessionData.userType === "internal" ? {
          department: sessionData.department
        } : {}
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Login error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Invalid request"
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost, "onRequestPost");

// api/auth/logout.js
async function onRequestPost2(context) {
  const { request, env } = context;
  try {
    const sessionToken = request.headers.get("x-bitware-session-token");
    if (sessionToken) {
      await env.BITWARE_SESSION_STORE.delete(`session:${sessionToken}`);
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: "Logout failed"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost2, "onRequestPost");

// api/auth/validate.js
async function onRequestPost3(context) {
  const { request, env } = context;
  try {
    const sessionToken = request.headers.get("x-bitware-session-token") || request.headers.get("X-Session-Token");
    if (!sessionToken) {
      return new Response(JSON.stringify({
        valid: false,
        error: "No session token provided"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const sessionKey = `session:${sessionToken}`;
    const sessionData = await env.BITWARE_SESSION_STORE.get(sessionKey);
    if (!sessionData) {
      return new Response(JSON.stringify({
        valid: false,
        error: "Invalid or expired session"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    const session = JSON.parse(sessionData);
    if (Date.now() > session.expires) {
      await env.BITWARE_SESSION_STORE.delete(sessionKey);
      return new Response(JSON.stringify({
        valid: false,
        error: "Session expired"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    return new Response(JSON.stringify({
      valid: true,
      user: {
        email: session.username,
        role: session.role,
        full_name: session.fullName || session.username,
        // Fix the missing full_name
        userId: session.userId,
        userType: session.userType
      }
    }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Session validation error:", error);
    return new Response(JSON.stringify({
      valid: false,
      error: "Validation failed"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
__name(onRequestPost3, "onRequestPost");
async function onRequestGet(context) {
  return onRequestPost3(context);
}
__name(onRequestGet, "onRequestGet");

// api/kam/[path].js
async function onRequest(context) {
  const corsHeaders2 = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Worker-ID, x-bitware-session-token"
  };
  if (context.request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders2 });
  }
  try {
    const debug = {
      method: context.request.method,
      url: context.request.url,
      params: context.params,
      hasEnv: !!context.env,
      hasSessionStore: !!context.env?.BITWARE_SESSION_STORE,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    console.log("\u{1F50D} KAM Proxy Debug:", JSON.stringify(debug));
    let path = "";
    if (context.params && context.params.path && Array.isArray(context.params.path)) {
      path = context.params.path.join("/");
    }
    console.log("\u{1F4CD} Extracted path:", path);
    if (path === "health" || path === "" || !path) {
      console.log("\u{1F49A} Handling health check");
      const healthResponse = {
        status: "proxy_healthy",
        debug,
        path,
        message: "KAM proxy is responding"
      };
      return new Response(JSON.stringify(healthResponse), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders2
        }
      });
    }
    console.log("\u{1F504} Attempting to call KAM worker for path:", path);
    try {
      const kamWorkerUrl = `https://bitware-key-account-manager.jhaladik.workers.dev/${path}`;
      console.log("\u{1F4DE} Calling:", kamWorkerUrl);
      const kamResponse = await fetch(kamWorkerUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      console.log("\u{1F4CB} KAM worker response status:", kamResponse.status);
      const responseText = await kamResponse.text();
      return new Response(responseText, {
        status: kamResponse.status,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders2
        }
      });
    } catch (fetchError) {
      console.error("\u274C Fetch to KAM worker failed:", fetchError);
      return new Response(JSON.stringify({
        success: false,
        error: "KAM worker fetch failed",
        details: fetchError.message,
        attempted_url: `https://bitware-key-account-manager.jhaladik.workers.dev/${path}`
      }), {
        status: 503,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders2
        }
      });
    }
  } catch (error) {
    console.error("\u274C KAM Proxy main error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "KAM proxy function error",
      message: error.message,
      stack: error.stack,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders2
      }
    });
  }
}
__name(onRequest, "onRequest");

// _shared/auth-helper.js
async function validateSession(request, env) {
  const sessionToken = request.headers.get("x-bitware-session-token");
  if (!sessionToken) {
    return { valid: false, error: "No session token" };
  }
  try {
    const sessionData = await env.BITWARE_SESSION_STORE.get(`session:${sessionToken}`);
    if (!sessionData) {
      return { valid: false, error: "Invalid session" };
    }
    const session = JSON.parse(sessionData);
    if (Date.now() > session.expires) {
      await env.BITWARE_SESSION_STORE.delete(`session:${sessionToken}`);
      return { valid: false, error: "Session expired" };
    }
    return { valid: true, session };
  } catch (error) {
    return { valid: false, error: "Session validation failed" };
  }
}
__name(validateSession, "validateSession");

// api/key-account-manager.js
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Session-Token, x-bitware-session-token, Authorization"
};
async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}
__name(onRequestOptions, "onRequestOptions");
async function onRequestPost4(context) {
  const { request, env } = context;
  try {
    console.log("\u{1F50D} KAM Proxy: Processing request");
    const incomingBody = await request.json();
    const { endpoint, method = "GET", data = {} } = incomingBody;
    console.log(`\u{1F4E1} KAM Proxy: ${method} ${endpoint}`);
    const sessionToken = request.headers.get("X-Session-Token") || request.headers.get("x-bitware-session-token");
    if (!sessionToken) {
      return new Response(JSON.stringify({
        success: false,
        error: "No session token provided"
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    console.log(`\u{1F511} Validating Pages session: ${sessionToken.substring(0, 10)}...`);
    const sessionRequest = new Request(request.url, {
      method: request.method,
      headers: {
        ...request.headers,
        "x-bitware-session-token": sessionToken
      }
    });
    const sessionValidation = await validateSession(sessionRequest, env);
    if (!sessionValidation.valid) {
      console.log("\u274C Pages session invalid:", sessionValidation.error);
      return new Response(JSON.stringify({
        success: false,
        error: sessionValidation.error
      }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }
    const session = sessionValidation.session;
    console.log(`\u2705 Pages session valid for user: ${session.username} (${session.role})`);
    let kamHeaders = {
      "Content-Type": "application/json"
    };
    const isAdminEndpoint = endpoint.startsWith("/clients") || endpoint.startsWith("/users") || endpoint.startsWith("/dashboard") || endpoint.includes("admin");
    if (isAdminEndpoint) {
      if (session.role !== "admin" && session.userType !== "internal") {
        console.log("\u{1F6AB} Admin access denied for role:", session.role);
        return new Response(JSON.stringify({
          success: false,
          error: "Admin access required"
        }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }
      kamHeaders["Authorization"] = `Bearer ${env.WORKER_SHARED_SECRET}`;
      kamHeaders["X-Worker-ID"] = "pages-kam-proxy";
      console.log("\u{1F527} Using worker authentication for admin endpoint");
    } else {
      kamHeaders["X-API-Key"] = env.CLIENT_API_KEY;
      console.log("\u{1F527} Using client API key for regular endpoint");
    }
    kamHeaders["x-bitware-session-token"] = sessionToken;
    console.log("\u{1F4DE} Calling KAM worker...");
    let kamRequestBody = null;
    if (method !== "GET" && method !== "HEAD") {
      kamRequestBody = JSON.stringify(data);
    }
    const kamResponse = await env.KEY_ACCOUNT_MANAGER.fetch(
      new Request(`https://kam.internal${endpoint}`, {
        method,
        headers: kamHeaders,
        body: kamRequestBody
      })
    );
    console.log(`\u{1F4E8} KAM worker responded: ${kamResponse.status}`);
    const responseText = await kamResponse.text();
    return new Response(responseText, {
      status: kamResponse.status,
      statusText: kamResponse.statusText,
      headers: {
        "Content-Type": kamResponse.headers.get("Content-Type") || "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("\u274C KAM Proxy Error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Proxy error",
      message: error.message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
}
__name(onRequestPost4, "onRequestPost");
async function onRequestGet2(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const endpoint = url.pathname.replace("/api/key-account-manager", "");
  const fakeRequest = new Request(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({
      endpoint: endpoint || "/health",
      method: "GET",
      data: {}
    })
  });
  return onRequestPost4({ request: fakeRequest, env });
}
__name(onRequestGet2, "onRequestGet");

// ../.wrangler/tmp/pages-c3hdvA/functionsRoutes-0.46100317410434766.mjs
var routes = [
  {
    routePath: "/api/auth/login",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/auth/logout",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/auth/validate",
    mountPath: "/api/auth",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/auth/validate",
    mountPath: "/api/auth",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/kam/:path",
    mountPath: "/api/kam",
    method: "",
    middlewares: [],
    modules: [onRequest]
  },
  {
    routePath: "/api/key-account-manager",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/key-account-manager",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/key-account-manager",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-rgddpA/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-rgddpA/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.11776428362697455.mjs.map
