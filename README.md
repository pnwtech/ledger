# Creating A DB Schema for Double-Entry Accounting using Next.js and Prisma

## Introduction

As payments become increasingly embedded into companies, it's becoming essential for engineers to begin understanding banking and accounting principles. We have observed their effective implementation at some of the largest fintechs and marketplaces. However, accounting can seem like a complicated topic for those new to the field.

Throughout this blog post, I aim to provide a clear and concise database schema for recording and organizing ledger entries. Unfortunately, engineers often overlook accounting terminology, disregarding terms such as "debit" and "credit" and opting for positive and negative numbers instead. This can lead to confusion. To address this, I propose designing a system easily implemented in a database that aligns with standard accounting practices.

## But does this really matter?

Accounting matters in software development because it provides a framework for tracking and reporting financial transactions. Software developers must understand accounting principles to accurately design, build and maintain systems that handle financial data. This includes procedures for managing accounts payable and receivable, recording and tracking payments, generating financial statements, and more. With a solid understanding of accounting, software developers can avoid creating systems that generate incorrect or inconsistent financial data, leading to problems such as inaccurate tax reporting or misinformed business decisions.

## The Basics

Understanding Accounts and Transactions

### Accounts

An account is a separate pool of value, similar to a bank checking account that holds money on your behalf. This can range from a user's balance on Venmo to the annual defense spending of the United States. Accounts are associated with the balances you want to track. In accounting, accounts have specific types, which will be discussed later.

### Transactions

Transactions are individual events that alter account balances. They are made up of entries, with each transaction having at least two entries corresponding to separate accounts.

Let's look at an example within a B2B ecosystem:

| Time       | Description                           | A16Z's Account | Your Startup's Account |
| ---------- | ------------------------------------- | -------------- | ---------------------- |
| 1431510505 | A16Z sends a wire to your new startup | -$5,000,000.00 | +$5,000,000.00         |

Congratulations! You just raised $5M for your startup. But how should this transaction be tracked and accounted for properly? It's clear that there are two accounts involved with this transaction; A16Z's and your startup's banking account. This transaction's entries specify which accounts were impacted. If an account is established for each user's balance, a single transaction can create an entry for each account.

These are the basics of a _ledger_, a record of financial events. Unfortunately, developers frequently modify balances directly instead of computing them from a log of transactions, which is suboptimal and typically implies data loss.

While directly altering balances is more convenient and easier to implement, it's more precise to store unchangeable transactions and calculate balances from them. In addition, directly changing balances creates an error-prone system, making it challenging to identify and resolve inaccuracies.

Observe how each transaction has multiple entries. Each entry belongs to a transaction and an account. By examining entries together, one can easily discern where the funds came from and how they were used. Double-entry ensures that as transactions are recorded, sources and uses of money are clearly displayed, and balances can be reconstructed for any date.

The central concept of double-entry accounting - **one transaction with a minimum of two entries, one for the source and another for the use of funds** - is crucial.

### General Ledger Summary

The general ledger is a record used to classify and summarize business transactions. The ledger records transactions using debits and credits, which must always balance. _Debits_ and _credits_ are equal but opposite entries. Your financial records and statements will be accurate if they are in balance.
There are five main account categories in a general ledger:

- Assets
- Liabilities
- Equity
- Revenue/Income
- Expenses

Each category can have various sub-accounts, for example, assets may include checking or savings accounts.

To post to the general ledger, you must follow **double-entry bookkeeping**. As shown above, this means recording two entries for every transaction using _debits_ and _credits_.

The general ledger provides the necessary information to create financial statements, such as the business balance sheet, cash flow statement, and income statement. These financial statements give you a clear overview of your business's finances.

| Account     | Increased By | Decreased By |
| ----------- | ------------ | ------------ |
| Assets      | Debit        | Credit       |
| Expenses    | Debit        | Credit       |
| Liabilities | Credit       | Debit        |
| Equity      | Credit       | Debit        |
| Revenue     | Credit       | Debit        |

### Debits & Credits

Some guides advise abandoning debits and credits, but it is essential to understand these concepts when creating rules for handling transactions. The challenge of grasping debits and credits stems from their use as verbs (to debit or credit an account) and as entries (debiting or crediting an account).

In accounting, debits and credits refer to the entries of a transaction. For example, the cash account is debited in a sample transaction, and the equity account is credited for $1M. Accounting systems typically log positive numbers, except for a few special situations. The effect on account balances depends on whether the entry is on the debit or credit side.

Debits and credits are a shorthand for the expected effects on accounts based on their type. For example, a credit entry will always increase the balance of a normal credit account and decrease the balance of a normal debit account.

Phew. That was a lot. Let's quickly summarize:

- A **ledger** is a log of monetary events with timestamps.
- An **account** is a value pool that tracks a balance.
- A **transaction** is a recorded event in the ledger and must have at least two entries.
- **Entries** belong to both a **transaction** and an **account** in the ledger.
- Entries can be added to the ledger "on the debit side" or "on the credit side." Debits and credits refer to how a given entry will affect an account's balance:
  - Debits—or entries on the debit side—increase the balance of debit normal accounts while credits decrease.
  - Credits—or entries on the credit side—increase the balance of credit normal accounts while debits decrease.
- When the sum of credit normal account balances matches the sum of debit normal account balances in a ledger, it is considered balanced, ensuring consistency and proper accounting of all funds.

Wowza. Now that all of that is clear as mud, let's jump into some code and start building this out:

## Let's Code

### The Chart of Accounts

The first thing we want to define is the concept of an account. Our accounts table will have the following columns:

