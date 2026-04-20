'use client';

import CardForm, { DEFAULT_FORM } from '../_CardForm';

export default function TcgCardNewPage() {
  return <CardForm mode="create" initial={DEFAULT_FORM} />;
}
