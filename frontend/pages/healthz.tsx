import type { NextPage } from 'next';

const HealthzPage: NextPage = () => {
  // Simpler Text-Body reicht für Healthchecks vollkommen
  return (
    <main style={{ padding: '1rem', fontFamily: 'system-ui, sans-serif' }}>
      <pre>{JSON.stringify({ status: 'ok', component: 'frontend' }, null, 2)}</pre>
    </main>
  );
};

export default HealthzPage;