- **ID**. The unique identifier for the account.
- **Name**. The name of the account (Assets, Liabilities, etc)
- **Account Type**. For simplicity's sake we're going to call these `ASSETS` or `LIABILITY`. This is typically referred to as `Normal balance`
- **Balance**. Note that this does not include concepts such as Holds, pending transactions, etc. We'll live in a safe world where transactions occur instantaneously for now.

```typescript
enum AccountType {
  ASSET
  LIABILITY
}

model Account {
  id                    Int                 @id @default(autoincrement())
  name                  String?
  accountType           AccountType         @default(ASSET)
  entries               Entry[]
  balance               Int                 @default(0)

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
}
```

A few other notes:

1. Note that the balance is marked as an `Int`. [To quote Alex Loukissas](https://blog.agentrisk.com/you-better-work-in-cents-not-dollars-2edb52cdf308#:~:text=To%20avoid%20rounding%20errors%2C%20you,run%20into%20brand%20new%20problems.), "To avoid rounding errors, you should store money in a currency’s smallest unit using an integer."
2. Alternatively, instead of an `enum` for the account type or Normal balance, you could use the values `-1`, or `1` for easier arithmetic and calculations. For this example, I wanted to have english for clarity.

### Ledger Transactions

With a chart of accounts established, it's time to record transactions. The transactions table is simple.

```typescript
enum DebitCredit {
  DEBIT
  CREDIT
}

model Entry {
  id                    Int                 @id @default(autoincrement())
  transactionId         Int
  name                  String?
  description           String?
  debitCredit           DebitCredit
  amount                Int
  account               Account             @relation(fields: [accountId], references: [id])
  accountId             Int

  createdAt             DateTime            @default(now())
  updatedAt             DateTime            @updatedAt
}
```

The columns:

- **transactionId**: This must not be unique because, again, there must be at lesat two entries into the ledger for each transaction.
- **name**: To simply store an explanation for the given entry.
- **Description**: Same as above
- **debitCredit**: Again, this is an `enum` for english explanations, but could easily be `-1` or `1` for easier calculations.
- **amount**: The amount that will impact the account
- **account**: The relationship with the account that will have an impact on

Sweet. Now, let's create an API to interface with this data structure:

```typescript
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
```

With this, we can now create transactions that will;

1. Create the double-entries necessary for a balanced ledger
2. Impact the given accounts based on their account type

As an example:
Let's say we have the following accounts in place:

| id     | name        | accountType | createdAt               | updatedAt               | balance |
| ------ | ----------- | ----------- | ----------------------- | ----------------------- | ------- |
| 110472 | Credit Card | LIABILITY   | 2023-02-04 16:57:02.691 | 2023-02-05 01:06:33.62  | 20000   |
| 129301 | Checkings   | ASSET       | 2023-02-04 16:36:49.942 | 2023-02-04 16:36:49.942 | 20000   |
| 190428 | Savings     | ASSET       | 2023-02-04 16:56:42.64  | 2023-02-05 01:06:33.62  | 20000   |
| 294329 | Checkings   | ASSET       | 2023-02-04 05:44:50.524 | 2023-02-05 00:45:05.288 | 20000   |

And we want to move money from our Savings to Checkings, we'll send this API request:

```json
{
  "description": "Lots of groceries",
  "name": "Albertson's transaction",
  "ledgerEntries": [
    {
      "transactionId": 1172,
      "amount": 1234,
      "accountId": 294329,
      "debitCredit": "DEBIT",
      "accountType": "ASSET",
      "name": "Some ledger entry"
    },
    {
      "transactionId": 1172,
      "amount": 1234,
      "accountId": 190428,
      "debitCredit": "CREDIT",
      "accountType": "ASSET",
      "name": "Some ledger entry"
    }
  ]
}
```

This will create the following entries:
| id | name | description | debitCredit | amount | accountId | createdAt | updatedAt | transactionId |
|----|-------------------|-------------|-------------|--------|-----------|-------------------------|-------------------------|---------------|
| 15 | Some ledger entry | | DEBIT | 1234 | 294329 | 2023-02-05 19:46:17.957 | 2023-02-05 19:46:17.957 | 1172 |
| 16 | Some ledger entry | | CREDIT | 1234 | 190428 | 2023-02-05 19:46:17.957 | 2023-02-05 19:46:17.957 | 1172 |

And our Account balances will now reflect the transactions:
| id | name | accountType | createdAt | updatedAt | balance |
|--------|-------------|-------------|-------------------------|-------------------------|---------|
| 110472 | Credit Card | LIABILITY | 2023-02-04 16:57:02.691 | 2023-02-05 01:06:33.62 | 20000 |
| 129301 | Checkings | ASSET | 2023-02-04 16:36:49.942 | 2023-02-04 16:36:49.942 | 20000 |
| 190428 | Savings | ASSET | 2023-02-04 16:56:42.64 | 2023-02-05 19:46:17.957 | 18766 |
| 294329 | Checkings | ASSET | 2023-02-04 05:44:50.524 | 2023-02-05 19:46:17.957 | 21234 |

Nice!

## Summary

This post aimed to describe a DB schema for double-entry accounting using Next.js and Prisma. The schema is designed to be elegant, efficient, and scalable. It uses the principles of double-entry accounting to ensure accuracy and consistency in financial transactions. The schema uses Prisma as the ORM and Next.js as the web framework to provide a modern and easy-to-use solution for accounting applications. I hope you all found this educational and valuable in your journey! Please reach out to me if you have any questions or feedback.
Cheers!
