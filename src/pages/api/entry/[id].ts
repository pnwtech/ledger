import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const entryId = req.query.id;

  switch (req.method) {
    case 'GET':
      return handleGET(entryId, res);

    default:
      res.status(501).json({ message: 'Method Not Implemented' });
  }
}

// GET /api/entry/:id
async function handleGET(
  entryId: string | string[] | undefined,
  res: NextApiResponse<any>
) {
  const entry = await prisma.entry.findMany({
    where: { id: Number(entryId) },
  });
  return res.json(entry);
}
