import { Request, Response } from "express";
import prisma from "../prisma";
import { AuthController, CategoryInput, ExtendedPrisma } from "../types";

const db = prisma as unknown as ExtendedPrisma;

export const createCategory = async (
  req: AuthController,
  res: Response,
): Promise<void> => {
  try {
    const { name, amount, type }: CategoryInput = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const category = await db.category.create({
      data: {
        name,
        amount: Number(amount),
        type: type || "expense",
        userId,
      },
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: "Error creating category", error });
  }
};

export const getCategories = async (
  req: AuthController,
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
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Error fetching categories", error });
  }
};
