import { Request, Response } from "express";
import prisma from "../prisma";

// User-defined interface for extended Request
interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

interface CategoryInput {
  name: string;
  amount: number;
}

interface Category {
  id: string;
  name: string;
  amount: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryModel {
  create: (args: {
    data: { name: string; amount: number; userId: string };
  }) => Promise<Category>;
  findMany: (args: {
    where: { userId: string };
    orderBy?: { createdAt: "asc" | "desc" };
  }) => Promise<Category[]>;
}

interface ExtendedPrisma {
  category: CategoryModel;
}

const db = prisma as unknown as ExtendedPrisma;

export const createCategory = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { name, amount }: CategoryInput = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const category = await db.category.create({
      data: {
        name,
        amount: Number(amount),
        userId,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: "Error creating category", error });
  }
};

export const getCategories = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const categories = await db.category.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    console.log("-----GetCategories categories ----:", categories);
    res.status(200).json(categories);
  } catch (error) {
    console.error("-----GetCategories error ----:", error);
    res.status(500).json({ message: "Error fetching categories", error });
  }
};
