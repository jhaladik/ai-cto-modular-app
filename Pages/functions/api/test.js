export async function onRequest(context) {
    const { env } = context;
    
    return new Response(JSON.stringify({
      hasOrchestratorUrl: !!env.ORCHESTRATOR_URL,
      orchestratorUrl: env.ORCHESTRATOR_URL,
      hasClientKey: !!env.CLIENT_API_KEY,
      hasKV: !!env.BITWARE_SESSION_STORE,
      allEnvKeys: Object.keys(env)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }