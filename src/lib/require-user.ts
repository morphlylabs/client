import 'server-only';

import { redirect } from 'next/navigation';
import { auth } from './auth';
import { headers } from 'next/headers';
import { cache } from 'react';

export const requireUser = cache(async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return redirect('/login');
  }

  return;
});
