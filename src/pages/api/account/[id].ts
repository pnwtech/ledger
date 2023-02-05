import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const accountId = req.query.id;

  switch (req.method) {
    case 'GET':
      return handleGET(accountId, res);

    default:
      res.status(501).json({ message: 'Method Not Implemented' });
  }
}

// GET /api/account/:id
async function handleGET(
  accountId: string | string[] | undefined,
  res: NextApiResponse<any>
) {
  const account = await prisma.account.findUnique({
    where: { id: Number(accountId) },
    include: {
      entries: true,
    },
  });
  return res.json(account);
}
