import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const transactionId = req.query.id;

  switch (req.method) {
    case 'GET':
      return handleGET(transactionId, res);

    default:
      res.status(501).json({ message: 'Method Not Implemented' });
  }
}

// GET /api/transaction/:id
async function handleGET(
  transactionId: string | string[] | undefined,
  res: NextApiResponse<any>
) {
  const post = await prisma.entry.findMany({
    where: { transactionId: Number(transactionId) },
  });
  return res.json(post);
}
