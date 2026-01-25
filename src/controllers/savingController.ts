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
    console.log("-----CreateSaving saving ----:", saving);
    res.status(201).json(saving);
  } catch (error) {
    console.log("-----CreateSaving error ----:", error);
    res.status(500).json({ message: "Error creating saving", error });
  }
};

export const getSavings = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;
    // or if the user wants to pass userId as param?
    // The user requirement says: "get data saving by using user id which id come from frontend"
    // Usually we use the auth token to get the user id for security, but IF the user specifically asked for route param:
    // "fetch data of saving in ... get data saving by using user id which id come from frontend"
    // In categoryController, it takes userId from req.user (token).
    // I will stick to req.user for consistency unless forced otherwise, but looking at useCategoryHook it calls `api.get('/')`.
    // It does NOT pass userId in URL. So it must be from token.

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const savings = await db.saving.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    console.log("-----getSavings savings ----:", savings);
    res.status(200).json(savings);
  } catch (error) {
    console.log("-----getSavings error ----:", error);
    res.status(500).json({ message: "Error fetching savings", error });
  }
};
