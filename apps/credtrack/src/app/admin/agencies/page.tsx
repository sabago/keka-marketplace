export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import AgenciesClient from './AgenciesClient';

export default function AgenciesPage() {
  return (
    <Suspense>
      <AgenciesClient />
    </Suspense>
  );
}
