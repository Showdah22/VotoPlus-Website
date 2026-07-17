// Voto+ website · Wrapper client-only per la pagina /recensioni.
//
// Combina TestimonialsList (lista recensioni approvate) + TestimonialForm
// (submission form). Il form triggera un refresh della lista dopo un invio
// riuscito (anche se la recensione appena inviata resterà in `pending` fino
// all'approvazione, aggiornare la lista è utile per mostrare le ultime
// approvate se moderate rapidamente).
import React, { useState } from "react";
import TestimonialsList from "./TestimonialsList";
import TestimonialForm from "./TestimonialForm";

export default function TestimonialsPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <>
      <TestimonialsList refreshKey={refreshKey} />
      <div style={{ marginTop: 40 }}>
        <TestimonialForm onSubmitted={() => setRefreshKey((k) => k + 1)} />
      </div>
    </>
  );
}
