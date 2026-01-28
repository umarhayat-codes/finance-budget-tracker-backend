import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { CreateReminderBody } from "../types";

const prisma = new PrismaClient();

export const createReminder = async (req: Request, res: Response) => {
  const { userId, title, amount, dateStr, type }: CreateReminderBody = req.body;
  try {
    const newReminder = await prisma.reminder.create({
      data: {
        userId,
        title,
        amount,
        dateStr,
        type,
        subtitle: "New Reminder",
      },
    });
    res
      .status(201)
      .json({ message: "Reminder created successfully", data: newReminder });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getReminders = async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const reminders = await prisma.reminder.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ data: reminders });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
