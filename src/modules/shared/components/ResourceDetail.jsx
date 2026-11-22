import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from './Button';
import Card from './Card';

const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

function ResourceDetail({ id, title, resourceLabel, backTo, backLabel, load, children }) {
  const validId = uuidPattern.test(id);
  const [result, setResult] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!validId) return;

    const controller = new AbortController();

    load(id, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setResult({ data });
      },
      (error) => {
        if (!controller.signal.aborted) setResult({ error });
      },
    );

    return () => controller.abort();
  }, [id, load, attempt, validId]);

  const retry = () => {
    setResult(null);
    setAttempt((previous) => previous + 1);
  };

  let content;

  if (!validId) {
    content = <p role="alert" className="text-red-700">El identificador no es válido.</p>;
  } else if (!result) {
    content = <p role="status" className="text-gray-600">Cargando {resourceLabel}…</p>;
  } else if (result.error) {
    const status = result.error.response?.status;
    const message = {
      400: 'El identificador no es válido.',
      403: `No tenés permiso para ver ${resourceLabel}.`,
      404: `No se encontró ${resourceLabel}.`,
    }[status];

    content = (
      <div className="space-y-3">
        <p role="alert" className="text-red-700">{message ?? `No se pudo cargar ${resourceLabel}.`}</p>
        {!message && (
          <Button onClick={retry} className="px-3 py-2 font-medium text-purple-900">
            Reintentar
          </Button>
        )}
      </div>
    );
  } else {
    content = children(result.data);
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-4 text-base">
      <Link className="inline-block rounded py-2 font-medium text-purple-700 hover:underline" to={backTo}>
        <span aria-hidden="true">← </span>{backLabel}
      </Link>
      <Card className="min-w-0 space-y-4 border-gray-100 shadow-sm sm:p-6">
        <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
        {content}
      </Card>
    </section>
  );
}

export default ResourceDetail;
