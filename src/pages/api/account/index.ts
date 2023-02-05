import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

// TODO: Finish CRUD Operations
export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'POST':
      return handlePOST(req, res);

    case 'GET':
      return handleGET(res);

    default:
      res.status(501).json({ message: 'Method Not Implemented' });
  }
}

// POST /api/account
async function handlePOST(req: NextApiRequest, res: NextApiResponse<any>) {
  const { id, name, accountType } = req.body;
  const account = await prisma.account.create({
    data: {
      id: id,
      name: name,
      accountType: accountType,
    },
  });
  return res.json(account);
}

// GET /api/account
async function handleGET(res: NextApiResponse<any>) {
  const accounts = await prisma.account.findMany();
  return res.json(accounts);
}
