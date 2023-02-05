import { Account, AccountType, DebitCredit, Entry } from '@prisma/client';
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

interface LedgerEntry {
  transactionId: number;
  amount: number;
  accountId: number;
  debitCredit: DebitCredit;
  name: string;
  accountType: AccountType;
}

interface TransactionBodyType extends NextApiRequest {
  body: {
    name: string;
    description: string;
    ledgerEntries: [LedgerEntry];
  };
}

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

// POST /api/transaction
async function handlePOST(req: TransactionBodyType, res: NextApiResponse<any>) {
  const { ledgerEntries = [] } = req.body;

  const pendingTransactionOperations = ledgerEntries.flatMap(
    (entry: LedgerEntry) => {
      return createEntryTransactions(entry);
    }
  );

  const result = await prisma.$transaction(pendingTransactionOperations);

  res.status(201).json({ message: result });
}

// GET /api/transaction
async function handleGET(res: NextApiResponse<any>) {
  const entries = await prisma.entry.findMany();
  return res.json(entries);
}

function createEntryTransactions(entry: LedgerEntry) {
  const { amount, accountId, debitCredit, name, accountType, transactionId } =
    entry;
  const createTransactionOperation = prisma.entry.create({
    data: {
      transactionId: transactionId,
      name: name,
      debitCredit: debitCredit,
      amount: amount,
      accountId: accountId,
    },
  });

  const updateAccountOperation = prisma.account.update({
    data: {
      balance: getAccountDirection(accountType, debitCredit, amount),
    },
    where: {
      id: accountId,
    },
  });

  return [createTransactionOperation, updateAccountOperation];
}

function getAccountDirection(
  accountType: AccountType,
  debitCredit: DebitCredit,
  amount: number
) {
  if (accountType == AccountType.ASSET) {
    return debitCredit == DebitCredit.DEBIT
      ? { increment: amount }
      : { decrement: amount };
  } else if (accountType == AccountType.LIABILITY) {
    return debitCredit == DebitCredit.CREDIT
      ? { increment: amount }
      : { decrement: amount };
  }
}
