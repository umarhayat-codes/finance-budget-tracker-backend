import { Request, Response } from "express";
import prisma from "../prisma";

interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

interface SavingInput {
  title: string;
  amount: number;
  date: string;
}

interface Saving {
  id: string;
  title: string;
  amount: number;
  date: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface SavingModel {
  create: (args: {
    data: { title: string; amount: number; date: string; userId: string };
  }) => Promise<Saving>;
  findMany: (args: {
    where: { userId: string };
    orderBy?: { createdAt: "asc" | "desc" };
  }) => Promise<Saving[]>;
}

interface ExtendedPrisma {
  saving: SavingModel;
}

const db = prisma as unknown as ExtendedPrisma;

export const createSaving = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { title, amount, date }: SavingInput = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const saving = await db.saving.create({
      data: {
        title,
        amount: Number(amount),
        date,
        userId,
      },
    });
    res.status(201).json(saving);
  } catch (error) {
    res.status(500).json({ message: "Error creating saving", error });
  }
};

export const getSavings = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const savings = await db.saving.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(savings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching savings", error });
  }
};
