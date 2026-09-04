export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  return env.TA_WORKER.fetch(request);
};
