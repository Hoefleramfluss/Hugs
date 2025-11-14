import Head from 'next/head';

const HealthzPage = () => {
  return (
    <>
      <Head>
        <title>OK</title>
      </Head>
      <main className="min-h-screen flex items-center justify-center bg-background text-on-surface">
        <p>ok</p>
      </main>
    </>
  );
};

export default HealthzPage;
