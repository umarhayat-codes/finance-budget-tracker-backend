import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface CreateReminderBody {
  userId: string;
  title: string;
  amount: string;
  dateStr: string;
  type: string;
}

export const createReminder = async (req: Request, res: Response) => {
  const { userId, title, amount, dateStr, type }: CreateReminderBody = req.body;
  console.log(req.body);
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
    console.error("Error creating reminder:", error);
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
    console.error("Error fetching reminders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
